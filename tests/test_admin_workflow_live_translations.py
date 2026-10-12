"""Four-language D1 interface diagnostics: accessible editors, safe bulk failures."""
import json
import pathlib
import re
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCES={
 'console':(ROOT/'admin-api/public/localization-console.js').read_text(encoding='utf-8'),
 'four':(ROOT/'admin-api/public/localization-four-language.js').read_text(encoding='utf-8'),
 'bulk':(ROOT/'admin-api/public/localization-bulk.js').read_text(encoding='utf-8'),
}
EN=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
BUNDLE=json.loads((ROOT/'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
SLOTS=re.compile(r'\{[A-Za-z0-9_]+\}')
NEW={
 'console':('locResetBaselineTitle','locResetCloudDraftTitle'),
 'four':('fourEditorAria',),
 'bulk':('bulkContextChanged','bulkTooManyToScan','bulkIncompletePage',
         'bulkCatalogManagedSuffix','bulkInvalidFieldSuffix','bulkTooManyMatches',
         'bulkStaleRow','bulkEditorChanged','bulkReceiptUnconfirmed',
         'bulkUncertainPublish','bulkFailedPublish'),
}


class AdminWorkflowLiveTranslationsTests(unittest.TestCase):
    def test_all_14_new_user_visible_approved_fallbacks(self):
        self.assertEqual(sum(len(x) for x in NEW.values()),14)
        for file,keys in NEW.items():
            for suffix in keys:
                key='adminShell.'+suffix
                with self.subTest(file=file,key=key):
                    self.assertIn(suffix,SOURCES[file])
                    self.assertIn(key,EN)
                    original=EN[key]
                    self.assertTrue(original.strip())
                    expected=sorted(SLOTS.findall(original))
                    self.assertNotRegex(original,r'[<>]')
                    for locale in ('ru','jp','tw'):
                        value=BUNDLE['ui'][locale].get(key)
                        self.assertIsInstance(value,str)
                        self.assertTrue(value.strip())
                        self.assertEqual(sorted(SLOTS.findall(value)),expected)
                        self.assertNotRegex(value,r'[<>]')

    def test_single_language_reset_title_tracks_cloud_draft_and_locale(self):
        src=SOURCES['console']
        self.assertIn('liveTitles=new WeakMap()',src)
        self.assertIn("host.querySelectorAll('[data-admin-live-title]')",src)
        self.assertIn("if(savedDraft())liveTitle(reset,'locResetCloudDraftTitle'",src)
        self.assertIn("else liveTitle(reset,'locResetBaselineTitle'",src)
        self.assertIn("reset.disabled=Boolean(record.pending)||Boolean(savedDraft())",src)
        self.assertIn('input.value=drafts.has(id)',src)
        self.assertIn('expectedVersion:record.version',src)

    def test_multilingual_editor_aria_updates_in_place(self):
        src=SOURCES['four']
        self.assertIn("textarea.setAttribute('aria-label',tx('fourEditorAria'",src)
        self.assertEqual(src.count("textarea.setAttribute('aria-label',tx('fourEditorAria'"),2)
        self.assertIn("window.addEventListener('pandora-admin:localechange',updateLocale)",src)
        self.assertIn("textarea.value=drafts.has(identity(data))",src)
        self.assertIn("expectedVersion:data.version",src)

    def test_browser_regressions_are_wired_into_both_ui_suites(self):
        package=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
        for script in ('test:ui:admin','test:ui:ci'):
            with self.subTest(script=script):
                self.assertIn('tests/ui/admin-bulk-error-localization.spec.mjs',
                              package['scripts'][script])
                self.assertIn('tests/ui/admin-bulk-localization.spec.mjs',
                              package['scripts'][script])

    def test_bulk_uncertain_publication_requires_receipt_and_never_autoretries(self):
        src=SOURCES['bulk']
        self.assertIn("bulkUncertainPublish",src)
        self.assertIn("bulkFailedPublish",src)
        self.assertIn("if(check.found)receipt=check.receipt",src)
        self.assertIn("operationId",src)
        self.assertIn("'/api/admin/localization/operations?operationId='",src)
        self.assertIn("live(state,uncertain?'bulkUncertainPublish':'bulkFailedPublish'",src)
        self.assertIn("if(receipt)onPublished()",src)
        self.assertIn('const dynamicTranslations=new WeakMap(),dynamicAria=new WeakMap()',src)


if __name__=='__main__':
    unittest.main()
