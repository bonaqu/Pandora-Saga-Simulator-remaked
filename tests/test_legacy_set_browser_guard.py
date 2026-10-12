"""Guard browser code from Legacy's shadowed global Set constructor."""
import pathlib
import re
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
SET_CONSTRUCTOR=re.compile(r'\bnew\s+Set\s*\(')

class LegacySetBrowserGuardTests(unittest.TestCase):
    def test_modern_and_admin_browser_scripts_do_not_instantiate_global_set(self):
        sources=sorted((ROOT/'modern').glob('*.js'))+sorted((ROOT/'admin-api/public').glob('*.js'))
        self.assertGreaterEqual(len(sources),30)
        offenders=[]
        for file in sources:
            source=file.read_text(encoding='utf-8')
            for match in SET_CONSTRUCTOR.finditer(source):
                line=source.count('\n',0,match.start())+1
                offenders.append(f'{file.relative_to(ROOT)}:{line}')
        self.assertEqual(offenders,[],f'Legacy-overridden global Set is unsafe in browser code: {offenders}')

    def test_skill_color_projection_is_keyed_and_preserves_native_learning_state(self):
        src=(ROOT/'modern/skill-controls.js').read_text(encoding='utf-8')
        self.assertIn('var learned = Object.create(null);',src)
        self.assertIn('learned[String(id)] = true',src)
        self.assertIn('Object.hasOwn(learned,key)',src)
        self.assertIn("syncLearningColors();",src)
        self.assertNotIn("new Set(window.Learn",src)
        self.assertIn("window.Learn = originalLearn;",src)


if __name__=='__main__':
    unittest.main()
