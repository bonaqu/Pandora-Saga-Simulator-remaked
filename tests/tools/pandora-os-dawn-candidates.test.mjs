import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATES, examinePair } from '../../scripts/audit_pandora_os_dawn_candidates.mjs';

test('keeps thirty server IDs and the three real many-to-one review groups', () => {
  assert.equal(CANDIDATES.length, 30);
  assert.equal(new Set(CANDIDATES.map(([id]) => id)).size, 30);
  const groups = new Map();
  for (const [id, target] of CANDIDATES) groups.set(target, [...(groups.get(target) || []), id]);
  assert.equal(groups.size, 27);
  assert.deepEqual([...groups].filter(([, ids]) => ids.length > 1), [
    ['equipment.31.24', [12522, 12532]], ['equipment.32.14', [14502, 14512]], ['equipment.34.14', [15502, 15512]]
  ]);
});

test('records matching mapped values, unmatched retained effects and category mismatch without asserting identity', () => {
  const source = { id: 11502, slot: 'head', kind: 'HELMET', level: 20, soulslot: 0, name: 'Шапка',
    effects: [{ func: 'EP_STRENGTH_CONST', a: 1 }, { func: 'UNMAPPED', a: 20 }], AC: 2 };
  const legacy = { id: 'equipment.30.19', legacy_category_id: 30, name: { en: 'Dawn cap' },
    compatibility_flags: [1,0,1,0,0,0,0,0], level_requirement: 20, soul_socket_count: 0,
    calculation_code: '1=1_49=2_150=5' };
  const row = examinePair(11502, legacy.id, source, { n: 'Dawn Agal' }, legacy, null);
  assert.deepEqual(row.serverEffects.map(effect => effect.legacyValue), [1,2]);
  assert.deepEqual(row.retainedOnly, [{ key: '150:flat', value: 5 }]);
  assert.equal(row.conversionComplete, false);
  assert.deepEqual(row.legacyFlags, [1,0,1,0,0,0,0,0]);
  assert.throws(() => examinePair(11502, legacy.id, { ...source, kind: 'BOOTS', slot: 'feet' }, {}, legacy, null), /mismatch/);
});
