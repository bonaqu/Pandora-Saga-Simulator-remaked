import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { adminCatalog, publicCatalog, publicCatalogHead } from '../../admin-api/src/catalog.mjs';
import { draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import { currentRacialDrafts } from '../../admin-api/src/current-racial-data.mjs';
import { currentActiveProfileDrafts } from '../../admin-api/src/current-active-profiles.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { previewReviewedPumpkinSoul } from '../../scripts/lib/reviewed-soul-preview.mjs';

const origin = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0002_catalog.sql', '0003_skill_variants.sql', '0004_catalog_impact_revision.sql']) sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/' + name, import.meta.url), 'utf8'));
  const DB = { prepare(sql) {
    let params = [];
    return {
      bind(...values) { params = values; return this; },
      async first() { return sqlite.prepare(sql).get(...params) || null; },
      async run() { return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...params).changes) } }; },
      async all() { return { results: sqlite.prepare(sql).all(...params), success: true }; }
    };
  }, async batch(statements) {
    sqlite.exec('BEGIN');
    try { const result = []; for (const statement of statements) result.push(await statement.run()); sqlite.exec('COMMIT'); return result; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
  return { env: { DB }, sqlite };
}
const request = (path, input) => new Request(origin + path, { method: input ? 'POST' : 'GET', headers: input ? { 'Content-Type': 'application/json' } : {}, body: input ? JSON.stringify(input) : undefined });
const call = async (env, path, input) => {
  const response = await adminCatalog(request('/api/admin/' + path, input), env, 1000);
  return { status: response.status, ...await response.json() };
};
const publicData = async (env, revision) => (await publicCatalog(request('/api/catalog' + (revision === undefined ? '' : '?revision=' + revision)), env)).json();
const detail = (env, id = 'equipment.0.1') => call(env, 'item?id=' + id);

test('impact migration conservatively upgrades an existing nonzero catalog history', () => {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0002_catalog.sql', '0003_skill_variants.sql']) {
    sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/' + name, import.meta.url), 'utf8'));
  }
  sqlite.prepare('UPDATE catalog_head SET version = ?, snapshot_json = ? WHERE id = 1').run(78, '[]');
  sqlite.prepare('INSERT INTO catalog_revisions (version, snapshot_json, created_at, note) VALUES (?, ?, ?, ?)').run(77, '[]', 900, 'Older production revision');
  sqlite.prepare('INSERT INTO catalog_revisions (version, snapshot_json, created_at, note) VALUES (?, ?, ?, ?)').run(78, '[]', 1000, 'Current production revision');

  sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/0004_catalog_impact_revision.sql', import.meta.url), 'utf8'));

  const head = sqlite.prepare('SELECT version, impact_version FROM catalog_head WHERE id = 1').get();
  assert.equal(head.version, 78);
  assert.equal(head.impact_version, 78);
  const history = sqlite.prepare('SELECT version, impact_version FROM catalog_revisions ORDER BY version').all();
  assert.deepEqual(history.map(row => [row.version, row.impact_version]), [[77, 77], [78, 78]]);
});

test('public catalog head separates immutable publication revision from build impact', async () => {
  const { env } = fixture();
  let head = await (await publicCatalogHead(env)).json();
  assert.equal(head.ok, true);
  assert.equal(head.revision, 0);
  assert.equal(head.impactRevision, 0);
  assert.equal(Object.hasOwn(head, 'records'), false);

  // Name/description/translation edits publish immediately but do not make
  // saved builds stale because they cannot change calculations.
  let item = await detail(env);
  item.edit.names.en = 'Head revision check';
  item.edit.names.ru = 'Проверка ревизии';
  item.edit.description.en = 'Display-only description';
  item = await save(env, item);
  let published = await publish(env, item);
  assert.equal(published.catalogRevision, 1);
  assert.equal(published.impactRevision, 0);

  head = await (await publicCatalogHead(env)).json();
  assert.equal(head.revision, 1);
  assert.equal(head.impactRevision, 0);
  assert.equal((await publicData(env, 1)).impactRevision, 0);
  assert.equal(Object.hasOwn(head, 'records'), false);

  // A calculation-affecting edit advances both the catalog and impact head.
  item = await detail(env);
  item.edit.effectMode = 'patch';
  item.edit.effects = [{ stat: 1, value: 7, unit: 'flat' }];
  item = await save(env, item);
  published = await publish(env, item);
  assert.equal(published.catalogRevision, 2);
  assert.equal(published.impactRevision, 2);
  head = await (await publicCatalogHead(env)).json();
  assert.equal(head.revision, 2);
  assert.equal(head.impactRevision, 2);

  // Another text-only publication keeps the last mechanical revision stable.
  item = await detail(env);
  item.edit.description.ru = 'Только новое описание';
  item = await save(env, item);
  published = await publish(env, item);
  assert.equal(published.catalogRevision, 3);
  assert.equal(published.impactRevision, 2);
  head = await (await publicCatalogHead(env)).json();
  assert.equal(head.revision, 3);
  assert.equal(head.impactRevision, 2);
  assert.equal((await publicData(env, 3)).impactRevision, 2);
});

const save = (env, item) => call(env, 'draft', { edit: item.edit, expectedDraftVersion: item.draftVersion, expectedCatalogRevision: item.catalogRevision });
const publish = (env, item) => call(env, 'publish', { id: item.identity.id, expectedDraftVersion: item.draftVersion, expectedCatalogRevision: item.catalogRevision });

test('special effect names change publication only; numeric rules change build impact', async () => {
  const {env}=fixture();let item=await detail(env);
  item.edit.procEffects=[{kind:'special_magic_damage',names:{en:'Phoenix Flame',ru:'Пламя феникса',jp:'',tw:''},
    chance:5,chanceStep:5,from:7,every:1,to:10,gemElement:'fire',damageStat:'STR',
    baseDamage:25,damageStep:25,statPercent:25,statPercentStep:25,cooldownSeconds:5,cooldownReduction:1}];
  let result=await publish(env,await save(env,item));
  assert.equal(result.impactRevision,1);
  item=await detail(env);item.edit.procEffects[0].names.ru='Новое название';
  result=await publish(env,await save(env,item));
  assert.equal(result.catalogRevision,2);assert.equal(result.impactRevision,1);
  assert.equal((await publicData(env,1)).records[0].procEffects[0].names.ru,'Пламя феникса');
  item=await detail(env);item.edit.procEffects[0].damageStep=30;
  result=await publish(env,await save(env,item));assert.equal(result.impactRevision,3);
});

test('reviewed Pumpkin Soul publishes RU/EN text on its existing ID without changing build impact',async()=>{
  const {env}=fixture(),item=await detail(env,'soul.28');
  const plan=previewReviewedPumpkinSoul({source:{id:103023,name:'Тыквенная душа',slots:['body'],
    desc:'Сопротивляемость магии тьмы +5, СД +1.',effects:[{func:'EP_DARK_RESISTANCE_CONST',a:5},{func:'EP_SPIRITUAL_CONST',a:1}]},
    english:{n:'Soul of the Pumpkin',d:'SPI +1 Dark Resistance +5%'},catalog:await publicData(env),
    sourceHashes:{snapshot:'a'.repeat(64)},privateState:{revision:0,dirtyCatalogDraft:false,localizationDrafts:[],localizationOverrides:[],legacyOverrides:[]}});
  assert.equal(plan.status,'change');item.edit=plan.edit;
  const result=await publish(env,await save(env,item));assert.equal(result.catalogRevision,1);assert.equal(result.impactRevision,0);
  const record=(await publicData(env)).records[0];assert.equal(record.id,'soul.28');assert.equal(record.engineId,28);
  assert.equal(record.names.en,'Soul of the Pumpkin');assert.equal(record.names.ru,'Тыквенная душа');
  assert.equal(record.names.jp,'カボチャの魂');assert.equal(record.names.tw,'(南瓜的魂魄)');
  assert.equal(record.calculationCode,'4=1_144=5');assert.deepEqual(record.compatibility,[0,0,0,1,0,0,0,0]);
  assert.deepEqual((await publicData(env,1)).records,[record]);
});

