import { test, expect } from '@playwright/test';

test('Modern consolidates Builds and Compare in one header group without LOG FILE or inherited theme controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('workspace-desktop.png'), fullPage: true });
  const header = page.locator('[data-remaked-header]');
  await expect(header.locator('[data-remaked-tab]')).toHaveCount(5);
  await expect(header.getByRole('button', { name: 'LOG', exact: true })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'FILE', exact: true })).toHaveCount(0);
  await expect(header.locator('[data-remaked-density]')).toHaveCount(0);
  const builds = header.locator('[data-remaked-build-actions]');
  await expect(builds.locator('button')).toHaveCount(2);
  await expect(builds.locator('button').first()).toHaveCSS('border-radius', '0px');
  await expect(builds.locator('button').last()).toHaveCSS('border-radius', '0px');
  await expect(page.locator('[data-remaked-builds-open]')).toHaveCount(1);
  await expect(page.locator('[data-remaked-compare-open]')).toHaveCount(1);
  const before = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  await builds.locator('[data-remaked-builds-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-remaked-build-manager]')).toBeVisible(); await page.keyboard.press('Escape');
  await builds.locator('[data-remaked-compare-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-remaked-compare]')).toBeVisible(); await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(before);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const control of ['[data-remaked-builds-open]', '[data-remaked-compare-open]']) {
      const box = await header.locator(control).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
  }
});

test('desktop skill rows keep both point modes and primary native actions compact without shrinking phone targets', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  const row = page.locator('[data-remaked-skill-row="1"]');
  const desktop = await row.boundingBox(); expect(desktop.height).toBeLessThanOrEqual(44);
  await expect(row.locator('[data-remaked-skill-group]')).toHaveCount(2);
  await expect(row.locator('.remaked-skill-primary button')).toHaveCount(4);
  await page.setViewportSize({ width: 390, height: 844 });
  const controls = row.locator('.remaked-skill-primary button');
  for (let index = 0; index < await controls.count(); index++) {
    const box = await controls.nth(index).boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: testInfo.outputPath('workspace-mobile-header.png') });
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('workspace-mobile-skills.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('desktop character controls and results do not push equipment behind a tall card stack', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  const character = await page.locator('[data-remaked-calculator-character]').boundingBox();
  expect(character.height).toBeLessThanOrEqual(850);
  const equipment = await page.locator('#TextEquip_0').boundingBox();
  expect(equipment.y).toBeLessThanOrEqual(1200);
});

test('skill allocation explanation opens deliberately by keyboard and does not alter the build', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const help = page.locator('.remaked-skill-help');
  await expect(help.locator('p')).toBeHidden();
  await help.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(help.locator('p')).toBeVisible();
  await expect(help.locator('p')).toContainText('Adeptness');
  await page.keyboard.press('Enter'); await expect(help.locator('p')).toBeHidden();
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(before);
});

test('tablet-to-desktop transition preserves readable controls without clipping the work area', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  for (const width of [861, 1024, 1099, 1280, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const selector of ['[data-remaked-calculator-character]', '#SkillSet', '#StatusView', '[data-remaked-calculator-effects]', '[data-remaked-picker-section]']) {
      const geometry = await page.locator(selector).evaluate(node => ({ right: node.getBoundingClientRect().right, width: node.clientWidth, scroll: node.scrollWidth }));
      expect(geometry.right, selector + ' at ' + width).toBeLessThanOrEqual(width);
      expect(geometry.scroll, selector + ' at ' + width).toBeLessThanOrEqual(geometry.width + 1);
    }
  }
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(before);
});
