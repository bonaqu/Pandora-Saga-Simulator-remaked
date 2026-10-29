import {test,expect} from '@playwright/test';
import fixture from '../fixtures/pandora-os-native-forth-sample-20261029.json' with {type:'json'};
import { convertedCurrentEffects } from '../../scripts/lib/current-effect-conversion.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';

test('published native weapon upgrades apply the current source milestones without stacking',async({page})=>{
  const specifications={
    'equipment.11.14':{stat:62,step:2,str:1},
    'equipment.5.27':{stat:7,step:15,str:1},
    'equipment.5.28':{stat:7,step:15,str:2}
  };
  const armorSource=baselineById.get('equipment.31.1'),armorIdentity=sourceIdentity(armorSource),armorEdit=draftFromSource(armorSource,'equipment');
  armorEdit.effectMode='patch';armorEdit.effects=[{stat:33,value:20,unit:'percent'}];
  const armor=compileRecord(validateDraft(armorEdit,armorIdentity),armorIdentity,armorSource);
  const proposed={...fixture.catalog,revision:93,impactRevision:93,records:fixture.catalog.records.map(record=>{
    const spec=specifications[record.id];
    return {...record,upgradeBonuses:[{stat:spec.stat,value:spec.step,unit:'flat',from:2,every:2,to:10},
      {stat:1,value:spec.str,unit:'flat',from:7,every:1,to:7}],
      ...(record.category===5?{nativeUpgradePolicy:'replace-legacy-zephyrus-upgrade'}:{})};
  }).concat(armor)};
  await page.goto('/');
  const values=await page.evaluate(({catalog,proposed})=>{
    function total(stat){return (EquipOpt[stat]||[]).reduce((sum,value)=>{
      const text=String(value);return /^-?\d+(?:\.\d+)?$/.test(text)?sum+Number(text):sum;
    },0);}
    function aura(){return (EquipOpt[33]||[]).filter(value=>String(value).endsWith('%')).reduce((sum,value)=>sum+parseFloat(value),0);}
    function item(id,element=0){return [0,1,2,3,4,5,6,7,8,9,10].map(level=>{
      Status.Equip[0]=[id,0,element,level,0,0,0];EquipCheck();return {str:total(1),mp:total(7),accuracy:total(62),aura:aura()};
    });}
    PandoraRemaked.catalog.applySnapshot(catalog);
    const old={maul:item(110014),zephyrusA:item(50027),zephyrusS:item(50028)};
    Status.Equip[0]=[50028,0,0,7,0,0,0];EquipCheck();
    const saved=PandoraRemaked.adapter.serialize(),migration=PandoraRemaked.catalog.migratePayload(saved,proposed);
    Status.Equip[0]=[0,0,0,0,0,0,0];EquipCheck();PandoraRemaked.catalog.applySnapshot(proposed);
    const corrected={maul:item(110014),zephyrusA:item(50027),zephyrusS:item(50028)};
    const otherGem={maul:item(110014,1),zephyrusA:item(50027,1),zephyrusS:item(50028,1)};
    Status.Equip[0]=[0,0,0,0,0,0,0];Status.Equip[3]=[310001,0,0,0,0,0,0];EquipCheck();const armorAura=aura();
    Status.Equip[0]=[50028,0,0,7,0,0,0];EquipCheck();const armorWithZephyrus=aura();
    Status.Equip[0]=[0,0,0,0,0,0,0];Status.Equip[3]=[0,0,0,0,0,0,0];EquipCheck();PandoraRemaked.catalog.applySnapshot(catalog);
    const restored={zephyrusA:item(50027),zephyrusS:item(50028)};
    return {old,corrected,otherGem,restored,armorAura,armorWithZephyrus,migration:migration.changes};
  },{catalog:fixture.catalog,proposed});
  function changes(rows,key){return rows.map(row=>row[key]-rows[0][key]);}
  function expected(itemId,stat){const item=fixture.items.find(row=>row.id===itemId);return Array.from({length:11},(_,level)=>{
    const latest=Object.keys(item.levels).map(Number).filter(value=>value<=level).sort((a,b)=>b-a)[0];
    const converted=convertedCurrentEffects({effects:latest===undefined?[]:item.levels[latest]},false);
    expect(converted.complete).toBe(true);return converted.effects.find(effect=>effect.stat===stat&&effect.unit==='flat')?.value||0;
  });}
  expect(changes(values.old.maul,'accuracy')).toEqual(Array(11).fill(0));
  for(const [key,id,stat,field] of [['maul','equipment.11.14',62,'accuracy'],['zephyrusA','equipment.5.27',7,'mp'],['zephyrusS','equipment.5.28',7,'mp']]) {
    expect(changes(values.corrected[key],field)).toEqual(expected(id,stat));
    expect(changes(values.corrected[key],'str')).toEqual(expected(id,1));
    expect(changes(values.otherGem[key],field)).toEqual(expected(id,stat));
    expect(changes(values.otherGem[key],'str')).toEqual(expected(id,1));
  }
  expect(changes(values.old.zephyrusA,'aura')).toEqual([0,0,0,0,0,20,20,20,20,20,20]);
  expect(changes(values.old.zephyrusS,'aura')).toEqual([0,0,0,0,0,20,20,50,50,50,50]);
  expect(changes(values.corrected.zephyrusA,'aura')).toEqual(Array(11).fill(0));
  expect(changes(values.corrected.zephyrusS,'aura')).toEqual(Array(11).fill(0));
  expect(values.armorAura).toBe(20);expect(values.armorWithZephyrus).toBe(20);
  const migration=values.migration.find(change=>change.kind==='equipment'&&change.id===50028);
  expect(migration.details.join(' ')).toContain('0→45');expect(migration.details.join(' ')).toContain('0→2');
  expect(values.restored).toEqual({zephyrusA:values.old.zephyrusA,zephyrusS:values.old.zephyrusS});
});
