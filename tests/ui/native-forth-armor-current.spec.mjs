import {test,expect} from '@playwright/test';
import fixture from '../fixtures/pandora-os-native-forth-matrix-20261029.json' with {type:'json'};
import { convertedCurrentEffects } from '../../scripts/lib/current-effect-conversion.mjs';

test('reviewed armor upgrades match source tiers and preserve the Gold set effect',async({page})=>{
  const specs={
    'equipment.31.64':{policy:'replace-legacy-gold-plate-upgrade',rules:[{stat:52,unit:'percent',value:-2,from:5,every:1,to:10}]},
    'equipment.32.82':{policy:'replace-legacy-lunar-gloves-upgrade',rules:[{stat:5,unit:'flat',value:1,from:7,every:1,to:7},{stat:42,unit:'flat',value:2,from:7,every:1,to:7}]},
    'equipment.32.61':{policy:'replace-legacy-mana-bracelets-upgrade',rules:[{stat:2,unit:'flat',value:1,from:7,every:1,to:7}]}
  };
  const ids=Object.keys(specs),old={...fixture.catalog,records:fixture.catalog.records.filter(row=>ids.includes(row.id))};
  const next={...old,revision:93,impactRevision:93,records:old.records.map(row=>({...row,nativeUpgradePolicy:specs[row.id].policy,upgradeBonuses:specs[row.id].rules}))};
  await page.goto('/');
  const result=await page.evaluate(({old,next})=>{
    const keys=['52:percent','5:flat','42:flat','2:flat','7:flat','151:flat'];
    function total(key){const [stat,unit]=key.split(':');return (EquipOpt[Number(stat)]||[]).reduce((sum,value)=>{
      const text=String(value),percent=text.endsWith('%'),n=percent?text.slice(0,-1):text;
      return percent===(unit==='percent')&&/^-?\d+(?:\.\d+)?$/.test(n)?sum+Number(n):sum;
    },0);}
    function reset(){for(let i=0;i<Status.Equip.length;i++)Status.Equip[i]=[0,0,0,0,0,0,0];EquipCheck();}
    function item(slot,id){reset();return [0,1,2,3,4,5,6,7,8,9,10].map(level=>{
      Status.Equip[slot]=[id,0,0,level,0,0,0];EquipCheck();return Object.fromEntries(keys.map(key=>[key,total(key)]));
    });}
    PandoraRemaked.catalog.applySnapshot(old);
    const before={gold:item(3,310064),lunar:item(4,320082),mana:item(4,320061)};
    reset();PandoraRemaked.catalog.applySnapshot(next);
    const after={gold:item(3,310064),lunar:item(4,320082),mana:item(4,320061)};
    reset();
    for(const [slot,id] of [[2,300072],[3,310064],[4,320010],[5,330048],[6,340071]])Status.Equip[slot]=[id,0,0,slot===3?7:0,0,0,0];
    EquipCheck();const setKnockdown=total('151:flat');
    reset();PandoraRemaked.catalog.applySnapshot(old);
    const restored={gold:item(3,310064),lunar:item(4,320082),mana:item(4,320061)};
    return {before,after,restored,setKnockdown};
  },{old,next});
  function deltas(rows,key){return rows.map(row=>Number((row[key]-rows[0][key]).toFixed(2)));}
  function expected(id,stat,unit){const item=fixture.items.find(row=>row.id===id);return Array.from({length:11},(_,level)=>{
    const latest=Object.keys(item.levels).map(Number).filter(value=>value<=level).sort((a,b)=>b-a)[0];
    const effects=convertedCurrentEffects({effects:latest===undefined?[]:item.levels[latest]},false);
    expect(effects.complete).toBe(true);return effects.effects.find(value=>value.stat===stat&&value.unit===unit)?.value||0;
  });}
  expect(deltas(result.before.gold,'52:percent')[7]).toBe(-8);
  expect(deltas(result.before.lunar,'42:flat')[7]).toBe(4);
  expect(deltas(result.before.mana,'7:flat')[7]).toBe(60);
  expect(deltas(result.after.gold,'52:percent')).toEqual(expected('equipment.31.64',52,'percent'));
  expect(deltas(result.after.lunar,'5:flat')).toEqual(expected('equipment.32.82',5,'flat'));
  expect(deltas(result.after.lunar,'42:flat')).toEqual(expected('equipment.32.82',42,'flat'));
  expect(deltas(result.after.mana,'2:flat')).toEqual(expected('equipment.32.61',2,'flat'));
  expect(deltas(result.after.mana,'7:flat')).toEqual(Array(11).fill(0));
  expect(result.setKnockdown).toBe(255);
  expect(result.restored).toEqual(result.before);
});
