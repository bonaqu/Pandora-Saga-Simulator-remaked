import { test, expect } from '@playwright/test';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
}

async function chooseDifferentRace(page) {
  const race = page.locator('#SelRace');
  if (!(await race.isVisible())) {
    await page.locator('[data-remaked-tab="0"]').click();
    await expect.poll(() => page.evaluate(() => window.Flag[2])).toBe(1);
    await expect(race).toBeVisible();
  }
  const current = await race.evaluate((select) => select.selectedIndex);
  const count = await race.locator('option').count();
  const next = count > 1 ? (current + 1) % count : current;
  await race.selectOption({ index: next });
  return page.evaluate(() => window.PandoraRemaked.adapter.serialize());
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const testInitKey = 'pandora-remaked.build-manager-test-initialized';
    if (sessionStorage.getItem(testInitKey) === '1') return;
    sessionStorage.setItem(testInitKey, '1');
    localStorage.removeItem('pandora-remaked.autosave.v1');
    localStorage.removeItem('pandora-remaked.builds.v1');
    localStorage.setItem('file', 'legacy-sentinel');
  });
});

test('meaningful legacy changes autosave after debounce without touching legacy file storage', async ({ page }) => {
  await openModern(page);
  await expect(page.locator('[data-remaked-autosave-status]')).toBeVisible();

  const payload = await chooseDifferentRace(page);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('pandora-remaked.autosave.v1'))).not.toBeNull();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pandora-remaked.autosave.v1')));
  expect(stored.schema).toBe(1);
  expect(stored.engine).toBe('legacy-2.00');
  expect(stored.payload).toBe(payload);
  expect(await page.evaluate(() => localStorage.getItem('file'))).toBe('legacy-sentinel');
  await expect(page.locator('[data-remaked-autosave-status]')).toContainText('Saved');
});

test('rapid autosave scheduling is debounced and unchanged payload does not rewrite timestamp', async ({ page }) => {
  await openModern(page);
  const count = await page.evaluate(async () => {
    let writes = 0;
    const store = window.PandoraRemaked.buildStore;
    const original = store.writeAutosave;
    store.writeAutosave = function (payload) {
      writes += 1;
      return original.call(store, payload);
    };
    window.PandoraRemaked.builds.scheduleAutosave();
    window.PandoraRemaked.builds.scheduleAutosave();
    window.PandoraRemaked.builds.scheduleAutosave();
    await new Promise((resolve) => setTimeout(resolve, 420));
    return writes;
  });
  expect(count).toBeLessThanOrEqual(1);

  await chooseDifferentRace(page);
  await page.evaluate(() => window.PandoraRemaked.builds.flushAutosave());
  const first = await page.evaluate(() => JSON.parse(localStorage.getItem('pandora-remaked.autosave.v1')).updatedAt);
  await page.waitForTimeout(30);
  const result = await page.evaluate(() => window.PandoraRemaked.builds.flushAutosave());
  const second = await page.evaluate(() => JSON.parse(localStorage.getItem('pandora-remaked.autosave.v1')).updatedAt);
  expect(result.ok).toBe(true);
  expect(result.unchanged).toBe(true);
  expect(second).toBe(first);
});

test('reload restores the last compatible autosave and reports recovery', async ({ page }) => {
  await openModern(page);
  const defaultPayload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const savedPayload = await chooseDifferentRace(page);
  expect(savedPayload).not.toBe(defaultPayload);
  await page.evaluate(() => window.PandoraRemaked.builds.flushAutosave());

  await page.reload();
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(savedPayload);
  const autosaveStatus = page.locator('[data-remaked-autosave-status]');
  await expect(autosaveStatus).toContainText('Restored');
  await expect(autosaveStatus).toHaveText('Autosave enabled', { timeout: 6000 });
  await page.evaluate(() => window.PandoraRemaked.i18n.setLocale('ru'));
  await expect(autosaveStatus).toHaveText('Автосохранение включено');
  expect(await page.evaluate(() => localStorage.getItem('file'))).toBe('legacy-sentinel');
});