test('class branch limits are editable, revisioned and included in build impact', async () => {
  const { env } = fixture(); let item = await detail(env, 'job.12');
  assert.equal(item.nativeClass.potentialCaps[19], 0);
  item.edit.potentialCaps = [...item.nativeClass.potentialCaps]; item.edit.potentialCaps[19] = 10;
  const preview = await call(env, 'preview', { edit: item.edit, expectedCatalogRevision: 0 });
  assert.equal(preview.record.potentialCaps[19], 10);
  const result = await publish(env, await save(env, item));
  assert.equal(result.impactRevision, 1);
  assert.equal((await publicData(env)).records[0].potentialCaps[19], 10);
  assert.deepEqual((await publicData(env, 0)).records, []);
  item = await detail(env, 'job.12'); assert.equal(item.edit.potentialCaps[19], 10);
  delete item.edit.potentialCaps;
  const restored = await publish(env, await save(env, item));
  assert.equal(restored.impactRevision, 2);
  assert.equal((await publicData(env)).records[0].potentialCaps, undefined);
  assert.equal((await publicData(env, 1)).records[0].potentialCaps[19], 10);
});

test('weapon base range is validated and revisioned independently of display text', async () => {
  const { env } = fixture(); let item = await detail(env, 'equipment.0.10');
  item.edit.baseRange = 160;
  const preview = await call(env, 'preview', { edit: item.edit, expectedCatalogRevision: 0 });
  assert.equal(preview.record.baseRange, 160);
  let result = await publish(env, await save(env, item)); assert.equal(result.impactRevision, 1);
  assert.equal((await publicData(env, 1)).records[0].baseRange, 160);
  item = await detail(env, 'equipment.0.10'); item.edit.baseRange = 175;
  result = await publish(env, await save(env, item)); assert.equal(result.impactRevision, 2);
  assert.equal((await publicData(env, 1)).records[0].baseRange, 160);
  assert.equal((await publicData(env, 2)).records[0].baseRange, 175);
  item = await detail(env, 'soul.28'); item.edit.baseRange = 150;
  await assert.rejects(() => call(env, 'preview', { edit: item.edit, expectedCatalogRevision: 2 }), /only applies to weapons/);
});

test('intrinsic replacement is draft-first, visible in preview/current metadata and reversible without changing previous pins', async () => {
  const { env } = fixture(), item = await detail(env, 'skill_entry.6.0');
  assert.deepEqual(item.nativeSkill.intrinsicEffect.stats, [62]);
  const untouched = await publicData(env);
  item.edit.intrinsicEffectMode = 'replace'; item.edit.effects = [{ stat: 62, value: 3, unit: 'flat' }];
  const preview = await call(env, 'preview', { edit: item.edit, expectedCatalogRevision: 0 });
  assert.equal(preview.record.nativeEffectPolicy, 'typed-replacement');
  await save(env, item); assert.deepEqual(await publicData(env), untouched);
  const pending = await detail(env, item.edit.id); await publish(env, pending);
  const first = await publicData(env, 1), current = await detail(env, item.edit.id);
  assert.equal(current.currentRecord.intrinsicEffectMode, 'replace');
  delete current.edit.intrinsicEffectMode; current.edit.effects = [];
  await publish(env, await save(env, current));
  assert.equal(Object.hasOwn((await publicData(env)).records[0], 'intrinsicEffectMode'), false);
  assert.deepEqual(await publicData(env, 1), first);
  await call(env, 'rollback', { revision: 1, expectedCatalogRevision: 2 });
  assert.deepEqual((await publicData(env)).records, first.records);
});

test('custom learning survives draft, preview, publication, historical reads and rollback without mutating the native template', async () => {
  const { env } = fixture(); const item = await detail(env, 'skill_entry.18.9');
  const nativeCode = item.currentRecord.prerequisiteCode;
  item.edit.learningRequirements = { classIds: [], classScope: 'exact', minimumLevel: 1,
    branches: [{ branchId: 'skill_category.18', minimumPoints: 35 }] };
  const preview = await call(env, 'preview', { edit: item.edit, expectedCatalogRevision: 0 });
  assert.deepEqual(preview.record.learningRequirements, item.edit.learningRequirements);
  assert.equal((await publicData(env)).revision, 0);
  const saved = await save(env, item); await publish(env, saved);
  const first = await publicData(env, 1), published = await detail(env, item.edit.id);
  assert.deepEqual(first.records[0].learningRequirements, item.edit.learningRequirements);
  assert.deepEqual(published.edit.learningRequirements, item.edit.learningRequirements);
  assert.equal(first.records[0].prerequisiteCode, nativeCode);
  delete published.edit.learningRequirements;
  await publish(env, await save(env, published));
  assert.equal(Object.hasOwn((await publicData(env)).records[0], 'learningRequirements'), false);
  assert.deepEqual((await publicData(env, 1)).records, first.records);
  await call(env, 'rollback', { revision: 1, expectedCatalogRevision: 2 });
  assert.deepEqual((await publicData(env)).records, first.records);
});

test('all current racial records survive private preview, publish, historical revisions and rollback', async () => {
  const { env } = fixture();
  for (const edit of currentRacialDrafts()) {
    const item = await detail(env, edit.id);
    const preview = await call(env, 'preview', { edit, expectedCatalogRevision: item.catalogRevision });
    assert.deepEqual(preview.record.effects, edit.effects);
    assert.deepEqual(preview.record.bonusRequirements, edit.bonusRequirements);
    assert.deepEqual(preview.record.calculationNotes, edit.calculationNotes);
    assert.equal((await publicData(env)).revision, item.catalogRevision);
    const saved = await save(env, { ...item, edit }); await publish(env, saved);
    const read = await detail(env, edit.id);
    assert.deepEqual(read.currentRecord.effects, edit.effects);
    assert.deepEqual(read.edit.bonusRequirements, edit.bonusRequirements);
    assert.deepEqual(read.edit.calculationNotes, edit.calculationNotes);
  }
  const latest = await publicData(env), first = await publicData(env, 1);
  assert.equal(latest.revision, 18); assert.equal(latest.records.length, 18);
  assert.equal(first.records.length, 1);
  assert.deepEqual(first.records[0].effects, currentRacialDrafts()[0].effects);
  assert.deepEqual((await publicData(env, 0)).records, []);
  await call(env, 'rollback', { revision: 1, expectedCatalogRevision: 18 });
  assert.deepEqual((await publicData(env)).records, first.records);
  assert.deepEqual((await publicData(env, 18)).records, latest.records);
});

