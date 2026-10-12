"""Conditional skill variant interface copy is D1-first and display-only."""
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
    'catalogPublishedVersion','catalogProfileCount','catalogProfileSelectionHelp',
    'catalogProfileNameColon','catalogProfileTiming','catalogReviewWorkflow',
    'catalogLearningBranchesHelp','catalogProfileRulesIntro',
    'catalogProfileEmptySave','catalogProfileOptionName','catalogProfileEmptyEdit',
    'catalogProfileConditions','catalogProfileBranchesHelp','catalogProfileTimingHelp',
)


class ProfileI18nTests(unittest.TestCase):
    def test_all_profile_chrome_is_approved_in_four_languages(self):
        self.assertEqual(len(KEYS),14)
        for suffix in KEYS:
            key='adminShell.'+suffix
            with self.subTest(key=key):
                self.assertIn(suffix,CODE)
                self.assertIn(key,SOURCE)
                original=SOURCE[key]
                self.assertTrue(original.strip())
                self.assertNotRegex(original,r'[<>]')
                slots=sorted(SLOTS.findall(original))
                for lang in ('ru','jp','tw'):
                    translated=APPROVED['ui'][lang].get(key)
                    self.assertIsInstance(translated,str)
                    self.assertTrue(translated.strip())
                    self.assertNotRegex(translated,r'[<>]')
                    self.assertEqual(sorted(SLOTS.findall(translated)),slots)

    def test_empty_profile_summary_does_not_override_live_editor_contents(self):
        self.assertIn("catalogLive(summary,'catalogProfileEmptyEdit'",CODE)
        self.assertIn("catalogLive(summary,'catalogProfileEmptySave'",CODE)
        self.assertIn("catalogRaw(summary,learningSummary(profile.learningRequirements))",CODE)
        self.assertIn("catalogRaw(summary,learningSummary(drafts[index].learningRequirements))",CODE)
        self.assertIn("catalogLive(choice.options[index],'catalogProfileOptionName'",CODE)
        self.assertIn("catalogStatic(conditions.querySelector('legend'),'catalogProfileConditions'",CODE)
        self.assertIn("if(entry)node.textContent=catalogTranslate(entry.key,entry.fallback,entry.values)",CODE)
        self.assertIn("catalogLiveValues.delete(node)",CODE)
        self.assertIn("delete node.dataset.catalogLiveI18n",CODE)
        self.assertNotIn('input.dataset.catalogLiveI18n',CODE)


if __name__=='__main__':
    unittest.main()
