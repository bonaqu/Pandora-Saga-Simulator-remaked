import json
import pathlib
import tempfile
import unittest

from scripts.build_pages import _materialize_guild_descriptions

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'localization' / 'guild-skills.v1.json'


class GuildDescriptionsTests(unittest.TestCase):
    def test_all_reviewed_levels_match_the_source_and_generated_runtime(self):
        data = json.loads(SOURCE.read_text(encoding='utf-8'))
        self.assertEqual([len(s['levels']) for s in data['skills']], [12, 5, 5, 2, 2, 2, 2, 5, 3, 3, 3])
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            (root / 'localization').mkdir()
            (root / 'modern').mkdir()
            (root / 'localization/guild-skills.v1.json').write_bytes(SOURCE.read_bytes())
            _materialize_guild_descriptions(root, root)
            payload = (root / 'modern/guild-data.js').read_text(encoding='utf-8')
            self.assertTrue(payload.startswith('window.PandoraRemakedGuildSkills = Object.freeze('))
            self.assertEqual(json.loads(payload.split('Object.freeze(', 1)[1].rsplit(');', 1)[0]), data)
            self.assertIn('максимальные ОЗ +12%', payload)

    def test_unknown_or_missing_levels_fail_closed(self):
        data = json.loads(SOURCE.read_text(encoding='utf-8'))
        data['skills'][0]['levels'].pop()
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            (root / 'localization').mkdir()
            (root / 'modern').mkdir()
            (root / 'localization/guild-skills.v1.json').write_text(json.dumps(data), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'incorrect guild skill level count'):
                _materialize_guild_descriptions(root, root)


if __name__ == '__main__':
    unittest.main()
