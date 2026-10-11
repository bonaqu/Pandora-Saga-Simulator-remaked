"""Modern 3.92: fully reviewed JP/TW core UI fallback inventory, excluding sentinel."""
import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
LOCALE = ROOT / "localization"
EN = json.loads((LOCALE / "ui.en.json").read_text(encoding="utf-8"))
APPROVED = json.loads((LOCALE / "approved-translations.v1.json").read_text(encoding="utf-8"))
SLOTS = re.compile(r"\{([A-Za-z0-9_]+)\}")


class Modern392CoverageTests(unittest.TestCase):
    def test_all_core_ui_japanese_and_traditional_chinese_except_english_sentinel(self):
        self.assertGreaterEqual(len(EN), 443)
        for lang in ("jp", "tw"):
            missing = set(EN) - set(APPROVED["ui"][lang])
            self.assertEqual(missing, {"test.englishOnly"})
            self.assertEqual(len(APPROVED["ui"][lang]), len(EN) - 1)
            self.assertFalse(any(not value.strip() for value in APPROVED["ui"][lang].values()))
        self.assertNotIn("test.englishOnly", APPROVED["ui"]["ru"])
        self.assertNotIn("test.englishOnly", APPROVED["ui"]["jp"])
        self.assertNotIn("test.englishOnly", APPROVED["ui"]["tw"])

    def test_no_placeholder_drift_or_html_in_approved_ui(self):
        for language in ("jp", "tw"):
            for key, value in APPROVED["ui"][language].items():
                self.assertEqual(
                    sorted(SLOTS.findall(value)), sorted(SLOTS.findall(EN[key])),
                    "Placeholder drift: " + language + "." + key
                )
                self.assertNotIn("<script", value.casefold())
                self.assertNotIn("<iframe", value.casefold())

    def test_outdated_xlsx_copy_is_replaced_without_claiming_perfect_game_parity(self):
        for key in ("updates.translations", "updates.preservation", "search.itemSource"):
            self.assertIn(key, EN)
            self.assertIn(key, APPROVED["ui"]["ru"])
            self.assertIn(key, APPROVED["ui"]["jp"])
            self.assertIn(key, APPROVED["ui"]["tw"])
            self.assertNotIn("Excel", EN[key])
            self.assertNotIn("Excel", APPROVED["ui"]["ru"][key])
        self.assertIn("admin console", EN["updates.translations"])
        self.assertIn("D1", EN["updates.translations"])
        self.assertIn("Legacy 2.00 mode", EN["updates.preservation"])
        self.assertIn("Modern", EN["updates.preservation"])


if __name__ == "__main__":
    unittest.main()
