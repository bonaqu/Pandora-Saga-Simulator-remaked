import csv
import io
import json
import pathlib
import re
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
LOCALIZATION = ROOT / "localization"


class LocalizationDataTests(unittest.TestCase):
    def read_json(self, name: str):
        return json.loads((LOCALIZATION / name).read_text(encoding="utf-8"))

    def test_ui_catalogs_have_complete_english_and_safe_russian_placeholders(self):
        english = self.read_json("ui.en.json")
        russian = self.read_json("ui.ru.json")
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
        self.assertEqual(len(terms), 1617)
        ids = [term["id"] for term in terms]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(
            {term["category"] for term in terms},
            {"race", "racial_skill", "job", "skill", "skill_entry", "equipment_category", "equipment", "soul"},
        )
        self.assertEqual(sum(term["category"] == "skill_entry" for term in terms), 211)
        for term in terms:
            self.assertTrue(term["legacy_path"], term["id"])
            self.assertTrue(term["source_en"], term["id"])
            self.assertIsInstance(term["source_jp"], str)
            self.assertIsInstance(term["source_tw"], str)
            self.assertEqual(term["ru_proposed"], "", term["id"])
            self.assertIsInstance(term["ru_approved"], str)

    def test_csv_worksheet_matches_machine_readable_export(self):
        terms = self.read_json("game-terms.ru.json")["terms"]
        csv_text = (LOCALIZATION / "game-terms.ru.csv").read_text(encoding="utf-8-sig")
        rows = list(csv.DictReader(io.StringIO(csv_text)))
        self.assertEqual(len(rows), len(terms))
        columns = [
            "id", "category", "legacy_path", "source_en", "source_jp", "source_tw",
            "ru_proposed", "ru_approved",
        ]
        self.assertEqual(list(rows[0]), columns)
        for row, term in zip(rows, terms):
            self.assertEqual(row, {key: term[key] for key in columns}, term["id"])


if __name__ == "__main__":
    unittest.main()
