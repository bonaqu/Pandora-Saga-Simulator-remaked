"""Catalog feedback is D1-editable text, never an operation or raw error rewrite."""
import json
import pathlib
import re
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
CATALOG=(ROOT/'admin-api/public/catalog-ui.js').read_text(encoding='utf-8')
EN=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
APPROVED=json.loads((ROOT/'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
SLOTS=re.compile(r'\{[A-Za-z0-9_]+\}')

class CatalogFeedbackTest(unittest.TestCase):
    def test_whitelisted_feedback_and_dynamic_fields_have_valid_locales(self):
        match=re.search(r'var catalogStatusKeys = (\{.*?\});',CATALOG,re.DOTALL)
        self.assertIsNotNone(match)
        original=json.loads(match.group(1))
        self.assertEqual(len(original),12)
        suffixes=set(original.values())|set(re.findall(r"reportTranslated\('(catalogStatus[A-Za-z]+)'",CATALOG))
        self.assertEqual(len(suffixes),18)
        for suffix in suffixes:
            with self.subTest(suffix=suffix):
                key='adminShell.'+suffix
                self.assertIn(key,EN)
                for lang in ('ru','jp','tw'):
                    value=APPROVED['ui'][lang].get(key)
                    self.assertIsInstance(value,str)
                    self.assertTrue(value.strip())
                    self.assertEqual(sorted(SLOTS.findall(value)),sorted(SLOTS.findall(EN[key])))
        self.assertIn("if(slots(value)!==slots(entry.fallback))value=entry.fallback",CATALOG)
        self.assertIn("activeCatalogStatus=null",CATALOG)
        self.assertIn("window.addEventListener('pandora-admin:localechange'",CATALOG)
        self.assertIn("status.textContent=statusTranslation(activeCatalogStatus)",CATALOG)
        self.assertNotIn("status.innerHTML=",CATALOG)
