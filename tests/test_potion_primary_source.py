"""Read-only source snapshots support Potion Souls and fixed healing numbers.

This does not establish live-client Soul stacking legality, heal caps or other
effects and does not modify original 2.00 engine formulas.
"""
import json
import pathlib
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
ITEMS=json.loads((ROOT/'admin-api/data/pandora-os-live-items-20261007.json').read_text(encoding='utf-8'))
SOULS=json.loads((ROOT/'admin-api/data/pandora-os-live-souls-20261007.json').read_text(encoding='utf-8'))
CALC=(ROOT/'js/calc.js').read_text(encoding='utf-8')
MODERN=(ROOT/'modern/calculator-controls.js').read_text(encoding='utf-8')

class PotionSourceAuditTests(unittest.TestCase):
    def test_primary_potion_soul_has_eight_point_potion_recovery_modifier(self):
        soul=SOULS['103018']
        self.assertEqual(soul['name'],'Душа зелий')
        self.assertEqual(soul['slots'],['body','legs'])
        self.assertEqual(soul['effects'],[{
            'func':'EP_MASTERY_POTION','dir':'SELF',
            'a':8,'b':1,'min':0,'max':10,
        }])
        self.assertNotIn('EP_CAST_HEAL_LIFE_SCALE',soul['desc'])

    def test_live_source_refutes_obsolete_mysterious_potion_175_hint(self):
        item=ITEMS['50061']
        self.assertEqual(item['kind'],'POTION')
        self.assertEqual(item['name'],'Таинственное зелье')
        self.assertEqual([
            (effect['func'],effect['a']) for effect in item['effects']
        ],[('EP_HEAL_LIFE',145),('EP_HEAL_MANA',75)])
        self.assertIn("Math.floor(145 * Status['POT'] / 100)",CALC)
        self.assertIn("var potionFixedRecovery=[20,60,120,180,450,145,20,25,200,150]",MODERN)
        hepatica=ITEMS['50023']
        self.assertEqual(hepatica['name'],'Подснежник')
        self.assertIn(('EP_HEAL_LIFE',20),[(e['func'],e['a']) for e in hepatica['effects']])
        self.assertIn("Math.floor(10 * Status['POT'] / 100)",CALC)
        self.assertIn("50023,'Подснежник','Hepatica'",MODERN)

    def test_monk_and_paladin_potion_mastery_stays_separate_from_magic_healing(self):
        self.assertIn("Math.floor((Status['Skill'][0][0] + Status['Skill'][0][1]) / 10) * 10",CALC)
        self.assertIn("Status['Job'][2] <= 6",CALC)
        self.assertIn("tmp[0] = 8;",CALC)
        self.assertIn("tmp[0] = 11;",CALC)
        self.assertIn("function refreshPotionEffectsPreview()",MODERN)
        self.assertNotIn("installPotionTabAccessibility",MODERN)
        self.assertNotIn("window.Flag[6]=",MODERN)
        self.assertIn("var enabled=Boolean(window.Flag?.[6])",MODERN)
        self.assertIn("potionPercentRecovery.map(function(percent){return percent+'%';})",MODERN)
        self.assertIn("if (!enabled) {",MODERN)
        self.assertIn("} else if (valid) {",MODERN)
        self.assertNotIn("window.Flag[6]=",MODERN)
        self.assertIn("potionPercentRecovery=[5,15,30,18]",MODERN)


if __name__=='__main__':
    unittest.main()
