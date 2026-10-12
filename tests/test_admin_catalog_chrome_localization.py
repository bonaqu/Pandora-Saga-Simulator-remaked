"""Four-language D1-managed static catalog editor labels, without mutating data."""
import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG = (ROOT / "admin-api/public/catalog-ui.js").read_text(encoding="utf-8")
ENGLISH = json.loads((ROOT / "localization/ui.en.json").read_text(encoding="utf-8"))
APPROVED = json.loads((ROOT / "localization/approved-translations.v1.json").read_text(encoding="utf-8"))
SLOTS = re.compile(r"\{[A-Za-z0-9_]+\}")

class CatalogChromeLocalizationTests(unittest.TestCase):
    def test_static_catalog_ui_messages_are_editable_on_all_four_languages(self):
        match = re.search(r"var catalogChromeKeys = (\{.*?\});", CATALOG, re.DOTALL)
        self.assertIsNotNone(match, "catalog editor must register its static captions")
        entries = json.loads(match.group(1))
        self.assertEqual(len(entries), 47)
        self.assertEqual(len(set(entries.values())), len(entries))
        for original, key in entries.items():
            with self.subTest(key=key):
                self.assertTrue(key.startswith("adminShell.catalog"))
                self.assertIn(key, ENGLISH)
                self.assertIn(original, CATALOG.split("function node(tag", 1)[1],
                              "never register a dead, unreferenced catalog label")
                slots = sorted(SLOTS.findall(ENGLISH[key]))
                for locale in ("ru", "jp", "tw"):
                    value = APPROVED["ui"][locale].get(key)
                    self.assertIsInstance(value, str)
                    self.assertTrue(value.strip())
                    self.assertEqual(sorted(SLOTS.findall(value)), slots)
                    self.assertNotIn("<", value)
                    self.assertNotIn(">", value)
                self.assertEqual(APPROVED["ui"]["ru"][key], original)


    def test_d1_managed_catalog_field_captions_preserve_form_controls(self):
        match = re.search(r"var catalogFormLabels = (\{.*?\});", CATALOG, re.DOTALL)
        self.assertIsNotNone(match)
        captions = json.loads(match.group(1))
        self.assertEqual(len(captions), 36)
        for label in ('Базовое LP','Базовое MP','Делитель роста LP от уровня',
                      'Делитель роста MP от уровня','Делитель роста LP от STA',
                      'Делитель роста MP от SPR'):
            self.assertIn(label,captions)
        self.assertEqual(len(set(captions.values())), 30)
        for original, suffix in captions.items():
            key = "adminShell." + suffix
            with self.subTest(key=key):
                self.assertIn(original, CATALOG)
                self.assertIn(key, ENGLISH)
                self.assertEqual(APPROVED["ui"]["ru"][key], original)
                for locale in ("ru", "jp", "tw"):
                    translated = APPROVED["ui"][locale].get(key)
                    self.assertIsInstance(translated, str)
                    self.assertTrue(translated.strip())
                    self.assertEqual(sorted(SLOTS.findall(translated)), sorted(SLOTS.findall(ENGLISH[key])))
                    self.assertNotIn("<", translated)
        self.assertIn("wrap.appendChild(formCaption(label))", CATALOG)
        self.assertIn("wrap.append(input, formCaption(label))", CATALOG)
        self.assertIn("legend.appendChild(formCaption(label))", CATALOG)
        self.assertIn("caption.dataset.adminI18n = key", CATALOG)
        self.assertIn("caption.textContent = window.PandoraAdminI18n", CATALOG)
        self.assertNotIn("catalogFieldMoreLanguages", CATALOG)

    def test_catalog_translation_is_display_only_and_uses_safe_dom_text(self):
        self.assertIn("result.dataset.adminI18n = key", CATALOG)
        self.assertIn("result.textContent = window.PandoraAdminI18n", CATALOG)
        self.assertNotIn("result.innerHTML = window.PandoraAdminI18n", CATALOG)
        self.assertIn("catalogChromeKeys[text]", CATALOG)
        self.assertIn("if (translationKey) result.dataset.adminI18n", CATALOG)
        self.assertIn("input.value = value", CATALOG)
        self.assertIn("var languages = [['en', 'English']", CATALOG)

if __name__ == "__main__":
    unittest.main()
