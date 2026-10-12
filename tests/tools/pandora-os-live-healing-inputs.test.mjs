import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareHealingSources,readLiveOrLocal} from '../../scripts/audit_pandora_os_live_healing_inputs.mjs';

const fixture={
  classes:JSON.parse(readFileSync(new URL('../fixtures/pandora-os-classes-20261011.json',import.meta.url),'utf8')),
  items:JSON.parse(readFileSync(new URL('../../admin-api/data/pandora-os-live-items-20261007.json',import.meta.url),'utf8')),
  souls:JSON.parse(readFileSync(new URL('../../admin-api/data/pandora-os-live-souls-20261007.json',import.meta.url),'utf8'))
};
const clone=()=>structuredClone(fixture);

test('all three dated registries deterministically compare with themselves but do not prove game parity',()=>{
  const report=compareHealingSources(clone(),fixture,{maxExamples:4});
  assert.equal(report.classes.summary.classCount,28);
  assert.equal(report.classes.summary.vectorCount,672);
  assert.equal(report.summary.matchesDatedSnapshot,true);
  assert.equal(report.summary.changedHealingItems,0);
  assert.equal(report.summary.changedHealingSouls,0);
  assert.equal(report.independentlyVerifiedFullGameParity,false);
  assert.equal(report.source,undefined);
  assert.match(report.limitation,/independent verification/);
});

test('potion 145 HP and Potion Soul +8 POT drift are independently detected by exact IDs',()=>{
  const current=clone();
  current.items['50061'].effects[0].a=175;
  current.souls['103018'].effects[0].a=9;
  const report=compareHealingSources(current,fixture);
  assert.equal(report.summary.changedHealingItems,1);
  assert.equal(report.summary.changedHealingSouls,1);
  assert.equal(report.items.examples.changed[0].id,50061);
  assert.deepEqual(report.items.examples.changed[0].fields,['effects']);
  assert.equal(report.souls.examples.changed[0].id,103018);
  assert.equal(report.summary.matchesDatedSnapshot,false);
});

test('Paladin or Monk HP growth drift changes independent class reference vectors',()=>{
  const current=clone();
  current.classes.PALADIN.hp.vit+=1;
  current.classes.MONK.hp.base+=50;
  const report=compareHealingSources(current,fixture);
  assert.equal(report.summary.changedClassCoefficients,2);
  assert.ok(report.summary.changedClassVitals>0);
  assert.equal(report.summary.matchesDatedSnapshot,false);
});

test('a newly added healing item is reported, cosmetic names are ignored',()=>{
  const current=clone();
  current.items['50061'].name='A changed translation is not a gameplay revision';
  let report=compareHealingSources(current,fixture);
  assert.equal(report.summary.matchesDatedSnapshot,true);
  current.items['900001']={id:900001,name:'New healing item',kind:'POTION',slot:null,
    effects:[{func:'EP_HEAL_LIFE',a:120,dir:'TARGET'}]};
  report=compareHealingSources(current,fixture);
  assert.equal(report.summary.newHealingItems,1);
  assert.deepEqual(report.items.examples.newRelevant,[900001]);
});

test('missing relevant souls and corrupted identity fail closed rather than become zero bonuses',()=>{
  const missing=clone();
  delete missing.souls['103018'];
  const report=compareHealingSources(missing,fixture);
  assert.ok(report.souls.examples.missing.includes(103018));
  const corrupt=clone();
  corrupt.items['50061'].id=50062;
  assert.throws(()=>compareHealingSources(corrupt,fixture),/Invalid items source identity 50061/);
  assert.throws(()=>compareHealingSources({classes:fixture.classes,items:{}},fixture),/all three complete registries/);
});

test('live fetch failures do not silently fall back to dated source snapshots',async()=>{
  let calls=0;
  await assert.rejects(()=>readLiveOrLocal({fetchReference:async()=>{
    calls++;
    return {ok:false,status:503};
  }}),/Live classes unavailable.*503/);
  assert.equal(calls,1);
  await assert.rejects(()=>readLiveOrLocal({fetchReference:async()=>{throw Error('Network inaccessible');}}),/Network inaccessible/);
});
