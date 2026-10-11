"""Read-only baseline coverage is not a claim about live D1 publications."""
import json
import pathlib
import subprocess
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]

class LocalizationBaselineAuditTests(unittest.TestCase):
    def test_report_is_deterministic_read_only_and_explicit_about_d1_blindspot(self):
        cmd=['node',str(ROOT/'scripts/audit_localization_baselines.mjs'),'--json','--check']
        first=subprocess.run(cmd,cwd=ROOT,check=True,capture_output=True,text=True).stdout
        second=subprocess.run(cmd,cwd=ROOT,check=True,capture_output=True,text=True).stdout
        self.assertEqual(first,second)
        data=json.loads(first)
        self.assertFalse(data['effectiveProductionCoverageKnown'])
        self.assertIn('no live D1',data['basis'])
        self.assertEqual(data['metadata']['legacyTermCount'],2678)
        self.assertEqual(data['metadata']['uiKeyCount'],541)
        self.assertFalse(data['metadata']['duplicateIds'])
        self.assertFalse(data['metadata']['emptyEnglish'])
        self.assertEqual(data['legacySource']['en'],2678)
        self.assertEqual(data['legacySource']['jp'],2630)
        self.assertEqual(data['legacySource']['tw'],2618)
        self.assertEqual(data['legacySource']['ruApproved'],644)
        self.assertEqual(data['uiCoverage']['ru']['approved'],474)
        for lang in ('jp','tw'):
            self.assertEqual(data['uiCoverage'][lang]['missingIds'],['test.englishOnly'])
        self.assertEqual(data['byCategory']['equipment']['total'],1120)
        self.assertEqual(data['byCategory']['skill_detail']['total'],633)

if __name__=='__main__':
    unittest.main()
