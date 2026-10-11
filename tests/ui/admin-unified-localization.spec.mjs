import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const origin='https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
const key=(scope,locale,id)=>[scope,locale,id].join(':');

test('four-language translation editor starts with effective texts, keeps drafts and honors versioned reset',async({page})=>{
  const texts=[
    {scope:'game',id:'equipment.0.2',kind:'equipment',source:{en:'Short Sword',jp:'ショートソード',tw:'短劍'},
      baseline:{ru:'Short Sword',en:'Short Sword',jp:'ショートソード',tw:'短劍'},
      baselineOrigin:{ru:'fallback',en:'import',jp:'import',tw:'import'},legacy:{}},
    {scope:'game',id:'skill_entry.7.5',kind:'skill_entry',source:{en:'Flaming Arrow',jp:'フレーミングアロー',tw:'火箭'},
      baseline:{ru:'Пылающая стрела',en:'Flaming Arrow',jp:'フレーミングアロー',tw:'火箭'},legacy:{}},
    {scope:'game',id:'equipment.30.37',kind:'equipment',source:{en:'(xx Knight Hat)'},
      baseline:{ru:'(xx Knight Hat)',en:'(xx Knight Hat)',jp:'',tw:''},
      baselineOrigin:{ru:'fallback',en:'import',jp:'fallback',tw:'fallback'},legacy:{}},
    {scope:'game',id:'equipment.32.36',kind:'equipment',source:{en:'(xx Knight Grove)'},
      baseline:{ru:'(xx Knight Grove)',en:'(xx Knight Grove)',jp:'',tw:''},
      baselineOrigin:{ru:'fallback',en:'import',jp:'fallback',tw:'fallback'},legacy:{}},
    {scope:'ui',id:'header.updates',kind:'interface',source:{en:'Updates'},
      baseline:{ru:'Обновления',en:'Updates',jp:'アップデート',tw:'更新'},legacy:{ru:'Старый перевод'}},
  ];
  const saved=new Map(),requests=[],cloudDrafts=new Map();
  saved.set(key('game','ru','equipment.30.37'),{text:'(xx Рыцарь Hat)',version:1});
  saved.set(key('game','ru','equipment.32.36'),{text:'(xx Рыцарь Grove)',version:1});
  const expected=(item,lang)=>{
    const override=saved.get(key(item.scope,lang,item.id));
    const fromOld=item.legacy[lang];
    return override ? override.text || item.baseline[lang] : fromOld || item.baseline[lang];
  };
  await page.route(origin+'/**',async route=>{
    const url=new URL(route.request().url()),pathname=url.pathname;
    if(pathname==='/api/session')return route.fulfill({json:{
      ok:true,username:'admin',csrfToken:'synthetic-csrf',expiresAt:9999999999}});
    if(pathname==='/api/admin/localization/drafts')
      return route.fulfill({json:{ok:true,count:cloudDrafts.size,maxBatch:50,items:[...cloudDrafts.values()]}});
    if(pathname==='/api/admin/localization/draft'&&route.request().method()==='POST'){
      const data=route.request().postDataJSON(),k=key(data.scope,data.locale,data.id);
      const prior=cloudDrafts.get(k);
      if(data.expectedDraftVersion!==(prior?.version||0))
        return route.fulfill({status:409,json:{ok:false,message:'Draft conflict'}});
      const row={scope:data.scope,id:data.id,locale:data.locale,text:data.value,
        version:(prior?.version||0)+1,sourceVersion:data.expectedVersion,sourceText:data.expectedEffective};
      cloudDrafts.set(k,row);
      return route.fulfill({json:{ok:true,id:data.id,scope:data.scope,locale:data.locale,version:row.version,text:row.text}});
    }
    if(pathname==='/api/admin/localization/history')
      return route.fulfill({json:{ok:true,items:[],historyStartsAtMigration:true}});
    if(pathname==='/api/admin/localization'){
      if(route.request().method()==='POST'){
        expect(route.request().headers()['x-csrf-token']).toBe('synthetic-csrf');
        const input=route.request().postDataJSON();
        requests.push(input);
        const k=key(input.scope,input.locale,input.id),prior=saved.get(k);
        const originalText=expected(texts.find(item=>item.scope===input.scope&&item.id===input.id),input.locale);
        if(input.expectedVersion!==(prior?.version||0)||input.expectedEffective!==originalText)
          return route.fulfill({status:409,json:{ok:false,message:'Translation changed elsewhere'}});
        saved.set(k,{text:input.value,version:(prior?.version||0)+1});
        return route.fulfill({json:{ok:true,id:input.id,scope:input.scope,locale:input.locale,
          override:input.value,version:(prior?.version||0)+1}});
      }
      const compareId=url.searchParams.get('compareId');
      if(compareId){
        const item=texts.find(row=>row.scope===(url.searchParams.get('scope')||'game')&&row.id===compareId);
        if(!item)return route.fulfill({status:404,json:{ok:false,message:'Not found'}});
        const translations=['ru','en','jp','tw'].map(lang=>{
          const row=saved.get(key(item.scope,lang,item.id)),legacy=item.legacy[lang]||'';
          return {locale:lang,effective:expected(item,lang),baseline:item.baseline[lang],
            baselineOrigin:item.baselineOrigin?.[lang]||'import',
            origin:row?row.text?'admin':item.baselineOrigin?.[lang]||'import':
              legacy?'previous-admin':item.baselineOrigin?.[lang]||'import',
            version:row?.version||0};
        });
        return route.fulfill({json:{ok:true,schemaVersion:1,scope:item.scope,id:item.id,
          source:item.source,kind:item.kind,translations}});
      }
      const scope=url.searchParams.get('scope')||'game',lang=url.searchParams.get('locale')||'ru',
        query=(url.searchParams.get('q')||'').toLocaleLowerCase(),
        pageNumber=Number(url.searchParams.get('page')||0);
      const status=url.searchParams.get('status')||'all';
      const rows=texts.filter(item=>item.scope===scope).map(item=>{
        const entry=saved.get(key(item.scope,lang,item.id)),legacy=item.legacy[lang]||'';
        return {scope,id:item.id,kind:item.kind,locale:lang,source:item.source,baseline:item.baseline[lang],
          effective:expected(item,lang),legacyValue:legacy,override:entry?.text||'',
          version:entry?.version||0,baselineOrigin:item.baselineOrigin?.[lang]||'import',
          origin:entry?entry.text?'admin':item.baselineOrigin?.[lang]||'import':legacy?'previous-admin':item.baselineOrigin?.[lang]||'import'};
      }).filter(row=>(status==='all'||status==='missing'&&row.origin==='fallback'||
        status==='published'&&['admin','previous-admin'].includes(row.origin))&&
        (!query||[row.id,row.effective,row.source.en].some(word=>String(word).toLocaleLowerCase().includes(query))));
      return route.fulfill({json:{ok:true,schemaVersion:1,scope,locale:lang,
        total:rows.length,page:pageNumber,pageSize:40,counts:{ui:244,game:2900},
        items:rows.slice(pageNumber*40,(pageNumber+1)*40)}});
    }
    const asset=(pathname==='/admin'||pathname==='/admin/')?'admin.html':pathname.slice(1);
    if(['catalog-ui.js','result-labels.js','ui-translations.js'].includes(asset))
      return route.fulfill({contentType:'text/javascript',body:''});
    if(['admin.html','admin.css','admin.js','localization-console.js','localization-bulk.js','localization-drafts.js'].includes(asset)){
      const content=fs.readFileSync(new URL('../../admin-api/public/'+asset,import.meta.url),'utf8');
      return route.fulfill({contentType:asset.endsWith('.css')?'text/css':asset.endsWith('.js')?'text/javascript':'text/html',body:content});
    }
    return route.fulfill({status:404});
  });
  await page.goto(origin+'/admin');
  await expect(page.locator('#admin-workspace')).toBeVisible();
  const panel=page.locator('#localization-console');
  const russian=panel.locator('[data-localization-id="skill_entry.7.5"] textarea');
  await expect(russian).toHaveValue('Пылающая стрела');
  // Compare all four locales for one stable term without creating extra records.
  const compare=panel.locator('[data-localization-id="skill_entry.7.5"] .localization-language-compare');
  await compare.locator('summary').click();
  await expect(compare.locator('.localization-language-cell')).toHaveCount(4);
  await expect(compare).toContainText('Пылающая стрела');
  await expect(compare).toContainText('フレーミングアロー');
  await compare.getByRole('button',{name:'Открыть редактор JP'}).click();
  await expect(panel.getByRole('combobox',{name:'Язык статуса и покрытия'})).toHaveValue('jp');
  await expect(panel.locator('[data-localization-id="skill_entry.7.5"] textarea')).toHaveValue('フレーミングアロー');
  await panel.getByRole('combobox',{name:'Язык статуса и покрытия'}).selectOption('ru');
  await expect(russian).toHaveValue('Пылающая стрела');
  // Deep-linking to a locale intentionally filters by the same identity.
  // Clear the filter explicitly before checking the complete editor index.
  await panel.getByRole('searchbox',{name:'Поиск переводов'}).fill('');
  const missing=panel.locator('[data-localization-id="equipment.0.2"]');
  await expect(missing).toContainText('Нет перевода · исходный текст');
  await panel.getByRole('combobox',{name:'Статус перевода'}).selectOption('missing');
  await expect(missing).toBeVisible();
  await expect(panel.locator('[data-localization-id="skill_entry.7.5"]')).toHaveCount(0);
  await panel.getByRole('combobox',{name:'Статус перевода'}).selectOption('all');
  await russian.fill('Моя пылающая стрела');
  await expect(panel).toContainText('Не сохранено: 1');
  await panel.getByRole('combobox',{name:'Язык статуса и покрытия'}).selectOption('jp');
  await expect(panel.locator('[data-localization-id="skill_entry.7.5"] textarea')).toHaveValue('フレーミングアロー');
  await panel.getByRole('combobox',{name:'Язык статуса и покрытия'}).selectOption('ru');
  await expect(russian).toHaveValue('Моя пылающая стрела');
  await panel.locator('[data-localization-id="skill_entry.7.5"]').getByRole('button',{name:'Опубликовать'}).click();
  await expect(russian).toHaveValue('Моя пылающая стрела');
  await expect(panel).toContainText('Не сохранено: 0');
  expect(requests.at(-1)).toEqual({scope:'game',id:'skill_entry.7.5',locale:'ru',expectedVersion:0,
    expectedEffective:'Пылающая стрела',value:'Моя пылающая стрела'});
  await panel.getByRole('combobox',{name:'Раздел'}).selectOption('ui');
  const ui=panel.locator('[data-localization-id="header.updates"]');
  await expect(ui.locator('textarea')).toHaveValue('Старый перевод');
  await ui.getByRole('button',{name:'Вернуть базовый текст'}).click();
  await expect(ui.locator('textarea')).toHaveValue('Обновления');
  expect(requests.at(-1)).toMatchObject({scope:'ui',id:'header.updates',locale:'ru',
    expectedEffective:'Старый перевод',value:''});

  // Regression: resetting two previously published items must not resurrect
  // the OLD value of the first in drafts or after an unrelated rerender.
  await panel.getByRole('combobox',{name:'Раздел'}).selectOption('game');
  const hat=panel.locator('[data-localization-id="equipment.30.37"]');
  const grove=panel.locator('[data-localization-id="equipment.32.36"]');
  await expect(hat.locator('textarea')).toHaveValue('(xx Рыцарь Hat)');
  await expect(grove.locator('textarea')).toHaveValue('(xx Рыцарь Grove)');
  await hat.getByRole('button',{name:'Вернуть базовый текст'}).click();
  await expect(hat.locator('textarea')).toHaveValue('(xx Knight Hat)');
  await expect(hat).toContainText('Базовый текст восстановлен · сохранено');
  await expect(hat.getByRole('button',{name:'Вернуть базовый текст'})).toBeDisabled();
  await expect(panel).toContainText('Не сохранено: 0');
  await grove.getByRole('button',{name:'Вернуть базовый текст'}).click();
  await expect(grove.locator('textarea')).toHaveValue('(xx Knight Grove)');
  await expect(hat.locator('textarea')).toHaveValue('(xx Knight Hat)');
  await expect(panel).toContainText('Не сохранено: 0');
  await expect(hat).not.toHaveAttribute('data-dirty','true');
  await expect(grove).not.toHaveAttribute('data-dirty','true');
  await page.reload();
  await expect(panel.locator('[data-localization-id="equipment.30.37"] textarea')).toHaveValue('(xx Knight Hat)');
  await expect(panel.locator('[data-localization-id="equipment.32.36"] textarea')).toHaveValue('(xx Knight Grove)');
  await expect(panel).toContainText('Не сохранено: 0');
  const resetPosts=requests.filter(x=>x.id==='equipment.30.37'||x.id==='equipment.32.36');
  expect(resetPosts).toEqual([
    {scope:'game',id:'equipment.30.37',locale:'ru',expectedVersion:1,
      expectedEffective:'(xx Рыцарь Hat)',value:''},
    {scope:'game',id:'equipment.32.36',locale:'ru',expectedVersion:1,
      expectedEffective:'(xx Рыцарь Grove)',value:''}
  ]);
  // A stored draft survives a hard reload and never publishes by itself.
  const sword=panel.locator('[data-localization-id="equipment.0.2"]');
  await sword.locator('textarea').fill('Меч в облачном черновике');
  await sword.getByRole('button',{name:'Сохранить черновик'}).click();
  await expect(panel.locator('.localization-queue summary')).toContainText('Saved translation drafts: 1');
  await expect(sword.locator('textarea')).toHaveValue('Меч в облачном черновике');
  await expect(sword).toContainText('Черновик сохранён в D1');
  await expect(panel).toContainText('Не сохранено: 0');
  await page.reload();
  await expect(panel.locator('.localization-queue summary')).toContainText('Saved translation drafts: 1');
  await expect(panel.locator('[data-localization-id="equipment.0.2"] textarea')).toHaveValue('Меч в облачном черновике');
  expect(saved.has(key('game','ru','equipment.0.2'))).toBe(false,
    'Saving to D1 drafts must not publish the translation override');

  const queue=panel.locator('.localization-queue');
  await queue.locator('summary').click();
  await expect(queue.locator('.localization-queue-row')).toHaveCount(1);
  await queue.getByRole('combobox',{name:'Draft language'}).selectOption('en');
  await expect(queue.locator('.localization-queue-row')).toHaveCount(0);
  await queue.getByRole('combobox',{name:'Draft language'}).selectOption('ru');
  const filter=queue.getByRole('searchbox',{name:'Search saved draft translations'});
  await filter.fill('другой перевод');
  await expect(queue.locator('.localization-queue-row')).toHaveCount(0);
  await filter.fill('Меч в облачном');
  await expect(queue.locator('.localization-queue-row')).toHaveCount(1);
  const checkbox=queue.locator('.localization-queue-row input[type="checkbox"]');
  await checkbox.check();
  await expect(queue).toContainText('Selected: 1 of 1');
  await expect(checkbox).toBeFocused();

  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    const dimension=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    expect(dimension.scroll).toBeLessThanOrEqual(dimension.width+1);
  }
});


