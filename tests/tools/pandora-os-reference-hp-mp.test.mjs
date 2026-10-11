import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {
 roundHalfToEven,currentClassBaseHpMp,generateReferenceVectors
} from '../../scripts/audit_pandora_os_reference_hp_mp.mjs';
import {parseLegacyModifiers} from '../../scripts/audit_pandora_os_class_coefficients.mjs';

const classes=JSON.parse(readFileSync(
 new URL('../fixtures/pandora-os-classes-20261011.json',import.meta.url),'utf8'));

test('live 2026 reference uses banker rounding instead of Legacy nested ceiling',()=>{
 assert.equal(roundHalfToEven(2.5),2);
 assert.equal(roundHalfToEven(3.5),4);
 assert.equal(roundHalfToEven(6.5),6);
 assert.equal(roundHalfToEven(6.50001),7);
 assert.equal(roundHalfToEven(-0.5),0);
 assert.throws(()=>roundHalfToEven(Infinity),/not finite/);
 assert.throws(()=>roundHalfToEven(NaN),/not finite/);
});

test('GLADIATOR LV45 vit7 spi4 reproduces published server calculator HP/MP',()=>{
 const vector=currentClassBaseHpMp(classes.GLADIATOR,{level:45,vit:7,spi:4});
 assert.deepEqual(vector,{hp:1643,mp:163});
 const warrior=currentClassBaseHpMp(classes.WARRIOR,{level:45,vit:7,spi:4});
 assert.deepEqual(warrior,{hp:915,mp:139});
});

test('all 28 current reference classes produce a finite and deterministic 672-vector matrix',()=>{
 const vectors=generateReferenceVectors(classes);
 assert.equal(vectors.length,28*6*4);
 assert.equal(new Set(vectors.map(v=>v.cls)).size,28);
 for(const item of vectors){
   assert.ok(Number.isInteger(item.hp) && Number.isInteger(item.mp));
   assert.ok(item.hp>=0 && item.mp>=0);
   assert.deepEqual(currentClassBaseHpMp(classes[item.cls],item),{hp:item.hp,mp:item.mp});
 }
 assert.deepEqual(vectors,generateReferenceVectors(classes));
});

test('source coefficients and inputs must be complete and trustworthy before applying reference',()=>{
 assert.throws(()=>currentClassBaseHpMp(null,{level:45,vit:7,spi:4}),/Missing/);
 assert.throws(()=>currentClassBaseHpMp(classes.WARRIOR,{level:0,vit:7,spi:4}),/level/);
 assert.throws(()=>currentClassBaseHpMp(classes.WARRIOR,{level:40,vit:-1,spi:4}),/vit/);
 assert.throws(()=>currentClassBaseHpMp(classes.WARRIOR,{level:40,vit:7,spi:1.2}),/spi/);
 assert.throws(()=>generateReferenceVectors({WARRIOR:classes.WARRIOR}),/Unexpected/);
 const broken={...classes.WARRIOR,mp:{...classes.WARRIOR.mp,spi:NaN}};
 assert.throws(()=>currentClassBaseHpMp(broken,{level:45,vit:7,spi:4}),/not finite/);
});

test('reference is observably different from frozen Legacy and must not auto-replace it',()=>{
 const source=readFileSync(new URL('../../js/ini.js',import.meta.url),'utf8');
 const mods=parseLegacyModifiers(source);
 assert.equal(mods.size,28);
 const legacy=mods.get(0),level=45,vit=7,spi=4;
 const oldHp=legacy[0]+Math.ceil(level*100/legacy[2])+
   Math.ceil(vit*Math.ceil(100/legacy[4]));
 const oldMp=legacy[1]+Math.ceil(level*100/legacy[3])+
   Math.ceil(spi*Math.ceil(100/legacy[5]));
 const current=currentClassBaseHpMp(classes.WARRIOR,{level,vit,spi});
 assert.notEqual(oldHp,current.hp);
 assert.notEqual(oldMp,current.mp);
});