test('editor reads actual public values separately from a private draft and previews without writes', async () => {
  const { env, sqlite } = fixture(); const item = await detail(env);
  assert.equal(item.currentRecord.calculationCode, '18=W5');
  item.edit.effectMode = 'patch'; item.edit.effects = [{ stat: 1, value: 7, unit: 'flat' }];
  const previewInput = { edit: item.edit, expectedCatalogRevision: item.catalogRevision };
  const preview = await call(env, 'preview', previewInput);
  assert.equal(preview.record.calculationCode, '18=W5_1=7');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n, 0);
  assert.equal((await publicData(env)).revision, 0);
  const saved = await save(env, item); const read = await detail(env);
  assert.equal(read.currentRecord.calculationCode, '18=W5');
  assert.deepEqual(read.edit.effects, item.edit.effects);
  await publish(env, saved);
  assert.equal((await detail(env)).currentRecord.calculationCode, '18=W5_1=7');
  await assert.rejects(() => call(env, 'preview', previewInput), error => error.status === 409);
  await assert.rejects(() => call(env, 'preview', { ...previewInput, expectedCatalogRevision: 1, edit: { ...item.edit, effects: [{ stat: 99999, value: 2, unit: 'flat' }] } }), error => error.status === 400);
});

test('racial and passive current references explain retained mechanics, not fabricated editable effects', async () => {
  const { env } = fixture(); const racial = await detail(env, 'racial_skill.4.0');
  assert.deepEqual(racial.currentRecord.effects, []);
  assert.match(racial.nativeMechanics, /−10%/); assert.match(racial.nativeMechanics, /\+2/);
  const passive = await detail(env, 'skill_entry.0.1');
  assert.equal(passive.currentRecord.nativeEffectPolicy, 'retained-plus-bonus');
  assert.ok(passive.currentRecord.description.en);
});

test('baseline is complete, searchable, read-only and never appears as a fabricated published override', async () => {
  const { env } = fixture();
  const meta = await call(env, 'meta'); assert.equal(meta.sourceCount, 1561);
  const equipment = await call(env, 'catalog?kind=equipment'); assert.equal(equipment.count, 1120); assert.equal(equipment.items.length, 40);
  const souls = await call(env, 'catalog?kind=soul'); assert.equal(souls.count, 184);
  const classes = await call(env, 'catalog?kind=class'); assert.equal(classes.count, 28);
  const racial = await call(env, 'catalog?kind=racial'); assert.equal(racial.count, 18);
  const active = await call(env, 'catalog?kind=active'); assert.equal(active.count, 178);
  const passive = await call(env, 'catalog?kind=passive'); assert.equal(passive.count, 33);
  const found = await call(env, 'catalog?kind=equipment&q=Knife'); assert.ok(found.items.some(item => item.id === 'equipment.6.2'));
  assert.deepEqual((await publicData(env)).records, []);
});

test('class drafts publish native coefficients, retain old revisions and cannot allocate invented classes', async () => {
  const { env } = fixture(); const item = await detail(env, 'job.0');
  item.edit.names.en = 'Updated Warrior'; item.edit.progression[0] += 100;
  const saved = await save(env, item); await publish(env, saved);
  const catalog = await publicData(env); assert.equal(catalog.records[0].progression[0], 198);
  assert.ok(catalog.characterSourceFingerprint); assert.equal(catalog.records[0].kind, 'class');
  assert.deepEqual((await publicData(env, 0)).records, []);
  await assert.rejects(() => detail(env, 'job.28'), error => error.status === 404);
  await assert.rejects(() => save(env, { edit: { ...item.edit, id: '' }, draftVersion: 0, catalogRevision: 1 }), error => error.status === 400);
});

test('draft edits are private until explicitly published and publishing is an immutable revision', async () => {
  const { env, sqlite } = fixture();
  const item = await detail(env); item.edit.names.en = 'New name'; item.edit.effectMode = 'patch'; item.edit.effects = [{ stat: 1, value: 7, unit: 'flat' }];
  const saved = await save(env, item); assert.equal(saved.draftVersion, 1);
  assert.deepEqual((await publicData(env)).records, []);
  const committed = await publish(env, saved); assert.equal(committed.catalogRevision, 1);
  const catalog = await publicData(env); assert.equal(catalog.records[0].names.en, 'New name'); assert.equal(catalog.records[0].calculationCode, '18=W5_1=7');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n, 1);
  const clean = await detail(env); assert.equal(clean.hasDraft, false);
  assert.ok(clean.draftVersion > saved.draftVersion);
});

test('stale saves and publishes cannot overwrite changes from another admin tab, including after publish', async () => {
  const { env } = fixture();
  const original = await detail(env);
  original.edit.names.en += ' - concurrency test';
  const one = await save(env, original);
  await assert.rejects(() => save(env, original), error => error.status === 409);
  const two = await save(env, one);
  await assert.rejects(() => publish(env, one), error => error.status === 409);
  await publish(env, two);
  await assert.rejects(() => save(env, one), error => error.status === 409);
  await assert.rejects(() => publish(env, two), error => error.status === 409);
});

test('new equipment/Souls get stable unique IDs without modifying source or leaking drafts publicly', async () => {
  const { env, sqlite } = fixture();
  const created = [];
  for (const kind of ['equipment', 'equipment', 'soul']) {
    const edit = draftFromSource(null, kind); edit.names.en = kind === 'soul' ? 'Modern Soul' : 'Modern Sword';
    if (kind === 'equipment') edit.baseAttack = 45;
    edit.effects = [{ stat: 1, value: 2, unit: 'flat' }];
    created.push(await save(env, { edit, draftVersion: 0, catalogRevision: 0 }));
  }
  assert.equal(created[0].status, 201); assert.notEqual(created[0].identity.id, created[1].identity.id);
  assert.equal(created[1].identity.index, created[0].identity.index + 1); assert.equal(created[2].identity.index, 185);
  assert.deepEqual((await publicData(env)).records, []);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_allocations').get().n, 3);
  await publish(env, created[0]);
  assert.equal((await publicData(env)).records[0].engineKey, 'Modern:' + created[0].identity.id);
});

test('new active/passive variants inherit a source template without replacing its identity or exposing a private draft', async () => {
  const { env } = fixture();
  const active = await detail(env, 'skill_entry.0.0');
  const passive = await detail(env, 'skill_entry.0.1');
  const created = [];
  for (const item of [active, passive]) {
    const edit = { ...item.edit, id: '', templateId: item.identity.id,
      names: { ...item.edit.names, en: 'New ' + item.identity.kind + ' variant' } };
    if (item.identity.kind === 'passive') edit.effects = [{ stat: 1, value: 5, unit: 'flat' }];
    created.push(await save(env, { edit, draftVersion: 0, catalogRevision: 0 }));
  }
  assert.equal(created[0].status, 201); assert.equal(created[1].status, 201);
  assert.notEqual(created[0].identity.id, active.identity.id);
  assert.notEqual(created[1].identity.id, passive.identity.id);
  assert.notEqual(created[0].identity.id, created[1].identity.id);
  assert.equal(created[0].edit.templateId, active.identity.id);
  assert.equal(created[1].edit.templateId, passive.identity.id);
  assert.deepEqual((await publicData(env)).records, []);
  assert.equal((await detail(env, active.identity.id)).edit.names.en, active.edit.names.en);
  assert.equal((await detail(env, passive.identity.id)).edit.names.en, passive.edit.names.en);
  await publish(env, created[0]);
  assert.equal((await publicData(env)).records[0].templateId, active.identity.id);
  const passiveNow = await detail(env, created[1].identity.id);
  await publish(env, passiveNow);
  const records = (await publicData(env)).records;
  assert.equal(records.length, 2);
  assert.equal(records[1].templateId, passive.identity.id);
  assert.equal(records[1].nativeEffectPolicy, 'template-gate-only');
  assert.deepEqual(records[1].effects, [{ stat: 1, value: 5, unit: 'flat' }]);
  assert.deepEqual((await publicData(env, 0)).records, []);
});

