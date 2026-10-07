import test from 'node:test';
import assert from 'node:assert/strict';
import { baselineById } from '../../admin-api/src/catalog-baseline.mjs';
import {
  buildIdentityRows,
  buildSoulModifierRows,
  buildMigration,
  loadInputs,
  stableCustomId
} from '../../scripts/materialize_pandora_os_identity_reconcile.mjs';

test('v3 mapping reconciles every Astir-related equippable record without duplicate project identities', () => {
  const inputs = loadInputs();
  const mapped = new Map(inputs.v3.equipment.map(row => [Number(row.serverId), row.projectId]));
  const projectIds = inputs.v3.equipment.map(row => row.projectId);
  assert.equal(new Set(projectIds).size, projectIds.length);

  const astir = Object.values(inputs.items).filter(item => {
    if (!item.slot || item.slot === 'arrow') return false;
    const english = inputs.english.items?.[String(item.id)] || {};
    return /astir|астир/i.test([item.name, item.desc, english.n, english.d].join(' '));
  });
  assert.equal(astir.length, 58);
  for (const item of astir) {
    assert.ok(mapped.has(Number(item.id)), 'Astir item is not mapped: ' + item.id);
    const source = baselineById.get(mapped.get(Number(item.id)));
    assert.ok(source?.id?.startsWith('equipment.'), 'Astir target must be retained equipment: ' + item.id);
  }
});

test('verified Astir reconciliation adds 54 identities on top of the prior mapping', () => {
  const rows = buildIdentityRows();
  assert.equal(rows.length, 54);
  assert.equal(new Set(rows.map(row => row.serverId)).size, 54);
  assert.equal(new Set(rows.map(row => row.projectId)).size, 54);
  assert.equal(new Set(rows.map(row => row.customId)).size, 54);

  const representative = new Map(rows.map(row => [row.serverId, row]));
  assert.equal(representative.get(12602)?.projectId, 'equipment.31.41');
  assert.equal(representative.get(12603)?.projectId, 'equipment.31.33');
  assert.equal(representative.get(12604)?.projectId, 'equipment.31.94');
  assert.equal(representative.get(12605)?.projectId, 'equipment.31.96');
  assert.equal(representative.get(14616)?.projectId, 'equipment.32.27');
  assert.equal(representative.get(15615)?.projectId, 'equipment.34.100');
  assert.equal(representative.get(11231)?.projectId, 'equipment.30.9');

  for (const row of rows) {
    assert.equal(row.customId, stableCustomId('equipment', row.serverId));
    assert.ok(row.fallback.edit.names.en.trim(), 'Missing EN name for ' + row.serverId);
    assert.ok(row.fallback.edit.names.ru.trim(), 'Missing RU name for ' + row.serverId);
    assert.ok(row.fallback.edit.description.en.trim(), 'Missing EN description for ' + row.serverId);
    assert.ok(row.fallback.edit.description.ru.trim(), 'Missing RU description for ' + row.serverId);
    assert.equal(row.fallback.edit.disabled, false);
  }
});

test('new Soul records have their auto-generated full-name modifier removed safely', () => {
  const rows = buildSoulModifierRows();
  assert.equal(rows.length, 14);
  assert.equal(new Set(rows.map(row => row.customId)).size, rows.length);
  for (const row of rows) {
    assert.match(row.customId, /^modern\.soul\.[0-9a-f-]{36}$/);
    assert.ok(row.oldEnglishModifier.trim());
    assert.ok(row.oldRussianModifier.trim());
  }
});

test('revision 85 preserves revision 84 history and prunes only unchanged automatic duplicates', () => {
  const sql = buildMigration();
  assert.match(sql, /version FROM catalog_head WHERE id = 1\) = 84/);
  assert.match(sql, /expected_custom_edit_json/);
  assert.match(sql, /COALESCE\(draft\.is_dirty, 0\) = 0/);
  assert.match(sql, /DELETE FROM catalog_allocations/);
  assert.match(sql, /json_set\(existing\.value, '\$\.edit\.modifiers'/);
  assert.match(sql, /SELECT 85, 85/);
  assert.match(sql, /SET version = 85,/);
  assert.match(sql, /impact_version = 85/);
  assert.doesNotMatch(sql, /DELETE FROM catalog_revisions/);
});
