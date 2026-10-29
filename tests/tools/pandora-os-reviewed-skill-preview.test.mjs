import test from 'node:test';
import assert from 'node:assert/strict';
import { currentActiveProfileDrafts, currentActiveProfileReference } from '../../admin-api/src/current-active-profiles.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { compileRecord } from '../../admin-api/src/catalog-model.mjs';
import { previewReviewedSkillProfiles } from '../../scripts/lib/reviewed-skill-profile-preview.mjs';

function fixture() {
  const id='skill_entry.5.3', reviewed=currentActiveProfileReference.records.find(row=>row.id===id);
  const current=currentActiveProfileDrafts().find(row=>row.id===id);delete current.profiles;
  // An existing editorial JP translation must be carried into each variant.
  current.names.jp='編集済み';current.description.jp='既存の説明';
  const source=baselineById.get(id),identity=sourceIdentity(source),published=compileRecord(current,identity,source);
  const rows=reviewed.rows.map(row=>({id,sourceId:row.sourceId,status:row.sourceId===reviewed.baseSourceId?'matches-reviewed':'catalog-difference',
    sourceDifferences:[],publishedDifferences:row.sourceId===reviewed.baseSourceId?[]:['missing-variant']}));
  const state={revision:92,dirtyCatalogDraft:false,localizationDrafts:[],localizationOverrides:[],legacyOverrides:[]};
  return {id,identity,source,options:{catalog:{ok:true,revision:92,records:[structuredClone(published)]},coverage:{rows},
    currentEdits:{[id]:current},privateState:{[id]:state},sourceHashes:{skills:'a'.repeat(64)}}};
}
const plan = ({id,options}) => previewReviewedSkillProfiles(options).find(row=>row.id===id);

test('reviewed profile preview preserves published edit and historical languages without changing source or publishing',()=>{
  const input=fixture(),before=JSON.stringify(input.options),result=plan(input);
  assert.equal(result.status,'ready-for-review');
  assert.deepEqual(result.addedVariantIds,['source-168001003','source-168001004']);
  assert.equal(result.edit.names.jp,'編集済み');
  assert.equal(result.edit.profiles[0].names.jp,'編集済み');
  assert.equal(result.edit.profiles[0].description.jp,'既存の説明');
  assert.equal(JSON.stringify(input.options),before);
  input.options.currentEdits[input.id]=result.edit;
  input.options.catalog.records[0]=compileRecord(result.edit,input.identity,input.source);
  assert.equal(plan(input).status,'unchanged');
});

test('reviewed profile preview refuses stale source, drafts, manual text and incompatible current state',()=>{
  const cases=[
    [x=>delete x.options.privateState[x.id],'private-state-unverified'],
    [x=>x.options.privateState[x.id].revision=91,'private-state-unverified'],
    [x=>x.options.privateState[x.id].dirtyCatalogDraft=true,'dirty-draft'],
    [x=>x.options.privateState[x.id].localizationDrafts.push('ru'),'localization-review'],
    [x=>x.options.privateState[x.id].localizationOverrides.push('en'),'localization-review'],
    [x=>x.options.privateState[x.id].legacyOverrides.push('ru'),'localization-review'],
    [x=>x.options.coverage.rows[0].sourceDifferences.push('cooldown'),'source-review'],
    [x=>delete x.options.currentEdits[x.id],'published-edit-required'],
    [x=>x.options.catalog.records[0].names.en='Manual change','published-snapshot-mismatch'],
    [x=>x.options.coverage.rows[0].publishedDifferences.push('name.en'),'base-value-review'],
    [x=>x.options.currentEdits[x.id].profiles=currentActiveProfileDrafts().find(row=>row.id===x.id).profiles.map((row,index)=>({...row,id:'manual-'+index})),'published-snapshot-mismatch']
  ];
  for(const [mutate,expected] of cases){const input=fixture();mutate(input);assert.equal(plan(input).status,expected);}
  const input=fixture();input.options.currentEdits[input.id].profiles=currentActiveProfileDrafts().find(row=>row.id===input.id).profiles.map((row,index)=>({...row,id:'manual-'+index}));
  input.options.catalog.records[0]=compileRecord(input.options.currentEdits[input.id],input.identity,input.source);
  assert.equal(plan(input).status,'existing-profiles-review');
});

test('a reviewed English rename is proposed only for an untouched historical baseline',()=>{
  const input=fixture(),id='skill_entry.19.4';
  const reviewed=currentActiveProfileReference.records.find(row=>row.id===id);
  input.id=id;input.options.catalog.records=[];input.options.currentEdits={};
  input.options.privateState={[id]:{revision:92,dirtyCatalogDraft:false,localizationDrafts:[],localizationOverrides:[],legacyOverrides:[]}};
  input.options.coverage.rows=reviewed.rows.map(row=>({id,sourceId:row.sourceId,status:'catalog-difference',sourceDifferences:[],
    publishedDifferences:row.sourceId===reviewed.baseSourceId?['names.en']:['missing-variant']}));
  const result=plan(input);
  assert.equal(result.status,'ready-for-review');
  assert.deepEqual(result.baseChanges,[{field:'names.en',before:'Soul Blight',after:'Soul Bright'}]);
  assert.equal(result.edit.names.en,'Soul Bright');
  assert.equal(result.edit.names.jp,baselineById.get(id).name.jp);
  input.options.privateState[id].localizationOverrides.push('en');
  assert.equal(plan(input).status,'localization-review');
});