test('malformed or incompatible autosave never mutates the default calculator state', async ({ page }) => {
  await openModern(page);
  const defaultPayload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());

  await page.evaluate(() => {
    localStorage.setItem('pandora-remaked.autosave.v1', '{bad json');
  });
  await page.reload();
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
  await expect(page.locator('[data-remaked-autosave-status]')).toContainText(/warning|unavailable|ignored/i);
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(defaultPayload);

  await page.evaluate(() => {
    localStorage.setItem('pandora-remaked.autosave.v1', JSON.stringify({
      schema: 999,
      engine: 'future-engine',
      updatedAt: new Date().toISOString(),
      payload: 'future'
    }));
  });
  await page.reload();
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
  await expect(page.locator('[data-remaked-autosave-status]')).toContainText(/warning|unavailable|ignored/i);
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(defaultPayload);
  expect(await page.evaluate(() => localStorage.getItem('file'))).toBe('legacy-sentinel');
});

test('Build Manager saves, loads, renames, duplicates and confirms deletion', async ({ page }) => {
  await openModern(page);
  const defaultPayload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const changedPayload = await chooseDifferentRace(page);

  await page.getByRole('button', { name: 'Builds', exact: true }).click();
  const manager = page.locator('[data-remaked-build-manager]');
  await expect(manager).toBeVisible();

  await manager.locator('[data-remaked-build-name]').fill('PvP Horseman');
  await manager.locator('[data-remaked-save-build]').click();
  await expect(manager.locator('[data-remaked-build-row]')).toHaveCount(1);
  await expect(manager.locator('[data-remaked-build-row]').first()).toContainText('PvP Horseman');

  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), defaultPayload);
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(defaultPayload);
  await manager.locator('[data-remaked-build-load]').first().click();
  await expect.poll(() => page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(changedPayload);
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('pandora-remaked.autosave.v1')))).payload).toBe(changedPayload);

  page.once('dialog', (dialog) => dialog.accept('Horseman PvP v2'));
  await manager.locator('[data-remaked-build-rename]').first().click();
  await expect(manager.locator('[data-remaked-build-row]').first()).toContainText('Horseman PvP v2');

  await manager.locator('[data-remaked-build-duplicate]').first().click();
  const rows = manager.locator('[data-remaked-build-row]');
  await expect(rows).toHaveCount(2);
  const firstId = await rows.nth(0).getAttribute('data-build-id');
  const secondId = await rows.nth(1).getAttribute('data-build-id');
  expect(firstId).toBeTruthy();
  expect(secondId).toBeTruthy();
  expect(firstId).not.toBe(secondId);

  page.once('dialog', (dialog) => {
    expect(dialog.type()).toBe('confirm');
    dialog.accept();
  });
  await manager.locator('[data-remaked-build-delete]').first().click();
  await expect(manager.locator('[data-remaked-build-row]')).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem('file'))).toBe('legacy-sentinel');
});

test('Build Manager exports exact native compressed code and imports it without using legacy File storage', async ({ page }) => {
  await openModern(page);
  const original = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const changed = await chooseDifferentRace(page);
  expect(changed).not.toBe(original);

  await page.getByRole('button', { name: 'Builds', exact: true }).click();
  const manager = page.locator('[data-remaked-build-manager]');
  await manager.locator('[data-remaked-export-build]').click();
  const compressed = await page.evaluate(payload => Base64.toBase64(RawDeflate.deflate(Base64.utob(payload))), changed);
  await expect(manager.locator('[data-remaked-build-code]')).toHaveValue(compressed);

  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), original);
  await manager.locator('[data-remaked-import-build]').click();
  await expect.poll(() => page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(changed);
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('pandora-remaked.autosave.v1')))).payload).toBe(changed);
  expect(await page.evaluate(() => localStorage.getItem('file'))).toBe('legacy-sentinel');
});

