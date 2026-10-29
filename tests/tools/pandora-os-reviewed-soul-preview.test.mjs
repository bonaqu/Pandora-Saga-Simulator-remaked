import test from 'node:test';
import assert from 'node:assert/strict';
import { previewReviewedPumpkinSoul, reviewedPumpkinSoulBatchCandidate } from '../../scripts/lib/reviewed-soul-preview.mjs';

const source={id:103023,name:'Тыквенная душа',slots:['body'],desc:'Сопротивляемость магии тьмы +5, СД +1.',effects:[
  {func:'EP_DARK_RESISTANCE_CONST',dir:'SELF',a:5,b:0,min:0,max:10},
  {func:'EP_SPIRITUAL_CONST',dir:'SELF',a:1,b:0,min:0,max:10}]};
const english={n:'Soul of the Pumpkin',d:'SPI +1 Dark Resistance +5%'};
const catalog={ok:true,revision:92,records:[]},sourceHashes={souls:'a'.repeat(64),english:'b'.repeat(64)};
const privateState={revision:92,dirtyCatalogDraft:false,localizationDrafts:[],localizationOverrides:[],legacyOverrides:[]};
const args={source,english,catalog,sourceHashes,privateState};

test('owner-confirmed soul updates RU/EN without changing identity, effects or historical JP/TW',()=>{
  const result=previewReviewedPumpkinSoul(args);
  assert.equal(result.status,'change');assert.equal(result.id,'soul.28');
  assert.deepEqual(result.changes.map(row=>row.path).sort(),['description.en','description.ru','names.en','names.ru']);
  assert.equal(result.edit.names.en,'Soul of the Pumpkin');assert.equal(result.edit.names.ru,'Тыквенная душа');
  assert.equal(result.edit.names.jp,'カボチャの魂');assert.equal(result.edit.names.tw,'(南瓜的魂魄)');
  assert.equal(result.edit.effectMode,'preserve');assert.deepEqual(result.edit.effects,[]);
  assert.deepEqual(result.edit.slots,[0,0,0,1,0,0,0,0]);
  assert.equal(previewReviewedPumpkinSoul({...args,currentEdit:result.edit}).status,'unchanged');
});

test('soul proposal stops on stale, private or manually edited information',()=>{
  assert.equal(previewReviewedPumpkinSoul({...args,privateState:null}).status,'private-state-unverified');
  assert.equal(previewReviewedPumpkinSoul({...args,privateState:{...privateState,dirtyCatalogDraft:true}}).status,'dirty-draft');
  assert.equal(previewReviewedPumpkinSoul({...args,privateState:{...privateState,localizationOverrides:['ru']}}).status,'localization-review');
  assert.equal(previewReviewedPumpkinSoul({...args,catalog:{...catalog,records:[{id:'soul.28'}]}}).status,'published-edit-needs-review');
  const initial=previewReviewedPumpkinSoul(args).edit;
  initial.names.ru='Ручной перевод';
  assert.equal(previewReviewedPumpkinSoul({...args,currentEdit:initial}).status,'conflict');
  assert.throws(()=>previewReviewedPumpkinSoul({...args,source:{...source,slots:['head']}}),/effects or slots/);
  assert.throws(()=>previewReviewedPumpkinSoul({...args,english:{...english,n:'Changed'}}),/identity/);
});

test('reviewed soul batch pins the baseline and refuses existing published edits',()=>{
  const candidate=reviewedPumpkinSoulBatchCandidate(args);
  assert.equal(candidate.status,'ready-for-review');
  assert.match(candidate.expectedCurrentHash,/^[a-f0-9]{64}$/);
  assert.equal(candidate.edit.names.en,'Soul of the Pumpkin');
  assert.equal(reviewedPumpkinSoulBatchCandidate({...args,currentEdit:candidate.edit}).status,'unchanged');
  assert.equal(reviewedPumpkinSoulBatchCandidate({...args,catalog:{...catalog,records:[{id:'soul.28'}]}}).status,'published-edit-needs-review');
});
