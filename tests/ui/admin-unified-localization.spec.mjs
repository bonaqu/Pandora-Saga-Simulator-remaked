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
        total:rows.length,page:pageNumber,pageSize:40,counts:{ui:242,game:2900},
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
  const missing=panel.locator('[data-localization-id="equipment.0.2"]');
  await expect(missing).toContainText('Нет перевода · исходный текст');
  await panel.getByRole('combobox',{name:'Статус перевода'}).selectOption('missing');
  await expect(missing).toBeVisible();
  await expect(panel.locator('[data-localization-id="skill_entry.7.5"]')).toHaveCount(0);
  await panel.getByRole('combobox',{name:'Статус перевода'}).selectOption('all');
  await russian.fill('Моя пылающая стрела');
  await expect(panel).toContainText('Не сохранено: 1');
  await panel.getByRole('combobox',{name:'Язык перевода'}).selectOption('jp');
  await expect(panel.locator('[data-localization-id="skill_entry.7.5"] textarea')).toHaveValue('フレーミングアロー');
  await panel.getByRole('combobox',{name:'Язык перевода'}).selectOption('ru');
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
