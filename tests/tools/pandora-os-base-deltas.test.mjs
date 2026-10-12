import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {
  retainedClassBaseHpMp,compareVitals,auditWeaponBaseReach,
  parseEmbeddedWeaponBaseRanges,buildSnapshotReport
} from '../../scripts/audit_pandora_os_base_deltas.mjs';
import {parseLegacyModifiers,CLASS_ORDER} from '../../scripts/audit_pandora_os_class_coefficients.mjs';

const classes=JSON.parse(readFileSync(
  new URL('../fixtures/pandora-os-classes-20261011.json',import.meta.url),'utf8'));
const weapon=JSON.parse(readFileSync(
  new URL('../fixtures/pandora-os-weapon-ranges-20261011.json',import.meta.url),'utf8'));
const ini=readFileSync(new URL('../../js/ini.js',import.meta.url),'utf8');
const legacy=parseLegacyModifiers(ini);
const code=readFileSync(new URL('../../modern/calculator-controls.js',import.meta.url),'utf8');

test('896 independent, repeatable source/retained unbuffed class delta checks',()=>{
  const first=compareVitals(classes,legacy),again=compareVitals(classes,legacy);
  assert.deepEqual(first,again);
  assert.equal(first.classes,28);
  assert.equal(first.scenarios,32);
  assert.equal(first.comparedVectors,28*8*4);
  assert.deepEqual(first.byClass.map(row=>row.name),CLASS_ORDER);
  assert.ok(first.hpDifferentVectors>0);
  assert.ok(first.mpDifferentVectors>0);
  const warrior=first.byClass[0];
  assert.deepEqual(warrior.example.source,{hp:915,mp:139});
  assert.deepEqual(warrior.example.retained,{hp:917,mp:130});
  assert.deepEqual(warrior.example.delta,{hp:-2,mp:9});
  const gladiator=first.byClass.find(row=>row.name==='GLADIATOR');
  assert.deepEqual(gladiator.example.source,{hp:1643,mp:163});
  assert.deepEqual(gladiator.example.delta,{hp:-1,mp:0});
  assert.equal(first.byClass.every(row=>row.vectors===32),true);
  assert.equal(first.topDifferences.length,16);
});

test('retained HP/MP uses archived nested-ceiling formula, never silently changes it',()=>{
  const input={level:45,vit:7,spi:4};
  const warrior=retainedClassBaseHpMp(legacy.get(0),input);
  assert.deepEqual(warrior,{hp:917,mp:130});
  assert.throws(()=>retainedClassBaseHpMp([100,30,0,5,5,10],input),/Invalid archived/);
  assert.throws(()=>retainedClassBaseHpMp(legacy.get(0),{level:0,vit:7,spi:4}),/Invalid hypothetical/);
  assert.throws(()=>retainedClassBaseHpMp(legacy.get(0),{level:45,vit:NaN,spi:4}),/Invalid hypothetical/);
  assert.throws(()=>compareVitals({WARRIOR:classes.WARRIOR},legacy),/mapping/);
  assert.throws(()=>compareVitals(classes,new Map()),/mapping/);
  assert.throws(()=>compareVitals(classes,legacy,[],[]),/scenarios/);
});

test('164 unique pinned base weapon ranges match runtime without asserting effective attack range',()=>{
  const embedded=parseEmbeddedWeaponBaseRanges(code),result=auditWeaponBaseReach(weapon,embedded);
  assert.equal(result.count,164);
  assert.equal(result.categoryCount,14);
  assert.equal(result.confirmedRanged,20);
  assert.equal(result.baseReachOnly,true);
  assert.equal(result.effectiveModifiersVerified,false);
  assert.equal(result.sourceCaptureDate,'2026-10-11');
  assert.deepEqual(embedded['0.10'],[115,'クリスタルソード',0]);
  const forged=structuredClone(weapon);
  forged.items[0].range++;
  assert.throws(()=>auditWeaponBaseReach(forged,embedded),/drift/);
  const duplicate=structuredClone(weapon);
  duplicate.items[1].officialId=duplicate.items[0].officialId;
  assert.throws(()=>auditWeaponBaseReach(duplicate,embedded),/Duplicate/);
  assert.throws(()=>parseEmbeddedWeaponBaseRanges('var other={};'),/not found/);
});

test('read-only CLI report uses dated fixtures, not production D1 or a live-game-parity claim',async()=>{
  const result=await buildSnapshotReport();
  assert.equal(result.readOnly,true);
  assert.equal(result.effectiveGameParityKnown,false);
  assert.equal(result.classReference.datedFixture,true);
  assert.match(result.warning,/no actual race stats/i);
  assert.equal(result.vitals.comparedVectors,896);
  assert.equal(result.weaponBaseReach.count,164);
  assert.deepEqual(result,await buildSnapshotReport());
  const source=readFileSync(new URL('../../scripts/audit_pandora_os_base_deltas.mjs',import.meta.url),'utf8');
  assert.ok(!source.includes("fetch(SOURCE_URL"));
  assert.ok(!source.includes("api('POST'"));
  assert.ok(!source.includes("wrangler d1"));
});