test('conditional profiles preview privately, publish one existing skill and retain immutable history without allocating duplicates', async () => {
  const { env, sqlite } = fixture(); const item = await detail(env, 'skill_entry.5.3');
  const makeProfile = (id, classIds, minimumLevel) => ({ id, names: { en: 'Blocking ' + id, ru: 'Блокирование ' + id },
    description: { en: 'Reviewed class profile', ru: 'Проверенный вариант класса' },
    learningRequirements: { classIds, classScope: 'exact', minimumLevel,
      branches: [{ branchId: 'skill_category.5', minimumPoints: 8 }] },
    mpCost: 5, castSeconds: 0, cooldownSeconds: 2, durationSeconds: 0 });
  item.edit.profiles = [makeProfile('general45', ['job.5'], 45), makeProfile('paladin45', ['job.6'], 45)];
  const preview = await call(env, 'preview', { edit: item.edit, expectedCatalogRevision: 0 });
  assert.equal(preview.record.id, item.identity.id); assert.equal(preview.record.profiles.length, 2);
  assert.deepEqual((await publicData(env)).records, []);
  assert.equal((await detail(env, item.identity.id)).hasDraft, false);
  const saved = await save(env, item); assert.equal(saved.hasDraft, true);
  assert.deepEqual((await publicData(env)).records, []);
  assert.deepEqual(saved.edit.profiles, preview.record.profiles.map(profile => ({
    id: profile.id, names: profile.names, description: profile.description, learningRequirements: profile.learningRequirements,
    mpCost: profile.timing[0], castSeconds: profile.timing[1], cooldownSeconds: profile.timing[2], durationSeconds: profile.timing[3]
  })));
  await publish(env, saved);
  const published = await publicData(env); assert.equal(published.revision, 1); assert.equal(published.records.length, 1);
  assert.deepEqual(published.records[0], preview.record);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_skill_allocations').get().n, 0);
  const current = await detail(env, item.identity.id); current.edit.profiles[0].cooldownSeconds = 3;
  const privateDraft = await save(env, current);
  assert.equal(privateDraft.hasDraft, true); assert.deepEqual((await publicData(env, 1)).records, published.records);
  const bad = structuredClone(privateDraft.edit); bad.profiles.push(structuredClone(bad.profiles[0])); bad.profiles[2].id = 'same-conditions';
  await assert.rejects(() => call(env, 'preview', { edit: bad, expectedCatalogRevision: 1 }), error => error.status === 400);
  assert.deepEqual((await detail(env, item.identity.id)).edit, privateDraft.edit);
  await call(env, 'rollback', { revision: 0, expectedCatalogRevision: 1 });
  assert.deepEqual((await publicData(env)).records, []);
  assert.deepEqual((await publicData(env, 1)).records, published.records);
  assert.equal((await detail(env, item.identity.id)).hasDraft, true);
});

test('variant source/type/branch and opaque identity are immutable; forged templates and executable fields fail closed', async () => {
  const { env, sqlite } = fixture(); const source = await detail(env, 'skill_entry.0.0');
  const edit = { ...source.edit, id: '', templateId: source.identity.id };
  for (const invalid of [
    { ...edit, templateId: 'skill_entry.0.1' },
    { ...edit, templateId: 'unknown' }, { ...edit, category: 1 },
    { ...edit, prerequisiteCode: 'J=27=1' }, { ...edit, calculationCode: 'eval(1)' }
  ]) await assert.rejects(() => save(env, { edit: invalid, draftVersion: 0, catalogRevision: 0 }), error => error.status === 400);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_skill_allocations').get().n, 0);
  const item = await save(env, { edit, draftVersion: 0, catalogRevision: 0 });
  for (const invalid of [
    { ...item.edit, templateId: 'skill_entry.0.2' },
    { ...item.edit, kind: 'passive' }, { ...item.edit, category: 1 },
    { ...item.edit, prerequisiteCode: 'S=1=0' }
  ]) await assert.rejects(() => save(env, { ...item, edit: invalid }), error => error.status === 400);
  await assert.rejects(() => save(env, { edit: { ...edit, templateId: item.identity.id }, draftVersion: 0, catalogRevision: 0 }), error => error.status === 400);
  assert.equal((await detail(env, item.identity.id)).draftVersion, 1);
});

test('variant publish/rollback retains older pins, allocated identities and unpublished drafts without overwriting the source', async () => {
  const { env, sqlite } = fixture(); const source = await detail(env, 'skill_entry.0.0');
  let item = await save(env, { edit: { ...source.edit, id: '', templateId: source.identity.id }, draftVersion: 0, catalogRevision: 0 });
  const id = item.identity.id;
  await publish(env, item);
  item = await detail(env, id); item.edit.names.en = 'Private second name';
  const draft = await save(env, item);
  await call(env, 'rollback', { revision: 0, expectedCatalogRevision: 1 });
  assert.deepEqual((await publicData(env)).records, []);
  assert.equal((await publicData(env, 1)).records[0].id, id);
  assert.equal((await publicData(env, 1)).records[0].names.en, source.edit.names.en);
  const retained = await detail(env, id);
  assert.equal(retained.identity.templateId, source.identity.id);
  assert.equal(retained.edit.names.en, 'Private second name');
  await assert.rejects(() => publish(env, draft), error => error.status === 409);
  await publish(env, retained);
  assert.equal((await publicData(env)).records[0].id, id);
  assert.equal((await detail(env, source.identity.id)).edit.names.en, source.edit.names.en);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_skill_allocations').get().n, 1);
  const listed = await call(env, 'catalog?kind=active&q=Private');
  assert.equal(listed.items[0].id, id); assert.equal(listed.items[0].custom, true);
  assert.equal(listed.items[0].templateId, source.identity.id);
});

test('variant allocation rechecks the catalog in its transaction and leaves no orphan on a concurrent publication', async () => {
  const { env, sqlite } = fixture(); const source = await detail(env, 'skill_entry.0.0');
  const batch = env.DB.batch.bind(env.DB);
  env.DB.batch = async statements => {
    sqlite.prepare('UPDATE catalog_head SET version = 1 WHERE id = 1').run();
    return batch(statements);
  };
  await assert.rejects(() => save(env, { edit: { ...source.edit, id: '', templateId: source.identity.id }, draftVersion: 0, catalogRevision: 0 }), error => error.status === 409);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_skill_allocations').get().n, 0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n, 0);
});

test('variant capacity is global and transactional, independent of source template and publication order', async () => {
  const { env, sqlite } = fixture(); const active = await detail(env, 'skill_entry.0.0');
  const passive = await detail(env, 'skill_entry.0.1');
  const ids = new Set();
  for (let index = 0; index < 256; index++) {
    const source = index % 2 ? active : passive;
    const item = await save(env, { edit: { ...source.edit, id: '', templateId: source.identity.id }, draftVersion: 0, catalogRevision: 0 });
    ids.add(item.identity.id);
  }
  assert.equal(ids.size, 256);
  await assert.rejects(() => save(env, { edit: { ...active.edit, id: '', templateId: active.identity.id }, draftVersion: 0, catalogRevision: 0 }), error => error.status === 413);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_skill_allocations').get().n, 256);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n, 256);
  assert.deepEqual((await publicData(env)).records, []);
});

