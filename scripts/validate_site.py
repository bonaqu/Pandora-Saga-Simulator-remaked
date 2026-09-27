#!/usr/bin/env python3
"""Static integrity checks for the restored Pandora Saga Simulator."""

from __future__ import annotations

import pathlib
import re
import sys

from scripts.legacy_fingerprint import verify_manifest

ROOT = pathlib.Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
LEGACY_MANIFEST = ROOT / "preservation" / "legacy-files.sha256"

CORE_FILES = [
    ROOT / "js" / "calc.js",
    ROOT / "js" / "equip.js",
    ROOT / "js" / "item.js",
    ROOT / "js" / "skill.js",
    ROOT / "js" / "ini.js",
    ROOT / "css" / "_css.css",
]

FORBIDDEN_RUNTIME_HOSTS = (
    "vip.chps-api.fc2.com",
    "static.fc2.com/fc2web",
)


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def local_refs(html: str) -> set[str]:
    refs: set[str] = set()
    patterns = [
        r"<script[^>]+src=[\"']([^\"']+)[\"']",
        r"<link[^>]+href=[\"']([^\"']+)[\"']",
        r"<img[^>]+src=[\"']([^\"']+)[\"']",
    ]
    for pattern in patterns:
        refs.update(re.findall(pattern, html, flags=re.IGNORECASE))
    return refs


def is_local_asset(ref: str) -> bool:
    ref = ref.strip()
    return not (
        ref.startswith(("http://", "https://", "//", "data:", "#", "javascript:"))
        or "?" in ref and ref.split("?", 1)[0] == ""
    )


def main() -> int:
    if not INDEX.is_file():
        fail("index.html is missing; source import has not completed")

    html = INDEX.read_text(encoding="utf-8-sig")

    if "Pandora Saga Simulator" not in html:
        fail("index.html does not look like the recovered simulator")

    for host in FORBIDDEN_RUNTIME_HOSTS:
        if host.lower() in html.lower():
            fail(f"obsolete FC2 runtime dependency still present: {host}")

    missing_core = [str(path.relative_to(ROOT)) for path in CORE_FILES if not path.is_file()]
    if missing_core:
        fail("missing core files: " + ", ".join(missing_core))

    manifest_errors = verify_manifest(ROOT, LEGACY_MANIFEST)
    if manifest_errors:
        fail("legacy preservation mismatch: " + "; ".join(manifest_errors))

    missing_refs: list[str] = []
    checked = 0
    for ref in sorted(local_refs(html)):
        if not is_local_asset(ref):
            continue
        path_part = ref.split("?", 1)[0].split("#", 1)[0]
        if not path_part or path_part.endswith("/"):
            continue
        candidate = (ROOT / path_part.lstrip("./")).resolve()
        checked += 1
        try:
            candidate.relative_to(ROOT.resolve())
        except ValueError:
            fail(f"local reference escapes repository root: {ref}")
        if not candidate.exists():
            missing_refs.append(ref)

    if missing_refs:
        fail("missing HTML-referenced local assets: " + ", ".join(missing_refs))

    image_count = sum(1 for path in (ROOT / "image").rglob("*") if path.is_file())
    js_count = sum(1 for path in (ROOT / "js").rglob("*.js") if path.is_file())
    css_count = sum(1 for path in (ROOT / "css").rglob("*.css") if path.is_file())

    if image_count == 0:
        fail("image directory contains no files")

    print("Static validation passed")
    print("Legacy preservation manifest verified")
    print(f"HTML local references checked: {checked}")
    print(f"JavaScript files: {js_count}")
    print(f"CSS files: {css_count}")
    print(f"Image/assets files: {image_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
