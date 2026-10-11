import { test, expect } from '@playwright/test';
import english from '../../localization/ui.en.json' with {type:'json'};
import approved from '../../localization/approved-translations.v1.json' with {type:'json'};

function fixture() {
  const keys=Object.keys(english).filter(key=>key.startsWith('adminShell.'));
  const locales=Object.fromEntries(['ru','en','jp','tw'].map(locale=>[
    locale,Object.fromEntries(keys.map(key=>[
      key,approved.ui[locale]?.[key]||english[key]
    ]))
  ]));
  // An admin-published RU update must supersede approved static copy.
  locales.ru['adminShell.loginTitle']='Мой заголовок D1';
  return {ok:true,schemaVersion:1,locales};
}
const fragment=`
  <label for="admin-language" data-admin-i18n="adminShell.language">Interface language</label>
  <select id="admin-language"><option value="en">EN</option><option value="ru">RU</option>
    <option value="jp">JP</option><option value="tw">TW</option></select>
  <h1 data-admin-i18n="adminShell.loginTitle">GOD MODE REQUIRES AUTHENTICATION</h1>
  <p data-admin-i18n="adminShell.loginHint">Sign in to manage the Modern catalog.</p>
  <p aria-label="Quick navigation" data-admin-i18n-aria="adminShell.navigation"></p>
  <input name="username" id="username" value="admin"><input type="password" id="password">
  <form action="/api/auth/login" method="post"><button type="submit">AUTHENTICATE</button></form>
`;

test('admin shell switches all four languages using exact D1 effective text without changing credentials',async({page})=>{
  await page.goto('about:blank');
  await page.setContent(fragment);
  await page.locator('#password').fill('dummy-local-test');
  const data=fixture();
  await page.evaluate(value=>{
    window.fetch=async url=>{
      if(url!=='/api/admin-shell-localization')throw Error('Unexpected network request '+url);
      return new Response(JSON.stringify(value),{status:200,
        headers:{'content-type':'application/json'}});
    };
  },data);
  await page.addScriptTag({path:'admin-api/public/admin-i18n.js'});
  const select=page.locator('#admin-language');
  await expect(select).toBeEnabled();
  await select.selectOption('ru');
  await expect(page.locator('h1')).toHaveText('Мой заголовок D1');
  await expect(page.locator('[data-admin-i18n="adminShell.loginHint"]')).toHaveText(approved.ui.ru['adminShell.loginHint']);
  await expect(page.locator('[data-admin-i18n-aria]')).toHaveAttribute('aria-label',approved.ui.ru['adminShell.navigation']);
  await select.selectOption('jp');
  await expect(page.locator('h1')).toHaveText(approved.ui.jp['adminShell.loginTitle']);
  await expect(page.locator('html')).toHaveAttribute('lang','ja');
  await select.selectOption('tw');
  await expect(page.locator('h1')).toHaveText(approved.ui.tw['adminShell.loginTitle']);
  await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');
  await select.selectOption('en');
  await expect(page.locator('h1')).toHaveText(english['adminShell.loginTitle']);
  await expect(page.locator('#username')).toHaveValue('admin');
  await expect(page.locator('#password')).toHaveValue('dummy-local-test');
  await expect(page.locator('form')).toHaveAttribute('action','/api/auth/login');
  expect(await page.evaluate(()=>window.PandoraAdminI18n.getLocale())).toBe('en');
});

test('admin login stays accessible in original English if D1 locale endpoint fails',async({page})=>{
  await page.goto('about:blank');
  await page.setContent(fragment);
  await page.evaluate(()=>{
    window.fetch=async()=>new Response(JSON.stringify({ok:false}),{status:503});
  });
  await page.addScriptTag({path:'admin-api/public/admin-i18n.js'});
  const select=page.locator('#admin-language');
  await expect(select).toBeDisabled();
  await expect(page.locator('h1')).toHaveText('GOD MODE REQUIRES AUTHENTICATION');
  await expect(page.locator('form button')).toBeEnabled();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
});


