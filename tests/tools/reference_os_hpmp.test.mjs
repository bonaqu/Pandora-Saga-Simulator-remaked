import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {roundHalfToEven,currentOsBase,historicalBase,referenceMatrix} from '../../scripts/reference_os_hpmp.mjs';
const classes=JSON.parse(fs.readFileSync(new URL('../fixtures/pandora-os-classes-20261011.json',import.meta.url),'utf8'));
const original=fs.readFileSync(new URL('../../js/ini.js',import.meta.url),'utf8');

test('OS uses nearest even at exact .5, rather than ceil or floor',()=>{
  assert.equal(roundHalfToEven(2.5),2);
  assert.equal(roundHalfToEven(3.5),4);
  assert.equal(roundHalfToEven(0.5),0);
  assert.equal(roundHalfToEven(6.49),6);
  assert.equal(roundHalfToEven(6.51),7);
  assert.throws(()=>roundHalfToEven(NaN),/Invalid reference/);
  assert.throws(()=>roundHalfToEven(-1),/Invalid reference/);
});

test('public calculator dated Gladiator Lv45 default VIT/SPI reproduces 1643 HP and 163 MP',()=>{
  assert.deepEqual(currentOsBase(classes.GLADIATOR,45,7,4),{hp:1643,mp:163});
  assert.deepEqual(currentOsBase(classes.WARRIOR,45,7,4),{hp:915,mp:139});
});

test('all 28 identities and multiple level/ability vectors are finite and deterministic',()=>{
  for(const level of [1,10,20,30,40,45])
    for(const [vit,spi] of [[1,1],[7,4],[30,20],[80,80],[120,120]]){
      const rows=referenceMatrix(classes,original,level,vit,spi);
      assert.equal(rows.length,28);
      assert.equal(new Set(rows.map(r=>r.className)).size,28);
      assert.ok(rows.every(row=>Number.isInteger(row.currentReference.hp)&&
        Number.isInteger(row.currentReference.mp)&&row.currentReference.hp>0&&row.currentReference.mp>0));
      assert.deepEqual(referenceMatrix(classes,original,level,vit,spi),rows);
    }
});

test('legacy and current formulas differ even with same class and inputs; no implicit change to Legacy',()=>{
  const legacy=historicalBase([98,16,5.847,44.55,15.5,48.3],45,7,4);
  const modern=currentOsBase(classes.WARRIOR,45,7,4);
  assert.notDeepEqual(legacy,modern);
});

test('reject unsupported levels and missing classes without guessing',()=>{
  assert.throws(()=>currentOsBase(classes.WARRIOR,46,7,4),/Invalid character/);
  assert.throws(()=>currentOsBase(classes.WARRIOR,45,0,4),/Invalid character/);
  assert.throws(()=>referenceMatrix({...classes,UNEXPECTED:{}},original),/Class identity drift/);
  assert.throws(()=>currentOsBase({hp:{base:100,lv:10,vit:10},mp:{}},45,7,4),/Malformed reference/);
});
