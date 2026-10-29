import { test, expect } from '@playwright/test';
import { draftFromSource, validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { currentRacialDrafts } from '../../admin-api/src/current-racial-data.mjs';

function record(id, value) {
  const source=equipment.records.find(row=>row.id===id), identity={id,kind:'equipment',category:source.legacy_category_id,index:source.legacy_item_index};
  const edit=draftFromSource(source,'equipment'); edit.baseRange=value;
  return compileRecord(validateDraft(edit,identity),identity,source);
}
function snapshot(revision,records) {
  return {ok:true,schemaVersion:1,sourceFingerprint:equipment.metadata.generated_from[0].sha256,
    characterSourceFingerprint:character.sourceFingerprint,revision,impactRevision:revision,records};
}

test('catalog base range overrides the verified fallback and follows revisions and weapon type',async({page})=>{
  const sword=record('equipment.0.10',160), bow=record('equipment.8.3',3000);
  const data=snapshot(1,[sword,bow]);
  await page.goto('/');
  await expect(page.locator('#StatusView #Status_40')).toHaveCount(1);
  await expect(page.locator('#StatusView #Status_41')).toHaveCount(1);
  const values=await page.evaluate(({data})=>{
    const get=()=>({melee:document.getElementById('Status_40').textContent, ranged:document.getElementById('Status_41').textContent});
    const calculate=()=>{Calc('RangeMelee');Calc('RangeRange');return get();};
    if(!PandoraRemaked.adapter.selectEquipment(0,10))throw Error('Sword unavailable');
    const old=calculate();PandoraRemaked.catalog.applySnapshot(data);const changed=calculate();
    const saved=PandoraRemaked.adapter.serialize();
    if(!PandoraRemaked.adapter.selectEquipment(0,80003))throw Error('Bow unavailable');
    const ranged=calculate();PandoraRemaked.adapter.load(saved);const restored=calculate();
    const next={...data,revision:2,impactRevision:2,records:[{...data.records[0],baseRange:185},data.records[1]]};
    const migration=PandoraRemaked.catalog.migratePayload(saved,next);
    PandoraRemaked.catalog.applySnapshot(next,{rebuild:false});PandoraRemaked.adapter.load(migration.payload);
    const updated=calculate();
    PandoraRemaked.catalog.applySnapshot({...data,revision:3,impactRevision:3,records:[]});const fallback=calculate();
    return {old,changed,ranged,restored,updated,fallback,changes:migration.changes};
  },{data});
  expect(values.old.melee).toBe('115');expect(values.changed.melee).toBe('160');
  expect(values.ranged.ranged).toBe('3000');expect(values.restored.melee).toBe('160');
  expect(values.updated.melee).toBe('185');
  expect(values.changes[0].details.join(' ')).toContain('160→185');
  expect(values.fallback.melee).toBe('115');
});

test('invalid range cannot be applied to a soul or armor',async({page})=>{
  const data=snapshot(1,[{...record('equipment.0.10',160),category:30,id:'equipment.30.1',index:1,engineId:300001}]);
  await page.goto('/');
  const error=await page.evaluate(data=>{try{PandoraRemaked.catalog.validateSnapshot(data);return '';}catch(e){return e.message;}},data);
  expect(error).toContain('Invalid weapon base range');
});

test('configured racial and equipment bonuses change existing range results and follow selections',async({page})=>{
  const racial=currentRacialDrafts().find(row=>row.id==='racial_skill.1.1');
  racial.rangeBonus={amount:500,appliesTo:'ranged'};
  const source=baselineById.get(racial.id),identity=sourceIdentity(source);
  const eye=compileRecord(validateDraft(racial,identity),identity,source);
  const itemSource=equipment.records.find(row=>row.id==='equipment.30.1');
  const itemIdentity={id:itemSource.id,kind:'equipment',category:itemSource.legacy_category_id,index:itemSource.legacy_item_index};
  const itemEdit=draftFromSource(itemSource,'equipment');itemEdit.rangeBonus={amount:150,appliesTo:'ranged'};
  const item=compileRecord(validateDraft(itemEdit,itemIdentity),itemIdentity,itemSource);
  const data=snapshot(1,[record('equipment.0.10',160),record('equipment.8.3',3000),eye,item]);
  await page.goto('/');
  const result=await page.evaluate(data=>{
    PandoraRemaked.catalog.applySnapshot(data);
    function choose(id,index){const el=document.getElementById(id);el.selectedIndex=index;el.onchange();}
    function calculate(){Calc('RangeMelee');Calc('RangeRange');return {melee:document.getElementById('Status_40').textContent,ranged:document.getElementById('Status_41').textContent};}
    choose('SelRace',1);choose('SelRSkill',1);
    if(!PandoraRemaked.adapter.selectEquipment(0,80003))throw Error('Bow unavailable');
    Status.Equip[2][0]=300001;const both=calculate();
    const saved=PandoraRemaked.adapter.serialize();
    const updated={...data,revision:2,impactRevision:2,records:data.records.map(row=>
      row.id==='equipment.30.1'?{...row,rangeBonus:{amount:200,appliesTo:'ranged'}}:
      row.id==='racial_skill.1.1'?{...row,rangeBonus:{amount:600,appliesTo:'ranged'}}:row)};
    const migration=PandoraRemaked.catalog.migratePayload(saved,updated);
    choose('SelRSkill',0);const itemOnly=calculate();
    Status.Equip[2][0]=300000;const noBonuses=calculate();
    choose('SelRSkill',1);const racialOnly=calculate();
    choose('SelRace',0);
    if(!PandoraRemaked.adapter.selectEquipment(0,80003))throw Error('Bow unavailable after race change');
    const otherRace=calculate();
    choose('SelRace',1);choose('SelRSkill',1);
    if(!PandoraRemaked.adapter.selectEquipment(0,10))throw Error('Sword unavailable');
    const melee=calculate();
    return {both,itemOnly,noBonuses,racialOnly,otherRace,melee,changes:migration.changes};
  },data);
  expect(result.both.ranged).toBe('3650');expect(result.itemOnly.ranged).toBe('3150');
  expect(result.noBonuses.ranged).toBe('3000');expect(result.racialOnly.ranged).toBe('3500');
  expect(result.otherRace.ranged).toBe('3000');
  expect(result.melee.melee).toBe('160');
  expect(result.changes.some(change=>change.id===300001&&change.details.join(' ').includes('+150'))).toBe(true);
  expect(result.changes.some(change=>change.id==='racial_skill.1.1'&&change.details.join(' ').includes('+600'))).toBe(true);
});
