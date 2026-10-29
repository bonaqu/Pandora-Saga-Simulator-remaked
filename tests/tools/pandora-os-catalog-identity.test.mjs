import test from 'node:test';
import assert from 'node:assert/strict';
import { auditIdentities } from '../../scripts/audit_pandora_os_catalog_identity.mjs';
import { stableCustomId } from '../../scripts/materialize_pandora_os_identity_reconcile.mjs';

test('distinguishes verified maps, published custom IDs, baseline, ambiguous identity and unverified name candidates', () => {
  const item = id => ({ id, slot: 'weapon', kind: '1H_SWORD', name: 'Вещь ' + id });
  const items = [item(1), item(2), item(3), item(4), { ...item(5), kind: 'DECO_HELMET' }, { ...item(6), slot: 'arrow', kind: 'UNKNOWN' }];
  items[3].name = 'Одинаковое имя';
  const baseline = [
    { id: 'equipment.0.1', legacy_category_id: 0, name: { ru: 'Вещь 1' } },
    { id: 'equipment.0.2', legacy_category_id: 0, name: { ru: 'Вещь 3' } },
    { id: 'equipment.0.3', legacy_category_id: 0, name: { ru: 'Одинаковое имя' } },
    { id: 'soul.1', name: { ru: 'Душа' } }
  ];
  const catalog = { ok: true, revision: 92, records: [
    { id: stableCustomId('equipment', 2), kind: 'equipment', category: 0, names: { en: 'Second' } },
    { id: stableCustomId('equipment', 3), kind: 'equipment', category: 0, names: { en: 'Third' } }
  ] };
  const mapping = { equipment: [{ serverId: 1, projectId: 'equipment.0.1' }, { serverId: 3, projectId: 'equipment.0.2' }], souls: [{ serverId: 10, projectId: 'soul.1' }] };
  const report = auditIdentities({ items, souls: [{ id: 10, name: 'Душа' }], english: {}, mapping, catalog, baseline });
  assert.equal(report.revision, 92);
  assert.deepEqual(report.matched.map(row => [row.serverId, row.evidence, row.catalogSource]), [[1, 'reviewed-map', 'baseline'], [2, 'deterministic-source-id', 'published'], [10, 'reviewed-map', 'baseline']]);
  assert.deepEqual(report.ambiguous.map(row => row.serverId), [3]);
  assert.deepEqual(report.missing.map(row => row.serverId), [4]);
  assert.deepEqual(report.duplicateCandidates[0].projectIds, ['equipment.0.3']);
  assert.match(report.duplicateCandidates[0].reason, /unverified/);
  assert.equal(report.excluded.length, 2);
});

test('rejects duplicate server or public identities and reports mismatched mapped categories as ambiguous', () => {
  const catalog = { ok: true, revision: 92, records: [] }, mapping = { equipment: [], souls: [] };
  assert.throws(() => auditIdentities({ items: [{ id: 1 }, { id: 1 }], souls: [], mapping, catalog, baseline: [] }), /duplicate server ID/);
  const baseline = [{ id: 'equipment.0.1', legacy_category_id: 0, name: {} }];
  const result = auditIdentities({ items: [{ id: 1, kind: 'BOW', slot: 'weapon' }], souls: [], mapping: { equipment: [{ serverId: 1, projectId: 'equipment.0.1' }], souls: [] }, catalog, baseline });
  assert.deepEqual(result.ambiguous[0].mismatchedIds, ['equipment.0.1']);
});

test('different English word order finds a possible Soul duplicate without assigning its identity',()=>{
  const report=auditIdentities({items:[],souls:[{id:103023,name:'Тыквенная душа'}],
    english:{souls:{103023:{n:'Soul of the Pumpkin'}}},mapping:{equipment:[],souls:[]},
    catalog:{ok:true,revision:92,records:[]},baseline:[{id:'soul.28',name:{en:'(Pumpkin Soul)'}}]});
  assert.equal(report.matched.length,0);
  assert.deepEqual(report.duplicateCandidates[0].projectIds,['soul.28']);
  assert.equal(report.missing[0].serverId,103023);
  assert.match(report.duplicateCandidates[0].reason,/unverified/);
});

test('an owner-confirmed identity is explicit, preserves the old ID and fails on evidence drift',()=>{
  const review={kind:'soul',serverId:103023,projectId:'soul.28',sourceRu:'Тыквенная душа',
    sourceEn:'Soul of the Pumpkin',legacyEn:'(Pumpkin Soul)',evidence:'owner-confirmed'};
  const args={items:[],souls:[{id:103023,name:'Тыквенная душа'}],english:{souls:{103023:{n:'Soul of the Pumpkin'}}},
    mapping:{equipment:[],souls:[]},catalog:{ok:true,revision:92,records:[]},
    baseline:[{id:'soul.28',name:{en:'(Pumpkin Soul)'}}],identityReviews:[review]};
  const report=auditIdentities(args);
  assert.deepEqual(report.matched.map(row=>[row.serverId,row.projectId,row.evidence]),[[103023,'soul.28','owner-confirmed-review']]);
  assert.equal(report.missing.length,0);
  assert.equal(auditIdentities({...args,mapping:{equipment:[],souls:[{serverId:103023,projectId:'soul.28'}]}}).matched.length,1);
  assert.throws(()=>auditIdentities({...args,english:{souls:{103023:{n:'Changed'}}}}),/evidence changed/);
  assert.throws(()=>auditIdentities({...args,identityReviews:[review,review]}),/duplicate/);
});
