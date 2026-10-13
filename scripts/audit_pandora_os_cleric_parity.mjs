#!/usr/bin/env node
/**
 * Independently reproduces *reported* current-client vitals (Cleric/Paladin)
 * from Pandora Saga OS source coefficients and identifiable item IDs.
 *
 * This intentionally does NOT change the retained runtime. The observed
 * floored percent component is an empirical candidate; the public calculator
 * uses half-to-even on class bases, not a proven game-client rounding rule.
 *
 * Live mode performs GET requests only and fails closed. Offline uses dated
 * references and reports their dates rather than mislabeling them as live.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  currentClassBaseHpMp,roundHalfToEven
} from './audit_pandora_os_reference_hp_mp.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE='https://pandorasaga-os.com/gamedata/';
const FIXTURES={
  classes:'tests/fixtures/pandora-os-classes-20261011.json',
  items:'admin-api/data/pandora-os-live-items-20261007.json',
  forth:'admin-api/data/pandora-os-live-item-forth-20261007.json'
};

function finiteNonnegative(value,label) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<0)
    throw new Error('Invalid '+label);
  return value;
}
function sourceId(record,id) {
  if (!record || String(record.id)!==String(id)) throw new Error('Missing or invalid source item '+id);
  return record;
}
function requiredEffect(effects,func) {
  if(!Array.isArray(effects))throw new Error('Source effect list is unavailable');
  const matches=effects.filter(effect=>effect.func===func && effect.dir==='TARGET');
  if(matches.length!==1||!Number.isFinite(matches[0].a))
    throw new Error('Expected single source '+func+' target effect');
  return matches[0].a;
}

/**
 * This is an *observed-composition projection* only: equipment +VIT first;
 * then class HP, source flat HP gear, then +250 + floor(15% of class HP).
 * No other modifier is implicitly assumed or silently imported.
 */
export function clericObservation(classes,items,forth){
  const cls=classes?.CLERIC;
  if (!cls)throw new Error('CLERIC source coefficients missing');
  const shield=sourceId(items?.['17034'],17034);
  const boots=sourceId(items?.['15004'],15004);
  const vitBonus=requiredEffect(shield.effects,'EP_VITARITY_CONST');
  const bootsBase=requiredEffect(boots.effects,'EP_MAXLIFE_CONST');
  const bootsFourth=requiredEffect(forth?.['15004']?.['4'],'EP_MAXLIFE_CONST');
  const naked=currentClassBaseHpMp(cls,{level:45,vit:49,spi:41});
  const gearedClass=currentClassBaseHpMp(cls,{
    level:45,vit:49+vitBonus,spi:41+16
  });
  const bootsHp=bootsBase+bootsFourth;
  const equippedHp=gearedClass.hp+bootsHp;
  const buffFlat=250,buffPercent=15;
  const buffContribution=buffFlat+Math.floor(gearedClass.hp*buffPercent/100);
  const buffedHp=equippedHp+buffContribution;
  const unexplainedEquippedMp=1505-gearedClass.mp;
  return {
    inputs:{race:'ELF',class:'CLERIC',level:45,passive:'Nature Harmony',
      nakedVit:49,gearedVit:49+vitBonus,nakedSpi:41,gearedSpi:57,
      shieldId:17034,bootsId:15004,bootsPlus:4,
      bootsBaseHp:bootsBase,bootsFourthHp:bootsFourth,
      buffSkillCandidateId:320005001,buffFlat,buffPercent},
    values:{nakedHp:naked.hp,nakedMp:naked.mp,gearedClassHp:gearedClass.hp,
      gearedClassMp:gearedClass.mp,bootsHp,equippedHp,buffContribution,buffedHp,
      observedEquippedMp:1505,mpDeltaNotYetIdentified:unexplainedEquippedMp},
    observed:{nakedHp:3145,equippedHp:3402,buffedHp:4127,equippedMp:1505},
    exactHp: naked.hp===3145&&equippedHp===3402&&buffedHp===4127,
    mpProvenanceComplete:unexplainedEquippedMp===0,
    calculationStage:'diagnostic only; 15% applied to class base before boots HP',
    gameClientRoundingProvenAcrossAllClasses:false
  };
}

