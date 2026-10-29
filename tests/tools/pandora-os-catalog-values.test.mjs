import test from 'node:test';
import assert from 'node:assert/strict';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { compileRecord, draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import { loadInputs } from '../../scripts/materialize_pandora_os_identity_reconcile.mjs';
import { auditCatalogValues, parseTokens, sameIgnoringPresentation } from '../../scripts/audit_pandora_os_catalog_values.mjs';

test('only known line-break markup is classified as formatting rather than a data change', () => {
  assert.equal(sameIgnoringPresentation('Sword.STR +1', 'Sword.<br><BR />STR +1'), true);
  assert.equal(sameIgnoringPresentation('Sword.STR +1', 'Sword.<br>STR +2'), false);
  assert.equal(sameIgnoringPresentation('Sword', '<b>Sword</b> '), true);
  assert.equal(sameIgnoringPresentation('Sword', '<i>Sword</i>'), false);
});

test('calculation token parsing preserves unfamiliar mechanics and distinguishes weapon/flat/percent', () => {
  const parsed = parseTokens('18=W48_5=2_5=3_52=-10%_unknown=foo');
  assert.equal(parsed.weapon, 48);
  assert.equal(parsed.effects.get('5:flat'), 5);
  assert.equal(parsed.effects.get('52:percent'), -10);
  assert.deepEqual(parsed.unknown, ['unknown=foo']);
});

test('mapped public and preserved baseline records show differences without guessing editorial intent', () => {
  const { items, souls, english, v3 } = loadInputs();
  const equipment = v3.equipment.find(row => baselineById.has(row.projectId));
  const soul = v3.souls.find(row => baselineById.has(row.projectId));
  const source = baselineById.get(equipment.projectId), identity = sourceIdentity(source);
  const published = compileRecord(draftFromSource(source, 'equipment'), identity, source);
  published.names.ru = 'Personal translation';
  published.level = 999;
  const originals = JSON.stringify({ items, souls, english, published });
  const catalog = { ok: true, revision: 92, records: [published] };
  const identities = { revision: 92, matched: [
    { kind: 'equipment', serverId: Number(equipment.serverId), projectId: equipment.projectId },
    { kind: 'soul', serverId: Number(soul.serverId), projectId: soul.projectId }
  ] };
  const result = auditCatalogValues({ items, souls, english, catalog, mapping: v3, identities });
  assert.equal(result.counts.examined, 2);
  assert.equal(result.examined[0].origin, 'published');
  assert.equal(result.examined[1].origin, 'baseline');
  assert.ok(result.examined[0].differences.some(row => row.field === 'names.ru' && row.actual === 'Personal translation'));
  assert.ok(result.examined[0].differences.some(row => row.field === 'level' && row.actual === 999));
  assert.match(result.note, /cannot establish/);
  assert.equal(JSON.stringify({ items, souls, english, published }), originals);
  assert.throws(() => auditCatalogValues({ items, souls, english, catalog, mapping: v3, identities: { ...identities, revision: 91 } }), /revision/);
});

test('unsupported proc and enhancement remain explicit evidence, not invented effects', () => {
  const { items, souls, english, v3 } = loadInputs();
  const row = v3.equipment.find(entry => baselineById.has(entry.projectId));
  const server = structuredClone(items[row.serverId]);
  server.effects = [{ func: 'EP_UNKNOWN_PROC', a: 7, b: 0 }];
  const catalog = { ok: true, revision: 92, records: [] };
  const identities = { revision: 92, matched: [{ kind: 'equipment', serverId: Number(row.serverId), projectId: row.projectId }] };
  const result = auditCatalogValues({ items: { [row.serverId]: server }, souls, english, mapping: v3, catalog, identities,
    itemForth: { [row.serverId]: { 7: [{ func: 'EP_UNKNOWN_PROC', a: 1 }] } } });
  assert.equal(result.examined[0].conversionComplete, false);
  assert.deepEqual(result.examined[0].unsupportedEffects, server.effects);
  assert.equal(result.counts.enhancementReview, 1);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.examined[0].differences.some(diff => diff.field.startsWith('effect.')), false);
});

test('Priest earring audit includes the existing runtime supplement exactly once',()=>{
  const {items,souls,english,v3}=loadInputs();
  const id='modern.equipment.ac383fab-00a9-45ff-a09a-b2192c47ef5d';
  const identity={id,kind:'equipment',category:40,index:61},edit=draftFromSource(null,'equipment');
  Object.assign(edit,{id,category:40,names:{en:"Priest's Earring",ru:'Серьга жреца',jp:'',tw:''},effects:[{stat:49,unit:'flat',value:1}]});
  const record=compileRecord(validateDraft(edit,identity),identity,null),catalog={ok:true,revision:92,records:[record]};
  const identities={revision:92,matched:[{kind:'equipment',serverId:22051,projectId:id}]};
  let row=auditCatalogValues({items,souls,english,mapping:v3,catalog,identities}).examined[0];
  assert.equal(row.conversionComplete,true);
  assert.equal(row.differences.some(diff=>diff.field==='effect.33:flat'),false);
  edit.nativeBasePolicy='replace-priest-earring-aura';edit.effects.push({stat:33,unit:'flat',value:3});
  catalog.records[0]=compileRecord(validateDraft(edit,identity),identity,null);
  row=auditCatalogValues({items,souls,english,mapping:v3,catalog,identities}).examined[0];
  assert.deepEqual(row.differences.find(diff=>diff.field==='effect.33:flat'),{field:'effect.33:flat',actual:3,expected:2});
});
