import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { adminCatalog } from '../../admin-api/src/catalog.mjs';
import { draftFromSource } from '../../admin-api/src/catalog-model.mjs';
import { adminLocalization, publicLocalization } from '../../admin-api/src/localization.mjs';

const origin='https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  for(const migration of ['0002_catalog.sql','0003_skill_variants.sql','0004_catalog_impact_revision.sql',
    '0005_result_labels.sql','0006_ui_translation_overrides.sql','0007_unified_localization.sql',
    '0008_localization_workflow.sql','0009_localization_query_indexes.sql']){
    sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/'+migration,import.meta.url),'utf8'));
  }
  const DB={
    prepare(sql){
      let args=[];
      return {
        bind(...values){args=values;return this;},
        async first(){return sqlite.prepare(sql).get(...args)||null;},
        async all(){return {results:sqlite.prepare(sql).all(...args)};},
        async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}
      };
    },
    async batch(statements){
      sqlite.exec('BEGIN');
      try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}
      catch(error){sqlite.exec('ROLLBACK');throw error;}
    }
  };
  return {env:{DB},sqlite};
}
async function catalog(env,path,payload){
  const request=new Request(origin+'/api/admin/'+path,{
    method:payload?'POST':'GET',
    headers:payload?{'Content-Type':'application/json'}:{},
    body:payload?JSON.stringify(payload):undefined
  });
  const response=await adminCatalog(request,env,1000);
  assert.equal(response.status,200);
  return response.json();
}
async function insertDraft(env,edit,revision){
  const draft=await catalog(env,'draft',{edit,expectedDraftVersion:0,expectedCatalogRevision:revision});
  return draft;
}
async function publish(env,draft){
  return catalog(env,'publish',{id:draft.identity.id,expectedDraftVersion:draft.draftVersion,
    expectedCatalogRevision:draft.catalogRevision});
}
async function search(env,group,locale,q,status='all'){
  const query=new URLSearchParams({scope:'game',group,locale,q,status});
  return (await adminLocalization(new Request(origin+'/api/admin/localization?'+query),env)).json();
}

test('only published new equipment and Souls enter unified search; texts have one writer',async()=>{
  const {env,sqlite}=fixture();
  const equipment=draftFromSource(null,'equipment');
  equipment.names={en:'Canonical Sword',ru:'Единый меч',jp:'一体の剣',tw:'統一之劍'};
  equipment.description={en:'Test description',ru:'Описание',jp:'説明',tw:'說明'};
  equipment.notes={en:'Special effect text',ru:'Особый эффект',jp:'効果',tw:'效果'};
  equipment.baseAttack=42;
  const queued=await insertDraft(env,equipment,0);
  const id=queued.identity.id;
  assert.match(id,/^modern\.equipment\./);
  assert.equal((await search(env,'equipment','ru',id)).total,0,'draft must never leak into localization search');
  const beforeOverrides=(await (await publicLocalization(env)).json()).overrides;
  assert.equal(beforeOverrides.game.ru[id],undefined,'unpublished drafts are never public localization overrides');
  const published=await publish(env,queued);
  assert.equal(published.catalogRevision,1);
  for(const locale of ['en','ru','jp','tw']){
    const result=await search(env,'equipment',locale,id);
    const name=result.items.find(row=>row.id===id);
    const description=result.items.find(row=>row.id===id+'.description');
    assert.ok(name&&description,'all catalog fields searchable in '+locale);
    assert.equal(name.managedBy,'catalog');
    assert.equal(name.catalogId,id);
    assert.equal(name.catalogKind,'equipment');
    assert.equal(name.catalogField,'names');
    assert.equal(name.catalogRevision,1);
    assert.equal(description.managedBy,'catalog');
    assert.equal(result.items.length>=3,true);
    assert.equal(name.effective,equipment.names[locale]);
    assert.equal(description.effective,equipment.description[locale]);
  }
  const named=(await search(env,'equipment','ru','Единый меч')).items;
  assert.ok(named.some(row=>row.id===id));
  const missing=await search(env,'equipment','ru',id,'missing');
  assert.equal(missing.total,0);
  await assert.rejects(()=>adminLocalization(new Request(origin+'/api/admin/localization',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({scope:'game',id,locale:'ru',value:'Запрещённая другая копия',expectedVersion:0})
  }),env),/Invalid translation edit/);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM localization_overrides').get().n,0);
  const soul=draftFromSource(null,'soul');soul.names={en:'Canonical Soul',ru:'Единая душа',jp:'魂',tw:'靈魂'};
  const soulDraft=await insertDraft(env,soul,1);await publish(env,soulDraft);
  const result=await search(env,'souls','ru',soulDraft.identity.id);
  assert.ok(result.items.some(row=>row.catalogId===soulDraft.identity.id&&row.catalogKind==='soul'));
});

test('additional active/passive skill variants use the same catalog revision and fallback',async()=>{
  const {env}=fixture();
  let revision=0;
  for(const templateId of ['skill_entry.0.0','skill_entry.0.1']){
    const parent=await catalog(env,'item?id='+templateId);
    const edit=structuredClone(parent.edit);
    edit.id='';edit.templateId=parent.identity.id;
    edit.names={en:'Canonical '+parent.identity.kind,ru:'Единое умение',jp:'',tw:''};
    edit.description={en:'New skill information',ru:'Новая информация',jp:'',tw:''};
    if(parent.identity.kind==='passive')edit.effects=[{stat:1,value:1,unit:'flat'}];
    const draft=await insertDraft(env,edit,revision);
    assert.equal((await search(env,'skills','ru',draft.identity.id)).total,0);
    const result=await publish(env,draft);revision=result.catalogRevision;
    const seen=await search(env,'skills','ru',draft.identity.id);
    assert.ok(seen.items.some(item=>item.catalogField==='names'&&item.catalogKind===parent.identity.kind));
    assert.ok(seen.items.some(item=>item.catalogField==='description'));
    const tw=await search(env,'skills','tw',draft.identity.id,'missing');
    assert.ok(tw.items.some(item=>item.catalogField==='names'&&item.origin==='fallback'&&item.effective===edit.names.en));
  }
});
