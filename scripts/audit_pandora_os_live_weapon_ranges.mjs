#!/usr/bin/env node
/**
 * Read-only current Pandora Saga OS weapon BASE reach drift inventory.
 *
 * node scripts/audit_pandora_os_live_weapon_ranges.mjs --json
 * node scripts/audit_pandora_os_live_weapon_ranges.mjs --source current-items.json --json
 * node scripts/audit_pandora_os_live_weapon_ranges.mjs --source current-items.json --strict
 *
 * The live endpoint is always fetched explicitly when --source is absent.
 * The dated fixture is used only as the comparison baseline, NEVER as a
 * fallback for inaccessible live network requests.
 *
 * NOT effective attack range: Riding, skills, EquipOpt[40/41], equipment
 * and conditional effects are intentionally outside this comparison.
 */
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const SOURCE_URL='https://pandorasaga-os.com/gamedata/items.json';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const own=Object.prototype.hasOwnProperty;
const hash=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');

export function canonicalWeaponFixture(fixture){
  if(fixture?.source!==SOURCE_URL ||
     !/^\d{4}-\d{2}-\d{2}$/.test(fixture?.capturedDate||'') ||
     !Array.isArray(fixture?.items) || fixture.items.length!==164)
    throw Error('Expected exact dated 164-weapon reference snapshot');
  const seenIds=new Set(),seenOfficial=new Set(),seenPositions=new Set();
  return fixture.items.map(row=>{
    if(!row||typeof row!=='object'||
       !(/^(?:equipment\.(?:[0-9]|1[0-3])\.[1-9]\d*|modern\.equipment\.[a-f0-9-]{36})$/.test(row.id))||
       !Number.isSafeInteger(row.officialId)||row.officialId<=0||
       !Number.isSafeInteger(row.range)||row.range<=0||
       !Number.isSafeInteger(row.category)||row.category<0||row.category>13||
       !Number.isSafeInteger(row.index)||row.index<1||
       !row.engineKey||typeof row.engineKey!=='string'||
       !row.kind||typeof row.kind!=='string')
      throw Error('Invalid saved weapon identity/range');
    const pos=row.category+'.'+row.index;
    if(seenIds.has(row.id)||seenOfficial.has(row.officialId)||seenPositions.has(pos)||
       (row.id.startsWith('equipment.')&&row.id!=='equipment.'+pos)||
       (row.id.startsWith('modern.')&&row.engineKey!=='Modern:'+row.id))
      throw Error('Duplicate or inconsistent weapon reference identity');
    seenIds.add(row.id);seenOfficial.add(row.officialId);seenPositions.add(pos);
    return {id:row.id,officialId:row.officialId,range:row.range,
      kind:row.kind,slot:'weapon'};
  });
}

