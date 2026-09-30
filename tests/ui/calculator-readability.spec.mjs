import { test, expect } from '@playwright/test';

test('native option text retains measured contrast in both toggle states', async ({ page }) => {
  await page.goto('/');
  const action = page.locator('[data-remaked-calculator-action="Text_3"]');
  for (const state of ['false', 'true']) {
    await expect(action).toHaveAttribute('aria-pressed', state);
    const ratio = await action.evaluate(node => {
      const css = getComputedStyle(node);
      function luminance(rgb) {
        const channels = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
          const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
        });
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      }
      const fg = luminance(css.color), bg = luminance(css.backgroundColor);
      return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    await action.click();
  }
});

test('Modern calculator descendants use the UI font, without changing museum typography', async ({ page }) => {
  await page.goto('/');
  const font = await page.locator('#StatusSTR_0').evaluate(node => getComputedStyle(node).fontFamily);
  expect(font).toContain('Segoe UI');
  expect(font).not.toContain('ＭＳ');
  await page.goto('/legacy/');
  expect(await page.locator('#StatusSTR_0').evaluate(node => getComputedStyle(node).fontFamily)).toContain('ＭＳ');
  await expect(page.locator('[data-remaked-step]')).toHaveCount(0);
});

test('native level and attribute buttons execute retained callbacks exactly once, including boundaries', async ({ page }) => {
  await page.goto('/');
  const inputs = await page.evaluate(() => [...document.querySelectorAll('[data-remaked-step]')].map(button => button.dataset.remakedStep));
  expect(inputs.length).toBe(42);
  for (const id of inputs) {
    const initial = await page.evaluate(() => Store());
    const expected = await page.evaluate(({ id, initial }) => {
      document.getElementById(id).click();
      const result = Store(); PandoraRemaked.adapter.load(initial); return result;
    }, { id, initial });
    const button = page.locator(`[data-remaked-step="${id}"]`);
    await button.focus();
    await page.keyboard.press('Space');
    expect(await page.evaluate(() => Store()), id).toBe(expected);
    await page.evaluate(code => PandoraRemaked.adapter.load(code), initial);
  }
  await page.locator('[data-remaked-step="remaked-level-up3"]').click();
  await expect(page.locator('#StatusLev')).toHaveText('55');
  // Exercise available attribute budget too, not just a level-one no-op.
  const initial = await page.evaluate(() => Store());
  const expected = await page.evaluate(() => { document.getElementById('remaked-attribute-STR-up3').click(); return Store(); });
  await page.evaluate(code => PandoraRemaked.adapter.load(code), initial);
  await page.locator('[data-remaked-step="remaked-attribute-STR-up3"]').click();
  expect(await page.evaluate(() => Store())).toBe(expected);
});

for (const width of [320, 390, 768, 1440]) test(`primary calculator sections and native targets fit at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  for (const selector of ['[data-remaked-calculator-character]', '#StatusView', '#SkillSet', '[data-remaked-calculator-effects]']) {
    const box = await page.locator(selector).boundingBox();
    expect(box.x, selector).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, selector).toBeLessThanOrEqual(width);
  }
  const targets = await page.evaluate(() => [...document.querySelectorAll('[data-remaked-step]')].map(node => {
    const box = node.getBoundingClientRect(); return { x: box.x, right: box.right, width: box.width, height: box.height };
  }));
  for (const target of targets) {
    expect(target.height).toBeGreaterThanOrEqual(width <= 620 ? 44 : 28);
    expect(target.width).toBeGreaterThanOrEqual(width <= 620 ? 44 : 28);
    expect(target.x).toBeGreaterThanOrEqual(0);
    expect(target.right).toBeLessThanOrEqual(width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-remaked-builds-open]').click();
  const code = await page.locator('#InCode').boundingBox();
  expect(code.width).toBeGreaterThan(160);
  expect(code.x + code.width).toBeLessThanOrEqual(width);
  const labelColor = await page.locator('#TextStatus_0').evaluate(node => getComputedStyle(node).color);
  expect(labelColor).toBe('rgb(41, 53, 35)');
});

test('locale refresh, reset/load and repeat enhancement preserve source nodes and named controls', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.evaluate(() => { PandoraRemaked.calculatorControls.refresh(); PandoraRemaked.calculatorControls.refresh(); });
  await expect(page.locator('[data-remaked-step]')).toHaveCount(42);
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.locator('[data-remaked-language="0"]').click();
  await expect(page.locator('[data-remaked-step="remaked-attribute-STR-up1"]')).toHaveAccessibleName('筋力 +1');
  await page.locator('[data-remaked-language="1"]').click();
  await expect(page.locator('[data-remaked-step="remaked-attribute-STR-up1"]')).toHaveAccessibleName('STR +1');
  await page.locator('[data-remaked-step="remaked-level-up3"]').click();
  await page.locator('[data-remaked-step="remaked-attribute-STR-up1"]').click();
  const after = await page.evaluate(() => Store());
  await page.locator('[data-remaked-calculator-action="Text_7"]').click();
  await page.evaluate(code => PandoraRemaked.adapter.load(code), after);
  expect(await page.evaluate(() => Store())).toBe(after);
  await expect(page.locator('#StatusLev')).toHaveText('55');
  await expect(page.locator('[data-remaked-calculator-action="Text_3"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-remaked-calculator-action="Text_3"]').click();
  await expect(page.locator('[data-remaked-calculator-action="Text_3"]')).toHaveAttribute('aria-pressed', 'true');
});

test('unavailable enhancement leaves original calculator input callbacks working', async ({ page }) => {
  await page.route('**/modern/calculator-controls.js', route => route.abort());
  await page.goto('/');
  await expect(page.locator('[data-remaked-step]')).toHaveCount(0);
  const up = page.locator('#Status input[alt="+1"]').nth(1);
  await expect(up).toBeVisible();
  const initial = await page.evaluate(() => Store());
  await page.evaluate(() => { StatusMove('Lev', 54); CalcSet('Lev'); });
  await up.click();
  expect(await page.evaluate(() => Store())).not.toBe(initial);
});

test('long approved identity and stat labels wrap inside their pair without changing values', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.evaluate(() => Object.assign(PandoraRemakedGameTerms.ru, {
    'race.0': 'Проверочное очень длинное название расы персонажа',
    'calculator.text.0': 'Раса персонажа',
    'calculator.status.0': 'Проверочное длинное имя характеристики'
  }));
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  for (const id of ['StatusRace', 'Text_0', 'TextStatus_0']) {
    const geometry = await page.locator('#' + id).evaluate(node => {
      const box = node.getBoundingClientRect(), pair = node.closest('[data-remaked-calculator-pair]').getBoundingClientRect();
      return { right: box.right, pairRight: pair.right, scroll: node.scrollWidth, width: node.clientWidth };
    });
    expect(geometry.right).toBeLessThanOrEqual(geometry.pairRight);
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
  }
  expect(await page.evaluate(() => Store())).toBe(before);
});
