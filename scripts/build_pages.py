#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import binascii
import hashlib
import json
import pathlib
import re
import shutil

try:
    from scripts.translation_workbook import load_editable_catalogs
    from scripts.recover_archived_javascript import recover_archived_javascript
    from scripts.native_passive_hooks import materialize_native_passives
except ModuleNotFoundError:  # Direct execution keeps only scripts/ on sys.path.
    from translation_workbook import load_editable_catalogs
    from recover_archived_javascript import recover_archived_javascript
    from native_passive_hooks import materialize_native_passives

PROJECT_URL = "https://github.com/bonaqu/Pandora-Saga-Simulator-remaked"
UPDATES_URL = "https://github.com/bonaqu/Pandora-Saga-Simulator-remaked/blob/bonaqu_projects/CHANGELOG.md"

REQUIRED_MODERN = (
    "modern/modern.css",
    "modern/search.css",
    "modern/builds.css",
    "modern/compare.css",
    "modern/tooltips.css",
    "modern/mobile.css",
    "modern/pwa.css",
    "modern/admin-entry.css",
    "modern/admin-entry.js",
    "modern/favicon.svg",
    "modern/manifest.webmanifest",
    "modern/icon-192.svg",
    "modern/icon-512.svg",
    "modern/icon-192.png",
    "modern/icon-512.png",
    "modern/apple-touch-icon.png",
    "modern/social-preview.png",
    "modern/service-worker.js",
    "modern/version.js",
    "modern/i18n.js",
    "modern/game-term-display.js",
    "modern/calculator-labels.js",
    "modern/calculator-controls.js",
    "modern/skill-controls.js",
    "modern/skill-tooltips.js",
    "modern/adapter.js",
    "modern/catalog.js",
    "modern/build-store.js",
    "modern/search.js",
    "modern/equipment-picker.js",
    "modern/app-shell.js",
    "modern/builds.js",
    "modern/tooltips.js",
    "modern/compare.js",
    "modern/mobile.js",
    "modern/pwa.js",
)
REQUIRED_LOCALIZATION = (
    "localization/ui.en.json",
    "localization/game-terms.ru.json",
    "localization/translations.xlsx",
)
REQUIRED_GENERATED = (
    "data/generated/equipment.v1.json",
    "data/generated/souls.v1.json",
    "data/generated/skills.v1.json",
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
<meta name="description" content="Unofficial Pandora Saga character calculator: search equipment, save builds locally and compare stats using the preserved Legacy 2.00 engine." />
<link rel="canonical" href="https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Pandora Saga Simulator — Remaked" />
<meta property="og:description" content="Unofficial character calculator. Search equipment, save builds locally and compare stats with the preserved Legacy 2.00 engine." />
<meta property="og:url" content="https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/" />
<meta property="og:image" content="https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/modern/social-preview.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Pandora Saga Simulator Remaked: approved unofficial fan artwork above the Modern character calculator" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" type="image/svg+xml" href="./modern/favicon.svg" />
<link rel="apple-touch-icon" sizes="180x180" href="./modern/apple-touch-icon.png" />
<link rel="manifest" href="./modern/manifest.webmanifest" />
<script>
(function () {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  var reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading || window.__pandoraPwaReloading) return;
    var builds = window.PandoraRemaked && window.PandoraRemaked.builds;
    if (builds && typeof builds.flushAutosave === 'function') {
      var saved = builds.flushAutosave();
      if (saved && saved.ok === false) return;
    }
    reloading = true;
    window.__pandoraPwaReloading = true;
    window.location.reload();
  });
  navigator.serviceWorker.getRegistration().then(function (registration) {
    if (!registration) return;
    function activateWaiting() {
      if (registration.waiting && typeof registration.waiting.postMessage === 'function') {
        window.__pandoraPwaBootstrapUpdating = true;
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
    function watchInstalling(worker) {
      if (!worker) return;
      worker.addEventListener('statechange', function () {
        if (worker.state === 'installed') activateWaiting();
      });
    }
    activateWaiting();
    watchInstalling(registration.installing);
    registration.addEventListener('updatefound', function () {
      watchInstalling(registration.installing);
    });
    registration.update().then(activateWaiting).catch(function () {});
  }).catch(function () {});
})();
</script>
<link rel="stylesheet" href="./modern/modern.css" />
<link rel="stylesheet" href="./modern/search.css" />
<link rel="stylesheet" href="./modern/builds.css" />
<link rel="stylesheet" href="./modern/compare.css" />
<link rel="stylesheet" href="./modern/tooltips.css" />
<link rel="stylesheet" href="./modern/mobile.css" />
<link rel="stylesheet" href="./modern/pwa.css" />
<link rel="stylesheet" href="./modern/admin-entry.css" />
<!-- /REMAKED:HEAD -->'''

BODY_INJECTION = f'''<!-- REMAKED:BODY -->
<div id="remaked-shell-hooks" hidden
  data-project-url="{PROJECT_URL}"
  data-updates-url="{UPDATES_URL}"
  data-legacy-url="./legacy/"></div>
