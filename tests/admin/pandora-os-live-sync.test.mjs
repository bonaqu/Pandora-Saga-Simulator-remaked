import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { baselineById } from '../../admin-api/src/catalog-baseline.mjs';
import { compileRecord, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import { buildMigration as buildPreviousMigration } from '../../scripts/materialize_pandora_os_sync.mjs';
import {
  buildMigration,
  buildReleaseInsertStatements,
  buildReleaseRows,
  loadInputs
} from '../../scripts/materialize_pandora_os_live_sync.mjs';

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
function snapshot(sqlite) {
  return JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head WHERE id = 1').get().snapshot_json);
}

test('live Pandora OS mapping is one-to-one, equipment-only and fully compilable', () => {
  const inputs = loadInputs();
  assert.equal(inputs.mapping.equipment.length, 271);
  assert.equal(inputs.mapping.souls.length, 74);

  const serverIds = new Set();
  const projectIds = new Set();
  for (const match of [...inputs.mapping.equipment, ...inputs.mapping.souls]) {
    const key = (match.projectId.startsWith('soul.') ? 's:' : 'e:') + match.serverId;
    assert.equal(serverIds.has(key), false, 'duplicate server mapping ' + key);
    assert.equal(projectIds.has(match.projectId), false, 'duplicate project mapping ' + match.projectId);
    serverIds.add(key);
    projectIds.add(match.projectId);
  }

  for (const match of inputs.mapping.equipment) {
    const item = inputs.items[String(match.serverId)];
    assert.ok(item?.slot && item.slot !== 'arrow', 'non-equipment resource entered live mapping');
  }

  const rows = buildReleaseRows(inputs);
  assert.ok(rows.length > 1000, 'expected broad legacy English normalization plus server sync');
  assert.equal(rows.filter(row => row.mode === 'server').length, 345);
  assert.equal(new Set(rows.map(row => row.identity.id)).size, rows.length);
  assert.ok(rows.some(row => row.mode === 'normalize' &&
    /^\([^()]+\)$/.test(row.expectedEnglish || '') &&
    !/^\([^()]+\)$/.test(row.patch.edit.names.en || '')),
    'expected at least one bracket-only English normalization');

  const statements = buildReleaseInsertStatements(rows);
  assert.equal(statements.length, rows.length);
  assert.ok(Math.max(...statements.map(statement => Buffer.byteLength(statement))) < 16384);

  for (const row of rows) {
    const source = baselineById.get(row.identity.id);
    assert.ok(source, 'missing baseline source ' + row.identity.id);
    const edit = validateDraft(row.fallback.edit, row.identity);
    const compiled = compileRecord(edit, row.identity, source);
    assert.equal(compiled.id, row.identity.id);
    assert.equal(compiled.names.en.startsWith('(') && compiled.names.en.endsWith(')'), false,
      'outer-parenthesized English name survived: ' + row.identity.id);
  }
});

test('revision 82 merge-patches revision 81 without clobbering unrelated manual admin fields', () => {
  const sqlite = database();
  transaction(sqlite, buildPreviousMigration());

  const inputs = loadInputs();
  const rows = buildReleaseRows(inputs);
  const serverRow = rows.find(row => row.mode === 'server' && row.identity.id === 'equipment.0.10')
    || rows.find(row => row.mode === 'server');
  const normalizeOnly = rows.find(row => row.mode === 'normalize');
  assert.ok(serverRow && normalizeOnly);

  const current = snapshot(sqlite);
  const serverExisting = current.find(entry => entry.identity.id === serverRow.identity.id);
  if (serverExisting) {
    serverExisting.edit.notes = { ...(serverExisting.edit.notes || {}), en: 'manual-note-must-survive' };
  } else {
    const seeded = structuredClone(serverRow.fallback);
    seeded.edit.notes.en = 'manual-note-must-survive';
    current.push(seeded);
  }

  const manualNormalize = structuredClone(normalizeOnly.fallback);
  manualNormalize.edit.names.en = 'Manual English Name';
  const existingNormalize = current.findIndex(entry => entry.identity.id === normalizeOnly.identity.id);
  if (existingNormalize >= 0) current[existingNormalize] = manualNormalize;
  else current.push(manualNormalize);

  sqlite.prepare('UPDATE catalog_head SET version = 81, impact_version = 79, snapshot_json = ? WHERE id = 1')
    .run(JSON.stringify(current));

  transaction(sqlite, buildMigration(rows));

  const head = sqlite.prepare('SELECT version, impact_version FROM catalog_head WHERE id = 1').get();
  assert.equal(head.version, 82);
  assert.equal(head.impact_version, 82);
  const next = snapshot(sqlite);
  const updatedServer = next.find(entry => entry.identity.id === serverRow.identity.id);
  assert.equal(updatedServer.edit.notes.en, 'manual-note-must-survive');
  assert.equal(updatedServer.edit.names.en, serverRow.patch.edit.names.en);

  const preservedManual = next.find(entry => entry.identity.id === normalizeOnly.identity.id);
  assert.equal(preservedManual.edit.names.en, 'Manual English Name');

  const release = sqlite.prepare('SELECT impact_version, note FROM catalog_revisions WHERE version = 82').get();
  assert.equal(release.impact_version, 82);
  assert.match(release.note, /Pandora Saga OS live/);
});

test('revision 82 also applies after the deterministic revision-79 migration chain', () => {
  const sqlite = database();
  transaction(sqlite, buildPreviousMigration());
  transaction(sqlite, buildMigration());
  const head = sqlite.prepare('SELECT version, impact_version, json_array_length(snapshot_json) AS count FROM catalog_head WHERE id = 1').get();
  assert.equal(head.version, 82);
  assert.equal(head.impact_version, 82);
  assert.ok(head.count > 1000);

  const unexpected = database();
  unexpected.prepare('UPDATE catalog_head SET version = 80, impact_version = 79 WHERE id = 1').run();
  assert.throws(() => transaction(unexpected, buildMigration()), /CHECK constraint failed/);
  assert.equal(unexpected.prepare('SELECT version FROM catalog_head WHERE id = 1').get().version, 80);
});
