import { test, expect } from '@playwright/test';
import { assertWorkspaceFits } from './helpers/desktop-workspace.mjs';

for (const width of [1440, 1920]) test(`Hybrid workbench has distinct, aligned sections without hiding controls at ${width}px`, async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  const before = await page.evaluate(() => ({ code: Store(), summary: PandoraRemaked.adapter.readCalculatedSummary(), equipment: JSON.stringify(EquipData), souls: JSON.stringify(SoulData), skills: JSON.stringify(Skill) }));
  const titles = page.locator('[data-remaked-workbench-title]');
  await expect(titles).toHaveCount(3);
  const tops = [];
  for (const title of ['Character', 'Skills', 'Effects']) {
    const heading = page.getByRole('heading', { name: title, exact: true }); await expect(heading).toBeVisible();
    tops.push((await heading.boundingBox()).y);
  }
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
  await expect(page.locator('#StatusView').getByRole('heading', { name: 'Calculated stats', exact: true })).toBeVisible();
  await expect(page.locator('#Status').getByRole('heading', { name: 'Base stats', exact: true })).toBeVisible();
  await assertWorkspaceFits(page);
  await page.evaluate(() => { StatusMove('Lev', 54); CalcSet('Lev'); });
  const budgetOverflow = await page.evaluate(() => [...document.querySelectorAll('[data-remaked-calculator-budget] > ul:not([data-remaked-calculator-level]) > li')]
    .filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.textContent));
  expect(budgetOverflow, 'All budget labels and complete level-55 fractions must be readable').toEqual([]);
  await page.evaluate(code => PandoraRemaked.adapter.load(code), before.code);
  const weapon = await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').boundingBox();
  expect(weapon.y + weapon.height).toBeLessThanOrEqual(900);
  const empty = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
  await expect(empty).not.toContainText('-----');
  expect(weapon.height).toBeGreaterThanOrEqual(28); expect(weapon.height).toBeLessThanOrEqual(32);
  const toolbar = await page.locator('[data-remaked-picker-toolbar]').evaluate(node => ({ bounds: node.getBoundingClientRect().toJSON(), display: getComputedStyle(node).display, justify: getComputedStyle(node).justifyContent }));
  const reset = await page.locator('[data-remaked-equipment-reset]').boundingBox();
  const section = await page.locator('[data-remaked-picker-section]').boundingBox();
  expect(section.x + section.width - reset.x - reset.width, JSON.stringify(toolbar)).toBeLessThanOrEqual(8);
  await expect(page.locator('[data-remaked-tools]')).toHaveCount(1);
  await expect(page.locator('[data-remaked-picker-section] [data-remaked-equipment-search]')).toHaveCount(1);
  const heights = await page.evaluate(() => [...document.querySelectorAll('[data-remaked-equipment-search], [data-remaked-soul-search], [data-remaked-equipment-reset], #SelGem select')].map(node => node.getBoundingClientRect().height));
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  // A result is text, not a lookalike input. Keep every original output/ID.
  await expect(page.locator('#StatusView [data-remaked-calculator-pair]').first()).toHaveCSS('border-top-width', '0px');
  const after = await page.evaluate(() => ({ code: Store(), summary: PandoraRemaked.adapter.readCalculatedSummary(), equipment: JSON.stringify(EquipData), souls: JSON.stringify(SoulData), skills: JSON.stringify(Skill) }));
  expect(after).toEqual(before); expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath(`hybrid-${width}.png`), fullPage: true });
});

test('section labels translate, refresh once, and never become source identity rows', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  for (const width of [320, 390, 768, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => [...document.querySelectorAll('.remaked-workbench-title')].filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.textContent));
    expect(overflow).toEqual([]);
  }
  await expect(page.getByRole('heading', { name: 'Персонаж', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Умения', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Результаты расчёта', exact: true })).toBeVisible();
  for (let n = 0; n < 3; n++) await page.evaluate(() => { PandoraRemaked.calculatorControls.refresh(); PandoraRemaked.skillControls.refresh(); });
  await expect(page.locator('[data-remaked-workbench-title]')).toHaveCount(3);
  await expect(page.locator('[data-remaked-calculator-identity]')).toHaveCount(1);
  await expect(page.locator('[data-remaked-calculator-identity] #Text_0')).toHaveCount(1);
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.locator('[data-remaked-ui-locale="en"]').click();
  await expect(page.getByRole('heading', { name: 'Character', exact: true })).toBeVisible();
});

test('compact composition retains phone-size input and equipment targets across viewport changes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/?ui=ru');
  const before = await page.evaluate(() => Store());
  for (const width of [320, 390, 768, 1024, 1440, 1920, 390]) {
    await page.setViewportSize({ width, height: 844 }); await assertWorkspaceFits(page);
    const target = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
    const box = await target.boundingBox(); expect(box.height).toBeGreaterThanOrEqual(width <= 700 ? 44 : width >= 861 ? 28 : 36);
  }
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.screenshot({ path: testInfo.outputPath('hybrid-mobile.png'), fullPage: true });
  await page.goto('/legacy/');
  await expect(page.locator('[data-remaked-workbench-title]')).toHaveCount(0);
});

test('discovery returns above the calculator on phones without cloning controls or losing their actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  const before = await page.evaluate(() => {
    window.discoveryNodes = [...document.querySelectorAll('[data-remaked-tools] button')]; return Store();
  });
  for (const width of [390, 1440, 320, 1920, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => !!document.querySelector('[data-remaked-tools]').closest('[data-remaked-picker-section]'))).toBe(width >= 861);
    await expect(page.locator('[data-remaked-tools]')).toHaveCount(1);
    expect(await page.evaluate(() => discoveryNodes.every((node, index) => node === document.querySelectorAll('[data-remaked-tools] button')[index]))).toBe(true);
    if (width < 861) {
      const tools = await page.locator('[data-remaked-tools]').boundingBox();
      const character = await page.locator('[data-remaked-calculator-character]').boundingBox();
      expect(tools.y + tools.height).toBeLessThanOrEqual(character.y);
      await expect(page.locator('#Title')).toBeHidden();
    }
  }
  await page.locator('[data-remaked-equipment-search]').click();
  await expect(page.locator('[data-remaked-search-panel]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-remaked-equipment-search]')).toBeFocused();
  expect(await page.evaluate(() => Store())).toBe(before);
});
