import { test, expect } from '@playwright/test';

test('picker reuses exact item nodes and hydrated previews while a large list is filtered', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const panel = page.locator('[data-remaked-picker-panel]');
  const query = panel.locator('[data-remaked-search-query]');
  const row = panel.locator('[data-remaked-search-row][data-value="8"]');
  await expect(row).toHaveCount(1);
  expect(await panel.locator('[data-remaked-search-row]').count()).toBeGreaterThan(50);
  const needle = await row.locator('.remaked-search-result-name').textContent();
  await page.evaluate(() => {
    window.__reusedEquipmentRow = document.querySelector('[data-remaked-picker-panel] [data-remaked-search-row][data-value="8"]');
    const adapter = PandoraRemaked.adapter;
    const original = adapter.readItemDetails;
    window.__reusePreviewCalls = 0;
    adapter.readItemDetails = function (kind, value) {
      if (kind === 'equipment' && String(value) === '8') window.__reusePreviewCalls += 1;
      return original.apply(this, arguments);
    };
  });
  await row.locator('summary').click();
  await expect(row.locator('.remaked-item-title')).toBeVisible();
  expect(await page.evaluate(() => window.__reusePreviewCalls)).toBe(1);

  await query.fill(needle.slice(0, 3));
  expect(await page.evaluate(() => window.__reusedEquipmentRow === document.querySelector('[data-remaked-picker-panel] [data-remaked-search-row][data-value="8"]'))).toBe(true);
  const created = await page.evaluate(() => {
    const original = document.createElement;
    let calls = 0;
    document.createElement = function () { calls += 1; return original.apply(this, arguments); };
    try {
      const input = document.querySelector('[data-remaked-picker-panel] [data-remaked-search-query]');
      for (let i = 0; i < 3; i += 1) input.dispatchEvent(new Event('input', { bubbles: true }));
    } finally {
      document.createElement = original;
    }
    return calls;
  });
  expect(created).toBeLessThan(3);
  await query.fill('__unmatched_pandora_441__');
  await expect(panel.locator('[data-remaked-search-result]')).toHaveCount(0);
  await query.fill('');
  expect(await page.evaluate(() => window.__reusedEquipmentRow === document.querySelector('[data-remaked-picker-panel] [data-remaked-search-row][data-value="8"]'))).toBe(true);
  await row.locator('details').evaluate(node => { node.open = true; });
  await expect(row.locator('.remaked-item-title')).toBeVisible();
  expect(await page.evaluate(() => window.__reusePreviewCalls)).toBe(1);

  // External catalog/locale refresh must drop stale nodes, unlike typing.
  await page.evaluate(() => window.dispatchEvent(new Event('pandora-remaked:localechange')));
  expect(await page.evaluate(() => window.__reusedEquipmentRow === document.querySelector('[data-remaked-picker-panel] [data-remaked-search-row][data-value="8"]'))).toBe(false);
  expect(await page.evaluate(() => Store())).toBe(before);
});

test('equipment search retains row identity and keyboard focus on a same-query update', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.evaluate(() => PandoraRemaked.search.openEquipmentSearch(0));
  const panel = page.locator('[data-remaked-search-panel]');
  const query = panel.locator('[data-remaked-search-query]');
  const row = panel.locator('[data-remaked-search-row][data-value="8"]');
  await expect(row).toHaveCount(1);
  await page.evaluate(() => {
    window.__equipmentSearchButton = document.querySelector('[data-remaked-search-row][data-value="8"] button');
  });
  const name = await row.locator('.remaked-search-result-name').textContent();
  await query.fill(name.slice(0, 3));
  expect(await page.evaluate(() => document.querySelector('[data-remaked-search-row][data-value="8"] button') === window.__equipmentSearchButton)).toBe(true);
  await row.locator('button').focus();
  await page.evaluate(() => {
    document.querySelector('[data-remaked-search-query]').dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(row.locator('button')).toBeFocused();
  await query.fill('__unmatched_pandora_441__');
  await query.fill('');
  expect(await page.evaluate(() => document.querySelector('[data-remaked-search-row][data-value="8"] button') === window.__equipmentSearchButton)).toBe(true);
  expect(await page.evaluate(() => Store())).toBe(before);
});

test('Soul search retains rows across typing without changing the character', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const adapter = PandoraRemaked.adapter;
    adapter.selectEquipment(0, '1');
    document.getElementById('SelEquip_0_4').style.display = '';
    PandoraRemaked.search.openSoulSearch({ slotIndex: 0, socketIndex: 4 });
  });
  const before = await page.evaluate(() => Store());
  const panel = page.locator('[data-remaked-search-panel][data-search-kind="soul"]');
  const row = panel.locator('[data-remaked-search-row]').filter({ has: panel.locator('details') }).first();
  await expect(row).toHaveCount(1);
  const value = await row.getAttribute('data-value');
  await page.evaluate(value => {
    window.__soulSearchRow = document.querySelector('[data-remaked-search-row][data-value="' + value + '"]');
  }, value);
  const query = panel.locator('[data-remaked-search-query]');
  const name = await row.locator('.remaked-search-result-name').textContent();
  await query.fill(name.slice(0, 2));
  expect(await page.evaluate(value => document.querySelector('[data-remaked-search-row][data-value="' + value + '"]') === window.__soulSearchRow, value)).toBe(true);
  await query.fill('__unmatched_pandora_441__');
  await expect(panel.locator('[data-remaked-search-result]')).toHaveCount(0);
  await query.fill('');
  expect(await page.evaluate(value => document.querySelector('[data-remaked-search-row][data-value="' + value + '"]') === window.__soulSearchRow, value)).toBe(true);
  expect(await page.evaluate(() => Store())).toBe(before);
});
