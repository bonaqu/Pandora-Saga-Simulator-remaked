import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { adminCatalog, publicCatalog, publicCatalogHead } from '../../admin-api/src/catalog.mjs';
import { draftFromSource } from '../../admin-api/src/catalog-model.mjs';
import { currentRacialDrafts } from '../../admin-api/src/current-racial-data.mjs';
import {adminLocalization,publicLocalization} from '../../admin-api/src/localization.mjs';

const origin = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0002_catalog.sql', '0003_skill_variants.sql', '0004_catalog_impact_revision.sql','0005_result_labels.sql','0006_ui_translation_overrides.sql','0007_unified_localization.sql','0008_localization_workflow.sql']) sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/' + name, import.meta.url), 'utf8'));
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
  assert.equal(created[0].identity.id,'equipment.0.'+created[0].identity.index);
  assert.equal(created[1].identity.id,'equipment.0.'+created[1].identity.index);
  assert.equal(created[2].identity.id,'soul.185');
  assert.equal(new Set(created.map(row=>row.identity.id)).size,3);

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


test('new numbered item is editable on all four languages through unified localization',async()=>{
  const {env}=fixture();
  const draft=draftFromSource(null,'equipment');
  draft.names.en='New Test Weapon';draft.baseAttack=30;
  draft.effects=[{stat:11,value:1,unit:'flat'}];
  let created=await save(env,{edit:draft,draftVersion:0,catalogRevision:0});
  assert.match(created.identity.id,/^equipment\.0\.\d+$/);
  await publish(env,created);
  const id=created.identity.id;
  for(const locale of ['ru','en','jp','tw']){
    const list=await (await adminLocalization(new Request(origin+'/api/admin/localization?scope=game&group=equipment&locale='+locale+'&q='+id),env)).json();
    const item=list.items.find(row=>row.id===id);
    assert.ok(item,'dynamic item should appear in admin '+locale);
    assert.equal(item.source.en,'New Test Weapon');
    assert.equal(item.version,0);
    const content=locale==='ru'?'Оружие на проверке':locale==='jp'?'試験武器':locale==='tw'?'測試武器':'New Test Weapon (custom)';
    const input={scope:'game',id,locale,value:content,expectedVersion:0,expectedEffective:item.effective};
    const r=await adminLocalization(new Request(origin+'/api/admin/localization',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)
    }),env);
    assert.equal(r.status,200,'dynamic translation must be writable '+locale);
  }
  const publicMap=(await (await publicLocalization(env)).json()).overrides;
  assert.equal(publicMap.game.ru[id],'Оружие на проверке');
  assert.equal(publicMap.game.jp[id],'試験武器');
  assert.equal(publicMap.game.tw[id],'測試武器');
  const description=id+'.description';
  const item=await detail(env,id);
  item.edit.description.en='Original custom description';
  const after=await save(env,item);
  await publish(env,after);
  const list=await (await adminLocalization(new Request(origin+'/api/admin/localization?scope=game&locale=ru&q='+description),env)).json();
  assert.ok(list.items.some(x=>x.id===description),'custom description must be in the same admin');
});
