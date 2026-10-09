"""Preserve translation invariants after the approved Excel retirement.

The last validated XLSX is recoverable from Git history. Current baseline is
reviewed JSON + versioned admin overrides; no client can edit an .xlsx.
"""
import json
import pathlib
import re
import unittest
from scripts.localization_catalog import load_migrated_catalogs

ROOT = pathlib.Path(__file__).resolve().parents[1]
LOC = ROOT / "localization"
SLOTS = re.compile(r"\{([A-Za-z0-9_]+)\}")


class TranslationCatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.snapshot = json.loads((LOC / "approved-translations.v1.json").read_text(encoding="utf8"))
        cls.data = load_migrated_catalogs(ROOT)
        cls.ui_source = json.loads((LOC / "ui.en.json").read_text(encoding="utf8"))
        cls.game_source = json.loads((LOC / "game-terms.ru.json").read_text(encoding="utf8"))["terms"]

    def test_canonical_catalog_is_only_source_used_for_build(self):
        self.assertFalse((LOC / "translations.xlsx").exists())
        self.assertEqual(self.snapshot["schemaVersion"], 1)
        self.assertEqual(self.data.total, 2920)
        self.assertEqual(len(self.ui_source), 242)
        self.assertEqual(len(self.game_source), 2678)

    def test_full_stable_registry_and_source_ids_remain_unique(self):
        game_ids = [term["id"] for term in self.game_source]
        self.assertEqual(len(game_ids), len(set(game_ids)))
        self.assertFalse(set(self.ui_source) & set(game_ids))
        self.assertEqual(self.data.total, len(self.ui_source) + len(game_ids))
        for locale in ("ru", "en", "jp", "tw"):
            self.assertTrue(set(self.snapshot["ui"][locale]) <= set(self.ui_source))
            self.assertTrue(set(self.snapshot["game"][locale]) <= set(game_ids))
            for scope in ("ui", "game"):
                self.assertTrue(all(isinstance(v, str) and v.strip()
                                    for v in self.snapshot[scope][locale].values()))

    def test_all_localized_ui_placeholders_match_original(self):
        for language in ("ru", "en", "jp", "tw"):
            for identifier, text in self.snapshot["ui"][language].items():
                self.assertEqual(sorted(SLOTS.findall(text)),
                                 sorted(SLOTS.findall(self.ui_source[identifier])),
                                 (language, identifier))

    def test_approved_skill_equipment_and_racial_names_not_lost(self):
        expected = {
            "skill_entry.7.5": "Пылающая стрела",
            "skill.7": "Стрельба",
            "calculator.status.39": "Сопр. тьме",
        }
        for identifier, word in expected.items():
            self.assertEqual(self.data.game_russian[identifier], word)
        self.assertGreater(len(self.data.game_russian), 500)
        self.assertGreater(len(self.data.ui_russian), 100)

    def test_snapshot_maps_are_not_mutated_by_a_caller(self):
        a = load_migrated_catalogs(ROOT)
        b = load_migrated_catalogs(ROOT)
        self.assertIsNot(a.game_russian, b.game_russian)
        a.game_russian["skill_entry.7.5"] = "Тест"
        self.assertEqual(b.game_russian["skill_entry.7.5"], "Пылающая стрела")


if __name__ == "__main__":
    unittest.main()
