"""D1-only bulk-editor feedback must preserve inputs, operations and error text."""
import json
import pathlib
import re
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
CODE=(ROOT/'admin-api/public/localization-bulk.js').read_text(encoding='utf-8')
EN=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
APPROVED=json.loads((ROOT/'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
SLOTS=re.compile(r'\{[A-Za-z0-9_]+\}')

class BulkLiveLocalization(unittest.TestCase):
    def test_status_and_confirmation_keys_have_safe_four_language_fallback(self):
        names=['bulkReady','bulkResetPreview','bulkFoundCount','bulkSkippedIds',
               'bulkSelectedCount','bulkManualEdited','bulkNeedWord','bulkNeedTranslation',
               'bulkSearching','bulkFinishEditing','bulkDraftCollision','bulkConfirmPublish',
               'bulkRechecking','bulkPublishingProgress','bulkReceiptLookup',
               'bulkPublishedSuccess','bulkReplacementExample',
               'bulkEditProposalAria','bulkRevertProposalAria','bulkFinalTranslationAria',
               'bulkSavedDraftSuffix']
        for suffix in names:
            key='adminShell.'+suffix
            with self.subTest(key=key):
                self.assertIn(key,EN)
                for lang in ('ru','jp','tw'):
                    value=APPROVED['ui'][lang].get(key)
                    self.assertIsInstance(value,str)
                    self.assertTrue(value.strip())
                    self.assertEqual(sorted(SLOTS.findall(value)),sorted(SLOTS.findall(EN[key])))
        self.assertIn("dynamicTranslations=new WeakMap()",CODE)
        self.assertIn("window.addEventListener('pandora-admin:localechange',onLocaleChange)",CODE)
        self.assertIn("window.removeEventListener('pandora-admin:localechange',onLocaleChange)",CODE)
        self.assertIn("raw(state,(uncertain",CODE)
        self.assertIn("if(slots(phrase)!==slots(fallback))phrase=fallback",CODE)
        self.assertIn("Object.hasOwn(values,name)",CODE)
        self.assertIn('dynamicAria=new WeakMap()',CODE)
        self.assertIn("root.querySelectorAll('[data-bulk-live-aria]')",CODE)
        self.assertIn("liveAria(pencil,'bulkEditProposalAria'",CODE)
        self.assertIn("liveAria(revert,'bulkRevertProposalAria'",CODE)
        self.assertIn("liveAria(input,'bulkFinalTranslationAria'",CODE)
        self.assertIn("if(item.blocked)label.append(live(node('span'),'bulkSavedDraftSuffix'",CODE)

        self.assertIn("const items=checked.map(item=>",CODE)
