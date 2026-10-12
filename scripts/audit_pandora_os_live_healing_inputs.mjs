#!/usr/bin/env node
/**
 * Healing-input source drift audit for Modern. GET-only, no D1 writes.
 * Usage:
 *   node scripts/audit_pandora_os_live_healing_inputs.mjs --json
 *   node scripts/audit_pandora_os_live_healing_inputs.mjs --source-dir /path/to/json --json
 *   node scripts/audit_pandora_os_live_healing_inputs.mjs --source-dir /path/to/json --strict
 *
 * The default mode fetches CURRENT endpoints and fails closed on access errors.
 * Dated baselines are never reported as live evidence, and a source drift
 * is not permission to change gameplay or formula rounding automatically.
 */
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareLiveVitals} from './audit_pandora_os_live_vitals.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseUrl='https://pandorasaga-os.com/gamedata/';
const filenames=Object.freeze({classes:'classes.json',items:'items.json',souls:'souls.json'});
const baseFiles=Object.freeze({
  classes:'tests/fixtures/pandora-os-classes-20261011.json',
  items:'admin-api/data/pandora-os-live-items-20261007.json',
  souls:'admin-api/data/pandora-os-live-souls-20261007.json'
});
const own=Object.prototype.hasOwnProperty;
const sha=values=>createHash('sha256').update(JSON.stringify(values)).digest('hex');
const healingCode=/VITARITY|MAXLIFE|HEAL|MASTERY_POTION|LIFE_RECOVER|RECOVERY|REGEN/i;

