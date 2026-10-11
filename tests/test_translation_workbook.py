"""Preserve translation invariants after the approved Excel retirement.

The last validated XLSX is recoverable from Git history. Current baseline is
reviewed JSON + versioned admin overrides; no client can edit an .xlsx.
"""
import json
import pathlib
import re
import unittest
from scripts.localization_catalog import load_migrated_catalogs

ROOT = pathlib.Path(__file__).resolve().parents[1]
LOC = ROOT / "localization"
SLOTS = re.compile(r"\{([A-Za-z0-9_]+)\}")


class TranslationCatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.snapshot = json.loads((LOC / "approved-translations.v1.json").read_text(encoding="utf8"))
        cls.data = load_migrated_catalogs(ROOT)
        cls.ui_source = json.loads((LOC / "ui.en.json").read_text(encoding="utf8"))
        cls.game_source = json.loads((LOC / "game-terms.ru.json").read_text(encoding="utf8"))["terms"]

    def test_canonical_catalog_is_only_source_used_for_build(self):
        self.assertFalse((LOC / "translations.xlsx").exists())
        self.assertEqual(self.snapshot["schemaVersion"], 1)
        self.assertEqual(self.data.total, 2920)
        self.assertEqual(len(self.ui_source), 630)
        self.assertEqual(len(self.game_source), 2678)

    def test_full_stable_registry_and_source_ids_remain_unique(self):
        game_ids = [term["id"] for term in self.game_source]
        self.assertEqual(len(game_ids), len(set(game_ids)))
        self.assertFalse(set(self.ui_source) & set(game_ids))
        # The historical approved snapshot is immutable. New Admin-editable
        # UI keys intentionally extend the current registry without altering
        # the frozen 2920-row migration source.
        self.assertEqual(self.data.total, 2920)
        self.assertGreaterEqual(len(self.ui_source) + len(game_ids), self.data.total)
        for locale in ("ru", "en", "jp", "tw"):
            self.assertTrue(set(self.snapshot["ui"][locale]) <= set(self.ui_source))
            self.assertTrue(set(self.snapshot["game"][locale]) <= set(game_ids))
            for scope in ("ui", "game"):
                self.assertTrue(all(isinstance(v, str) and v.strip()
                                    for v in self.snapshot[scope][locale].values()))

    def test_curated_ui_display_fallbacks_do_not_modify_frozen_approved_snapshot(self):
        curated = json.loads((LOC / "curated-runtime-defaults.ru.v1.json").read_text(encoding="utf8"))
        help_text = curated["ru"]["ui"]["skills.help"]
        self.assertEqual(self.data.ui_russian["skills.help"], help_text)
        self.assertNotEqual(self.snapshot["ui"]["ru"]["skills.help"], help_text)
        self.assertEqual(len(self.ui_source), 630)
        self.assertEqual(self.data.total, 2920)

    def test_build_manager_has_japanese_and_traditional_chinese_fallbacks(self):
        # Fallbacks are not D1 publications: the admin's newer text always wins.
        keys = ["builds.button","builds.managerTitle","builds.close","builds.named","builds.namePlaceholder","builds.saveCurrent","builds.codeTitle","builds.codePlaceholder","builds.exportCurrent","builds.importCode","builds.clearCode","builds.load","builds.rename","builds.duplicate","builds.delete","builds.autosavePending","builds.autosaveUnavailable","builds.autosaveWarning","builds.savedAt","builds.autosaveIgnored","builds.autosaveReady","builds.autosaveRestored","builds.storageUnavailable","builds.storageReadFailed","builds.damagedIgnored","builds.none","builds.notFound","builds.invalid","builds.loaded","builds.savedLoaded","builds.loadedNoAutosave","builds.renamePrompt","builds.renameFailed","builds.renamed","builds.duplicateFailed","builds.created","builds.deleteConfirm","builds.deleteFailed","builds.deleted","builds.serializeFailed","builds.saveFailed","builds.saved","builds.exported","builds.exportFailed","builds.invalidCode","builds.imported","builds.savedImported","builds.importedNoAutosave","builds.share","builds.shareLink","builds.shareCopied","builds.shareManual","builds.sharedLoaded","builds.invalidShare","builds.legacyImport","builds.legacyHelp","builds.legacyCopied","builds.legacyFailed"]
        self.assertEqual(len(keys), 58)
        for key in keys:
            self.assertIn(key, self.ui_source)
            for language in ("jp", "tw"):
                value = self.snapshot["ui"][language].get(key)
                self.assertTrue(isinstance(value, str) and value.strip(), (language, key))
                self.assertEqual(sorted(SLOTS.findall(value)),
                                 sorted(SLOTS.findall(self.ui_source[key])))

    def test_catalog_action_buttons_have_four_administratively_editable_locales(self):
        # Only exact authored captions; actual user-created item names are data.
        ids = ["adminShell.catalogReviewChanges","adminShell.catalogRemove","adminShell.catalogDeleteRule","adminShell.catalogRemoveRequirement","adminShell.catalogAddBranchRequirement","adminShell.catalogAddVariant","adminShell.catalogDeleteSelectedVariant","adminShell.catalogAddStat","adminShell.catalogSaveDraft","adminShell.catalogPublish","adminShell.catalogNewSkillFromTemplate","adminShell.catalogAddEnhancementBonus","adminShell.catalogCreateVariant","adminShell.catalogBack","adminShell.catalogNext","adminShell.catalogSelectAll","adminShell.catalogClearSelection","adminShell.catalogPublishSelected","adminShell.catalogPublishAllDrafts","adminShell.catalogRefreshList","adminShell.catalogOpen","adminShell.catalogRetryCheck","adminShell.catalogConfirmModernCleanup","adminShell.catalogNewRecord","adminShell.catalogAstirCleanup","adminShell.catalogHistoryRollback"]
        self.assertEqual(len(ids),26)
        for key in ids:
            self.assertIn(key,self.ui_source)
            for locale in ("ru","jp","tw"):
                self.assertTrue(self.snapshot["ui"][locale][key])
                self.assertEqual(sorted(SLOTS.findall(self.snapshot["ui"][locale][key])),
                                 sorted(SLOTS.findall(self.ui_source[key])))

    def test_compare_tooltips_and_calculator_controls_have_jp_tw_fallbacks(self):
        keys = ["compare.button","compare.title","compare.close","compare.buildA","compare.buildB","compare.refresh","compare.choose","compare.level","compare.chooseTwo","compare.chooseDifferent","compare.missing","compare.deltaHelp","compare.evaluateFailed","compare.needTwoEmpty","compare.needTwoStatus","compare.column.stat","compare.column.delta","compare.hideIdentical","compare.allIdentical","tooltip.about","tooltip.source","calculator.inputInvalid","calculator.inputMaximum","calculator.inputMinimum","calculator.inputWholeNumber","calculator.inputRequired","calculator.inputBudget","calculator.inputBudgetForField","calculator.levelInputHelp","calculator.attributeInputHelp","calculator.totalWithBonuses","calculator.calculationLimit","character.level","character.status","character.skill","character.potential","character.potentialHelp","tooltip.definition.lp","tooltip.definition.mp","tooltip.definition.physicalAttack","tooltip.definition.magicAttack","tooltip.definition.defense","tooltip.definition.physicalDamageResist","tooltip.definition.magicDamageResist","tooltip.definition.accuracy","tooltip.definition.dodge","tooltip.definition.crit","tooltip.definition.critResist","tooltip.definition.critDamage","tooltip.definition.critDamageResist","tooltip.definition.attackSpeed","tooltip.definition.moveSpeed","tooltip.definition.castSpeed","tooltip.definition.castTime","tooltip.definition.cooldown","tooltip.definition.fireResist","tooltip.definition.iceResist","tooltip.definition.lightningResist","tooltip.definition.poisonResist","tooltip.definition.charmResist","tooltip.definition.lightResist","tooltip.definition.darkResist","tooltip.definition.magicResist"]
        self.assertEqual(len(keys),63)
        for key in keys:
            self.assertIn(key,self.ui_source)
            for locale in ("jp","tw"):
                value = self.snapshot["ui"][locale].get(key)
                self.assertTrue(isinstance(value,str) and value.strip(),(key,locale))
                self.assertEqual(sorted(SLOTS.findall(value)),
                                 sorted(SLOTS.findall(self.ui_source[key])))

    def test_all_localized_ui_placeholders_match_original(self):
        for language in ("ru", "en", "jp", "tw"):
            for identifier, text in self.snapshot["ui"][language].items():
                self.assertEqual(sorted(SLOTS.findall(text)),
                                 sorted(SLOTS.findall(self.ui_source[identifier])),
                                 (language, identifier))

    def test_approved_skill_equipment_and_racial_names_not_lost(self):
        expected = {
            "skill_entry.7.5": "Пылающая стрела",
            "skill.7": "Стрельба",
            "calculator.status.39": "Сопр. тьме",
        }
        for identifier, word in expected.items():
            self.assertEqual(self.data.game_russian[identifier], word)
        self.assertGreater(len(self.data.game_russian), 500)
        self.assertGreater(len(self.data.ui_russian), 100)

    def test_snapshot_maps_are_not_mutated_by_a_caller(self):
        a = load_migrated_catalogs(ROOT)
        b = load_migrated_catalogs(ROOT)
        self.assertIsNot(a.game_russian, b.game_russian)
        a.game_russian["skill_entry.7.5"] = "Тест"
        self.assertEqual(b.game_russian["skill_entry.7.5"], "Пылающая стрела")


if __name__ == "__main__":
    unittest.main()
