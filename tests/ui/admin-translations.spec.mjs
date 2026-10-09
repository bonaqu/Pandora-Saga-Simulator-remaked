import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const origin='https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';

test('historical calculator result labels are editable in unified translations without duplicate legacy panels',async({page})=>{
  let revision=0,override=null;
  const writes=[];
  await page.route(origin+'/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname;
    if(path==='/api/session')return route.fulfill({json:{
      ok:true,username:'admin',csrfToken:'synthetic-csrf',expiresAt:9999999999}});
    if(path==='/api/admin/localization'){
      if(req.method()==='POST'){
        const input=req.postDataJSON();writes.push(input);
        expect(req.headers()['x-csrf-token']).toBe('synthetic-csrf');
        expect(input.id).toBe('calculator.status.0');
        expect(input.expectedVersion).toBe(revision);
        expect(input.expectedEffective).toBe(override===null?'Старый D1 перевод':override||'ОЗ');
        override=input.value;revision++;
        return route.fulfill({json:{ok:true,scope:'game',locale:'ru',id:input.id,version:revision,override}});
      }
      const group=url.searchParams.get('group')||'all',
        scope=url.searchParams.get('scope')||'game',
        lang=url.searchParams.get('locale')||'ru',
        q=(url.searchParams.get('q')||'').toLowerCase();
      const matched=scope==='game'&&(group==='all'||group==='stats')&&
        (!q||['calculator.status.0','LP','ОЗ','Старый D1 перевод'].some(s=>s.toLowerCase().includes(q)));
      const row={scope:'game',id:'calculator.status.0',locale:lang,kind:'calculator_label',
        source:{en:'LP',jp:'LP',tw:'HP'},baseline:lang==='ru'?'ОЗ':'LP',
        baselineOrigin:'import',effective:override===null?'Старый D1 перевод':override||'ОЗ',
        legacyValue:'Старый D1 перевод',version:revision,
        origin:override===null?'previous-admin':override?'admin':'import'};
      return route.fulfill({json:{ok:true,schemaVersion:1,scope,locale:lang,group,page:0,pageSize:40,
        total:matched?1:0,counts:{ui:242,game:2920},items:matched?[row]:[]}});
    }
    const file=(path==='/admin'||path==='/admin/')?'admin.html':path.slice(1);
    if(['catalog-ui.js','result-labels.js','ui-translations.js'].includes(file))
      return route.fulfill({contentType:'text/javascript',body:''});
    if(['admin.html','admin.css','admin.js','localization-console.js','localization-bulk.js'].includes(file))
      return route.fulfill({body:fs.readFileSync(new URL('../../admin-api/public/'+file,import.meta.url),'utf8'),
        contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript'});
    return route.fulfill({status:404});
  });
  await page.goto(origin+'/admin');
  await expect(page.locator('#admin-workspace')).toBeVisible();
  await expect(page.locator('#result-label-editor')).toHaveCount(0);
  await expect(page.locator('#ui-translation-editor')).toHaveCount(0);
  await expect(page.getByText('Дополнительные редакторы прежних переводов')).toHaveCount(0);
  const panel=page.locator('#localization-console');
  await panel.getByRole('combobox',{name:'Категория переводов'}).selectOption('stats');
  const row=panel.locator('[data-localization-id="calculator.status.0"]');
  await expect(row.locator('textarea')).toHaveValue('Старый D1 перевод');
  await row.getByRole('button',{name:'Вернуть базовый текст'}).click();
  await expect(row.locator('textarea')).toHaveValue('ОЗ');
  await expect(panel).toContainText('Базовый текст восстановлен');
  expect(writes).toHaveLength(1);
  expect(writes[0].value).toBe('');
  await page.reload();
  await expect(panel.locator('[data-localization-id="calculator.status.0"] textarea')).toHaveValue('ОЗ');
});

test('unified result-label translation editor fits mobile without horizontal clipping',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route(origin+'/admin.css',route=>route.fulfill({contentType:'text/css',body:fs.readFileSync(new URL('../../admin-api/public/admin.css',import.meta.url),'utf8')}));
  await page.setContent('<link rel="stylesheet" href="'+origin+'/admin.css"><section id="localization-console"><div class="localization-panel"><article class="localization-item"><div class="localization-identity"><strong>calculator.status.42</strong></div><textarea>Русский перевод</textarea><div class="localization-item-foot"><span>Черновик</span><button>Опубликовать</button><button>Вернуть базовый текст</button></div></article></div></section>');
  const widths=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport+1);
});
