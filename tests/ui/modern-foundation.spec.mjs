import { test, expect } from '@playwright/test';

const repoUrl = 'https://github.com/bonaqu/Pandora-Saga-Simulator-remaked';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-header]')).toBeVisible();
}

test('Modern shell exposes meaningful navigation and defaults to English', async ({ page }) => {
  await openModern(page);
  const header = page.locator('[data-remaked-header]');
  await expect(header.getByRole('link', { name: 'Project' })).toHaveAttribute('href', repoUrl);
  await expect(header.getByRole('link', { name: 'Updates' })).toHaveAttribute('href', /CHANGELOG\.md$/);
  await expect(header.getByRole('link', { name: 'Legacy Mode' })).toHaveAttribute('href', './legacy/');
  await expect(header.locator('a[href*="awayfromkuma"]')).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
  await expect(header.getByRole('button', { name: 'JOB' })).toBeVisible();
  await expect(header.getByRole('button', { name: 'FILE' })).toBeVisible();
});

test('Modern language controls drive the legacy language state', async ({ page }) => {
  await openModern(page);
  const header = page.locator('[data-remaked-header]');
  await header.getByRole('button', { name: 'JP' }).click();
  await expect.poll(() => page.evaluate(() => window.Flag[0])).toBe(0);
  await header.getByRole('button', { name: 'EN' }).click();
  await expect.poll(() => page.evaluate(() => window.Flag[0])).toBe(1);
});

test('Modern tab navigation drives the existing legacy tab handlers', async ({ page }) => {
  await openModern(page);
  await page.locator('[data-remaked-header]').getByRole('button', { name: 'JOB' }).click();
  await expect.poll(() => page.evaluate(() => window.Flag[2])).toBe(1);
  await expect(page.locator('#Tab_0_1')).toBeVisible();
});

test('Modern shell initialization does not mutate the serialized legacy build', async ({ page }) => {
  await openModern(page);
  const before = await page.evaluate(() => window.Store());
  await page.evaluate(() => window.PandoraRemaked.initModernShell());
  const after = await page.evaluate(() => window.Store());
  expect(after).toBe(before);
});

for (const viewport of [
  { width: 1920, height: 1080, name: '1080p' },
  { width: 2560, height: 1440, name: '1440p' }
]) {
  test(`header stays inside the app shell at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openModern(page);
    const [header, shell] = await Promise.all([
      page.locator('[data-remaked-header]').boundingBox(),
      page.locator('[data-remaked-shell]').boundingBox()
    ]);
    expect(header).not.toBeNull();
    expect(shell).not.toBeNull();
    expect(header.x + header.width).toBeLessThanOrEqual(shell.x + shell.width + 1);
  });
}

test('mobile viewport has no body-level horizontal overflow and nav remains reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openModern(page);
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 1);
  await expect(page.locator('[data-remaked-nav]')).toBeVisible();
});

test('primary Modern nav controls do not overlap each other', async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await openModern(page);
  const boxes = await page.locator('[data-remaked-nav] button').evaluateAll((buttons) =>
    buttons.map((button) => {
      const r = button.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    })
  );
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      expect(overlaps).toBe(false);
    }
  }
});
