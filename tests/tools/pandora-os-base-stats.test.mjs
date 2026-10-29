import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASS_IDS} from '../../scripts/lib/current-skill-audit.mjs';
import {parseRetained,compareBaseStats} from '../../scripts/audit_pandora_os_base_stats.mjs';

const read = file => readFileSync(new URL('../../'+file,import.meta.url),'utf8');
const retained = () => parseRetained(read('js/ini.js'),read('js/bonus.js'),read('js/status_point.js'));
// Dated source values; this is not an unqualified claim about every game build.
function source() {
  const keys=['vit','str','agi','dex','spi','int'], object=values=>Object.fromEntries(keys.map((key,i)=>[key,values[i]]));
  const raceInit=Object.fromEntries(Object.entries({HUMAN:[4,6,4,5,4,5],ELF:[2,4,5,4,6,7],
    DWARF:[5,8,4,6,2,3],MYLIN:[4,6,8,6,2,2],ENKIDU:[7,7,3,4,5,2],RAPIN:[2,2,5,5,8,6]}).map(([id,values])=>[id,object(values)]));
  const jobInit=Object.fromEntries(Object.entries({WARRIOR:[3,2,0,1,0,0],SCOUT:[1,1,2,2,0,0],
    ACOLYTE:[1,1,0,0,2,2],MAGE:[0,0,0,1,2,3]}).map(([id,values])=>[id,object(values)]));
  const family=['WARRIOR','SCOUT','ACOLYTE','MAGE'];
  const classes=Object.fromEntries(CLASS_IDS.map((id,index)=>[id,{baseClass:family[Math.floor(index/7)],statCaps:object([99,99,99,99,99,99])}]));
  const abilityPoint=Object.fromEntries(Array.from({length:98},(_,i)=>[i+2, i+2<=30?2:i+2<=50?3:i+2<=70?4:i+2<=90?5:6]));
  const exp=Object.fromEntries(Array.from({length:54},(_,i)=>{const n=i+1;return [n,{ability:n<=8?6:n<=18?8:n<=28?10:n<=38?12:n<=48?14:n===49?16:8}];}));
  return {tables:{raceInit,jobInit,abilityPoint,exp,levelCap:45},classes};
}

test('all class/race bases, stat caps, prices and level budgets match dated input, including the observed Cleric',()=>{
  const {tables,classes}=source(), result=compareBaseStats(tables,classes,retained());
  assert.equal(result.comparedInitial,1008); assert.deepEqual(result.differences,[]);
  assert.equal(result.capsCompared,168); assert.deepEqual(result.caps,[]);
  assert.equal(result.costsCompared,98); assert.deepEqual(result.costs,[]);
  assert.equal(result.levelsCompared,54); assert.deepEqual(result.gains,[]);
  assert.deepEqual(result.elfCleric,[3,5,5,4,8,9]);
  assert.equal(result.maxLevel,55); assert.equal(result.currentSourceCap,45);
  const cost=(start,end)=>Array.from({length:end-start},(_,i)=>tables.abilityPoint[start+i+1]).reduce((sum,v)=>sum+v,0);
  assert.deepEqual([cost(9,99),cost(4,30),cost(8,30)],[336,52,44]);
  assert.equal(cost(9,99)+cost(4,30)+cost(8,30),432);
});

test('audit flags source changes and fails closed on missing source fields',()=>{
  const {tables,classes}=source(); tables.raceInit.ELF.int++; tables.abilityPoint[31]++;
  tables.exp[44].ability++; classes.CLERIC.statCaps.int=95;
  const result=compareBaseStats(tables,classes,retained());
  assert.equal(result.differences.length,28); assert.equal(result.costs.length,1);
  assert.deepEqual(result.caps,[{classId:'CLERIC',stat:'int',actual:99,expected:95}]);
  assert.ok(result.gains.some(row=>row.level===45 && row.expected===433));
  delete tables.raceInit.ELF.int;
  assert.throws(()=>compareBaseStats(tables,classes,retained()),/Invalid ELF.int/);
});
