import json
import pathlib
import re
import unittest

from scripts.translation_workbook import load_translation_catalogs


ROOT = pathlib.Path(__file__).resolve().parents[1]
LOCALIZATION = ROOT / "localization"


class LocalizationDataTests(unittest.TestCase):
    def read_json(self, name: str):
        return json.loads((LOCALIZATION / name).read_text(encoding="utf-8"))

    def test_ui_catalogs_have_complete_english_and_safe_russian_placeholders(self):
        english = self.read_json("ui.en.json")
        russian, _, _ = load_translation_catalogs(ROOT)
        self.assertTrue(english)
        self.assertTrue(set(russian).issubset(english))
        self.assertTrue(all(isinstance(value, str) and value for value in english.values()))
        placeholder = re.compile(r"\{([A-Za-z0-9_]+)\}")
        for key, value in russian.items():
            self.assertEqual(
                sorted(placeholder.findall(english[key])),
                sorted(placeholder.findall(value)),
                key,
            )

    def test_legacy_term_export_is_unique_complete_and_user_reviewable(self):
        export = self.read_json("game-terms.ru.json")
        self.assertEqual(export["schema_version"], 1)
        self.assertEqual(export["source"]["legacy_engine"], "2.00")
        terms = export["terms"]
        self.assertEqual(len(terms), 2667)
        ids = [term["id"] for term in terms]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(
            {term["category"] for term in terms},
            {"race", "racial_skill", "job", "skill", "skill_entry", "equipment_category", "equipment", "soul", "calculator_label", "calculator_hint", "skill_detail"},
        )
        self.assertEqual(sum(term["category"] == "skill_entry" for term in terms), 211)
        self.assertEqual(sum(term["category"] == "skill_detail" for term in terms), 633)
        self.assertEqual(sum(term["category"] == "calculator_label" for term in terms), 259)
        self.assertEqual(sum(term["category"] == "calculator_hint" for term in terms), 158)
        for term in terms:
            self.assertTrue(term["legacy_path"], term["id"])
            self.assertTrue(term["source_en"], term["id"])
            self.assertIsInstance(term["source_jp"], str)
            self.assertIsInstance(term["source_tw"], str)
            self.assertEqual(term["ru_proposed"], "", term["id"])
            self.assertIsInstance(term["ru_approved"], str)

    def test_machine_export_points_approved_translations_to_workbook(self):
        export = self.read_json("game-terms.ru.json")
        self.assertIn("localization/translations.xlsx", export["source"]["policy"])
        self.assertTrue(all(not term["ru_approved"] for term in export["terms"]))


if __name__ == "__main__":
    unittest.main()