test('four inline languages publish changed texts atomically without language filter navigation',async({page})=>{
  await page.goto('/');
  await page.setContent('<main><article class="localization-item" id="four-language-test"></article></main>');
  await page.addScriptTag({path:'admin-api/public/localization-four-language.js'});
  const source=()=>({
    id:'header.updates',scope:'ui',kind:'interface',source:{en:'Updates'},
    translations:['ru','en','jp','tw'].map((locale)=>({
      locale,effective:({ru:'Обновления',en:'Updates',jp:'更新',tw:'更新資訊'})[locale],
      baseline:({ru:'Обновления',en:'Updates',jp:'更新',tw:'更新資訊'})[locale],
      origin:'import',baselineOrigin:'import',version:0
    }))
  });
  const record=source();
  await page.evaluate(record=>{
    const requests=[],changed=new Map();
    window.editorRequests=requests;
    const drafts=new Map();
    const api=async(method,payload,path)=>{
      requests.push({method,payload,path});
      if(path==='/api/admin/localization/publish-batch'){
        if(payload.items.some(i=>i.expectedVersion!==0))throw Error('409 version conflict');
        for(const item of payload.items)changed.set(item.locale,item.value);
        return {ok:true,count:payload.items.length,operationId:payload.operationId};
      }
      if(path?.startsWith('/api/admin/localization/operations'))return {ok:true,found:false};
      return {ok:true,version:1};
    };
    window.PandoraFourLanguageEditor.mount(document.getElementById('four-language-test'),record,{
      api,drafts,queued:{get:()=>null,history:()=>{}},
      onPublished:()=>{window.publishCount=(window.publishCount||0)+1;},
      onDirtyChanged:()=>{},report:(text,bad)=>{window.editorMessage={text,bad};}
    });
  },record);
  const card=page.locator('#four-language-test');
  const boxes=card.locator('[data-translation-input]');
  await expect(boxes).toHaveCount(4);
  await expect(card.locator('[data-translation-locale]')).toHaveCount(4);
  await expect(card.locator('[data-publish-all-languages]')).toBeDisabled();
  await card.locator('[data-translation-input="ru"]').fill('Новые обновления');
  await card.locator('[data-translation-input="jp"]').fill('新しい更新');
  await card.locator('[data-publish-all-languages]').click();
  await expect(card.locator('[data-translation-input="ru"]')).toHaveValue('Новые обновления');
  await expect(card.locator('[data-translation-input="jp"]')).toHaveValue('新しい更新');
  await expect(card.locator('[data-publish-all-languages]')).toBeDisabled();
  const requests=await page.evaluate(()=>window.editorRequests);
  const batch=requests.find(x=>x.path==='/api/admin/localization/publish-batch');
  expect(batch).toBeTruthy();
  expect(batch.payload.items.map(x=>x.locale)).toEqual(['ru','jp']);
  expect(batch.payload.items.map(x=>x.value)).toEqual(['Новые обновления','新しい更新']);
  expect(batch.payload.items.every(x=>x.expectedVersion===0)).toBe(true);
  expect(requests.filter(x=>x.path==='/api/admin/localization/publish-batch')).toHaveLength(1);
  expect(await page.evaluate(()=>window.publishCount)).toBe(1);
  // These fields were not published and keep their original wording.
  await expect(card.locator('[data-translation-input="en"]')).toHaveValue('Updates');
  await expect(card.locator('[data-translation-input="tw"]')).toHaveValue('更新資訊');
});

