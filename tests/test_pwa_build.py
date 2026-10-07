import pathlib
import unittest
from scripts.build_pages import build_pages
from tests.test_build_pages import BuildPagesTests
import tempfile

class OnlineBuildTests(unittest.TestCase):
    def test_online_assets_and_legacy_preservation(self):
        with tempfile.TemporaryDirectory() as td:
            root=BuildPagesTests().make_root(pathlib.Path(td))
            build_pages(root, root / '_site')
            html=(root / '_site/index.html').read_text(encoding='utf-8')
            self.assertNotIn('rel="manifest"',html)
            self.assertNotIn('controllerchange',html)
            self.assertFalse((root / '_site/modern/manifest.webmanifest').exists())
            self.assertEqual((root/'index.html').read_bytes(),(root/'_site/legacy/index.html').read_bytes())

    def test_retirement_worker_has_no_fetch_or_offline_storage(self):
        worker=(pathlib.Path(__file__).resolve().parents[1]/'modern/service-worker.js').read_text(encoding='utf-8')
        self.assertIn('self.registration.unregister()',worker)
        self.assertIn('self.skipWaiting()',worker)
        self.assertNotIn("addEventListener('fetch'",worker)
        self.assertNotIn('caches.open',worker)
        self.assertNotIn('PRECACHE',worker)
