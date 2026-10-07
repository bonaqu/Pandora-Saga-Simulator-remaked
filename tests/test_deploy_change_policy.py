import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "deploy_change_policy.py"
SPEC = importlib.util.spec_from_file_location("deploy_change_policy", MODULE_PATH)
POLICY = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(POLICY)


class DeployChangePolicyTests(unittest.TestCase):
    def test_changelog_only_uses_release_notes_fast_path(self):
        result = POLICY.classify(["CHANGELOG.md"])
        self.assertEqual(result["mode"], "release-notes")
        self.assertTrue(result["pages_required"])
        self.assertTrue(result["wiki_required"])
        self.assertFalse(result["full_validation"])

    def test_changelog_plus_docs_guard_test_stays_fast(self):
        result = POLICY.classify(["CHANGELOG.md", "tests/test_repository_docs.py"])
        self.assertEqual(result["mode"], "release-notes")
        self.assertFalse(result["full_validation"])

    def test_regular_docs_skip_pages_but_can_sync_wiki(self):
        result = POLICY.classify(["docs/ARCHITECTURE.md"])
        self.assertEqual(result["mode"], "docs-only")
        self.assertFalse(result["pages_required"])
        self.assertTrue(result["wiki_required"])
        self.assertFalse(result["full_validation"])

    def test_readme_only_needs_neither_pages_nor_wiki(self):
        result = POLICY.classify(["README.md"])
        self.assertEqual(result["mode"], "docs-only")
        self.assertFalse(result["pages_required"])
        self.assertFalse(result["wiki_required"])

    def test_runtime_file_forces_full_validation(self):
        for path in (
            "modern/app-shell.js",
            "js/equip.js",
            "data/generated/equipment.v1.json",
            "localization/translations.xlsx",
            "scripts/build_pages.py",
            ".github/workflows/pages.yml",
            "modern/release-notes.js",
        ):
            with self.subTest(path=path):
                result = POLICY.classify(["CHANGELOG.md", path])
                self.assertEqual(result["mode"], "full")
                self.assertTrue(result["pages_required"])
                self.assertTrue(result["full_validation"])
                self.assertIn(path, result["unsafe_files"])

    def test_lookalike_and_traversal_paths_never_enter_fast_path(self):
        for path in ("modern/CHANGELOG.md", "../CHANGELOG.md", "/CHANGELOG.md", ""):
            with self.subTest(path=path):
                result = POLICY.classify([path])
                self.assertEqual(result["mode"], "full")
                self.assertTrue(result["full_validation"])

    def test_empty_change_set_is_fail_closed(self):
        result = POLICY.classify([])
        self.assertEqual(result["mode"], "full")
        self.assertTrue(result["full_validation"])


if __name__ == "__main__":
    unittest.main()
