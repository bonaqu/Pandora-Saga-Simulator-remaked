#!/usr/bin/env python3
"""Classify repository changes for CI/deployment.

Deployment stays fail-closed for Pages-affecting runtime changes: they require
full production validation unless the exact merged PR head already passed
Feature CI. The granular ci_profile controls which Feature CI partitions are
relevant for a change set.

Admin-only changes are isolated from Pages because the Cloudflare Admin API has
its own verification/deployment workflow. Translation/catalog-only pull
requests avoid browser matrices that cannot add useful coverage, while direct
Pages-affecting pushes remain protected by the production validation gate.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import PurePosixPath
from typing import Iterable

SAFE_EXACT = {
    "CHANGELOG.md",
    "README.md",
    "README.ru.md",
    "LICENSE",
    "NOTICE.md",
    "data/README.md",
    "localization/README.md",
    "tests/test_repository_docs.py",
}

SAFE_PREFIXES = (
    "docs/",
    ".github/ISSUE_TEMPLATE/",
)

TRANSLATION_RUNTIME_EXACT = {
    "localization/game-terms.ru.json",
    "localization/approved-translations.v1.json",
    "localization/ui.en.json",
}

CATALOG_RUNTIME_EXACT = {
    "data/current-active-profiles.v1.json",
    "data/native-passive-hooks.v1.json",
}

CATALOG_RUNTIME_PREFIXES = (
    "data/generated/",
)

ADMIN_RUNTIME_EXACT = {
    ".github/workflows/admin-api.yml",
    "scripts/create_first_admin.mjs",
    "scripts/materialize_pandora_os_sync.mjs",
    "scripts/materialize_pandora_os_live_sync.mjs",
    "scripts/materialize_pandora_os_live_sync_hardening.mjs",
    "scripts/materialize_pandora_os_complete_sync.mjs",
    "scripts/materialize_pandora_os_identity_reconcile.mjs",
    "scripts/materialize_decorative_equipment_prune.mjs",
    "scripts/lib/wrangler-json.mjs",
}

ADMIN_RUNTIME_PREFIXES = (
    "admin-api/",
    "tests/admin/",
)

# Changing either Pages itself or the Feature CI trust boundary must force one
# complete production validation before validation reuse is allowed again.
DEPLOYMENT_SENSITIVE_EXACT = {
    ".github/workflows/pages.yml",
    ".github/workflows/feature-ci.yml",
    "scripts/build_pages.py",
    "scripts/deploy_change_policy.py",
}

DEPLOYMENT_SENSITIVE_PREFIXES = (
    ".github/actions/",
)

WIKI_INPUTS = {
    "CHANGELOG.md",
    "docs/wiki/Home.md",
    "docs/FAQ.md",
    "docs/ARCHITECTURE.md",
    "docs/DEPLOYMENT.md",
    "docs/HISTORY.md",
    "docs/TASK_QUEUE.ru.md",
}


def _normalise(path: str) -> str:
    value = path.strip().replace("\\", "/")
    while value.startswith("./"):
        value = value[2:]
    pure = PurePosixPath(value)
    if not value or pure.is_absolute() or ".." in pure.parts:
        return ""
    return str(pure)


def is_safe_documentation(path: str) -> bool:
    path = _normalise(path)
    if not path:
        return False
    if path in SAFE_EXACT:
        return True
    return any(path.startswith(prefix) for prefix in SAFE_PREFIXES)


def is_translation_runtime(path: str) -> bool:
    path = _normalise(path)
    return bool(path and path in TRANSLATION_RUNTIME_EXACT)


def is_catalog_runtime(path: str) -> bool:
    path = _normalise(path)
    if not path:
        return False
    if path in CATALOG_RUNTIME_EXACT:
        return True
    return any(path.startswith(prefix) for prefix in CATALOG_RUNTIME_PREFIXES)


def is_admin_runtime(path: str) -> bool:
    path = _normalise(path)
    if not path:
        return False
    if path in ADMIN_RUNTIME_EXACT:
        return True
    return any(path.startswith(prefix) for prefix in ADMIN_RUNTIME_PREFIXES)


def _runtime_ci_profile(runtime_files: list[str]) -> str:
    """Return the narrowest safe Feature CI profile for runtime files."""
    if runtime_files and all(is_admin_runtime(path) for path in runtime_files):
        return "admin"

    if runtime_files and all(is_translation_runtime(path) for path in runtime_files):
        return "translation"

    if runtime_files and all(
        is_translation_runtime(path) or is_catalog_runtime(path)
        for path in runtime_files
    ):
        return "catalog"

    return "runtime"


def classify(paths: Iterable[str]) -> dict[str, object]:
    files = sorted({_normalise(path) for path in paths if _normalise(path)})
    if not files:
        return {
            "mode": "full",
            "ci_profile": "runtime",
            "pages_required": True,
            "wiki_required": False,
            "full_validation": True,
            "files": [],
            "unsafe_files": [],
            "force_full_deploy": True,
            "reason": "empty-or-unknown-change-set",
        }

    runtime_files = [path for path in files if not is_safe_documentation(path)]
    release_notes = "CHANGELOG.md" in files

    if runtime_files:
        profile = _runtime_ci_profile(runtime_files)
        force_full = any(
            path in DEPLOYMENT_SENSITIVE_EXACT
            or any(path.startswith(prefix) for prefix in DEPLOYMENT_SENSITIVE_PREFIXES)
            for path in files
        )

        if profile == "admin":
            return {
                "mode": "admin-only",
                "ci_profile": "admin",
                "pages_required": release_notes,
                "wiki_required": any(path in WIKI_INPUTS for path in files),
                "full_validation": False,
                "files": files,
                "unsafe_files": runtime_files,
                "force_full_deploy": False,
                "reason": "admin-api-only-files",
            }

        return {
            "mode": "full",
            "ci_profile": profile,
            "pages_required": True,
            "wiki_required": any(path in WIKI_INPUTS for path in files),
            # Pages-affecting runtime/data/localization changes stay fail-closed.
            # pages.yml may downgrade this only after proving exact PR CI success.
            "full_validation": True,
            "files": files,
            "unsafe_files": runtime_files,
            "force_full_deploy": force_full,
            "reason": {
                "translation": "translation-runtime-files",
                "catalog": "catalog-or-translation-runtime-files",
                "runtime": "runtime-or-unclassified-files",
            }[profile],
        }

    return {
        "mode": "release-notes" if release_notes else "docs-only",
        "ci_profile": "docs",
        "pages_required": release_notes,
        "wiki_required": any(path in WIKI_INPUTS for path in files),
        "full_validation": False,
        "files": files,
        "unsafe_files": [],
        "force_full_deploy": False,
        "reason": "allowlisted-documentation-only",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="*")
    parser.add_argument("--stdin", action="store_true", help="Read newline-delimited paths from stdin.")
    args = parser.parse_args()

    paths = list(args.paths)
    if args.stdin:
        paths.extend(line.rstrip("\n") for line in sys.stdin)

    print(json.dumps(classify(paths), ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
