import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { buildMigration as buildWorkbookMigration } from '../../scripts/materialize_pandora_os_sync.mjs';
import { buildMigration as buildLiveMigration } from '../../scripts/materialize_pandora_os_live_sync.mjs';
import { buildMigration as buildHardeningMigration } from '../../scripts/materialize_pandora_os_live_sync_hardening.mjs';
import { buildMigration as buildCompleteMigration, buildNewRows } from '../../scripts/materialize_pandora_os_complete_sync.mjs';
import {
  buildMigration,
  buildSoulModifierRows
} from '../../scripts/materialize_pandora_os_complete_sync_polish.mjs';

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
function entry(entries, id) {
  return entries.find(item => item.identity.id === id);
}

test('new Souls do not invent equipment-name modifiers', () => {
  const souls = buildNewRows().filter(row => row.kind === 'soul');
  assert.equal(souls.length, 14);
  for (const row of souls) {
    assert.deepEqual(row.edit.modifiers, { en: '', ru: '', jp: '', tw: '' });
    assert.ok(row.edit.names.en.trim());
    assert.ok(row.edit.names.ru.trim());
  }
});

test('revision 85 removes only the old inferred Soul modifiers and preserves manual edits', () => {
  const rows = buildSoulModifierRows();
  assert.equal(rows.length, 14);
  assert.equal(new Set(rows.map(row => row.identityId)).size, rows.length);

  const sqlite = database();
  transaction(sqlite, buildWorkbookMigration());
  transaction(sqlite, buildLiveMigration());
  transaction(sqlite, buildHardeningMigration());
  transaction(sqlite, buildCompleteMigration());

  let head = sqlite.prepare('SELECT version, impact_version FROM catalog_head WHERE id = 1').get();
  assert.equal(head.version, 84);
  assert.equal(head.impact_version, 84);

  const current = snapshot(sqlite);
  const cleanTarget = rows[0];
  const manualTarget = rows[1];
  const cleanEntry = entry(current, cleanTarget.identityId);
  const manualEntry = entry(current, manualTarget.identityId);
  assert.ok(cleanEntry);
  assert.ok(manualEntry);

  // Recreate the exact revision-84 display-only inference that was deployed
  // before the generator was corrected.
  cleanEntry.edit.modifiers = { en: cleanTarget.expectedEn, ru: cleanTarget.expectedRu, jp: '', tw: '' };
  manualEntry.edit.modifiers = { en: 'Manual prefix', ru: 'Ручная приставка', jp: '', tw: '' };
  sqlite.prepare('UPDATE catalog_head SET snapshot_json = ? WHERE id = 1').run(JSON.stringify(current));

  transaction(sqlite, buildMigration(rows));
  head = sqlite.prepare('SELECT version, impact_version FROM catalog_head WHERE id = 1').get();
  assert.equal(head.version, 85);
  assert.equal(head.impact_version, 84);

  const next = snapshot(sqlite);
  assert.deepEqual(entry(next, cleanTarget.identityId).edit.modifiers, { en: '', ru: '', jp: '', tw: '' });
  assert.deepEqual(entry(next, manualTarget.identityId).edit.modifiers, { en: 'Manual prefix', ru: 'Ручная приставка', jp: '', tw: '' });

  const revision = sqlite.prepare('SELECT impact_version, note FROM catalog_revisions WHERE version = 85').get();
  assert.equal(revision.impact_version, 84);
  assert.equal(revision.note, 'Remove inferred modifiers from newly added Souls');
});

test('revision 85 refuses an unexpected catalog head', () => {
  const sqlite = database();
  transaction(sqlite, buildWorkbookMigration());
  assert.equal(sqlite.prepare('SELECT version FROM catalog_head WHERE id = 1').get().version, 79);
  assert.throws(() => transaction(sqlite, buildMigration()), /CHECK constraint failed/);
  assert.equal(sqlite.prepare('SELECT version FROM catalog_head WHERE id = 1').get().version, 79);
});
