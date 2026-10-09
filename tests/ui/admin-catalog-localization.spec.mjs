import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { adminCatalog } from '../../admin-api/src/catalog.mjs';
import { adminLocalization } from '../../admin-api/src/localization.mjs';
import { adminLocalizationWorkflow } from '../../admin-api/src/localization-workflow.mjs';
import { draftFromSource } from '../../admin-api/src/catalog-model.mjs';

const origin='https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
function testDatabase(){
  const sqlite=new DatabaseSync(':memory:');
  for(const migration of ['0002_catalog.sql','0003_skill_variants.sql','0004_catalog_impact_revision.sql',
    '0005_result_labels.sql','0006_ui_translation_overrides.sql','0007_unified_localization.sql',
    '0008_localization_workflow.sql','0009_localization_query_indexes.sql']){
    sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/'+migration,import.meta.url),'utf8'));
  }
  const DB={
    prepare(sql){
      let args=[];return {
        bind(...values){args=values;return this;},
        async first(){return sqlite.prepare(sql).get(...args)||null;},
        async all(){return {results:sqlite.prepare(sql).all(...args)};},
        async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}
      };
    },
    async batch(statements){
      sqlite.exec('BEGIN');
      try{const values=[];for(const s of statements)values.push(await s.run());sqlite.exec('COMMIT');return values;}
      catch(error){sqlite.exec('ROLLBACK');throw error;}
    }
  };
  return {sqlite,DB};
}
test('unified translations show published catalog text and safely jump to same canonical editor',async({page})=>{
  const {DB,sqlite}=testDatabase(), env={DB},errors=[];
  const edit=draftFromSource(null,'equipment');
  edit.names={en:'Union Test Bow',ru:'Тестовый лук',jp:'弓',tw:'弓'};
  edit.description={en:'Catalog text',ru:'Текст каталога',jp:'説明',tw:'說明'};
  edit.baseAttack=40;
  const post=async(endpoint,payload)=>{
    const response=await adminCatalog(new Request(origin+'/api/admin/'+endpoint,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
    }),env,1000);
    expect([200,201]).toContain(response.status);return response.json();
  };
  const draft=await post('draft',{edit,expectedDraftVersion:0,expectedCatalogRevision:0});
  await post('publish',{id:draft.identity.id,expectedDraftVersion:draft.draftVersion,expectedCatalogRevision:draft.catalogRevision});
  const id=draft.identity.id;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(origin+'/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    if(path==='/api/session')return route.fulfill({json:{ok:true,username:'admin',csrfToken:'test-synthetic-only',expiresAt:9999999999}});
    if(path==='/api/auth/logout')return route.fulfill({json:{ok:true}});
    if(path.startsWith('/api/admin/')){
      try{
        const incoming=new Request(request.url(),{method:request.method(),headers:request.headers(),body:request.postData()||undefined});
        const response=path==='/api/admin/localization'?await adminLocalization(incoming,env)
          :path.startsWith('/api/admin/localization/')?await adminLocalizationWorkflow(incoming,env)
          :await adminCatalog(incoming,env,1000);
        return route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
      }catch(error){return route.fulfill({status:error.status||500,json:{ok:false,message:error.message}});}
    }
    const file=path==='/admin'?'admin.html':path.slice(1);
    const allow=['admin.html','admin.css','admin.js','catalog-ui.js','localization-console.js',
      'localization-drafts.js','localization-bulk.js'];
    if(!allow.includes(file))return route.fulfill({status:404});
    return route.fulfill({contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html',
      body:fs.readFileSync(new URL('../../admin-api/public/'+file,import.meta.url),'utf8')});
  });
  await page.goto(origin+'/admin');
  await expect(page.locator('#localization-console')).toBeVisible();
  await page.getByRole('combobox',{name:'Категория переводов'}).selectOption('equipment');
  await page.getByRole('searchbox',{name:'Поиск переводов'}).fill(id);
  const card=page.locator('[data-managed-by="catalog"]').filter({has:page.locator('[data-open-catalog="'+id+'"]')}).first();
  await expect(card).toBeVisible();
  await expect(card).toContainText('Тестовый лук');
  await expect(card.locator('textarea')).toHaveCount(0);
  await card.getByRole('button',{name:'Редактировать в каталоге'}).click();
  await expect(page.locator('#localization-console .localization-status')).toContainText('Открыта карточка');
  await expect(page.locator('.catalog-editor [data-field="names"][data-language="ru"]')).toHaveValue('Тестовый лук');
  await expect(page.locator('.catalog-editor')).toContainText('Union Test Bow');
  // Do not discard unsaved catalog changes when jumping from localization.
  await page.locator('.catalog-editor [data-field="names"][data-language="ru"]').fill('Незавершённая правка');
  page.once('dialog',dialog=>dialog.dismiss());
  await card.getByRole('button',{name:'Редактировать в каталоге'}).click();
  await expect(page.locator('.catalog-editor [data-field="names"][data-language="ru"]')).toHaveValue('Незавершённая правка');
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM localization_overrides').get().n).toBe(0);
  expect(errors).toEqual([]);
});
