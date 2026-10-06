import { test, expect } from '@playwright/test';

test('numeric feedback names each field and its actual limit; cancel clears it without changing the build', async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000);
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  const status = page.locator('#remaked-number-status');
  for (const locale of ['en', 'ru']) {
    await page.locator(`[data-remaked-ui-locale="${locale}"]`).click();
    for (const key of ['Lev', 'STA', 'STR', 'AGI', 'DEX', 'SPR', 'INT']) {
      const input = page.locator(`[data-remaked-number="${key}"]`);
      const field = await input.evaluate(node => document.getElementById(node.getAttribute('aria-labelledby')).textContent.trim());
      const max = await input.getAttribute('max'), min = await input.getAttribute('min');
      for (const [value, expected] of [
        [String(Number(max) + 1), locale === 'ru' ? `Максимальное значение поля «${field}» — ${max}. Esc отменяет ввод.` : `${field}: maximum ${max}. Esc cancels your edit.`],
        [String(Number(min) - 1), locale === 'ru' ? `Минимальное значение поля «${field}» — ${min}. Esc отменяет ввод.` : `${field}: minimum ${min}. Esc cancels your edit.`],
        [String(Number(min) + 0.5), locale === 'ru' ? `Для поля «${field}» введите целое число от ${min} до ${max}. Esc отменяет ввод.` : `${field}: enter a whole number from ${min} to ${max}. Esc cancels your edit.`],
        ['', locale === 'ru' ? `Заполните поле «${field}»: целое число от ${min} до ${max}. Esc отменяет ввод.` : `${field}: enter a value from ${min} to ${max}. Esc cancels your edit.`]
      ]) {
        await input.fill(value); await input.press('Enter');
        await expect(status).toHaveText(expected); await expect(input).toHaveAttribute('aria-invalid', 'true');
        if (key === 'Lev' && value === '56') await page.locator('[data-remaked-calculator-character]').screenshot({ path: testInfo.outputPath('numeric-limit-' + locale + '.png') });
        expect(await page.evaluate(() => Store())).toBe(before);
        await input.press('Escape');
        await expect(status).toBeEmpty(); await expect(input).not.toHaveAttribute('aria-invalid');
      }
    }
  }
});

test('invalid edits survive blur and feedback follows language changes; loading a build clears stale errors', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  const input = page.locator('[data-remaked-number="Lev"]'), status = page.locator('#remaked-number-status');
  await input.fill('56'); await input.press('Enter'); await input.press('Tab');
  await expect(input).toHaveValue('56'); await expect(status).toContainText('maximum 55');
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(status).toContainText('Максимальное значение поля'); await expect(status).toContainText('55');
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.evaluate(code => PandoraRemaked.adapter.load(code), before);
  await expect(input).toHaveValue('1'); await expect(status).toBeEmpty(); await expect(input).not.toHaveAttribute('aria-invalid');
});

test('insufficient points report the named field and exact native allocation, and race minima stay source-owned', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('[data-remaked-number="STA"]'), status = page.locator('#remaked-number-status');
  for (const locale of ['en', 'ru']) {
    await page.locator(`[data-remaked-ui-locale="${locale}"]`).click();
    const before = await page.evaluate(() => Store());
    const expected = await page.evaluate(() => {
      StatusMove('Status', 'STA', 99 - Status.STA[0] - Status.STA[1]); CalcSet('STA');
      return { code: Store(), value: Status.STA[0] + Status.STA[1] };
    });
    await page.evaluate(code => PandoraRemaked.adapter.load(code), before);
    await input.fill('99'); await input.press('Enter');
    const field = await input.evaluate(node => document.getElementById(node.getAttribute('aria-labelledby')).textContent.trim());
    await expect(status).toHaveText(locale === 'ru'
      ? `Для поля «${field}» не хватает очков характеристик. Применено значение: ${expected.value}.`
      : `${field}: not enough attribute points. Applied value: ${expected.value}.`);
    expect(await page.evaluate(() => Store())).toBe(expected.code); await expect(input).toHaveValue(String(expected.value));
    await input.press('Escape'); await expect(status).toBeEmpty();
    await page.evaluate(code => PandoraRemaked.adapter.load(code), before);
  }
  await page.locator('[data-remaked-tab="0"]').click();
  for (let race = 0; race < 6; race++) {
    await page.locator('#SelRace').selectOption({ index: race });
    const minimum = await page.evaluate(() => String(Status.STA[0]));
    await expect(input).toHaveAttribute('min', minimum);
    const before = await page.evaluate(() => Store());
    await page.locator('[data-remaked-tab="0"]').click();
    await input.fill(String(Number(minimum) - 1)); await input.press('Enter');
    await expect(status).toContainText('— ' + minimum + '.');
    expect(await page.evaluate(() => Store())).toBe(before);
    await input.press('Escape');
    await page.locator('[data-remaked-tab="0"]').click();
  }
});

