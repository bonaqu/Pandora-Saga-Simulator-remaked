import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { baselineById } from '../../admin-api/src/catalog-baseline.mjs';
import { compileRecord, normalizeUntranslatedItemName, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import { buildMigration as buildWorkbookMigration } from '../../scripts/materialize_pandora_os_sync.mjs';
import { buildMigration as buildLiveMigration } from '../../scripts/materialize_pandora_os_live_sync.mjs';
import {
  buildCosmeticPruneInsertStatements,
  buildCosmeticPruneRows,
  buildMigration,
  buildReleaseInsertStatements,
  buildReleaseRows,
  buildUnavailableInsertStatements,
  buildUnavailableRows,
  loadInputs,
  stripOuterParentheses
} from '../../scripts/materialize_pandora_os_live_sync_hardening.mjs';

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
function headSnapshot(sqlite) {
  return JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head WHERE id = 1').get().snapshot_json);
}
function revisionSnapshot(sqlite, version) {
  const row = sqlite.prepare('SELECT snapshot_json FROM catalog_revisions WHERE version = ?').get(version);
  return row ? JSON.parse(row.snapshot_json) : [];
}
function byIdentity(entries, id) {
  return entries.find(entry => entry.identity.id === id);
}

test('revision-83 source mapping applies only current server rows and stays one-to-one', () => {
  const inputs = loadInputs();
  assert.equal(inputs.mapping.equipment.length, 271);
  assert.equal(inputs.mapping.souls.length, 97);

  const rows = buildReleaseRows(inputs);
  assert.equal(rows.length, 344);
  assert.equal(rows.filter(row => row.identity.kind === 'equipment').length, 247);
  assert.equal(rows.filter(row => row.identity.kind === 'soul').length, 97);
  assert.equal(new Set(rows.map(row => row.identity.id)).size, rows.length);
  assert.equal(rows.some(row => row.metadata.serverId === 11092), false, 'unobtainable Wizard Hat must not be applied');

  const unavailable = buildUnavailableRows();
  assert.equal(unavailable.length, 24);
  assert.equal(unavailable.every(row => row.identity.kind === 'equipment'), true);

  const releaseStatements = buildReleaseInsertStatements(rows);
  const unavailableStatements = buildUnavailableInsertStatements(unavailable);
  const cosmeticRows = buildCosmeticPruneRows(rows);
  const cosmeticStatements = buildCosmeticPruneInsertStatements(cosmeticRows);
  assert.ok(cosmeticRows.length > 500, 'expected the deployed cosmetic-only revision-82 overrides to be compacted');
  assert.ok(Math.max(...releaseStatements.map(statement => Buffer.byteLength(statement))) < 16384);
  assert.ok(Math.max(...unavailableStatements.map(statement => Buffer.byteLength(statement))) < 16384);
  assert.ok(Math.max(...cosmeticStatements.map(statement => Buffer.byteLength(statement))) < 16384);

  for (const row of rows) {
    const source = baselineById.get(row.identity.id);
    assert.ok(source, 'missing retained source for ' + row.identity.id);
    const edit = validateDraft(row.fallback.edit, row.identity);
    assert.equal(compileRecord(edit, row.identity, source).id, row.identity.id);
  }
});

test('untranslated item-name markers are normalized without touching meaningful inner parentheses', () => {
  assert.equal(stripOuterParentheses('(Gradius)'), 'Gradius');
  assert.equal(stripOuterParentheses('((Steadfast Soul)'), 'Steadfast Soul');
  assert.equal(normalizeUntranslatedItemName('(Chaos Sword)'), 'Chaos Sword');
  assert.equal(normalizeUntranslatedItemName('Vest (Male Elf)'), 'Vest (Male Elf)');
  assert.equal(normalizeUntranslatedItemName('Ring (A)'), 'Ring (A)');
});

test('verified server effects map to supported simulator stats without inventing proc mechanics', () => {
  const byId = new Map(buildReleaseRows(loadInputs()).map(row => [row.identity.id, row.fallback.edit]));

  const arcana = byId.get('equipment.30.66');
  assert.ok(arcana);
  assert.ok(arcana.effects.some(effect => effect.stat === 77 && effect.value === 3));

  const shadow = byId.get('equipment.31.81');
  assert.ok(shadow);
  assert.ok(shadow.effects.some(effect => effect.stat === 20 && effect.value === 10));
  assert.ok(shadow.effects.some(effect => effect.stat === 76 && effect.value === -5));

  const virgo = byId.get('equipment.42.16');
  assert.ok(virgo);
  assert.ok(virgo.effects.some(effect => effect.stat === 11 && effect.value === 4));
  assert.ok(virgo.effects.some(effect => effect.stat === 160 && effect.value === 3));

  const exorcism = byId.get('equipment.31.70');
  assert.ok(exorcism);
  assert.ok(exorcism.effects.some(effect => effect.stat === 162 && effect.value === -15));

  const iron = byId.get('equipment.13.3');
  assert.ok(iron);
  assert.ok(iron.effects.some(effect => effect.stat === 91 && effect.value === 4));

  const mirror = byId.get('soul.163');
  assert.ok(mirror);
  assert.equal(mirror.effectMode, 'patch');
  assert.ok(mirror.effects.some(effect => effect.stat === 135 && effect.value === 3));

  const steady = byId.get('soul.122');
  assert.ok(steady);
  assert.ok(steady.effects.some(effect => effect.stat === 149 && effect.value === 5));
  assert.ok(steady.effects.some(effect => effect.stat === 151 && effect.value === 5));
  assert.ok(steady.effects.some(effect => effect.stat === 153 && effect.value === 20));
});

test('revision 83 compacts revision 82, reverts unchanged unavailable rows and preserves manual edits', () => {
  const sqlite = database();
  transaction(sqlite, buildWorkbookMigration());
  assert.equal(sqlite.prepare('SELECT version FROM catalog_head WHERE id = 1').get().version, 79);
  transaction(sqlite, buildLiveMigration());
  assert.equal(sqlite.prepare('SELECT version FROM catalog_head WHERE id = 1').get().version, 82);

  const rows = buildReleaseRows(loadInputs());
  const cosmeticRows = buildCosmeticPruneRows(rows);
  const unavailableRows = buildUnavailableRows();
  const revision79 = revisionSnapshot(sqlite, 79);
  const current = headSnapshot(sqlite);
  const beforeCount = current.length;

  const untouchedCosmetic = cosmeticRows.find(row => {
    const entry = byIdentity(current, row.identity.id);
    return entry && JSON.stringify(entry) === JSON.stringify(row.expected);
  });
  assert.ok(untouchedCosmetic, 'need a clean cosmetic-only revision-82 row for prune proof');

  const manualCosmetic = cosmeticRows.find(row => {
    if (row.identity.id === untouchedCosmetic.identity.id) return false;
    const entry = byIdentity(current, row.identity.id);
    return entry && JSON.stringify(entry) === JSON.stringify(row.expected);
  });
  assert.ok(manualCosmetic, 'need a second cosmetic-only row for manual-edit preservation proof');
  const manualCosmeticEntry = byIdentity(current, manualCosmetic.identity.id);
  manualCosmeticEntry.edit.notes.en = 'manual cosmetic note must survive';

  const currentServerRow = rows.find(row => byIdentity(current, row.identity.id));
  assert.ok(currentServerRow, 'need an existing current-server row');
  const currentServerEntry = byIdentity(current, currentServerRow.identity.id);
  currentServerEntry.edit.notes.en = 'manual server note must survive';
  currentServerEntry.edit.acquisition.ru = 'ручная заметка о получении';

  const unavailable = unavailableRows.find(row => byIdentity(current, row.identity.id));
  assert.ok(unavailable, 'need an unchanged revision-82 unavailable row');

  sqlite.prepare('UPDATE catalog_head SET snapshot_json = ? WHERE id = 1').run(JSON.stringify(current));
  transaction(sqlite, buildMigration(rows, cosmeticRows, unavailableRows));

  const head = sqlite.prepare('SELECT version, impact_version FROM catalog_head WHERE id = 1').get();
  assert.deepEqual(head, { version: 83, impact_version: 83 });
  const next = headSnapshot(sqlite);
  assert.ok(next.length < beforeCount, 'revision 83 should remove pure cosmetic revision-82 overrides');

  assert.equal(byIdentity(next, untouchedCosmetic.identity.id), undefined, 'untouched cosmetic-only override should be removed');
  assert.equal(byIdentity(next, manualCosmetic.identity.id).edit.notes.en, 'manual cosmetic note must survive');

  const updatedServer = byIdentity(next, currentServerRow.identity.id);
  assert.equal(updatedServer.edit.notes.en, 'manual server note must survive');
  assert.equal(updatedServer.edit.acquisition.ru, 'ручная заметка о получении');
  assert.equal(updatedServer.edit.names.en, currentServerRow.patch.edit.names.en);
  assert.equal(updatedServer.edit.description.ru, currentServerRow.patch.edit.description.ru);

  const previousUnavailable = byIdentity(revision79, unavailable.identity.id);
  const revertedUnavailable = byIdentity(next, unavailable.identity.id);
  if (previousUnavailable) assert.deepEqual(revertedUnavailable, previousUnavailable);
  else assert.equal(revertedUnavailable, undefined);

  const release = sqlite.prepare('SELECT impact_version, note FROM catalog_revisions WHERE version = 83').get();
  assert.deepEqual(release, { impact_version: 83, note: 'Pandora Saga OS live sync hardening' });
});

test('revision 83 refuses any head other than the already-deployed revision 82', () => {
  const sqlite = database();
  transaction(sqlite, buildWorkbookMigration());
  assert.equal(sqlite.prepare('SELECT version FROM catalog_head WHERE id = 1').get().version, 79);
  assert.throws(() => transaction(sqlite, buildMigration()), /CHECK constraint failed/);
  assert.equal(sqlite.prepare('SELECT version FROM catalog_head WHERE id = 1').get().version, 79);
});
