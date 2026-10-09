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
    {scope:'ui',id:'header.updates',kind:'interface',source:{en:'Updates'},
      baseline:{ru:'Обновления',en:'Updates',jp:'アップデート',tw:'更新'},legacy:{ru:'Старый перевод'}},
  ];
  const saved=new Map(),requests=[];
  const expected=(item,lang)=>{
    const override=saved.get(key(item.scope,lang,item.id));
    const fromOld=item.legacy[lang];
    return override ? override.text || item.baseline[lang] : fromOld || item.baseline[lang];
  };
  await page.route(origin+'/**',async route=>{
    const url=new URL(route.request().url()),pathname=url.pathname;
    if(pathname==='/api/session')return route.fulfill({json:{
      ok:true,username:'admin',csrfToken:'synthetic-csrf',expiresAt:9999999999}});
    if(pathname==='/api/admin/localization'){
      if(route.request().method()==='POST'){
        expect(route.request().headers()['x-csrf-token']).toBe('synthetic-csrf');
        const input=route.request().postDataJSON();
        requests.push(input);
        const k=key(input.scope,input.locale,input.id),prior=saved.get(k);
        if(input.expectedVersion!==(prior?.version||0))
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
    if(['admin.html','admin.css','admin.js','localization-console.js','localization-bulk.js'].includes(asset)){
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
  await expect(panel).toContainText('Черновики: 1');
  await panel.getByRole('combobox',{name:'Язык перевода'}).selectOption('jp');
  await expect(panel.locator('[data-localization-id="skill_entry.7.5"] textarea')).toHaveValue('フレーミングアロー');
  await panel.getByRole('combobox',{name:'Язык перевода'}).selectOption('ru');
  await expect(russian).toHaveValue('Моя пылающая стрела');
  await panel.locator('[data-localization-id="skill_entry.7.5"]').getByRole('button',{name:'Опубликовать'}).click();
  await expect(russian).toHaveValue('Моя пылающая стрела');
  await expect(panel).toContainText('Черновики: 0');
  expect(requests.at(-1)).toEqual({scope:'game',id:'skill_entry.7.5',locale:'ru',expectedVersion:0,value:'Моя пылающая стрела'});
  await panel.getByRole('combobox',{name:'Раздел'}).selectOption('ui');
  const ui=panel.locator('[data-localization-id="header.updates"]');
  await expect(ui.locator('textarea')).toHaveValue('Старый перевод');
  await ui.getByRole('button',{name:'Вернуть базовый текст'}).click();
  await expect(ui.locator('textarea')).toHaveValue('Обновления');
  expect(requests.at(-1)).toMatchObject({scope:'ui',id:'header.updates',locale:'ru',value:''});
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    const dimension=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    expect(dimension.scroll).toBeLessThanOrEqual(dimension.width+1);
  }
});
