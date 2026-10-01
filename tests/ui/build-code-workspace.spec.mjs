import { test, expect } from '@playwright/test';

test('Builds owns one retained Code field and one set of export import clear actions', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  await expect(page.locator('#InCode')).toBeHidden();
  await expect(page.locator('[data-remaked-build-code]')).toHaveCount(1);
  expect(await page.locator('[data-remaked-build-code]').getAttribute('id')).toBe('InCode');
  await page.locator('[data-remaked-builds-open]').click();
  const manager = page.locator('[data-remaked-build-manager]');
  await expect(manager.locator('#InCode')).toBeVisible();
  await expect(manager.locator('[data-remaked-code-action]')).toHaveCount(3);
  expect(await manager.locator('[data-remaked-export-build]').getAttribute('data-remaked-code-action')).toBe('create');
  expect(await manager.locator('[data-remaked-import-build]').getAttribute('data-remaked-code-action')).toBe('load');
  await manager.locator('[data-remaked-export-build]').click();
  const code = await manager.locator('#InCode').inputValue();
  const decoded = await page.evaluate(value => Base64.btou(RawDeflate.inflate(Base64.fromBase64(value))), code);
  expect(decoded).toBe(before);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-remaked-builds-open]')).toBeFocused();
  await page.locator('[data-remaked-builds-open]').click();
  await expect(manager.locator('#InCode')).toHaveValue(code);
  await manager.locator('[data-remaked-code-action="delete"]').click();
  await expect(manager.locator('#InCode')).toHaveValue('');
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before);
});

test('unified invalid import keeps context and storage and retains a described error on reopen', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => {
    document.getElementById('SwitchUse_4').click();
    PandoraRemaked.builds.flushAutosave();
    return { payload: PandoraRemaked.adapter.serialize(), storage: JSON.stringify(localStorage) };
  });
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('#InCode').fill('1,2,3'); await page.locator('#InCode').press('Enter');
  await expect(page.locator('#InCode')).toBeFocused();
  await expect(page.locator('#InCode')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[data-remaked-code-status]')).toContainText('Invalid build code');
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before.payload);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before.storage);
  await page.locator('[data-remaked-share-build]').click();
  await expect(page.locator('[data-remaked-share-url]')).toBeVisible();
  await expect(page.locator('[data-remaked-code-status]')).toContainText('Invalid build code');
  await expect(page.locator('[data-remaked-build-manager-status]')).toContainText(/link|Copy/i);
  await page.keyboard.press('Escape'); await page.locator('[data-remaked-builds-open]').click();
  await expect(page.locator('[data-remaked-code-status]')).toContainText('Invalid build code');
  await page.locator('#InCode').fill('changed input');
  await expect(page.locator('[data-remaked-code-status]')).toBeEmpty();
  await expect(page.locator('#InCode')).not.toHaveAttribute('aria-invalid', 'true');
});

for (const width of [320, 390, 768, 1440]) test(`single code workspace fits and remains keyboard usable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  await page.locator('[data-remaked-builds-open]').focus(); await page.keyboard.press('Enter');
  for (const selector of ['#InCode', '[data-remaked-code-action="create"]', '[data-remaked-code-action="load"]', '[data-remaked-code-action="delete"]', '[data-remaked-share-build]']) {
    const control = page.locator(selector); await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box.x, selector).toBeGreaterThanOrEqual(0); expect(box.x + box.width, selector).toBeLessThanOrEqual(width);
    expect(box.height, selector).toBeGreaterThanOrEqual(width <= 620 ? 44 : 28);
  }
  await page.locator('[data-remaked-code-action="create"]').focus(); await page.keyboard.press('Space');
  await expect(page.locator('#InCode')).not.toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('missing calculator enhancement never falls back to unsafe native CodeLoad in Modern Builds', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/modern/calculator-controls.js', route => route.abort()); await page.goto('/');
  const before = await page.evaluate(() => {
    StatusMove('Lev', 54); CalcSet('Lev'); document.getElementById('SwitchUse_4').click();
    PandoraRemaked.builds.flushAutosave();
    return { payload: PandoraRemaked.adapter.serialize(), storage: JSON.stringify(localStorage) };
  });
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('li[onclick*="Base64.toBase64"]').click();
  await expect(page.locator('#InCode')).toHaveValue(before.payload);
  await page.locator('#InCode').fill('1,2,3');
  await page.locator('li[onclick="File(\'CodeLoad\');"]').click();
  await expect(page.locator('[data-remaked-build-manager-status]')).toContainText('Invalid build code');
  await expect(page.locator('#InCode')).toHaveAttribute('aria-invalid', 'true');
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before.payload);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before.storage);
  expect(errors).toEqual([]);
});
