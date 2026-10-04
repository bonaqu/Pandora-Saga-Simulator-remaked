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

test('desktop skill rows keep direct Adeptness input and read-only Potential compact without shrinking phone targets', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  const row = page.locator('[data-remaked-skill-row="1"]');
  const desktop = await row.boundingBox(); expect(desktop.height).toBeLessThanOrEqual(44);
  await expect(row.locator('[data-remaked-skill-group]')).toHaveCount(2);
  await expect(row.locator('[data-remaked-skill-number="1"]')).toHaveCount(1);
  await expect(row.locator('[data-remaked-skill-group="Potential"] button, [data-remaked-skill-group="Potential"] input')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const control = row.locator('[data-remaked-skill-number="1"]');
  const box = await control.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
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

test('skill allocation render exposes no obsolete Potential controls and does not alter the build', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  await expect(page.locator('[data-remaked-skill-number]')).toHaveCount(20);
  await expect(page.locator('[data-remaked-skill-group="Potential"] button, [data-remaked-skill-group="Potential"] input')).toHaveCount(0);
  await expect(page.locator('.remaked-skill-help, [data-remaked-skill-bulk]')).toHaveCount(0);
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

test('direct skill numbers fit system-font fallbacks without wrapping a compact skill row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  for (const font of ['Arial, sans-serif', 'Verdana, sans-serif', 'Consolas, monospace']) {
    await page.addStyleTag({ content: `.remaked-modern { --rm-font: ${font}; }` });
    const row = page.locator('[data-remaked-skill-row="1"]');
    const layout = await row.evaluate(node => {
      const input = node.querySelector('[data-remaked-skill-number]');
      return { height: node.getBoundingClientRect().height, input: { width: input.clientWidth, height: input.getBoundingClientRect().height, font: getComputedStyle(input).font } };
    });
    expect(layout.height, JSON.stringify({ font, ...layout })).toBeLessThanOrEqual(44);
    expect(layout.input.width).toBeGreaterThanOrEqual(28);
    expect(layout.input.height).toBeGreaterThanOrEqual(28);
  }
});
