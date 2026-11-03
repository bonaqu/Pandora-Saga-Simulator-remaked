import { test, expect } from '@playwright/test';

const AUTOSAVE_KEY = 'pandora-remaked.autosave.v1';
const BUILDS_KEY = 'pandora-remaked.builds.v1';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-header]')).toBeVisible();
}

async function resetModernStorage(page) {
  await page.evaluate(({ autosaveKey, buildsKey }) => {
    localStorage.removeItem(autosaveKey);
    localStorage.removeItem(buildsKey);
  }, { autosaveKey: AUTOSAVE_KEY, buildsKey: BUILDS_KEY });
}

function isoLooksValid(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

test.beforeEach(async ({ page }) => {
  await openModern(page);
  await resetModernStorage(page);
});

test('buildStore exposes pinned schema/engine/key constants and autosave round-trips exact payload', async ({ page }) => {
  const contract = await page.evaluate(() => {
    const store = window.PandoraRemaked?.buildStore;
    return store ? {
      schema: store.SCHEMA,
      engine: store.ENGINE,
      autosaveKey: store.AUTOSAVE_KEY,
      buildsKey: store.BUILDS_KEY
    } : null;
  });
  expect(contract).toEqual({
    schema: 1,
    engine: 'legacy-2.00',
    autosaveKey: AUTOSAVE_KEY,
    buildsKey: BUILDS_KEY
  });

  const payload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const result = await page.evaluate((serialized) => window.PandoraRemaked.buildStore.writeAutosave(serialized), payload);
  expect(result.ok).toBe(true);

  const raw = await page.evaluate((key) => localStorage.getItem(key), AUTOSAVE_KEY);
  const record = JSON.parse(raw);
  expect(record.schema).toBe(1);
  expect(record.engine).toBe('legacy-2.00');
  expect(record.payload).toBe(payload);
  expect(isoLooksValid(record.updatedAt)).toBe(true);

  const read = await page.evaluate(() => window.PandoraRemaked.buildStore.readAutosave());
  expect(read.ok).toBe(true);
  expect(read.record.payload).toBe(payload);
});

test('named builds normalize names, preserve timestamps, duplicate and delete without touching siblings', async ({ page }) => {
  const payload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const first = await page.evaluate((serialized) => window.PandoraRemaked.buildStore.saveBuild('', serialized), payload);
  const second = await page.evaluate((serialized) => window.PandoraRemaked.buildStore.saveBuild('   ', serialized), payload);
  expect(first.ok).toBe(true);
  expect(second.ok).toBe(true);
  expect(first.build.name).toBe('Build 1');
  expect(second.build.name).toBe('Build 2');
  expect(first.build.id).not.toBe(second.build.id);

  const longName = `  ${'😀'.repeat(70)}  `;
  const longBuild = await page.evaluate(({ name, serialized }) => window.PandoraRemaked.buildStore.saveBuild(name, serialized), {
    name: longName,
    serialized: payload
  });
  expect(Array.from(longBuild.build.name)).toHaveLength(60);

  await page.waitForTimeout(15);
  const renamed = await page.evaluate((id) => window.PandoraRemaked.buildStore.updateBuild(id, { name: '  PvP Horseman  ' }), first.build.id);
  expect(renamed.ok).toBe(true);
  expect(renamed.build.name).toBe('PvP Horseman');
  expect(renamed.build.createdAt).toBe(first.build.createdAt);
  expect(Date.parse(renamed.build.updatedAt)).toBeGreaterThanOrEqual(Date.parse(first.build.updatedAt));

  const duplicate = await page.evaluate((id) => window.PandoraRemaked.buildStore.duplicateBuild(id), renamed.build.id);
  expect(duplicate.ok).toBe(true);
  expect(duplicate.build.id).not.toBe(renamed.build.id);
  expect(duplicate.build.payload).toBe(renamed.build.payload);
  expect(duplicate.build.name).not.toBe(renamed.build.name);

  const removed = await page.evaluate((id) => window.PandoraRemaked.buildStore.deleteBuild(id), second.build.id);
  expect(removed.ok).toBe(true);
  const listed = await page.evaluate(() => window.PandoraRemaked.buildStore.listBuilds());
  expect(listed.builds.some((entry) => entry.id === second.build.id)).toBe(false);
  expect(listed.builds.some((entry) => entry.id === renamed.build.id)).toBe(true);
  expect(listed.builds.some((entry) => entry.id === duplicate.build.id)).toBe(true);
});

test('migration metadata survives duplication, and an omitted patch never throws or loses data', async ({ page }) => {
  const payload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const result = await page.evaluate((current) => {
    const store = window.PandoraRemaked.buildStore;
    const saved = store.saveBuild('Dawn build', current);
    const report = [{ type: 'removed', kind: 'equipment', id: 310024, reason: 'outdated' }];
    const updated = store.updateBuild(saved.build.id, { migrationReport: report });
    const omitted = store.updateBuild(saved.build.id);
    const duplicated = store.duplicateBuild(saved.build.id);
    return { saved, updated, omitted, duplicated, restored: store.getBuild(duplicated.build.id) };
  }, payload);
  expect(result.saved.ok).toBe(true);
  expect(result.updated.ok).toBe(true);
  expect(result.omitted.ok).toBe(true);
  expect(result.duplicated.ok).toBe(true);
  expect(result.duplicated.build.migrationReport).toEqual(result.updated.build.migrationReport);
  expect(result.restored.migrationReport).toEqual(result.updated.build.migrationReport);
  expect(result.restored.payload).toBe(payload);
});

test('malformed and unsupported autosave records return errors without throwing or mutating calculator state', async ({ page }) => {
  const baseline = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());

  await page.evaluate((key) => localStorage.setItem(key, '{not-json'), AUTOSAVE_KEY);
  const malformed = await page.evaluate(() => window.PandoraRemaked.buildStore.readAutosave());
  expect(malformed.ok).toBe(false);
  expect(malformed.error.code).toBe('malformed-json');

  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
    schema: 999, engine: 'legacy-2.00', updatedAt: new Date().toISOString(), payload: 'x'
  })), AUTOSAVE_KEY);
  const schema = await page.evaluate(() => window.PandoraRemaked.buildStore.readAutosave());
  expect(schema.ok).toBe(false);
  expect(schema.error.code).toBe('unsupported-schema');

  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
    schema: 1, engine: 'future-engine', updatedAt: new Date().toISOString(), payload: 'x'
  })), AUTOSAVE_KEY);
  const engine = await page.evaluate(() => window.PandoraRemaked.buildStore.readAutosave());
  expect(engine.ok).toBe(false);
  expect(engine.error.code).toBe('engine-mismatch');
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(baseline);
});

