import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { approvedRacialCorrections } from '../../admin-api/src/racial-corrections.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';
import { currentRacialDrafts } from '../../admin-api/src/current-racial-data.mjs';
import approved from '../../localization/approved-translations.v1.json' with { type: 'json' };
const descriptions = JSON.parse(fs.readFileSync(new URL('../fixtures/current-racial-descriptions.json', import.meta.url), 'utf8'));

test('owner-approved corrections remove only the two spurious critical bonuses through the existing native effect path', () => {
  const edits = approvedRacialCorrections();
  assert.deepEqual(edits.map(edit => edit.id), ['racial_skill.4.0', 'racial_skill.5.0']);
  for (const edit of edits) {
    const source = baselineById.get(edit.id), identity = sourceIdentity(source);
    assert.deepEqual(validateDraft(edit, identity).effects, [{ stat: 69, value: -2, unit: 'flat' }]);
    assert.equal(compileRecord(edit, identity, source).effectMode, 'add');
    assert.deepEqual(edit.names, { ...source.name, ru: approved.game.ru[edit.id] || '' });
  }
});

const expected = [
  ['Бойцовский дух', 'Fighting Spirit', [[18, 10, 'flat'], [18, 12, 'percent']]],
  ['Приспособляемость', 'Adaptability', [[146, 15, 'flat']]],
  ['Знахарство', 'Pharmaceutics', [[8, 15, 'flat']]],
  ['Гармония', "Nature's Harmony", [[76, -15, 'flat']]],
  ['Зоркость', 'Eagle Eye', []],
  ['Стойкость разума', 'Steadfastness', [[142, 20, 'flat']]],
  ['Упрямое сердце', 'Stronghearted', [[149, 10, 'flat'], [150, 10, 'flat'], [151, 10, 'flat']]],
  ['Дух цверга', 'Dwarf Spirit', [[18, 10, 'flat'], [18, 12, 'percent']]],
  ['Стальная воля', 'Steel will', [[70, -5, 'flat']]],
  ['Охотничье чутьё', 'Acute Senses', [[69, 5, 'flat']]],
  ['Подавление гнева', 'Calmness', [[62, 10, 'percent']]],
  ['Интуиция', 'Sharpness', [[65, 5, 'percent']]],
  ['Каменная кожа', 'Stone Skin', [[52, -10, 'percent']]],
  ['Сильные руки', 'Strong Arm', [[18, 12, 'percent']]],
  ['Дух энкиду', 'Enkidu Spirit', [[71, 10, 'flat']]],
  ['Антимагия', 'Magic Resistance', [[60, -10, 'flat']]],
  ['Всплеск магии', 'Inner Light', [[10, 18, 'flat']]],
  ['Дух кролля', 'Lapin Spirit', [[72, -10, 'flat']]]
];
for (const [position, [ru, en, effects]] of expected.entries()) {
  test(`current racial ${Math.floor(position / 3)}.${position % 3}: ${en}`, () => {
    const edit = currentRacialDrafts()[position], source = baselineById.get(edit.id), identity = sourceIdentity(source);
    assert.equal(edit.id, `racial_skill.${Math.floor(position / 3)}.${position % 3}`);
    assert.equal(edit.names.ru, ru); assert.equal(edit.names.en, en);
    assert.deepEqual([edit.description.ru, edit.description.en], descriptions[position]);
    const record = compileRecord(validateDraft(edit, identity), identity, source);
    assert.equal(record.effectMode, 'replace');
    assert.deepEqual(record.effects.map(effect => [effect.stat, effect.value, effect.unit]), effects);
    if ([4, 6].includes(position)) assert.ok(record.calculationNotes.ru && record.calculationNotes.en);
    else assert.equal(record.calculationNotes, undefined);
  });
}
test('current drafts do not share mutable effects, names or weapon conditions', () => {
  const first = currentRacialDrafts(), second = currentRacialDrafts();
  first[0].effects[0].value = 999; first[0].names.en = 'changed'; first[0].bonusRequirements.weaponCategories.push(-1);
  assert.equal(second[0].effects[0].value, 10); assert.equal(second[0].names.en, 'Fighting Spirit');
  assert.equal(second[0].bonusRequirements.weaponCategories.includes(-1), false);
  assert.deepEqual(second[7].bonusRequirements.weaponCategories, [2, 3, 10, 11]);
  assert.deepEqual(second[13].bonusRequirements.weaponCategories, [1, 3, 5, 7, 8, 9, 11, 13]);
});
test('both ATK units are accepted but duplicate identical units and forged conditions fail closed', () => {
  const edit = currentRacialDrafts()[0], identity = sourceIdentity(baselineById.get(edit.id));
  assert.equal(validateDraft(edit, identity).effects.length, 2);
  assert.throws(() => validateDraft({ ...edit, effects: [...edit.effects, edit.effects[0]] }, identity), /Duplicate/);
  for (const required of [null, { ...edit.bonusRequirements, weaponCategories: [0, 0] }, { ...edit.bonusRequirements, weaponCategories: [14] }, { ...edit.bonusRequirements, shieldRequired: 'false' }, { ...edit.bonusRequirements, eval: '1' }]) {
    assert.throws(() => validateDraft({ ...edit, bonusRequirements: required }, identity));
  }
  assert.throws(() => validateDraft({ ...edit, calculationNotes: { evil: 'unknown locale' } }, identity));
  const old = approvedRacialCorrections()[0], source = baselineById.get(old.id);
  const record = compileRecord(validateDraft(old, sourceIdentity(source)), sourceIdentity(source), source);
  assert.equal(Object.hasOwn(record, 'bonusRequirements'), false);
  assert.equal(Object.hasOwn(record, 'calculationNotes'), false);
});
