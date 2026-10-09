import pathlib
import unittest
from dataclasses import asdict

from scripts.localization_catalog import load_migrated_catalogs
from scripts.translation_workbook import load_editable_catalogs

ROOT = pathlib.Path(__file__).resolve().parents[1]


class TranslationMigrationParityTests(unittest.TestCase):
    def test_all_2920_rows_and_six_effective_language_catalogs_match_legacy_workbook(self):
        before = load_editable_catalogs(ROOT)
        after = load_migrated_catalogs(ROOT)
        self.assertEqual(before.total, 2920)
        self.assertEqual(asdict(after), asdict(before))

    def test_baseline_stable_language_ids_and_independent_text_maps(self):
        data = load_migrated_catalogs(ROOT)
        self.assertEqual(data.game_russian['skill_entry.7.5'], 'Пылающая стрела')
        self.assertEqual(data.game_russian['skill.7'], 'Стрельба')
        self.assertGreater(len(data.ui_russian), 100)
        self.assertIsNot(data.game_russian, data.ui_russian)
