import test from 'node:test';
import assert from 'node:assert/strict';
import { approvedRacialCorrections } from '../../admin-api/src/racial-corrections.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';

test('owner-approved corrections remove only the two spurious critical bonuses through the existing native effect path', () => {
  const edits = approvedRacialCorrections();
  assert.deepEqual(edits.map(edit => edit.id), ['racial_skill.4.0', 'racial_skill.5.0']);
  for (const edit of edits) {
    const source = baselineById.get(edit.id), identity = sourceIdentity(source);
    assert.deepEqual(validateDraft(edit, identity).effects, [{ stat: 69, value: -2, unit: 'flat' }]);
    assert.equal(compileRecord(edit, identity, source).effectMode, 'add');
    assert.deepEqual(edit.names, { ...source.name, ru: '' });
  }
});
