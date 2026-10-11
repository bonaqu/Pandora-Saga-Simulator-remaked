"""Guard live D1 translations against removing entered records or controls."""
import json
import pathlib
import re
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
JS=(ROOT/'admin-api/public/localization-console.js').read_text(encoding='utf-8')
EN=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
APPROVED=json.loads((ROOT/'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
SLOTS=re.compile(r'\{[A-Za-z0-9_]+\}')

class AdminConsoleLiveI18nTests(unittest.TestCase):
    def test_live_status_keys_keep_placeholders_and_four_languages(self):
        keys=set(re.findall(r"'(loc[A-Z][A-Za-z]+)'",JS))
        live=sorted(k for k in keys if 'adminShell.'+k in EN)
        self.assertGreaterEqual(len(live),35)
        for suffix in live:
            key='adminShell.'+suffix
            with self.subTest(key=key):
                tokens=sorted(SLOTS.findall(EN[key]))
                for lang in ('ru','jp','tw'):
                    value=APPROVED['ui'][lang].get(key)
                    self.assertIsInstance(value,str)
                    self.assertTrue(value.strip())
                    self.assertEqual(tokens,sorted(SLOTS.findall(value)))
                    self.assertNotIn('<',value)
        self.assertIn("const liveValues=new WeakMap()",JS)
        self.assertIn("element.dataset.adminLiveI18n=key",JS)
        self.assertIn("host.querySelectorAll('[data-admin-live-i18n]')",JS)
        self.assertNotIn("input.dataset.adminLiveI18n",JS)
        self.assertIn("input.value=drafts.has(id)",JS)
        self.assertIn("window.PandoraBulkLocalization.mount",JS)
