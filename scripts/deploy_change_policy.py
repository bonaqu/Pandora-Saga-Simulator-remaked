#!/usr/bin/env python3
"""Classify repository changes for CI/deployment.

The safe path is intentionally deny-by-default.  Only documentation surfaces
that cannot modify simulator/runtime output are allowed to bypass full
validation. CHANGELOG.md is special because it is compiled into the public
"What's new" payload, so it still requires a Pages build/deploy, just not the
browser/catalog matrix.
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
    "tests/test_repository_docs.py",
}

SAFE_PREFIXES = (
    "docs/",
    ".github/ISSUE_TEMPLATE/",
)

# These files are copied by the wiki sync job.
DEPLOYMENT_SENSITIVE_EXACT = {
    ".github/workflows/pages.yml",
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
    # Reject path traversal or absolute paths instead of trying to be clever.
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


def classify(paths: Iterable[str]) -> dict[str, object]:
    files = sorted({_normalise(path) for path in paths if _normalise(path)})
    if not files:
        return {
            "mode": "full",
            "pages_required": True,
            "wiki_required": False,
            "full_validation": True,
            "files": [],
            "unsafe_files": [],
            "force_full_deploy": True,
            "reason": "empty-or-unknown-change-set",
        }

    unsafe = [path for path in files if not is_safe_documentation(path)]
    if unsafe:
        return {
            "mode": "full",
            "pages_required": True,
            "wiki_required": any(path in WIKI_INPUTS for path in files),
            "full_validation": True,
            "files": files,
            "unsafe_files": unsafe,
            "force_full_deploy": any(
                path in DEPLOYMENT_SENSITIVE_EXACT
                or any(path.startswith(prefix) for prefix in DEPLOYMENT_SENSITIVE_PREFIXES)
                for path in files
            ),
            "reason": "runtime-or-unclassified-files",
        }

    release_notes = "CHANGELOG.md" in files
    return {
        "mode": "release-notes" if release_notes else "docs-only",
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