test('named collection preserves valid siblings when one entry is corrupt', async ({ page }) => {
  const payload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  await page.evaluate(({ key, serialized }) => {
    localStorage.setItem(key, JSON.stringify({
      schema: 1,
      engine: 'legacy-2.00',
      builds: [
        {
          id: 'valid-build',
          name: 'Valid',
          createdAt: '2026-09-27T00:00:00.000Z',
          updatedAt: '2026-09-27T00:00:00.000Z',
          payload: serialized
        },
        { id: '', name: 42, payload: null }
      ]
    }));
  }, { key: BUILDS_KEY, serialized: payload });

  const listed = await page.evaluate(() => window.PandoraRemaked.buildStore.listBuilds());
  expect(listed.ok).toBe(false);
  expect(listed.error.code).toBe('corrupt-entries');
  expect(listed.builds).toHaveLength(1);
  expect(listed.builds[0].id).toBe('valid-build');
});

test('unsupported named collection schema/engine is never treated as loadable', async ({ page }) => {
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ schema: 999, engine: 'legacy-2.00', builds: [] })), BUILDS_KEY);
  const schema = await page.evaluate(() => window.PandoraRemaked.buildStore.listBuilds());
  expect(schema.ok).toBe(false);
  expect(schema.error.code).toBe('unsupported-schema');
  expect(schema.builds).toEqual([]);

  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ schema: 1, engine: 'future-engine', builds: [] })), BUILDS_KEY);
  const engine = await page.evaluate(() => window.PandoraRemaked.buildStore.listBuilds());
  expect(engine.ok).toBe(false);
  expect(engine.error.code).toBe('engine-mismatch');
  expect(engine.builds).toEqual([]);
});

