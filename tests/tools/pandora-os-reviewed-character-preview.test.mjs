import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../fixtures/pandora-os-reviewed-character-20261029.json' with {type:'json'};
import {baselineById,sourceIdentity} from '../../admin-api/src/catalog-baseline.mjs';
import {draftFromSource,validateDraft,compileRecord} from '../../admin-api/src/catalog-model.mjs';
import {previewReviewedCharacter} from '../../scripts/lib/reviewed-character-preview.mjs';

function input(id){
  const original=baselineById.get(id),identity=sourceIdentity(original);
  const currentEdit=validateDraft(draftFromSource(original,identity.kind),identity);
  return {id,source:structuredClone(fixture),catalog:{ok:true,revision:92,records:[structuredClone(compileRecord(currentEdit,identity,original))]},currentEdit,
    privateState:{revision:92,dirtyCatalogDraft:false,localizationDrafts:[],localizationOverrides:[],legacyOverrides:[]},
    sourceHashes:{source:'a'.repeat(64)}};
}

test('reviewed character changes preserve existing fields and are idempotent',()=>{
  for(const id of ['job.12','racial_skill.1.1']){
    const x=input(id),plan=previewReviewedCharacter(x),original=baselineById.get(id),identity=sourceIdentity(original);
    assert.equal(plan.status,'ready-for-review');assert.match(plan.expectedCurrentHash,/^[a-f0-9]{64}$/);
    if(id==='job.12')assert.deepEqual(plan.edit.potentialCaps,[...original.potentialCaps.slice(0,19),10]);
    else assert.deepEqual(plan.edit.rangeBonus,{amount:500,appliesTo:'ranged'});
    x.currentEdit=plan.edit;x.catalog.records[0]=compileRecord(plan.edit,identity,original);
    assert.equal(previewReviewedCharacter(x).status,'unchanged');
  }
});

test('character proposals refuse changed source, private changes and edited published state',()=>{
  const cases=[
    [x=>x.source.classes.ASSASSIN.branchCaps.riding=9,'source-identity-review'],
    [x=>x.source.classes.ASSASSIN.branchCaps.slash=1,'source-identity-review'],
    [x=>x.privateState.dirtyCatalogDraft=true,'dirty-draft'],
    [x=>x.privateState.localizationDrafts.push('ru'),'localization-review'],
    [x=>x.catalog.records[0].names.en='Changed','published-snapshot-mismatch']
  ];
  for(const [mutate,status] of cases){const x=input('job.12');mutate(x);assert.equal(previewReviewedCharacter(x).status,status);}
  const x=input('racial_skill.1.1');x.source.skills['900020002'].funcs[0].fv1[3]=501;
  assert.equal(previewReviewedCharacter(x).status,'source-identity-review');
});