test('translation workbench filters switch RU/EN/JP/TW without erasing search or saving changes',async({page})=>{
  await page.goto('about:blank');
  await page.setContent(fragment+'<div id="localization-console"></div>');
  await page.evaluate(dict=>{
    window.fetch=async (url)=>{
      if(url==='/api/admin-shell-localization')
        return new Response(JSON.stringify(dict),{status:200,headers:{'content-type':'application/json'}});
      if(String(url).startsWith('/api/admin/localization?'))
        return new Response(JSON.stringify({ok:true,schemaVersion:1,scope:'game',locale:'ru',
          page:0,pageSize:40,total:0,counts:{game:2800,ui:354},
          coverage:{translated:0,total:0},items:[]}),{status:200,headers:{'content-type':'application/json'}});
      throw Error('Unexpected request: '+url);
    };
    window.PandoraBulkLocalization={mount:()=>({invalidate(){},destroy(){}})};
    window.PandoraLocalizationDrafts={mount:()=>({
      get:()=>null,history:()=>{},refresh:async()=>{},destroy:()=>{}
    })};
  },fixture());
  await page.addScriptTag({path:'admin-api/public/admin-i18n.js'});
  await page.addScriptTag({path:'admin-api/public/localization-console.js'});
  await page.evaluate(()=>window.PandoraLocalizationConsole.start(()=>'synthetic-csrf',()=>{}));
  const language=page.locator('#admin-language');
  await expect(language).toBeEnabled();
  const console=page.locator('#localization-console');
  const heading=console.locator('[data-admin-i18n="adminShell.localizationHeading"]');
  const search=console.locator('input[type="search"]');
  await search.fill('check with ID 55');
  await language.selectOption('ru');
  await expect(heading).toHaveText(approved.ui.ru['adminShell.localizationHeading']);
  await expect(console.locator('[data-admin-i18n="adminShell.scopeGame"]'))
    .toHaveText(approved.ui.ru['adminShell.scopeGame']);
  await expect(search).toHaveAttribute('placeholder',approved.ui.ru['adminShell.localizationSearchPlaceholder']);
  await language.selectOption('jp');
  await expect(heading).toHaveText(approved.ui.jp['adminShell.localizationHeading']);
  await expect(console.locator('[data-admin-i18n="adminShell.categorySkills"]'))
    .toHaveText(approved.ui.jp['adminShell.categorySkills']);
  await expect(search).toHaveAttribute('placeholder',approved.ui.jp['adminShell.localizationSearchPlaceholder']);
  await language.selectOption('tw');
  await expect(heading).toHaveText(approved.ui.tw['adminShell.localizationHeading']);
  await expect(console.locator('[data-admin-i18n-aria="adminShell.filterScope"]'))
    .toHaveAttribute('aria-label',approved.ui.tw['adminShell.filterScope']);
  await language.selectOption('en');
  await expect(heading).toHaveText(english['adminShell.localizationHeading']);
  await expect(console.locator('[data-admin-i18n="adminShell.paginationNext"]'))
    .toHaveText(english['adminShell.paginationNext']);
  await expect(search).toHaveAttribute('placeholder',english['adminShell.localizationSearchPlaceholder']);
  await expect(search).toHaveValue('check with ID 55');
  await expect(page.locator('#username')).toHaveValue('admin');
  await expect(page.locator('#password')).toHaveValue('');
  await expect(console.locator('[data-admin-i18n]')).toHaveCount(23);
  await page.evaluate(()=>window.PandoraLocalizationConsole.clear());
});


