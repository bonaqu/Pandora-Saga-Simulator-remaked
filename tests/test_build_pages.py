import base64
import json
import pathlib
import tempfile
import unittest

from scripts.build_pages import build_pages


LEGACY_HTML = '''<!DOCTYPE html><html><head><title>Pandora Saga Simulator</title></head><body>
<script>Flag = new Array(\n   0 // [ 0]\n  ,1 // [ 1]\n);</script>
<div id="body">legacy</div></body></html>'''

SIMULATOR_BROWSER_COMPAT_FIXTURE = '''
function SkillBar() {
  tmp += 'url(./image/interface/bar_green.png)';
  tmp += 'url(./image/interface/bar_blue.png)';
}
'''

HERO_WEBP_FIXTURE = b"RIFF\x04\x00\x00\x00WEBP"


class BuildPagesTests(unittest.TestCase):
    def make_root(self, base: pathlib.Path, with_modern: bool = True) -> pathlib.Path:
        root = base / "repo"
        root.mkdir()
        (root / "index.html").write_text(LEGACY_HTML, encoding="utf-8")
        (root / "readme.txt").write_text("readme", encoding="utf-8")
        for dirname in ("css", "js", "image"):
            (root / dirname).mkdir()
            (root / dirname / "fixture.txt").write_text(dirname, encoding="utf-8")
        (root / "js" / "simulator.js").write_text(SIMULATOR_BROWSER_COMPAT_FIXTURE, encoding="utf-8")
        if with_modern:
            modern = root / "modern"
            modern.mkdir()
            (modern / "modern.css").write_text("/* modern */", encoding="utf-8")
            (modern / "search.css").write_text("/* search */", encoding="utf-8")
            (modern / "builds.css").write_text("/* builds */", encoding="utf-8")
            (modern / "compare.css").write_text("/* compare */", encoding="utf-8")
            (modern / "tooltips.css").write_text("/* tooltips */", encoding="utf-8")
            (modern / "mobile.css").write_text("/* mobile */", encoding="utf-8")
            (modern / "pwa.css").write_text("/* pwa */", encoding="utf-8")
            (modern / "version.js").write_text(
                "window.PandoraRemakedVersion = { ui: '2026.09.4' };",
                encoding="utf-8",
            )
            (modern / "i18n.js").write_text("// i18n", encoding="utf-8")
            (modern / "adapter.js").write_text("// adapter", encoding="utf-8")
            (modern / "build-store.js").write_text("// build store", encoding="utf-8")
            (modern / "search.js").write_text("// search", encoding="utf-8")
            (modern / "app-shell.js").write_text("// shell", encoding="utf-8")
            (modern / "builds.js").write_text("// builds", encoding="utf-8")
            (modern / "tooltips.js").write_text("// tooltips", encoding="utf-8")
            (modern / "compare.js").write_text("// compare", encoding="utf-8")
            (modern / "mobile.js").write_text("// mobile", encoding="utf-8")
            (modern / "pwa.js").write_text("// pwa", encoding="utf-8")
            localization = root / "localization"
            localization.mkdir()
            (localization / "ui.en.json").write_text(
                json.dumps({"shell.title": "Title"}), encoding="utf-8"
            )
            (localization / "ui.ru.json").write_text(
                json.dumps({}), encoding="utf-8"
            )
            (modern / "favicon.svg").write_text("<svg xmlns='http://www.w3.org/2000/svg'/>", encoding="utf-8")
            (modern / "manifest.webmanifest").write_text(
                json.dumps({"name": "fixture"}),
                encoding="utf-8",
            )
            for size in (192, 512):
                (modern / f"icon-{size}.svg").write_text(
                    f"<svg xmlns='http://www.w3.org/2000/svg' width='{size}' height='{size}'/>",
                    encoding="utf-8",
                )
            (modern / "service-worker.js").write_text(
                "const CACHE_NAME = '__CACHE_VERSION__'; const PRECACHE_URLS = __PRECACHE_URLS__;",
                encoding="utf-8",
            )
            parts = modern / "pandora-hero.parts"
            parts.mkdir()
            encoded = base64.b64encode(HERO_WEBP_FIXTURE).decode("ascii")
            midpoint = len(encoded) // 2
            (parts / "00.b64").write_text(encoded[:midpoint], encoding="ascii")
            (parts / "01.b64").write_text(encoded[midpoint:], encoding="ascii")
        return root

    def test_builds_modern_and_self_contained_legacy(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            source_bytes = (root / "index.html").read_bytes()
            output = root / "_site"
            build_pages(root, output)
            self.assertEqual((output / "legacy" / "index.html").read_bytes(), source_bytes)
            for relative in (
                "legacy/css/fixture.txt",
                "legacy/js/fixture.txt",
                "legacy/image/fixture.txt",
                "legacy/readme.txt",
            ):
                self.assertTrue((output / relative).is_file(), relative)

    def test_reconstructs_self_contained_hero_asset_from_source_parts(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)
            hero = output / "modern" / "pandora-hero.webp"
            self.assertEqual(hero.read_bytes(), HERO_WEBP_FIXTURE)
            self.assertFalse((output / "modern" / "pandora-hero.parts").exists())

    def test_deployed_runtime_replaces_missing_legacy_skill_bar_images(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            original = (root / "js" / "simulator.js").read_text(encoding="utf-8")
            output = root / "_site"
            build_pages(root, output)
            self.assertIn("bar_green.png", original)
            self.assertIn("bar_blue.png", original)
            for relative in ("js/simulator.js", "legacy/js/simulator.js"):
                deployed = (output / relative).read_text(encoding="utf-8")
                self.assertNotIn("bar_green.png", deployed)
                self.assertNotIn("bar_blue.png", deployed)
                self.assertIn("linear-gradient", deployed)

    def test_modern_injects_assets_once_and_defaults_to_english(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)
            html = (output / "index.html").read_text(encoding="utf-8")
            for relative in (
                "modern/modern.css",
                "modern/search.css",
                "modern/builds.css",
                "modern/compare.css",
                "modern/tooltips.css",
                "modern/mobile.css",
                "modern/pwa.css",
                "modern/favicon.svg",
                "modern/manifest.webmanifest",
                "modern/version.js",
                "modern/locales.js",
                "modern/i18n.js",
                "modern/adapter.js",
                "modern/build-store.js",
                "modern/search.js",
                "modern/app-shell.js",
                "modern/builds.js",
                "modern/tooltips.js",
                "modern/compare.js",
                "modern/mobile.js",
                "modern/pwa.js",
            ):
                self.assertEqual(html.count(relative), 1, relative)
            self.assertLess(html.index("modern/version.js"), html.index("modern/locales.js"))
            self.assertLess(html.index("modern/locales.js"), html.index("modern/i18n.js"))
            self.assertLess(html.index("modern/i18n.js"), html.index("modern/adapter.js"))
            self.assertLess(html.index("modern/adapter.js"), html.index("modern/build-store.js"))
            self.assertLess(html.index("modern/build-store.js"), html.index("modern/search.js"))
            self.assertLess(html.index("modern/search.js"), html.index("modern/app-shell.js"))
            self.assertLess(html.index("modern/app-shell.js"), html.index("modern/builds.js"))
            self.assertLess(html.index("modern/builds.js"), html.index("modern/tooltips.js"))
            self.assertLess(html.index("modern/tooltips.js"), html.index("modern/compare.js"))
            self.assertLess(html.index("modern/compare.js"), html.index("modern/mobile.js"))
            self.assertLess(html.index("modern/mobile.js"), html.index("modern/pwa.js"))
            self.assertLess(html.index("modern/tooltips.css"), html.index("modern/mobile.css"))
            self.assertLess(html.index("modern/mobile.css"), html.index("modern/pwa.css"))
            self.assertIn("   1 // [ 0]", html)
            self.assertIn(
                'data-project-url="https://github.com/bonaqu/Pandora-Saga-Simulator-remaked"',
                html,
            )
            self.assertIn(
                'data-updates-url="https://github.com/bonaqu/Pandora-Saga-Simulator-remaked/blob/bonaqu_projects/CHANGELOG.md"',
                html,
            )
            self.assertIn('data-legacy-url="./legacy/"', html)
            legacy = (output / "legacy" / "index.html").read_text(encoding="utf-8")
            self.assertIn("   0 // [ 0]", legacy)
            for relative in (
                "modern/locales.js",
                "modern/i18n.js",
                "modern/adapter.js",
                "modern/build-store.js",
                "modern/search.js",
                "modern/builds.js",
                "modern/tooltips.js",
                "modern/compare.js",
                "modern/mobile.js",
                "modern/pwa.js",
                "modern/search.css",
                "modern/builds.css",
                "modern/compare.css",
                "modern/tooltips.css",
                "modern/mobile.css",
                "modern/pwa.css",
                "modern/manifest.webmanifest",
            ):
                self.assertNotIn(relative, legacy)

    def test_builds_validated_localization_catalogs_with_english_fallback_source(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)
            locales = (output / "modern" / "locales.js").read_text(encoding="utf-8")
            self.assertIn('"en": {"shell.title": "Title"}', locales)
            self.assertIn('"ru": {}', locales)

            (root / "localization" / "ui.ru.json").write_text(
                json.dumps({"unknown": "value"}), encoding="utf-8"
            )
            with self.assertRaisesRegex(ValueError, "unknown keys"):
                build_pages(root, output)

    def test_copies_shared_runtime_and_modern_assets(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)
            for relative in (
                "css/fixture.txt",
                "js/fixture.txt",
                "image/fixture.txt",
                "readme.txt",
                "modern/modern.css",
                "modern/search.css",
                "modern/builds.css",
                "modern/compare.css",
                "modern/tooltips.css",
                "modern/mobile.css",
                "modern/pwa.css",
                "modern/favicon.svg",
                "modern/manifest.webmanifest",
                "modern/icon-192.svg",
                "modern/icon-512.svg",
                "modern/version.js",
                "modern/locales.js",
                "modern/i18n.js",
                "modern/adapter.js",
                "modern/build-store.js",
                "modern/search.js",
                "modern/app-shell.js",
                "modern/builds.js",
                "modern/tooltips.js",
                "modern/compare.js",
                "modern/mobile.js",
                "modern/pwa.js",
                "modern/pandora-hero.webp",
                "service-worker.js",
                ".nojekyll",
            ):
                self.assertTrue((output / relative).exists(), relative)
            self.assertFalse((output / "modern" / "service-worker.js").exists())

    def test_missing_modern_assets_fails_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td), with_modern=False)
            with self.assertRaisesRegex(FileNotFoundError, "modern/modern.css"):
                build_pages(root, root / "_site")

    def test_missing_adapter_fails_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "adapter.js").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/adapter.js"):
                build_pages(root, root / "_site")

    def test_missing_build_store_fails_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "build-store.js").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/build-store.js"):
                build_pages(root, root / "_site")

    def test_missing_search_assets_fail_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "search.js").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/search.js"):
                build_pages(root, root / "_site")

    def test_missing_build_manager_assets_fail_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "builds.js").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/builds.js"):
                build_pages(root, root / "_site")

    def test_missing_compare_assets_fail_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "compare.js").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/compare.js"):
                build_pages(root, root / "_site")

    def test_missing_tooltip_assets_fail_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "tooltips.js").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/tooltips.js"):
                build_pages(root, root / "_site")

    def test_missing_mobile_assets_fail_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "mobile.js").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/mobile.js"):
                build_pages(root, root / "_site")

    def test_missing_pwa_assets_fail_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "manifest.webmanifest").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/manifest.webmanifest"):
                build_pages(root, root / "_site")

    def test_missing_pwa_runtime_fails_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "pwa.js").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/pwa.js"):
                build_pages(root, root / "_site")

    def test_missing_hero_parts_fails_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            for part in (root / "modern" / "pandora-hero.parts").iterdir():
                part.unlink()
            with self.assertRaisesRegex(FileNotFoundError, "pandora-hero.parts"):
                build_pages(root, root / "_site")

    def test_missing_hero_chunk_in_sequence_fails_before_publish(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            parts = root / "modern" / "pandora-hero.parts"
            (parts / "01.b64").rename(parts / "02.b64")
            with self.assertRaisesRegex(ValueError, "contiguous from 00.b64"):
                build_pages(root, root / "_site")

    def test_refuses_to_delete_output_outside_repository(self):
        with tempfile.TemporaryDirectory() as td, tempfile.TemporaryDirectory() as out_td:
            root = self.make_root(pathlib.Path(td))
            with self.assertRaisesRegex(ValueError, "inside repository"):
                build_pages(root, pathlib.Path(out_td) / "_site")


if __name__ == "__main__":
    unittest.main()
