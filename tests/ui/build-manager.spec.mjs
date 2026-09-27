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

  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), defaultPayload);
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(defaultPayload);

  await page.reload();
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(savedPayload);
  await expect(page.locator('[data-remaked-autosave-status]')).toContainText('Restored');
  expect(await page.evaluate(() => localStorage.getItem('file'))).toBe('legacy-sentinel');
});

test('malformed or incompatible autosave never mutates the default calculator state', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pandora-remaked.autosave.v1', '{bad json');
  });
  await openModern(page);
  const firstPayload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  await expect(page.locator('[data-remaked-autosave-status]')).toContainText(/warning|unavailable|ignored/i);
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(firstPayload);

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
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(firstPayload);
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
  await expect(manager.locator('[data-remaked-build-row]')).toHaveCount(2);
  const ids = await manager.locator('[data-remaked-build-row]').evaluateAll((rows) => rows.map((row) => row.dataset.buildId));
  expect(ids[0]).not.toBe(ids[1]);

  page.once('dialog', (dialog) => {
    expect(dialog.type()).toBe('confirm');
    dialog.accept();
  });
  await manager.locator('[data-remaked-build-delete]').first().click();
  await expect(manager.locator('[data-remaked-build-row]')).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem('file'))).toBe('legacy-sentinel');
});

test('Build Manager exports exact legacy code and imports valid code without using legacy File storage', async ({ page }) => {
  await openModern(page);
  const original = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const changed = await chooseDifferentRace(page);
  expect(changed).not.toBe(original);

  await page.getByRole('button', { name: 'Builds', exact: true }).click();
  const manager = page.locator('[data-remaked-build-manager]');
  await manager.locator('[data-remaked-export-build]').click();
  await expect(manager.locator('[data-remaked-build-code]')).toHaveValue(changed);

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
  await expect(manager.locator('[data-remaked-build-manager-status]')).toContainText(/invalid|could not/i);
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
