import { test, expect } from '@playwright/test';
import { assertWorkspaceFits } from './helpers/desktop-workspace.mjs';

for (const width of [1440, 1920]) test(`complete desktop workspace brings Equipment into the first screen at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  const before = await page.evaluate(() => ({ build: PandoraRemaked.adapter.serialize(), equipment: JSON.stringify(EquipData), souls: JSON.stringify(SoulData), skills: JSON.stringify(Skill) }));
  const character = await page.locator('[data-remaked-calculator-character]').boundingBox();
  const skill = await page.locator('#SkillSet').boundingBox();
  const equipment = await page.locator('[data-remaked-picker-section]').boundingBox();
  expect(character.height).toBeLessThanOrEqual(600);
  expect(skill.height).toBeLessThanOrEqual(550);
  expect(equipment.y).toBeLessThanOrEqual(900);
  const weapon = await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').boundingBox();
  const optionGeometry = await page.evaluate(() => ['Text_3', 'Text_5', 'Text_6', 'Text_7', 'Text_8', 'Text_9'].map(id => {
    const node = document.querySelector(`[data-remaked-calculator-action="${id}"]`);
    const rect = node.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(node);
    return { id, label: node.textContent, width: rect.width, height: rect.height, lines: range.getClientRects().length, font: getComputedStyle(node).font };
  }));
  const fieldGeometry = await page.evaluate(() => {
    function inspect(node) {
      const rect = node.getBoundingClientRect(), css = getComputedStyle(node);
      return { id: node.id || node.dataset.remakedCalculatorPair || node.tagName, text: node.textContent.trim().replace(/\s+/g, ' '), y: rect.y, height: rect.height, width: rect.width, font: css.font, rows: css.gridTemplateRows };
    }
    return {
      sections: [...document.querySelectorAll('[data-remaked-calculator-identity], [data-remaked-calculator-settings], [data-remaked-calculator-budget], [data-remaked-calculator-actions], [data-remaked-calculator-attributes], #StatusView, [data-remaked-calculator-horse]')].map(inspect),
      resultRows: [...document.querySelectorAll('#StatusView [data-remaked-calculator-pair]')].map(inspect).sort((a, b) => b.height - a.height).slice(0, 8),
      attributes: [...document.querySelectorAll('[data-remaked-calculator-attribute]')].map(inspect)
    };
  });
  await page.screenshot({ path: testInfo.outputPath('desktop-workspace.png') });
  expect(weapon.y + weapon.height, JSON.stringify({ character, skill, weapon, optionGeometry, fieldGeometry })).toBeLessThanOrEqual(900);
  const budget = await page.locator('[data-remaked-calculator-budget]').boundingBox();
  const attributes = await page.locator('[data-remaked-calculator-attributes]').boundingBox();
  expect(budget.width).toBe(attributes.width);
  expect(budget.x).toBe(attributes.x);
  for (const action of ['Text_3', 'Text_5', 'Text_6', 'Text_7', 'Text_8', 'Text_9']) {
    const lines = await page.locator(`[data-remaked-calculator-action="${action}"]`).evaluate(node => {
      const range = document.createRange(); range.selectNodeContents(node); return range.getClientRects().length;
    });
    expect(lines, action + ' should fit without an accidental extra row').toBe(1);
  }
  await expect(page.locator('[data-remaked-number]:visible')).toHaveCount(7);
  await expect(page.locator('[data-remaked-skill-step]:visible')).toHaveCount(80);
  const first = await page.locator('[data-remaked-skill-row="0"]').boundingBox();
  const second = await page.locator('[data-remaked-skill-row="6"]').boundingBox();
  expect(second.x).toBeGreaterThan(first.x + first.width);
  expect(second.y).toBe(first.y);
  for (const selector of ['[data-remaked-calculator-results]', '[data-remaked-calculator-effects]']) {
    const geometry = await page.locator(selector).evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
  }
  expect(await page.evaluate(() => ({ build: PandoraRemaked.adapter.serialize(), equipment: JSON.stringify(EquipData), souls: JSON.stringify(SoulData), skills: JSON.stringify(Skill) }))).toEqual(before);
  await page.screenshot({ path: testInfo.outputPath('desktop-workspace.png') });
});

test('all four languages and font fallbacks keep the complete desktop controls inside their columns', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  for (const [label, language] of [['EN', 1], ['RU', 1], ['JP', 0], ['TW', 2]]) {
    await page.locator('[data-remaked-language-panel]').getByRole('button', { name: label, exact: true }).click();
    expect(await page.evaluate(() => Flag[0])).toBe(language);
    expect(await page.evaluate(() => PandoraRemaked.i18n.getLocale())).toBe(label === 'RU' ? 'ru' : 'en');
    for (const font of ['Arial, sans-serif', 'Verdana, sans-serif', 'Consolas, monospace']) {
      await page.addStyleTag({ content: `.remaked-modern { --rm-font: ${font}; }` });
      for (const width of [1366, 1440, 1920, 2560]) {
        await page.setViewportSize({ width, height: 900 });
        await assertWorkspaceFits(page);
      }
    }
  }
  await page.locator('[data-remaked-ui-locale="en"]').click();
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before);
});

test('common English skill names stay whole in the compact PC columns with a larger font fallback', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  await page.addStyleTag({ content: '#body #SkillSet[data-remaked-skill-controls] [id^="TextSkill_"], #body #SkillSet[data-remaked-skill-controls] [id^="TextSkill_"] * { font: 600 14px/1.4 Arial, sans-serif !important; }' });
  for (const id of ['TextSkill_9', 'TextSkill_13', 'TextSkill_24']) {
    const metrics = await page.locator('#' + id).evaluate(node => {
      // A Range containing an inline help span returns both its box and its
      // text box. Count distinct rendered TEXT lines, not nested element boxes.
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), tops = [];
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        const range = document.createRange(); range.selectNodeContents(text);
        for (const rect of range.getClientRects()) if (!tops.some(top => Math.abs(top - rect.top) < 1)) tops.push(rect.top);
      }
      return { text: node.textContent, width: node.getBoundingClientRect().width, font: getComputedStyle(node).font, size: getComputedStyle(node).fontSize, lines: tops.length };
    });
    expect(metrics.lines, id + ' ' + JSON.stringify(metrics)).toBe(1);
    expect(metrics.size).toBe('14px'); expect(metrics.font).toContain('Arial');
  }
  await assertWorkspaceFits(page);
});

test('long approved translations and larger steps grow naturally across the desktop boundary and zoom-equivalent widths', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.goto('/');
  const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  await page.evaluate(() => {
    Object.assign(PandoraRemakedGameTerms.ru, {
      'race.0': 'Проверочное очень длинное название расы персонажа',
      'calculator.text.16': 'Верховая езда персонажа',
      'calculator.status.0': 'Проверочное длинное имя характеристики',
      'skill.1': 'Проверочное очень длинное название ветки умений',
      'skill.7': 'Проверочная очень длинная ветка стрелкового оружия',
      'calculator.qualified_buff.5': 'Проверочные чары магической атаки персонажа'
    });
    PandoraRemaked.i18n.setLocale('ru');
  });
  await expect(page.locator('#TextSkill_1')).toHaveText('Проверочное очень длинное название ветки умений');
  await page.locator('[data-remaked-skill-bulk]').click();
  for (const width of [320, 390, 720, 768, 861, 1024, 1099, 1280, 1365, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await assertWorkspaceFits(page, { expanded: true });
  }
  await page.locator('[data-remaked-skill-bulk]').click();
  await page.setViewportSize({ width: 1366, height: 900 });
  await assertWorkspaceFits(page);
  await page.screenshot({ path: testInfo.outputPath('desktop-long-labels.png'), fullPage: true });
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before);
});

test('random Legacy flavor does not replace or displace any Modern simulation fields; museum retains it', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await expect(page.locator('#Msg')).toBeHidden();
  const pairs = page.locator('#StatusView [data-remaked-calculator-pair]');
  expect(await pairs.filter({ visible: true }).count()).toBe(await pairs.count());
  await expect(page.locator('#SkillView')).toBeVisible();
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.goto('/legacy/');
  await expect(page.locator('#Msg')).toBeVisible();
  expect(await page.evaluate(() => typeof Message)).toBe('function');
});
