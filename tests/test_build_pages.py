import base64
import json
import pathlib
import shutil
import tempfile
import unittest

from scripts.build_pages import build_pages, _materialize_modern_guild_resistance
from scripts.translation_workbook import load_editable_catalogs, load_translation_catalogs


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
    def test_guild_damage_reduction_only_patches_modern_calculator(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary) / "repo"
            source = pathlib.Path(__file__).resolve().parents[1] / "js/calc.js"
            (root / "js").mkdir(parents=True)
            shutil.copy2(source, root / "js/calc.js")
            output = root / "_site"
            (output / "js").mkdir(parents=True)
            shutil.copy2(source, output / "js/calc.js")
            original = source.read_bytes()
            _materialize_modern_guild_resistance(root, output)
            patched = (output / "js/calc.js").read_text(encoding="utf-8")
            self.assertIn("SelBuffClan_5').selectedIndex == 1) ? -3", patched)
            self.assertIn("SelBuffClan_5').selectedIndex == 2) ? -6", patched)
            self.assertIn("SelBuffClan_6').selectedIndex == 1) ? -3", patched)
            self.assertIn("SelBuffClan_6').selectedIndex == 2) ? -6", patched)
            self.assertEqual(source.read_bytes(), original)
            # Drift in a source anchor fails closed instead of silently
            # deploying broken damage-reduction behavior.
            (root / "js/calc.js").write_text("corrupted source", encoding="utf-8")
            with self.assertRaises(ValueError):
                _materialize_modern_guild_resistance(root, output)


    def test_modern_omits_only_obsolete_hidden_counter_and_preserves_legacy(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = pathlib.Path(temporary)
            root = self.make_root(base)
            counter = '<img src="//media.fc2.com/counter_img.php?id=50" style="display:none" alt="inserted by FC2 system" width="0" height="0">'
            content = '<img src="./image/fixture.txt" alt="game content"><a href="http://awayfromkuma.blog87.fc2.com/">Original author</a>'
            source = LEGACY_HTML.replace('</body>', counter + content + '</body>')
            (root / 'index.html').write_text(source, encoding='utf-8')
            original = (root / 'index.html').read_bytes()
            output = root / '_site'
            build_pages(root, output)
            modern = (output / 'index.html').read_text(encoding='utf-8')
            self.assertNotIn('counter_img.php', modern)
            self.assertIn(content, modern)
            self.assertEqual((output / 'legacy/index.html').read_bytes(), original)
            self.assertEqual((root / 'index.html').read_bytes(), original)

    def make_root(self, base: pathlib.Path, with_modern: bool = True) -> pathlib.Path:
        root = base / "repo"
        root.mkdir()
        (root / "index.html").write_text(LEGACY_HTML, encoding="utf-8")
        (root / "readme.txt").write_text("readme", encoding="utf-8")
        (root / "CHANGELOG.md").write_text(
            """# Changelog

All notable player-facing changes to **Pandora Saga Simulator Remaked** are recorded here.

## Modern 3.11 — fixture release, 2026-10-05

<!-- release-notes:ru -->
### Кратко
- Проверка русского release note.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Highlights
- Fixture English release note.
<!-- /release-notes:en -->

## Modern 3.10 — older fixture, 2026-10-04
- Older entry.
""",
            encoding="utf-8",
        )
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
            (modern / "version.js").write_text(
                "window.PandoraRemakedVersion = { ui: '2026.09.4' };",
                encoding="utf-8",
            )
            (modern / "i18n.js").write_text("// i18n", encoding="utf-8")
            (modern / "game-term-display.js").write_text("// game terms", encoding="utf-8")
            (modern / "calculator-labels.js").write_text("// label sources", encoding="utf-8")
            (modern / "calculator-controls.js").write_text("// native controls", encoding="utf-8")
            (modern / "skill-controls.js").write_text("// native skills", encoding="utf-8")
            (modern / "skill-tooltips.js").write_text("// skill tooltip surface", encoding="utf-8")
            (modern / "adapter.js").write_text("// adapter", encoding="utf-8")
            (modern / "share-codec.js").write_text("// share codec", encoding="utf-8")
            (modern / "catalog-text.js").write_text("// text", encoding="utf-8")
            (modern / "identity-aliases.js").write_text("// aliases", encoding="utf-8")
            (modern / "catalog.js").write_text("// versioned public catalog", encoding="utf-8")
            (modern / "enhancement-effects.js").write_text("// server enhancement mechanics", encoding="utf-8")
            (modern / "admin-entry.js").write_text("// hidden entry", encoding="utf-8")
            (modern / "admin-entry.css").write_text("/* terminal */", encoding="utf-8")
            (modern / "build-store.js").write_text("// build store", encoding="utf-8")
            (modern / "search.js").write_text("// search", encoding="utf-8")
            (modern / "equipment-picker.js").write_text("// equipment picker", encoding="utf-8")
            (modern / "app-shell.js").write_text("// shell", encoding="utf-8")
            (modern / "builds.js").write_text("// builds", encoding="utf-8")
            (modern / "tooltips.js").write_text("// tooltips", encoding="utf-8")
            (modern / "compare.js").write_text("// compare", encoding="utf-8")
            (modern / "mobile.js").write_text("// mobile", encoding="utf-8")
            (modern / "pwa.js").write_text("// pwa", encoding="utf-8")
            localization = root / "localization"
            localization.mkdir()
            repository_localization = pathlib.Path(__file__).resolve().parents[1] / "localization"
            for name in ("ui.en.json", "game-terms.ru.json", "translations.xlsx", "approved-translations.v1.json"):
                shutil.copy2(repository_localization / name, localization / name)
            generated = root / "data" / "generated"
            generated.mkdir(parents=True)
            repository = pathlib.Path(__file__).resolve().parents[1]
            shutil.copy2(repository / "data/native-passive-hooks.v1.json", root / "data/native-passive-hooks.v1.json")
            shutil.copy2(repository / "js/calc.js", root / "js/calc.js")
            for name in ("equipment.v1.json", "souls.v1.json", "skills.v1.json"):
                (generated / name).write_text(
                    json.dumps({"kind": name.removesuffix(".v1.json"), "records": []}),
                    encoding="utf-8",
                )
            (modern / "favicon.svg").write_text("<svg xmlns='http://www.w3.org/2000/svg'/>", encoding="utf-8")
            for name in ("apple-touch-icon.png", "social-preview.png"):
                (modern / name).write_bytes(b"fixture-png")
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
                "modern/favicon.svg",
                "modern/version.js",
                "modern/release-notes.js",
                "modern/locales.js",
                "modern/game-terms.js",
                "modern/i18n.js",
                "modern/adapter.js",
                "modern/catalog.js",
                "modern/admin-entry.js",
                "modern/admin-entry.css",
                "modern/calculator-controls.js",
                "modern/skill-controls.js",
                "modern/build-store.js",
                "modern/search.js",
                "modern/app-shell.js",
                "modern/calculator-labels.js",
                "modern/game-term-display.js",
                "modern/builds.js",
                "modern/tooltips.js",
                "modern/compare.js",
                "modern/mobile.js",
                "modern/pwa.js",
            ):
                self.assertEqual(html.count(relative), 1, relative)
            self.assertLess(html.index("modern/version.js"), html.index("modern/release-notes.js"))
            self.assertLess(html.index("modern/release-notes.js"), html.index("modern/locales.js"))
            self.assertLess(html.index("modern/locales.js"), html.index("modern/game-terms.js"))
            self.assertLess(html.index("modern/game-terms.js"), html.index("modern/i18n.js"))
            self.assertLess(html.index("modern/i18n.js"), html.index("modern/adapter.js"))
            self.assertLess(html.index("modern/adapter.js"), html.index("modern/build-store.js"))
            self.assertLess(html.index("modern/build-store.js"), html.index("modern/catalog.js"))
            self.assertLess(html.index("modern/catalog.js"), html.index("modern/search.js"))
            self.assertLess(html.index("modern/build-store.js"), html.index("modern/search.js"))
            self.assertLess(html.index("modern/search.js"), html.index("modern/app-shell.js"))
            self.assertLess(html.index("modern/app-shell.js"), html.index("modern/builds.js"))
            self.assertLess(html.index("modern/calculator-labels.js"), html.index("modern/game-term-display.js"))
            self.assertLess(html.index("modern/game-term-display.js"), html.index("modern/mobile.js"))
            self.assertLess(html.index("modern/builds.js"), html.index("modern/tooltips.js"))
            self.assertLess(html.index("modern/tooltips.js"), html.index("modern/compare.js"))
            self.assertLess(html.index("modern/compare.js"), html.index("modern/mobile.js"))
            self.assertLess(html.index("modern/mobile.js"), html.index("modern/pwa.js"))
            self.assertLess(html.index("modern/tooltips.css"), html.index("modern/mobile.css"))
            self.assertNotIn('rel="manifest"', html)
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
            version_js = (output / "modern" / "version.js").read_text(encoding="utf-8")
            version_json = json.loads((output / "modern" / "version.json").read_text(encoding="utf-8"))
            release_js = (output / "modern" / "release-notes.js").read_text(encoding="utf-8")
            self.assertIn('"ui":"3.11"', version_js)
            self.assertEqual(version_json, {"legacyEngine": "2.00", "ui": "3.11"})
            self.assertIn('modern/modern.css?v=3.11', html)
            self.assertIn('modern/pwa.js?v=3.11', html)
            self.assertIn('"version":"3.11"', release_js)
            self.assertIn("Fixture English release note.", release_js)
            self.assertIn("Проверка русского release note.", release_js)
            for name in ("equipment.v1.json", "souls.v1.json", "skills.v1.json"):
                projection = json.loads((output / "data" / "generated" / name).read_text(encoding="utf-8"))
                self.assertEqual(projection["metadata"]["remaked_ui"], "3.11")
            legacy = (output / "legacy" / "index.html").read_text(encoding="utf-8")
            self.assertIn("   0 // [ 0]", legacy)
            for relative in (
                "modern/locales.js",
                "modern/game-terms.js",
                "modern/i18n.js",
                "modern/calculator-labels.js",
                "modern/game-term-display.js",
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
            ):
                self.assertNotIn(relative, legacy)

    def test_builds_validated_localization_catalogs_with_english_fallback_source(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)
            locales = (output / "modern" / "locales.js").read_text(encoding="utf-8")
            self.assertIn('"controls.interfaceLanguage": "Interface language"', locales)
            ui_russian, game_russian, _ = load_translation_catalogs(root)
            editable = load_editable_catalogs(root)
            parsed_locales = json.loads(locales.split("Object.freeze(", 1)[1].removesuffix(");\n"))
            self.assertEqual(parsed_locales["ru"], ui_russian)
            self.assertEqual(parsed_locales["jp"], editable.ui_japanese)
            self.assertEqual(parsed_locales["tw"], editable.ui_traditional_chinese)
            game_terms = (output / "modern" / "game-terms.js").read_text(encoding="utf-8")
            parsed_game = json.loads(game_terms.split(" = ", 1)[1].removesuffix(";\n"))
            self.assertEqual(parsed_game["ru"], game_russian)
            self.assertFalse((output / "localization" / "translations.xlsx").exists())

    def test_recovers_archived_codecs_only_in_published_runtime(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            archived = '<html><table class="code"><tr><th id="L1">1</th><td>window.fixture = 1;</td></tr></table></html>'
            for name in ("base64.js", "rawinflate.js", "rawdeflate.js"):
                (root / "js" / name).write_text(archived, encoding="utf-8")
            output = root / "_site"
            build_pages(root, output)
            for name in ("base64.js", "rawinflate.js", "rawdeflate.js"):
                self.assertEqual((root / "js" / name).read_text(encoding="utf-8"), archived)
                for route in (output, output / "legacy"):
                    self.assertEqual((route / "js" / name).read_text(encoding="utf-8"), "window.fixture = 1;\n")

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
                "modern/favicon.svg",
                "modern/version.js",
                "modern/version.json",
                "modern/release-notes.js",
                "modern/locales.js",
                "modern/game-terms.js",
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
                "data/generated/equipment.v1.json",
                "data/generated/souls.v1.json",
                "data/generated/skills.v1.json",
                "modern/game-terms.js",
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

    def test_missing_calculator_controls_fails_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "calculator-controls.js").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/calculator-controls.js"):
                build_pages(root, root / "_site")

    def test_missing_skill_controls_fails_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "skill-controls.js").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/skill-controls.js"):
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

    def test_online_build_has_no_pwa_manifest(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            build_pages(root, root / "_site")
            self.assertFalse((root / "_site/modern/manifest.webmanifest").exists())
            self.assertTrue((root / "_site/modern/version.json").is_file())

    def test_missing_pwa_runtime_fails_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "modern" / "pwa.js").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "modern/pwa.js"):
                build_pages(root, root / "_site")

    def test_missing_generated_projection_fails_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            (root / "data" / "generated" / "skills.v1.json").unlink()
            with self.assertRaisesRegex(FileNotFoundError, "data/generated/skills.v1.json"):
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
