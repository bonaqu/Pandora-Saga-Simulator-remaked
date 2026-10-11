"""Production coverage can be audited only via read-only admin API requests."""
import json
import pathlib
import re
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
SRC=(ROOT/'admin-api/public/localization-console.js').read_text(encoding='utf-8')
EN=json.loads((ROOT/'localization/ui.en.json').read_text(encoding='utf-8'))
APPROVED=json.loads((ROOT/'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
SLOTS=re.compile(r'\{[A-Za-z0-9_]+\}')
class EffectiveCoverageUI(unittest.TestCase):
    def test_audit_is_explicit_read_only_and_preserves_existing_editor_state(self):
        self.assertIn("auditButton.addEventListener('click',async()=>{",SRC)
        block=SRC.split("auditButton.addEventListener('click',async()=>{",1)[1].split("    const coverage=tag('div'",1)[0]
        self.assertIn("await api('GET',null",block)
        self.assertIn("status:'missing'",block)
        self.assertNotIn("api('POST'",block)
        self.assertIn("if(token!==auditRequest||!auditPanel.isConnected)return",block)
        self.assertIn("data.total!==values.total-values.translated",block)
        self.assertIn("translationStatus='missing';query='';page=0",block)
        self.assertIn("generation++;auditRequest++;",SRC)
        self.assertIn("categories.reduce((sum,entry)=>sum+entry.missing,0)!==data.total",SRC)
        self.assertIn("openMissing(entry.scope,entry.locale,category.id)",SRC)
        self.assertIn("const detail=tag('details',null,'localization-audit-breakdown')",SRC)
        self.assertIn("const drafts=new Map()",SRC)
        self.assertIn("input.value=drafts.has(id)",SRC)
        keys=['locAuditAction','locAuditTitle','locAuditDescription','locAuditLoading',
              'locAuditCompleted','locAuditError','locAuditScopeGame','locAuditScopeUi',
              'locAuditNumbers','locAuditBrowseMissing','locAuditCategoryBreakdown']
        for name in keys:
            key='adminShell.'+name
            with self.subTest(key=key):
                self.assertIn(key,EN)
                for locale in ('ru','jp','tw'):
                    value=APPROVED['ui'][locale].get(key)
                    self.assertIsInstance(value,str)
                    self.assertTrue(value.strip())
                    self.assertEqual(sorted(SLOTS.findall(value)),sorted(SLOTS.findall(EN[key])))