test('malformed import is rejected and current build stays unchanged', async ({ page }) => {
  await openModern(page);
  const before = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  await page.getByRole('button', { name: 'Builds', exact: true }).click();
  const manager = page.locator('[data-remaked-build-manager]');
  await manager.locator('[data-remaked-build-code]').fill('definitely-not-a-pandora-build');
  await manager.locator('[data-remaked-import-build]').click();
  await expect(manager.locator('[data-remaked-code-status]')).toContainText(/invalid|could not/i);
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(before);
});

test('Build Manager remains within a 390px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openModern(page);
  await page.getByRole('button', { name: 'Builds', exact: true }).click();
  await expect(page.locator('[data-remaked-build-manager]')).toBeVisible();
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 1);
});

test('loading a named build survives an unrelated repaint of the saved list while game data is pending',async({page})=>{
  await openModern(page);
  const seeded=await page.evaluate(()=>{
    const ns=PandoraRemaked,active=ns.adapter.serialize();
    const race=document.getElementById('SelRace');
    race.selectedIndex=(race.selectedIndex+1)%race.options.length;
    race.dispatchEvent(new Event('change',{bubbles:true}));
    const target=ns.adapter.serialize();
    ns.adapter.load(active);
    const saved=ns.buildStore.saveBuild('Old race after list refresh',target);
    if(!saved.ok)throw Error(JSON.stringify(saved.error));
    return {active,target,id:saved.build.id};
  });
  await page.locator('[data-remaked-builds-open]').click();
  await page.evaluate(()=>{
    const catalog=PandoraRemaked.catalog;
    const original=catalog.prepareCurrentPayload;
    window.resolveNamedLoad=null;
    window.namedLoadStarted=false;
    let once=true;
    catalog.prepareCurrentPayload=async function(payload){
      if(once){once=false;window.namedLoadStarted=true;await new Promise(resolve=>{window.resolveNamedLoad=resolve;});}
      return original.apply(this,arguments);
    };
  });
  await page.locator('[data-remaked-build-load]').click();
  await expect.poll(()=>page.evaluate(()=>window.namedLoadStarted)).toBe(true);
  const originalRow=await page.locator('[data-remaked-build-row]').first().evaluate(el=>{el.dataset.wasRendered='before';return el.dataset.buildId;});
  await page.evaluate(()=>{
    // A catalog head refresh repaints buttons without touching the saved ID
    // or the character. It must not cancel a user-initiated load.
    window.dispatchEvent(new CustomEvent('pandora-remaked:cataloghead',{
      detail:{revision:951,impactRevision:951,previousRevision:0,previousImpactRevision:0}
    }));
  });
  await expect(page.locator('[data-remaked-build-row]').first()).not.toHaveAttribute('data-was-rendered','before');
  await page.evaluate(()=>window.resolveNamedLoad());
  await expect.poll(()=>page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(seeded.target);
  await expect(page.locator('[data-remaked-build-manager-status]')).toContainText('Old race after list refresh');
  expect(await page.evaluate(()=>PandoraRemaked.builds.lastLoadFailure())).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem(PandoraRemaked.buildStore.RECOVERY_KEY))).toBeNull();
  expect(originalRow).toBe(seeded.id);
  expect(await page.evaluate(()=>localStorage.getItem('file'))).toBe('legacy-sentinel');
});

