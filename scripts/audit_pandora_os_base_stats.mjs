#!/usr/bin/env node
// Compare current public source tables with preserved simulator inputs.
// This is an audit, not a write to the catalog or a proof of combat parity.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {CLASS_IDS} from './lib/current-skill-audit.mjs';

const races = ['HUMAN','ELF','DWARF','MYLIN','ENKIDU','RAPIN'];
const families = ['WARRIOR','SCOUT','ACOLYTE','MAGE'];
const stats = ['vit','str','agi','dex','spi','int'];
function finite(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 10000) throw Error('Invalid '+label);
  return value;
}
function table(text, expression, count, width, label) {
  const rows = new Map();
  for (const match of text.matchAll(expression)) {
    const id = Number(match[1]), values = match[2].split(',').map(s => Number(s.trim()));
    if (rows.has(id) || values.length !== width || values.some(v => !Number.isInteger(v))) throw Error('Malformed '+label);
    rows.set(id,values);
  }
  for (let i=0;i<count;i++) if (!rows.has(i)) throw Error('Missing '+label+' '+i);
  return rows;
}
export function parseRetained(ini, bonus, point) {
  const base = table(ini, /Status\['Set'\]\['Base'\]\[\s*(\d+)\]\s*=\s*new Array\('[^']*'\s*,([^;]+)\);/g, 6, 6, 'race baseline');
  const job = table(ini, /Status\['Set'\]\['Job'\]\[\s*(\d+)\]\s*=\s*new Array\('[^']*'\s*,([^;]+)\);/g, 4, 6, 'job baseline');
  const classes = new Map();
  for (const match of ini.matchAll(/Name\['Job'\]\[\s*(\d+)\]\s*=\s*new Array\((\d+)\s*,/g)) {
    const id=Number(match[1]); if (classes.has(id)) throw Error('Duplicate class baseline'); classes.set(id,Number(match[2]));
  }
  for (let i=0;i<28;i++) if (!classes.has(i) || !families[classes.get(i)]) throw Error('Missing class baseline '+i);
  const gains = table(bonus, /^\s*BPt\[\s*(\d+)\]\s*=\s*new Array\(([^;]+)\);/gm, 56, 3, 'level gain');
  const costs = table(point, /^\s*SPt\[\s*(\d+)\]\s*=\s*new Array\(([^;]+)\);/gm, 100, 2, 'point cost');
  const max = /MaxSt\s*=\s*(\d+)\s*;/.exec(ini), level = /MaxLv\s*=\s*(\d+)\s*;/.exec(ini);
  if (!max || !level) throw Error('Missing simulator limits');
  return {base,job,classes,gains,costs,maxStat:Number(max[1]),maxLevel:Number(level[1])};
}
export function compareBaseStats(tables, classes, retained) {
  if (!tables?.raceInit || !tables?.jobInit || !tables?.abilityPoint || !tables?.exp || !classes) throw Error('Missing current source data');
  const differences = [], caps = [];
  for (let index=0;index<CLASS_IDS.length;index++) {
    const id=CLASS_IDS[index], record=classes[id], family=record?.baseClass || id;
    if (!families.includes(family)) throw Error('Unknown source base class '+id);
    const nativeFamily=families[retained.classes.get(index)];
    for (let raceIndex=0;raceIndex<races.length;raceIndex++) for (let i=0;i<stats.length;i++) {
      const stat=stats[i], race=races[raceIndex];
      const expected=finite(tables.raceInit[race]?.[stat],race+'.'+stat)+finite(tables.jobInit[family]?.[stat],family+'.'+stat);
      const actual=retained.base.get(raceIndex)[i]+retained.job.get(retained.classes.get(index))[i];
      if (actual!==expected) differences.push({race,classId:id,stat,actual,expected,nativeFamily,family});
    }
    for (const stat of stats) {
      const expected=finite(record?.statCaps?.[stat], id+'.statCaps.'+stat);
      if (expected!==retained.maxStat) caps.push({classId:id,stat,actual:retained.maxStat,expected});
    }
  }
  const costs=[]; for (let value=2;value<=99;value++) {
    const expected=finite(tables.abilityPoint[value], 'abilityPoint '+value), actual=retained.costs.get(value)[0];
    if (actual!==expected) costs.push({value,actual,expected});
  }
  const gains=[]; let actual=0,expected=0;
  for (let level=2;level<=55;level++) {
    actual+=retained.gains.get(level)[0]; expected+=finite(tables.exp[level-1]?.ability,'level '+level);
    if(actual!==expected) gains.push({level,actual,expected});
  }
  return {comparedInitial:6*28*6,differences,capsCompared:28*6,caps,costsCompared:98,costs,levelsCompared:54,gains,
    maxLevel:retained.maxLevel,currentSourceCap:tables.levelCap,
    elfCleric:stats.map(stat=>tables.raceInit.ELF[stat]+tables.jobInit.ACOLYTE[stat]),
    caveat:'Static inputs only; published class overrides, bonuses, reset/load behavior and client-side calculations require separate verification.'};
}
async function get(url) {
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw Error('GET failed: '+url+' HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer()); return {url,sha256:createHash('sha256').update(bytes).digest('hex'),data:JSON.parse(bytes.toString('utf8'))};
}
async function main() {
  const args=process.argv.slice(2);
  if(args.length!==2 || args[0]!=='--output') throw Error('Usage: node scripts/audit_pandora_os_base_stats.mjs --output NEW_FILE');
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const [tables,classes]=await Promise.all(['tables','classes'].map(name=>get('https://pandorasaga-os.com/gamedata/'+name+'.json')));
  const read=file=>fs.readFileSync(path.join(root,file),'utf8');
  const retained=parseRetained(read('js/ini.js'),read('js/bonus.js'),read('js/status_point.js'));
  const result={checkedAt:new Date().toISOString(),sources:[tables,classes].map(({url,sha256})=>({url,sha256})),
    ...compareBaseStats(tables.data,classes.data,retained)};
  fs.writeFileSync(args[1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output:args[1],initialDifferences:result.differences.length,capDifferences:result.caps.length,
    costDifferences:result.costs.length,budgetDifferences:result.gains.length,elfCleric:result.elfCleric}));
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(error=>{console.error(error.message);process.exitCode=1;});