<script src="./modern/version.js"></script>
<script src="./modern/release-notes.js"></script>
<script src="./modern/locales.js"></script>
<script src="./modern/game-terms.js"></script>
<script src="./modern/i18n.js"></script>
<script src="./modern/adapter.js"></script>
<script src="./modern/build-store.js"></script>
<script src="./modern/native-passives.js"></script>
<script src="./modern/catalog.js"></script>
<script src="./modern/admin-entry.js"></script>
<script src="./modern/search.js"></script>
<script src="./modern/app-shell.js"></script>
<script src="./modern/calculator-labels.js"></script>
<script src="./modern/game-term-display.js"></script>
<script src="./modern/builds.js"></script>
<script src="./modern/tooltips.js"></script>
<script src="./modern/compare.js"></script>
<script src="./modern/mobile.js"></script>
<script src="./modern/equipment-picker.js"></script>
<script src="./modern/calculator-controls.js"></script>
<script src="./modern/skill-controls.js"></script>
<script src="./modern/skill-tooltips.js"></script>
<script src="./modern/pwa.js"></script>
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
    for relative in ("index.html", "readme.txt", "CHANGELOG.md"):
        if not (root / relative).is_file():
            raise FileNotFoundError(f"missing required project file: {relative}")
    for relative in REQUIRED_LOCALIZATION:
        if not (root / relative).is_file():
            raise FileNotFoundError(f"missing required localization catalog: {relative}")
    for relative in REQUIRED_GENERATED:
        if not (root / relative).is_file():
            raise FileNotFoundError(f"missing required generated projection: {relative}")
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
    # Hosting-only hidden counter, not game content or author attribution.
    # The original HTML copied to /legacy remains byte-identical.
    source = re.sub(
        r'''<img\b(?=[^>]*\bsrc=["'](?:https?:)?//media\.fc2\.com/counter_img\.php\?id=50["'])(?=[^>]*\balt=["']inserted by FC2 system["'])[^>]*>''',
        "<!-- Obsolete FC2 hosting counter omitted from Modern. -->",
        source,
        flags=re.IGNORECASE,
    )
    source = source.replace("</head>", f"{HEAD_INJECTION}\n</head>", 1)
    source = source.replace("</body>", f"{BODY_INJECTION}\n</body>", 1)
    return source


def _patch_runtime_browser_compatibility(destination: pathlib.Path) -> None:
    for name in ("base64.js", "rawinflate.js", "rawdeflate.js"):
        codec = destination / "js" / name
        if codec.is_file():
            source = codec.read_text(encoding="utf-8-sig")
            recovered = recover_archived_javascript(source)
            if recovered != source:
                codec.write_text(recovered, encoding="utf-8")
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


