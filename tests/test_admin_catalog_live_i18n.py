"""Catalog chrome: D1-backed localized live text must not disturb catalog drafts."""
import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
CODE = (ROOT / 'admin-api/public/catalog-ui.js').read_text(encoding='utf-8')
EN = json.loads((ROOT / 'localization/ui.en.json').read_text(encoding='utf-8'))
BUNDLE = json.loads((ROOT / 'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
PLACEHOLDERS = re.compile(r'\{[A-Za-z0-9_]+\}')

LIVE = [
    'catalogListLoading', 'catalogListSummary', 'catalogListUnavailable',
    'catalogUnpublishedDraftTitle', 'catalogDraftsLoadingStatus',
    'catalogDraftsCount', 'catalogDraftsUnavailable', 'catalogNoSavedDrafts',
    'catalogDraftSelectionCount', 'catalogDraftRevision',
    'catalogNewSkillSelected', 'catalogKindAria', 'catalogKindEquipment',
    'catalogKindSoul', 'catalogKindClass', 'catalogKindRacial',
    'catalogKindActive', 'catalogKindPassive', 'catalogSearchPlaceholder',
    'catalogSearchAria', 'catalogDraftSearchPlaceholder',
    'catalogDraftSearchAria', 'catalogDraftCategoryAria',
    'catalogDraftFilterAll', 'catalogDraftFilterEquipment',
    'catalogDraftFilterSoul', 'catalogDraftFilterActive',
    'catalogDraftFilterPassive', 'catalogDraftFilterClass',
    'catalogDraftFilterRacial', 'catalogListAria',
]


class CatalogLiveI18nTests(unittest.TestCase):
    def test_complete_four_language_d1_fallback_registry(self):
        self.assertEqual(len(LIVE), 31)
        self.assertEqual(len(set(LIVE)), len(LIVE))
        for suffix in LIVE:
            key = 'adminShell.' + suffix
            with self.subTest(key=key):
                self.assertIn(suffix, CODE)
                self.assertIn(key, EN)
                english = EN[key]
                self.assertTrue(english.strip())
                self.assertNotRegex(english, '[<>]')
                for locale in ('ru', 'jp', 'tw'):
                    translated = BUNDLE['ui'][locale].get(key)
                    self.assertIsInstance(translated, str)
                    self.assertTrue(translated.strip())
                    self.assertEqual(
                        sorted(PLACEHOLDERS.findall(english)),
                        sorted(PLACEHOLDERS.findall(translated)),
                    )
                    self.assertNotRegex(translated, '[<>]')

    def test_live_projection_tracks_nodes_not_form_values(self):
        self.assertIn('var catalogLiveValues = new WeakMap()', CODE)
        self.assertIn("node.dataset.catalogLiveI18n=key", CODE)
        self.assertIn("host.querySelectorAll('[data-catalog-live-i18n]')", CODE)
        self.assertIn("if(slots(template)!==slots(fallback))template=fallback", CODE)
        self.assertIn('node.textContent=catalogTranslate(', CODE)
        self.assertNotIn('input.dataset.catalogLiveI18n', CODE)
        self.assertNotIn('select.dataset.catalogLiveI18n', CODE)
        self.assertIn("'data-admin-i18n-'+(attribute==='aria-label'?'aria':attribute)", CODE)
        self.assertIn("catalogLive(selectionStatus,'catalogDraftSelectionCount'", CODE)
        self.assertIn("catalogLive(draftSummary,'catalogDraftsCount'", CODE)
        self.assertIn("catalogLive(listStatus,'catalogListSummary'", CODE)
        self.assertIn('selectedDrafts.set(item.id,item.version)', CODE)
        self.assertIn('if(present.get(id)!==version)selectedDrafts.delete(id)', CODE)


if __name__ == '__main__':
    unittest.main()