test('four-language card rejects invalid placeholder edits and leaves other locales unchanged',async({page})=>{
  await page.goto('/');
  await page.setContent('<article class="localization-item" id="guarded-languages"></article>');
  await page.addScriptTag({path:'admin-api/public/localization-four-language.js'});
  await page.evaluate(()=>{
    window.writeAttempts=[];
    const translations=['ru','en','jp','tw'].map(locale=>({
      locale,effective:'Language '+locale+' {version}',baseline:'Language '+locale+' {version}',
      version:0,origin:'import',baselineOrigin:'import'
    }));
    window.PandoraFourLanguageEditor.mount(document.getElementById('guarded-languages'),
      {scope:'ui',id:'updates.latestForUsers',kind:'interface',source:{en:'Updates: {version}'},translations},{
        api:async(method,payload,path)=>{window.writeAttempts.push({method,payload,path});return {ok:true,count:1,version:1};},
        queued:{get:()=>null,history:()=>{}},drafts:new Map(),onDirtyChanged:()=>{},
        onPublished:()=>{},report:(text,bad)=>window.lastGuard={text,bad}
      });
  });
  const card=page.locator('#guarded-languages');
  const russian=card.locator('[data-translation-input="ru"]');
  await russian.fill('Обновления без версии');
  await expect(card.locator('[data-publish-all-languages]')).toBeDisabled();
  await card.getByRole('button',{name:'Опубликовать RU'}).click();
  expect(await page.evaluate(()=>window.lastGuard.bad)).toBe(true);
  expect(await page.evaluate(()=>window.writeAttempts)).toHaveLength(0);
  await russian.fill('Обновления: {version}');
  await expect(card.locator('[data-publish-all-languages]')).toBeEnabled();
});