test('additive skill migration leaves existing auth, drafts, encoded allocations and immutable catalog rows intact', () => {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_auth.sql', '0002_catalog.sql']) sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/' + name, import.meta.url), 'utf8'));
  // Deliberately non-authenticating fixture bytes, with the real schema shape.
  sqlite.prepare('INSERT INTO admins (id, username, algorithm, password_salt, password_hash, created_at) VALUES (1,?,?,?,?,?)').run('admin', 'scrypt-n16384-r8-p5-v1', 's'.repeat(43), 'h'.repeat(43), 1000);
  sqlite.prepare('INSERT INTO catalog_allocations VALUES (?,?,?,?,?)').run('modern.soul.fixture', 'soul', -1, 185, 1000);
  sqlite.prepare('INSERT INTO catalog_drafts (id,payload_json,version,updated_at) VALUES (?,?,?,?)').run('modern.soul.fixture', '{}', 7, 1000);
  sqlite.prepare('INSERT INTO catalog_revisions VALUES (?,?,?,?)').run(1, '[]', 1000, 'fixture');
  const tables = ['admins', 'catalog_allocations', 'catalog_drafts', 'catalog_head', 'catalog_revisions'];
  const before = tables.map(name => sqlite.prepare('SELECT * FROM ' + name).all());
  sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/0003_skill_variants.sql', import.meta.url), 'utf8'));
  assert.deepEqual(tables.map(name => sqlite.prepare('SELECT * FROM ' + name).all()), before);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_skill_allocations').get().n, 0);
});

test('rollback creates a new revision while old recipient revisions, allocated IDs and unsaved drafts survive', async () => {
  const { env, sqlite } = fixture();
  let item = await detail(env); item.edit.names.en = 'Revision one'; item = await save(env, item); await publish(env, item);
  const another = await detail(env, 'equipment.0.2'); another.edit.names.en = 'Unpublished draft'; await save(env, another);
  const rolled = await call(env, 'rollback', { revision: 0, expectedCatalogRevision: 1 }); assert.equal(rolled.catalogRevision, 2);
  assert.deepEqual((await publicData(env)).records, []);
  assert.equal((await publicData(env, 1)).records[0].names.en, 'Revision one');
  assert.equal((await detail(env, 'equipment.0.2')).edit.names.en, 'Unpublished draft');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n, 2);
  await assert.rejects(() => call(env, 'rollback', { revision: 0, expectedCatalogRevision: 1 }), error => error.status === 409);
});

test('new-record capacity matches the public adapter and cannot leave orphan drafts or allocated IDs', async () => {
  const { env, sqlite } = fixture();
  // Soul source IDs end at 184; exactly 1024 additional stable IDs are allowed.
  sqlite.prepare('INSERT INTO catalog_sequences (kind, category, next_index) VALUES (?, ?, ?)').run('soul', -1, 1208);
  const edit = draftFromSource(null, 'soul'); edit.names.en = 'Last allowed Soul';
  const last = await save(env, { edit, draftVersion: 0, catalogRevision: 0 });
  assert.equal(last.identity.index, 1208);
  await assert.rejects(() => save(env, { edit, draftVersion: 0, catalogRevision: 0 }), error => error.status === 413);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_allocations').get().n, 1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n, 1);
  assert.equal(sqlite.prepare('SELECT next_index FROM catalog_sequences WHERE kind = ?').get('soul').next_index, 1209);
});

test('strict request shape, unknown IDs, unsupported raw effects, malformed and oversized bodies fail closed', async () => {
  const { env, sqlite } = fixture();
  const item = await detail(env);
  await assert.rejects(() => call(env, 'draft', { edit: item.edit, expectedDraftVersion: 0, expectedCatalogRevision: 0, code: 'evil' }), error => error.status === 400);
  await assert.rejects(() => detail(env, "'; DROP TABLE catalog_head;--"), error => error.status === 404);
  item.edit.calculationCode = 'eval(1)'; await assert.rejects(() => save(env, item), error => error.status === 400);
  await assert.rejects(() => adminCatalog(new Request(origin + '/api/admin/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(65537) }), env), error => error.status === 413);
  assert.equal(sqlite.prepare('SELECT version FROM catalog_head').get().version, 0);
});


test('saved drafts across equipment rows publish atomically as one catalog revision',async()=>{
  const {env,sqlite}=fixture(),ids=['equipment.0.1','equipment.0.2'];
  const drafts=[];
  for(const [index,id] of ids.entries()){
    let row=await detail(env,id);
    row.edit.names.ru='Готовый черновик '+index;
    row=await save(env,row);
    assert.equal(row.hasDraft,true);
    drafts.push({id,expectedDraftVersion:row.draftVersion});
  }
  const pending=await call(env,'drafts');
  assert.equal(pending.count,2);
  assert.deepEqual(new Set(pending.items.map(row=>row.id)),new Set(ids));
  assert.equal(pending.catalogRevision,0);
  assert.equal((await publicData(env)).revision,0);
  const published=await call(env,'publish-batch',{items:drafts,expectedCatalogRevision:0});
  assert.equal(published.ok,true);
  assert.equal(published.count,2);
  assert.equal(published.catalogRevision,1);
  assert.equal(published.impactRevision,0,'text-only batch must not stale saved builds');
  assert.deepEqual(new Set(published.publishedIds),new Set(ids));
  assert.equal((await call(env,'drafts')).count,0);
  const effective=await publicData(env);
  assert.equal(effective.revision,1);
  assert.equal(effective.records.length,2);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n,1);
  for(const id of ids) {
    assert.equal((await detail(env,id)).hasDraft,false);
    assert.ok(effective.records.some(item=>item.id===id));
  }
});

test('guarded batch publication atomically rejects translations created immediately before commit',async()=>{
  for(const collision of [
    {table:'localization_drafts',term:'skill_entry.5.3'},
    {table:'localization_overrides',term:'skill_detail.5.3.3'},
    {table:'result_label_overrides',term:'skill_detail.5.3.1'}
  ]) {
    const {env,sqlite}=fixture();
    sqlite.exec('CREATE TABLE localization_drafts(scope TEXT,term_id TEXT); CREATE TABLE localization_overrides(scope TEXT,term_id TEXT); CREATE TABLE result_label_overrides(id TEXT,ru TEXT)');
    const item=await detail(env,'skill_entry.5.3');item.edit.mpCost+=1;
    const saved=await save(env,item),batch=env.DB.batch;
    env.DB.batch=async statements=>{
      if(collision.table==='result_label_overrides')sqlite.prepare('INSERT INTO result_label_overrides VALUES(?,?)').run(collision.term,'Ручной текст');
      else sqlite.prepare('INSERT INTO '+collision.table+' VALUES(?,?)').run('game',collision.term);
      return batch.call(env.DB,statements);
    };
    const input={items:[{id:'skill_entry.5.3',expectedDraftVersion:saved.draftVersion}],expectedCatalogRevision:0,requireCleanTranslations:true};
    await assert.rejects(()=>call(env,'publish-batch',input),error=>error.status===409 && /protected translation/.test(error.message));
    assert.equal(sqlite.prepare('SELECT version FROM catalog_head').get().version,0);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n,0);
    assert.equal(sqlite.prepare('SELECT is_dirty FROM catalog_drafts WHERE id=?').get('skill_entry.5.3').is_dirty,1);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM '+collision.table).get().n,1);
    env.DB.batch=batch;sqlite.exec('DELETE FROM '+collision.table);
    sqlite.prepare('INSERT INTO localization_overrides VALUES(?,?)').run('ui','skill_entry.5.3');
    sqlite.prepare('INSERT INTO result_label_overrides VALUES(?,?)').run('skill_entry.5.3','<excel-baseline>');
    const published=await call(env,'publish-batch',input);
    assert.equal(published.catalogRevision,1);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM localization_overrides').get().n,1);
    sqlite.close();
  }
});

test('guarded batch rejects a malformed protection option',async()=>{
  const {env}=fixture();
  await assert.rejects(()=>call(env,'publish-batch',{items:[],expectedCatalogRevision:0,requireCleanTranslations:'yes'}),/Invalid translation protection/);
});

test('batch receipts retain translation protection and cannot upgrade an unguarded old receipt',async()=>{
  for(const guarded of [false,true]) {
    const {env,sqlite}=fixture();
    if(guarded)sqlite.exec('CREATE TABLE localization_drafts(scope TEXT,term_id TEXT); CREATE TABLE localization_overrides(scope TEXT,term_id TEXT); CREATE TABLE result_label_overrides(id TEXT,ru TEXT)');
    const item=await detail(env,'skill_entry.5.3');item.edit.mpCost+=1;const saved=await save(env,item);
    const input={items:[{id:item.edit.id,expectedDraftVersion:saved.draftVersion}],expectedCatalogRevision:0,
      operationId:'a3772b1b-ec17-4aea-854c-7452bbc5e281',...(guarded?{requireCleanTranslations:true}:{})};
    const first=await call(env,'publish-batch',input);
    assert.equal(Boolean(first.translationsGuarded),guarded);
    const receipt=await call(env,'publish-batch-status?operationId='+input.operationId);
    assert.equal(Boolean(receipt.receipt.translationsGuarded),guarded);
    if(guarded)assert.equal((await call(env,'publish-batch',input)).translationsGuarded,true);
    else await assert.rejects(()=>call(env,'publish-batch',{...input,requireCleanTranslations:true}),error=>error.status===409);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n,1);
    sqlite.close();
  }
});

