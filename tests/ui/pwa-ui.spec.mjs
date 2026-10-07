import {test,expect} from '@playwright/test';

test('online site has no install/offline/update UI or manifest and creates no service worker',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
  await expect(page.locator('link[rel="manifest"],[data-remaked-install],[data-remaked-update-notice]')).toHaveCount(0);
  expect(await page.evaluate(()=>navigator.serviceWorker.getRegistrations().then(r=>r.length))).toBe(0);
  expect(await page.evaluate(()=>typeof PandoraRemaked.appUpdate?.checkNow)).toBe('function');
  const version=await page.evaluate(()=>fetch('./modern/version.json',{cache:'no-store'}).then(r=>r.json()));
  expect(version.ui).toBe(await page.evaluate(()=>PandoraRemakedVersion.ui));
  const suppressed=await page.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;});
  expect(suppressed).toBe(true);expect(errors).toEqual([]);
});

test('cleanup removes only this app offline caches and preserves builds and unrelated origin caches',async({page})=>{
  await page.goto('/');
  const before=await page.evaluate(async()=>{PandoraRemaked.builds.flushAutosave();localStorage.setItem('file','legacy-sentinel');await caches.open('pandora-remaked-old');await caches.open('another-app-cache');return localStorage.getItem(PandoraRemaked.buildStore.AUTOSAVE_KEY);});
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>caches.keys())).toEqual(['another-app-cache']);
  expect(await page.evaluate(()=>localStorage.getItem('file'))).toBe('legacy-sentinel');
  expect(await page.evaluate(()=>localStorage.getItem(PandoraRemaked.buildStore.AUTOSAVE_KEY))).toBe(before);
});


test('online updater detects a newer release without changing the saved build immediately',async({page})=>{
  await page.route('**/modern/version.json**',route=>route.fulfill({json:{legacyEngine:'2.00',ui:'99.99'}}));
  await page.goto('/');
  const before=await page.evaluate(()=>{PandoraRemaked.builds.flushAutosave();return localStorage.getItem(PandoraRemaked.buildStore.AUTOSAVE_KEY);});
  await expect.poll(()=>page.evaluate(()=>PandoraRemaked.appUpdate.getPendingVersion())).toBe('99.99');
  expect(await page.evaluate(()=>localStorage.getItem(PandoraRemaked.buildStore.AUTOSAVE_KEY))).toBe(before);
});
