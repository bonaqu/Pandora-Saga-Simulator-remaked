import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExistingRows,
  buildNewRows,
  buildMigration
} from '../../scripts/materialize_pandora_os_complete_sync.mjs';
import {
  loadInputs,
  serverCategory
} from '../../scripts/materialize_pandora_os_live_sync_hardening.mjs';

test('complete sync covers every equippable item and every Soul', () => {
  const inputs = loadInputs();
  const existing = buildExistingRows(inputs);
  const added = buildNewRows(inputs);
  assert.equal(existing.length, 368);
  assert.equal(added.length, 231);
  assert.equal(existing.length + added.length, 599);

  const coveredEquipment = new Set(
    existing.filter(row => row.identity.kind === 'equipment').map(row => row.serverId)
      .concat(added.filter(row => row.kind === 'equipment').map(row => row.serverId))
  );
  const expectedEquipment = Object.values(inputs.items)
    .filter(item => item.slot && item.slot !== 'arrow' && serverCategory(item) !== null)
    .map(item => Number(item.id));
  assert.equal(expectedEquipment.length, 488);
  assert.deepEqual([...coveredEquipment].sort((a, b) => a - b), expectedEquipment.sort((a, b) => a - b));

  const coveredSouls = new Set(
    existing.filter(row => row.identity.kind === 'soul').map(row => row.serverId)
      .concat(added.filter(row => row.kind === 'soul').map(row => row.serverId))
  );
  const expectedSouls = Object.values(inputs.souls).map(soul => Number(soul.id)).sort((a, b) => a - b);
  assert.equal(expectedSouls.length, 111);
  assert.deepEqual([...coveredSouls].sort((a, b) => a - b), expectedSouls);
});

test('Astir equipment is bilingual and missing variants become Modern records', () => {
  const inputs = loadInputs();
  const existing = buildExistingRows(inputs);
  const added = buildNewRows(inputs);
  const all = [
    ...existing.filter(row => row.identity.kind === 'equipment').map(row => ({ serverId: row.serverId, edit: row.fallback.edit, custom: false })),
    ...added.filter(row => row.kind === 'equipment').map(row => ({ serverId: row.serverId, edit: row.edit, custom: true }))
  ];
  const astirIds = Object.values(inputs.items)
    .filter(item => item.slot && item.slot !== 'arrow')
    .filter(item => {
      const english = inputs.english.items?.[String(item.id)] || {};
      return /astir|астир/i.test([item.name, item.desc, english.n, english.d].join(' '));
    })
    .map(item => Number(item.id));

  assert.equal(astirIds.length, 58);
  const astir = all.filter(row => astirIds.includes(row.serverId));
  assert.equal(astir.length, 58);
  assert.equal(astir.filter(row => row.custom).length, 54);
  for (const row of astir) {
    assert.ok(row.edit.names.en.trim(), 'Astir EN name missing for ' + row.serverId);
    assert.ok(row.edit.names.ru.trim(), 'Astir RU name missing for ' + row.serverId);
    assert.ok(row.edit.description.en.trim(), 'Astir EN description missing for ' + row.serverId);
    assert.ok(row.edit.description.ru.trim(), 'Astir RU description missing for ' + row.serverId);
  }

  const scarlet = astir.find(row => row.serverId === 12602);
  assert.equal(scarlet.edit.names.en, 'Astian Scarlet Coat');
  assert.equal(scarlet.edit.names.ru, 'Алая астирская куртка');
  assert.equal(scarlet.custom, true);
});

test('unavailable and decorative equippables are synchronized instead of filtered out', () => {
  const inputs = loadInputs();
  const existing = buildExistingRows(inputs);
  const added = buildNewRows(inputs);
  const allEquipment = [
    ...existing.filter(row => row.identity.kind === 'equipment').map(row => ({ serverId: row.serverId, edit: row.fallback.edit })),
    ...added.filter(row => row.kind === 'equipment').map(row => ({ serverId: row.serverId, edit: row.edit }))
  ];
  const unavailableIds = Object.values(inputs.items)
    .filter(item => item.slot && item.slot !== 'arrow' && serverCategory(item) !== null && item.unobtainable)
    .map(item => Number(item.id));
  const decoIds = Object.values(inputs.items)
    .filter(item => item.slot && item.slot !== 'arrow' && String(item.kind || '').startsWith('DECO_'))
    .map(item => Number(item.id));

  assert.equal(unavailableIds.length, 78);
  assert.equal(decoIds.length, 6);
  for (const id of [...unavailableIds, ...decoIds]) {
    const row = allEquipment.find(candidate => candidate.serverId === id);
    assert.ok(row, 'Missing future/decorative item ' + id);
    assert.equal(row.edit.disabled, false, 'Future item should remain selectable in Modern: ' + id);
  }
});

test('new records use explicit replacement mechanics and runtime-safe allocation SQL', () => {
  const added = buildNewRows();
  assert.equal(new Set(added.map(row => row.id)).size, added.length);
  for (const row of added) {
    assert.match(row.id, new RegExp('^modern\\.' + row.kind + '\\.[0-9a-f-]{36}$'));
    assert.equal(row.edit.effectMode, 'replace');
    assert.equal(row.edit.disabled, false);
    assert.ok(row.edit.names.en.trim());
    assert.ok(row.edit.names.ru.trim());
  }

  const sql = buildMigration();
  assert.match(sql, /version FROM catalog_head WHERE id = 1\) = 83/);
  assert.match(sql, /INSERT INTO catalog_allocations/);
  assert.match(sql, /INSERT INTO catalog_sequences/);
  assert.match(sql, /INSERT INTO catalog_revisions \(version, impact_version/);
  assert.match(sql, /SELECT 84, 84/);
  assert.match(sql, /SET version = 84,/);
  assert.doesNotMatch(sql, /unobtainable.*continue/i);
});
