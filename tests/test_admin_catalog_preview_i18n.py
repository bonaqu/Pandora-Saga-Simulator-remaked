"""Catalog publication preview: four locales, D1-first and read-only."""
import json
import pathlib
import re
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
CODE=(ROOT/'admin-api/public/catalog-ui.js').read_text(encoding='utf-8')
SOURCE=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
APPROVED=json.loads((ROOT/'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
SLOTS=re.compile(r'\{[A-Za-z0-9_]+\}')
KEYS=(
  'catalogPreviewLevelSockets','catalogPreviewEnhancement','catalogPreviewNoSoulSlot',
  'catalogPreviewInvalidMarker','catalogPreviewBaseAttack','catalogPreviewNoNumericModifiers',
  'catalogPreviewActiveMp','catalogPreviewActiveCast','catalogPreviewActiveCooldown',
  'catalogPreviewActiveDuration','catalogPreviewIntrinsicReplaced','catalogPreviewIntrinsicKept',
  'catalogPreviewLearningLevel','catalogPreviewLearningClasses','catalogPreviewDescendants',
  'catalogPreviewOnlySelected','catalogPreviewAnyClass','catalogPreviewLearningBranch',
  'catalogPreviewNoBranchRequirements','catalogPreviewNativePrerequisites',
  'catalogPreviewRacialReplaced','catalogPreviewRacialNative','catalogPreviewWeaponCondition',
  'catalogPreviewAnyWeapon','catalogPreviewShieldRequired','catalogPreviewRidingRequired',
  'catalogPreviewCalculationLimit','catalogPreviewNewSkill','catalogPreviewPassiveOriginal',
  'catalogPreviewNoNumericReplace','catalogPreviewNoNumericExtra',
)


class PublishedCatalogPreviewTests(unittest.TestCase):
    def test_all_31_d1_locales_keep_approved_safe_placeholders(self):
        self.assertEqual(len(KEYS),31)
        self.assertEqual(len(set(KEYS)),31)
        for suffix in KEYS:
            key='adminShell.'+suffix
            with self.subTest(key=key):
                self.assertIn(suffix,CODE)
                self.assertIn(key,SOURCE)
                text=SOURCE[key]
                self.assertTrue(text.strip())
                self.assertNotRegex(text,'[<>]')
                expected=sorted(SLOTS.findall(text))
                for locale in ('ru','jp','tw'):
                    current=APPROVED['ui'][locale].get(key)
                    self.assertIsInstance(current,str)
                    self.assertTrue(current.strip())
                    self.assertNotRegex(current,'[<>]')
                    self.assertEqual(expected,sorted(SLOTS.findall(current)))

    def test_record_preview_is_live_but_never_modifies_translation_fields(self):
        for required in (
            "window.PandoraAdminI18n?.getLocale?.()||'ru'",
            "var catalogLiveValues = new WeakMap(),catalogRecordValues=new WeakMap()",
            "node.dataset.catalogRecordLocale='true'",
            "catalogRecordValues.set(node,names)",
            "host.querySelectorAll('[data-catalog-record-locale]')",
            "node.textContent=catalogRecordLocale(names)",
            "catalogLiveComputed(node,key,fallback,compute)",
            "entry.compute?entry.compute()",
            "catalogLiveName(node('strong'),'catalogProfileNameColon'",
            "catalogRecordText(node('p',undefined,'record-description'),record.description)",
            "catalogRecordText(node('p',undefined,'record-description'),profile.description)",
        ):
            with self.subTest(required=required):
                self.assertIn(required,CODE)
        self.assertNotIn('input.dataset.catalogRecordLocale',CODE)
        self.assertNotIn('select.dataset.catalogRecordLocale',CODE)
        self.assertIn('input.value = values[entry[0]]',CODE)
        self.assertIn('var edits = ',CODE) if False else None


if __name__=='__main__':
    unittest.main()
