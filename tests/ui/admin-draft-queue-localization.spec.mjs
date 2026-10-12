import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const en=JSON.parse(fs.readFileSync(new URL('../../localization/ui.en.json',import.meta.url),'utf8'));
const frozen=JSON.parse(fs.readFileSync(new URL('../../localization/approved-translations.v1.json',import.meta.url),'utf8'));

test('draft queue changes RU/EN/JP/TW texts without clearing search, checks or D1 draft state',async({page})=>{
  await page.goto('/');
  await page.setContent('<main id="host"></main>');
  await page.evaluate(({en,frozen})=>{
    window.__locale='en';window.__writes=0;
    const tr=(key,fallback)=>window.__locale==='ru'&&key==='adminShell.draftQueueCount'
      ? 'D1: черновиков {count}'
      : frozen.ui[window.__locale]?.[key]||en[key]||fallback;
    window.PandoraAdminI18n={t:tr,apply(){
      for(const [attribute,field] of [['data-admin-i18n','textContent'],
        ['data-admin-i18n-aria','aria-label'],['data-admin-i18n-placeholder','placeholder']]){
        for(const element of document.querySelectorAll('['+attribute+']')){
          const text=tr(element.getAttribute(attribute),
            field==='textContent'?element.textContent:element.getAttribute(field));
          if(field==='textContent')element.textContent=text;else element.setAttribute(field,text);
        }
      }
    }};
    window.__switch=locale=>{window.__locale=locale;PandoraAdminI18n.apply();
      dispatchEvent(new Event('pandora-admin:localechange'));};
    window.__api=async(method,body,path)=>{
      if(method!=='GET'){window.__writes++;throw Error('No writes in this test');}
      if(path==='/api/admin/localization/drafts')return {ok:true,count:1,items:[{
        scope:'game',id:'skill_entry.0.8',locale:'ru',text:'Providence review',
        version:4,sourceVersion:2,sourceText:'Providence'
      }]};
      if(path.startsWith('/api/admin/localization/history'))return {ok:true,items:[]};
      throw Error(path);
    };
  },{en,frozen});
  await page.addScriptTag({path:'admin-api/public/localization-drafts.js'});
  await page.evaluate(()=>window.__mounted=PandoraLocalizationDrafts.mount(
    document.getElementById('host'),{api:window.__api,onPublished(){},
      onQueueChanged(){},onJump(){window.__jump=true;}}));
  const q=page.locator('.localization-queue');
  await expect(q.locator('summary')).toHaveText('Saved translation drafts: 1');
  await q.locator('summary').click();
  const input=q.locator('input[type="search"]');
  await expect(input).toHaveAttribute('aria-label','Search saved draft translations');
  await input.fill('Providence');
  const language=q.locator('select').first();
  await language.selectOption('ru');
  const check=q.locator('.localization-queue-row input[type="checkbox"]');
  await check.check();
  await expect(q.locator('output')).toContainText('Selected: 1 of 1');
  for(const [locale,heading,selected] of [
    ['ru','D1: черновиков 1','Выбрано:'],
    ['jp','保存済みの翻訳下書き: 1 件','選択済み:'],
    ['tw','已儲存翻譯草稿：1 筆','已選取：'],
    ['en','Saved translation drafts: 1','Selected:']
  ]){
    await page.evaluate(lang=>window.__switch(lang),locale);
    await expect(q.locator('summary')).toHaveText(heading);
    await expect(q.locator('output')).toContainText(selected);
    await expect(check).toBeChecked();
    await expect(language).toHaveValue('ru');
    await expect(input).toHaveValue('Providence');
  }
  await page.evaluate(()=>window.__switch('jp'));
  await q.getByRole('button',{name:'開く'}).click();
  expect(await page.evaluate(()=>window.__jump)).toBe(true);
  expect(await page.evaluate(()=>window.__writes)).toBe(0);
  await page.evaluate(()=>window.__mounted.destroy());
  await expect(q).toHaveCount(0);
});

test('all draft-queue source placeholders match the three reviewed locale catalogs',()=>{
  const ids=Object.keys(en).filter(key=>key.startsWith('adminShell.draftQueue'));
  expect(ids).toHaveLength(34);
  const slots=value=>(String(value).match(/\{[A-Za-z0-9_]+\}/g)||[]).sort();
  for(const key of ids)for(const locale of ['ru','jp','tw']){
    const value=frozen.ui[locale][key];
    expect(typeof value,key+'/'+locale).toBe('string');
    expect(value.trim().length).toBeGreaterThan(0);
    expect(slots(value)).toEqual(slots(en[key]));
  }
});
