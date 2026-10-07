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
        self.assertEqual(result["ci_profile"], "docs")
        self.assertTrue(result["pages_required"])
        self.assertTrue(result["wiki_required"])
        self.assertFalse(result["full_validation"])
        self.assertFalse(result["force_full_deploy"])

    def test_changelog_plus_docs_guard_test_stays_fast(self):
        result = POLICY.classify(["CHANGELOG.md", "tests/test_repository_docs.py"])
        self.assertEqual(result["mode"], "release-notes")
        self.assertEqual(result["ci_profile"], "docs")
        self.assertFalse(result["full_validation"])

    def test_regular_docs_skip_pages_but_can_sync_wiki(self):
        result = POLICY.classify(["docs/ARCHITECTURE.md"])
        self.assertEqual(result["mode"], "docs-only")
        self.assertEqual(result["ci_profile"], "docs")
        self.assertFalse(result["pages_required"])
        self.assertTrue(result["wiki_required"])
        self.assertFalse(result["full_validation"])

    def test_readme_only_needs_neither_pages_nor_wiki(self):
        for path in ("README.md", "data/README.md", "localization/README.md"):
            with self.subTest(path=path):
                result = POLICY.classify([path])
                self.assertEqual(result["mode"], "docs-only")
                self.assertEqual(result["ci_profile"], "docs")
                self.assertFalse(result["pages_required"])
                self.assertFalse(result["full_validation"])

    def test_translation_inputs_use_translation_feature_profile(self):
        for path in (
            "localization/translations.xlsx",
            "localization/game-terms.ru.json",
            "localization/ui.en.json",
        ):
            with self.subTest(path=path):
                result = POLICY.classify(["CHANGELOG.md", path])
                self.assertEqual(result["mode"], "full")
                self.assertEqual(result["ci_profile"], "translation")
                self.assertTrue(result["pages_required"])
                self.assertTrue(result["full_validation"])
                self.assertFalse(result["force_full_deploy"])
                self.assertIn(path, result["unsafe_files"])

    def test_catalog_inputs_use_catalog_feature_profile(self):
        for path in (
            "data/generated/equipment.v1.json",
            "data/generated/souls.v1.json",
            "data/generated/skills.v1.json",
            "data/generated/character.v1.json",
            "data/current-active-profiles.v1.json",
            "data/native-passive-hooks.v1.json",
        ):
            with self.subTest(path=path):
                result = POLICY.classify(["CHANGELOG.md", path])
                self.assertEqual(result["mode"], "full")
                self.assertEqual(result["ci_profile"], "catalog")
                self.assertTrue(result["full_validation"])
                self.assertFalse(result["force_full_deploy"])

    def test_translation_plus_catalog_uses_catalog_superset(self):
        result = POLICY.classify([
            "CHANGELOG.md",
            "localization/translations.xlsx",
            "data/generated/equipment.v1.json",
        ])
        self.assertEqual(result["ci_profile"], "catalog")
        self.assertTrue(result["full_validation"])

    def test_runtime_file_uses_full_runtime_feature_profile(self):
        for path in (
            "modern/app-shell.js",
            "js/equip.js",
            "scripts/build_pages.py",
            ".github/workflows/pages.yml",
            "modern/release-notes.js",
        ):
            with self.subTest(path=path):
                result = POLICY.classify(["CHANGELOG.md", path])
                self.assertEqual(result["mode"], "full")
                self.assertEqual(result["ci_profile"], "runtime")
                self.assertTrue(result["pages_required"])
                self.assertTrue(result["full_validation"])
                self.assertIn(path, result["unsafe_files"])

    def test_mixing_catalog_with_runtime_escalates_to_runtime(self):
        result = POLICY.classify([
            "CHANGELOG.md",
            "data/generated/equipment.v1.json",
            "modern/catalog.js",
        ])
        self.assertEqual(result["ci_profile"], "runtime")
        self.assertTrue(result["full_validation"])

    def test_deployment_infrastructure_forces_full_production_validation(self):
        for path in (
            ".github/workflows/pages.yml",
            "scripts/build_pages.py",
            "scripts/deploy_change_policy.py",
        ):
            with self.subTest(path=path):
                result = POLICY.classify([path])
                self.assertEqual(result["mode"], "full")
                self.assertEqual(result["ci_profile"], "runtime")
                self.assertTrue(result["full_validation"])
                self.assertTrue(result["force_full_deploy"])

    def test_lookalike_and_traversal_paths_never_enter_fast_profile(self):
        for path in (
            "modern/CHANGELOG.md",
            "../CHANGELOG.md",
            "/CHANGELOG.md",
            "localization/translations.csv",
            "data-generated/equipment.v1.json",
            "",
        ):
            with self.subTest(path=path):
                result = POLICY.classify([path])
                self.assertEqual(result["mode"], "full")
                self.assertEqual(result["ci_profile"], "runtime")
                self.assertTrue(result["full_validation"])

    def test_empty_change_set_is_fail_closed(self):
        result = POLICY.classify([])
        self.assertEqual(result["mode"], "full")
        self.assertEqual(result["ci_profile"], "runtime")
        self.assertTrue(result["full_validation"])


if __name__ == "__main__":
    unittest.main()
