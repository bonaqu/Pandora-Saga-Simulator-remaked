import { test, expect } from '@playwright/test';

test('museum retains the documented Wyss Belt malformed-marker failure', async ({ page }) => {
  await page.goto('/legacy/');
  const result = await page.evaluate(() => {
    window.Status.Equip[11][0] = 420032;
    try { window.EquipCheck(); return { failed: false }; }
    catch (error) { return { failed: true, message: error.message, code: window.EquipData[0][42][32][7] }; }
  });
  expect(result.failed).toBe(true); expect(result.message).toContain('push'); expect(result.code).toBe('0=1_-7');
});

test('Modern transparently preserves Wyss Belt STA without inventing an effect from the malformed marker', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message)); await page.goto('/');
  const result = await page.evaluate(() => {
    const api = window.PandoraRemaked; const original = api.adapter.serialize(); const source = window.EquipData[0][42][32], code = source[7];
    const selected = api.adapter.selectEquipment(11, 420032); const stamina = window.Status.STA[2]; const saved = api.adapter.serialize();
    window.CalcSet('Equip'); window.CalcSet('ALL'); api.adapter.load(original); const removed = window.Status.STA[2]; api.adapter.load(saved);
    return { selected, stamina, removed, loaded: window.Status.STA[2], sameRow: source === window.EquipData[0][42][32], code, afterCode: source[7], warning: api.adapter.readItemDetails('equipment', 420032, 11).calculationWarning };
  });
  expect(result.selected).toBe(true); expect(result.stamina).toBe(1); expect(result.removed).toBe(0); expect(result.loaded).toBe(1); expect(result.sameRow).toBe(true); expect(result.afterCode).toBe(result.code); expect(result.warning).toContain('-7'); expect(errors).toEqual([]);
  await page.locator('[data-remaked-equipment-picker="SelEquip_11_0"]').click();
  const row = page.locator('[data-remaked-picker-panel] [data-remaked-search-row][data-value="420032"]');
  await row.locator('summary').click();
  await expect(row.locator('[data-remaked-item-description]')).toContainText('not simulated');
  await expect(page.locator('[data-remaked-equipment-warning]:visible')).toContainText('-7');
});

test('compatibility guard restores the original row even when retained equipment calculation throws, and does not conceal another error', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    window.Status.Equip[11][0] = 420032; const row = window.EquipData[0][42][32], code = row[7];
    const original = window.Calc; window.Calc = function () { throw new Error('real native failure'); };
    let message; try { window.EquipCheck(); } catch (error) { message = error.message; } finally { window.Calc = original; }
    return { message, sameRow: row === window.EquipData[0][42][32], code: row[7], originalCode: code };
  });
  expect(result.message).toBe('real native failure'); expect(result.sameRow).toBe(true); expect(result.code).toBe(result.originalCode);
});

for (const width of [390, 1440]) test('visible compatibility warning fits its equipment row at ' + width + 'px', async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  await page.evaluate(() => window.PandoraRemaked.adapter.selectEquipment(11, 420032));
  const warning = page.locator('[data-remaked-equipment-warning]'); await expect(warning).toBeVisible();
  const dimensions = await warning.evaluate(node => {
    const box = node.getBoundingClientRect(), parent = node.closest('[data-remaked-picker-fields]').getBoundingClientRect();
    return { right: box.right, parentRight: parent.right, scroll: document.documentElement.scrollWidth, viewport: innerWidth };
  });
  expect(dimensions.right).toBeLessThanOrEqual(dimensions.parentRight + 1); expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 1);
  await warning.scrollIntoViewIfNeeded(); await page.screenshot({ path: testInfo.outputPath('equipment-warning-' + width + '.png') });
});
