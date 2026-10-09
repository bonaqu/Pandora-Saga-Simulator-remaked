import test from 'node:test';
import assert from 'node:assert/strict';
import {adminLocalization,publicLocalization} from '../../admin-api/src/localization.mjs';

function fixture(){
  const updates=new Map();
  const database={prepare(sql){
    let args=[];
    return {bind(...v){args=v;return this;},
      async all(){
        if(sql.includes('FROM localization_overrides'))return {results:[...updates.values()]};
        if(sql.includes('FROM ui_translation_overrides'))return {results:[]};
        if(sql.includes('FROM result_label_overrides'))return {results:[]};
        throw Error('Unrecognized query '+sql);
      },
      async first(){
        if(sql.includes('FROM catalog_head'))return {snapshot_json:'[]'};
        if(sql.includes('FROM localization_overrides'))return updates.get(args.slice(0,3).join('|'))||null;
        throw Error('Unrecognized query '+sql);
      },
      async run(){
        if(sql.startsWith('INSERT OR IGNORE')){
          const [scope,term_id,locale,text,updated_at]=args,k=[scope,term_id,locale].join('|');
          if(updates.has(k))return {meta:{changes:0}};
          updates.set(k,{scope,term_id,locale,text,updated_at,version:1});
          return {meta:{changes:1}};
        }
        if(sql.startsWith('UPDATE localization_overrides')){
          const [text,updated_at,scope,term_id,locale,version]=args,k=[scope,term_id,locale].join('|');
          const current=updates.get(k);
          if(!current||current.version!==version)return {meta:{changes:0}};
          updates.set(k,{...current,text,updated_at,version:version+1});
          return {meta:{changes:1}};
        }
        throw Error('Unrecognized update '+sql);
      }
    };
  }};
  return {DB:database,updates};
}
const get=url=>new Request('https://worker.example'+url);
const post=body=>new Request('https://worker.example/api/admin/localization',
 {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('all four languages have a stable index of approved skills and source text',async()=>{
  const env=fixture();
  for(const locale of ['ru','en','jp','tw']){
    const data=await (await adminLocalization(get('/api/admin/localization?scope=game&locale='+locale+'&q=skill_entry.7.5'),env)).json();
    assert.equal(data.ok,true);
    assert.equal(data.locale,locale);
    assert.equal(data.items.find(x=>x.id==='skill_entry.7.5').source.en,'Flaming Arrow');
    const exact=data.items.find(x=>x.id==='skill_entry.7.5');
    assert.equal(exact.effective,locale==='ru'?'Пылающая стрела':exact.baseline);
  }
  const ui=await (await adminLocalization(get('/api/admin/localization?scope=ui&locale=jp'),env)).json();
  assert.equal(ui.counts.ui,242);
  assert.equal(ui.pageSize,40);
  assert.ok(ui.counts.game>2500);
});
test('versioned translation writes and resets do not affect old D1 rows',async()=>{
  const env=fixture(),id='skill_entry.7.5';
  const body={scope:'game',id,locale:'ru',value:'Горящая стрела',expectedVersion:0};
  const saved=await (await adminLocalization(post(body),env)).json();
  assert.equal(saved.version,1);
  const found=await (await adminLocalization(get('/api/admin/localization?scope=game&locale=ru&q=skill_entry.7.5'),env)).json();
  assert.equal(found.items.find(x=>x.id===id).effective,'Горящая стрела');
  assert.equal(found.items.find(x=>x.id===id).origin,'admin');
  const live=await (await publicLocalization(env)).json();
  assert.equal(live.overrides.game.ru[id],'Горящая стрела');
  await assert.rejects(()=>adminLocalization(post(body),env),/Translation changed elsewhere/);
  const reset=await (await adminLocalization(post({...body,value:'',expectedVersion:1}),env)).json();
  assert.equal(reset.version,2);
  const after=await (await publicLocalization(env)).json();
  assert.equal(after.overrides.game.ru[id],'Пылающая стрела');
  const listed=await (await adminLocalization(get('/api/admin/localization?scope=game&locale=ru&q=skill_entry.7.5'),env)).json();
  assert.equal(listed.items.find(x=>x.id===id).effective,'Пылающая стрела');
  await assert.rejects(()=>adminLocalization(post({...body,expectedVersion:1}),env),/Translation changed elsewhere/);
  const search=await (await adminLocalization(get('/api/admin/localization?scope=game&locale=ru&q=Пылающая'),env)).json();
  assert.ok(search.items.some(x=>x.id===id));
});
test('long multiline descriptions are safe; HTML and bad translation placeholders fail',async()=>{
  const env=fixture();
  const good={scope:'game',id:'skill_detail.7.5.3',locale:'ru',value:'Первая строка\nВторая строка',expectedVersion:0};
  const r=await adminLocalization(post(good),env);
  assert.equal(r.status,200);
  await assert.rejects(()=>adminLocalization(post({...good,id:'unknown.id'}),env),/Invalid translation edit/);
  await assert.rejects(()=>adminLocalization(post({...good,value:'<img src=x onerror=alert(1)>'}),env),/Invalid translation edit/);
  await assert.rejects(()=>adminLocalization(post({...good,scope:'ui',id:'hero.version',value:'Совсем другой {value}'}),env),/Template placeholders/);
});
