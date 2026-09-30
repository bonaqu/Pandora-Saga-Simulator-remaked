import { test, expect } from '@playwright/test';

test('native calculator steps retain callback parity and phone primary sections reflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const button = page.locator('[data-remaked-step="remaked-level-up3"]');
  await button.focus(); await page.keyboard.press('Space');
  await expect(page.locator('#StatusLev')).toHaveText('55');
  const before = await page.evaluate(() => Store());
  const expected = await page.evaluate(() => { document.getElementById('remaked-attribute-STR-up1').click(); return Store(); });
  await page.evaluate(code => PandoraRemaked.adapter.load(code), before);
  await page.locator('[data-remaked-step="remaked-attribute-STR-up1"]').click();
  expect(await page.evaluate(() => Store())).toBe(expected);
  const bounds = await page.locator('#SkillSet').boundingBox();
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});

test('off-screen Equipment keyboard review survives automatic scroll but not wheel input', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').focus();
  await page.keyboard.press('ArrowDown');
  const row = page.locator('[data-remaked-picker-panel] [data-remaked-search-row][data-value="120011"]');
  await row.locator('button').focus();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await page.waitForTimeout(150);
  // WebKit can deliver focus-induced scrolling after the preview's render
  // frames. Preserve keyboard review independent of that event's timing.
  await page.evaluate(() => document.querySelector('[data-remaked-picker-panel] [data-remaked-search-results]').dispatchEvent(new Event('scroll', { bubbles: true })));
  await expect(row.locator('details')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => Store())).toBe(before);
  await row.locator('button').hover();
  await page.mouse.wheel(0, -1);
  await page.waitForTimeout(550);
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  expect(await page.evaluate(() => Store())).toBe(before);
});

test('actual Equipment picker separates review and selection and preserves native-engine parity', async ({ page }) => {
  await page.goto('/');
  const original = await page.evaluate(() => Store());
  const opener = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
  await opener.click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('[data-remaked-equipment-dropdown]')).toBeVisible();
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  const panel = page.locator('[data-remaked-picker-panel]');
  const row = panel.locator('[data-remaked-search-row][data-value="2"]');
  await row.locator('summary').click();
  await page.evaluate(() => document.querySelector('[data-remaked-picker-panel] [data-remaked-search-results]').dispatchEvent(new Event('scroll', { bubbles: true })));
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  expect(await page.evaluate(() => Store())).toBe(original);
  await row.locator('button').click();
  await expect(panel).toHaveCount(0);
  await expect(opener).toBeFocused();
  const selected = await page.evaluate(() => Store());
  const expected = await page.evaluate(code => {
    PandoraRemaked.adapter.load(code);
    const select = document.getElementById('SelEquip_0_0');
    select.value = '2'; select.dispatchEvent(new Event('change', { bubbles: true }));
    return Store();
  }, original);
  expect(selected).toBe(expected);
});

test('item preview and shared build link work without mutating Legacy data', async ({ page, browser }) => {
  await page.goto('/');
  const before = await page.evaluate(() => ({ code: Store(), data: JSON.stringify(EquipData) }));
  await page.locator('[data-remaked-equipment-search]').click();
  const row = page.locator('[data-remaked-search-row][data-value="1"]');
  await row.locator('summary').click();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await row.locator('summary').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await page.evaluate(() => ({ code: Store(), data: JSON.stringify(EquipData) }))).toEqual(before);
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-share-build]').click();
  const url = await page.locator('[data-remaked-share-url]').inputValue();
  const recipientContext = await browser.newContext();
  try {
    const recipient = await recipientContext.newPage();
    await recipient.goto(url);
    await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
    expect(await recipient.evaluate(() => Store())).toBe(before.code);
  } finally { await recipientContext.close(); }
});

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
