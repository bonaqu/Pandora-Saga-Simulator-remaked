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
