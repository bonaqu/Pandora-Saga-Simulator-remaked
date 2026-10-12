import {test,expect} from '@playwright/test';

test('safe bulk preview errors switch D1 languages in place without rescanning or publishing',async({page})=>{
  await page.goto('about:blank');
  await page.setContent('<main id="localization-console"></main>');
  await page.evaluate(()=>{
    window.localeForAudit='ru';
    window.auditCalls=[];
    window.PandoraAdminI18n={
      t:(key,fallback)=>({
        en:{'adminShell.bulkTooManyToScan':'D1: Too many rows to preview safely.'},
        jp:{'adminShell.bulkTooManyToScan':'D1: 安全なプレビュー件数を超えました。'},
        tw:{'adminShell.bulkTooManyToScan':'D1：超過安全預覽筆數。'}
      })[window.localeForAudit]?.[key]||fallback,
      apply:()=>{},
      getLocale:()=>window.localeForAudit
    };
  });
  await page.addScriptTag({path:'admin-api/public/localization-bulk.js'});
  await page.evaluate(()=>{
    window.PandoraBulkLocalization.mount(document.getElementById('localization-console'),{
      api:async(method,payload,url)=>{
        window.auditCalls.push({method,url});
        return {ok:true,page:0,total:3501,items:[]};
      },
      getContext:()=>({scope:'game',locale:'ru',group:'all',status:'all'}),
      hasDraft:()=>false,onPublished:()=>{throw Error('Must not publish')}
    });
  });
  const pane=page.locator('.localization-bulk');
  await pane.locator('summary').click();
  await pane.locator('input[type="text"], input:not([type])').first().fill('Warrior');
  await pane.locator('input:not([type])').nth(1).fill('Воин');
  await pane.getByRole('button',{name:'Показать предварительный просмотр'}).click();
  const state=pane.locator('.localization-bulk-state');
  await expect(state).toContainText('Слишком много строк для безопасного предпросмотра');
  for(const [lang,expected] of [
    ['en','D1: Too many rows to preview safely.'],
    ['jp','D1: 安全なプレビュー件数を超えました。'],
    ['tw','D1：超過安全預覽筆數。'],
    ['ru','Слишком много строк для безопасного предпросмотра. Выбери более узкую категорию.']
  ]){
    await page.evaluate(lang=>{
      window.localeForAudit=lang;
      window.dispatchEvent(new Event('pandora-admin:localechange'));
    },lang);
    await expect(state).toHaveText(expected);
  }
  const calls=await page.evaluate(()=>window.auditCalls);
  expect(calls).toHaveLength(1);
  expect(calls[0].method).toBe('GET');
  expect(calls[0].url).toContain('/api/admin/localization?');
  await expect(pane.locator('.localization-bulk-row')).toHaveCount(0);
  await expect(pane.getByRole('button',{name:'Опубликовать выбранные'})).toBeDisabled();
});