test('full localization console renders and saves all four inline languages without changing the filter',async({page})=>{
  await page.goto('/');
  await page.setContent('<div id="localization-console"></div>');
  await page.evaluate(()=>{
    const translations=[
      ['ru','Обновления'],['en','Updates'],['jp','更新情報'],['tw','更新資訊']
    ].map(([locale,effective])=>({locale,effective,baseline:effective,
      baselineOrigin:'import',origin:'import',version:0,override:''}));
    const entry={scope:'ui',id:'header.updates',kind:'interface',
      source:{en:'Updates'},locale:'ru',baseline:'Обновления',effective:'Обновления',
      origin:'import',baselineOrigin:'import',version:0,translations};
    window.testWriters=[];
    window.PandoraBulkLocalization={mount:()=>({invalidate(){},destroy(){}})};
    window.PandoraLocalizationDrafts={mount:()=>({
      get:()=>null,history:()=>{},refresh:async()=>{},destroy:()=>{}
    })};
    window.fetch=async (url,options={})=>{
      const parsed=new URL(url,location.href),path=parsed.pathname;
      if(path==='/api/admin/localization/publish-batch'){
        const payload=JSON.parse(options.body);window.testWriters.push(payload);
        return new Response(JSON.stringify({ok:true,count:payload.items.length,operationId:payload.operationId}),
          {status:200,headers:{'content-type':'application/json'}});
      }
      if(path==='/api/admin/localization'){
        return new Response(JSON.stringify({ok:true,schemaVersion:1,scope:'ui',locale:'ru',
          page:0,pageSize:40,total:1,counts:{ui:275,game:2800},
          coverage:{total:1,translated:1},items:[entry]}),
          {status:200,headers:{'content-type':'application/json'}});
      }
      throw Error('Unexpected request '+path);
    };
  });
  await page.addScriptTag({path:'admin-api/public/localization-four-language.js'});
  await page.addScriptTag({path:'admin-api/public/localization-console.js'});
  await page.evaluate(()=>window.PandoraLocalizationConsole.start(()=>'unit-csrf',()=>{}));
  const panel=page.locator('#localization-console');
  await expect(panel.locator('[data-localization-id="header.updates"] [data-translation-input]')).toHaveCount(4);
  const filter=panel.getByRole('combobox',{name:'Язык статуса и покрытия'});
  await expect(filter).toHaveValue('ru');
  const card=panel.locator('[data-localization-id="header.updates"]');
  await card.locator('[data-translation-input="jp"]').fill('新しい更新');
  await card.locator('[data-translation-input="tw"]').fill('新的更新');
  await card.locator('[data-publish-all-languages]').click();
  await expect(filter).toHaveValue('ru');
  await expect.poll(()=>page.evaluate(()=>window.testWriters.length)).toBe(1);
  const data=await page.evaluate(()=>window.testWriters[0]);
  expect(data.items.map(x=>x.locale)).toEqual(['jp','tw']);
  expect(data.items.map(x=>x.value)).toEqual(['新しい更新','新的更新']);
  expect(data.items.every(x=>x.expectedVersion===0)).toBeTruthy();
  expect(data.items.every(x=>x.expectedEffective)).toBeTruthy();
  await expect(card.locator('[data-translation-input="ru"]')).toHaveValue('Обновления');
  await expect(card.locator('[data-translation-input="en"]')).toHaveValue('Updates');
  await page.evaluate(()=>window.PandoraLocalizationConsole.clear());
  await expect(panel.locator('[data-localization-id]')).toHaveCount(0);
});


