import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { draftFromSource, validateDraft, compileRecord, EFFECTS } from '../../admin-api/src/catalog-model.mjs';

const source = {
  id: 'equipment.0.1', legacy_id: 1, legacy_category_id: 0, legacy_item_index: 1,
  name: { en: 'Sword', jp: '原名', tw: '劍' }, option: { en: 'STR +1', jp: '', tw: '' },
  special_option: { en: 'Conditional source effect', jp: '', tw: '' }, acquisition: {},
  level_requirement: 1, soul_socket_count: 1, legacy_parameter_6: '',
  calculation_code: '18=W10_1=1_138=3', compatibility_flags: Array(36).fill(1), legacy_trailing_value: 0
};
const identity = { id: source.id, kind: 'equipment', category: 0, index: 1 };
const draft = () => draftFromSource(source, 'equipment');

test('name-only edits preserve canonical engine key, every effect and untouched source fields', () => {
  const original = JSON.stringify(source);
  const edit = draft();
  edit.names.en = 'Edited sword'; edit.names.jp = '別名'; edit.names.ru = 'Меч';
  const record = compileRecord(validateDraft(edit, identity), identity, source);
  assert.equal(record.calculationCode, source.calculation_code);
  assert.equal(record.engineKey, '原名');
  assert.equal(record.names.jp, '別名');
  assert.equal(record.names.en, 'Edited sword');
  assert.equal(JSON.stringify(source), original);
});

test('typed patch changes only selected stats and weapon attack, preserving other effects', () => {
  const edit = draft();
  edit.effectMode = 'patch'; edit.baseAttack = 25;
  edit.effects = [{ stat: 1, value: 4, unit: 'flat' }, { stat: 49, value: 8, unit: 'flat' }];
  const record = compileRecord(validateDraft(edit, identity), identity, source);
  assert.equal(record.calculationCode, '18=W25_138=3_1=4_49=8');
});

test('new equipment and Souls get isolated non-Legacy engine names and validated compatibility', () => {
  const id = { id: 'modern.equipment.abc', kind: 'equipment', category: 30, index: 20 };
  const edit = { ...draft(), id: id.id, category: 30, effectMode: 'replace', baseAttack: null, effects: [{ stat: 49, value: 15, unit: 'flat' }] };
  const record = compileRecord(validateDraft(edit, id), id, null);
  assert.equal(record.engineKey, 'Modern:modern.equipment.abc');
  assert.equal(record.engineId, 300020);
  assert.equal(record.calculationCode, '49=15');
  const soulId = { id: 'modern.soul.abc', kind: 'soul', category: null, index: 185 };
  const soul = draftFromSource(null, 'soul');
  Object.assign(soul, { id: soulId.id, names: { en: 'Wolf', ru: 'Волк', jp: '', tw: '' }, effects: [{ stat: 65, value: 1, unit: 'flat' }] });
  assert.equal(compileRecord(validateDraft(soul, soulId), soulId, null).calculationCode, '65=1');
});

test('unknown properties, raw code, unsupported units, duplicate stats, invalid flags and IDs fail closed', () => {
  const bad = [
    { ...draft(), calculationCode: 'eval(1)' },
    { ...draft(), category: 1 },
    { ...draft(), names: { ...draft().names, xx: 'unknown' } },
    { ...draft(), effects: [{ stat: 999, value: 1, unit: 'flat' }], effectMode: 'patch' },
    { ...draft(), effects: [{ stat: 1, value: 2, unit: 'percent' }], effectMode: 'patch' },
    { ...draft(), effects: [{ stat: 1, value: NaN, unit: 'flat' }], effectMode: 'patch' },
    { ...draft(), effects: [{ stat: 1, value: 2, unit: 'flat' }, { stat: 1, value: 3, unit: 'flat' }], effectMode: 'patch' },
    { ...draft(), races: [1] }, { ...draft(), classes: Array(28).fill('1') },
    { ...draft(), sockets: 4 }, { ...draft(), names: { ...draft().names, en: ' '.repeat(5) } }
  ];
  for (const input of bad) assert.throws(() => validateDraft(input, identity));
});

test('new weapons require explicit attack and descriptions are plain text, never effect expressions', () => {
  const id = { id: 'modern.equipment.a', kind: 'equipment', category: 0, index: 99 };
  const edit = { ...draft(), id: id.id, effectMode: 'replace', baseAttack: null };
  assert.throws(() => compileRecord(validateDraft(edit, id), id, null), /attack/i);
  edit.baseAttack = 0; edit.description.en = '<img src=x onerror=alert(1)> & text';
  assert.equal(compileRecord(validateDraft(edit, id), id, null).description.en, edit.description.en);
  assert.ok(EFFECTS.some(effect => effect.id === 49));
});

test('preserve mode cannot silently discard submitted numeric effects', () => {
  const edit = draft(); edit.effects = [{ stat: 1, value: 2, unit: 'flat' }];
  assert.throws(() => validateDraft(edit, identity), /preserve/i);
});

test('all 1304 existing source records round-trip without a single calculation-code change', () => {
  let count = 0;
  for (const [file, kind] of [['equipment', 'equipment'], ['souls', 'soul']]) {
    const records = JSON.parse(fs.readFileSync(new URL('../../data/generated/' + file + '.v1.json', import.meta.url))).records;
    for (const item of records) {
      const id = { id: item.id, kind, category: kind === 'equipment' ? item.legacy_category_id : null, index: kind === 'equipment' ? item.legacy_item_index : item.legacy_id };
      const normalized = validateDraft(draftFromSource(item, kind), id);
      assert.equal(compileRecord(normalized, id, item).calculationCode, item.calculation_code, item.id);
      count++;
    }
  }
  assert.equal(count, 1304);
});
