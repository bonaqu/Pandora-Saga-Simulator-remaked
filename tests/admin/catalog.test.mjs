import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { adminCatalog, publicCatalog } from '../../admin-api/src/catalog.mjs';
import { draftFromSource } from '../../admin-api/src/catalog-model.mjs';

const origin = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0002_catalog.sql', '0003_skill_variants.sql']) sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/' + name, import.meta.url), 'utf8'));
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
const save = (env, item) => call(env, 'draft', { edit: item.edit, expectedDraftVersion: item.draftVersion, expectedCatalogRevision: item.catalogRevision });
const publish = (env, item) => call(env, 'publish', { id: item.identity.id, expectedDraftVersion: item.draftVersion, expectedCatalogRevision: item.catalogRevision });

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
