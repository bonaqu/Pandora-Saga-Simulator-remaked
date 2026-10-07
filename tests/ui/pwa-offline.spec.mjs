import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import vm from 'node:vm';

test('older clients can activate a waiting retirement worker after saving their build',async()=>{
  const listeners={};let activationRequests=0;let activationPromise;
  const self={addEventListener(type,listener){listeners[type]=listener;},skipWaiting(){activationRequests++;return Promise.resolve();}};
  vm.runInNewContext(fs.readFileSync(new URL('../../modern/service-worker.js',import.meta.url),'utf8'),{self});
  expect(typeof listeners.message).toBe('function');
  listeners.message({data:{type:'UNRELATED'},waitUntil(){throw Error('Unrelated messages must not activate the worker');}});
  expect(activationRequests).toBe(0);
  listeners.message({data:{type:'SKIP_WAITING'},waitUntil(promise){activationPromise=promise;}});
  expect(activationPromise).toBeInstanceOf(Promise);
  await activationPromise;expect(activationRequests).toBe(1);
});

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
