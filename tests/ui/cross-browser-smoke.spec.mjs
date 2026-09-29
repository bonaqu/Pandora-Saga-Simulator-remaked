import { test, expect } from '@playwright/test';

test('native Modern dialogs keep focus and restore their opener', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  for (const selector of ['[data-remaked-equipment-search]', '[data-remaked-builds-open]', '[data-remaked-compare-open]', '[data-remaked-updates-open]']) {
    const opener = page.locator(selector);
    await opener.focus(); await page.keyboard.press('Enter');
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toHaveCount(1);
    await page.locator('[data-remaked-ui-locale="ru"]').evaluate(node => node.focus());
    expect(await page.evaluate(() => Boolean(document.activeElement.closest('dialog[open]')))).toBe(true);
    await dialog.locator('button').first().focus();
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement.closest('dialog[open]')))).toBe(true);
    await page.keyboard.press('Tab');
    await expect(dialog.locator('button').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
  expect(await page.evaluate(() => Store())).toBe(before);
});

    for (const route of ['/', '/legacy/']) {
      test(`compressed build round-trip and runtime at ${route}`, async ({ page }) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(route);
        await expect(page.locator('#Status_6')).not.toHaveText('');
        const saved = await page.evaluate(() => {
          const payload = Store();
          File('Save', 0);
          return { payload, compressed: localStorage.file };
        });
        await page.evaluate(() => {
          const race = document.getElementById('SelRace');
          race.selectedIndex = 1;
          race.dispatchEvent(new Event('change', { bubbles: true }));
        });
        expect(await page.evaluate(() => Store())).not.toBe(saved.payload);
        await page.evaluate(() => File('Load', 0));
        expect(await page.evaluate(() => Store())).toBe(saved.payload);
        expect(await page.evaluate(() => localStorage.file)).toBe(saved.compressed);
        if (route === '/legacy/') expect(await page.evaluate(() => [...document.scripts].some(script => /modern\//.test(script.src)))).toBe(false);
        expect(errors).toEqual([]);
      });
    }

    test('Modern RU display, source search and keyboard Escape at 390px', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/');
      const source = await page.evaluate(() => {
        Object.assign(PandoraRemakedGameTerms.ru, { 'race.0': 'Проверочная раса', 'equipment.0.1': 'Проверочный предмет' });
        return { name: PandoraRemaked.adapter.listEquipmentOptions(0).find(option => option.value === '1').name, payload: Store() };
      });
      await page.locator('[data-remaked-ui-locale="ru"]').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#StatusRace')).toHaveText('Проверочная раса');
      const opener = page.locator('[data-remaked-equipment-search]');
      await opener.focus();
      await page.keyboard.press('Enter');
      await page.locator('[data-remaked-search-query]').fill(source.name);
      await expect(page.locator('[data-remaked-search-result][data-value="1"]')).toContainText('Проверочный предмет');
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-remaked-search-panel]')).toHaveCount(0);
      await expect(opener).toBeFocused();
      expect(await page.evaluate(() => Store())).toBe(source.payload);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
