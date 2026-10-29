import test from 'node:test';
import assert from 'node:assert/strict';
import { planCatalogMerge } from '../../scripts/lib/catalog-three-way-plan.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { draftFromSource } from '../../admin-api/src/catalog-model.mjs';

const source = baselineById.get('equipment.0.10');
const identity = sourceIdentity(source);
const original = draftFromSource(source, 'equipment');
const sourceHashes = { items: 'a'.repeat(64) };
function candidate(overrides = {}) {
  return { identity: structuredClone(identity), serverId: 23, identityVerified: true, dirtyDraft: false,
    current: structuredClone(original), base: { level: original.level, names: { en: original.names.en, ru: original.names.ru } },
    incoming: { level: original.level + 1, names: { en: original.names.en, ru: original.names.ru } }, ...overrides };
}
const plan = (...candidates) => planCatalogMerge({ revision: 92, sourceHashes, candidates }).records[0];

test('applies only confirmed source changes, preserves unrelated edits and is idempotent', () => {
  const item = candidate(); item.current.notes.ru = 'Ручное описание';
  const before = JSON.stringify(item), result = plan(item);
  assert.equal(result.status, 'change'); assert.equal(result.edit.level, original.level + 1);
  assert.equal(result.edit.notes.ru, 'Ручное описание'); assert.match(result.expectedCurrentHash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(item), before);
  assert.equal(plan(candidate({ current: result.edit, base: item.incoming, incoming: item.incoming })).status, 'unchanged');
});

test('manual conflicting values and unknown old provenance block the whole record', () => {
  const item = candidate(); item.current.names.ru = 'Личный перевод'; item.incoming.names.ru = 'Новый перевод';
  const result = plan(item);
  assert.equal(result.status, 'conflict'); assert.deepEqual(result.conflicts, [{ path: 'names.ru', reason: 'manual-change' }]);
  assert.equal(result.edit, undefined); assert.equal(result.proposedChanges[0].path, 'level');
  const missing = candidate({ base: {}, incoming: { level: 44 } });
  assert.deepEqual(plan(missing).conflicts, [{ path: 'level', reason: 'unknown-provenance' }]);
});

test('unchanged source never overwrites a manual edit; arrays are atomic', () => {
  const item = candidate(); item.current.level += 2; item.incoming.level = item.base.level;
  assert.equal(plan(item).status, 'unchanged');
  item.base = { races: [...original.races] }; item.incoming = { races: [0, 1, 1, 1, 1, 1] };
  item.current.races = [1, 0, 1, 1, 1, 1];
  assert.deepEqual(plan(item).conflicts, [{ path: 'races', reason: 'manual-change' }]);
});

test('dirty drafts, unproven IDs, duplicate mapping and unallocated records cannot become ready changes', () => {
  assert.equal(plan(candidate({ dirtyDraft: true })).status, 'dirty-draft');
  assert.equal(plan(candidate({ identityVerified: false })).status, 'identity-unverified');
  assert.equal(plan(candidate({ current: null })).status, 'needs-allocation');
  assert.throws(() => planCatalogMerge({ revision: 92, sourceHashes, candidates: [candidate(), candidate()] }), /Duplicate/);
  const duplicateIndex = candidate({ serverId: 24, identity: { ...identity, id: 'modern.equipment.11111111-1111-4111-8111-111111111111' }, current: null });
  assert.throws(() => planCatalogMerge({ revision: 92, sourceHashes, candidates: [candidate(), duplicateIndex] }), /Duplicate encoded/);
  assert.throws(() => plan(candidate({ identity: { ...identity, category: 1 } })), /identity must not change/);
});

test('validation rejects illegal or unsafe data and incomplete cross-field updates', () => {
  const item = candidate({ base: { effectMode: original.effectMode, effects: [] }, incoming: { effectMode: 'preserve', effects: [{ stat: 0, value: 1, unit: 'flat' }] } });
  const result = plan(item);
  assert.equal(result.status, 'invalid-merge'); assert.match(result.reason, /Preserve mode/);
  const attack = JSON.parse('{"__proto__":{"x":1}}');
  assert.throws(() => plan(candidate({ incoming: attack })), /Unsafe key/);
  assert.throws(() => planCatalogMerge({ revision: -1, sourceHashes, candidates: [] }), /revision/);
  assert.throws(() => plan(candidate({ current: { ...original, level: 999999 } })), /level/i);
  const unnormalized = candidate(); unnormalized.current.names.en += ' ';
  assert.equal(plan(unnormalized).status, 'current-normalization-review');
});