test('bulk translation editor is D1-localized in four languages without changing text inputs or publication',async({page})=>{
  await page.goto('about:blank');
  await page.setContent(fragment+'<section id="bulk-host"></section>');
  await page.evaluate(data=>{
    window.fetch=async url=>{
      if(url!=='/api/admin-shell-localization')throw Error('Unexpected auth/public request '+url);
      return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
    };
  },fixture());
  await page.addScriptTag({path:'admin-api/public/admin-i18n.js'});
  await page.addScriptTag({path:'admin-api/public/localization-bulk.js'});
  await expect(page.locator('#admin-language')).toBeEnabled();
  await page.evaluate(()=>{
    window.bulkRequests=[];
    window.bulkEditor=PandoraBulkLocalization.mount(
      document.getElementById('bulk-host'),{
        api:async(method,payload,url)=>{
          window.bulkRequests.push({method,url,payload});
          if(method==='POST')throw Error('Bulk test must never publish');
          const path=new URL(url,'https://admin.test.invalid');
          return {ok:true,schemaVersion:1,page:Number(path.searchParams.get('page')),
            total:1,items:[{scope:'game',id:'equipment.30.37',locale:'ru',
              kind:'equipment',managedBy:null,source:{en:'Warrior Hat'},
              effective:'Warrior Hat',version:0,origin:'fallback'}]};
        },
        getContext:()=>({scope:'game',locale:'ru',group:'equipment'}),
        hasDraft:()=>false,
        onPublished:()=>{throw Error('Published unexpectedly')}
      });
  });
  const panel=page.locator('#bulk-host');
  // Bulk editing is deliberately collapsed until the administrator opens it.
  await panel.locator('.localization-bulk > summary').click();
  // Playwright may inherit a non-English browser locale; select EN explicitly.
  await page.locator('#admin-language').selectOption('en');
  // Stable DOM selectors must survive changes to their localized ARIA names.
  const word=panel.locator('.localization-bulk-controls input').nth(0);
  const translated=panel.locator('.localization-bulk-controls input').nth(1);
  await word.fill('Warrior');await translated.fill('Воин');
  const language=page.locator('#admin-language');
  for(const locale of ['ru','jp','tw','en']){
    await language.selectOption(locale);
    await expect(panel.locator('[data-admin-i18n="adminShell.bulkHeading"]'))
      .toHaveText(locale==='en'?english['adminShell.bulkHeading']:approved.ui[locale]['adminShell.bulkHeading']);
    await expect(panel.locator('[data-admin-i18n-aria="adminShell.bulkFindWord"]'))
      .toHaveAttribute('aria-label',locale==='en'?english['adminShell.bulkFindWord']:approved.ui[locale]['adminShell.bulkFindWord']);
    await expect(panel.locator('[data-admin-i18n="adminShell.bulkPreview"]'))
      .toHaveText(locale==='en'?english['adminShell.bulkPreview']:approved.ui[locale]['adminShell.bulkPreview']);
    await expect(word).toHaveValue('Warrior');
    await expect(translated).toHaveValue('Воин');
  }
  await panel.locator('[data-admin-i18n="adminShell.bulkPreview"]').click();
  await expect(panel.locator('.localization-bulk-row')).toHaveCount(1);
  await language.selectOption('jp');
  await expect(panel.locator('[data-admin-i18n="adminShell.bulkBefore"]'))
    .toHaveText(approved.ui.jp['adminShell.bulkBefore']);
  await expect(panel.locator('[data-admin-i18n="adminShell.bulkAfter"]'))
    .toHaveText(approved.ui.jp['adminShell.bulkAfter']);
  await expect(panel.locator('[data-admin-i18n-title="adminShell.bulkEditTitle"]'))
    .toHaveAttribute('title',approved.ui.jp['adminShell.bulkEditTitle']);
  const pencil=panel.locator('.localization-bulk-row .localization-bulk-icon').first();
  await pencil.click();
  const editor=panel.locator('.localization-bulk-row textarea');
  await editor.fill('Мой отредактированный вариант');
  await language.selectOption('tw');
  await expect(panel.locator('[data-admin-i18n="adminShell.bulkApplyPreview"]'))
    .toHaveText(approved.ui.tw['adminShell.bulkApplyPreview']);
  await expect(editor).toHaveValue('Мой отредактированный вариант');
  expect(await page.evaluate(()=>window.bulkRequests.every(x=>x.method==='GET'))).toBe(true);
  await page.evaluate(()=>window.bulkEditor.destroy());
  await expect(panel.locator('.localization-bulk')).toHaveCount(0);
});
