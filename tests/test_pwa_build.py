import json
import pathlib
import tempfile
import unittest

from scripts.build_pages import build_pages
from tests.test_build_pages import BuildPagesTests


MANIFEST = {
    "name": "Pandora Saga Simulator — Remaked",
    "short_name": "Pandora Simulator",
    "start_url": "../",
    "scope": "../",
    "display": "standalone",
    "theme_color": "#669b36",
    "background_color": "#f4f6ed",
    "icons": [
        {
            "src": "./icon-192.svg",
            "sizes": "192x192",
            "type": "image/svg+xml",
            "purpose": "any maskable",
        },
        {
            "src": "./icon-512.svg",
            "sizes": "512x512",
            "type": "image/svg+xml",
            "purpose": "any maskable",
        },
    ],
}

SERVICE_WORKER_TEMPLATE = """const CACHE_NAME = 'pandora-remaked-__CACHE_VERSION__';
const PRECACHE_URLS = __PRECACHE_URLS__;
"""


class PwaBuildTests(unittest.TestCase):
    def make_root(self, base: pathlib.Path) -> pathlib.Path:
        root = BuildPagesTests().make_root(base)
        modern = root / "modern"
        (modern / "version.js").write_text(
            "window.PandoraRemakedVersion = { ui: '2026.09.4' };",
            encoding="utf-8",
        )
        (modern / "manifest.webmanifest").write_text(
            json.dumps(MANIFEST, ensure_ascii=False),
            encoding="utf-8",
        )
        for size in (192, 512):
            (modern / f"icon-{size}.svg").write_text(
                f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}"/>',
                encoding="utf-8",
            )
        (modern / "service-worker.js").write_text(
            SERVICE_WORKER_TEMPLATE,
            encoding="utf-8",
        )
        interface = root / "image" / "interface"
        interface.mkdir()
        (interface / "up1.png").write_bytes(b"interface")
        item_icons = root / "image" / "icon"
        item_icons.mkdir()
        (item_icons / "0000.png").write_bytes(b"bulk-item-icon")
        return root

    def test_injects_install_metadata_and_preserves_subpath_safe_manifest(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)

            html = (output / "index.html").read_text(encoding="utf-8")
            self.assertEqual(html.count("./modern/manifest.webmanifest"), 1)
            self.assertIn('name="theme-color" content="#669b36"', html)
            self.assertIn('name="background-color" content="#f4f6ed"', html)

            manifest = json.loads(
                (output / "modern" / "manifest.webmanifest").read_text(encoding="utf-8")
            )
            self.assertEqual(manifest["name"], "Pandora Saga Simulator — Remaked")
            self.assertEqual(manifest["short_name"], "Pandora Simulator")
            self.assertEqual(manifest["display"], "standalone")
            self.assertEqual(manifest["start_url"], "../")
            self.assertEqual(manifest["scope"], "../")
            self.assertEqual(manifest["theme_color"], "#669b36")
            self.assertEqual(manifest["background_color"], "#f4f6ed")
            self.assertEqual(
                {(icon["sizes"], icon["purpose"]) for icon in manifest["icons"]},
                {("192x192", "any maskable"), ("512x512", "any maskable")},
            )

    def test_generates_versioned_root_service_worker_with_bounded_precache(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)

            worker_path = output / "service-worker.js"
            self.assertTrue(worker_path.is_file())
            self.assertFalse((output / "modern" / "service-worker.js").exists())
            worker = worker_path.read_text(encoding="utf-8")
            self.assertIn("pandora-remaked-2026.09.4", worker)
            for relative in (
                "./index.html",
                "./css/fixture.txt",
                "./js/fixture.txt",
                "./image/interface/up1.png",
                "./modern/manifest.webmanifest",
                "./modern/mobile.js",
                "./modern/pandora-hero.webp",
                "./legacy/index.html",
                "./legacy/css/fixture.txt",
                "./legacy/js/fixture.txt",
                "./legacy/image/interface/up1.png",
            ):
                self.assertIn(relative, worker)
            self.assertNotIn("./image/icon/0000.png", worker)
            self.assertNotIn("./legacy/image/icon/0000.png", worker)
            self.assertNotIn("https://", worker)
            self.assertIn("url.origin !== self.location.origin", worker)


if __name__ == "__main__":
    unittest.main()
