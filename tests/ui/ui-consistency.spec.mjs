import { test, expect } from '@playwright/test';

test('one language panel has exactly one active language and preserves build bytes', async ({ page }) => {
  await page.goto('/');
  const panel = page.locator('[data-remaked-language-panel]');
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('button')).toHaveText(['EN', 'RU', 'JP', 'TW']);
  const before = await page.evaluate(() => window.Store());
  for (const [label, locale, data] of [['JP', 'jp', 0], ['RU', 'ru', 1], ['TW', 'tw', 2], ['EN', 'en', 1]]) {
    await panel.getByRole('button', { name: label, exact: true }).click();
    await expect(panel.locator('[aria-pressed="true"]')).toHaveText(label);
    expect(await page.evaluate(() => ({ payload: window.Store(), locale: window.PandoraRemaked.i18n.getLocale(), data: window.Flag[0] })))
      .toEqual({ payload: before, locale, data });
  }
});

for (const width of [320, 390, 768, 1440]) {
  test(`consistent RU header and toolbar controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.locator('[data-remaked-ui-locale="ru"]').click();
    const metrics = await page.evaluate(() => {
      function box(selector) {
        const node = document.querySelector(selector); if (!node) return null; const css = getComputedStyle(node);
        return { height: node.getBoundingClientRect().height, size: css.fontSize, radius: css.borderRadius };
      }
      const toolbar = [];
      document.querySelectorAll('[data-remaked-build-actions] button').forEach(node => {
        const css = getComputedStyle(node);
        toolbar.push({ height: node.getBoundingClientRect().height, size: css.fontSize });
      });
      return { toolbar, install: box('[data-remaked-install]'), language: box('[data-remaked-language-panel]'), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(metrics.overflow).toBeLessThanOrEqual(1);
    expect(metrics.install).toBeNull();
    expect(metrics.language.height).toBeGreaterThan(0);
    // Builds/Compare occupy the former FILE/LOG space; Equipment/Soul search lives in each slot picker.
    await expect(page.locator('[data-remaked-tools]')).toHaveCount(0);
    await expect(page.locator('[data-remaked-build-actions] button')).toHaveCount(2);
    expect(metrics.toolbar.length).toBe(2);
    for (const entry of metrics.toolbar) expect(entry).toEqual(metrics.toolbar[0]);
    expect(parseFloat(metrics.toolbar[0].size)).toBeGreaterThanOrEqual(12);
    expect(metrics.toolbar[0].height).toBeGreaterThanOrEqual(width <= 620 ? 44 : 36);
    await expect(page.locator('[data-remaked-autosave-status]')).toHaveCSS('font-size', '12px');
  });
}

test('Compare table uses Modern typography including Cyrillic headers', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const store = window.PandoraRemaked.buildStore;
    store.saveBuild('A', window.Store()); store.saveBuild('B', window.Store());
  });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await page.locator('[data-remaked-compare-open]').click();
  const table = page.locator('[data-remaked-compare-table]');
  const family = await table.evaluate(node => getComputedStyle(node).fontFamily);
  expect(family).toContain('system-ui');
  expect(family).not.toContain('monospace');
  await expect(table).toHaveCSS('font-size', '13px');
  await expect(table.locator('thead th').first()).toHaveCSS('letter-spacing', 'normal');
});
