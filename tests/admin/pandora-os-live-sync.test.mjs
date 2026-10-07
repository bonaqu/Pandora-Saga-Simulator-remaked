import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { baselineById } from '../../admin-api/src/catalog-baseline.mjs';
import { compileRecord, normalizeUntranslatedItemName, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import { buildMigration as buildPreviousMigration } from '../../scripts/materialize_pandora_os_sync.mjs';
import {
  buildMigration,
  buildReleaseInsertStatements,
  buildReleaseRows,
  loadInputs,
  stripOuterParentheses
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

test('live Pandora OS mapping is one-to-one, compact and fully compilable', () => {
  const inputs = loadInputs();
  assert.equal(inputs.mapping.equipment.length, 271);
  assert.equal(inputs.mapping.souls.length, 97);

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
  assert.equal(rows.length, 344);
  assert.equal(rows.filter(row => row.mode === 'server').length, 344);
  assert.equal(rows.some(row => row.metadata.serverId === 11092), false, 'unobtainable Wizard Hat must not be applied');
  assert.equal(new Set(rows.map(row => row.identity.id)).size, rows.length);

  const statements = buildReleaseInsertStatements(rows);
  assert.equal(statements.length, rows.length);
  assert.ok(Math.max(...statements.map(statement => Buffer.byteLength(statement))) < 16384);

  for (const row of rows) {
    const source = baselineById.get(row.identity.id);
    assert.ok(source, 'missing baseline source ' + row.identity.id);
    const edit = validateDraft(row.fallback.edit, row.identity);
    const compiled = compileRecord(edit, row.identity, source);
    assert.equal(compiled.id, row.identity.id);
  }
});

test('legacy untranslated-name markers are normalized without touching normal inner parentheses', () => {
  assert.equal(stripOuterParentheses('(Gradius)'), 'Gradius');
  assert.equal(stripOuterParentheses('((Steadfast Soul)'), 'Steadfast Soul');
  assert.equal(normalizeUntranslatedItemName('(Chaos Sword)'), 'Chaos Sword');
  assert.equal(normalizeUntranslatedItemName('Vest (Male Elf)'), 'Vest (Male Elf)');
  assert.equal(normalizeUntranslatedItemName('Ring (A)'), 'Ring (A)');
});

test('live server stats use verified conversions without inventing unsupported proc mechanics', () => {
  const rows = buildReleaseRows(loadInputs());
  const byId = new Map(rows.map(row => [row.identity.id, row.fallback.edit]));

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

  const iron = byId.get('equipment.13.3');
  assert.ok(iron);
  assert.ok(iron.effects.some(effect => effect.stat === 91 && effect.value === 4));

  const exorcism = byId.get('equipment.31.70');
  assert.ok(exorcism);
  assert.ok(exorcism.effects.some(effect => effect.stat === 162 && effect.value === -15));

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

test('revision 82 merge-patches revision 81 without clobbering unrelated manual admin fields', () => {
  const sqlite = database();
  transaction(sqlite, buildPreviousMigration());

  const rows = buildReleaseRows(loadInputs());
  const serverRow = rows.find(row => row.identity.id === 'equipment.31.70') || rows[0];
  const current = snapshot(sqlite);
  const existingIndex = current.findIndex(entry => entry.identity.id === serverRow.identity.id);
  const seeded = existingIndex >= 0 ? current[existingIndex] : structuredClone(serverRow.fallback);
  seeded.edit.notes = { ...(seeded.edit.notes || {}), en: 'manual-note-must-survive' };
  seeded.edit.acquisition = { ...(seeded.edit.acquisition || {}), ru: 'ручная заметка о получении' };
  if (existingIndex >= 0) current[existingIndex] = seeded;
  else current.push(seeded);

  sqlite.prepare('UPDATE catalog_head SET version = 81, impact_version = 79, snapshot_json = ? WHERE id = 1')
    .run(JSON.stringify(current));

  transaction(sqlite, buildMigration(rows));

  const head = sqlite.prepare('SELECT version, impact_version FROM catalog_head WHERE id = 1').get();
  assert.equal(head.version, 82);
  assert.equal(head.impact_version, 82);
  const next = snapshot(sqlite);
  const updated = next.find(entry => entry.identity.id === serverRow.identity.id);
  assert.equal(updated.edit.notes.en, 'manual-note-must-survive');
  assert.equal(updated.edit.acquisition.ru, 'ручная заметка о получении');
  assert.equal(updated.edit.names.en, serverRow.patch.edit.names.en);
  assert.equal(updated.edit.description.ru, serverRow.patch.edit.description.ru);

  const release = sqlite.prepare('SELECT impact_version, note FROM catalog_revisions WHERE version = 82').get();
  assert.equal(release.impact_version, 82);
  assert.equal(release.note, 'Pandora Saga OS live equipment/Soul sync');
});

test('revision 82 applies after revision 79 on a clean chain and refuses unexpected heads', () => {
  const sqlite = database();
  transaction(sqlite, buildPreviousMigration());
  transaction(sqlite, buildMigration());
  const head = sqlite.prepare('SELECT version, impact_version, json_array_length(snapshot_json) AS count FROM catalog_head WHERE id = 1').get();
  assert.equal(head.version, 82);
  assert.equal(head.impact_version, 82);
  assert.ok(head.count >= 344);
  assert.ok(head.count < 700, 'live sync must stay compact instead of materializing every baseline item');

  const unexpected = database();
  unexpected.prepare('UPDATE catalog_head SET version = 80, impact_version = 79 WHERE id = 1').run();
  assert.throws(() => transaction(unexpected, buildMigration()), /CHECK constraint failed/);
  assert.equal(unexpected.prepare('SELECT version FROM catalog_head WHERE id = 1').get().version, 80);
});