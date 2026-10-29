"""Admin localization catalog: source-scoped, read-only key/placeholder audit.

This deliberately inventories only literal admin translations (not dynamic ID
keys, security errors, game formulas, or D1-effective translated values).
"""
import json
import pathlib
import re
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
ADMIN=ROOT/'admin-api/public'
SOURCE=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
from tests.localization_support import ui_with_current_fallbacks
APPROVED=ui_with_current_fallbacks()
FILES=(
    'catalog-ui.js','localization-console.js','localization-bulk.js',
    'localization-drafts.js','localization-four-language.js',
    'admin-i18n.js','admin.js'
)
# The static-function patterns are conservative: no dynamic expressions
# (for example generated catalog skill keys) can be validated this way.
LITERAL_RULES=(
    re.compile(r"\b(?:catalog(?:Live|Static|LiveComputed|LiveName|Translate)"
               r"|live(?:Text|Title|Aria|Computed)?|messageNode|notify|tx|translate|tr)"
               r"\s*\(\s*(?:[^(),\n]*\([^)]*\)|[^,()\n]+)\s*,\s*['\"]([A-Za-z]\w+)['\"]"),
    re.compile(r"\b(?:catalogTranslate|tx|translate|tr)\s*\(\s*['\"]([A-Za-z]\w+)['\"]"),
    re.compile(r"\b(?:localized|localizedAttribute|catalogAttribute|attribute|aria)"
               r"\s*\([^;\n]{0,135}?,\s*['\"]"
               r"((?:loc|catalog|bulk|draft|four|language|category|admin)"
               r"[A-Za-z0-9_]+)['\"]"),
    re.compile(r"adminShell\.([A-Za-z]\w+)"),
)
TOKENS=re.compile(r"\{[A-Za-z0-9_]+\}")


class AdminRegistryInventory(unittest.TestCase):
    def test_all_approved_admin_keys_complete_in_four_languages(self):
        keys=[key for key in SOURCE if key.startswith('adminShell.')]
        self.assertGreaterEqual(len(keys),454)
        for key in keys:
            with self.subTest(key=key):
                original=SOURCE[key]
                self.assertIsInstance(original,str)
                self.assertTrue(original.strip())
                self.assertNotRegex(original,r'[<>]')
                tokens=sorted(TOKENS.findall(original))
                for locale in ('ru','jp','tw'):
                    translated=APPROVED['ui'][locale].get(key)
                    self.assertIsInstance(translated,str)
                    self.assertTrue(translated.strip())
                    self.assertNotRegex(translated,r'[<>]')
                    self.assertEqual(sorted(TOKENS.findall(translated)),tokens)

    def test_literal_admin_calls_have_registered_translation_keys(self):
        discovered={}
        for filename in FILES:
            text=(ADMIN/filename).read_text(encoding='utf-8')
            names=set()
            for pattern in LITERAL_RULES:
                names.update(match.group(1) for match in pattern.finditer(text))
            discovered[filename]=names
            unknown=sorted(key for key in names
                           if 'adminShell.'+key not in SOURCE)
            self.assertFalse(unknown,filename+': unregistered admin keys '+str(unknown))
        # Guard against an accidentally deleted/disabled registry scanner.
        self.assertGreaterEqual(sum(map(len,discovered.values())),225)
        self.assertGreaterEqual(len(discovered['catalog-ui.js']),90)
        self.assertGreaterEqual(len(discovered['localization-console.js']),45)
        self.assertGreaterEqual(len(discovered['localization-bulk.js']),35)
        self.assertGreaterEqual(len(discovered['localization-drafts.js']),20)
        self.assertGreaterEqual(len(discovered['localization-four-language.js']),23)

    def test_effective_production_coverage_is_not_inferred_from_local_fallback(self):
        source=(ROOT/'scripts/audit_localization_baselines.mjs').read_text(encoding='utf-8')
        self.assertIn('effectiveProductionCoverageKnown:false',source)
        self.assertIn('missingSourceIds',source)
        self.assertIn('approved.game',source)
        # Authoritative D1 effective coverage requires signed-in admin GETs.
        console=(ADMIN/'localization-console.js').read_text(encoding='utf-8')
        self.assertIn("verificationPasses:2,identitiesCompared:true",console)
        self.assertIn("atomic:false,readOnly:true",console)


if __name__=='__main__':
    unittest.main()
