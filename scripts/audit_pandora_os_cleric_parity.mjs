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
  forth:'admin-api/data/pandora-os-live-item-forth-20261007.json',
  souls:'admin-api/data/pandora-os-live-souls-20261007.json'
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
  const matches=effects.filter(effect=>effect.func===func && (effect.dir==null || effect.dir==='TARGET'));
  if(matches.length!==1||!Number.isFinite(matches[0].a))
    throw new Error('Expected single source '+func+' target effect');
  return matches[0].a;
}

/**
 * This is an *observed-composition projection* only: equipment +VIT first;
 * then class HP, source flat HP gear, then +250 + floor(15% of class HP).
 * No other modifier is implicitly assumed or silently imported.
 */
export function clericObservation(classes,items,forth,souls){
  const cls=classes?.CLERIC;
  if (!cls)throw new Error('CLERIC source coefficients missing');
  const shield=sourceId(items?.['17034'],17034);
  const boots=sourceId(items?.['15004'],15004);
  const vitBonus=requiredEffect(shield.effects,'EP_VITARITY_CONST');
  const bootsBase=requiredEffect(boots.effects,'EP_MAXLIFE_CONST');
  const bootsFourth=requiredEffect(forth?.['15004']?.['4'],'EP_MAXLIFE_CONST');
  // User confirmed effective no-gear SPR 53 = 41 assigned +12 learned
  // Prayer/Blessing branch points. 41 is NOT the naked current-client SPR.
  const nakedRawMp=cls.mp.base+45*cls.mp.lv+53*cls.mp.spi;
  const naked=currentClassBaseHpMp(cls,{level:45,vit:49,spi:53});
  const gearedClass=currentClassBaseHpMp(cls,{
    level:45,vit:49+vitBonus,spi:41+16
  });
  const bootsHp=bootsBase+bootsFourth;
  const equippedHp=gearedClass.hp+bootsHp;
  const buffFlat=250,buffPercent=15;
  const buffContribution=buffFlat+Math.floor(gearedClass.hp*buffPercent/100);
  const buffedHp=equippedHp+buffContribution;
  // Current item/soul registry, with exact IDs and separate modifier types.
  const pants=sourceId(items?.['13102'],13102);
  const belt=sourceId(items?.['21011'],21011);
  const necklace=sourceId(items?.['20001'],20001);
  const moonlightWand=sourceId(items?.['2621'],2621);
  const gloves=sourceId(items?.['14617'],14617);
  const robe=sourceId(items?.['12116'],12116);
  const crown=sourceId(items?.['11081'],11081);
  const highSoul=sourceId(souls?.['104002'],104002);
  if (!Array.isArray(highSoul.effects) || !highSoul.slots?.includes('gloves'))
    throw Error('Expected valid High Soul for gloves');
  const highMp=highSoul.effects.filter(e=>e.func==='EP_MAXMANA_SCALE'&&e.dir==='SELF');
  const highSpi=highSoul.effects.filter(e=>e.func==='EP_SPIRITUAL_CONST'&&e.dir==='SELF');
  if (highMp.length!==1||highMp[0].a!==8||highSpi.length!==1||highSpi[0].a!==1)
    throw Error('High Soul current effect has changed');
  const knownFlatMp=requiredEffect(pants.effects,'EP_MAXMANA_CONST')+
    requiredEffect(belt.effects,'EP_MAXMANA_CONST')+
    requiredEffect(necklace.effects,'EP_MAXMANA_CONST');
  const knownSpiGear=requiredEffect(pants.effects,'EP_SPIRITUAL_CONST')+
    highSpi[0].a+requiredEffect(moonlightWand.effects,'EP_SPIRITUAL_CONST');
  // Both percent-base and percent-after-flats are candidates: the client
  // application stage has NOT been proven by this one equipped screenshot.
  const sourcePercent=highMp[0].a;
  const percentOnClassBase=Math.floor(gearedClass.mp*sourcePercent/100);
  const percentAfterKnownFlats=Math.floor((gearedClass.mp+knownFlatMp)*sourcePercent/100);
  const explainedMpWithBasePercent=gearedClass.mp+knownFlatMp+percentOnClassBase;
  const explainedMpWithPostFlatPercent=gearedClass.mp+knownFlatMp+percentAfterKnownFlats;
  const listedNonManaItems=[gloves,robe,crown];
  for (const item of listedNonManaItems)
    if ((item.effects||[]).some(e=>e.func==='EP_MAXMANA_CONST'||e.func==='EP_MAXMANA_SCALE'))
      throw Error('Previously non-mana current-source item now grants MP: '+item.id);
  return {
    inputs:{race:'ELF',class:'CLERIC',level:45,passive:'Nature Harmony',
      nakedVit:49,gearedVit:49+vitBonus,underlyingSpi:41,prayerBranchSpi:12,nakedSpi:53,gearedSpi:57,
      shieldId:17034,bootsId:15004,bootsPlus:4,
      bootsBaseHp:bootsBase,bootsFourthHp:bootsFourth,
      knownManaItems:[13102,21011,20001,104002],knownSpiWeaponId:2621,
      knownSpiWeaponLevel:moonlightWand.level,nonManaItems:[14617,12116,11081],
      buffSkillSourceIds:[320005001,320005051],buffFlat,buffPercent},
    values:{nakedHp:naked.hp,nakedMp:Math.floor(nakedRawMp),
      nakedMpRaw:nakedRawMp,nakedMpPublicReferenceHalfEven:naked.mp,
      gearedClassHp:gearedClass.hp,gearedClassMp:gearedClass.mp,
      bootsHp,equippedHp,buffContribution,buffedHp,
      knownFlatMp,sourceHighSoulPercent:sourcePercent,percentOnClassBase,
      percentAfterKnownFlats,
      explainedMpWithBasePercent,explainedMpWithPostFlatPercent,
      remainingMpIfBasePercent:1505-explainedMpWithBasePercent,
      remainingMpIfPostFlatPercent:1505-explainedMpWithPostFlatPercent,
      sourcedGearSpi:knownSpiGear,additionalGearSpiNotYetSourced:57-53-knownSpiGear,
      observedEquippedMp:1505},
    observed:{nakedHp:3145,nakedMp:1279,equippedHp:3402,buffedHp:4127,equippedMp:1505},
    exactNakedMp:Math.floor(nakedRawMp)===1279&&naked.mp!==1279,
    exactHp: naked.hp===3145&&equippedHp===3402&&buffedHp===4127,
    mpProvenanceComplete:1505===explainedMpWithBasePercent&&knownSpiGear===4,
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

/**
 * Direct in-game character snapshot, 2026-10-13. Previously this case was
 * mislabeled as a mismatch because a public *web* calculator showed 139/45.
 * The actual game reports 149/44 at VIT5 and SPI6.
 */
export function elfWarriorGameClientObservation(classes,items){
  const cls=classes?.WARRIOR;
  if(!cls)throw new Error('WARRIOR class coefficients unavailable');
  const vit=5,spi=6,level=1,str=6,dex=5,agi=5,int=7;
  const hpRaw=cls.hp.base+cls.hp.lv*level+cls.hp.vit*vit;
  const mpRaw=cls.mp.base+cls.mp.lv*level+cls.mp.spi*spi;
  const warrior=currentClassBaseHpMp(cls,{level,vit,spi});
  const armorIds=['12001','13001','15061'];
  const pieces=armorIds.map(id=>sourceId(items?.[id],id));
  const sword=sourceId(items?.['21'],21);
  const crystalRing=sourceId(items?.['19004'],19004);
  const ringVit=requiredEffect(crystalRing.effects,'EP_VITARITY_CONST');
  const ringMagicResist=requiredEffect(crystalRing.effects,'EP_MAGIC_RESISTANCE_CONST');
  if(crystalRing.level!==1||!crystalRing.classes?.WARRIOR||ringVit!==1||ringMagicResist!==2||
    crystalRing.effects.some(e=>/EP_MAX(LIFE|MANA)_/.test(e.func)))
    throw Error('Level-1 Crystal Ring is no longer a clean +1 VIT control');
  const armorDefense=pieces.reduce((sum,item)=>sum+finiteNonnegative(item.AC,item.name+' defense'),0);
  const hasModifier=pieces.concat(sword).some(item=>(item.effects||[]).some(effect=>
    ['EP_VITARITY_CONST','EP_SPIRITUAL_CONST','EP_MAXLIFE_CONST',
     'EP_MAXMANA_CONST','EP_MAXLIFE_SCALE','EP_MAXMANA_SCALE'].includes(effect.func)));
  const observed={hp:149,mp:44,attackMin:9,attackMax:12,
    defense:12,accuracy:6,evasion:6,charmResist:20};
  const values={hp:Math.floor(hpRaw),mp:Math.floor(mpRaw),
    publicHalfEvenHp:warrior.hp,publicHalfEvenMp:warrior.mp,
    attackMin:sword.W,attackMax:sword.W+Math.floor(str/2),
    defense:armorDefense,accuracy:level+dex,evasion:level+agi,
    charmResist:20};
  return {source:'in-game Pandora Saga OS 2026-10-13',
    input:{race:'ELF',className:'WARRIOR',level,vit,str,dex,agi,spi,int,
      racialPassive:'Стойкость разума',armorIds:armorIds.map(Number),weaponId:21},
    observed,values,itemsHaveNoHPMPModifiers:!hasModifier,
    exact:Object.keys(observed).every(key=>observed[key]===values[key])&&!hasModifier,
    previousWebCalculator:{hp:139,mp:45},
    nextTest:{itemId:19004,itemName:crystalRing.name,requiredLevel:1,
      vitAfter:vit+ringVit,hpAfter:Math.floor(cls.hp.base+cls.hp.lv*level+cls.hp.vit*(vit+ringVit)),
      mpAfter:Math.floor(mpRaw),magicResistanceIncrease:ringMagicResist},
    note:'Public web calculator 139/45 is not a game-client observation; do not change actual class/race inputs to fit it.'};
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


/** Validate that both actual source variants define exactly the observed buff. */
export function lifeSignProfilesMatch(skills) {
  const profiles=inspectLifeSkills(skills);
  return profiles.length===2 && profiles.every(row=>{
    if (!row.available || row.name!=='Знак жизни' || row.funcs.length!==2) return false;
    const byName=Object.fromEntries(row.funcs.map(entry=>[entry.ep,entry]));
    return Object.keys(byName).length===2 &&
      byName.EP_MAXLIFE_CONST?.dir==='TARGET' &&
      byName.EP_MAXLIFE_CONST.fv1?.[3]===250 &&
      byName.EP_MAXLIFE_SCALE?.dir==='TARGET' &&
      byName.EP_MAXLIFE_SCALE.fv1?.[3]===15;
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
  const souls=live?await fetchJson('souls'):fixtures.souls;
  const cleric=clericObservation(classes,items,fixtures.forth,souls);
  const paladin=paladinObservation(classes);
  const elfWarrior=elfWarriorGameClientObservation(classes,items);
  const lifeSkillsMatch=live?lifeSignProfilesMatch(skills):null;
  const result={
    lifeSkillsMatch,
    source:live?'LIVE HTTPS GET-only classes/items/souls/skills (dated forth registry)':'Dated classes 2026-10-11, items/forth/souls 2026-10-07',
    currentSkillEvidence:live?inspectLifeSkills(skills):'Not fetched in offline mode',
    cleric,paladin,elfWarrior,
    assertable:cleric.exactHp&&cleric.exactNakedMp&&paladin.exactBuffDelta&&elfWarrior.exact&&(!live||lifeSkillsMatch),
    warning:'Naked MP floor matches actual game, not public half-even reference. The 1505 equipped MP and all +4 gear SPR are now source-matched, including Necklace 20001 and Moonlight Wand 2621; racial baselines beyond Cleric remain unproven.'
  };
  if(args.includes('--json'))console.log(JSON.stringify(result,null,2));
  else console.log(JSON.stringify({
    source:result.source,cleric:cleric.values,paladin:paladin.values,
    buffDeltaExact:paladin.exactBuffDelta,elfWarrior:elfWarrior.values,
    skillEvidence:result.currentSkillEvidence
  },null,2));
  if(args.includes('--strict')&&!result.assertable)
    throw new Error('Observed vitals cannot be reproduced from the selected source');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(e=>{
    console.error(e.message);process.exitCode=1;
  });