test('four-language editor localizes its buttons and statuses in place without losing drafts',async({page})=>{
  await page.goto('/');
  await page.setContent('<article id="four-locales"></article>');
  await page.evaluate(()=>{
    const dictionaries={
      ru:{fourPublishAll:'Опубликовать изменения во всех языках',
        fourStage:'В черновики',fourReset:'Вернуть базовый',
        fourPublishLocale:'Опубликовать {locale}',fourUnsavedStatus:'Изменено · не опубликовано',
        fourBatchPublished:'Опубликовано {count} языковых вариантов для {id}.'},
      en:{fourPublishAll:'Publish changes in all languages',fourStage:'Save draft',
        fourReset:'Restore baseline',fourPublishLocale:'Publish {locale}',
        fourUnsavedStatus:'Modified · not published',
        fourBatchPublished:'Published {count} language variants for {id}.'},
      jp:{fourPublishAll:'変更した言語をすべて公開',fourStage:'下書きを保存',
        fourReset:'基準に戻す',fourPublishLocale:'{locale}を公開',
        fourUnsavedStatus:'変更済み · 未公開'},
      tw:{fourPublishAll:'發布所有已修改的語言',fourStage:'儲存草稿',
        fourReset:'還原基準文字',fourPublishLocale:'發布 {locale}',
        fourUnsavedStatus:'已修改 · 尚未發布'}
    };
    let current='en';
    window.editorWrites=[];
    window.PandoraAdminI18n={
      t:(key,fallback)=>dictionaries[current]?.[key.replace('adminShell.','')]||fallback,
      change:locale=>{current=locale;window.dispatchEvent(new Event('pandora-admin:localechange'));},
      getLocale:()=>current
    };
  });
  await page.addScriptTag({path:'admin-api/public/localization-four-language.js'});
  await page.evaluate(()=>{
    const translations=['ru','en','jp','tw'].map((locale,i)=>({
      locale,effective:['Обновления','Updates','更新','更新資訊'][i],
      baseline:['Обновления','Updates','更新','更新資訊'][i],
      origin:'import',baselineOrigin:'import',version:0
    }));
    window.unsavedDrafts=new Map();
    window.PandoraFourLanguageEditor.mount(document.getElementById('four-locales'),{
      scope:'ui',id:'header.updates',kind:'interface',source:{en:'Updates'},translations
    },{
      drafts:window.unsavedDrafts,queued:{get:()=>null,history:()=>{}},
      api:async(method,payload,path)=>{
        if(path==='/api/admin/localization/publish-batch'){
          window.editorWrites.push(payload);
          return {ok:true,count:payload.items.length};
        }
        throw Error('Unexpected route '+path);
      },
      report:(message,isError)=>{window.lastEditorReport={message,isError};},
      onPublished:()=>{},onDirtyChanged:()=>{}
    });
  });
  const card=page.locator('#four-locales');
  await expect(card.locator('[data-publish-all-languages]')).toHaveText('Publish changes in all languages');
  await expect(card.getByRole('button',{name:'Save draft'})).toHaveCount(4);
  await card.locator('[data-translation-input="ru"]').fill('Обновления страницы');
  await card.locator('[data-translation-input="jp"]').fill('最新の更新');
  const values=['Обновления страницы','Updates','最新の更新','更新資訊'];
  for(const [locale,expected] of [
    ['ru','Опубликовать изменения во всех языках'],
    ['jp','変更した言語をすべて公開'],
    ['tw','發布所有已修改的語言'],
    ['en','Publish changes in all languages']
  ]){
    await page.evaluate(language=>window.PandoraAdminI18n.change(language),locale);
    await expect(card.locator('[data-publish-all-languages]')).toHaveText(expected);
    for(const [i,code] of ['ru','en','jp','tw'].entries())
      await expect(card.locator('[data-translation-input="'+code+'"]')).toHaveValue(values[i]);
    expect(await page.evaluate(()=>window.unsavedDrafts.size)).toBe(2);
  }
  await expect(card.locator('[data-dirty="true"]')).toHaveCount(2);
  await card.locator('[data-publish-all-languages]').click();
  await expect(card.locator('[data-publish-all-languages]')).toBeDisabled();
  const saved=await page.evaluate(()=>window.editorWrites);
  expect(saved).toHaveLength(1);
  expect(saved[0].items.map(item=>item.locale)).toEqual(['ru','jp']);
  expect(saved[0].items.every(item=>item.expectedVersion===0)).toBe(true);
  expect(await page.evaluate(()=>window.unsavedDrafts.size)).toBe(0);
  expect(await page.evaluate(()=>window.lastEditorReport.message)).toContain('Published 2 language variants');
});


