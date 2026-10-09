import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {adminLocalizationWorkflow} from '../../admin-api/src/localization-workflow.mjs';
import {adminLocalization} from '../../admin-api/src/localization.mjs';

const origin='https://worker.example';
function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  for(const file of ['0002_catalog.sql','0005_result_labels.sql','0006_ui_translation_overrides.sql',
                     '0007_unified_localization.sql','0008_localization_workflow.sql'])
    sqlite.exec(readFileSync(new URL('../../admin-api/migrations/'+file,import.meta.url),'utf8'));
  const DB={prepare(sql){
    let args=[];
    return {bind(...values){args=values;return this;},
      async first(){return sqlite.prepare(sql).get(...args)||null;},
      async all(){return {results:sqlite.prepare(sql).all(...args)};},
      async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}}}
    };
  },async batch(commands){
    sqlite.exec('BEGIN');
    try{
      const outputs=[];
      for(const statement of commands)outputs.push(await statement.run());
      sqlite.exec('COMMIT');return outputs;
    }catch(error){sqlite.exec('ROLLBACK');throw error;}
  }};
  return {env:{DB},sqlite};
}
async function call(env,path,body,method=body?'POST':'GET'){
  const request=new Request(origin+'/api/admin/localization'+path,{method,
    headers:body?{'content-type':'application/json'}:{},
    body:body?JSON.stringify(body):undefined});
  const response=path===''?await adminLocalization(request,env):await adminLocalizationWorkflow(request,env);
  const payload=await response.json();
  assert.equal(response.status,200,JSON.stringify(payload));
  return payload;
}
const row=(id,value,version=0,text='Пылающая стрела')=>({
  scope:'game',id,locale:'ru',value,expectedVersion:version,expectedEffective:text
});
const uuid='50d98863-d25f-4a4f-a582-53211a68fbc4';

test('server drafts persist across reads, publish atomically and preserve row history',async()=>{
  const {env,sqlite}=fixture();
  const a='skill_entry.7.5',b='skill_entry.7.6';
  const current=await call(env,'?scope=game&locale=ru&q=skill_entry.7.6');
  const before=current.items.find(x=>x.id===b)?.effective;
  assert.ok(before,'second skill exists');
  const d1=await call(env,'/draft', {...row(a,'Новая стрела'),expectedDraftVersion:0});
  const d2=await call(env,'/draft', {...row(b,'Проверенное название',0,before),expectedDraftVersion:0});
  assert.equal(d1.version,1);assert.equal(d2.version,1);
  let queue=await call(env,'/drafts');assert.equal(queue.count,2);
  assert.equal(queue.items[0].sourceVersion,0);
  assert.equal((await call(env,'?scope=game&locale=ru&q=skill_entry.7.5')).items.find(x=>x.id===a).effective,'Пылающая стрела');
  const chosen=queue.items.map(x=>({scope:x.scope,id:x.id,locale:x.locale,expectedDraftVersion:x.version}));
  const response=await call(env,'/publish-batch',{operationId:uuid,items:chosen});
  assert.equal(response.count,2);
  assert.equal((await call(env,'/operations?operationId='+uuid)).receipt.operationId,uuid);
  assert.deepEqual(await call(env,'/publish-batch',{operationId:uuid,items:chosen}),response,'retry is idempotent');
  queue=await call(env,'/drafts');assert.equal(queue.count,0);
  const h=await call(env,'/history?scope=game&locale=ru&id='+a);
  assert.equal(h.items.length,1);assert.equal(h.items[0].after,'Новая стрела');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM localization_history').get().n,2);
  assert.equal((await call(env,'?scope=game&locale=ru&q=skill_entry.7.5')).items.find(x=>x.id===a).version,1);
});

test('stale translation version aborts entire batch with no partial writes',async()=>{
  const {env,sqlite}=fixture();
  const a='skill_entry.7.5',b='skill_entry.7.6',before=(await call(env,'?scope=game&locale=ru&q=skill_entry.7.6')).items.find(x=>x.id===b).effective;
  await call(env,'/draft',{...row(a,'Черновик A'),expectedDraftVersion:0});
  await call(env,'/draft',{...row(b,'Черновик B',0,before),expectedDraftVersion:0});
  await call(env,'',row(b,'Опубликовано отдельно',0,before));
  const queue=(await call(env,'/drafts')).items;
  const request={operationId:'50d98863-d25f-4a4f-a582-53211a68fbc5',
    items:queue.map(x=>({scope:x.scope,id:x.id,locale:x.locale,expectedDraftVersion:x.version}))};
  await assert.rejects(()=>call(env,'/publish-batch',request),/Draft changed or published value is newer/);
  const still=(await call(env,'?scope=game&locale=ru&q=skill_entry.7.5')).items.find(x=>x.id===a);
  assert.equal(still.version,0);
  assert.equal((await call(env,'/drafts')).count,2);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM localization_operations').get().n,0);
});

test('single legacy-compatible publishes create restorable per-ID history',async()=>{
  const {env}=fixture(),a='skill_entry.7.5';
  await call(env,'',row(a,'Первый текст'));
  await call(env,'',row(a,'Второй текст',1,'Первый текст'));
  const history=await call(env,'/history?scope=game&locale=ru&id='+a);
  assert.deepEqual(history.items.map(x=>x.after),['Второй текст','Первый текст']);
  await call(env,'',row(a,history.items[1].after,2,'Второй текст'));
  assert.equal((await call(env,'/history?scope=game&locale=ru&id='+a)).items.length,3);
});

test('direct multiword publication is a single all-or-nothing operation',async()=>{
  const {env,sqlite}=fixture(),before=(await call(env,'?scope=game&locale=ru&q=skill_entry.7.6')).items.find(x=>x.id==='skill_entry.7.6').effective;
  const items=[row('skill_entry.7.5','Новое название A'),row('skill_entry.7.6','Новое название B',0,before)];
  const receipt=await call(env,'/publish-batch',{operationId:'50d98863-d25f-4a4f-a582-53211a68fbc6',items});
  assert.equal(receipt.count,2);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM localization_operations').get().n,1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM localization_history').get().n,2);
  await assert.rejects(()=>call(env,'/publish-batch',{operationId:'50d98863-d25f-4a4f-a582-53211a68fbc7',items}),/Translation changed/);
});
