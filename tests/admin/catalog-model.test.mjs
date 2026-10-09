import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { draftFromSource, validateDraft, compileRecord, showApprovedTranslations, EFFECTS } from '../../admin-api/src/catalog-model.mjs';

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

test('previously translated skill names and descriptions appear in admin without a D1 snapshot edit', () => {
  const skill = {
    id: 'skill_entry.7.5', kind: 'active',
    legacy_category_id: 7, legacy_entry_index: 5,
    name: {jp:'火の矢',en:'Flaming Arrow',tw:'火箭'},
    description: {jp:'',en:'Shoot fire bolts or fire arrows.',tw:''},
    mp_cost: 10, cast_seconds: 0, cooldown_seconds: 2, duration_seconds: 0
  };
  const display = draftFromSource(skill, 'active');
  assert.equal(display.names.ru, 'Пылающая стрела');
  assert.equal(display.description.ru, 'Выстрел горящей стрелой, наносящий двойной урон.');
  // An explicit manual editor value beats the migrated workbook baseline.
  const manual = { ...display, names:{...display.names,ru:'Моё название'},
    description:{...display.description,ru:''} };
  const resolved = showApprovedTranslations(manual,skill,'active');
  assert.equal(resolved.names.ru,'Моё название');
  assert.equal(resolved.description.ru,'Выстрел горящей стрелой, наносящий двойной урон.');
  assert.equal(manual.description.ru,'');
});


test('refinement bonus rules are additive, validated and do not alter base calculation code',()=>{
  const edit=draft();
  edit.upgradeBonuses=[{stat:11,value:1,unit:'flat',every:2,from:2,to:10}];
  const validated=validateDraft(edit,identity);
  const compiled=compileRecord(validated,identity,source);
  assert.equal(compiled.calculationCode,source.calculation_code);
  assert.deepEqual(compiled.upgradeBonuses,[{stat:11,value:1,unit:'flat',every:2,from:2,to:10}]);
  assert.equal(compiled.names.en,'Sword');
  assert.equal(Object.hasOwn(compileRecord(validateDraft(draft(),identity),identity,source),'upgradeBonuses'),false);
});

test('new equipment supports four language fields and enhancement bonuses; invalid/proc effects fail closed',()=>{
  const id={id:'modern.equipment.bonus',kind:'equipment',category:30,index:99};
  const item=draftFromSource(null,'equipment');
  item.id=id.id;item.category=30;item.names={en:'Blessed Gloves',ru:'Благословенные перчатки',jp:'祝福された手袋',tw:'祝福手套'};
  item.upgradeBonuses=[{stat:11,value:1,unit:'flat',from:2,every:2,to:10}];
  const compiled=compileRecord(validateDraft(item,id),id,null);
  assert.equal(compiled.engineId,300099);
  assert.equal(compiled.upgradeBonuses.length,1);
  assert.equal(compiled.names.jp,'祝福された手袋');
  const incorrect=[
    [{stat:11,value:1,unit:'flat',from:0,every:2,to:10}],
    [{stat:11,value:1,unit:'flat',from:2,every:0,to:10}],
    [{stat:11,value:1,unit:'flat',from:2,every:2,to:11}],
    [{stat:11,value:1,unit:'flat',from:2,every:2,to:10,proc:'freeze'}],
    [{stat:999,value:1,unit:'flat',from:2,every:2,to:10}],
    [{stat:11,value:0,unit:'flat',from:2,every:2,to:10}],
    [{stat:11,value:1,unit:'percent',from:2,every:2,to:10}],
    Array(13).fill({stat:11,value:1,unit:'flat',from:2,every:2,to:10})
  ];
  for(const upgradeBonuses of incorrect)assert.throws(()=>validateDraft({...item,upgradeBonuses},id));
  const soulId={id:'modern.soul.test',kind:'soul',category:null,index:185};
  const soul=draftFromSource(null,'soul');soul.id=soulId.id;soul.names.en='Soul';
  assert.throws(()=>validateDraft({...soul,upgradeBonuses:item.upgradeBonuses},soulId),/Soul refinement/i);
});
