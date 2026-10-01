import { test, expect } from '@playwright/test';

const repoUrl = 'https://github.com/bonaqu/Pandora-Saga-Simulator-remaked';

test('Modern 3.00 identifies the rework version without relabeling the museum engine', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => ({ ...PandoraRemakedVersion }))).toEqual({ legacyEngine: '2.00', ui: '3.00' });
  expect(await page.evaluate(() => Ver)).toBe('2.00');
  await expect(page.locator('[data-remaked-hero]')).toContainText('3.00');
  await expect(page.locator('[data-remaked-hero]')).toContainText('2.00');
  const sourceTitles = await page.evaluate(() => Name.Title.slice());
  for (const language of ['EN', 'RU', 'JP', 'TW']) {
    await page.locator('[data-remaked-language-panel]').getByRole('button', { name: language, exact: true }).click();
    const expected = await page.evaluate(() => Name.Title[Number(Flag[0]) + 1] + ' 3.00');
    await expect(page.locator('#Title')).toHaveText(expected);
    expect(await page.evaluate(() => Name.Title.slice())).toEqual(sourceTitles);
    expect(await page.evaluate(() => Ver)).toBe('2.00');
  }
  await page.goto('/legacy/');
  expect(await page.evaluate(() => typeof window.PandoraRemakedVersion)).toBe('undefined');
  expect(await page.evaluate(() => Ver)).toBe('2.00');
  await expect(page.locator('#Title')).toContainText('2.00');
  await expect(page).toHaveTitle('Pandora Saga Simulator');
});

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-header]')).toBeVisible();
}

function collectLocalFailures(page) {
  const failures = [];
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.hostname === '127.0.0.1' && response.status() >= 400) {
      failures.push(`${response.status()} ${url.pathname}`);
    }
  });
  return failures;
}

test('Modern shell exposes meaningful navigation and defaults to English', async ({ page }) => {
  await openModern(page);
  const header = page.locator('[data-remaked-header]');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', './modern/favicon.svg');
  await expect(header.getByRole('link', { name: 'Project', exact: true })).toHaveAttribute('href', repoUrl);
  await expect(header.getByRole('button', { name: 'Updates', exact: true })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Legacy Mode', exact: true })).toHaveAttribute('href', './legacy/');
  await expect(header.locator('a[href*="awayfromkuma"]')).toHaveCount(0);
  await expect(header.locator('[data-remaked-language="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(header.getByRole('button', { name: 'JOB', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'FILE', exact: true })).toHaveCount(0);
  await expect(header.locator('[data-remaked-build-actions] [data-remaked-builds-open]')).toBeVisible();
});

test('Modern header includes the approved Hybrid C hero treatment', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openModern(page);
  const hero = page.locator('[data-remaked-hero]');
  await expect(hero).toBeVisible();
  await expect(hero.getByRole('heading', { name: 'Pandora Saga Simulator', exact: true })).toBeVisible();
  await expect(hero.getByText('Remaked', { exact: true })).toBeVisible();
  const heroArt = hero.locator('img[data-remaked-hero-art]');
  await expect(heroArt).toHaveAttribute('src', './modern/pandora-hero.webp');
  await expect.poll(() => heroArt.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  const imageMetrics = await heroArt.evaluate((img) => ({
    width: img.naturalWidth,
    height: img.naturalHeight
  }));
  expect(imageMetrics.width).toBeGreaterThanOrEqual(1200);
  expect(imageMetrics.height).toBeGreaterThanOrEqual(300);
  expect(imageMetrics.width / imageMetrics.height).toBeGreaterThanOrEqual(2.5);
  const metrics = await hero.evaluate((element) => ({ height: element.getBoundingClientRect().height }));
  // Desktop now prioritizes the compact workspace; retain the same verified art.
  expect(metrics.height).toBeGreaterThanOrEqual(80);
  expect(metrics.height).toBeLessThanOrEqual(100);
});

test('Modern language controls drive the legacy language state', async ({ page }) => {
  await openModern(page);
  const header = page.locator('[data-remaked-header]');
  await header.getByRole('button', { name: 'JP', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.Flag[0])).toBe(0);
  await header.locator('[data-remaked-language="1"]').click();
  await expect.poll(() => page.evaluate(() => window.Flag[0])).toBe(1);
});

test('Modern tab navigation drives the existing legacy tab handlers', async ({ page }) => {
  await openModern(page);
  await page.locator('[data-remaked-header]').getByRole('button', { name: 'JOB', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.Flag[2])).toBe(1);
  await expect.poll(() => page.locator('#Tab_0_1').evaluate((element) => element.style.display)).toBe('inline');
  await expect(page.locator('#Tab_0_1 .sub_win').first()).toBeVisible();
});

test('Modern shell initialization does not mutate the serialized legacy build', async ({ page }) => {
  await openModern(page);
  const before = await page.evaluate(() => window.Store());
  await page.evaluate(() => window.PandoraRemaked.initModernShell());
  const after = await page.evaluate(() => window.Store());
  expect(after).toBe(before);
});

test('Modern and Legacy routes load without missing local assets', async ({ page }) => {
  const failures = collectLocalFailures(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.goto('/legacy/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#body')).toHaveCount(1);
  await expect(page.locator('#SelRace')).toHaveCount(1);
  expect(await page.evaluate(() => typeof window.Store)).toBe('function');
  expect(await page.evaluate(() => typeof window.CalcSet)).toBe('function');
  expect(failures).toEqual([]);
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

test('mobile viewport has compact hero, no body-level horizontal overflow and reachable nav', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openModern(page);
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 1);
  await expect(page.locator('[data-remaked-nav]')).toBeVisible();
  const heroBox = await page.locator('[data-remaked-hero]').boundingBox();
  expect(heroBox).not.toBeNull();
  expect(heroBox.height).toBeGreaterThanOrEqual(105);
  expect(heroBox.height).toBeLessThanOrEqual(145);
});

test('primary Modern nav controls do not overlap each other', async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await openModern(page);
  const buttons = page.locator('[data-remaked-nav] button');
  const count = await buttons.count();
  const boxes = [];
  for (let index = 0; index < count; index += 1) {
    const box = await buttons.nth(index).boundingBox();
    expect(box).not.toBeNull();
    boxes.push({
      left: box.x,
      right: box.x + box.width,
      top: box.y,
      bottom: box.y + box.height
    });
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      expect(overlaps).toBe(false);
    }
  }
});
