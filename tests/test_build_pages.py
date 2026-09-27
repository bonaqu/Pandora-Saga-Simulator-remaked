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
            (root / "modern").mkdir()
            (root / "modern" / "modern.css").write_text("/* modern */", encoding="utf-8")
            (root / "modern" / "version.js").write_text("// version", encoding="utf-8")
            (root / "modern" / "app-shell.js").write_text("// shell", encoding="utf-8")
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
            self.assertEqual(html.count("modern/modern.css"), 1)
            self.assertEqual(html.count("modern/version.js"), 1)
            self.assertEqual(html.count("modern/app-shell.js"), 1)
            self.assertLess(html.index("modern/version.js"), html.index("modern/app-shell.js"))
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
                "modern/version.js",
                "modern/app-shell.js",
                ".nojekyll",
            ):
                self.assertTrue((output / relative).exists(), relative)

    def test_missing_modern_assets_fails_clearly(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td), with_modern=False)
            with self.assertRaisesRegex(FileNotFoundError, "modern/modern.css"):
                build_pages(root, root / "_site")

    def test_refuses_to_delete_output_outside_repository(self):
        with tempfile.TemporaryDirectory() as td, tempfile.TemporaryDirectory() as out_td:
            root = self.make_root(pathlib.Path(td))
            with self.assertRaisesRegex(ValueError, "inside repository"):
                build_pages(root, pathlib.Path(out_td) / "_site")


if __name__ == "__main__":
    unittest.main()
