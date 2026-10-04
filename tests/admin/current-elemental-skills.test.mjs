import test from 'node:test';
import assert from 'node:assert/strict';
import { currentElementalSkillDrafts, currentElementalSkillIdentities } from '../../admin-api/src/current-elemental-skills.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';

test('two reviewed current elemental identities update names/descriptions and real thresholds without adding duplicates or combat formulas', () => {
  const before = JSON.stringify([...baselineById.values()]);
  const drafts = currentElementalSkillDrafts();
  assert.deepEqual(currentElementalSkillIdentities, [
    { id: 'skill_entry.18.9', sourceId: 410015001, points: 35 },
    { id: 'skill_entry.18.10', sourceId: 410025001, points: 41 }
  ]);
  assert.deepEqual(drafts.map(row => [row.names.ru, row.names.en]), [
    ['Сопротивляемость льду', 'Resist Ice'], ['Сопротивляемость молниям', 'Resist Lightning']
  ]);
  for (const [index, edit] of drafts.entries()) {
    const source = baselineById.get(edit.id), identity = sourceIdentity(source);
    const compiled = compileRecord(validateDraft(edit, identity), identity, source);
    assert.equal(compiled.id, edit.id); assert.equal(compiled.kind, 'active');
    assert.equal(compiled.prerequisiteCode, 'S=18=33');
    assert.equal(Object.hasOwn(compiled, 'templateId'), false);
    assert.equal(compiled.nativeEffectPolicy, 'retained-plus-bonus');
    assert.deepEqual(compiled.learningRequirements, { classIds: [], classScope: 'exact', minimumLevel: 1,
      branches: [{ branchId: 'skill_category.18', minimumPoints: [35, 41][index] }] });
    assert.deepEqual(compiled.timing, [32, 1.5, 3.5, source.duration_seconds]);
    assert.deepEqual(compiled.effects, []);
    for (const language of ['en', 'ru']) assert.ok(compiled.description[language].length > 30);
    for (const language of ['jp', 'tw']) {
      assert.equal(compiled.names[language], source.name[language]);
      assert.equal(compiled.description[language], source.description[language]);
    }
  }
  assert.equal(JSON.stringify([...baselineById.values()]), before);
  drafts[0].learningRequirements.branches[0].minimumPoints = 1;
  assert.equal(currentElementalSkillDrafts()[0].learningRequirements.branches[0].minimumPoints, 35);
});
