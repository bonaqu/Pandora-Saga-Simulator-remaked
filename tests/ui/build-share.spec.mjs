import { test, expect } from '@playwright/test';

test('share link restores the exact build in a separate browser with no storage', async ({ page, browser }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const race = document.getElementById('SelRace');
    race.selectedIndex = (race.selectedIndex + 1) % race.options.length;
    race.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const payload = await page.evaluate(() => window.Store());
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-share-build]').click();
  const url = await page.locator('[data-remaked-share-url]').inputValue();
  expect(url).toContain('#build=');
  const context = await browser.newContext();
  try {
    const recipient = await context.newPage();
    await recipient.goto(url);
    await expect(recipient.locator('[data-remaked-shell]')).toBeVisible();
    await expect.poll(() => recipient.evaluate(() => window.Store())).toBe(payload);
    await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
  } finally { await context.close(); }
});

test('valid shared build takes precedence over local autosave; invalid link preserves autosave', async ({ page }) => {
  await page.goto('/');
  const original = await page.evaluate(() => window.Store());
  const changed = await page.evaluate(() => {
    const race = document.getElementById('SelRace');
    race.selectedIndex = (race.selectedIndex + 1) % race.options.length;
    race.dispatchEvent(new Event('change', { bubbles: true }));
    window.PandoraRemaked.builds.flushAutosave();
    return window.Store();
  });
  await page.goto('/#build=' + encodeURIComponent(original));
  await expect.poll(() => page.evaluate(() => window.Store())).toBe(original);
  expect(changed).not.toBe(original);
  await page.goto('/#build=broken');
  await page.reload();
  await expect(page.locator('[data-remaked-autosave-status]')).toContainText('Invalid share link');
  expect(await page.evaluate(() => window.Store())).toBe(original);
});

test('denied clipboard still exposes a selectable working URL and honest status', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText() { return Promise.reject(new Error('denied')); } }, configurable: true }));
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-share-build]').click();
  await expect(page.locator('[data-remaked-share-url]')).toBeVisible();
  await expect(page.locator('[data-remaked-share-url]')).toBeFocused();
  await expect(page.locator('[data-remaked-build-manager-status]')).toContainText('Copy the link');
});

test('loading a shared build does not hide a storage failure with a success message', async ({ page }) => {
  await page.goto('/');
  const payload = await page.evaluate(() => window.Store());
  await page.evaluate(payload => {
    Storage.prototype.setItem = function () { throw new DOMException('Full', 'QuotaExceededError'); };
    window.location.hash = 'build=' + encodeURIComponent(payload);
  }, payload);
  await expect(page.locator('[data-remaked-autosave-status]')).toHaveAttribute('data-state', 'warning');
  await expect(page.locator('[data-remaked-autosave-status]')).toContainText('Autosave warning');
  expect(await page.evaluate(() => window.Store())).toBe(payload);
});