test('seven bounded numeric controls delegate allocation and limits to the retained engine', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-remaked-number]')).toHaveCount(7);
  await expect(page.locator('[data-remaked-step]:visible')).toHaveCount(0);
  await expect(page.locator('[data-remaked-number-total="STA"]')).toBeHidden();
  await expect(page.locator('#StatusSTA_0')).toBeHidden();
  const level = page.locator('[data-remaked-number="Lev"]');
  await expect(level).toHaveAttribute('min', '1'); await expect(level).toHaveAttribute('max', '55');
  await level.fill('55'); await level.press('Enter');
  await expect(page.locator('#StatusLev')).toHaveText('55');
  for (const key of ['STA', 'STR', 'AGI', 'DEX', 'SPR', 'INT']) {
    const before = await page.evaluate(() => Store());
    const expected = await page.evaluate(key => {
      StatusMove('Status', key, 99 - Status[key][0] - Status[key][1]); CalcSet(key); return { code: Store(), value: Status[key][0] + Status[key][1] };
    }, key);
    await page.evaluate(code => PandoraRemaked.adapter.load(code), before);
    const input = page.locator(`[data-remaked-number="${key}"]`);
    await input.fill('99'); await input.press('Enter');
    expect(await page.evaluate(() => Store())).toBe(expected.code);
    await expect(input).toHaveValue(String(expected.value));
    const minimum = await page.evaluate(key => Status[key][0], key);
    await input.fill(String(minimum)); await input.press('Tab');
    expect(await page.evaluate(key => Status[key][1], key)).toBe(0);
  }
  const before = await page.evaluate(() => Store());
  for (const value of ['0', '56', '2.5', '']) {
    await level.fill(value); await level.press('Enter');
    expect(await page.evaluate(() => Store())).toBe(before);
    await expect(level).toHaveAttribute('aria-invalid', 'true');
  }
  await level.press('Escape'); await expect(level).toHaveValue('55');
});

test('Russian base-stat abbreviations fit beside compact number fields without clipping', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  const report = await page.evaluate(() => [10, 11, 12, 13, 14, 15].map(index => {
    const label = document.getElementById('Text_' + index);
    const row = label.closest('[data-remaked-calculator-attribute]');
    const input = row.querySelector('.remaked-calculator-number');
    return {
      text: label.textContent.trim(),
      clientWidth: label.clientWidth,
      scrollWidth: label.scrollWidth,
      inputWidth: input.getBoundingClientRect().width,
      rowRight: row.getBoundingClientRect().right,
      inputRight: input.getBoundingClientRect().right
    };
  }));
  expect(report.map(item => item.text)).toEqual(['ВЫН', 'СИЛ', 'ПРВ', 'ЛВК', 'СД', 'ИНТ']);
  for (const item of report) {
    expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth);
    expect(item.inputWidth).toBeLessThanOrEqual(49);
    expect(item.inputRight).toBeLessThanOrEqual(item.rowRight);
  }
});

test('typing is stable across refresh and reset/load update the input without losing source nodes', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('[data-remaked-number="Lev"]');
  await input.fill('23');
  await page.evaluate(() => { PandoraRemaked.calculatorControls.refresh(); PandoraRemaked.calculatorControls.refresh(); });
  await expect(input).toHaveValue('23'); await expect(page.locator('#StatusLev')).toHaveText('1');
  await input.press('Tab'); await expect(page.locator('#StatusLev')).toHaveText('23');
  const code = await page.evaluate(() => Store());
  await page.locator('[data-remaked-calculator-action="Text_9"]').click();
  await expect(input).toHaveValue('1');
  await page.evaluate(code => PandoraRemaked.adapter.load(code), code);
  await expect(input).toHaveValue('23');
  await page.locator('[data-remaked-language="0"]').click();
  await expect(page.locator('[data-remaked-number="STR"]')).toHaveAccessibleName('筋力');
  await page.goto('/legacy/'); await expect(page.locator('[data-remaked-number]')).toHaveCount(0);
});

test('an explicit build load replaces focused edits synchronously and cannot commit stale values', async ({ page }) => {
  await page.goto('/');
  const original = await page.evaluate(() => Store());
  const strength = page.locator('[data-remaked-number="STR"]');
  await strength.fill('30');
  const restored = await page.evaluate(code => {
    PandoraRemaked.adapter.load(code);
    const input = document.querySelector('[data-remaked-number="STR"]');
    return { value: input.value, native: Status.STR[0] + Status.STR[1], code: Store(), focused: document.activeElement === input };
  }, original);
  expect(restored.focused).toBe(true);
  expect(restored.value).toBe(String(restored.native));
  expect(restored.code).toBe(original);
  await strength.press('Tab');
  expect(await page.evaluate(() => Store())).toBe(original);
});

test('an Equipment dropdown survives mobile keyboard viewport changes and can still equip', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await page.goto('/');
  const knife = await page.evaluate(() => {
    const item = PandoraRemaked.adapter.listEquipmentOptions(0).find(item => item.name === 'Knife');
    if (!item) throw new Error('Native Knife fixture missing'); return String(item.value);
  });
  const opener = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
  await opener.tap();
  const dropdown = page.locator('[data-remaked-equipment-dropdown]');
  await expect(dropdown).toBeVisible();
  // Browser keyboard opening/closing changes height without an outside action.
  await page.setViewportSize({ width: 390, height: 500 });
  await expect(dropdown).toBeVisible();
  await page.locator('[data-remaked-search-query]').fill('Knife');
  await expect(dropdown).toBeVisible();
  await page.locator(`[data-remaked-search-result][data-value="${knife}"]`).tap();
  await expect(dropdown).toHaveCount(0);
  expect(await page.evaluate(() => String(Status.Equip[0][0]))).toBe(knife);
  await page.setViewportSize({ width: 390, height: 844 });
  await opener.tap(); await expect(dropdown).toBeVisible();
  await page.locator('.remaked-search-close').tap(); await expect(dropdown).toHaveCount(0);
  await context.close();
});
