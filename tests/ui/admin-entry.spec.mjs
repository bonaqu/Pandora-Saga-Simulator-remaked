import { test, expect } from '@playwright/test';
const api = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
const production = 'https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/';

async function openProductionFixture(page) {
  // Render the actual built files on the production origin. Auth behavior is
  // origin-dependent; localhost must not masquerade as an authorized POST.
  await page.route(production + '**', async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: 'http://127.0.0.1:8000/' + url.pathname.slice(new URL(production).pathname.length) + url.search });
    await route.fulfill({ response });
  });
  await page.goto(production);
}

test.use({ serviceWorkers: 'block' });

test('IDDQD reveals a native first-party login form without changing the character or leaking credentials', async ({ page }) => {
  await openProductionFixture(page);
  const before = await page.evaluate(() => ({ code: Store(), storage: JSON.stringify(localStorage) }));
  await page.locator('[data-remaked-header] a').first().focus();
  await page.keyboard.type('iddqd');
  const dialog = page.locator('[data-remaked-admin-entry]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('IDDQD ACCEPTED');
  await expect(dialog).toContainText('GOD MODE REQUIRES AUTHENTICATION');
  await expect(dialog.locator('form')).toHaveAttribute('action', api + '/api/auth/login');
  await expect(dialog.locator('form')).toHaveAttribute('method', 'post');
  await expect(dialog.locator('input[name="username"]')).toHaveValue('admin');
  await expect(dialog.locator('input[name="password"]')).toHaveAttribute('type', 'password');
  const after = await page.evaluate(() => ({ code: Store(), storage: JSON.stringify(localStorage) }));
  expect(after).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-remaked-header] a').first()).toBeFocused();
  await expect(dialog.locator('input[name="password"]')).toHaveValue('');
});

test('editable fields, modifiers, repeats, composition and interrupted prefixes do not unlock the admin entry', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('#InCode').fill(''); await page.locator('#InCode').focus(); await page.keyboard.type('IDDQD');
  await expect(page.locator('[data-remaked-admin-entry]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  for (const tag of ['textarea', 'div']) {
    await page.evaluate(tag => { const field = document.createElement(tag); if (tag === 'div') field.contentEditable = 'true'; field.id = 'editable-test'; document.body.appendChild(field); field.focus(); }, tag);
    await page.keyboard.type('IDDQD');
    await expect(page.locator('[data-remaked-admin-entry]')).toHaveCount(0);
    await page.locator('#editable-test').evaluate(field => field.remove());
  }
  await page.evaluate(() => {
    for (const mode of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { shiftKey: true }, { repeat: true }, { isComposing: true }]) {
      for (const key of 'IDDQD') document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...mode }));
    }
  });
  await expect(page.locator('[data-remaked-admin-entry]')).toHaveCount(0);
  await page.keyboard.type('idxdqd');
  await expect(page.locator('[data-remaked-admin-entry]')).toHaveCount(0);
  await page.keyboard.type('IDDQD');
  await expect(page.locator('[data-remaked-admin-entry]')).toBeVisible();
});

test('the hidden form traps focus, honors reduced motion, fits mobile and clears an unsubmitted password on close', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openProductionFixture(page); await page.keyboard.type('IDDQD');
  const dialog = page.locator('[data-remaked-admin-entry]');
  await expect(dialog).toBeVisible();
  await dialog.locator('input[name="password"]').fill('synthetic-not-real-secret');
  await dialog.getByRole('button', { name: 'AUTHENTICATE', exact: true }).focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement.closest('[data-remaked-admin-entry]') !== null)).toBe(true);
  expect(await dialog.evaluate(node => ({ width: node.getBoundingClientRect().width, scroll: document.documentElement.scrollWidth, animation: getComputedStyle(node).animationName }))).toEqual({ width: expect.any(Number), scroll: 320, animation: 'none' });
  for (const input of await dialog.locator('input, button').all()) {
    const box = await input.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.keyboard.press('Escape');
  await expect(dialog.locator('input[name="password"]')).toHaveValue('');
  expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).not.toContain('synthetic-not-real-secret');
});

test('local IDDQD sends no credentials from a disallowed origin and offers the first-party secure login', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => ({ code: Store(), storage: JSON.stringify(localStorage) }));
  await page.keyboard.type('IDDQD');
  const dialog = page.locator('[data-remaked-admin-entry]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[name="password"]')).toHaveCount(0);
  await expect(dialog.locator('input[name="username"]')).toHaveCount(0);
  await expect(dialog.locator('form')).toHaveCount(0);
  const link = dialog.getByRole('link', { name: 'OPEN SECURE LOGIN', exact: true });
  await expect(link).toHaveAttribute('href', api + '/admin');
  await expect(dialog).toContainText('local preview');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    // Measure the final hit area after the one-shot CRT scale animation.
    await expect.poll(async () => (await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
    const box = await link.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
  expect(await page.evaluate(() => ({ code: Store(), storage: JSON.stringify(localStorage) }))).toEqual(before);
  await link.focus(); await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.keyboard.type('IDDQD');
  await page.route(api + '/admin', route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().postData()).toBeNull();
    return route.fulfill({ contentType: 'text/html', body: '<h1>Secure first-party login</h1>' });
  });
  await link.click();
  await expect(page).toHaveURL(api + '/admin');
  await expect(page.getByRole('heading')).toHaveText('Secure first-party login');
});

test('museum does not load IDDQD or any administration interface', async ({ page }) => {
  await page.goto('/legacy/'); await page.keyboard.type('IDDQD');
  await expect(page.locator('[data-remaked-admin-entry]')).toHaveCount(0);
  expect(await page.evaluate(() => Boolean(window.PandoraRemaked?.adminEntry))).toBe(false);
});

test('administrator entry visual evidence on desktop and mobile', async ({ page }, testInfo) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('/'); await page.keyboard.type('IDDQD');
    await expect(page.locator('[data-remaked-admin-entry]')).toBeVisible();
    await page.locator('[data-remaked-admin-entry]').screenshot({ path: testInfo.outputPath('admin-entry-' + width + '.png'), animations: 'disabled' });
  }
});