test('D1 translation-center metadata follows four admin languages without erasing edited values',async({page})=>{
  await page.goto('/');
  await page.setContent('<div id="localization-console"></div>');
  await page.evaluate(()=>{
    let active='en';
    const translated={
      en:{locKindSkillName:'Skill name',locOriginFallback:'Untranslated · source text',
        locSourceEnglish:'Original (EN)',locEffectiveText:'Translation used by the site',
        locCompareLanguages:'Compare RU / EN / JP / TW'},
      ru:{locKindSkillName:'Название умения',locOriginFallback:'Нет перевода · исходный текст',
        locSourceEnglish:'Оригинал (EN)',locEffectiveText:'Перевод, используемый сайтом',
        locCompareLanguages:'Сравнить RU / EN / JP / TW'},
      jp:{locKindSkillName:'スキル名',locOriginFallback:'未翻訳 · 原文',
        locSourceEnglish:'原文 (EN)',locEffectiveText:'サイトで使用中の翻訳',
        locCompareLanguages:'RU / EN / JP / TW を比較'},
      tw:{locKindSkillName:'技能名稱',locOriginFallback:'尚未翻譯 · 原始文字',
        locSourceEnglish:'原文 (EN)',locEffectiveText:'網站目前使用的翻譯',
        locCompareLanguages:'比較 RU / EN / JP / TW'}
    };
    window.PandoraAdminI18n={
      t:(key,fallback)=>translated[active][key.replace('adminShell.','')]||fallback,
      apply:()=>document.querySelectorAll('[data-admin-i18n]').forEach(el=>{
        const value=translated[active][el.dataset.adminI18n.replace('adminShell.','')];
        if(value)el.textContent=value;
      }),
      change:language=>{active=language;window.PandoraAdminI18n.apply();
        window.dispatchEvent(new Event('pandora-admin:localechange'));},
      getLocale:()=>active
    };
    window.PandoraBulkLocalization={mount:()=>({invalidate(){},destroy(){}})};
    window.fetch=async url=>{
      if(!String(url).includes('/api/admin/localization'))throw Error('Unexpected request '+url);
      return new Response(JSON.stringify({ok:true,counts:{game:1,ui:0},total:1,
        items:[{id:'skill_entry.1.2',scope:'game',locale:'ru',kind:'skill_entry',
          origin:'fallback',baselineOrigin:'fallback',baseline:'Flaming Arrow',
          effective:'Flaming Arrow',source:{en:'Flaming Arrow'},version:0,
          override:''}]}),{status:200,headers:{'content-type':'application/json'}});
    };
  });
  await page.addScriptTag({path:'admin-api/public/localization-console.js'});
  await page.evaluate(()=>window.PandoraLocalizationConsole.start(()=>'',()=>{}));
  const card=page.locator('[data-localization-id="skill_entry.1.2"]');
  const input=card.locator('textarea');
  await expect(card.locator('[data-admin-i18n="adminShell.locKindSkillName"]')).toHaveText('Skill name');
  await input.fill('Unsaved custom translation');
  const expected={
    en:['Skill name','Untranslated · source text','Original (EN)'],
    ru:['Название умения','Нет перевода · исходный текст','Оригинал (EN)'],
    jp:['スキル名','未翻訳 · 原文','原文 (EN)'],
    tw:['技能名稱','尚未翻譯 · 原始文字','原文 (EN)']
  };
  for(const language of ['jp','tw','ru','en']){
    await page.evaluate(language=>window.PandoraAdminI18n.change(language),language);
    await expect(card.locator('[data-admin-i18n="adminShell.locKindSkillName"]')).toHaveText(expected[language][0]);
    await expect(card.locator('[data-admin-i18n="adminShell.locOriginFallback"]')).toHaveText(expected[language][1]);
    await expect(card.locator('[data-admin-i18n="adminShell.locSourceEnglish"]')).toHaveText(expected[language][2]);
    await expect(input).toHaveValue('Unsaved custom translation');
    await expect(card).toHaveAttribute('data-dirty','true');
  }
});

