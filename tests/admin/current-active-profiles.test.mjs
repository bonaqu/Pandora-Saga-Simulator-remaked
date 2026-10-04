import test from 'node:test';
import assert from 'node:assert/strict';
import { currentActiveProfileDrafts, currentActiveProfileReference as reference } from '../../admin-api/src/current-active-profiles.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';

test('17 reviewed active identities preserve every source variant, literal RU/EN and future gates without allocating skills or formulas', () => {
  const before = JSON.stringify([...baselineById.values()]);
  const drafts = currentActiveProfileDrafts();
  assert.equal(drafts.length, 17);
  assert.equal(new Set(drafts.map(row => row.id)).size, 17);
  assert.equal(reference.records.reduce((sum, row) => sum + row.rows.length, 0), 37);
  assert.deepEqual(reference.unresolved.map(row => row.id), ['skill_entry.16.0']);
  assert.equal(drafts.some(row => row.id === 'skill_entry.16.0'), false);
  for (const edit of drafts) {
    const source = baselineById.get(edit.id), identity = sourceIdentity(source);
    const compiled = compileRecord(validateDraft(edit, identity), identity, source);
    const reviewed = reference.records.find(row => row.id === edit.id);
    assert.equal(compiled.id, edit.id); assert.equal(compiled.kind, 'active');
    assert.equal(compiled.prerequisiteCode, source.prerequisite_code);
    assert.equal(Object.hasOwn(compiled, 'templateId'), false);
    assert.deepEqual(compiled.effects, []);
    assert.equal(compiled.nativeEffectPolicy, 'retained-plus-bonus');
    assert.equal(compiled.profiles.length, reviewed.rows.length - 1);
    for (const row of reviewed.rows) {
      const projected = row.sourceId === reviewed.baseSourceId ? compiled : compiled.profiles.find(profile => profile.id === 'source-' + row.sourceId);
      assert.ok(projected, 'Every reviewed source row must survive');
      assert.deepEqual(projected.learningRequirements, row.learningRequirements);
      assert.deepEqual(projected.timing, [...row.timing, source.duration_seconds]);
      for (const language of ['ru', 'en']) {
        assert.equal(projected.names[language], row.names[language]);
        assert.equal(projected.description[language], row.description[language]);
        assert.ok(projected.description[language].length > 20);
      }
      for (const language of ['jp', 'tw']) {
        assert.equal(projected.names[language], source.name[language]);
        assert.equal(projected.description[language], source.description[language]);
      }
    }
  }
  assert.equal(JSON.stringify([...baselineById.values()]), before);
  drafts[0].profiles[0].mpCost = 999;
  assert.equal(currentActiveProfileDrafts()[0].profiles[0].mpCost, 5);
});

test('reviewed class-specific timing stays separate from base timing and retains level 50 alongside the simulator maximum 55', () => {
  const edits = new Map(currentActiveProfileDrafts().map(edit => [edit.id, edit]));
  for (const [id, base, upgraded] of [
    ['skill_entry.13.5', [28, 1, 4], [28, 0, 4]],
    ['skill_entry.19.4', [14, 1, 7], [14, 1, 4]],
    ['skill_entry.19.8', [79, 5, 120], [79, 5, 20]],
    ['skill_entry.20.4', [32, 1, 10], [50, 1, 10]]
  ]) {
    const edit = edits.get(id), profile = edit.profiles[0];
    assert.deepEqual([edit.mpCost, edit.castSeconds, edit.cooldownSeconds], base);
    assert.deepEqual([profile.mpCost, profile.castSeconds, profile.cooldownSeconds], upgraded);
  }
  assert.equal(edits.get('skill_entry.13.5').profiles[0].learningRequirements.minimumLevel, 50);
  assert.deepEqual(edits.get('skill_entry.13.5').profiles[0].learningRequirements.classIds, ['job.16']);
  assert.deepEqual(edits.get('skill_entry.20.4').profiles[0].learningRequirements.classIds, ['job.27']);
  assert.equal(edits.get('skill_entry.20.4').profiles[0].learningRequirements.minimumLevel, 45);
  assert.deepEqual(edits.get('skill_entry.8.1').profiles[0].learningRequirements.branches,
    [{ branchId: 'skill_category.8', minimumPoints: 61 }]);
});
