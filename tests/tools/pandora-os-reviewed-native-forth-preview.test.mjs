import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../fixtures/pandora-os-native-forth-sample-20261029.json' with {type:'json'};
import matrix from '../fixtures/pandora-os-native-forth-matrix-20261029.json' with {type:'json'};
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';
import { previewReviewedNativeForth } from '../../scripts/lib/reviewed-native-forth-preview.mjs';

function input(id) {
  const item=[...fixture.items,...matrix.items].find(row=>row.id===id),source=baselineById.get(id),identity=sourceIdentity(source);
  const currentEdit=validateDraft(draftFromSource(source,'equipment'),identity);
  currentEdit.notes.jp='既存の説明';
  const published=compileRecord(currentEdit,identity,source);
  return {id,source:structuredClone(item.source),english:structuredClone(item.english),levels:structuredClone(item.levels),
    catalog:{ok:true,revision:92,records:[structuredClone(published)]},currentEdit,
    privateState:{revision:92,dirtyCatalogDraft:false,localizationDrafts:[],localizationOverrides:[],legacyOverrides:[]},
    sourceHashes:{itemForth:'a'.repeat(64)}};
}

test('reviewed enhancement preview preserves existing fields and is idempotent for six items',()=>{
  const policies={'equipment.5.27':'replace-legacy-zephyrus-upgrade','equipment.5.28':'replace-legacy-zephyrus-upgrade',
    'equipment.31.64':'replace-legacy-gold-plate-upgrade','equipment.32.82':'replace-legacy-lunar-gloves-upgrade',
    'equipment.32.61':'replace-legacy-mana-bracelets-upgrade'};
  for(const id of ['equipment.11.14',...Object.keys(policies)]){
    const value=input(id),before=JSON.stringify(value),plan=previewReviewedNativeForth(value);
    assert.equal(plan.status,'ready-for-review');assert.equal(plan.edit.notes.jp,'既存の説明');
    assert.equal(plan.edit.upgradeBonuses.length,['equipment.31.64','equipment.32.61'].includes(id)?1:2);
    assert.equal(plan.edit.nativeUpgradePolicy,policies[id]);
    assert.equal(JSON.stringify(value),before);
    const source=baselineById.get(id),identity=sourceIdentity(source);
    value.currentEdit=plan.edit;value.catalog.records[0]=compileRecord(plan.edit,identity,source);
    assert.equal(previewReviewedNativeForth(value).status,'unchanged');
  }
});

test('reviewed enhancement preview rejects changed source, editable state, private drafts and existing upgrade rules',()=>{
  const cases=[
    [x=>x.source.name='Changed','source-identity-review'],
    [x=>x.source.desc+=' Changed','source-identity-review'],
    [x=>x.levels[2][0].a+=1,'source-enhancement-review'],
    [x=>delete x.privateState,'private-state-unverified'],
    [x=>x.privateState.dirtyCatalogDraft=true,'dirty-draft'],
    [x=>x.privateState.localizationOverrides.push('en'),'localization-review'],
    [x=>x.catalog.records[0].names.en='Changed','published-snapshot-mismatch'],
    [x=>delete x.currentEdit,'published-edit-required']
  ];
  for(const [mutate,expected] of cases){const value=input('equipment.5.27');mutate(value);assert.equal(previewReviewedNativeForth(value).status,expected);}
  const value=input('equipment.5.27'),source=baselineById.get(value.id),identity=sourceIdentity(source);
  value.currentEdit.upgradeBonuses=[{stat:1,value:9,unit:'flat',from:7,every:1,to:7}];
  value.catalog.records[0]=compileRecord(value.currentEdit,identity,source);
  assert.equal(previewReviewedNativeForth(value).status,'existing-upgrade-review');
});
