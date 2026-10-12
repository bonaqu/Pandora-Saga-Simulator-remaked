"""D1-managed numeric effect editor: reviewed stat codes, no model/value mutation."""
import json
import pathlib
import re
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
CODE=(ROOT/'admin-api/public/catalog-ui.js').read_text(encoding='utf-8')
EN=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
APPROVED=json.loads((ROOT/'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
TOKENS=re.compile(r'\{[A-Za-z0-9_]+\}')
CODES=(0,1,2,3,4,5,6,7,8,10,18,21,42,49,52,60,62,65,69,70,71,72,73,74,76,77,79,81,146,147,149,150,151)
SUPPORT=(
 'catalogEffectReceivedPercent','catalogEffectBasePercent','catalogEffectPercentagePoints',
 'catalogUnitReceivedPercent','catalogUnitBasePercent','catalogUnitPercentagePoints',
 'catalogUnitFlat','catalogEffectValue','catalogUnmappedEffect','catalogProgressionLine',
 'catalogProgressionHp','catalogProgressionMp','catalogProgressionHpLevel','catalogProgressionMpLevel',
 'catalogProgressionHpSta','catalogProgressionMpSpr','catalogErrorOverlappingProfiles',
 'catalogErrorProfileCount','catalogErrorProfileSize','catalogEffectStatAria',
 'catalogEffectValueAria','catalogEffectUnitAria','catalogLivePreviewMissingName',
 'catalogLivePreviewLevel','catalogLivePreviewSockets','catalogLivePreviewFreeSockets',
 'catalogLivePreviewLanguageAria',
)

class NumericEditorLocalizationTests(unittest.TestCase):
    def test_all_60_new_strings_have_safe_four_language_coverage(self):
        self.assertEqual(len(CODES),33)
        self.assertEqual(len(SUPPORT),27)
        mapping=re.search(r'var effectTranslationKeys = \\{(.*?)\\};',CODE,re.DOTALL)
        self.assertIsNotNone(mapping)
        aliases=dict((int(number),key) for number,key in re.findall(
            r"(\\d+):\\s*'([A-Za-z]+)'",mapping.group(1)))
        self.assertEqual(set(aliases),set(CODES))
        self.assertEqual(len(set(aliases.values())),33)
        names=list(aliases.values())+list(SUPPORT)
        self.assertEqual(len(set(names)),60)
        for suffix in names:
            key='adminShell.'+suffix
            with self.subTest(key=key):
                self.assertRegex(key,r'^adminShell\.[A-Za-z]+
                self.assertTrue(EN[key].strip())
                self.assertNotRegex(EN[key],r'[<>]')
                template=sorted(TOKENS.findall(EN[key]))
                for lang in ('ru','jp','tw'):
                    text=APPROVED['ui'][lang].get(key)
                    self.assertIsInstance(text,str)
                    self.assertTrue(text.strip())
                    self.assertNotRegex(text,r'[<>]')
                    self.assertEqual(sorted(TOKENS.findall(text)),template)

    def test_verified_stat_codes_preserved_and_unknown_keeps_original(self):
        match=re.search(r'var effectNames = \{(.*?)\};',CODE,re.DOTALL)
        self.assertIsNotNone(match)
        sourceIds=[int(id) for id in re.findall(r'(\d+):\s*\x27[^\x27]+\x27',match.group(1))]
        self.assertEqual(sorted(sourceIds),sorted(CODES))
        self.assertIn("Object.hasOwn(effectNames,id)",CODE)
        self.assertIn("catalogTranslate(effectTranslationKeys[id],effectNames[id])",CODE)
        self.assertIn("return definition?.label||catalogTranslate('catalogUnmappedEffect'",CODE)
        self.assertIn("option.value = definition.id",CODE)
        self.assertIn("option.value=name",CODE)
        self.assertIn("catalogStatic(node('option'),key,fallback)",CODE)
        self.assertIn("catalogStatic(node('option'),effectTranslationKeys[definition.id]",CODE)
        self.assertIn("input.addEventListener('input', changing)",CODE)

    def test_locale_reshapes_display_nodes_not_edits_or_gameplay(self):
        self.assertIn("catalogLiveComputed(node('li'),'catalogPreviewEnhancement'",CODE)
        self.assertIn("catalogLiveComputed(node('li'),'catalogEffectValue'",CODE)
        self.assertIn("catalogLiveComputed(node('li'),'catalogProgressionLine'",CODE)
        self.assertIn("catalogLiveAttribute(circles,'aria-label','catalogLivePreviewFreeSockets'",CODE)
        self.assertIn("host.querySelectorAll('[data-catalog-live-attribute]')",CODE)
        self.assertIn("if(current&&editor?.querySelector('[data-catalog-item-live-preview]'))refreshItemPreview()",CODE)
        self.assertIn("catalogAttribute(value,'aria-label','catalogEffectValueAria'",CODE)
        self.assertIn("catalogAttribute(stat,'aria-label','catalogEffectStatAria'",CODE)
        self.assertIn("catalogAttribute(unit,'aria-label','catalogEffectUnitAria'",CODE)
        self.assertIn("input.value = values[entry[0]] || ''",CODE)
        self.assertNotIn("innerHTML=catalogTranslate",CODE)
        self.assertNotIn("eval(catalogTranslate",CODE)


if __name__=='__main__':
    unittest.main()
)
                self.assertIn(key,EN)
                self.assertTrue(EN[key].strip())
                self.assertNotRegex(EN[key],r'[<>]')
                template=sorted(TOKENS.findall(EN[key]))
                for lang in ('ru','jp','tw'):
                    text=APPROVED['ui'][lang].get(key)
                    self.assertIsInstance(text,str)
                    self.assertTrue(text.strip())
                    self.assertNotRegex(text,r'[<>]')
                    self.assertEqual(sorted(TOKENS.findall(text)),template)

    def test_verified_stat_codes_preserved_and_unknown_keeps_original(self):
        match=re.search(r'var effectNames = \{(.*?)\};',CODE,re.DOTALL)
        self.assertIsNotNone(match)
        sourceIds=[int(id) for id in re.findall(r'(\d+):\s*\x27[^\x27]+\x27',match.group(1))]
        self.assertEqual(sorted(sourceIds),sorted(CODES))
        self.assertIn("Object.hasOwn(effectNames,id)",CODE)
        self.assertIn("return definition?.label||catalogTranslate('catalogUnmappedEffect'",CODE)
        self.assertIn("option.value = definition.id",CODE)
        self.assertIn("option.value=name",CODE)
        self.assertIn("catalogStatic(node('option'),key,fallback)",CODE)
        self.assertIn("catalogStatic(node('option'),'catalogEffect'+definition.id",CODE)
        self.assertIn("input.addEventListener('input', changing)",CODE)

    def test_locale_reshapes_display_nodes_not_edits_or_gameplay(self):
        self.assertIn("catalogLiveComputed(node('li'),'catalogPreviewEnhancement'",CODE)
        self.assertIn("catalogLiveComputed(node('li'),'catalogEffectValue'",CODE)
        self.assertIn("catalogLiveComputed(node('li'),'catalogProgressionLine'",CODE)
        self.assertIn("catalogLiveAttribute(circles,'aria-label','catalogLivePreviewFreeSockets'",CODE)
        self.assertIn("host.querySelectorAll('[data-catalog-live-attribute]')",CODE)
        self.assertIn("if(current&&editor?.querySelector('[data-catalog-item-live-preview]'))refreshItemPreview()",CODE)
        self.assertIn("catalogAttribute(value,'aria-label','catalogEffectValueAria'",CODE)
        self.assertIn("catalogAttribute(stat,'aria-label','catalogEffectStatAria'",CODE)
        self.assertIn("catalogAttribute(unit,'aria-label','catalogEffectUnitAria'",CODE)
        self.assertIn("input.value = values[entry[0]] || ''",CODE)
        self.assertNotIn("innerHTML=catalogTranslate",CODE)
        self.assertNotIn("eval(catalogTranslate",CODE)


if __name__=='__main__':
    unittest.main()
