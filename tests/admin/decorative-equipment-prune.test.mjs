import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDecorativeRows,
  buildMigration
} from '../../scripts/materialize_decorative_equipment_prune.mjs';

const expected = [
  [15911092, 'modern.equipment.fb8f9028-d194-43c2-a143-89048e89fd0f'],
  [15912124, 'modern.equipment.3db45d2c-5301-46f4-a9de-7438e57018f8'],
  [15913094, 'modern.equipment.1fe290c8-9bbb-40fe-aa40-055cef1e7ab0'],
  [15914007, 'modern.equipment.a7145ba2-78ab-47c8-a863-5a024873522c'],
  [15915014, 'modern.equipment.9c66a663-f7e8-4677-a7fb-02b57fd1736f'],
  [15918005, 'modern.equipment.218e08bb-1154-4c9a-a6f6-365805690ccc']
];

test('current decorative overlays resolve to exactly six stable Modern identities', () => {
  const rows = buildDecorativeRows();
  assert.deepEqual(rows.map(row => [row.serverId, row.identityId]), expected);
  assert.ok(rows.every(row => row.kind.startsWith('DECO_')));
  assert.equal(new Set(rows.map(row => row.identityId)).size, expected.length);
});

test('decorative prune migration removes targets atomically and advances the impact revision', () => {
  const sql = buildMigration();
  for (const [, identityId] of expected) assert.match(sql, new RegExp(identityId.replaceAll('.', '\\.')));
  assert.match(sql, /SELECT version \+ 1 FROM catalog_head WHERE id = 1/);
  assert.match(sql, /DELETE FROM catalog_drafts/);
  assert.match(sql, /DELETE FROM catalog_allocations/);
  assert.match(sql, /impact_version = \(SELECT version FROM _decorative_prune_next\)/);
  assert.match(sql, /NOT EXISTS \([\s\S]*_decorative_prune_targets/);
  assert.doesNotMatch(sql, /SET version = 86/);
});
