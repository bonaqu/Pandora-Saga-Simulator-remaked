import base64
import pathlib
import tempfile
import unittest

from scripts.build_pages import _materialize_modern_assets


class HeroAssetValidationTests(unittest.TestCase):
    def test_rejects_webp_with_trailing_bytes_outside_declared_riff(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td) / "repo"
            output = root / "_site"
            parts = root / "modern" / "pandora-hero.parts"
            parts.mkdir(parents=True)
            output.mkdir(parents=True)

            # A formally recognizable RIFF/WEBP payload whose RIFF length says
            # the file ends after 12 bytes, followed by undeclared junk.
            malformed = b"RIFF\x04\x00\x00\x00WEBP" + b"trailing-junk"
            (parts / "00.b64").write_text(
                base64.b64encode(malformed).decode("ascii"),
                encoding="ascii",
            )

            with self.assertRaisesRegex(ValueError, "RIFF size mismatch"):
                _materialize_modern_assets(root, output)


if __name__ == "__main__":
    unittest.main()
