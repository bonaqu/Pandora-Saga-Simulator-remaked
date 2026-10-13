import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {
  clericObservation,paladinObservation,elfWarriorCounterexample,
  inspectLifeSkills,lifeSignProfilesMatch
} from '../../scripts/audit_pandora_os_cleric_parity.mjs';

const file = path=>JSON.parse(readFileSync(new URL('../../'+path,import.meta.url),'utf8'));
const classes=file('tests/fixtures/pandora-os-classes-20261011.json');
const items=file('admin-api/data/pandora-os-live-items-20261007.json');
const forth=file('admin-api/data/pandora-os-live-item-forth-20261007.json');
const lifeSign=file('tests/fixtures/pandora-os-life-sign-20261013.json');

test('Cleric 45 reported naked 3145, geared 3402 and Life Mark 4127 all match source values',()=>{
  const result=clericObservation(classes,items,forth);
  assert.equal(result.exactHp,true);
  assert.equal(result.values.nakedHp,3145);
  assert.equal(result.values.gearedClassHp,3172);
  assert.equal(result.values.bootsHp,230);
  assert.equal(result.values.equippedHp,3402);
  assert.equal(result.values.buffContribution,725);
  assert.equal(result.values.buffedHp,4127);
  assert.equal(result.inputs.vitBonus,undefined);
  assert.equal(result.inputs.gearedVit,50);
  assert.equal(result.values.nakedMp,1159);
  assert.equal(result.values.gearedClassMp,1320);
  assert.equal(result.values.mpDeltaNotYetIdentified,185);
  assert.equal(result.mpProvenanceComplete,false);
  assert.equal(result.gameClientRoundingProvenAcrossAllClasses,false);
});

test('Cleric item identities and +4 boot fourth increments come from original game tables',()=>{
  assert.equal(items['17034'].name,'Щит часового');
  assert.equal(items['15004'].name,'Сапоги жизненной силы');
  assert.equal(items['15004'].effects.find(row=>row.func==='EP_MAXLIFE_CONST').a,100);
  assert.equal(forth['15004']['2'].find(row=>row.func==='EP_MAXLIFE_CONST').a,65);
  assert.equal(forth['15004']['4'].find(row=>row.func==='EP_MAXLIFE_CONST').a,130);
  assert.equal(forth['15004']['6'].find(row=>row.func==='EP_MAXLIFE_CONST').a,195);
  const broken=JSON.parse(JSON.stringify(items));
  broken['17034'].effects[0].a=2;
  assert.equal(clericObservation(classes,broken,forth).exactHp,false);
  delete broken['15004'];
  assert.throws(()=>clericObservation(classes,broken,forth),/Missing or invalid source item/);
});

test('Paladin 45 +1461 LP is reproduced with class VIT101 and 250+15% phase, without inventing naked VIT',()=>{
  const result=paladinObservation(classes);
  assert.equal(result.exactBuffDelta,true);
  assert.equal(result.values.classBaseHalfEven,8075);
  assert.equal(result.values.classBaseFloor,8074);
  assert.equal(result.values.sourceCandidateBuffDelta,1461);
  assert.equal(result.values.effectiveFlatHpGapIfHalfEven,1242);
  assert.equal(result.values.healingAt240Percent,3880);
  assert.equal(result.values.healingAt244Percent,3944);
  assert.equal(result.values.hypotheticalUnequippedVit97Floor,7895);
  assert.equal(result.values.hypotheticalUnequippedVit97HalfEven,7896);
  assert.equal(result.nakedVitKnown,false);
  assert.equal(result.clientBaseRoundingProven,false);
});

test('ELF Warrior lvl1 differs on HP with legacy racial baseline: no unsafe global migration',()=>{
  const result=elfWarriorCounterexample(classes);
  assert.deepEqual(result.sourceProjection,{hp:149,mp:45});
  assert.deepEqual(result.observedPublicCalculator,{hp:139,mp:45});
  assert.equal(result.hpMismatch,true);
});

test('in-game buff identity must be verified against live skill funcs, never inferred by nickname',()=>{
  const empty=inspectLifeSkills({});
  assert.deepEqual(empty,[{id:'320005001',available:false},{id:'320005051',available:false}]);
  const mock=inspectLifeSkills({'320005001':{
    id:320005001,name:'Divine Aid',desc:'Test description',
    funcs:[{ep:'EP_MAXLIFE_CONST',dir:'TARGET',fv1:[0,0,0,250],fv2:[0,0,0,0]}]
  }});
  assert.equal(mock[0].available,true);
  assert.equal(mock[0].funcs[0].ep,'EP_MAXLIFE_CONST');
  assert.equal(mock[1].available,false);
});

test('live 13 October source: both Sign of Life variants really provide +250 flat and +15% HP',()=>{
  assert.equal(lifeSign.captureDate,'2026-10-13');
  assert.equal(lifeSignProfilesMatch(lifeSign.skills),true);
  const records=inspectLifeSkills(lifeSign.skills);
  assert.deepEqual(records.map(row=>row.id),['320005001','320005051']);
  assert.deepEqual(records.map(row=>row.name),['Знак жизни','Знак жизни']);
  for(const record of records){
    assert.deepEqual(record.funcs.map(row=>[row.ep,row.fv1[3]]),
      [['EP_MAXLIFE_CONST',250],['EP_MAXLIFE_SCALE',15]]);
  }
  const damaged=structuredClone(lifeSign.skills);
  damaged['320005051'].funcs[1].fv1[3]=14;
  assert.equal(lifeSignProfilesMatch(damaged),false);
  assert.equal(lifeSignProfilesMatch({}),false);
});