function reviewedActiveFixture() {
  const {env,sqlite}=fixture(),id='skill_entry.5.3',source=baselineById.get(id),identity=sourceIdentity(source);
  sqlite.exec('CREATE TABLE localization_drafts(scope TEXT,term_id TEXT); CREATE TABLE localization_overrides(scope TEXT,term_id TEXT); CREATE TABLE result_label_overrides(id TEXT,ru TEXT)');
  const old=validateDraft(draftFromSource(source,'active'),identity);
  const currentHash=createHash('sha256').update(JSON.stringify(old)).digest('hex');
  const edit=currentActiveProfileDrafts().find(row=>row.id===id);
  sqlite.prepare('INSERT INTO catalog_drafts(id,payload_json,version,is_dirty,updated_at) VALUES(?,?,2,0,123)').run(id,JSON.stringify(old));
  const input={items:[{id,edit,expectedCurrentHash:currentHash}],expectedCatalogRevision:0,
    operationId:'a3772b1b-ec17-4aea-854c-7452bbc5e282'};
  return {env,sqlite,input,id};
}

test('reviewed active batch preserves clean draft rows and recovers only an identical guarded request',async()=>{
  const {env,sqlite,input,id}=reviewedActiveFixture(),before=sqlite.prepare('SELECT * FROM catalog_drafts WHERE id=?').get(id);
  const result=await call(env,'publish-reviewed-catalog-batch',input);
  assert.equal(result.catalogRevision,1);assert.equal(result.reviewedDirect,true);assert.equal(result.translationsGuarded,true);
  assert.deepEqual(sqlite.prepare('SELECT * FROM catalog_drafts WHERE id=?').get(id),before);
  assert.ok((await publicData(env)).records.find(row=>row.id===id).profiles.length);
  const retry=await call(env,'publish-reviewed-catalog-batch',input);
  assert.equal(retry.recovered,true);assert.equal(retry.reviewedHash,result.reviewedHash);
  const different=structuredClone(input);different.items[0].edit.names.en='Another edit';
  await assert.rejects(()=>call(env,'publish-reviewed-catalog-batch',different),error=>error.status===409);
  await assert.rejects(()=>call(env,'publish-batch',{items:[],expectedCatalogRevision:0,operationId:input.operationId}),error=>error.status===409);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n,1);sqlite.close();
});

test('reviewed active batch refuses stale edits and concurrent private drafts or translations',async()=>{
  for(const collision of ['draft','translationDraft','translationOverride','legacy']) {
    const {env,sqlite,input,id}=reviewedActiveFixture(),batch=env.DB.batch;
    env.DB.batch=async statements=>{
      if(collision==='draft')sqlite.prepare('UPDATE catalog_drafts SET is_dirty=1,version=3 WHERE id=?').run(id);
      if(collision==='translationDraft')sqlite.prepare('INSERT INTO localization_drafts VALUES(?,?)').run('game',id);
      if(collision==='translationOverride')sqlite.prepare('INSERT INTO localization_overrides VALUES(?,?)').run('game','skill_detail.5.3.3');
      if(collision==='legacy')sqlite.prepare('INSERT INTO result_label_overrides VALUES(?,?)').run('skill_detail.5.3.1','Ручной текст');
      return batch.call(env.DB,statements);
    };
    await assert.rejects(()=>call(env,'publish-reviewed-catalog-batch',input),error=>error.status===409);
    assert.equal(sqlite.prepare('SELECT version FROM catalog_head').get().version,0);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n,0);
    if(collision==='draft')assert.equal(sqlite.prepare('SELECT is_dirty FROM catalog_drafts WHERE id=?').get(id).is_dirty,1);
    sqlite.close();
  }
  const {env,sqlite,input}=reviewedActiveFixture();
  const stale=structuredClone(input);stale.items[0].expectedCurrentHash='0'.repeat(64);
  await assert.rejects(()=>call(env,'publish-reviewed-catalog-batch',stale),error=>error.status===409);
  const duplicate=structuredClone(input);duplicate.items.push(duplicate.items[0]);
  await assert.rejects(()=>call(env,'publish-reviewed-catalog-batch',duplicate),/Invalid reviewed item/);
  await assert.rejects(()=>call(env,'publish-reviewed-catalog-batch',{...input,operationId:undefined}),/requires an operation ID/);
  assert.equal(sqlite.prepare('SELECT version FROM catalog_head').get().version,0);sqlite.close();
});

test('a stale reviewed item rejects the complete batch before any snapshot changes',async()=>{
  const {env,sqlite,input}=reviewedActiveFixture(),id='skill_entry.5.8';
  const edit=currentActiveProfileDrafts().find(row=>row.id===id);
  input.items.push({id,edit,expectedCurrentHash:'0'.repeat(64)});
  await assert.rejects(()=>call(env,'publish-reviewed-catalog-batch',input),error=>error.status===409);
  assert.equal(sqlite.prepare('SELECT version FROM catalog_head').get().version,0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n,0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n,1);
  sqlite.close();
});

test('reviewed catalog batch also validates existing equipment and publishes its editable enhancement rules',async()=>{
  const {env,sqlite}=fixture(),id='equipment.5.27',source=baselineById.get(id),identity=sourceIdentity(source);
  sqlite.exec('CREATE TABLE localization_drafts(scope TEXT,term_id TEXT); CREATE TABLE localization_overrides(scope TEXT,term_id TEXT); CREATE TABLE result_label_overrides(id TEXT,ru TEXT)');
  const current=validateDraft(draftFromSource(source,'equipment'),identity),edit=structuredClone(current);
  edit.nativeUpgradePolicy='replace-legacy-zephyrus-upgrade';
  edit.upgradeBonuses=[{stat:7,value:15,unit:'flat',from:2,every:2,to:10},{stat:1,value:1,unit:'flat',from:7,every:1,to:7}];
  const input={items:[{id,edit,expectedCurrentHash:createHash('sha256').update(JSON.stringify(current)).digest('hex')}],
    expectedCatalogRevision:0,operationId:'a3772b1b-ec17-4aea-854c-7452bbc5e283'};
  const result=await call(env,'publish-reviewed-catalog-batch',input),record=(await publicData(env)).records.find(row=>row.id===id);
  assert.equal(result.impactRevision,1);assert.equal(record.nativeUpgradePolicy,edit.nativeUpgradePolicy);
  assert.deepEqual(record.upgradeBonuses,edit.upgradeBonuses);assert.equal(record.engineId,50027);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n,0);sqlite.close();
});