test('failed named build application keeps previous character in its recovery journal then removes it after safe rollback',async({page})=>{
  await openModern(page);
  const seed=await page.evaluate(()=>{
    const ns=PandoraRemaked,active=ns.adapter.serialize(),race=document.getElementById('SelRace');
    race.selectedIndex=(race.selectedIndex+1)%race.options.length;
    race.dispatchEvent(new Event('change',{bubbles:true}));
    const target=ns.adapter.serialize();
    ns.adapter.load(active);
    const saved=ns.buildStore.saveBuild('Broken on apply',target);
    if(!saved.ok)throw Error('Cannot save test build');
    const backup=localStorage.getItem(ns.buildStore.BUILDS_KEY);
    const autosave=localStorage.getItem(ns.buildStore.AUTOSAVE_KEY);
    return {active,target,backup,autosave};
  });
  await page.evaluate(()=>{
    const adapter=PandoraRemaked.adapter,original=adapter.load;
    window.recoveryDuringFailedLoad=null;let first=true;
    adapter.load=function(payload){
      if(first){first=false;
        window.recoveryDuringFailedLoad=JSON.parse(localStorage.getItem(PandoraRemaked.buildStore.RECOVERY_KEY));
        throw new Error('Synthetic active load failure');
      }
      return original.call(this,payload);
    };
  });
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-build-load]').click();
  await expect(page.locator('[data-remaked-build-manager-status]')).toHaveAttribute('data-state','error');
  await expect(page.locator('[data-remaked-build-manager-status]')).toContainText('Broken on apply');
  const after=await page.evaluate(()=>({
    active:PandoraRemaked.adapter.serialize(),
    recover:window.recoveryDuringFailedLoad,
    journal:localStorage.getItem(PandoraRemaked.buildStore.RECOVERY_KEY),
    named:localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY),
    autosave:localStorage.getItem(PandoraRemaked.buildStore.AUTOSAVE_KEY),
    error:PandoraRemaked.builds.lastLoadFailure()
  }));
  expect(after.recover.payload).toBe(seed.active);
  expect(after.journal).toBeNull();
  expect(after.active).toBe(seed.active);
  expect(after.named).toBe(seed.backup);
  expect(after.autosave).toBe(seed.autosave);
  expect(after.error).toMatchObject({kind:'apply',phase:'apply',name:'Broken on apply'});
});

test('quota failure creating named-build recovery journal reports storage error without changing saved data',async({page})=>{
  await openModern(page);
  const seed=await page.evaluate(()=>{
    const ns=PandoraRemaked,active=ns.adapter.serialize(),race=document.getElementById('SelRace');
    race.selectedIndex=(race.selectedIndex+1)%race.options.length;
    race.dispatchEvent(new Event('change',{bubbles:true}));
    const target=ns.adapter.serialize();ns.adapter.load(active);
    const saved=ns.buildStore.saveBuild('Quota test',target);
    if(!saved.ok)throw Error('Cannot seed build');
    const named=localStorage.getItem(ns.buildStore.BUILDS_KEY);
    ns.buildStore.beginRecovery=function(){return {ok:false,error:{code:'quota-exceeded',message:'Browser storage quota was exceeded.'}};};
    return {active,named};
  });
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-build-load]').click();
  await expect(page.locator('[data-remaked-build-manager-status]')).toHaveAttribute('data-state','error');
  await expect(page.locator('[data-remaked-build-manager-status]')).toContainText(/storage|quota|full|unavailable/i);
  expect(await page.evaluate(()=>PandoraRemaked.builds.lastLoadFailure())).toMatchObject({phase:'recovery',kind:'storage',code:'quota-exceeded'});
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(seed.active);
  expect(await page.evaluate(()=>localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY))).toBe(seed.named);
});

test('autosave rejection after a migrated load preserves old named code and recovery of previous character',async({page})=>{
  await openModern(page);
  const seed=await page.evaluate(async()=>{
    const ns=PandoraRemaked,active=ns.adapter.serialize(),race=document.getElementById('SelRace');
    race.selectedIndex=(race.selectedIndex+1)%race.options.length;
    race.dispatchEvent(new Event('change',{bubbles:true}));
    const target=ns.adapter.serialize(),csv=ns.catalog.unpackPayload(target).payload;
    ns.adapter.load(active);
    const saved=ns.buildStore.saveBuild('Migrate without quota',csv);
    if(!saved.ok)throw Error('Cannot save old build');
    const source=await ns.catalog.fetchSnapshot(0);
    ns.catalog.applySnapshot({...source,revision:2,impactRevision:2,records:[]});
    ns.builds.flushAutosave();
    const before=ns.adapter.serialize(),autosave=localStorage.getItem(ns.buildStore.AUTOSAVE_KEY);
    const original=ns.buildStore.writeAutosave;
    ns.buildStore.writeAutosave=function(){return {ok:false,error:{code:'quota-exceeded',message:'Quota exceeded'}};};
    return {before,csv,autosave,named:localStorage.getItem(ns.buildStore.BUILDS_KEY)};
  });
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-build-load]').click();
  await expect(page.locator('[data-remaked-build-manager-status]')).toContainText(/autosave|saved|unavailable/i);
  await expect.poll(()=>page.evaluate(()=>PandoraRemaked.catalog.unpackPayload(PandoraRemaked.adapter.serialize()).payload)).toBe(seed.csv);
  const state=await page.evaluate(()=>({
    autosave:localStorage.getItem(PandoraRemaked.buildStore.AUTOSAVE_KEY),
    named:localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY),
    journal:JSON.parse(localStorage.getItem(PandoraRemaked.buildStore.RECOVERY_KEY)),
    error:PandoraRemaked.builds.lastLoadFailure()
  }));
  expect(state.named).toBe(seed.named);
  expect(state.autosave).toBe(seed.autosave);
  expect(state.journal.payload).toBe(seed.before);
  expect(state.error).toBeNull();
});

