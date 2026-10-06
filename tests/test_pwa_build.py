import json
import pathlib
import struct
import tempfile
import unittest

from scripts.build_pages import build_pages
from tests import test_build_pages
from tests.test_translation_workbook import set_russian_cell


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
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
});
"""


class PwaBuildTests(unittest.TestCase):
    def test_real_manifest_has_raster_fallbacks_and_touch_icon(self):
        modern = pathlib.Path(__file__).resolve().parents[1] / "modern"
        manifest = json.loads((modern / "manifest.webmanifest").read_text(encoding="utf-8"))
        png_icons = [icon for icon in manifest["icons"] if icon["type"] == "image/png"]
        self.assertEqual({icon["sizes"] for icon in png_icons}, {"192x192", "512x512"})
        for size in (180, 192, 512):
            name = "apple-touch-icon.png" if size == 180 else f"icon-{size}.png"
            raw = (modern / name).read_bytes()
            self.assertEqual(raw[:8], b"\x89PNG\r\n\x1a\n")
            self.assertEqual(struct.unpack(">II", raw[16:24]), (size, size))
        preview = (modern / "social-preview.png").read_bytes()
        self.assertEqual(preview[:8], b"\x89PNG\r\n\x1a\n")
        self.assertEqual(struct.unpack(">II", preview[16:24]), (1200, 630))

    def test_real_service_worker_keeps_each_client_on_one_cache_generation(self):
        modern = pathlib.Path(__file__).resolve().parents[1] / "modern"
        worker = (modern / "service-worker.js").read_text(encoding="utf-8")
        self.assertIn("function navigationCacheFirst(request)", worker)
        self.assertIn("request.mode === 'navigate' ? navigationCacheFirst(request) : cacheFirst(request)", worker)
        self.assertIn("caches.open(CACHE_NAME)", worker)
        self.assertIn("new Request(url, { cache: 'reload' })", worker)
        self.assertNotIn("return caches.match(", worker)
        self.assertNotIn("function networkFirst(request)", worker)

    def test_modern_share_metadata_does_not_leak_into_museum(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)
            html = (output / "index.html").read_text(encoding="utf-8")
            self.assertIn('property="og:title" content="Pandora Saga Simulator — Remaked"', html)
            self.assertIn('property="og:image" content="https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/modern/social-preview.png"', html)
            self.assertIn('name="twitter:card" content="summary_large_image"', html)
            self.assertIn('rel="apple-touch-icon" sizes="180x180" href="./modern/apple-touch-icon.png"', html)
            legacy = (output / "legacy/index.html").read_text(encoding="utf-8")
            self.assertNotIn('property="og:', legacy)
            self.assertNotIn('apple-touch-icon', legacy)

    def make_root(self, base: pathlib.Path) -> pathlib.Path:
        root = test_build_pages.BuildPagesTests().make_root(base)
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

    def test_modern_html_bootstraps_existing_service_worker_updates_without_touching_legacy(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)

            html = (output / "index.html").read_text(encoding="utf-8")
            legacy = (output / "legacy" / "index.html").read_text(encoding="utf-8")
            self.assertIn("navigator.serviceWorker.getRegistration()", html)
            self.assertIn("registration.update().then(activateWaiting)", html)
            self.assertIn("window.__pandoraPwaBootstrapUpdating = true", html)
            self.assertIn("registration.waiting.postMessage({ type: 'SKIP_WAITING' })", html)
            self.assertIn("navigator.serviceWorker.addEventListener('controllerchange'", html)
            self.assertLess(
                html.index("navigator.serviceWorker.getRegistration()"),
                html.index('<link rel="stylesheet" href="./modern/modern.css" />'),
            )
            self.assertNotIn("navigator.serviceWorker.getRegistration()", legacy)

    def test_generates_versioned_root_service_worker_with_bounded_precache(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)

            worker_path = output / "service-worker.js"
            self.assertTrue(worker_path.is_file())
            self.assertFalse((output / "modern" / "service-worker.js").exists())
            worker = worker_path.read_text(encoding="utf-8")
            self.assertIn("pandora-remaked-3.11", worker)
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
            self.assertNotIn("./modern/social-preview.png", worker)
            self.assertNotIn("./legacy/image/icon/0000.png", worker)
            self.assertNotIn("https://", worker)
            self.assertIn("url.origin !== self.location.origin", worker)

    def test_service_worker_logic_change_rotates_cache_generation(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)
            before = (output / "service-worker.js").read_text(encoding="utf-8")
            before_name = before.split("const CACHE_NAME = '", 1)[1].split("'", 1)[0]

            template = root / "modern" / "service-worker.js"
            template.write_text(
                template.read_text(encoding="utf-8") + "\n// worker-only regression marker\n",
                encoding="utf-8",
            )
            build_pages(root, output)
            after = (output / "service-worker.js").read_text(encoding="utf-8")
            after_name = after.split("const CACHE_NAME = '", 1)[1].split("'", 1)[0]

            self.assertNotEqual(after_name, before_name)

    def test_translation_only_update_changes_worker_and_keeps_builds_deterministic(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(pathlib.Path(td))
            output = root / "_site"
            build_pages(root, output)
            before = (output / "service-worker.js").read_bytes()
            build_pages(root, output)
            self.assertEqual((output / "service-worker.js").read_bytes(), before)

            set_russian_cell(root / "localization/translations.xlsx", "equipment.0.1", "Проверочный предмет")
            build_pages(root, output)
            after = (output / "service-worker.js").read_bytes()
            self.assertNotEqual(after, before)
            self.assertIn("Проверочный предмет", (output / "modern/game-terms.js").read_text(encoding="utf-8"))
            build_pages(root, output)
            self.assertEqual((output / "service-worker.js").read_bytes(), after)


if __name__ == "__main__":
    unittest.main()
