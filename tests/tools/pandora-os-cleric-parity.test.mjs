import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {
  clericObservation,paladinObservation,elfWarriorGameClientObservation,
  inspectLifeSkills,lifeSignProfilesMatch
} from '../../scripts/audit_pandora_os_cleric_parity.mjs';

const file = path=>JSON.parse(readFileSync(new URL('../../'+path,import.meta.url),'utf8'));
const classes=file('tests/fixtures/pandora-os-classes-20261011.json');
const items=file('admin-api/data/pandora-os-live-items-20261007.json');
const forth=file('admin-api/data/pandora-os-live-item-forth-20261007.json');
const souls=file('admin-api/data/pandora-os-live-souls-20261007.json');
const lifeSign=file('tests/fixtures/pandora-os-life-sign-20261013.json');

test('Cleric 45 reported naked 3145, geared 3402 and Life Mark 4127 all match source values',()=>{
  const result=clericObservation(classes,items,forth,souls);
  assert.equal(result.exactHp,true);
  assert.equal(result.values.nakedHp,3145);
  assert.equal(result.values.gearedClassHp,3172);
  assert.equal(result.values.bootsHp,230);
  assert.equal(result.values.equippedHp,3402);
  assert.equal(result.values.buffContribution,725);
  assert.equal(result.values.buffedHp,4127);
  assert.equal(result.inputs.vitBonus,undefined);
  assert.equal(result.inputs.gearedVit,50);
  assert.equal(result.inputs.nakedSpi,53);
  assert.equal(result.values.nakedMp,1279);
  assert.equal(result.values.nakedMpPublicReferenceHalfEven,1280);
  assert.equal(result.exactNakedMp,true);
  assert.equal(result.values.gearedClassMp,1320);
  assert.equal(result.values.knownFlatMp,80);
  assert.equal(result.values.sourceHighSoulPercent,8);
  assert.equal(result.values.percentOnClassBase,105);
  assert.equal(result.values.percentAfterKnownFlats,112);
  assert.equal(result.values.explainedMpWithBasePercent,1505);
  assert.equal(result.values.explainedMpWithPostFlatPercent,1512);
  assert.equal(result.values.remainingMpIfBasePercent,0);
  assert.equal(result.values.remainingMpIfPostFlatPercent,-7);
  assert.equal(result.values.sourcedGearSpi,4);
  assert.equal(result.values.additionalGearSpiNotYetSourced,0);
  assert.equal(result.inputs.knownSpiWeaponId,2621);
  assert.equal(result.inputs.knownSpiWeaponLevel,21);
  assert.equal(result.mpProvenanceComplete,true);
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
  assert.equal(clericObservation(classes,broken,forth,souls).exactHp,false);
  delete broken['15004'];
  assert.throws(()=>clericObservation(classes,broken,forth,souls),/Missing or invalid source item/);
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

test('direct game-client ELF Warrior lvl1 agrees on HP/MP, defense, attack, accuracy, evasion and charm',()=>{
  const result=elfWarriorGameClientObservation(classes,items);
  assert.equal(result.exact,true);
  assert.deepEqual(result.input,{race:'ELF',className:'WARRIOR',level:1,
    vit:5,str:6,dex:5,agi:5,spi:6,int:7, racialPassive:'Стойкость разума',
    armorIds:[12001,13001,15061],weaponId:21});
  assert.deepEqual(result.observed,{hp:149,mp:44,attackMin:9,attackMax:12,
    defense:12,accuracy:6,evasion:6,charmResist:20});
  assert.equal(result.values.publicHalfEvenHp,149);
  assert.equal(result.values.publicHalfEvenMp,45);
  assert.equal(result.itemsHaveNoHPMPModifiers,true);
  assert.deepEqual(result.previousWebCalculator,{hp:139,mp:45});
  const broken=structuredClone(items);
  broken['12001'].AC=7;
  assert.equal(elfWarriorGameClientObservation(classes,broken).exact,false);
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

test('High Soul 104002 glove-only +8% MP and +1 SPR are source-identified',()=>{
  assert.equal(souls['104002'].name,'Высокая душа');
  assert.deepEqual(souls['104002'].slots,['gloves']);
  assert.ok(souls['104002'].effects.some(x=>x.func==='EP_MAXMANA_SCALE'&&x.dir==='SELF'&&x.a===8));
  assert.ok(souls['104002'].effects.some(x=>x.func==='EP_SPIRITUAL_CONST'&&x.dir==='SELF'&&x.a===1));
  assert.equal(items['13102'].effects.find(x=>x.func==='EP_MAXMANA_CONST').a,10);
  assert.equal(items['21011'].effects.find(x=>x.func==='EP_MAXMANA_CONST').a,20);
  assert.equal(items['20001'].effects.find(x=>x.func==='EP_MAXMANA_CONST').a,50);
  assert.equal(items['2621'].name,'Жезл лунного света');
  assert.equal(items['2621'].level,21);
  assert.equal(items['2621'].effects.find(x=>x.func==='EP_SPIRITUAL_CONST').a,2);
  assert.equal(items['2621'].effects.find(x=>x.func==='EP_INTELIGENCE_CONST').a,3);
  const brokenWand=structuredClone(items);
  brokenWand['2621'].effects.find(x=>x.func==='EP_SPIRITUAL_CONST').a=1;
  const wandMismatch=clericObservation(classes,brokenWand,forth,souls);
  assert.equal(wandMismatch.values.additionalGearSpiNotYetSourced,1);
  assert.equal(wandMismatch.mpProvenanceComplete,false);
  const broken=structuredClone(souls);
  broken['104002'].effects.find(x=>x.func==='EP_MAXMANA_SCALE').a=9;
  assert.throws(()=>clericObservation(classes,items,forth,broken),/High Soul current effect has changed/);
});

test('source MP rounding matters: 53 SPR must floor from 1279.9 to 1279, not halfEven 1280',()=>{
  const cls=classes.CLERIC;
  const value=cls.mp.base+cls.mp.lv*45+cls.mp.spi*53;
  assert.ok(value>1279.8&&value<1280);
  assert.equal(Math.floor(value),1279);
  const record=clericObservation(classes,items,forth,souls);
  assert.equal(record.observed.nakedMp,1279);
  assert.equal(record.values.nakedMpPublicReferenceHalfEven,1280);
  assert.equal(record.mpProvenanceComplete,true);
});
