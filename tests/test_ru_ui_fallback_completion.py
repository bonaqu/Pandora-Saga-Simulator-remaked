"""Curated Russian player UI fallbacks, not D1 overwrites or game data edits."""
import json
import pathlib
import re
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
EN=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
DATA=json.loads((ROOT/'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
RU=DATA['ui']['ru']
SLOTS=re.compile(r'\{[A-Za-z0-9_]+\}')
TOOLTIPS=(
 'lp','mp','physicalAttack','magicAttack','defense','physicalDamageResist',
 'magicDamageResist','accuracy','dodge','crit','critResist','critDamage',
 'critDamageResist','attackSpeed','moveSpeed','castSpeed','castTime','cooldown',
 'fireResist','iceResist','lightningResist','poisonResist','charmResist',
 'lightResist','darkResist','magicResist',
)
MANAGER=(
 'builds.live.loadedUpdated','builds.live.autoApplied','builds.live.catalogHelp',
 'builds.live.catalogLine','builds.live.catalogSourceLine',
 'builds.live.catalogCheckingLine','builds.migration.removed',
 'builds.migration.reasonMissing','builds.migration.reasonIncompatible',
 'builds.migration.reasonSlots','builds.migration.reasonUnknown',
 'builds.migration.count','builds.migration.showChanges','builds.migration.title',
 'builds.migrationSaveFailed',
)
CURATED=(
 ('hero.source','skills.adeptness','skills.potential',
  'updates.latestForUsers','updates.technicalSummary',
  'catalog.diffSoulSlots','calculator.calculationLimit')
 +tuple('tooltip.definition.'+name for name in TOOLTIPS)+MANAGER
)
INTENTIONALLY_NOT_LOCALIZED={
 'mobile.stat.lp','mobile.stat.atk','mobile.stat.def','test.englishOnly',
 'skills.indicator','hero.uiBadge','hero.engineBadge',
 'adminEntry.channel','adminEntry.close','adminEntry.accepted',
 'adminEntry.title','adminEntry.hint','adminEntry.previewHint',
 'adminEntry.openLogin','adminEntry.username','adminEntry.password',
 'adminEntry.authenticate','adminEntry.footer','catalog.stat.prv',
}

class RussianUiFallbackTests(unittest.TestCase):
    def test_48_curated_fallbacks_preserve_source_placeholders(self):
        self.assertEqual(len(CURATED),48)
        self.assertEqual(len(set(CURATED)),48)
        for key in CURATED:
            with self.subTest(key=key):
                self.assertIn(key,EN)
                translated=RU.get(key)
                self.assertIsInstance(translated,str)
                self.assertTrue(translated.strip())
                self.assertNotEqual(translated,EN[key])
                self.assertNotRegex(translated,r'[<>]')
                self.assertEqual(
                    sorted(SLOTS.findall(translated)),
                    sorted(SLOTS.findall(EN[key])),
                )
        self.assertEqual(RU['updates.technicalSummary'],
                         'Выполнены внутренние технические улучшения.')
        self.assertEqual(RU['skills.adeptness'],'Изучено (ОЧ)')
        self.assertEqual(RU['skills.potential'],'Потенциал.')

    def test_preexisting_curated_ru_labels_never_get_rewritten(self):
        curated=json.loads((ROOT/'localization/curated-runtime-defaults.ru.v1.json').read_text(encoding='utf-8'))['ru']['ui']
        for key in ('skills.adeptness','skills.potential',
                    'updates.latestForUsers','updates.technicalSummary'):
            with self.subTest(key=key):
                self.assertEqual(RU.get(key),curated[key])
        # skills.help has a deliberately separate frozen approved snapshot;
        # do not replace it with display defaults while adding missing keys.
        self.assertNotEqual(RU['skills.help'],curated['skills.help'])

    def test_no_unexpected_ru_gaps_and_keep_stylized_identifiers_intact(self):
        missing={key for key in EN if not RU.get(key)}
        self.assertTrue(missing.issubset(INTENTIONALLY_NOT_LOCALIZED))
        self.assertIn('test.englishOnly',missing)
        self.assertNotIn('hero.uiBadge',RU)
        self.assertNotIn('adminEntry.title',RU)
        # D1 takes precedence over these fallback strings in the public UI.
        for lang in ('jp','tw'):
            self.assertIn('test.englishOnly',
                          {key for key in EN if not DATA['ui'][lang].get(key)})


if __name__=='__main__':
    unittest.main()