export function compareLiveWeaponRanges(source,fixture,{maxExamples=24}={}){
  if(!Number.isSafeInteger(maxExamples)||maxExamples<0||maxExamples>164)
    throw Error('Invalid bounded weapon example limit');
  if(!source||typeof source!=='object'||Array.isArray(source))
    throw Error('Weapon registry must be an ID-keyed JSON object');
  const saved=canonicalWeaponFixture(fixture);
  const actual=[],changes=[];
  let found=0,missing=0,rangeChanges=0,kindChanges=0,slotChanges=0,
      unknownRanges=0,maxAbsRangeDelta=0;
  for(const item of saved){
    const server=own.call(source,String(item.officialId))
      ?source[String(item.officialId)]:null;
    let current;
    if(server===null){
      missing++;
      current={id:item.id,officialId:item.officialId,range:null,kind:null,slot:null};
    }else{
      if(!server||typeof server!=='object'||Array.isArray(server)||
         server.id!==item.officialId)
        throw Error('Current server item identity mismatch for '+item.officialId);
      const range=server.range;
      if(range!==null&&range!==undefined&&
         (!Number.isSafeInteger(range)||range<=0))
        throw Error('Invalid current raw weapon range for '+item.officialId);
      const kind=typeof server.kind==='string'&&server.kind?server.kind:null;
      const slot=typeof server.slot==='string'&&server.slot?server.slot:null;
      current={id:item.id,officialId:item.officialId,range:range??null,kind,slot};
      found++;
    }
    actual.push(current);
    const changeType=[];
    if(item.range!==current.range){
      rangeChanges++;changeType.push('baseRange');
      if(current.range!==null)
        maxAbsRangeDelta=Math.max(maxAbsRangeDelta,Math.abs(current.range-item.range));
    }
    if(item.kind!==current.kind){kindChanges++;changeType.push('kind');}
    if(item.slot!==current.slot){slotChanges++;changeType.push('slot');}
    if(current.range===null)unknownRanges++;
    if(changeType.length)changes.push({
      id:item.id,officialId:item.officialId,changeType,
      baseline:{range:item.range,kind:item.kind,slot:item.slot},
      current:{range:current.range,kind:current.kind,slot:current.slot},
      rangeDelta:current.range===null?null:current.range-item.range
    });
  }
  return {
    reference:'Pandora Saga OS raw weapon BASE range only',
    baselineDate:fixture.capturedDate,
    baselineSha256:hash(saved),currentSha256:hash(actual),
    sourceUrl:SOURCE_URL,
    independentlyVerifiedEffectiveRange:false,
    exclusions:'No Riding, EquipOpt[40/41], skill, class, soul, enhancement or conditional range modifiers; raw source units are not meters.',
    summary:{
      weaponCount:saved.length,foundWeapons:found,missingWeapons:missing,
      changedWeapons:changes.length,rangeChanges,kindChanges,slotChanges,
      unknownRanges,maxAbsRangeDelta,baselineMatchesCurrent:changes.length===0
    },
    examples:changes.slice(0,maxExamples),
    examplesTruncated:changes.length>maxExamples
  };
}

export async function readSource({source,fetchReference=fetch}={}){
  if(source){
    const content=await fs.readFile(source,'utf8');
    return {items:JSON.parse(content),origin:{localFile:source,live:false}};
  }
  const response=await fetchReference(SOURCE_URL,{
    signal:AbortSignal.timeout(20000),headers:{accept:'application/json'}
  });
  if(!response?.ok)
    throw Error('Live weapon source unavailable; no dated fallback used: HTTP '+
      (response?.status??'unknown'));
  return {items:JSON.parse(await response.text()),
    origin:{url:SOURCE_URL,live:true}};
}

async function main(argv){
  let source=null,json=false,strict=false,maxExamples=24;
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==='--source'){
      if(source!==null||!argv[i+1]||argv[i+1].startsWith('--'))
        throw Error('--source requires one local JSON file');
      source=argv[++i];
    }else if(arg==='--max-examples'){
      if(!argv[i+1]||!/^\d+$/.test(argv[i+1]))
        throw Error('--max-examples requires a nonnegative integer');
      maxExamples=Number(argv[++i]);
    }else if(arg==='--json'&&!json)json=true;
    else if(arg==='--strict'&&!strict)strict=true;
    else throw Error('Unknown or repeated range audit argument: '+arg);
  }
  const fixture=JSON.parse(await fs.readFile(path.join(root,
    'tests/fixtures/pandora-os-weapon-ranges-20261011.json'),'utf8'));
  const {items,origin}=await readSource({source});
  const report={checkedAt:new Date().toISOString(),source:origin,
    ...compareLiveWeaponRanges(items,fixture,{maxExamples})};
  if(json)console.log(JSON.stringify(report,null,2));
  else{
    console.log('Weapon base range drift: '+JSON.stringify(report.summary));
    console.log('Source: '+JSON.stringify(origin));
    for(const row of report.examples)
      console.log(row.id+' '+row.changeType.join(',')+' '+
        JSON.stringify(row.baseline)+' -> '+JSON.stringify(row.current));
    console.log(report.exclusions);
  }
  if(strict&&!report.summary.baselineMatchesCurrent)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(error=>{
    console.error(error.message);process.exitCode=1;
  });