test('Storage SecurityError/QuotaExceededError become result errors instead of escaping', async ({ page }) => {
  const payload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());

  const getFailure = await page.evaluate(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function () { throw new DOMException('blocked', 'SecurityError'); };
    try {
      return window.PandoraRemaked.buildStore.readAutosave();
    } finally {
      Storage.prototype.getItem = original;
    }
  });
  expect(getFailure.ok).toBe(false);
  expect(getFailure.error.code).toBe('storage-unavailable');

  const setFailure = await page.evaluate((serialized) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); };
    try {
      return window.PandoraRemaked.buildStore.writeAutosave(serialized);
    } finally {
      Storage.prototype.setItem = original;
    }
  }, payload);
  expect(setFailure.ok).toBe(false);
  expect(setFailure.error.code).toBe('quota-exceeded');
});

test('every Modern build-store operation leaves legacy localStorage.file untouched', async ({ page }) => {
  const payload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  await page.evaluate(() => localStorage.setItem('file', 'LEGACY-SENTINEL'));

  await page.evaluate((serialized) => {
    const store = window.PandoraRemaked.buildStore;
    store.writeAutosave(serialized);
    store.readAutosave();
    const saved = store.saveBuild('Sentinel test', serialized);
    if (saved.ok) {
      store.updateBuild(saved.build.id, { name: 'Renamed' });
      store.duplicateBuild(saved.build.id);
      store.getBuild(saved.build.id);
      store.listBuilds();
      store.deleteBuild(saved.build.id);
    }
  }, payload);

  expect(await page.evaluate(() => localStorage.getItem('file'))).toBe('LEGACY-SENTINEL');
});

test('duplicate build IDs are quarantined without deleting valid siblings or legacy data',async({page})=>{
  await openModern(page);
  const result=await page.evaluate(()=>{
    const store=PandoraRemaked.buildStore,payload=PandoraRemaked.adapter.serialize();
    localStorage.setItem('file','LEGACY-DO-NOT-TOUCH');
    const a=store.saveBuild('Original A',payload);
    const b=store.saveBuild('Original B',payload);
    if(!a.ok||!b.ok)throw Error('Fixture save failed');
    const saved=JSON.parse(localStorage.getItem(store.BUILDS_KEY));
    saved.builds.splice(1,0,{...saved.builds[0],name:'Duplicate A ID'});
    const original=JSON.stringify(saved);localStorage.setItem(store.BUILDS_KEY,original);
    const listed=store.listBuilds();
    const rejectedMutation=store.saveBuild('Do not silently fix',payload);
    return {listed,rejectedMutation,stored:localStorage.getItem(store.BUILDS_KEY),
      original,legacy:localStorage.getItem('file'),ids:[a.build.id,b.build.id]};
  });
  expect(result.listed.ok).toBe(false);
  expect(result.listed.error).toMatchObject({code:'corrupt-entries',invalidCount:1});
  expect(result.listed.builds.map(build=>build.id)).toEqual(result.ids);
  expect(result.listed.builds.map(build=>build.name)).toEqual(['Original A','Original B']);
  expect(result.rejectedMutation).toMatchObject({ok:false,error:{code:'corrupt-entries'}});
  expect(result.stored).toBe(result.original);
  expect(result.legacy).toBe('LEGACY-DO-NOT-TOUCH');
});

test('successful build writes notify comparison once, failed quota writes never announce changes',async({page})=>{
  await openModern(page);
  const events=await page.evaluate(()=>{
    const store=PandoraRemaked.buildStore,payload=PandoraRemaked.adapter.serialize();
    let notifications=0;
    window.addEventListener('pandora-remaked:buildschange',()=>notifications++);
    const first=store.saveBuild('Event A',payload);
    if(!first.ok)throw Error('Fixture save failed');
    const twin=store.duplicateBuild(first.build.id);
    const renamed=store.updateBuild(first.build.id,{name:'Event A renamed'});
    const deleted=store.deleteBuild(twin.build.id);
    const beforeFailure=notifications,previous=localStorage.getItem(store.BUILDS_KEY);
    const native=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key===store.BUILDS_KEY)throw new DOMException('Quota reached','QuotaExceededError');
      return native.call(this,key,value);
    };
    let failed;
    try {failed=store.saveBuild('Should fail',payload);}
    finally {Storage.prototype.setItem=native;}
    return {first:first.ok,twin:twin.ok,renamed:renamed.ok,deleted:deleted.ok,
      beforeFailure,afterFailure:notifications,failed,previous,after:localStorage.getItem(store.BUILDS_KEY)};
  });
  expect(events).toMatchObject({first:true,twin:true,renamed:true,deleted:true,
    beforeFailure:4,afterFailure:4,failed:{ok:false,error:{code:'quota-exceeded'}}});
  expect(events.after).toBe(events.previous);
});
