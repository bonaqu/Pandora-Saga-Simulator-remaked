"""D1 translations of dangerous confirmations must preserve the action guards."""
import json
import pathlib
import re
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
CODE=(ROOT/'admin-api/public/catalog-ui.js').read_text(encoding='utf-8')
EN=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
APPROVED=json.loads((ROOT/'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
SLOTS=re.compile(r'\{[A-Za-z0-9_]+\}')

class CatalogConfirmationTests(unittest.TestCase):
    def test_all_seven_guarded_confirmations_use_four_language_d1_keys(self):
        keys=set(re.findall(r"confirmCatalog\('(catalogConfirm[A-Za-z]+)'",CODE))
        self.assertEqual(len(keys),7)
        self.assertEqual(CODE.count('window.confirm('),1)
        for suffix in keys:
            key='adminShell.'+suffix
            with self.subTest(key=key):
                self.assertIn(key,EN)
                for locale in ('ru','jp','tw'):
                    value=APPROVED['ui'][locale].get(key)
                    self.assertIsInstance(value,str)
                    self.assertTrue(value.strip())
                    self.assertEqual(sorted(SLOTS.findall(value)),sorted(SLOTS.findall(EN[key])))
                    self.assertNotIn('<',value)
        self.assertIn("if (sourceTokens!==targetTokens) template=fallback",CODE)
        self.assertIn("values&&Object.hasOwn(values,name)",CODE)
        self.assertIn("function canLeave() { return !dirty || confirmCatalog(",CODE)
        self.assertIn("if (!drafts.length || !confirmCatalog(",CODE)
        self.assertIn("if (!confirmCatalog('catalogConfirmPublishSingle'",CODE)