test('dynamic D1 status translations follow locale switches without replacing unsaved textarea values',async({page})=>{
  await page.goto('/');
  await page.setContent('<div id="localization-console"></div>');
  await page.evaluate(()=>{
    let locale='en';
    const dictionaries={
      en:{locUnsavedCount:'Unsaved: {count}',locDirtyLocal:'Modified locally',
        locPageCount:'{first}–{last} of {total}',locCoverageCount:'Translated: {translated} / {total} · {percent}% ({locale})',
        locSectionSummary:'Section: {count} keys. On this page: {pageCount}.'},
      ru:{locUnsavedCount:'Не сохранено: {count}',locDirtyLocal:'Изменено локально',
        locPageCount:'{first}–{last} из {total}',locCoverageCount:'Переведено: {translated} / {total} · {percent}% ({locale})',
        locSectionSummary:'Раздел: {count} ключей. В этой странице: {pageCount}.'},
      jp:{locUnsavedCount:'未保存: {count}',locDirtyLocal:'ローカルで変更済み',
        locPageCount:'{total} 件中 {first}～{last} 件'},
      tw:{locUnsavedCount:'未儲存：{count}',locDirtyLocal:'已在本機修改',
        locPageCount:'{total} 筆中的第 {first}–{last} 筆'}
    };
    window.PandoraAdminI18n={
      t:(key,fallback)=>dictionaries[locale]?.[key.replace('adminShell.','')]||fallback,
      apply:()=>{},
      change:language=>{locale=language;window.dispatchEvent(new Event('pandora-admin:localechange'));},
      getLocale:()=>locale
    };
    window.PandoraBulkLocalization={mount:()=>({invalidate(){},destroy(){}})};
    window.fetch=async url=>{
      if(!String(url).includes('/api/admin/localization'))throw Error('Unexpected route');
      return new Response(JSON.stringify({ok:true,counts:{game:1,ui:0},total:1,
        coverage:{translated:0,total:1},items:[{id:'skill_entry.1.2',scope:'game',
          locale:'ru',kind:'skill_entry',origin:'fallback',baselineOrigin:'fallback',
          baseline:'Flaming Arrow',effective:'Flaming Arrow',
          source:{en:'Flaming Arrow'},version:0,override:''}]}),
        {status:200,headers:{'content-type':'application/json'}});
    };
  });
  await page.addScriptTag({path:'admin-api/public/localization-console.js'});
  await page.evaluate(()=>window.PandoraLocalizationConsole.start(()=>'',()=>{}));
  const card=page.locator('[data-localization-id="skill_entry.1.2"]');
  const input=card.locator('textarea');
  await input.fill('Manually edited untranslated record');
  const expected={
    ru:['Не сохранено: 1','Изменено локально','1–1 из 1'],
    en:['Unsaved: 1','Modified locally','1–1 of 1'],
    jp:['未保存: 1','ローカルで変更済み','1 件中 1～1 件'],
    tw:['未儲存：1','已在本機修改','1 筆中的第 1–1 筆']
  };
  for(const lang of ['jp','tw','ru','en']){
    await page.evaluate(value=>window.PandoraAdminI18n.change(value),lang);
    await expect(page.locator('.localization-filters output')).toHaveText(expected[lang][0]);
    await expect(card.locator('.localization-dirty')).toHaveText(expected[lang][1]);
    await expect(page.locator('.localization-pagination output')).toHaveText(expected[lang][2]);
    await expect(input).toHaveValue('Manually edited untranslated record');
    await expect(card).toHaveAttribute('data-dirty','true');
  }
  await expect(page.locator('.localization-status')).toContainText('Section: 1 keys');
  expect(await page.evaluate(()=>document.querySelectorAll('[data-admin-live-i18n] textarea').length)).toBe(0);
});

