#!/usr/bin/env node
/**
 * Read-only, fail-closed gameplay reference drift scanner for Pandora Saga OS.
 *
 * Compares *all* current items/souls gameplay fields to dated whole-registry
 * snapshots, all 28 class HP/MP coefficients to a dated class fixture; audits
 * player-eligible skills and racial references. Does NOT claim behavior parity.
 *
 *   node scripts/audit_pandora_os_gameplay_reference.mjs --json
 *   node scripts/audit_pandora_os_gameplay_reference.mjs --source-dir /path/to/current --json
 *   node scripts/audit_pandora_os_gameplay_reference.mjs --source-dir /path/to/current --strict
 */
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CLASS_ORDER} from './audit_pandora_os_class_coefficients.mjs';
import {NON_CHARACTER_SKILL_IDS,playerCharacterSkill} from './audit_pandora_os_bilingual_current.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FILES=['classes','items','souls','skills','racialPassives','strings.en','strings.ru'];
const ORIGIN='https://pandorasaga-os.com/gamedata/';
const FIELDS=Object.freeze(['hp.base','hp.lv','hp.vit','mp.base','mp.lv','mp.spi']);
const EXCLUDE_TEXT_FIELDS=new Set(['name','desc','icon','iconId']);
const hash=records=>createHash('sha256').update(JSON.stringify(records)).digest('hex');
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(!object(value)){
    if(typeof value==='number'&&!Number.isFinite(value))throw Error('Non-finite gameplay source value');
    return value;
  }
  return Object.fromEntries(Object.keys(value).filter(key=>!EXCLUDE_TEXT_FIELDS.has(key)).sort()
    .map(key=>[key,canonical(value[key])]));
}
function registry(source,label){
  if(!object(source))throw Error('Invalid '+label+' registry');
  return new Map(Object.entries(source).map(([id,value])=>{
    if(!/^\d+$/.test(id)||!object(value)||String(value.id)!==id)
      throw Error('Bad source identity '+label+'/'+id);
    return [id,canonical(value)];
  }));
}
export function compareCompleteGameplayRegistry(current,dated,label,{maxExamples=12}={}){
  if(!Number.isSafeInteger(maxExamples)||maxExamples<0||maxExamples>100)
    throw Error('Invalid example limit');
  const now=registry(current,label),old=registry(dated,label);
  const changed=[],removed=[],added=[];
  for(const [id,before] of old){
    const after=now.get(id);
    if(!after){removed.push(Number(id));continue;}
    if(JSON.stringify(before)===JSON.stringify(after))continue;
    const fields=[...new Set([...Object.keys(before),...Object.keys(after)])].sort()
      .filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key]));
    changed.push({id:Number(id),fields});
  }
  for(const id of now.keys())if(!old.has(id))added.push(Number(id));
  return {
    label,datedRecords:old.size,currentRecords:now.size,
    currentGameplayHash:hash([...now].sort(([a],[b])=>Number(a)-Number(b))),
    datedGameplayHash:hash([...old].sort(([a],[b])=>Number(a)-Number(b))),
    summary:{changed:changed.length,removed:removed.length,added:added.length,
      matchesDatedSource:changed.length===0&&removed.length===0&&added.length===0},
    examples:{changed:changed.slice(0,maxExamples),removed:removed.slice(0,maxExamples),
      added:added.slice(0,maxExamples)}
  };
}
function classes(reference){
  if(!object(reference)||Object.keys(reference).length!==CLASS_ORDER.length||
    CLASS_ORDER.some(cls=>!object(reference[cls])))throw Error('Expected all 28 known game classes');
  return CLASS_ORDER.map(cls=>{
    const record={id:cls};
    for(const key of FIELDS){
      const [group,field]=key.split('.');
      const value=reference[cls]?.[group]?.[field];
      if(typeof value!=='number'||!Number.isFinite(value)||value<0)
        throw Error('Missing game class coefficient '+cls+'.'+key);
      record[key]=value;
    }
    return record;
  });
}
export function compareClassCoefficients(current,dated,{maxExamples=12}={}){
  const now=classes(current),old=classes(dated),changed=[];
  now.forEach((row,i)=>FIELDS.forEach(key=>{
    if(row[key]!==old[i][key])changed.push({classId:row.id,coefficient:key,
      dated:old[i][key],current:row[key]});
  }));
  return {classes:now.length,coefficients:now.length*FIELDS.length,
    datedHash:hash(old),currentHash:hash(now),changed:changed.length,
    examples:changed.slice(0,maxExamples)};
}
export function auditSkillSources(skills,english,racial){
  const rows=registry(skills,'skills');
  if(!object(english)||!object(english.skills)||!object(racial))
    throw Error('Incomplete skill and racial reference source');
  const eligible=[],nonLearnable=[],unknownEnglish=[];
  for(const [id] of rows){
    const original=skills[id];
    if(playerCharacterSkill(original)){
      eligible.push(Number(id));
      if(typeof english.skills[id]?.n!=='string'||!english.skills[id].n.trim())
        unknownEnglish.push(Number(id));
    }else nonLearnable.push(Number(id));
  }
  for(const id of NON_CHARACTER_SKILL_IDS)
    if(rows.has(String(id))&&skills[id].learnable!==false)
      throw Error('Technical game action unexpectedly learnable '+id);
  const racialReferences={};
  for(const [key,entry] of Object.entries(racial)){
    if(!object(entry)||!Array.isArray(entry.skills))throw Error('Invalid racial passive list for '+key);
    const ids=entry.skills;
    for(const id of ids)if(!rows.has(String(id)))throw Error('Missing racial skill '+key+'/'+id);
    racialReferences[key]=ids.length;
  }
  return {
    allSkillRecords:rows.size,learnableClassSkills:eligible.length,nonLearnable:nonLearnable.length,
    missingEnglishOnLearnableSkills:unknownEnglish,
    excludedSiegeAndZoneIds:NON_CHARACTER_SKILL_IDS.filter(id=>rows.has(String(id))),
    quadrupleStabInternalVariant:rows.has('121703511')&&skills['121703511'].learnable===false,
    racialReferences
  };
}
export function auditCurrentGameReference(now,dated,{maxExamples=12}={}){
  for(const key of FILES)if(!object(now?.[key]))throw Error('Missing current full registry '+key);
  for(const key of ['classes','items','souls'])if(!object(dated?.[key]))
    throw Error('Missing dated full reference '+key);
  const classes=compareClassCoefficients(now.classes,dated.classes,{maxExamples});
  const items=compareCompleteGameplayRegistry(now.items,dated.items,'items',{maxExamples});
  const souls=compareCompleteGameplayRegistry(now.souls,dated.souls,'souls',{maxExamples});
  const skills=auditSkillSources(now.skills,now['strings.en'],now.racialPassives);
  if(now['strings.en'].locale!=='en'||now['strings.ru'].locale!=='ru')
    throw Error('Wrong language registries');
  return {
    scope:'All item/Soul numeric and gameplay metadata, class base HP/MP coefficients, live skills and racial identities',
    boundaries:'Not a verified in-game behavior audit; no client formula execution, buff stack or class-specific passive effects validated',
    classes,items,souls,skills,
    hasSourceDrift:Boolean(classes.changed||!items.summary.matchesDatedSource||!souls.summary.matchesDatedSource)
  };
}
export async function getCurrentGameReference({sourceDir=null,fetchReference=fetch}={}){
  const all={};
  await Promise.all(FILES.map(async name=>{
    if(sourceDir){all[name]=JSON.parse(await fs.readFile(path.join(sourceDir,name+'.json'),'utf8'));return;}
    const res=await fetchReference(ORIGIN+name+'.json',
      {signal:AbortSignal.timeout(24000),headers:{accept:'application/json'}});
    if(!res?.ok)throw Error('Current server not accessible: '+name+' HTTP '+(res?.status??'unknown'));
    all[name]=JSON.parse(await res.text());
  }));
  return all;
}
export async function loadDatedGameReference(root=ROOT){
  const read=async name=>JSON.parse(await fs.readFile(path.join(root,name),'utf8'));
  return {
    classes:await read('tests/fixtures/pandora-os-classes-20261011.json'),
    items:await read('admin-api/data/pandora-os-live-items-20261007.json'),
    souls:await read('admin-api/data/pandora-os-live-souls-20261007.json')
  };
}
async function main(argv){
  let sourceDir=null,json=false,strict=false;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--json'&&!json)json=true;
    else if(argv[i]==='--strict'&&!strict)strict=true;
    else if(argv[i]==='--source-dir'&&sourceDir===null&&argv[i+1]&&!argv[i+1].startsWith('--'))
      sourceDir=argv[++i];
    else throw Error('Unexpected/repeated argument '+argv[i]);
  }
  const now=await getCurrentGameReference({sourceDir});
  const dated=await loadDatedGameReference();
  const audit=auditCurrentGameReference(now,dated);
  const report={checkedAt:new Date().toISOString(),live:!sourceDir,
    source:sourceDir||ORIGIN,audit};
  if(json)console.log(JSON.stringify(report,null,2));
  else console.log('CURRENT_GAMEPLAY_AUDIT='+JSON.stringify(report));
  if(strict&&audit.hasSourceDrift)process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(err=>{console.error(err.stack||err.message);process.exitCode=1;});
