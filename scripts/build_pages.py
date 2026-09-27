#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import binascii
import pathlib
import re
import shutil

PROJECT_URL = "https://github.com/bonaqu/Pandora-Saga-Simulator-remaked"
UPDATES_URL = "https://github.com/bonaqu/Pandora-Saga-Simulator-remaked/blob/bonaqu_projects/CHANGELOG.md"

REQUIRED_MODERN = (
    "modern/modern.css",
    "modern/favicon.svg",
    "modern/version.js",
    "modern/app-shell.js",
)
RUNTIME_DIRS = ("css", "js", "image")
HERO_PARTS_DIR = pathlib.Path("modern/pandora-hero.parts")
HERO_TARGET = pathlib.Path("modern/pandora-hero.webp")

HEAD_INJECTION = '''<!-- REMAKED:HEAD -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="icon" type="image/svg+xml" href="./modern/favicon.svg" />
<link rel="stylesheet" href="./modern/modern.css" />
<!-- /REMAKED:HEAD -->'''

BODY_INJECTION = f'''<!-- REMAKED:BODY -->
<div id="remaked-shell-hooks" hidden
  data-project-url="{PROJECT_URL}"
  data-updates-url="{UPDATES_URL}"
  data-legacy-url="./legacy/"></div>
<script src="./modern/version.js"></script>
<script src="./modern/app-shell.js"></script>
<!-- /REMAKED:BODY -->'''


def _ensure_inside(root: pathlib.Path, output: pathlib.Path) -> tuple[pathlib.Path, pathlib.Path]:
    root = root.resolve()
    output = output.resolve()
    try:
        output.relative_to(root)
    except ValueError as exc:
        raise ValueError("output directory must be inside repository root") from exc
    if output == root:
        raise ValueError("output directory must be inside repository root, not the root itself")
    return root, output


def _hero_part_files(root: pathlib.Path) -> list[pathlib.Path]:
    parts_dir = root / HERO_PARTS_DIR
    if not parts_dir.is_dir():
        raise FileNotFoundError(f"missing required Modern asset source: {HERO_PARTS_DIR}")
    parts = sorted(path for path in parts_dir.iterdir() if path.is_file() and path.suffix == ".b64")
    if not parts:
        raise FileNotFoundError(f"missing required Modern asset source parts: {HERO_PARTS_DIR}")
    return parts


def _require_inputs(root: pathlib.Path) -> None:
    for relative in REQUIRED_MODERN:
        if not (root / relative).is_file():
            raise FileNotFoundError(f"missing required Modern asset: {relative}")
    _hero_part_files(root)
    for relative in ("index.html", "readme.txt"):
        if not (root / relative).is_file():
            raise FileNotFoundError(f"missing required legacy file: {relative}")
    for dirname in RUNTIME_DIRS:
        if not (root / dirname).is_dir():
            raise FileNotFoundError(f"missing required legacy directory: {dirname}")


def _modernize_html(source: str) -> str:
    if "<!-- REMAKED:HEAD -->" in source or "<!-- REMAKED:BODY -->" in source:
        raise ValueError("source legacy HTML already contains Remaked injection markers")
    source, count = re.subn(
        r"(Flag\s*=\s*new\s+Array\(\s*\n\s*)0(\s*//\s*\[\s*0\s*\])",
        r"\g<1>1\g<2>",
        source,
        count=1,
    )
    if count != 1:
        raise ValueError("could not set Modern default language to English")
    if "</head>" not in source or "</body>" not in source:
        raise ValueError("legacy HTML is missing </head> or </body>")
    source = source.replace("</head>", f"{HEAD_INJECTION}\n</head>", 1)
    source = source.replace("</body>", f"{BODY_INJECTION}\n</body>", 1)
    return source


def _patch_runtime_browser_compatibility(destination: pathlib.Path) -> None:
    simulator = destination / "js" / "simulator.js"
    if not simulator.is_file():
        return
    source = simulator.read_text(encoding="utf-8-sig")
    patched = source.replace(
        "url(./image/interface/bar_green.png)",
        "linear-gradient(to right,#27471b,#70b642)",
    ).replace(
        "url(./image/interface/bar_blue.png)",
        "#4c73c9",
    )
    simulator.write_text(patched, encoding="utf-8")


def _copy_runtime(root: pathlib.Path, destination: pathlib.Path) -> None:
    for dirname in RUNTIME_DIRS:
        shutil.copytree(root / dirname, destination / dirname)
    shutil.copy2(root / "readme.txt", destination / "readme.txt")
    _patch_runtime_browser_compatibility(destination)


def _materialize_modern_assets(root: pathlib.Path, output: pathlib.Path) -> None:
    modern_output = output / "modern"
    shutil.copytree(root / "modern", modern_output)

    encoded = "".join(
        part.read_text(encoding="ascii").strip()
        for part in _hero_part_files(root)
    )
    try:
        payload = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError, UnicodeError) as exc:
        raise ValueError("invalid base64 data in modern/pandora-hero.parts") from exc

    if len(payload) < 12 or payload[:4] != b"RIFF" or payload[8:12] != b"WEBP":
        raise ValueError("reconstructed Modern hero is not a WebP RIFF payload")

    (output / HERO_TARGET).write_bytes(payload)
    copied_parts = output / HERO_PARTS_DIR
    if copied_parts.exists():
        shutil.rmtree(copied_parts)

    old_single_source = output / "modern/pandora-hero.webp.b64"
    if old_single_source.exists():
        old_single_source.unlink()


def build_pages(root: pathlib.Path, output: pathlib.Path) -> None:
    root, output = _ensure_inside(root, output)
    _require_inputs(root)
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    _copy_runtime(root, output)
    _materialize_modern_assets(root, output)

    source_bytes = (root / "index.html").read_bytes()
    source_text = source_bytes.decode("utf-8-sig")
    modern_html = _modernize_html(source_text)
    (output / "index.html").write_text(modern_html, encoding="utf-8")

    legacy = output / "legacy"
    legacy.mkdir()
    _copy_runtime(root, legacy)
    (legacy / "index.html").write_bytes(source_bytes)

    (output / ".nojekyll").write_text("", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root",
        type=pathlib.Path,
        default=pathlib.Path(__file__).resolve().parents[1],
    )
    parser.add_argument("--output", type=pathlib.Path, default=None)
    args = parser.parse_args()
    output = args.output or (args.root / "_site")
    build_pages(args.root, output)
    print(f"Built GitHub Pages site at {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
