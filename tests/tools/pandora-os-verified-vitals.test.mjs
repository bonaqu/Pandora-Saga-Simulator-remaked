import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { halfEven, projectAbilities, calculateReferenceVitals } from '../../scripts/pandora-os-verified-vitals.mjs';
import { CLASS_ORDER } from '../../scripts/audit_pandora_os_class_coefficients.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../fixtures/pandora-os-classes-20261011.json',import.meta.url),'utf8'));

test('source-verified Pandora Saga OS rounding is half-to-even, not Math.ceil or Math.round',()=>{
  assert.equal(halfEven(162.5),162);
  assert.equal(halfEven(163.5),164);
  assert.equal(halfEven(1643.49),1643);
  assert.equal(halfEven(162.97),163);
  assert.equal(halfEven(-1.5),-2);
  assert.equal(halfEven(-2.5),-2);
  assert.throws(()=>halfEven(NaN),/finite/);
});

test('real public OS calculator screenshot level 45 Gladiator baseline reproduces HP 1643 MP 163',()=>{
  const result=calculateReferenceVitals(catalog.GLADIATOR,
    {level:45,basicAbilities:[7,8,4,6,4,5]});
  assert.deepEqual([result.maxLife,result.maxMana],[1643,163]);
  assert.deepEqual(result.abilities,[7,8,4,6,4,5]);
});

test('all 28 pinned OS class coefficient entries project finite positive values for levels 1, 10 and 45',()=>{
  assert.equal(CLASS_ORDER.length,28);
  assert.deepEqual([...CLASS_ORDER].sort(),Object.keys(catalog).sort());
  for(const name of CLASS_ORDER)for(const level of [1,10,20,30,40,45]){
    const first=calculateReferenceVitals(catalog[name],
      {level,basicAbilities:[7,8,4,6,4,5]});
    assert(Number.isInteger(first.maxLife) && first.maxLife>0,name+' HP');
    assert(Number.isInteger(first.maxMana) && first.maxMana>0,name+' MP');
    const stronger=calculateReferenceVitals(catalog[name],
      {level,basicAbilities:[10,8,4,6,10,5]});
    assert(stronger.maxLife>=first.maxLife,name+' STA monotonicity');
    assert(stronger.maxMana>=first.maxMana,name+' SPI monotonicity');
  }
});

test('source order: percentage attribute bonus floors on base, additive after; flat HP/MP bonus after banker round',()=>{
  assert.deepEqual(projectAbilities([9,9,9,9,9,9],{
    abiConst:[1,0,0,0,0,0],abiScaleP:[20,20,0,0,0,0]
  }),[11,10,9,9,9,9]);
  const base=calculateReferenceVitals(catalog.WARRIOR,
    {level:45,basicAbilities:[7,8,4,6,4,5]});
  const modified=calculateReferenceVitals(catalog.WARRIOR,{
    level:45,basicAbilities:[7,8,4,6,4,5],
    modifiers:{abiConst:[2,0,0,0,3,0],maxLifeConst:14,maxManaConst:11}
  });
  assert.equal(modified.maxLife-base.maxLife,
    halfEven((7+2)*catalog.WARRIOR.hp.vit+45*catalog.WARRIOR.hp.lv+catalog.WARRIOR.hp.base)-
    base.maxLife+14);
  assert.equal(modified.maxMana-base.maxMana,
    halfEven((4+3)*catalog.WARRIOR.mp.spi+45*catalog.WARRIOR.mp.lv+catalog.WARRIOR.mp.base)-
    base.maxMana+11);
});

test('malformed inputs abort instead of silently creating NaN stats',()=>{
  assert.throws(()=>projectAbilities([1,2]),/six/);
  assert.throws(()=>projectAbilities([1,2,3,4,5,NaN]),/six/);
  assert.throws(()=>calculateReferenceVitals(catalog.WARRIOR,{level:0,basicAbilities:[7,8,4,6,4,5]}),/level/);
  assert.throws(()=>calculateReferenceVitals(null,{level:45,basicAbilities:[7,8,4,6,4,5]}),/coefficients/);
});
