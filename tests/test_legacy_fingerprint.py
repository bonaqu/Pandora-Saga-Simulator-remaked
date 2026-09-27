import hashlib
import pathlib
import tempfile
import unittest

from scripts.legacy_fingerprint import fingerprint_file, verify_manifest


class LegacyFingerprintTests(unittest.TestCase):
    def test_fingerprint_file_is_deterministic_sha256(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "fixture.bin"
            path.write_bytes(b"Pandora Saga\n")
            expected = hashlib.sha256(b"Pandora Saga\n").hexdigest()
            self.assertEqual(fingerprint_file(path), expected)
            self.assertEqual(fingerprint_file(path), expected)

    def test_verify_manifest_reports_changed_bytes(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            target = root / "index.html"
            target.write_text("before", encoding="utf-8")
            manifest = root / "manifest.sha256"
            manifest.write_text(f"{fingerprint_file(target)}  index.html\n", encoding="utf-8")
            target.write_text("after", encoding="utf-8")
            errors = verify_manifest(root, manifest)
            self.assertTrue(any("changed" in error and "index.html" in error for error in errors))

    def test_verify_manifest_reports_missing_file(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            manifest = root / "manifest.sha256"
            manifest.write_text(f"{'0' * 64}  js/calc.js\n", encoding="utf-8")
            errors = verify_manifest(root, manifest)
            self.assertTrue(any("missing" in error and "js/calc.js" in error for error in errors))

    def test_verify_manifest_rejects_path_escape(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            manifest = root / "manifest.sha256"
            manifest.write_text(f"{'0' * 64}  ../outside.txt\n", encoding="utf-8")
            errors = verify_manifest(root, manifest)
            self.assertTrue(any("escapes repository root" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
