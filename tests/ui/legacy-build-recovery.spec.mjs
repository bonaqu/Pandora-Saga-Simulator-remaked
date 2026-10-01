import { test, expect } from '@playwright/test';

async function seedSlots(page) {
  await page.goto('/');
  return page.evaluate(() => {
    const before = window.PandoraRemaked.adapter.serialize();
    const first = window.Store();
    window.StatusMove('Lev', 20); window.CalcSet('Lev');
    const second = window.Store();
    window.PandoraRemaked.adapter.load(before);
    const slots = [first, second, first];
    const original = window.Base64.toBase64(window.RawDeflate.deflate(window.Base64.utob(slots.join('/'))));
    localStorage.setItem('file', original);
    return { first, second, original, before };
  });
}

test('FILE recovery is atomic, idempotent and leaves character, autosave and original slots untouched', async ({ page }) => {
  const seed = await seedSlots(page);
  expect(seed.first).not.toBe(seed.second);
  const result = await page.evaluate(() => {
    const store = window.PandoraRemaked.buildStore;
    const autosave = localStorage.getItem(store.AUTOSAVE_KEY);
    const read = store.readLegacySlots();
    const first = store.importLegacySlots();
    const second = store.importLegacySlots();
    return { read, first, second, builds: store.listBuilds().builds, original: localStorage.getItem('file'), before: window.PandoraRemaked.adapter.serialize(), autosaveUnchanged: autosave === localStorage.getItem(store.AUTOSAVE_KEY) };
  });
  expect(result.read.ok).toBe(true); expect(result.read.slots).toHaveLength(3);
  expect(result.first).toMatchObject({ ok: true, added: 2, skipped: 1 });
  expect(result.second).toMatchObject({ ok: true, added: 0, skipped: 3 });
  expect(result.builds.map(build => build.payload)).toEqual([seed.first, seed.second]);
  expect(result.builds.map(build => build.name)).toEqual(['Legacy FILE 01', 'Legacy FILE 02']);
  expect(result.original).toBe(seed.original); expect(result.before).toBe(seed.before); expect(result.autosaveUnchanged).toBe(true);
});

test('FILE recovery never partially writes malformed, corrupt or quota-blocked collections', async ({ page }) => {
  const seed = await seedSlots(page);
  const result = await page.evaluate(() => {
    const store = window.PandoraRemaked.buildStore;
    store.saveBuild('Existing', window.Store());
    const before = localStorage.getItem(store.BUILDS_KEY), original = localStorage.getItem('file');
    localStorage.setItem('file', window.Base64.toBase64(window.RawDeflate.deflate(window.Base64.utob(window.Store() + '/1,2'))));
    const malformed = store.importLegacySlots(), afterMalformed = localStorage.getItem(store.BUILDS_KEY);
    localStorage.setItem('file', original);
    const nativeSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === store.BUILDS_KEY) throw new DOMException('Synthetic quota', 'QuotaExceededError');
      return nativeSet.call(this, key, value);
    };
    const quota = store.importLegacySlots();
    Storage.prototype.setItem = nativeSet;
    const afterQuota = localStorage.getItem(store.BUILDS_KEY);
    localStorage.setItem(store.BUILDS_KEY, 'corrupt');
    const corrupt = store.importLegacySlots();
    return { malformed, quota, corrupt, before, afterMalformed, afterQuota, afterCorrupt: localStorage.getItem(store.BUILDS_KEY), original: localStorage.getItem('file') };
  });
  expect(result.malformed).toMatchObject({ ok: false });
  expect(result.quota).toMatchObject({ ok: false, error: { code: 'quota-exceeded' } });
  expect(result.corrupt).toMatchObject({ ok: false, error: { code: 'malformed-json' } });
  expect(result.afterMalformed).toBe(result.before); expect(result.afterQuota).toBe(result.before);
  expect(result.afterCorrupt).toBe('corrupt'); expect(result.original).toBe(seed.original);
});

test('Builds offers explicit FILE recovery and recovered codes load through the validated adapter', async ({ page }) => {
  const seed = await seedSlots(page);
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-import-legacy]').click();
  await expect(page.locator('[data-remaked-build-row]')).toHaveCount(2);
  await expect(page.locator('[data-remaked-build-manager-status]')).toContainText('2');
  await page.locator('[data-remaked-import-legacy]').click();
  await expect(page.locator('[data-remaked-build-row]')).toHaveCount(2);
  await page.locator('[data-remaked-build-row]').nth(1).locator('[data-remaked-build-load]').click();
  expect(await page.evaluate(() => window.Store())).toBe(seed.second);
  expect(await page.evaluate(() => localStorage.getItem('file'))).toBe(seed.original);
});
