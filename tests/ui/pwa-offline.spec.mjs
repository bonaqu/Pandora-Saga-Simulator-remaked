import {test,expect} from '@playwright/test';

test('retirement worker unregisters existing installations without serving offline requests',async({page})=>{
  await page.goto('/');
  await page.evaluate(async()=>{
    localStorage.setItem('file','legacy-sentinel');PandoraRemaked.builds.flushAutosave();
    await caches.open('pandora-remaked-existing');await caches.open('other-origin-app');
    await navigator.serviceWorker.register('/service-worker.js',{scope:'/'});
  });
  await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.getRegistrations().then(r=>r.length))).toBe(0);
  await expect.poll(()=>page.evaluate(()=>caches.keys())).toEqual(['other-origin-app']);
  await page.reload();await expect(page.locator('[data-remaked-shell]')).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('file'))).toBe('legacy-sentinel');
});
