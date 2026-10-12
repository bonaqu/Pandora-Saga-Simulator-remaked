#!/usr/bin/env node
/**
 * Read-only divergence inventory, NOT a formula migration or game parity proof.
 * Compares retained Legacy unbuffed class HP/MP arithmetic against dated
 * Pandora Saga OS coefficient snapshots at the SAME hypothetical VIT/SPI.
 * Also checks 164 pinned source weapon base reach identities (not effective
 * Riding/skills/equipment range). No D1, runtime mutation or network requests.
 *
 * node scripts/audit_pandora_os_base_deltas.mjs [--source local-classes.json] [--json]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CLASS_ORDER,SOURCE_URL,parseLegacyModifiers} from './audit_pandora_os_class_coefficients.mjs';
import {currentClassBaseHpMp} from './audit_pandora_os_reference_hp_mp.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixture='tests/fixtures/pandora-os-classes-20261011.json';
export const AUDIT_LEVELS=Object.freeze([1,10,20,30,40,45,60,80]);
export const AUDIT_VITALS=Object.freeze([
  Object.freeze({vit:5,spi:5}),Object.freeze({vit:7,spi:4}),
  Object.freeze({vit:35,spi:45}),Object.freeze({vit:100,spi:100})
]);

// Exactly the retained LP/MP base terms from archived js/calc.js. Buffs,
// gear, races and all post-base modifiers are intentionally NOT included.
export function retainedClassBaseHpMp(mod,{level,vit,spi}) {
  if(!Array.isArray(mod)||mod.length!==6||!mod.every(Number.isFinite)||
     mod.slice(2).some(value=>value<=0))
    throw Error('Invalid archived class divisor or coefficient');
  if(!Number.isInteger(level)||level<1||![vit,spi].every(Number.isFinite)||
     vit<0||spi<0)throw Error('Invalid hypothetical vitals input');
  return {
    hp:mod[0]+Math.ceil(level*(100/mod[2]))+
      Math.ceil(vit*Math.ceil(100/mod[4])),
    mp:mod[1]+Math.ceil(level*(100/mod[3]))+
      Math.ceil(spi*Math.ceil(100/mod[5]))
  };
}

export function compareVitals(classes,legacy,levels=AUDIT_LEVELS,pairs=AUDIT_VITALS) {
  if(Object.keys(classes).length!==28||CLASS_ORDER.some(name=>!classes[name])||
     legacy.size!==28||CLASS_ORDER.some((name,index)=>!legacy.has(index)))
    throw Error('Incomplete or ambiguous 28-class identity mapping');
  if(!Array.isArray(levels)||!levels.length||
     !Array.isArray(pairs)||!pairs.length)throw Error('Empty audit scenarios');
  const vectors=[];
  for(const [index,name] of CLASS_ORDER.entries())for(const level of levels)
    for(const {vit,spi} of pairs){
      const state={level,vit,spi};
      const current=currentClassBaseHpMp(classes[name],state);
      const retained=retainedClassBaseHpMp(legacy.get(index),state);
      const delta={hp:current.hp-retained.hp,mp:current.mp-retained.mp};
      if(![current.hp,current.mp,retained.hp,retained.mp,delta.hp,delta.mp].every(Number.isFinite))
        throw Error('Non-finite comparison at '+name);
      vectors.push({name,legacyIndex:index,...state,source:current,retained,delta});
    }
  const byClass=CLASS_ORDER.map((name,index)=>{
    const subset=vectors.filter(row=>row.name===name);
    const example=subset.find(row=>row.level===45&&row.vit===7&&row.spi===4)||subset[0];
    return {name,legacyIndex:index,vectors:subset.length,
      hpDifferent:subset.filter(row=>row.delta.hp!==0).length,
      mpDifferent:subset.filter(row=>row.delta.mp!==0).length,
      largestAbsoluteHpDelta:Math.max(...subset.map(row=>Math.abs(row.delta.hp))),
      largestAbsoluteMpDelta:Math.max(...subset.map(row=>Math.abs(row.delta.mp))),
      example};
  });
  const top=vectors.slice().sort((a,b)=>{
    const aMax=Math.max(Math.abs(a.delta.hp),Math.abs(a.delta.mp));
    const bMax=Math.max(Math.abs(b.delta.hp),Math.abs(b.delta.mp));
    return bMax-aMax||a.legacyIndex-b.legacyIndex||a.level-b.level||
      a.vit-b.vit||a.spi-b.spi;
  }).slice(0,16);
  return {scenarios:levels.length*pairs.length,comparedVectors:vectors.length,
    classes:byClass.length,hpDifferentVectors:vectors.filter(x=>x.delta.hp!==0).length,
    mpDifferentVectors:vectors.filter(x=>x.delta.mp!==0).length,
    classesWithHpDifferences:byClass.filter(x=>x.hpDifferent>0).length,
    classesWithMpDifferences:byClass.filter(x=>x.mpDifferent>0).length,
    byClass,topDifferences:top};
}

export function auditWeaponBaseReach(fixtureData,embedded) {
  if(!fixtureData||!Array.isArray(fixtureData.items)||
     fixtureData.items.length!==164||!embedded||
     Object.keys(embedded).length!==164)
    throw Error('Pinned base weapon reach count changed');
  const keys=new Set(),ids=new Set(),official=new Set(),byCategory=Object.create(null);
  for(const row of fixtureData.items){
    if(!Number.isSafeInteger(row.category)||row.category<0||row.category>13||
       !Number.isSafeInteger(row.index)||row.index<1||
       !Number.isSafeInteger(row.range)||row.range<=0||
       !Number.isSafeInteger(row.officialId)||typeof row.id!=='string'||
       typeof row.engineKey!=='string'||!row.engineKey||
       typeof row.kind!=='string'||!row.kind)
      throw Error('Invalid pinned weapon source entry');
    const key=row.category+'.'+row.index;
    if(keys.has(key)||ids.has(row.id)||official.has(row.officialId))
      throw Error('Duplicate pinned weapon identity '+key);
    keys.add(key);ids.add(row.id);official.add(row.officialId);
    const tuple=embedded[key],ranged=Number(['BOW','CROSSBOW'].includes(row.kind));
    if(!Array.isArray(tuple)||tuple.length!==3||tuple[0]!==row.range||
       tuple[1]!==row.engineKey||tuple[2]!==ranged)
      throw Error('Modern embedded base reach drift: '+key);
    const bucket=byCategory[row.category]??={count:0,minRange:Infinity,maxRange:0};
    bucket.count++;bucket.minRange=Math.min(bucket.minRange,row.range);
    bucket.maxRange=Math.max(bucket.maxRange,row.range);
  }
  return {count:keys.size,categoryCount:Object.keys(byCategory).length,
    confirmedRanged:fixtureData.items.filter(row=>['BOW','CROSSBOW'].includes(row.kind)).length,
    baseReachOnly:true,effectiveModifiersVerified:false,
    sourceCaptureDate:fixtureData.capturedDate,byCategory};
}

export function parseEmbeddedWeaponBaseRanges(calculatorSource) {
  const match=calculatorSource.match(/var currentWeaponRanges = (\{[^\n]+\});/);
  if(!match)throw Error('Modern pinned weapon base reach map not found');
  return JSON.parse(match[1]);
}

export async function buildSnapshotReport(classFile=fixture) {
  const classes=JSON.parse(await fs.readFile(path.resolve(root,classFile),'utf8'));
  const [ini,weaponFixture,calculatorSource]=await Promise.all([
    fs.readFile(path.join(root,'js/ini.js'),'utf8'),
    fs.readFile(path.join(root,'tests/fixtures/pandora-os-weapon-ranges-20261011.json'),'utf8'),
    fs.readFile(path.join(root,'modern/calculator-controls.js'),'utf8')
  ]);
  const vitals=compareVitals(classes,parseLegacyModifiers(ini));
  const weaponBaseReach=auditWeaponBaseReach(JSON.parse(weaponFixture),
    parseEmbeddedWeaponBaseRanges(calculatorSource));
  return {schemaVersion:1,readOnly:true,effectiveGameParityKnown:false,
    classReference:{url:SOURCE_URL,localSnapshot:classFile,datedFixture:classFile===fixture},
    basis:'Dated local class coefficients and weapon base reach; not fresh production data',
    warning:'Isolated same-input HP/MP arithmetic only: no actual race stats, gear, Souls, skill buffs, percentage modifiers, attack range modifiers or combat formula parity.',
    vitals,weaponBaseReach};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),allowed=new Set(['--source','--json']);
  (async()=>{
    if(args.some(arg=>arg.startsWith('--')&&!allowed.has(arg)))throw Error('Unsupported argument');
    const index=args.indexOf('--source');
    if(index>=0&&(!args[index+1]||args[index+1].startsWith('--')))
      throw Error('--source needs a local JSON file');
    const file=index>=0?args[index+1]:fixture;
    const result=await buildSnapshotReport(file);
    if(args.includes('--json'))console.log(JSON.stringify(result,null,2));
    else console.log(JSON.stringify({
      warning:result.warning,
      source:result.classReference,
      vitals:{classes:result.vitals.classes,vectors:result.vitals.comparedVectors,
        hpChanged:result.vitals.hpDifferentVectors,mpChanged:result.vitals.mpDifferentVectors,
        topDifferences:result.vitals.topDifferences.slice(0,8)},
      weaponBaseReach:result.weaponBaseReach
    },null,2));
  })().catch(error=>{console.error(error.message);process.exitCode=1;});
}