def _load_catalog(path: pathlib.Path, *, require_values: bool) -> dict[str, str]:
    try:
        catalog = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeError) as exc:
        raise ValueError(f"invalid localization catalog: {path.as_posix()}") from exc
    if not isinstance(catalog, dict) or (require_values and not catalog):
        raise ValueError(f"localization catalog must be an object with required strings: {path.as_posix()}")
    for key, value in catalog.items():
        if not isinstance(key, str) or not key or not isinstance(value, str):
            raise ValueError(f"localization catalog keys and values must be strings: {path.as_posix()}")
        if require_values and not value:
            raise ValueError(f"English localization strings must not be empty: {key}")
    return catalog


def _materialize_locales(
    root: pathlib.Path,
    output: pathlib.Path,
    russian: dict[str, str],
    japanese: dict[str, str] | None = None,
    traditional_chinese: dict[str, str] | None = None,
    english_overrides: dict[str, str] | None = None,
) -> None:
    english = _load_catalog(root / "localization/ui.en.json", require_values=True)
    english.update(english_overrides or {})
    payload = json.dumps(
        {
            "en": english,
            "ru": russian,
            "jp": japanese or {},
            "tw": traditional_chinese or {},
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    (output / "modern/locales.js").write_text(
        "window.PandoraRemakedLocales = Object.freeze(" + payload + ");\n",
        encoding="utf-8",
    )


def _materialize_game_terms(output: pathlib.Path, russian: dict[str, str], english: dict[str, str] | None = None) -> None:
    payload = json.dumps({"en": english or {}, "ru": russian}, ensure_ascii=False, sort_keys=True)
    (output / "modern/game-terms.js").write_text(
        "window.PandoraRemakedGameTerms = " + payload + ";\n",
        encoding="utf-8",
    )


def _publish_translation_workbook(root: pathlib.Path, output: pathlib.Path) -> None:
    destination = output / "localization"
    destination.mkdir(parents=True)
    shutil.copy2(root / "localization/translations.xlsx", destination / "translations.xlsx")


def _materialize_generated_data(root: pathlib.Path, output: pathlib.Path) -> None:
    destination = output / "data" / "generated"
    destination.mkdir(parents=True)
    ui_version = _read_ui_version(root)
    for relative in REQUIRED_GENERATED:
        source = root / relative
        payload = json.loads(source.read_text(encoding="utf-8"))
        metadata = payload.setdefault("metadata", {})
        metadata["remaked_ui"] = ui_version
        (destination / pathlib.Path(relative).name).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )


RELEASE_HEADING_RE = re.compile(
    r"^## Modern (?P<version>\d+\.\d+) — (?P<title>.+?), (?P<date>\d{4}-\d{2}-\d{2})\s*$",
    re.MULTILINE,
)


def _plain_release_bullet(text: str) -> str:
    text = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", text)
    text = text.replace("**", "").replace("__", "").replace(chr(96), "")
    return re.sub(r"\s+", " ", text).strip()


def _release_marker_bullets(section: str, locale: str) -> list[str]:
    marker = re.search(
        rf"<!-- release-notes:{re.escape(locale)} -->(.*?)<!-- /release-notes:{re.escape(locale)} -->",
        section,
        flags=re.DOTALL,
    )
    if not marker:
        return []
    bullets: list[str] = []
    current: list[str] = []
    for line in marker.group(1).splitlines():
        if line.startswith("- "):
            if current:
                bullets.append(_plain_release_bullet(" ".join(current)))
            current = [line[2:].strip()]
        elif current and (line.startswith("  ") or not line.strip()):
            if line.strip():
                current.append(line.strip())
        elif current:
            bullets.append(_plain_release_bullet(" ".join(current)))
            current = []
    if current:
        bullets.append(_plain_release_bullet(" ".join(current)))
    return [bullet for bullet in bullets if bullet]


def _read_latest_release(root: pathlib.Path) -> dict[str, object]:
    source = (root / "CHANGELOG.md").read_text(encoding="utf-8")
    match = RELEASE_HEADING_RE.search(source)
    if not match:
        raise ValueError(
            "CHANGELOG.md must begin with a dated release heading like "
            "'## Modern 3.11 — release title, 2026-10-05'"
        )
    rest = source[match.end():]
    next_release = re.search(r"^## Modern ", rest, flags=re.MULTILINE)
    section = rest[: next_release.start()] if next_release else rest
    highlights = {
        "en": _release_marker_bullets(section, "en"),
        "ru": _release_marker_bullets(section, "ru"),
    }
    if not highlights["en"] or not highlights["ru"]:
        raise ValueError(
            "latest CHANGELOG release must contain non-empty "
            "release-notes:en and release-notes:ru marker blocks"
        )
    return {
        "version": match.group("version"),
        "title": match.group("title").strip(),
        "date": match.group("date"),
        "highlights": highlights,
    }


def _materialize_release_metadata(root: pathlib.Path, output: pathlib.Path) -> None:
    release = _read_latest_release(root)
    version_payload = {
        "legacyEngine": "2.00",
        "ui": release["version"],
    }
    (output / "modern/version.js").write_text(
        "window.PandoraRemakedVersion = Object.freeze("
        + json.dumps(version_payload, ensure_ascii=False, separators=(",", ":"))
        + ");\n",
        encoding="utf-8",
    )
    (output / "modern/release-notes.js").write_text(
        "window.PandoraRemakedRelease = Object.freeze("
        + json.dumps(release, ensure_ascii=False, separators=(",", ":"))
        + ");\n",
        encoding="utf-8",
    )


def _read_ui_version(root: pathlib.Path) -> str:
    return str(_read_latest_release(root)["version"])


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
    # Link-preview crawlers fetch this online; it is not needed to use the app.
    urls.discard("./modern/social-preview.png")
    return sorted(urls)


def _materialize_service_worker(root: pathlib.Path, output: pathlib.Path) -> None:
    template = (root / SERVICE_WORKER_SOURCE).read_text(encoding="utf-8")
    if "__CACHE_VERSION__" not in template or "__PRECACHE_URLS__" not in template:
        raise ValueError("modern/service-worker.js is missing build placeholders")
    urls = _precache_urls(output)
    fingerprint = hashlib.sha256()
    fingerprint.update(template.encode("utf-8"))
    fingerprint.update(b"\0")
    for url in urls:
        fingerprint.update(url.encode("utf-8"))
        fingerprint.update(b"\0")
        fingerprint.update(hashlib.sha256((output / url.removeprefix("./")).read_bytes()).digest())
    cache_version = _read_ui_version(root) + "-" + fingerprint.hexdigest()[:16]
    worker = template.replace("__CACHE_VERSION__", cache_version)
    worker = worker.replace(
        "__PRECACHE_URLS__",
        json.dumps(urls, ensure_ascii=False, indent=2),
    )
    (output / SERVICE_WORKER_TARGET).write_text(worker, encoding="utf-8")
    copied_template = output / SERVICE_WORKER_SOURCE
    if copied_template.exists():
        copied_template.unlink()


def build_pages(root: pathlib.Path, output: pathlib.Path) -> None:
    root, output = _ensure_inside(root, output)
    _require_inputs(root)
    translations = load_editable_catalogs(root)
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    _copy_runtime(root, output)
    _materialize_modern_assets(root, output)
    _materialize_release_metadata(root, output)
    _materialize_locales(
        root,
        output,
        translations.ui_russian,
        translations.ui_japanese,
        translations.ui_traditional_chinese,
        translations.ui_english,
    )
    _materialize_game_terms(output, translations.game_russian, translations.game_english)
    _publish_translation_workbook(root, output)
    _materialize_generated_data(root, output)
    materialize_native_passives(root, output)

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
