import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import defaultFixture from '../fixtures/pandora-os-native-forth-matrix-20261029.json' with {type:'json'};
import { forthToUpgradeRules } from '../../scripts/lib/pandora_os_forth_rules.mjs';
import { convertedCurrentEffects } from '../../scripts/lib/current-effect-conversion.mjs';
const fixture=process.env.PANDORA_FORTH_MATRIX ? JSON.parse(fs.readFileSync(process.env.PANDORA_FORTH_MATRIX,'utf8')) : defaultFixture;

// Diagnostic coverage, not a claim of game combat parity. A mismatch is an
// investigation candidate: native rules may depend on other gem conditions.
test('inventory native refinement outputs against source snapshots without editing the catalog',async({page},testInfo)=>{
  const rows=fixture.items.map(item=>{
    const converted=forthToUpgradeRules(item.levels), keys=new Set();
    const expected=Array.from({length:11},(_,level)=>{
      const latest=Object.keys(item.levels).map(Number).filter(value=>value<=level).sort((a,b)=>b-a)[0];
      const effects=convertedCurrentEffects({effects:latest===undefined?[]:item.levels[latest]},false);
      for(const effect of effects.effects)keys.add(effect.stat+':'+effect.unit);
      return effects;
    });
    const text=(item.source.desc||'').toLowerCase(),elements=[0];
    if(text.includes('самоцвета льда'))elements.push(1);
    if(text.includes('самоцвета тьмы'))elements.push(5);
    if(text.includes('самоцвета света'))elements.push(4);
    return {id:item.id,serverId:item.serverId,engineId:item.engineId,category:item.category,elements:[...new Set(elements)],
      complete:converted.complete&&expected.every(value=>value.complete),keys:[...keys],expected:expected.map(value=>value.effects)};
  });
  const comparable=rows.filter(row=>row.complete);
  expect(rows.length).toBeGreaterThan(0);
  if(!process.env.PANDORA_FORTH_MATRIX){expect(rows).toHaveLength(30);expect(comparable).toHaveLength(26);}
  await page.goto('/');
  const actual=await page.evaluate(({catalog,rows})=>{
    PandoraRemaked.catalog.applySnapshot(catalog);
    const slots={20:1,30:2,31:3,32:4,33:5,34:6};
    function sum(key){
      const [stat,unit]=key.split(':');return (EquipOpt[Number(stat)]||[]).reduce((total,value)=>{
        const s=String(value),percent=s.endsWith('%'),number=percent?s.slice(0,-1):s;
        return percent===(unit==='percent')&&/^-?\d+(?:\.\d+)?$/.test(number)?total+Number(number):total;
      },0);
    }
    return rows.map(item=>{
      for(let slot=0;slot<Status.Equip.length;slot++)Status.Equip[slot]=[0,0,0,0,0,0,0];
      const slot=item.category<=13?0:slots[item.category];if(slot===undefined)throw Error('Unsupported slot');
      const gems=[];
      for(const kind of [0,1])for(const element of item.elements){
        const levels=[];
        for(const level of [0,1,2,3,4,5,6,7,8,9,10]){
          Status.Equip[slot]=[item.engineId,kind,element,level,0,0,0];EquipCheck();
          levels.push(Object.fromEntries(item.keys.map(key=>[key,sum(key)])));
        }
        gems.push({kind,element,levels});
      }
      return {id:item.id,gems};
    });
  },{catalog:fixture.catalog,rows:comparable});
  const differences=[];
  for(const row of comparable){
    const observed=actual.find(value=>value.id===row.id);
    for(const gem of observed.gems)for(let level=0;level<=10;level++)for(const key of row.keys){
      const [stat,unit]=key.split(':'),wanted=row.expected[level].find(value=>value.stat===Number(stat)&&value.unit===unit)?.value||0;
      const got=Number(((gem.levels[level][key]||0)-(gem.levels[0][key]||0)).toFixed(2));
      if(got!==wanted)differences.push({id:row.id,serverId:row.serverId,gemType:gem.kind,gemElement:gem.element,level,stat:Number(stat),unit,expected:wanted,actual:got});
    }
  }
  const report={revision:fixture.catalog.revision,compared:comparable.length,
    unsupported:rows.filter(row=>!row.complete).map(row=>({id:row.id,serverId:row.serverId})),differences,
    caveat:'Synthetic isolated equipment with fire and description-mentioned elements, two gem types; unmodelled conditions and combat semantics need review.'};
  fs.writeFileSync(testInfo.outputPath('native-forth-matrix.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({compared:report.compared,unsupported:report.unsupported.length,
    itemsWithDifferences:new Set(differences.map(row=>row.id)).size,differences:differences.length,
    examples:differences.slice(0,12)}));
  expect(actual).toHaveLength(comparable.length);
});
