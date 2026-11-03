import test from 'node:test';
import assert from 'node:assert/strict';
import { formatItemDescription, formatItemDescriptionMap } from '../../admin-api/src/item-description-format.mjs';
import { baselineById } from '../../admin-api/src/catalog-baseline.mjs';
import { equipmentSourceRows } from '../../scripts/seed_equipment_sources_d1.mjs';
import verified from '../../data/verified-racial-gear.v1.json' with { type:'json' };
import current from '../../admin-api/data/pandora-os-live-items-20261007.json' with { type:'json' };
import english from '../../admin-api/data/pandora-os-live-strings-en-20261007.json' with { type:'json' };

const squeeze = value => String(value).replace(/\s+/g,'');
const exactRu = 'Изготовленная на заказ одежда для эльфиек.\n\nИНТ +1, ОЗ +22\nСнижение расхода ОМ +7%\nСопротивляемость чарам +5\nСопротивляемость болезням духа +5%';
const exactEn = 'Custom-made clothing for female Elves.\n\nINT +1, HP +22\nMP Cost Reduction +7%\nCharm Resistance +5\nMental Status Ailment Resistance +5%';

test('female Elf Dawn vest separates introduction, grouped stats and every additional effect in both languages', () => {
  const item=verified.entries.find(row=>row.gameId===12532);
  assert.equal(formatItemDescription(item.descriptionRu,'ru'),exactRu);
  assert.equal(formatItemDescription(item.descriptionEn,'en'),exactEn);
  const baseline=baselineById.get(item.recordId);
  assert.equal(baseline.option.ru,exactRu);
  assert.equal(baseline.option.en,exactEn);
  assert.equal(formatItemDescription(exactRu,'ru'),exactRu);
  assert.equal(formatItemDescription(exactEn,'en'),exactEn);
});

test('72 verified racial and Dawn pieces have semantically identical, cleanly separated RU/EN source D1 descriptions', () => {
  assert.equal(verified.entries.length,72);
  for(const item of verified.entries){
    const id=Number.isInteger(item.newIndex) ? item.recordId : 'equipment.'+item.category+'.'+item.templateIndex;
    const source=baselineById.get(id);
    assert.ok(source,'Missing baseline '+id);
    for(const [locale,key] of [['ru','descriptionRu'],['en','descriptionEn']]){
      const raw=item[key],formatted=source.option[locale];
      assert.equal(formatted,formatItemDescription(raw,locale),'Wrong '+locale+' description for '+item.gameId);
      assert.equal(formatItemDescription(formatted,locale),formatted,'Double paragraph for '+item.gameId);
      assert.equal(squeeze(formatted),squeeze(raw),'Changed effect/source characters '+item.gameId);
      assert.ok(formatted.includes('\n\n'),'Missing introductory paragraph for '+item.gameId);
      assert.ok(!/[0-9%](?:Снижение|Сопротивляемость|Получаемый|Шанс|Точность|Skill|Charm|Mental|Physical|Attack Range|MP Cost)/.test(formatted),
        'Merged stat line for '+item.gameId);
    }
    assert.ok(source.option.jp===undefined || typeof source.option.jp==='string');
  }
});

test('entire saved game RU/EN description corpus normalizes without losing stats and is idempotent', () => {
  for(const [locale,descriptions] of [['ru',Object.values(current).map(item=>item.desc)],
    ['en',Object.values(english.items).map(item=>item.d)]]){
    let normalized=0;
    for(const value of descriptions.filter(v=>typeof v==='string'&&v.trim())){
      const formatted=formatItemDescription(value,locale);
      assert.equal(formatItemDescription(formatted,locale),formatted);
      assert.equal(squeeze(formatted),squeeze(value),'Formatter may insert whitespace, never rewrite words or numbers');
      if(formatted!==value)normalized++;
    }
    assert.ok(normalized>500,'Expected corpus-wide coverage for '+locale);
  }
});

test('all equipment D1 source rows contain formatted RU/EN fields; historical JP/TW and numeric codes are unchanged', () => {
  const rows=equipmentSourceRows();
  assert.equal(rows.length,1130);
  for(const row of rows){
    const source=JSON.parse(row.json);
    const description=source.option||{};
    const normalized=formatItemDescriptionMap(description);
    assert.equal(normalized.ru,description.ru||'','D1 RU '+row.id);
    assert.equal(normalized.en,description.en||'','D1 EN '+row.id);
    assert.equal(row.id,source.id);
    assert.equal(source.id,baselineById.get(source.id).id);
  }
  const foreign={ru:'Атака +2Точность +4',en:'Attack +2Accuracy +4',jp:'日本語\\n原文',tw:'原文'};
  const result=formatItemDescriptionMap(foreign);
  assert.equal(result.jp,foreign.jp);
  assert.equal(result.tw,foreign.tw);
  assert.equal(squeeze(result.ru),squeeze(foreign.ru));
  assert.equal(squeeze(result.en),squeeze(foreign.en));
});
