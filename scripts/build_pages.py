#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import binascii
import json
import pathlib
import re
import shutil

PROJECT_URL = "https://github.com/bonaqu/Pandora-Saga-Simulator-remaked"
UPDATES_URL = "https://github.com/bonaqu/Pandora-Saga-Simulator-remaked/blob/bonaqu_projects/CHANGELOG.md"

REQUIRED_MODERN = (
    "modern/modern.css",
    "modern/search.css",
    "modern/builds.css",
    "modern/compare.css",
    "modern/tooltips.css",
    "modern/mobile.css",
    "modern/favicon.svg",
    "modern/manifest.webmanifest",
    "modern/icon-192.svg",
    "modern/icon-512.svg",
    "modern/service-worker.js",
    "modern/version.js",
    "modern/adapter.js",
    "modern/build-store.js",
    "modern/search.js",
    "modern/app-shell.js",
    "modern/builds.js",
    "modern/tooltips.js",
    "modern/compare.js",
    "modern/mobile.js",
)
RUNTIME_DIRS = ("css", "js", "image")
HERO_PARTS_DIR = pathlib.Path("modern/pandora-hero.parts")
HERO_TARGET = pathlib.Path("modern/pandora-hero.webp")
SERVICE_WORKER_SOURCE = pathlib.Path("modern/service-worker.js")
SERVICE_WORKER_TARGET = pathlib.Path("service-worker.js")

HEAD_INJECTION = '''<!-- REMAKED:HEAD -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#669b36" />
<meta name="background-color" content="#f4f6ed" />
<link rel="icon" type="image/svg+xml" href="./modern/favicon.svg" />
<link rel="manifest" href="./modern/manifest.webmanifest" />
<link rel="stylesheet" href="./modern/modern.css" />
<link rel="stylesheet" href="./modern/search.css" />
<link rel="stylesheet" href="./modern/builds.css" />
<link rel="stylesheet" href="./modern/compare.css" />
<link rel="stylesheet" href="./modern/tooltips.css" />
<link rel="stylesheet" href="./modern/mobile.css" />
<!-- /REMAKED:HEAD -->'''

BODY_INJECTION = f'''<!-- REMAKED:BODY -->
<div id="remaked-shell-hooks" hidden
  data-project-url="{PROJECT_URL}"
  data-updates-url="{UPDATES_URL}"
  data-legacy-url="./legacy/"></div>
<script src="./modern/version.js"></script>
<script src="./modern/adapter.js"></script>
<script src="./modern/build-store.js"></script>
<script src="./modern/search.js"></script>
<script src="./modern/app-shell.js"></script>
<script src="./modern/builds.js"></script>
<script src="./modern/tooltips.js"></script>
<script src="./modern/compare.js"></script>
<script src="./modern/mobile.js"></script>
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

    expected_names = [f"{index:02d}.b64" for index in range(len(parts))]
    actual_names = [path.name for path in parts]
    if actual_names != expected_names:
        raise ValueError(
            "Modern hero source chunks must be contiguous from 00.b64; "
            f"expected {expected_names}, found {actual_names}"
        )
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

    declared_riff_size = int.from_bytes(payload[4:8], "little") + 8
    if declared_riff_size != len(payload):
        raise ValueError(
            "reconstructed Modern hero RIFF size mismatch: "
            f"declared {declared_riff_size} bytes, found {len(payload)}"
        )

    (output / HERO_TARGET).write_bytes(payload)
    copied_parts = output / HERO_PARTS_DIR
    if copied_parts.exists():
        shutil.rmtree(copied_parts)

    old_single_source = output / "modern/pandora-hero.webp.b64"
    if old_single_source.exists():
        old_single_source.unlink()


def _read_ui_version(root: pathlib.Path) -> str:
    source = (root / "modern/version.js").read_text(encoding="utf-8")
    match = re.search(r"\bui\s*:\s*['\"]([^'\"]+)['\"]", source)
    if not match:
        raise ValueError("modern/version.js is missing the Remaked UI version")
    return match.group(1)


def _relative_urls(base: pathlib.Path, directory: pathlib.Path) -> list[str]:
    if not directory.is_dir():
        return []
    return [
        "./" + path.relative_to(base).as_posix()
        for path in directory.rglob("*")
        if path.is_file()
    ]


def _precache_urls(output: pathlib.Path) -> list[str]:
    urls = {"./index.html", "./legacy/index.html"}
    for relative in ("css", "js", "image/interface", "modern"):
        urls.update(_relative_urls(output, output / relative))
    for relative in ("legacy/css", "legacy/js", "legacy/image/interface"):
        urls.update(_relative_urls(output, output / relative))
    urls.discard("./modern/service-worker.js")
    return sorted(urls)


def _materialize_service_worker(root: pathlib.Path, output: pathlib.Path) -> None:
    template = (root / SERVICE_WORKER_SOURCE).read_text(encoding="utf-8")
    if "__CACHE_VERSION__" not in template or "__PRECACHE_URLS__" not in template:
        raise ValueError("modern/service-worker.js is missing build placeholders")
    worker = template.replace("__CACHE_VERSION__", _read_ui_version(root))
    worker = worker.replace(
        "__PRECACHE_URLS__",
        json.dumps(_precache_urls(output), ensure_ascii=False, indent=2),
    )
    (output / SERVICE_WORKER_TARGET).write_text(worker, encoding="utf-8")
    copied_template = output / SERVICE_WORKER_SOURCE
    if copied_template.exists():
        copied_template.unlink()


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
    _materialize_service_worker(root, output)


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
