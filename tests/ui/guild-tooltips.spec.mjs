import { test, expect } from '@playwright/test';

async function guildPanel(page) {
  await page.locator('[data-remaked-tab="4"]').click();
  await expect(page.locator('#BUFFView [data-remaked-guild-trigger]')).toHaveCount(11);
}
async function previewLevel(page, index, level) {
  await page.locator('[data-remaked-guild-trigger="' + index + '"]').click();
  const item = page.locator('[data-remaked-guild-option="' + level + '"]');
  await item.hover();
  return { item, preview: page.locator('.remaked-guild-preview') };
}

test('all 44 approved guild descriptions are reachable without changing the calculator', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?ui=ru');
  await guildPanel(page);
  const before = await page.evaluate(() => window.Store());
  const sizes = await page.evaluate(() => window.PandoraRemakedGuildSkills.skills.map(s => s.levels.length));
  expect(sizes).toEqual([12, 5, 5, 2, 2, 2, 2, 5, 3, 3, 3]);
  for (const [index, count] of sizes.entries()) {
    const { preview } = await previewLevel(page, index, count);
    const expected = await page.evaluate(([i, level]) =>
      window.PandoraRemakedGuildSkills.skills[i].levels[level - 1].ru, [index, count]);
    await expect(preview).toHaveText(expected);
    expect(await page.locator('#SelBuffClan_' + index).inputValue()).toBe('0');
    await page.keyboard.press('Escape');
  }
  expect(await page.evaluate(() => window.Store())).toBe(before);
});

test('choosing guild level uses the existing preset callbacks and keeps native source values', async ({ page }) => {
  await page.goto('/?ui=ru');
  await guildPanel(page);
  const { item, preview } = await previewLevel(page, 0, 12);
  await expect(preview).toContainText('Сила гильдии ур. 5: максимальные ОЗ +12%.');
  await item.click();
  await expect(page.locator('#SelBuffClan_0')).toHaveValue('12');
  await expect(page.locator('#SelBuffClan_1')).toHaveValue('5');
  await expect(page.locator('#SelBuffClan_2')).toHaveValue('5');
  await expect(page.locator('#SelBuffClan_7')).toHaveValue('5');
  const options = page.locator('#SelBuffClan_0 option');
  await expect(options).toHaveCount(13);
  await page.locator('[data-remaked-guild-trigger="0"]').click();
  await page.locator('[data-remaked-guild-option="0"]').click();
  await expect(page.locator('#SelBuffClan_0')).toHaveValue('0');
  await expect(page.locator('#SelBuffClan_1')).toHaveValue('0');
});

test('approved English text, D1 localization precedence and keyboard selection are preserved', async ({ page }) => {
  await page.goto('/?ui=en');
  await guildPanel(page);
  let { preview } = await previewLevel(page, 10, 3);
  await expect(preview).toContainText('Increases physical and magical attack by 6%');
  await page.keyboard.press('Escape');
  const published = { ok: true, schemaVersion: 1, overrides: {
    ui: { ru: {}, en: {}, jp: {}, tw: {} },
    game: { ru: { 'calculator.clan.10.level.3.hint': 'Редактор D1: временное подтверждение эффекта.' },
      en: {}, jp: {}, tw: {} }
  } };
  expect(await page.evaluate(x => window.PandoraRemaked.i18n.applyUnifiedLocalization(x), published)).toBe(true);
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await page.locator('[data-remaked-guild-trigger="10"]').focus();
  await page.keyboard.press('Enter');
  const option = page.locator('[data-remaked-guild-option="3"]');
  await option.focus();
  await expect(page.locator('.remaked-guild-preview')).toHaveText('Редактор D1: временное подтверждение эффекта.');
  await option.press('Enter');
  await expect(page.locator('#SelBuffClan_10')).toHaveValue('3');
});

test('guild option preview stays within the mobile viewport and closes on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/?ui=ru');
  await guildPanel(page);
  const { preview } = await previewLevel(page, 8, 2);
  await expect(preview).toContainText('1 жёлтый кристалл');
  await expect(preview).toContainText('600 секунд');
  const bounds = await page.locator('.remaked-guild-popup').boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(780);
  await page.keyboard.press('Escape');
  await expect(page.locator('.remaked-guild-popup')).toHaveCount(0);
});
