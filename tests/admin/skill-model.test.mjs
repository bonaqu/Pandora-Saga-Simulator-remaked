import test from 'node:test';
import assert from 'node:assert/strict';
import skills from '../../data/generated/skills.v1.json' with { type: 'json' };
import { draftFromSource, validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';
const projected = source => ({ ...source, id: source.id.replace('skill.', 'skill_entry.'), kind: source.is_active ? 'active' : 'passive' });
const identity = source => ({ id: source.id, kind: source.kind, category: source.legacy_category_id, index: source.legacy_entry_index });

test('all 211 skills preserve canonical prerequisites, active/passive type and original timing data', () => {
  let active = 0, passive = 0;
  for (const original of skills.records) {
    const source = projected(original), id = identity(source); const edit = draftFromSource(source, source.kind);
    const record = compileRecord(validateDraft(edit, id), id, source);
    assert.equal(record.prerequisiteCode, original.prerequisite_code); assert.equal(record.active, original.is_active);
    assert.deepEqual(record.timing, [original.mp_cost, original.cast_seconds, original.cooldown_seconds, original.duration_seconds]);
    assert.deepEqual(record.effects, []);
    if (record.active) active++; else passive++;
  }
  assert.equal(active, 178); assert.equal(passive, 33);
});

test('active editor validates bounded numeric timing, without accepting raw prerequisites or pretending damage formulas exist', () => {
  const source = projected(skills.records[0]), id = identity(source); const edit = draftFromSource(source, 'active');
  edit.mpCost = 20; edit.castSeconds = 1.25;
  assert.deepEqual(compileRecord(validateDraft(edit, id), id, source).timing, [20, 1.25, 15, 1]);
  for (const invalid of [{ ...edit, mpCost: -1 }, { ...edit, castSeconds: Infinity }, { ...edit, prerequisiteCode: 'J=28=1' }, { ...edit, damage: 'eval(1)' }, { ...edit, kind: 'passive' }, { ...edit, effects: [{ stat: 1, value: 5, unit: 'flat' }] }]) assert.throws(() => validateDraft(invalid, id));
});

test('passive bonuses are additional typed effects with explicit equipment/riding requirements; native mechanics stay separate', () => {
  const source = projected(skills.records.find(record => record.id === 'skill.1.6')), id = identity(source);
  const edit = draftFromSource(source, 'passive');
  assert.deepEqual(edit.bonusRequirements, { weaponCategories: [0, 1, 6], shieldRequired: false, ridingRequired: false });
  edit.effects = [{ stat: 1, value: 5, unit: 'flat' }]; const changed = compileRecord(validateDraft(edit, id), id, source);
  assert.deepEqual(changed.effects, edit.effects); assert.equal(changed.nativeEffectPolicy, 'retained-plus-bonus');
  for (const invalid of [{ ...edit, effectMode: 'replace' }, { ...edit, bonusRequirements: { ...edit.bonusRequirements, weaponCategories: [14] } }, { ...edit, bonusRequirements: { ...edit.bonusRequirements, weaponCategories: [0, 0] } }, { ...edit, bonusRequirements: { ...edit.bonusRequirements, shieldRequired: 1 } }]) assert.throws(() => validateDraft(invalid, id));
});

test('decimal editor values validate their declared precision, not unreliable binary multiplication', () => {
  const passive = projected(skills.records.find(record => record.id === 'skill.0.1'));
  const edit = draftFromSource(passive, 'passive'); edit.effects = [{ stat: 1, value: 0.29, unit: 'flat' }];
  assert.equal(compileRecord(validateDraft(edit, identity(passive)), identity(passive), passive).effects[0].value, 0.29);
  for (const value of [0.2901, 0.29000000000000004, Infinity, NaN]) assert.throws(() => validateDraft({ ...edit, effects: [{ stat: 1, value, unit: 'flat' }] }, identity(passive)));
  const active = projected(skills.records[0]), timing = draftFromSource(active, 'active'); timing.castSeconds = 1.005;
  assert.equal(validateDraft(timing, identity(active)).castSeconds, 1.005);
  assert.throws(() => validateDraft({ ...timing, castSeconds: 1.0051 }, identity(active)));
});
