import test from 'node:test';
import assert from 'node:assert/strict';
import skills from '../../data/generated/skills.v1.json' with { type: 'json' };
import { draftFromSource, validateDraft, compileRecord, NATIVE_PASSIVES } from '../../admin-api/src/catalog-model.mjs';
const projected = source => ({ ...source, id: source.id.replace('skill.', 'skill_entry.'), kind: source.is_active ? 'active' : 'passive' });
const identity = source => ({ id: source.id, kind: source.kind, category: source.legacy_category_id, index: source.legacy_entry_index });
const customLearning = () => ({ classIds: ['job.4'], classScope: 'descendants', minimumLevel: 35,
  branches: [{ branchId: 'skill_category.18', minimumPoints: 35 }] });

test('all fourteen identified native passives support explicit replacement while old source payloads remain unchanged', () => {
  assert.equal(Object.keys(NATIVE_PASSIVES).length, 14);
  for (const id of Object.keys(NATIVE_PASSIVES)) {
    const source = projected(skills.records.find(row => row.id.replace('skill.', 'skill_entry.') === id)), who = identity(source);
    const edit = draftFromSource(source, 'passive');
    const old = compileRecord(validateDraft(edit, who), who, source);
    assert.equal(Object.hasOwn(old, 'intrinsicEffectMode'), false); assert.equal(old.nativeEffectPolicy, 'retained-plus-bonus');
    edit.intrinsicEffectMode = 'replace'; const replacement = compileRecord(validateDraft(edit, who), who, source);
    assert.equal(replacement.nativeEffectPolicy, 'typed-replacement'); assert.deepEqual(replacement.effects, []);
    assert.deepEqual(replacement.timing, old.timing); assert.equal(replacement.prerequisiteCode, old.prerequisiteCode);
    edit.intrinsicEffectMode = 'add'; assert.equal(compileRecord(validateDraft(edit, who), who, source).nativeEffectPolicy, 'retained-plus-bonus');
  }
});

test('intrinsic replacement rejects active skills, variants, unmapped source passives and malformed modes', () => {
  for (const [native, mode] of [['skill.6.0', null], ['skill.6.0', 'eval(1)'], ['skill.0.0', 'replace'], ['skill.1.6', 'replace']]) {
    const source = projected(skills.records.find(row => row.id === native)), who = identity(source), edit = draftFromSource(source, source.kind);
    edit.intrinsicEffectMode = mode; assert.throws(() => validateDraft(edit, who));
  }
  const source = projected(skills.records.find(row => row.id === 'skill.6.0'));
  const who = { ...identity(source), id: 'modern.passive.00000000-0000-4000-8000-000000000001', templateId: source.id };
  assert.throws(() => validateDraft({ ...draftFromSource(source, 'passive'), id: who.id, templateId: source.id, intrinsicEffectMode: 'replace' }, who));
});

test('custom learning is optional and round-trips without changing retained prerequisite codes or kind', () => {
  for (const original of [skills.records[0], skills.records.find(row => row.id === 'skill.0.1')]) {
    const source = projected(original), id = identity(source), edit = draftFromSource(source, source.kind);
    assert.equal(Object.hasOwn(compileRecord(validateDraft(edit, id), id, source), 'learningRequirements'), false);
    edit.learningRequirements = customLearning();
    const validated = validateDraft(edit, id), record = compileRecord(validated, id, source);
    assert.deepEqual(record.learningRequirements, edit.learningRequirements);
    assert.equal(record.prerequisiteCode, original.prerequisite_code);
    assert.equal(record.active, original.is_active);
    edit.learningRequirements.branches[0].minimumPoints = 41;
    assert.equal(record.learningRequirements.branches[0].minimumPoints, 35);
    delete edit.learningRequirements;
    assert.equal(Object.hasOwn(validateDraft(edit, id), 'learningRequirements'), false);
  }
});

test('custom learning accepts canonical bounded class/branch gates for variants as well as source identities', () => {
  const source = projected(skills.records[0]);
  const id = { ...identity(source), id: 'modern.active.00000000-0000-4000-8000-000000000001', templateId: source.id };
  const edit = { ...draftFromSource(source, 'active'), id: id.id, templateId: source.id,
    learningRequirements: { classIds: [], classScope: 'exact', minimumLevel: 55,
      branches: [{ branchId: 'skill_category.0', minimumPoints: 200 }, { branchId: 'skill_category.24', minimumPoints: 1 }] } };
  assert.deepEqual(compileRecord(validateDraft(edit, id), id, source).learningRequirements, edit.learningRequirements);
  assert.equal(compileRecord(validateDraft(edit, id), id, source).nativeEffectPolicy, 'template-gate-only');
});

test('custom learning rejects raw code, missing fields, unknown identities, duplicate gates and out-of-range values', () => {
  const source = projected(skills.records[0]), id = identity(source), edit = draftFromSource(source, 'active');
  const invalid = [null, {}, 'J=4=35', { ...customLearning(), formula: 'eval(1)' },
    { ...customLearning(), classIds: ['job.28'] }, { ...customLearning(), classIds: ['job.04'] },
    { ...customLearning(), classIds: ['job.4', 'job.4'] }, { ...customLearning(), classScope: 'everyone' },
    { ...customLearning(), minimumLevel: 0 }, { ...customLearning(), minimumLevel: 56 },
    { ...customLearning(), minimumLevel: 35.5 }, { ...customLearning(), minimumLevel: '35' },
    { ...customLearning(), branches: [{ branchId: 'skill_category.25', minimumPoints: 1 }] },
    { ...customLearning(), branches: [{ branchId: 'skill_category.18', minimumPoints: 201 }] },
    { ...customLearning(), branches: [{ branchId: 'skill_category.18', minimumPoints: 0 }] },
    { ...customLearning(), branches: [{ branchId: 'skill_category.18', minimumPoints: 1, code: 'S=18=1' }] },
    { ...customLearning(), branches: [customLearning().branches[0], customLearning().branches[0]] }];
  for (const learningRequirements of invalid) assert.throws(() => validateDraft({ ...edit, learningRequirements }, id));
});

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
