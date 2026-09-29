import { test, expect } from '@playwright/test';

for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  test(`long approved game terms stay usable on ${name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.evaluate(() => Object.assign(PandoraRemakedGameTerms.ru, {
      'race.0': 'Проверочное очень длинное название расы персонажа',
      'job.0': 'Проверочный класс с длинным официальным названием',
      'racial_skill.0.0': 'Проверочный расовый навык с длинным названием',
      'skill.1': 'Проверочный рубящий навык',
      'calculator.tab.0': 'Профессия', 'calculator.text.0': 'Раса персонажа'
    }));
    await page.locator('[data-remaked-ui-locale="ru"]').click();
    await expect(page.locator('#StatusRace')).toHaveText('Проверочное очень длинное название расы персонажа');
    await expect(page.locator('#StatusRace')).toHaveAttribute('title', 'Проверочное очень длинное название расы персонажа');
    await expect(page.locator('[data-remaked-summary-race]')).toHaveText('Проверочное очень длинное название расы персонажа');
    await expect(page.locator('[data-remaked-tab="0"]')).toHaveText('Профессия');
    await page.locator('[data-remaked-tab="0"]').click();
    await expect(page.locator('#SelRace')).toBeVisible();
    await page.locator('#SelRace').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#SelRace')).toHaveValue('1');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#SelRace')).toHaveValue('0');
    await expect(page.locator('#StatusRace')).toHaveText('Проверочное очень длинное название расы персонажа');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`modern-ru-terms-${name}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}
