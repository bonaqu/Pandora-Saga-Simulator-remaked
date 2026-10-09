import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const origin = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';

test('admin UI drafts survive search, pagination and locale changes, then save safely', async ({page}) => {
  await page.setViewportSize({width:1280,height:900});
  const baseIds=['header.updates','hero.version',...Array.from({length:45},(_,i)=>'test.'+i)];
  const changes=new Map(); let conflict=false;
  const records=['ru','en'].flatMap(locale=>baseIds.map(id=>({
    id,locale,source:id==='header.updates'?'Updates':id,value:'',
    version:0,overridden:false
  })));
  await page.route(origin+'/**',async route=>{
    const url=new URL(route.request().url()),path=url.pathname;
    if(path==='/api/session') return route.fulfill({json:{
      ok:true,username:'admin',csrfToken:'only-synthetic-test-csrf',expiresAt:9999999999
    }});
    if(path==='/api/admin/ui-translations') {
      if(route.request().method()==='GET') return route.fulfill({json:{
        ok:true,schemaVersion:1,source:'translations.xlsx',items:records
      }});
      const input=route.request().postDataJSON();
      if(conflict) return route.fulfill({status:409,json:{ok:false,message:'Translation changed in another session'}});
      const row=records.find(row=>row.locale===input.locale&&row.id===input.id);
      if(input.expectedVersion!==row.version)return route.fulfill({status:409,json:{ok:false,message:'Stale version'}});
      row.version++;row.value=input.value;row.overridden=Boolean(input.value);
      changes.set(input.locale+':'+input.id,input.value);
      return route.fulfill({json:{ok:true,id:row.id,locale:row.locale,value:row.value,
        version:row.version,overridden:row.overridden}});
    }
    if(path==='/api/admin/result-labels') return route.fulfill({json:{
      ok:true,schemaVersion:1,items:[]
    }});
    const file=(path==='/admin'||path==='/admin/')?'admin.html':path.replace(/^\//,'');
    const assets=new Set(['admin.html','admin.css','admin.js','catalog-ui.js','result-labels.js','ui-translations.js']);
    if(!assets.has(file))return route.fulfill({status:404,body:'Not found'});
    const data=fs.readFileSync(new URL('../../admin-api/public/'+file,import.meta.url),'utf8');
    return route.fulfill({body:data,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript'});
  });
  await page.goto(origin+'/admin');
  const panel=page.locator('#ui-translation-editor details');
  await expect(panel).toBeVisible();
  await panel.locator('summary').click();
  const row=page.locator('[data-ui-translation-id="header.updates"][data-ui-locale="ru"]');
  const editor=row.locator('input');
  await editor.fill('История обновлений');
  await expect(row).toHaveAttribute('data-ui-unsaved','true');
  await expect(page.locator('[data-ui-draft-count]')).toContainText('1');
  const search=panel.getByRole('searchbox');
  await search.fill('test.45');
  await expect(row).toHaveCount(0);
  await search.fill('');
  await expect(editor).toHaveValue('История обновлений');
  await panel.getByRole('button',{name:'Вперёд →'}).click();
  await panel.getByRole('button',{name:'← Назад'}).click();
  await expect(editor).toHaveValue('История обновлений');
  await panel.getByRole('combobox',{name:'Язык перевода'}).selectOption('en');
  await panel.getByRole('combobox',{name:'Язык перевода'}).selectOption('ru');
  await expect(editor).toHaveValue('История обновлений');

  conflict=true;
  await row.getByRole('button',{name:'Сохранить'}).click();
  await expect(editor).toHaveValue('История обновлений');
  await expect(page.locator('[data-ui-draft-count]')).toContainText('1');
  await expect(panel.locator('.result-label-status')).toContainText('Translation changed in another session');
  conflict=false;
  await row.getByRole('button',{name:'Сохранить'}).click();
  await expect(page.locator('[data-ui-draft-count]')).toContainText('0');
  expect(changes.get('ru:header.updates')).toBe('История обновлений');
  await expect(row).toHaveAttribute('data-ui-unsaved','false');
  await editor.fill('Не надо сохранять');
  await editor.press('Escape');
  await expect(editor).toHaveValue('История обновлений');
  await expect(page.locator('[data-ui-draft-count]')).toContainText('0');
  await editor.fill('Отменяем черновик');
  page.once('dialog',dialog=>dialog.accept());
  await panel.getByRole('button',{name:'Отменить черновики'}).click();
  await expect(editor).toHaveValue('История обновлений');
  await expect(page.locator('[data-ui-draft-count]')).toContainText('0');
});

test('mobile admin UI translation cards fit the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  // Pure static smoke prevents regressions of the responsive CSS contract.
  await page.setContent('<link rel="stylesheet" href="'+origin+'/admin.css"><section id="ui-translation-editor"><div class="ui-translation-row" data-ui-unsaved="true"><div class="ui-translation-identity"><strong>long.interface.translation.name</strong></div><input value="Русский перевод"><span>Черновик</span><div class="ui-translation-actions"><button>Сохранить</button><button>Вернуть Excel</button></div></div></section>');
  await page.route(origin+'/admin.css',route=>route.fulfill({contentType:'text/css',body:fs.readFileSync(new URL('../../admin-api/public/admin.css',import.meta.url),'utf8')}));
  const widths=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport+1);
});
