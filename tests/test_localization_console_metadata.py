"""D1-editable presentation labels never replace catalog content or form state."""
import json
import pathlib
import re
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
CODE=(ROOT/'admin-api/public/localization-console.js').read_text(encoding='utf-8')
EN=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
APPROVED=json.loads((ROOT/'localization/approved-translations.v1.json').read_text(encoding='utf-8'))

class CatalogMetadataLocalizationTests(unittest.TestCase):
    def test_all_identified_kind_and_origin_labels_are_registered(self):
        keys=[]
        for name in ('kindKeys','originKeys'):
            found=re.search(r'const '+name+r'=(\{.*?\});',CODE,re.DOTALL)
            self.assertIsNotNone(found,name)
            keys.extend('adminShell.'+v for v in json.loads(found.group(1)).values())
        keys.extend('adminShell.'+s for s in
                    ('locSourceEnglish','locEffectiveText','locCompareLanguages','locEditInCatalog'))
        self.assertEqual(len(set(keys)),21)
        for key in set(keys):
            with self.subTest(key=key):
                self.assertIn(key,EN)
                for locale in ('ru','jp','tw'):
                    value=APPROVED['ui'][locale].get(key)
                    self.assertIsInstance(value,str)
                    self.assertTrue(value.strip())
                    self.assertNotIn('<',value)
                    self.assertNotIn('>',value)
        self.assertIn("localized('small',kindKeys[record.kind],category)",CODE)
        self.assertIn("localized('span',originKey,description[record.origin]",CODE)
        self.assertIn("tag('p',record.effective||'—')",CODE)
        self.assertIn("tag('strong',record.id)",CODE)

if __name__=='__main__':
    unittest.main()