test('effective D1 coverage report reads 8 locale groups without posting or mutating drafts',async({page})=>{
  await page.goto('/');
  await page.setContent('<div id="localization-console"></div>');
  await page.evaluate(()=>{
    window.coverageRequests=[];
    window.PandoraAdminI18n={t:(key,fallback)=>fallback,apply:()=>{}};
    window.PandoraBulkLocalization={mount:()=>({invalidate(){},destroy(){}})};
    window.fetch=async(url,options)=>{
      const parsed=new URL(String(url),location.href);
      window.coverageRequests.push({url:parsed.href,method:options?.method||'GET'});
      if(parsed.searchParams.get('status')==='missing'){
        const game=parsed.searchParams.get('scope')==='game';
        return new Response(JSON.stringify({ok:true,coverage:{total:game?100:15,
          translated:game?75:12},total:game?25:3,items:[],counts:{game:100,ui:15}}),
          {headers:{'content-type':'application/json'}});
      }
      return new Response(JSON.stringify({ok:true,counts:{game:100,ui:15},
        total:0,items:[],coverage:{translated:0,total:0}}),
        {headers:{'content-type':'application/json'}});
    };
  });
  await page.addScriptTag({path:'admin-api/public/localization-console.js'});
  await page.evaluate(()=>window.PandoraLocalizationConsole.start(()=>'',()=>{}));
  await page.locator('[data-admin-i18n="adminShell.locAuditAction"]').click();
  const rows=page.locator('.localization-audit-row');
  await expect(rows).toHaveCount(8);
  await expect(page.locator('.localization-audit')).toContainText('Переведено 75 из 100 · отсутствует 25');
  await expect(page.locator('.localization-audit')).toContainText('Переведено 12 из 15 · отсутствует 3');
  const requests=await page.evaluate(()=>window.coverageRequests);
  const audit=requests.filter(row=>new URL(row.url).searchParams.get('status')==='missing');
  expect(audit).toHaveLength(8);
  expect(audit.every(row=>row.method==='GET')).toBe(true);
  await rows.first().getByRole('button',{name:'Показать непереведённые записи'}).click();
  await expect(page.getByRole('combobox',{name:'Статус перевода'})).toHaveValue('missing');
  await expect(page.getByRole('combobox',{name:'Язык статуса и покрытия'})).toHaveValue('ru');
  expect((await page.evaluate(()=>window.coverageRequests)).every(row=>row.method==='GET')).toBe(true);
});

test('D1 bulk-preview feedback changes language without rewriting input or calling publish',async({page})=>{
  await page.goto('about:blank');
  await page.setContent('<div id="bulk-host"></div>');
  await page.evaluate(()=>{
    let locale='ru';
    window.bulkApiRequests=[];
    window.PandoraAdminI18n={
      t:(key,fallback)=>{
        if(key==='adminShell.bulkResetPreview')
          return locale==='jp'?'プレビューをクリアしました。単語と条件を確認してください。':
            locale==='en'?'Preview cleared. Check the word and filters, then search again.':fallback;
        return fallback;
      },apply:()=>{},
      change:value=>{locale=value;window.dispatchEvent(new Event('pandora-admin:localechange'));}
    };
  });
  await page.addScriptTag({path:'admin-api/public/localization-bulk.js'});
  await page.evaluate(()=>{
    window.bulkEditor=PandoraBulkLocalization.mount(document.getElementById('bulk-host'),{
      api:async(method,payload,url)=>{window.bulkApiRequests.push({method,url});throw Error('No API calls expected');},
      getContext:()=>({scope:'game',locale:'ru',group:'all'}),
      hasDraft:()=>false,onPublished:()=>{throw Error('Unexpected publication')}
    });
  });
  const panel=page.locator('#bulk-host');
  await panel.locator('.localization-bulk > summary').click();
  const [word,translation]=[panel.locator('input').nth(0),panel.locator('input').nth(1)];
  await word.fill('Warrior');
  await translation.fill('Воин');
  await expect(panel.locator('.localization-bulk-state')).toHaveText('Предпросмотр сброшен. Проверь слово и параметры, затем выполни поиск.');
  await page.evaluate(()=>window.PandoraAdminI18n.change('jp'));
  await expect(panel.locator('.localization-bulk-state')).toHaveText('プレビューをクリアしました。単語と条件を確認してください。');
  await expect(word).toHaveValue('Warrior');
  await expect(translation).toHaveValue('Воин');
  await page.evaluate(()=>window.PandoraAdminI18n.change('en'));
  await expect(panel.locator('.localization-bulk-state')).toHaveText('Preview cleared. Check the word and filters, then search again.');
  expect(await page.evaluate(()=>window.bulkApiRequests)).toEqual([]);
  await page.evaluate(()=>window.bulkEditor.destroy());
});
