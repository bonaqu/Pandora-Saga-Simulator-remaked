import test from 'node:test';
import assert from 'node:assert/strict';
import {adminLocalization,publicLocalization,publicAdminShellLocalization} from '../../admin-api/src/localization.mjs';
import {readFileSync} from 'node:fs';
import curated from '../../localization/curated-runtime-defaults.ru.v1.json' with {type:'json'};

function fixture({legacyUi=[],catalogSnapshot=[]}={}){
  const updates=new Map();
  const database={prepare(sql){
    let args=[];
    return {bind(...v){args=v;return this;},
      async all(){
        if(sql.includes('FROM localization_overrides'))return {results:[...updates.values()]};
        if(sql.includes('FROM ui_translation_overrides'))return {results:legacyUi};
        if(sql.includes('FROM result_label_overrides'))return {results:[]};
        throw Error('Unrecognized query '+sql);
      },
      async first(){
        if(sql.includes('FROM catalog_head'))return {snapshot_json:JSON.stringify(catalogSnapshot),version:88};
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
  assert.equal(ui.counts.ui,338);
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

test('old published UI text is immediately editable, searchable and safely reset without mutating legacy D1',async()=>{
  const original={locale:'ru',id:'header.updates',text:'Мой старый перевод'};
  const env=fixture({legacyUi:[original]});
  const read=async q=>(await (await adminLocalization(get('/api/admin/localization?scope=ui&locale=ru&q='+encodeURIComponent(q)),env)).json()).items;
  const displayed=(await read('Мой старый перевод')).find(row=>row.id===original.id);
  assert.equal(displayed.effective,original.text);
  assert.equal(displayed.origin,'previous-admin');
  const reply=await (await adminLocalization(post({
    scope:'ui',locale:'ru',id:original.id,value:'',expectedVersion:0
  }),env)).json();
  assert.equal(reply.version,1);
  const after=(await read('header.updates')).find(row=>row.id===original.id);
  assert.equal(after.effective,after.baseline);
  assert.equal(after.origin,'import');
  assert.equal(original.text,'Мой старый перевод');
  const live=await (await publicLocalization(env)).json();
  assert.equal(live.overrides.ui.ru[original.id],after.baseline);
  await assert.rejects(()=>adminLocalization(post({
    scope:'ui',locale:'ru',id:original.id,value:'New name',expectedVersion:0
  }),env),/Translation changed elsewhere/);
});

test('category filters are stable and separate equipment from skills, race and stats',async()=>{
  const env=fixture();
  const skills=await (await adminLocalization(get('/api/admin/localization?scope=game&group=skills&q=skill_entry.7.5'),env)).json();
  assert.ok(skills.items.some(row=>row.id==='skill_entry.7.5'));
  const honor=await (await adminLocalization(get('/api/admin/localization?scope=game&group=skills&q=calculator.honor.6'),env)).json();
  assert.ok(honor.items.some(row=>row.id==='calculator.honor.6'));
  assert.ok(honor.items.some(row=>row.id==='calculator.honor.6.hint'));
  const honorStats=await (await adminLocalization(get('/api/admin/localization?scope=game&group=stats&q=calculator.honor.6'),env)).json();
  assert.equal(honorStats.total,0);
  const equipment=await (await adminLocalization(get('/api/admin/localization?scope=game&group=equipment&q=skill_entry.7.5'),env)).json();
  assert.equal(equipment.total,0);
  const races=await (await adminLocalization(get('/api/admin/localization?scope=game&group=races&q=race.0'),env)).json();
  assert.ok(races.items.some(row=>row.id==='race.0'));
  await assert.rejects(()=>adminLocalization(get('/api/admin/localization?scope=game&group=invalid'),env),/Invalid search filters/);
});


test('missing locale translations are distinguishable from approved imports and published edits',async()=>{
  const env=fixture(),id='equipment.0.2';
  const lookup=async(locale,status='all')=>(await (await adminLocalization(
    get('/api/admin/localization?scope=game&locale='+locale+'&status='+status+'&q='+id),env)).json());
  const ru=(await lookup('ru')).items.find(row=>row.id===id);
  assert.equal(ru.baseline,'Short Sword');
  assert.equal(ru.effective,'Short Sword');
  assert.equal(ru.baselineOrigin,'fallback');
  assert.equal(ru.origin,'fallback');
  assert.ok((await lookup('ru','missing')).items.some(row=>row.id===id));
  assert.equal((await lookup('ru','published')).total,0);

  const jp=(await lookup('jp')).items.find(row=>row.id===id);
  assert.equal(jp.origin,'import');
  assert.ok(jp.effective);
  assert.equal((await lookup('jp','missing')).total,0);

  await adminLocalization(post({scope:'game',id,locale:'ru',value:'Короткий меч',expectedVersion:0}),env);
  assert.equal((await lookup('ru')).items.find(row=>row.id===id).origin,'admin');
  assert.ok(!(await lookup('ru','missing')).items.some(row=>row.id===id));
  assert.ok((await lookup('ru','published')).items.some(row=>row.id===id));

  await adminLocalization(post({scope:'game',id,locale:'ru',value:'',expectedVersion:1}),env);
  assert.equal((await lookup('ru')).items.find(row=>row.id===id).origin,'fallback');
  assert.ok((await lookup('ru','missing')).items.some(row=>row.id===id));
  await assert.rejects(()=>adminLocalization(get('/api/admin/localization?status=unknown'),env),/Invalid search filters/);
});


test('previously visible Russian curated translations are present in unified admin baseline',async()=>{
  const env=fixture();
  for(const [scope,id,expected] of [
    ['game','calculator.clan.5','Физическая устойчивость'],
    ['game','calculator.text.7','Сброс характеристик'],
    ['ui','skills.adeptness','Изучено (ОЧ)']
  ]){
    const rows=(await (await adminLocalization(
      get('/api/admin/localization?scope='+scope+'&locale=ru&q='+id),env)).json()).items;
    const found=rows.find(row=>row.id===id);
    assert.ok(found,id+' must be editable');
    assert.equal(found.effective,expected);
    assert.equal(found.baselineOrigin,'import');
    assert.equal(found.origin,'import');
  }
});

test('curated approved-display defaults stay identical to visible Modern fallback text',()=>{
  const runtime=readFileSync(new URL('../../modern/i18n.js',import.meta.url),'utf8');
  for(const scope of ['ui','game'])for(const [id,value] of Object.entries(curated.ru[scope])){
    assert.ok(runtime.includes("'"+id+"': '"+value+"'")||runtime.includes("'"+id+"': \""+value+"\""),
      'Runtime fallback drift for '+id);
  }
  assert.equal(Object.keys(curated.ru.ui).length+Object.keys(curated.ru.game).length,30);
});

test('preview-guarded bulk writes preserve English and reject stale effective UI/catalog texts',async()=>{
  const en='Updates',original={locale:'ru',id:'header.updates',text:'Warrior ' + en};
  const env=fixture({legacyUi:[original]});
  const base={scope:'ui',id:'header.updates',locale:'ru',value:'Воин Updates',expectedVersion:0};
  await assert.rejects(()=>adminLocalization(post({...base,expectedEffective:'Old Warrior Updates'}),env),
    /Translation changed since preview/);
  assert.equal(env.updates.size,0,'a stale preview must not write D1');
  const applied=await (await adminLocalization(post({...base,expectedEffective:'Warrior Updates'}),env)).json();
  assert.equal(applied.version,1);
  const view=(await (await adminLocalization(get('/api/admin/localization?scope=ui&locale=ru&q=header.updates'),env)).json()).items;
  assert.equal(view.find(row=>row.id==='header.updates').effective,'Воин Updates');
  assert.equal(original.text,'Warrior Updates','old published D1 data is immutable');
  assert.equal((await (await adminLocalization(get('/api/admin/localization?scope=ui&locale=en&q=header.updates'),env)).json())
    .items.find(row=>row.id==='header.updates').source.en,en);
  await assert.rejects(()=>adminLocalization(post({...base,expectedVersion:1,expectedEffective:'Warrior Updates',value:'Новое'}),env),
    /Translation changed since preview/);
  await assert.rejects(()=>adminLocalization(post({...base,expectedVersion:1,expectedEffective:55}),env),
    /Invalid translation edit/);
});

test('preview-guarded reset uses the exact checked language and stable item ID',async()=>{
  const env=fixture(),base={scope:'game',id:'skill_detail.7.5.3',locale:'ru',value:'Воин в строю',
    expectedVersion:0,expectedEffective:'A skilled Warrior attacks.'};
  await assert.rejects(()=>adminLocalization(post(base),env),/Translation changed since preview/);
  assert.equal(env.updates.size,0);
});


test('guarded publication supports long Unicode before/after pairs under the 4000-character field limit',async()=>{
  const env=fixture(),id='skill_detail.7.5.3';
  const original='Воин '.repeat(650).trim(),replacement='Герой '.repeat(640).trim();
  const saved=await (await adminLocalization(post({
    scope:'game',id,locale:'ru',value:original,expectedVersion:0
  }),env)).json();
  assert.equal(saved.version,1);
  const next=await (await adminLocalization(post({
    scope:'game',id,locale:'ru',value:replacement,expectedVersion:1,expectedEffective:original
  }),env)).json();
  assert.equal(next.version,2);
  assert.equal(env.updates.get('game|'+id+'|ru').text,replacement);
});


test('consecutive equipment reset tombstones persist in D1 without restoring either published translation',async()=>{
  const env=fixture(),ids=['equipment.30.37','equipment.32.36'];
  const before=new Map();
  async function item(id) {
    const response=await (await adminLocalization(get('/api/admin/localization?scope=game&locale=ru&q='+id),env)).json();
    return response.items.find(row=>row.id===id);
  }
  for(const [index,id] of ids.entries()){
    const row=await item(id);
    assert.ok(row,'equipment exists in unified localization registry');
    before.set(id,row);
    const publish=await (await adminLocalization(post({
      scope:'game',id,locale:'ru',value:index===0?'Рыцарь Hat':'Рыцарь Grove',
      expectedVersion:0,expectedEffective:row.effective
    }),env)).json();
    assert.equal(publish.version,1);
  }
  for(const [index,id] of ids.entries()){
    const edited=await item(id);
    assert.equal(edited.origin,'admin');
    const reset=await (await adminLocalization(post({
      scope:'game',id,locale:'ru',value:'',expectedVersion:1,
      expectedEffective:index===0?'Рыцарь Hat':'Рыцарь Grove'
    }),env)).json();
    assert.equal(reset.version,2);
    assert.equal(reset.override,'');
    const restored=await item(id);
    assert.equal(restored.effective,before.get(id).baseline);
    assert.equal(restored.version,2);
    assert.equal(restored.origin,restored.baselineOrigin);
    assert.equal(restored.source.en,before.get(id).source.en);
    const live=await (await publicLocalization(env)).json();
    assert.equal(live.overrides.game.ru[id],before.get(id).baseline);
  }
  const after=await Promise.all(ids.map(item));
  for(const [index,row] of after.entries()){
    assert.equal(row.effective,before.get(ids[index]).baseline);
    assert.equal(row.version,2);
    assert.equal(env.updates.get('game|'+ids[index]+'|ru').text,'');
  }
  await assert.rejects(()=>adminLocalization(post({
    scope:'game',id:ids[0],locale:'ru',value:'Устаревший перевод',
    expectedVersion:1,expectedEffective:'Рыцарь Hat'
  }),env),/Translation changed elsewhere/);
});


test('admin localization queries only the selected locale/scope and does not read unrelated D1 tables',async()=>{
  const env=fixture(),queries=[];
  const prepare=env.DB.prepare.bind(env.DB);
  env.DB.prepare=sql=>{queries.push(sql);return prepare(sql);};
  const read=async(scope,locale)=>(await(await adminLocalization(
    get('/api/admin/localization?scope='+scope+'&locale='+locale+'&q=skill_entry.7.5'),env)).json());
  const ui=await read('ui','ru');
  assert.equal(ui.scope,'ui');
  assert.ok(queries.some(sql=>sql.includes('FROM localization_overrides WHERE scope=? AND locale=?')));
  assert.ok(queries.some(sql=>sql.includes('FROM ui_translation_overrides WHERE locale=?')));
  assert.ok(!queries.some(sql=>sql.includes('FROM catalog_head')),'UI editing should not load all catalog JSON');
  assert.ok(!queries.some(sql=>sql.includes('FROM result_label_overrides')),'UI editing should not query game result labels');
  queries.length=0;
  const game=await read('game','jp');
  assert.equal(game.scope,'game');
  assert.ok(queries.some(sql=>sql.includes('FROM catalog_head')));
  assert.ok(!queries.some(sql=>sql.includes('FROM ui_translation_overrides')),'game editing should not load legacy UI rows');
  assert.ok(!queries.some(sql=>sql.includes('FROM result_label_overrides')),'non-Russian locale does not use old RU result labels');
  assert.ok(queries.some(sql=>sql.includes('FROM localization_overrides WHERE scope=? AND locale=?')));
});


test('one translation identity compares all four D1 languages with precise origins',async()=>{
  const env=fixture(),id='skill_entry.7.5';
  const compare=async()=>(await (await adminLocalization(
    get('/api/admin/localization?scope=game&compareId='+id),env)).json());
  const baseline=await compare();
  assert.deepEqual(baseline.translations.map(x=>x.locale),['ru','en','jp','tw']);
  assert.equal(baseline.id,id);
  assert.equal(baseline.translations[0].effective,'Пылающая стрела');
  assert.equal(baseline.translations[0].origin,'import');
  await adminLocalization(post({scope:'game',id,locale:'ru',value:'Проверка RU',
    expectedVersion:0,expectedEffective:'Пылающая стрела'}),env);
  await adminLocalization(post({scope:'game',id,locale:'jp',value:'試験翻訳',
    expectedVersion:0,expectedEffective:baseline.translations[2].effective}),env);
  const updated=await compare();
  assert.equal(updated.translations[0].effective,'Проверка RU');
  assert.equal(updated.translations[0].origin,'admin');
  assert.equal(updated.translations[0].version,1);
  assert.equal(updated.translations[2].effective,'試験翻訳');
  assert.equal(updated.translations[2].origin,'admin');
  assert.equal(updated.translations[1].effective,baseline.translations[1].effective);
  assert.equal(updated.translations[3].effective,baseline.translations[3].effective);
  await adminLocalization(post({scope:'game',id,locale:'ru',value:'',
    expectedVersion:1,expectedEffective:'Проверка RU'}),env);
  const reset=await compare();
  assert.equal(reset.translations[0].effective,'Пылающая стрела');
  assert.equal(reset.translations[0].version,2);
  assert.equal(reset.translations[0].origin,'import');
  assert.equal(reset.translations[2].effective,'試験翻訳');
  await assert.rejects(()=>adminLocalization(
    get('/api/admin/localization?scope=game&compareId=unknown.id'),env),/Translation entry not found/);
  await assert.rejects(()=>adminLocalization(
    get('/api/admin/localization?scope=game&compareId=%3Cscript%3E'),env),/Invalid comparison ID/);
});

test('curated fallback help is exposed as an editable baseline, never client-only',async()=>{
  const env=fixture();
  const found=(await(await adminLocalization(get(
    '/api/admin/localization?scope=ui&locale=ru&q=skills.help'),env)).json()).items
    .find(row=>row.id==='skills.help');
  assert.equal(found.effective,curated.ru.ui['skills.help']);
  assert.equal(found.baselineOrigin,'import');
});


test('one paginated query includes four independently versioned translations per identity', async () => {
  const env=fixture({legacyUi:[{locale:'ru',id:'header.updates',text:'Опубликовано в старом редакторе'}]});
  const find=async(url)=>(await (await adminLocalization(get(url),env)).json()).items.find(r=>r.id==='header.updates');
  const base=await find('/api/admin/localization?scope=ui&q=header.updates&multilingual=1');
  assert.deepEqual(base.translations.map(x=>x.locale),['ru','en','jp','tw']);
  assert.equal(base.translations[0].effective,'Опубликовано в старом редакторе');
  assert.equal(base.translations[0].origin,'previous-admin');
  assert.equal(base.translations[1].effective,base.translations[1].baseline);
  assert.equal(base.translations[2].origin,'fallback');
  assert.equal(base.translations[3].origin,'fallback');
  await adminLocalization(post({scope:'ui',id:'header.updates',locale:'en',value:'All updates',
    expectedVersion:0,expectedEffective:base.translations[1].effective}),env);
  await adminLocalization(post({scope:'ui',id:'header.updates',locale:'jp',value:'更新情報',
    expectedVersion:0,expectedEffective:base.translations[2].effective}),env);
  const next=await find('/api/admin/localization?scope=ui&q=header.updates&locale=ru&multilingual=1');
  assert.equal(next.locale,'ru');
  assert.equal(next.translations[0].effective,'Опубликовано в старом редакторе');
  assert.equal(next.translations[1].effective,'All updates');
  assert.equal(next.translations[1].version,1);
  assert.equal(next.translations[2].effective,'更新情報');
  assert.equal(next.translations[2].version,1);
  assert.equal(next.translations[3].version,0);
  const crossLanguage=(await (await adminLocalization(
    get('/api/admin/localization?scope=ui&locale=ru&q='+encodeURIComponent('更新情報')+'&multilingual=1'),env
  )).json()).items;
  assert.ok(crossLanguage.some(row=>row.id==='header.updates'),
    'search must find a Japanese D1 publication while RU remains selected');

  assert.deepEqual(next.translations.map(x=>x.locale),['ru','en','jp','tw']);
  assert.equal((await find('/api/admin/localization?scope=ui&q=header.updates')).translations,undefined,
    'legacy filtered editor contract stays unchanged');
  await assert.rejects(()=>adminLocalization(get('/api/admin/localization?multilingual=true'),env),
    /Invalid multilingual mode/);
});

test('four-locale paged response preserves older D1 reset tombstones without contamination',async()=>{
  const env=fixture();
  const id='skill_entry.7.5';
  const first=(await (await adminLocalization(get('/api/admin/localization?scope=game&locale=ru&q='+id+'&multilingual=1'),env)).json()).items.find(x=>x.id===id);
  assert.equal(first.translations[0].effective,'Пылающая стрела');
  await adminLocalization(post({scope:'game',id,locale:'ru',value:'Временное название',expectedVersion:0,
    expectedEffective:first.translations[0].effective}),env);
  await adminLocalization(post({scope:'game',id,locale:'ru',value:'',expectedVersion:1,
    expectedEffective:'Временное название'}),env);
  const after=(await (await adminLocalization(get('/api/admin/localization?scope=game&locale=jp&q='+id+'&multilingual=1'),env)).json()).items.find(x=>x.id===id);
  assert.equal(after.translations[0].effective,'Пылающая стрела');
  assert.equal(after.translations[0].version,2);
  assert.equal(after.translations[0].origin,'import');
  assert.equal(after.translations[1].version,0);
  assert.equal(after.translations[2].version,0);
  assert.equal(after.translations[3].version,0);
});


test('new catalog-managed names expose four languages without creating a second D1 editor',async()=>{
  const id='modern.equipment.qa-multilingual';
  const catalogSnapshot=[{identity:{id,kind:'equipment'},
    edit:{names:{en:'New armor',ru:'Новые доспехи',jp:'新しい鎧',tw:'新盔甲'},
      description:{en:'Armor description',ru:'Описание доспехов',jp:'',tw:''}}}];
  const env=fixture({catalogSnapshot});
  const data=await (await adminLocalization(get('/api/admin/localization?scope=game&group=equipment&locale=ru&q='+id+'&multilingual=1'),env)).json();
  const name=data.items.find(row=>row.id===id);
  assert.ok(name);
  assert.equal(name.managedBy,'catalog');
  assert.deepEqual(name.translations.map(row=>row.locale),['ru','en','jp','tw']);
  assert.deepEqual(name.translations.map(row=>row.effective),['Новые доспехи','New armor','新しい鎧','新盔甲']);
  assert.ok(name.translations.every(row=>row.managedBy==='catalog'));
  const desc=data.items.find(row=>row.id===id+'.description');
  assert.ok(desc);
  assert.equal(desc.managedBy,'catalog');
  assert.equal(desc.translations[2].origin,'fallback');
  assert.equal(desc.translations[2].effective,'Armor description');
  assert.equal(desc.translations[3].origin,'fallback');
  // The same key must not become independently writable in the translation
  // table: edits to a new catalog identity need catalog revision publication.
  await assert.rejects(()=>adminLocalization(post({scope:'game',id,locale:'jp',
    value:'Unsafe parallel copy',expectedVersion:0}),env),/Invalid translation edit/);
});

test('admin shell returns all current four-locale D1-editable keys without exposing secrets',async()=>{
  const env=fixture({legacyUi:[{locale:'ru',id:'adminShell.logout',text:'Выйти из старой админки'}]});
  const before=await (await publicAdminShellLocalization(env)).json();
  assert.equal(before.ok,true);
  assert.equal(before.schemaVersion,1);
  for(const locale of ['ru','en','jp','tw']) {
    assert.equal(Object.keys(before.locales[locale]).length,61);
    assert.ok(Object.keys(before.locales[locale]).every(key=>key.startsWith('adminShell.')));
    assert.ok(Object.values(before.locales[locale]).every(text=>typeof text==='string'&&text.trim()));
  }
  assert.equal(before.locales.ru['adminShell.logout'],'Выйти из старой админки');
  assert.equal(before.locales.en['adminShell.loginLabel'],'LOGIN');
  assert.equal(before.locales.jp['adminShell.authenticate'],'ログイン');
  assert.equal(before.locales.tw['adminShell.passwordLabel'],'密碼');
  assert.ok(!Object.keys(before).some(key=>/token|cookie|csrf|session|draft/i.test(key)));
  const publish=await (await adminLocalization(post({
    scope:'ui',id:'adminShell.logout',locale:'ru',
    expectedVersion:0,value:'Мой личный выход'
  }),env)).json();
  assert.equal(publish.version,1);
  assert.equal((await (await publicAdminShellLocalization(env)).json()).locales.ru['adminShell.logout'],
    'Мой личный выход');
  await adminLocalization(post({scope:'ui',id:'adminShell.logout',locale:'ru',value:'',expectedVersion:1}),env);
  const restored=await (await publicAdminShellLocalization(env)).json();
  assert.equal(restored.locales.ru['adminShell.logout'],'ВЫЙТИ');
  assert.equal(restored.locales.jp['adminShell.logout'],'ログアウト');
  assert.equal(restored.locales.tw['adminShell.logout'],'登出');
});