export function paladinObservation(classes) {
  const cls=classes?.PALADIN;
  if(!cls)throw new Error('PALADIN source coefficients missing');
  // The user observed 101 total VIT with equipment, not a proven naked VIT.
  const gearedVit=101,level=45;
  const gearedClass=currentClassBaseHpMp(cls,{level,vit:gearedVit,spi:0});
  const raw=cls.hp.base+cls.hp.lv*level+cls.hp.vit*gearedVit;
  const floorAlternative=Math.floor(raw);
  const buffPercent=15,buffFlat=250;
  const expectedBuff=250+Math.floor(gearedClass.hp*buffPercent/100);
  return {
    inputs:{class:'PALADIN',level,equippedVit:gearedVit,baseExpression:raw,
      observedNakedHp:7895,observedEquippedHp:9317,observedBuffedHp:10778,
      buffFlat,buffPercent},
    values:{classBaseHalfEven:gearedClass.hp,classBaseFloor:floorAlternative,
      observedBuffDelta:10778-9317,sourceCandidateBuffDelta:expectedBuff,
      effectiveFlatHpGapIfHalfEven:9317-gearedClass.hp,
      hypotheticalUnequippedVit:97,
      hypotheticalUnequippedVit97Floor:Math.floor(cls.hp.base+cls.hp.lv*level+cls.hp.vit*97),
      hypotheticalUnequippedVit97HalfEven:roundHalfToEven(cls.hp.base+cls.hp.lv*level+cls.hp.vit*97),
      healingAt240Percent:Math.floor(10778*15*240/10000),
      healingAt244Percent:Math.floor(10778*15*244/10000)},
    exactBuffDelta:expectedBuff===10778-9317,
    nakedVitKnown:false,clientBaseRoundingProven:false,
    warning:'Hypothetical 97 naked VIT is not an in-game observation; naked LP does not independently prove floor versus half-even.'
  };
}

export function elfWarriorCounterexample(classes) {
  const warrior=currentClassBaseHpMp(classes?.WARRIOR,{level:1,vit:5,spi:6});
  return {input:'ELF/Warrior level 1 with historical starting VIT5/SPI6',
    sourceProjection:warrior,observedPublicCalculator:{hp:139,mp:45},
    hpMismatch:warrior.hp!==139,
    note:'The race/class baseline or another modifier is not yet proven; do not apply this as a universal HP correction.'};
}

async function fetchJson(name) {
  const url=SOURCE+name+'.json';
  const reply=await fetch(url,{signal:AbortSignal.timeout(20000),
    headers:{accept:'application/json'}});
  if(!reply.ok)throw new Error('Current source unavailable: '+name+' HTTP '+reply.status);
  return await reply.json();
}
export function inspectLifeSkills(skills) {
  const IDs=['320005001','320005051'];
  return IDs.map(id=>{
    const skill=skills?.[id];
    if (!skill) return {id,available:false};
    const funcs=(skill.funcs||[]).map(fn=>({
      ep:fn.ep,dir:fn.dir,
      fv1:fn.fv1,fv2:fn.fv2
    }));
    return {id,available:true,name:skill.name,description:skill.desc,funcs};
  });
}

async function main(args) {
  if(args.some(arg=>!['--json','--live','--strict'].includes(arg)))
    throw new Error('Usage: [--json] [--live] [--strict]');
  const live=args.includes('--live');
  const data=await Promise.all(Object.entries(FIXTURES).map(async([key,name])=>
    [key,JSON.parse(await fs.readFile(path.join(ROOT,name),'utf8'))]));
  const fixtures=Object.fromEntries(data);
  const classes=live?await fetchJson('classes'):fixtures.classes;
  const items=live?await fetchJson('items'):fixtures.items;
  const skills=live?await fetchJson('skills'):null;
  const cleric=clericObservation(classes,items,fixtures.forth);
  const paladin=paladinObservation(classes);
  const counterexample=elfWarriorCounterexample(classes);
  const result={
    source:live?'LIVE HTTPS GET-only classes/items/skills':'Dated classes 2026-10-11, items/forth 2026-10-07',
    currentSkillEvidence:live?inspectLifeSkills(skills):'Not fetched in offline mode',
    cleric,paladin,counterexample,
    assertable:cleric.exactHp&&paladin.exactBuffDelta&&counterexample.hpMismatch,
    warning:'Observed phase composition is not yet a validated engine implementation, no mechanics/data/build writes are performed.'
  };
  if(args.includes('--json'))console.log(JSON.stringify(result,null,2));
  else console.log(JSON.stringify({
    source:result.source,cleric:cleric.values,paladin:paladin.values,
    buffDeltaExact:paladin.exactBuffDelta,elfWarrior:counterexample.sourceProjection,
    skillEvidence:result.currentSkillEvidence
  },null,2));
  if(args.includes('--strict')&&!result.assertable)
    throw new Error('Observed vitals cannot be reproduced from the selected source');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(e=>{
    console.error(e.message);process.exitCode=1;
  });