test('batch draft publication rejects one stale version or invalid batch without publishing any selected item',async()=>{
  const {env,sqlite}=fixture(),ids=['equipment.0.1','equipment.0.2'];
  const drafts=[];
  for(const [index,id] of ids.entries()){
    const item=await detail(env,id);
    item.edit.names.ru='Правка '+index;
    const saved=await save(env,item);
    drafts.push({id,expectedDraftVersion:saved.draftVersion});
  }
  const changed=await detail(env,ids[1]);
  changed.edit.notes.ru='Дополнительная правка';
  await save(env,changed);
  await assert.rejects(()=>call(env,'publish-batch',{items:drafts,expectedCatalogRevision:0}),
    error=>error.status===409);
  for(const items of [
    [drafts[0],drafts[0]],
    [{id:'equipment.999999.1',expectedDraftVersion:1}],
    [{id:ids[0],expectedDraftVersion:-1}],
    Array.from({length:51},(_,i)=>({id:'equipment.0.'+i,expectedDraftVersion:1}))
  ])await assert.rejects(()=>call(env,'publish-batch',{items,expectedCatalogRevision:0}));
  assert.equal((await publicData(env)).revision,0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n,0);
  assert.equal((await call(env,'drafts')).count,2);
  drafts[1].expectedDraftVersion=(await detail(env,ids[1])).draftVersion;
  const published=await call(env,'publish-batch',{items:drafts,expectedCatalogRevision:0});
  assert.equal(published.catalogRevision,1);
  assert.equal((await call(env,'drafts')).count,0);
  await assert.rejects(()=>call(env,'publish-batch',{items:drafts,expectedCatalogRevision:0}),
    error=>error.status===409);
});

test('batch publish keeps mechanically relevant impact revision and leaves unselected drafts intact',async()=>{
  const {env}=fixture();
  let one=await detail(env,'equipment.0.1');
  one.edit.effectMode='patch';one.edit.effects=[{stat:1,value:3,unit:'flat'}];
  one=await save(env,one);
  let other=await detail(env,'equipment.0.2');
  other.edit.names.ru='Не публикация';
  other=await save(env,other);
  const reply=await call(env,'publish-batch',{
    items:[{id:one.identity.id,expectedDraftVersion:one.draftVersion}],
    expectedCatalogRevision:0
  });
  assert.equal(reply.catalogRevision,1);assert.equal(reply.impactRevision,1);
  const pending=await call(env,'drafts');
  assert.equal(pending.count,1);assert.equal(pending.items[0].id,other.identity.id);
  assert.equal((await detail(env,other.identity.id)).hasDraft,true);
});


test('numeric refinement bonuses publish with build-impact revision and stay editable',async()=>{
  const {env}=fixture();
  const selected=await detail(env,'equipment.0.1');
  selected.edit.upgradeBonuses=[{stat:11,value:1,unit:'flat',from:2,every:2,to:10}];
  const saved=await save(env,selected);
  const published=await publish(env,saved);
  assert.equal(published.status,200);
  assert.equal(published.catalogRevision,1);
  assert.equal(published.impactRevision,1,'numeric refinement affects build calculations');
  const record=(await publicData(env)).records.find(item=>item.id==='equipment.0.1');
  assert.deepEqual(record.upgradeBonuses,selected.edit.upgradeBonuses);
  const reopened=await detail(env,'equipment.0.1');
  assert.deepEqual(reopened.edit.upgradeBonuses,selected.edit.upgradeBonuses);
  reopened.edit.names.ru='Название меняется без механики';
  const renamed=await save(env,reopened);
  const next=await publish(env,renamed);
  assert.equal(next.catalogRevision,2);
  assert.equal(next.impactRevision,1,'translations are not mechanical changes');
});

test('catalog search finds stable numeric ID of allocated new equipment',async()=>{
  const {env}=fixture(),edit=draftFromSource(null,'equipment');
  edit.category=30;edit.names={en:'Item for engine ID search',ru:'Вещь для поиска',jp:'検索用の装備',tw:'搜尋用裝備'};
  edit.upgradeBonuses=[{stat:11,value:1,unit:'flat',from:2,every:2,to:10}];
  const created=await save(env,{edit,draftVersion:0,catalogRevision:0});
  assert.equal(created.status,201);
  const id=created.identity.category*10000+created.identity.index;
  const list=await call(env,'catalog?kind=equipment&q='+id);
  assert.ok(list.items.some(row=>row.id===created.identity.id&&row.engineId===id));
  assert.equal(list.items.find(row=>row.id===created.identity.id).names.jp,'検索用の装備');
  assert.deepEqual(created.edit.upgradeBonuses,edit.upgradeBonuses);
  assert.equal((await publicData(env)).revision,0,'draft never publishes automatically');
});


test('catalog list limits draft payload reads to the selected item kind',async()=>{
  const {env}=fixture(),calls=[];
  const original=env.DB.prepare.bind(env.DB);
  env.DB.prepare=sql=>{calls.push(sql);return original(sql);};
  for(const kind of ['equipment','soul','class','racial','active','passive']){
    calls.length=0;
    const response=await call(env,'catalog?kind='+kind);
    assert.equal(response.status,200);
    assert.ok(calls.some(sql=>sql.includes('FROM catalog_drafts WHERE id LIKE ?')),
      kind+' must not fetch unrelated catalog draft payloads');
    assert.ok(response.count>=0);
  }
});


test('catalog batch receipts are committed with revision and safely recover a lost HTTP response',async()=>{
  const {env,sqlite}=fixture();
  const entry=await detail(env,'equipment.0.1');
  entry.edit.names.ru='Проверка квитанции';
  const staged=await save(env,entry);
  const operationId='91577c0e-7844-41d8-81cb-98d7e2477746';
  const input={operationId,expectedCatalogRevision:0,
    items:[{id:entry.identity.id,expectedDraftVersion:staged.draftVersion}]};
  const before=await call(env,'publish-batch-status?operationId='+operationId);
  assert.equal(before.found,false);
  const published=await call(env,'publish-batch',input);
  assert.equal(published.ok,true);
  assert.equal(published.catalogRevision,1);
  assert.equal(published.operationId,operationId);
  const receipt=await call(env,'publish-batch-status?operationId='+operationId);
  assert.equal(receipt.found,true);
  assert.equal(receipt.receipt.catalogRevision,1);
  assert.equal(receipt.receipt.count,1);
  assert.equal(receipt.receipt.operationId,operationId);
  const retry=await call(env,'publish-batch',input);
  assert.equal(retry.catalogRevision,1,'same request ID cannot publish again');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n,1);
  assert.equal((await call(env,'drafts')).count,0);
  await assert.rejects(()=>call(env,'publish-batch-status?operationId=bad'),/Invalid catalog operation ID/);
});

test('catalog preview detects zero actual edits, and no-op saving never adds a new draft',async()=>{
  const {env,sqlite}=fixture();
  const item=await detail(env,'skill_entry.11.6');
  const preview=await call(env,'preview',{edit:item.edit,expectedCatalogRevision:0});
  assert.equal(preview.diff.status,'unchanged');
  assert.equal(preview.diff.count,0);
  await assert.rejects(()=>save(env,item),error=>error.status===422 && /Нет фактических изменений/.test(error.message));
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n,0);
  assert.equal((await publicData(env)).revision,0);
});