test('two legacy level-50 racial builds compare AND load back into the character after current catalog migration',async({page})=>{
  await openModern(page);
  const seed=await page.evaluate(async()=>{
    const ns=PandoraRemaked,active=ns.adapter.serialize(),store=ns.buildStore;
    function make(index,name){
      ns.adapter.load(active);
      const race=document.getElementById('SelRace');
      race.selectedIndex=index;race.dispatchEvent(new Event('change',{bubbles:true}));
      StatusMove('Lev',49);CalcSet('Lev');
      const csv=ns.catalog.unpackPayload(ns.adapter.serialize()).payload;
      const saved=store.saveBuild(name,csv);
      if(!saved.ok)throw Error(JSON.stringify(saved.error));
      return {id:saved.build.id,name,level:Status.Lev[0],race:Status.Job[0],csv};
    }
    const a=make(3,'Всад Энкиду 50'),b=make(1,'Всад Эльф 50');
    ns.adapter.load(active);
    const source=await ns.catalog.fetchSnapshot(0);
    ns.catalog.applySnapshot({...source,revision:2,impactRevision:2,records:[]});
    ns.builds.flushAutosave();
    return {a,b,original:ns.adapter.serialize(),legacy:localStorage.getItem('file'),
      published:{...source,revision:2,impactRevision:2,records:[]}};
  });
  expect(seed.a.level).toBe(50);expect(seed.b.level).toBe(50);
  expect(seed.a.race).not.toBe(seed.b.race);
  await page.locator('[data-remaked-compare-open]').click();
  await page.locator('[data-remaked-compare-a]').selectOption(seed.a.id);
  await page.locator('[data-remaked-compare-b]').selectOption(seed.b.id);
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('[data-remaked-builds-open]').click();
  for(const build of [seed.a,seed.b]){
    const row=page.locator('[data-remaked-build-row]').filter({hasText:build.name});
    await row.locator('[data-remaked-build-load]').click();
    await expect.poll(()=>page.evaluate(()=>Status.Lev[0])).toBe(50);
    await expect.poll(()=>page.evaluate(()=>PandoraRemaked.catalog.unpackPayload(PandoraRemaked.adapter.serialize()).payload)).toBe(build.csv);
    await expect.poll(()=>page.evaluate(id=>PandoraRemaked.buildStore.getBuild(id)?.payload.startsWith('PS3:2:'),build.id)).toBe(true);
    await expect(page.locator('[data-remaked-build-manager-status]')).toHaveAttribute('data-state','success');
    expect(await page.evaluate(()=>localStorage.getItem(PandoraRemaked.buildStore.RECOVERY_KEY))).toBeNull();
    expect(await page.evaluate(()=>PandoraRemaked.builds.lastLoadFailure())).toBeNull();
    expect(await page.evaluate(()=>localStorage.getItem('file'))).toBe(seed.legacy);
  }
  await page.keyboard.press('Escape');
  const active=await page.evaluate(()=>PandoraRemaked.adapter.serialize());
  // Keep the synthetic catalog publication available across a full browser
  // reload; the production revision with the same number may be different.
  await page.route('https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog**',
    route=>route.fulfill({json:seed.published}));
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(active);
});
