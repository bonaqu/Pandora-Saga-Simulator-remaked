import pathlib
import unittest
from scripts.localization_catalog import load_migrated_catalogs

ROOT = pathlib.Path(__file__).resolve().parents[1]

class CanonicalTranslationTests(unittest.TestCase):
    def test_snapshot_has_all_stable_source_counts_without_excel(self):
        catalog=load_migrated_catalogs(ROOT)
        self.assertEqual(catalog.total,2920)
        self.assertGreaterEqual(len(catalog.ui_russian),200)
        self.assertGreaterEqual(len(catalog.game_russian),600)
        self.assertEqual(catalog.game_russian['skill_entry.7.5'],'Пылающая стрела')
        self.assertEqual(catalog.game_russian['skill.7'],'Стрельба')
        self.assertFalse((ROOT/'localization/translations.xlsx').exists())

    def test_migrated_text_uses_independent_language_maps(self):
        one=load_migrated_catalogs(ROOT)
        two=load_migrated_catalogs(ROOT)
        self.assertIsNot(one.game_russian,two.game_russian)
        self.assertIsNot(one.ui_russian,two.ui_russian)
