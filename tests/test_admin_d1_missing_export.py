"""Effective D1 missing-identity export: authorized, complete, read-only."""
import json
import pathlib
import re
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
CODE=(ROOT/'admin-api/public/localization-console.js').read_text(encoding='utf-8')
EN=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
APPROVED=json.loads((ROOT/'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
SLOTS=re.compile(r'\{[A-Za-z0-9_]+\}')
KEYS=('locAuditExportMissing','locAuditExportProgress','locAuditExportVerify','locAuditExportReady','locAuditExportFailure')

class D1EffectiveMissingExportTests(unittest.TestCase):
    def test_export_copy_is_safe_in_all_four_admin_languages(self):
        for suffix in KEYS:
            key='adminShell.'+suffix
            with self.subTest(key=key):
                self.assertIn(suffix,CODE)
                self.assertIn(key,EN)
                reference=EN[key]
                self.assertTrue(reference.strip())
                self.assertNotRegex(reference,'[<>]')
                for lang in ('ru','jp','tw'):
                    copy=APPROVED['ui'][lang].get(key)
                    self.assertIsInstance(copy,str)
                    self.assertTrue(copy.strip())
                    self.assertEqual(sorted(SLOTS.findall(copy)),sorted(SLOTS.findall(reference)))
                    self.assertNotRegex(copy,'[<>]')

    def test_archive_global_set_override_does_not_break_admin_workflows(self):
        for name in ('localization-console.js','localization-bulk.js','localization-drafts.js'):
            code=(ROOT/'admin-api/public'/name).read_text(encoding='utf-8')
            with self.subTest(script=name):
                self.assertNotIn('new Set(',code)
        queue=(ROOT/'admin-api/public/localization-drafts.js').read_text(encoding='utf-8')
        self.assertIn('selected=new Map()',queue)
        self.assertIn('for(const id of selected.keys())',queue)
        self.assertIn('selected.set(id,true)',queue)
        bulk=(ROOT/'admin-api/public/localization-bulk.js').read_text(encoding='utf-8')
        self.assertIn('const editing=new Map()',bulk)
        self.assertIn('editing.set(item.id,true)',bulk)

    def test_export_adds_no_d1_write_and_does_not_change_unsaved_drafts(self):
        self.assertIn("exportButton.addEventListener('click',async()=>{",CODE)
        block=CODE.split("exportButton.addEventListener('click',async()=>{",1)[1].split("        results.prepend(exportButton);",1)[0]
        self.assertIn("await api('GET',null,'/api/admin/localization?'+params)",block)
        self.assertNotIn("api('POST'",block)
        self.assertNotIn("api('DELETE'",block)
        self.assertIn("status:'missing'",block)
        self.assertIn("data.items.length!==Math.min(pageSize,remaining)",block)
        self.assertIn("Object.hasOwn(seen,row.id)",block)
        self.assertIn("seen=Object.create(null)",block)
        self.assertNotIn("new Set()",block)
        self.assertIn("row.origin!=='fallback'",block)
        self.assertIn("data.scope!==entry.scope",block)
        self.assertIn("data.locale!==entry.locale",block)
        self.assertIn("data.total!==entry.missing",block)
        self.assertIn("if(token!==auditRequest||!exportButton.isConnected)return",block)
        self.assertIn("includesTranslationText:false",block)
        self.assertIn('verificationPasses:2,identitiesCompared:true',block)
        self.assertIn("data.coverage.total!==reference.total",block)
        self.assertIn("JSON.stringify(verified)!==JSON.stringify(entry.ids)",block)
        self.assertIn("row.origin!=='fallback'||Object.hasOwn(seenAgain,row.id)",block)
        self.assertIn("if(token!==auditRequest||!exportButton.isConnected)return",block)

        self.assertIn("atomic:false,readOnly:true",block)
        self.assertNotIn("localStorage",block)
        self.assertNotIn("sessionStorage",block)
        self.assertNotIn("document.cookie",block)
        self.assertNotIn("row.effective",block)
        self.assertNotIn("row.baseline",block)
        self.assertNotIn("csrf()",block)
        self.assertNotIn("drafts.",block)

if __name__=='__main__':
    unittest.main()
