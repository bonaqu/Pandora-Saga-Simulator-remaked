#!/usr/bin/env node
/**
 * Current-server class HP/MP drift audit — read-only and independent of Legacy.
 *
 * Usage:
 *   node scripts/audit_pandora_os_live_vitals.mjs --json
 *   node scripts/audit_pandora_os_live_vitals.mjs --source /path/to/new/classes.json --json
 *   node scripts/audit_pandora_os_live_vitals.mjs --source classes.json --strict
 *
 * No stale fixture is ever described as a current live capture.
 * Coefficient/vital drift is NOT full combat/equipment parity.
 */
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CLASS_ORDER,SOURCE_URL} from './audit_pandora_os_class_coefficients.mjs';
import {generateReferenceVectors} from './audit_pandora_os_reference_hp_mp.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const FIELDS=Object.freeze(['hp.base','hp.lv','hp.vit','mp.base','mp.lv','mp.spi']);
const has=Object.prototype.hasOwnProperty;

export function canonicalCoefficients(classes){
  if(!classes||typeof classes!=='object'||Array.isArray(classes)||
     Object.keys(classes).length!==CLASS_ORDER.length||
     CLASS_ORDER.some(name=>!has.call(classes,name)))
    throw Error('Current source must contain the exact 28 canonical class identities');
  return CLASS_ORDER.map(name=>{
    const entry=classes[name];
    const record={name};
    for(const field of FIELDS){
      const [section,key]=field.split('.');
      const n=entry?.[section]?.[key];
      if(typeof n!=='number'||!Number.isFinite(n)||n<0)
        throw Error('Invalid current class coefficient: '+name+'.'+field);
      record[field]=n;
    }
    return record;
  });
}
export function compareLiveVitals(current,dated,{maxExamples=24}={}){
  if(!Number.isSafeInteger(maxExamples)||maxExamples<0||maxExamples>672)
    throw Error('Invalid bounded example limit');
  const now=canonicalCoefficients(current),before=canonicalCoefficients(dated);
  const hash=values=>createHash('sha256').update(JSON.stringify(values)).digest('hex');
  const beforeMap=new Map(before.map(row=>[row.name,row]));
  const coefficients=[];
  for(const row of now){
    const last=beforeMap.get(row.name);
    for(const field of FIELDS){
      if(row[field]!==last[field])coefficients.push({
        cls:row.name,field,baseline:last[field],current:row[field],
        delta:row[field]-last[field]
      });
    }
  }
  const prior=generateReferenceVectors(dated),fresh=generateReferenceVectors(current);
  if(prior.length!==672||fresh.length!==672)throw Error('Incomplete 672-vector reference');
  const difference=[];
  let hpChanged=0,mpChanged=0,maxAbsHp=0,maxAbsMp=0;
  for(let index=0;index<fresh.length;index++){
    const old=prior[index],v=fresh[index];
    if(old.cls!==v.cls||old.level!==v.level||old.vit!==v.vit||old.spi!==v.spi)
      throw Error('Reference identity order drift');
    const hpDelta=v.hp-old.hp,mpDelta=v.mp-old.mp;
    if(hpDelta)hpChanged++;
    if(mpDelta)mpChanged++;
    maxAbsHp=Math.max(maxAbsHp,Math.abs(hpDelta));
    maxAbsMp=Math.max(maxAbsMp,Math.abs(mpDelta));
    if(hpDelta||mpDelta)difference.push({
      cls:v.cls,level:v.level,vit:v.vit,spi:v.spi,
      before:{hp:old.hp,mp:old.mp},current:{hp:v.hp,mp:v.mp},
      delta:{hp:hpDelta,mp:mpDelta}
    });
  }
  return {
    reference:'Pandora Saga OS class HP/MP coefficients, unbuffed only',
    baselineDate:'2026-10-11',
    baselineSha256:hash(before),currentSha256:hash(now),
    assumptions:'Class-only STA/SPR and level formula using half-to-even rounding; no race/equipment/soul/skill/guild/buff mechanics.',
    independentlyVerifiedFullGameParity:false,
    summary:{
      classCount:now.length,vectorCount:fresh.length,
      changedClasses:new Set(coefficients.map(x=>x.cls)).size,
      changedCoefficients:coefficients.length,
      changedVectors:difference.length,hpChanged,mpChanged,maxAbsHp,maxAbsMp,
      baselineMatchesCurrent:coefficients.length===0
    },
    coefficientDifferences:coefficients,
    vectorExamples:difference.slice(0,maxExamples),
    examplesTruncated:difference.length>maxExamples
  };
}

export async function readSource({source,fetchReference=fetch}={}){
  if(source){
    const content=await fs.readFile(source,'utf8');
    return {classes:JSON.parse(content),origin:{localFile:source,live:false}};
  }
  const response=await fetchReference(SOURCE_URL,{signal:AbortSignal.timeout(20000),
    headers:{accept:'application/json'}});
  if(!response?.ok)throw Error('Live reference unavailable; no fallback used: HTTP '+(response?.status??'unknown'));
  return {classes:JSON.parse(await response.text()),origin:{url:SOURCE_URL,live:true}};
}

async function main(argv){
  const flags=new Set(['--json','--strict']);
  let source=null;
  const args=[];
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==='--source'){
      if(source!==null||!argv[i+1]||argv[i+1].startsWith('--'))
        throw Error('--source requires exactly one local JSON file');
      source=argv[++i];
    }else if(flags.has(arg)&&!args.includes(arg))args.push(arg);
    else throw Error('Unknown or repeated audit argument: '+arg);
  }
  const baseline=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/pandora-os-classes-20261011.json'),'utf8'));
  const {classes,origin}=await readSource({source});
  const comparison=compareLiveVitals(classes,baseline);
  const result={checkedAt:new Date().toISOString(),source:origin,...comparison};
  if(args.includes('--json'))console.log(JSON.stringify(result,null,2));
  else{
    console.log('Current class HP/MP drift: '+JSON.stringify(result.summary));
    console.log('Source: '+JSON.stringify(origin));
    for(const entry of result.coefficientDifferences)
      console.log(entry.cls+' '+entry.field+' '+entry.baseline+' -> '+entry.current);
    console.log(result.assumptions);
  }
  if(args.includes('--strict')&&!result.summary.baselineMatchesCurrent)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1});
