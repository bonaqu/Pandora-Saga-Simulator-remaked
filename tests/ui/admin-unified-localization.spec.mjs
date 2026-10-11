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
  await expect(panel.getByRole('combobox',{name:'Язык поиска и статистики'})).toHaveValue('jp');
  await expect(panel.locator('[data-localization-id="skill_entry.7.5"] textarea')).toHaveValue('フレーミングアロー');
  await panel.getByRole('combobox',{name:'Язык поиска и статистики'}).selectOption('ru');
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
  await panel.getByRole('combobox',{name:'Язык поиска и статистики'}).selectOption('jp');
  await expect(panel.locator('[data-localization-id="skill_entry.7.5"] textarea')).toHaveValue('フレーミングアロー');
  await panel.getByRole('combobox',{name:'Язык поиска и статистики'}).selectOption('ru');
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
  await expect(panel.locator('.localization-queue summary')).toContainText('Сохранённые черновики переводов: 1');
  await expect(sword.locator('textarea')).toHaveValue('Меч в облачном черновике');
  await expect(sword).toContainText('Черновик сохранён в D1');
  await expect(panel).toContainText('Не сохранено: 0');
  await page.reload();
  await expect(panel.locator('.localization-queue summary')).toContainText('Сохранённые черновики переводов: 1');
  await expect(panel.locator('[data-localization-id="equipment.0.2"] textarea')).toHaveValue('Меч в облачном черновике');
  expect(saved.has(key('game','ru','equipment.0.2'))).toBe(false,
    'Saving to D1 drafts must not publish the translation override');

  const queue=panel.locator('.localization-queue');
  await queue.locator('summary').click();
  await expect(queue.locator('.localization-queue-row')).toHaveCount(1);
  await queue.getByRole('combobox',{name:'Язык черновиков'}).selectOption('en');
  await expect(queue.locator('.localization-queue-row')).toHaveCount(0);
  await queue.getByRole('combobox',{name:'Язык черновиков'}).selectOption('ru');
  const filter=queue.getByRole('searchbox',{name:'Поиск среди сохранённых переводов'});
  await filter.fill('другой перевод');
  await expect(queue.locator('.localization-queue-row')).toHaveCount(0);
  await filter.fill('Меч в облачном');
  await expect(queue.locator('.localization-queue-row')).toHaveCount(1);
  const checkbox=queue.locator('.localization-queue-row input[type="checkbox"]');
  await checkbox.check();
  await expect(queue).toContainText('Выбрано: 1 из 1');
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
  const filter=panel.getByRole('combobox',{name:'Язык поиска и статистики'});
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