test('exact skill comparison includes all locale strings and numeric timing, and queue uses the same result',async()=>{
  const {env}=fixture();
  const item=await detail(env,'skill_entry.14.9');
  item.edit.names.tw='名稱更改';
  item.edit.description.jp='説明を変更';
  item.edit.description.ru='Новое описание проверки';
  item.edit.mpCost+=1;
  const preview=await call(env,'preview',{edit:item.edit,expectedCatalogRevision:0});
  assert.equal(preview.diff.status,'changed');
  assert.deepEqual(preview.diff.changes.map(row=>row.path).sort(),
    ['names.tw','description.jp','description.ru','mpCost'].sort());
  const ru=preview.diff.changes.find(row=>row.path==='description.ru');
  assert.equal(ru.after,'Новое описание проверки');
  const saved=await save(env,item);
  assert.equal(saved.draftDiff.count,4);
  const queue=await call(env,'drafts');
  assert.equal(queue.items[0].diff.count,4);
  assert.equal(queue.items[0].diff.status,'changed');
  assert.equal(queue.items[0].canDiscard,true);
  const published=await publish(env,saved);
  assert.equal(published.catalogRevision,1);
  assert.equal((await call(env,'drafts')).count,0);
  const identical=await detail(env,item.edit.id);
  assert.equal((await call(env,'preview',{edit:identical.edit,expectedCatalogRevision:1})).diff.status,'unchanged');
  await assert.rejects(()=>save(env,identical),error=>error.status===422);
});

test('legacy unchanged draft is visible and discardable, but cannot publish or advance catalog revision',async()=>{
  const {env,sqlite}=fixture();
  const item=await detail(env,'skill_entry.11.6');
  sqlite.prepare('INSERT INTO catalog_drafts (id,payload_json,version,is_dirty,updated_at) VALUES (?,?,?,?,?)')
    .run(item.edit.id,JSON.stringify(item.edit),1,1,1000);
  const queue=await call(env,'drafts');
  assert.equal(queue.count,1);
  assert.equal(queue.items[0].diff.status,'unchanged');
  assert.equal(queue.items[0].diff.count,0);
  assert.equal(queue.items[0].canDiscard,true);
  const pending=await detail(env,item.edit.id);
  assert.equal(pending.draftDiff.status,'unchanged');
  await assert.rejects(()=>publish(env,pending),error=>error.status===422);
  await assert.rejects(()=>call(env,'publish-batch',{items:[{id:item.edit.id,expectedDraftVersion:1}],expectedCatalogRevision:0}),
    error=>error.status===422);
  await assert.rejects(()=>call(env,'discard-draft',{id:item.edit.id,expectedDraftVersion:2,expectedCatalogRevision:0}),
    error=>error.status===409);
  const discarded=await call(env,'discard-draft',{id:item.edit.id,expectedDraftVersion:1,expectedCatalogRevision:0});
  assert.equal(discarded.discarded,true);
  assert.equal((await call(env,'drafts')).count,0);
  assert.equal((await detail(env,item.edit.id)).hasDraft,false);
  assert.equal(sqlite.prepare('SELECT version FROM catalog_drafts WHERE id=?').get(item.edit.id).version,2);
  await assert.rejects(()=>call(env,'discard-draft',{id:item.edit.id,expectedDraftVersion:1,expectedCatalogRevision:0}),
    error=>error.status===409);
  assert.equal((await publicData(env)).revision,0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n,0);
});

test('mixed no-op/real batch is rejected as a whole without losing legitimate edits',async()=>{
  const {env,sqlite}=fixture();
  const noOp=await detail(env,'equipment.0.1');
  sqlite.prepare('INSERT INTO catalog_drafts (id,payload_json,version,is_dirty,updated_at) VALUES (?,?,?,?,?)')
    .run(noOp.edit.id,JSON.stringify(noOp.edit),1,1,1000);
  const changed=await detail(env,'equipment.0.2');
  changed.edit.names.ru='Подтверждённая правка';
  const saved=await save(env,changed);
  const selected=[{id:noOp.edit.id,expectedDraftVersion:1},{id:saved.edit.id,expectedDraftVersion:saved.draftVersion}];
  await assert.rejects(()=>call(env,'publish-batch',{items:selected,expectedCatalogRevision:0}),
    error=>error.status===422);
  assert.equal((await publicData(env)).revision,0);
  assert.equal((await call(env,'drafts')).count,2);
  await call(env,'discard-draft',{id:noOp.edit.id,expectedDraftVersion:1,expectedCatalogRevision:0});
  const published=await call(env,'publish-batch',{items:selected.slice(1),expectedCatalogRevision:0});
  assert.equal(published.catalogRevision,1);
  assert.equal((await publicData(env)).records[0].names.ru,'Подтверждённая правка');
});


test('draft queue loads valid records when one historical payload is invalid and permits only safe cleanup',async()=>{
  const {env,sqlite}=fixture();
  const broken=await detail(env,'skill_entry.11.6');
  sqlite.prepare('INSERT INTO catalog_drafts (id,payload_json,version,is_dirty,updated_at) VALUES (?,?,?,?,?)')
    .run(broken.edit.id,'null',1,1,1000);
  const good=await detail(env,'equipment.0.1');
  good.edit.names.ru='Корректный черновик';
  await save(env,good);
  const pending=await call(env,'drafts');
  assert.equal(pending.ok,true);
  assert.equal(pending.count,2);
  const invalid=pending.items.find(row=>row.id===broken.edit.id);
  assert.deepEqual(invalid.diff,{status:'error',count:null});
  assert.equal(invalid.kind,'active');
  assert.equal(invalid.canDiscard,true);
  const valid=pending.items.find(row=>row.id===good.edit.id);
  assert.equal(valid.diff.status,'changed');
  assert.equal(valid.diff.count,1);
  assert.equal(valid.name,'Корректный черновик');
  assert.equal((await call(env,'discard-draft',{id:broken.edit.id,expectedDraftVersion:1,expectedCatalogRevision:0})).discarded,true);
  assert.equal((await call(env,'drafts')).count,1);
});

test('draft list resolves baseline identities without per-row D1 requests and custom IDs in bounded bulk reads',async()=>{
  const {env}=fixture();
  const originals=['skill_entry.11.6','equipment.0.1','skill_entry.14.9'];
  for(const id of originals){
    const source=await detail(env,id);
    source.edit.names.en+=' updated';
    await save(env,source);
  }
  const oldPrepare=env.DB.prepare.bind(env.DB);
  const counts={individual:0,bulk:0};
  env.DB.prepare=sql=>{
    if (/FROM catalog_(?:skill_)?allocations/.test(sql))
      counts[/WHERE id = \?/.test(sql)?'individual':'bulk']++;
    return oldPrepare(sql);
  };
  const baseline=await call(env,'drafts');
  assert.equal(baseline.count,3);
  assert.equal(counts.individual,0);
  assert.equal(counts.bulk,0);
  const edit=draftFromSource(null,'equipment');
  edit.names.en='Synthetic custom sword';
  edit.baseAttack=5;
  const custom=await save(env,{edit,draftVersion:0,catalogRevision:0});
  // Saving a new custom record legitimately validates the allocation by ID.
  // Measure only the cost of listing all drafts, not the preceding write.
  counts.individual=0;counts.bulk=0;
  const listed=await call(env,'drafts');
  assert.equal(listed.count,4);
  assert.equal(listed.items.find(item=>item.id===custom.edit.id).diff.status,'new');
  assert.equal(counts.individual,0);
  assert.equal(counts.bulk,2,'all custom identities should be retrieved in only two queries');
});
