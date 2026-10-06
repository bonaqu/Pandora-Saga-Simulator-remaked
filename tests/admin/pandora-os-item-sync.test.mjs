import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { buildMigration, buildReleaseInsertStatements, loadReleaseEntries, validateReleaseEntries } from '../../scripts/materialize_pandora_os_sync.mjs';
import { baselineById } from '../../admin-api/src/catalog-baseline.mjs';
import { compileRecord, validateDraft } from '../../admin-api/src/catalog-model.mjs';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0002_catalog.sql', '0003_skill_variants.sql', '0004_catalog_impact_revision.sql']) {
    sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/' + name, import.meta.url), 'utf8'));
  }
  return sqlite;
}

function transaction(sqlite, migration) {
  sqlite.exec('BEGIN');
  try {
    sqlite.exec(migration);
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

test('Pandora Saga OS release payload is complete, unique and compilable against retained source identities', () => {
  const entries = loadReleaseEntries();
  validateReleaseEntries(entries);
  assert.equal(entries.length, 180);
  assert.equal(entries.filter(entry => entry.identity.kind === 'equipment').length, 111);
  assert.equal(entries.filter(entry => entry.identity.kind === 'soul').length, 69);
  assert.equal(entries.some(entry => entry.edit.names.en === 'Healer Soul'), false);
  const releaseStatements = buildReleaseInsertStatements(entries);
  assert.equal(releaseStatements.length, 180);
  assert.ok(Math.max(...releaseStatements.map(statement => Buffer.byteLength(statement))) < 16384);

  const compiled = new Map();
  for (const entry of entries) {
    const source = baselineById.get(entry.identity.id);
    assert.ok(source, 'Missing retained source for ' + entry.identity.id);
    const edit = validateDraft(entry.edit, entry.identity);
    compiled.set(entry.identity.id, compileRecord(edit, entry.identity, source));
  }

  const heavy = compiled.get('equipment.9.3');
  assert.equal(heavy.names.en, 'Heavy Crossbow');
  assert.equal(heavy.names.ru, 'Тяжелый арбалет');
  assert.equal(heavy.level, 38);
  assert.equal(heavy.sockets, 1);
  assert.equal(heavy.calculationCode, '18=W67');

  const bounty = compiled.get('equipment.4.4');
  assert.equal(bounty.calculationCode, '18=W50_1=1');
  const iron = compiled.get('equipment.13.3');
  assert.equal(iron.calculationCode, '18=W27_5=2_91=4');

  const cerberus = compiled.get('soul.102');
  assert.equal(cerberus.names.en, 'Soul of Cerberus');
  assert.equal(cerberus.names.ru, 'Душа волка');
  assert.equal(cerberus.description.ru, 'Уклонение +1.');
  assert.equal(cerberus.calculationCode, '65=1');
});

test('generated catalog migration publishes revision 79 and preserves an existing revision-78 snapshot', () => {
  const sqlite = database();
  const previous = JSON.stringify([{
    identity: { id: 'racial_skill.0.0', kind: 'racial', category: 0, index: 0 },
    edit: { marker: 'existing-revision-78-entry' }
  }]);
  sqlite.prepare('UPDATE catalog_head SET version = 78, impact_version = 78, snapshot_json = ? WHERE id = 1').run(previous);
  sqlite.prepare('INSERT INTO catalog_revisions (version, impact_version, snapshot_json, created_at, note) VALUES (78, 78, ?, 1, ?)').run(previous, 'Previous production head');

  transaction(sqlite, buildMigration());
  const head = sqlite.prepare('SELECT version, impact_version, snapshot_json FROM catalog_head WHERE id = 1').get();
  assert.equal(head.version, 79);
  assert.equal(head.impact_version, 79);
  const snapshot = JSON.parse(head.snapshot_json);
  assert.equal(snapshot.length, 181);
  assert.equal(snapshot[0].edit.marker, 'existing-revision-78-entry');
  assert.equal(snapshot.filter(entry => entry.identity.kind === 'equipment').length, 111);
  assert.equal(snapshot.filter(entry => entry.identity.kind === 'soul').length, 69);

  const historical = sqlite.prepare('SELECT snapshot_json FROM catalog_revisions WHERE version = 78').get();
  assert.equal(historical.snapshot_json, previous);
  const release = sqlite.prepare('SELECT impact_version, snapshot_json, note FROM catalog_revisions WHERE version = 79').get();
  assert.equal(release.impact_version, 79);
  assert.equal(JSON.parse(release.snapshot_json).length, 181);
  assert.equal(release.note, 'Pandora Saga OS RU/EN item data sync');
});

test('generated catalog migration initializes a fresh database at revision 79 and refuses an unexpected head', () => {
  const fresh = database();
  transaction(fresh, buildMigration());
  const head = fresh.prepare('SELECT version, impact_version, json_array_length(snapshot_json) AS count FROM catalog_head WHERE id = 1').get();
  assert.equal(head.version, 79);
  assert.equal(head.impact_version, 79);
  assert.equal(head.count, 180);

  const unexpected = database();
  unexpected.prepare('UPDATE catalog_head SET version = 77, impact_version = 77 WHERE id = 1').run();
  assert.throws(() => transaction(unexpected, buildMigration()), /CHECK constraint failed/);
  assert.equal(unexpected.prepare('SELECT version FROM catalog_head WHERE id = 1').get().version, 77);
});