function plain(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function relevant(row){
  if(!plain(row))return false;
  if(row.kind==='POTION')return true;
  return Array.isArray(row.effects)&&row.effects.some(effect=>typeof effect?.func==='string'&&healingCode.test(effect.func));
}
function normalizedEffect(effect,id){
  if(!plain(effect)||typeof effect.func!=='string'||!effect.func.startsWith('EP_'))
    throw Error('Invalid effect in source identity '+id);
  for(const field of ['a','b','min','max']){
    const number=effect[field];
    if(number!==null&&number!==undefined&&typeof number==='number'&&!Number.isFinite(number))
      throw Error('Non-finite effect '+id+'.'+field);
  }
  return {
    func:effect.func,
    dir:effect.dir??null,
    exclusive:effect.exclusive??null,
    a:effect.a??null,b:effect.b??null,min:effect.min??null,max:effect.max??null
  };
}
function canonicalRows(source,label){
  if(!plain(source))throw Error('Expected ID-keyed '+label+' registry object');
  const all=Object.entries(source),records=[];
  for(const [key,row] of all){
    if(!/^\d+$/.test(key)||!plain(row)||!Number.isSafeInteger(row.id)||String(row.id)!==key)
      throw Error('Invalid '+label+' source identity '+key);
    if(!relevant(row))continue;
    if(!Array.isArray(row.effects))throw Error('Missing effects for '+label+' '+key);
    const value={
      id:row.id,kind:row.kind??null,slot:row.slot??null,
      slots:row.slots??null,soulslot:row.soulslot??null,
      level:row.level??null,classes:row.classes??null,
      plus:row.plus??null,twoHanded:row.twoHanded??null,
      effects:row.effects.map(effect=>normalizedEffect(effect,key))
    };
    records.push(value);
  }
  return records.sort((a,b)=>a.id-b.id);
}
function compareRegistry(current,baseline,label,{maxExamples=24}={}){
  if(!Number.isSafeInteger(maxExamples)||maxExamples<0||maxExamples>100)
    throw Error('Invalid example bound');
  const now=canonicalRows(current,label),prior=canonicalRows(baseline,label);
  const indexed=new Map(now.map(row=>[row.id,row]));
  const oldIndex=new Map(prior.map(row=>[row.id,row]));
  const changed=[],missing=[],added=[];
  for(const row of prior){
    const next=indexed.get(row.id);
    if(!next){missing.push(row.id);continue;}
    if(JSON.stringify(row)!==JSON.stringify(next)){
      const fields=Object.keys(row).filter(key=>JSON.stringify(row[key])!==JSON.stringify(next[key]));
      changed.push({id:row.id,fields,before:row,current:next});
    }
  }
  for(const row of now)if(!oldIndex.has(row.id))added.push(row.id);
  return {
    reference:label,
    snapshotDate:'2026-10-07',
    baselineRecords:prior.length,
    currentRecords:now.length,
    baselineSha256:sha(prior),currentSha256:sha(now),
    summary:{changed:changed.length,missing:missing.length,newRelevant:added.length,
      matchesDatedSnapshot:changed.length===0&&missing.length===0&&added.length===0},
    examples:{changed:changed.slice(0,maxExamples),missing:missing.slice(0,maxExamples),
      newRelevant:added.slice(0,maxExamples)},
    examplesTruncated:changed.length>maxExamples||missing.length>maxExamples||added.length>maxExamples
  };
}
export function compareHealingSources(current,baseline,options={}){
  if(!plain(current)||!plain(baseline)||
     ['classes','items','souls'].some(key=>!plain(current[key])||!plain(baseline[key])))
    throw Error('Healing audit requires all three complete registries');
  const classAudit=compareLiveVitals(current.classes,baseline.classes,{maxExamples:options.maxExamples??24});
  const itemAudit=compareRegistry(current.items,baseline.items,'items',options);
  const soulAudit=compareRegistry(current.souls,baseline.souls,'souls',options);
  const summary={
    classCount:classAudit.summary.classCount,
    changedClassCoefficients:classAudit.summary.changedCoefficients,
    changedClassVitals:classAudit.summary.changedVectors,
    changedHealingItems:itemAudit.summary.changed,
    missingHealingItems:itemAudit.summary.missing,
    newHealingItems:itemAudit.summary.newRelevant,
    changedHealingSouls:soulAudit.summary.changed,
    missingHealingSouls:soulAudit.summary.missing,
    newHealingSouls:soulAudit.summary.newRelevant,
    matchesDatedSnapshot:classAudit.summary.baselineMatchesCurrent&&
      itemAudit.summary.matchesDatedSnapshot&&soulAudit.summary.matchesDatedSnapshot
  };
  return {
    scope:'Class HP/MP coefficients and effect-bearing items/Souls potentially changing STA, maximum LP, potion or healing. Numeric data only.',
    limitation:'Not full server-client parity: class/passive execution, skill behavior, equipment legality, live combat effects, status caps and precise rounding require independent verification.',
    baselineDates:{classes:'2026-10-11',items:'2026-10-07',souls:'2026-10-07'},
    independentlyVerifiedFullGameParity:false,
    summary,classes:classAudit,items:itemAudit,souls:soulAudit
  };
}
export async function readLiveOrLocal({sourceDir=null,fetchReference=fetch}={}){
  const records={};
  for(const [name,file] of Object.entries(filenames)){
    if(sourceDir){
      records[name]=JSON.parse(await fs.readFile(path.join(sourceDir,file),'utf8'));
    }else{
      const response=await fetchReference(baseUrl+file,{signal:AbortSignal.timeout(20000),
        headers:{accept:'application/json'}});
      if(!response?.ok)throw Error('Live '+name+' unavailable (no stale fallback): HTTP '+(response?.status??'unknown'));
      records[name]=JSON.parse(await response.text());
    }
  }
  return {records,origin:sourceDir?{localFiles:sourceDir,live:false}:{urls:Object.values(filenames).map(name=>baseUrl+name),live:true}};
}
async function main(args){
  let sourceDir=null,format='text',strict=false;
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(arg==='--source-dir'&&sourceDir===null&&args[i+1]&&!args[i+1].startsWith('--'))
      sourceDir=args[++i];
    else if(arg==='--json'&&format==='text')format='json';
    else if(arg==='--strict'&&!strict)strict=true;
    else throw Error('Invalid or repeated argument: '+arg);
  }
  const baseline={};
  for(const [name,file] of Object.entries(baseFiles))
    baseline[name]=JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
  const {records,origin}=await readLiveOrLocal({sourceDir});
  const report={checkedAt:new Date().toISOString(),source:origin,...compareHealingSources(records,baseline)};
  if(format==='json')console.log(JSON.stringify(report,null,2));
  else{
    console.log('Healing input source drift: '+JSON.stringify(report.summary));
    console.log('Source provenance: '+JSON.stringify(origin));
    console.log(report.limitation);
  }
  if(strict&&!report.summary.matchesDatedSnapshot)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1});
