import json
import pathlib
import tempfile
import unittest
from scripts.audit_localization_surfaces import audit, candidate, fingerprint

class TextSurfaceAuditTests(unittest.TestCase):
    def test_detect_literal_captions_and_unregistered_keys(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp)
            (root/"modern").mkdir()
            (root/"admin-api/public").mkdir(parents=True)
            (root/"localization").mkdir()
            (root/"localization/ui.en.json").write_text(json.dumps({"known.label":"Known"}),encoding="utf8")
            (root/"modern/demo.js").write_text("""
node.textContent = 'Save character';
node.setAttribute('aria-label', 'Reset current build');
const label=element('span','class','Новое название');
i18n.t('missing.caption');
node.textContent='×';
""",encoding="utf8")
            report=audit(root)
            self.assertEqual(report["scannedFiles"],1)
            self.assertEqual([x["text"] for x in report["candidates"]],
                             ["Save character","Reset current build","Новое название"])
            self.assertEqual(report["missingUiSourceKeys"][0]["key"],"missing.caption")
    def test_repository_literal_inventory_has_no_new_unreviewed_texts(self):
        from scripts.audit_localization_surfaces import ROOT, BASELINE
        source=ROOT/"localization/ui.en.json"
        if not source.exists():
            self.skipTest("requires full repository checkout")
        reference=json.loads(BASELINE.read_text(encoding="utf8"))
        known={fingerprint(*row) for row in reference["candidates"]}
        report=audit(ROOT)
        unexpected=[row for row in report["candidates"] if row["fingerprint"] not in known]
        self.assertEqual(unexpected, [], "New literal UI text needs a D1 key or approved audit update")
        self.assertEqual(report["missingUiSourceKeys"], [])
        self.assertGreater(report["scannedFiles"], 20)

    def test_stable_fingerprints(self):
        self.assertEqual(fingerprint("a.js","literal_widget","New label"),
                         fingerprint("a.js","literal_widget","New label"))
        self.assertNotEqual(fingerprint("a.js","literal_widget","New label"),
                            fingerprint("a.js","literal_widget","New title"))
        self.assertTrue(candidate("Show changes"))
        self.assertFalse(candidate("×"))

if __name__=="__main__":unittest.main()
