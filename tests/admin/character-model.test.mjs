import test from 'node:test';
import assert from 'node:assert/strict';
import character from '../../data/generated/character.v1.json' with { type: 'json' };
import { draftFromSource, validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';
const source = character.records.find(record => record.id === 'job.0');
const identity = { id: source.id, kind: 'class', category: null, index: 0 };

test('class progression is typed engine data, with exact original coefficients and stable class identity', () => {
  const before = JSON.stringify(source); const edit = draftFromSource(source, 'class');
  const record = compileRecord(validateDraft(edit, identity), identity, source);
  assert.deepEqual(record.progression, source.progression); assert.equal(record.names.en, 'Warrior');
  edit.progression[0] += 100; edit.names.en = 'Edited Warrior'; edit.names.ru = 'Воин';
  const changed = compileRecord(validateDraft(edit, identity), identity, source);
  assert.equal(changed.progression[0], source.progression[0] + 100); assert.equal(changed.id, 'job.0');
  assert.equal(JSON.stringify(source), before);
});

test('class editor rejects invalid denominators, arbitrary mechanics, class retyping and unknown languages', () => {
  const original = draftFromSource(source, 'class');
  const invalid = [
    { ...original, formula: 'eval(1)' }, { ...original, progression: [98, 16, 0, 1, 1, 1] },
    { ...original, progression: [98, 16, -1, 1, 1, 1] }, { ...original, progression: [98, 16, NaN, 1, 1, 1] },
    { ...original, progression: [98, 16, 1, 1, 1] }, { ...original, category: 3 },
    { ...original, names: { ...original.names, unknown: 'X' } }, { ...original, id: 'job.28' }
  ];
  for (const edit of invalid) assert.throws(() => validateDraft(edit, identity));
});

test('all 28 classes round-trip exact Legacy progression without reducing original levels or classes', () => {
  const classes = character.records.filter(record => record.kind === 'class'); assert.equal(classes.length, 28);
  for (const source of classes) {
    const id = { id: source.id, kind: 'class', category: null, index: source.index };
    assert.deepEqual(compileRecord(validateDraft(draftFromSource(source, 'class'), id), id, source).progression, source.progression);
  }
});
