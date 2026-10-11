import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

const fixture=JSON.parse(readFileSync(
  new URL('../fixtures/pandora-os-weapon-ranges-20261011.json',import.meta.url),'utf8'));
const source=readFileSync(new URL('../../modern/calculator-controls.js',import.meta.url),'utf8');
const embedded=source.match(/var currentWeaponRanges = (\{[^\n]+\});/);
assert.ok(embedded,'Modern must include an exact pinned original source range map');
const runtime=JSON.parse(embedded[1]);

test('source-confirmed 164 weapon ranges are one-to-one, exact identity guarded and complete',()=>{
  assert.equal(fixture.items.length,164);
  assert.equal(Object.keys(runtime).length,164);
  assert.equal(fixture.sourceCatalogImpactRevision,87);
  const ids=new Set(),names=new Set(),official=new Set();
  for(const item of fixture.items){
    assert.equal(ids.has(item.id),false,item.id);ids.add(item.id);
    assert.equal(names.has(item.ru.trim().toLowerCase()),false,item.ru);names.add(item.ru.trim().toLowerCase());
    assert.equal(official.has(item.officialId),false,String(item.officialId));official.add(item.officialId);
    assert.match(item.id,/^equipment\.(?:[0-9]|1[0-3])\.[1-9]\d*$/);
    assert.ok(item.engineKey && item.ru && item.kind);
    assert.ok(Number.isSafeInteger(item.range) && item.range>0);
    const key=item.id.replace('equipment.','');
    assert.deepEqual(runtime[key],[item.range,item.engineKey,Number(['BOW','CROSSBOW'].includes(item.kind))]);
  }
  assert.equal(ids.size,164);
  assert.deepEqual(Object.keys(runtime).sort(),[...ids].map(x=>x.replace('equipment.','')).sort());
});

test('weapon-range reference never infers meters, makes up unarmed reach or applies unused bonuses',()=>{
  assert.deepEqual(runtime['0.10'],[115,'クリスタルソード',0]);
  assert.deepEqual(runtime['8.3'],[2800,'ボウ',1]);
  assert.equal(runtime['0.0'],undefined);
  assert.ok(!source.includes('currentWeaponRanges[category + \'.\' + index] ||'));
  assert.match(source,/row\[0\] !== record\[1\]/);
  assert.match(source,/code === 'RangeRange'/);
});
