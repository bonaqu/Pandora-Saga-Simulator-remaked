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

test('numeric level and attribute controls execute retained callbacks exactly once', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const original = StatusMove; window.inputCalls = [];
    window.StatusMove = function (...args) { inputCalls.push(args); return original.apply(this, args); };
  });
  const level = page.locator('[data-remaked-number="Lev"]');
  await level.fill('55'); await level.press('Enter');
  await expect(page.locator('#StatusLev')).toHaveText('55');
  expect(await page.evaluate(() => inputCalls)).toEqual([['Lev', 54]]);
  for (const key of ['STA', 'STR', 'AGI', 'DEX', 'SPR', 'INT']) {
    const input = page.locator(`[data-remaked-number="${key}"]`), value = Number(await input.inputValue());
    await page.evaluate(() => { inputCalls.length = 0; });
    await input.fill(String(value + 1)); await input.press('Enter'); await input.press('Tab');
    expect(await page.evaluate(() => inputCalls)).toEqual([['Status', key, 1]]);
  }
});

test('attribute and level edits clamp to current race-dependent bounds on commit', async ({ page }) => {
  await page.goto('/?ui=ru');
  const stamina = page.locator('[data-remaked-number="STA"]');
  const minimum = Number(await stamina.getAttribute('min'));
  expect(minimum).toBeGreaterThan(1);
  await stamina.fill('1');
  await stamina.press('Enter');
  await expect(stamina).toHaveValue(String(minimum));
  await expect(stamina).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#remaked-number-status')).toBeEmpty();
  const level = page.locator('[data-remaked-number="Lev"]');
  const max = Number(await level.getAttribute('max'));
  await level.fill(String(max + 50));
  await level.press('Enter');
  await expect(level).toHaveValue(String(max));
  await expect(level).not.toHaveAttribute('aria-invalid', 'true');
  await level.fill('-10');
  await level.press('Enter');
  await expect(level).toHaveValue('1');
  await expect(level).not.toHaveAttribute('aria-invalid', 'true');
  const intelligence = page.locator('[data-remaked-number="INT"]');
  await intelligence.fill('105');
  await intelligence.press('Enter');
  const actual = Number(await intelligence.inputValue());
  expect(actual).toBeGreaterThanOrEqual(Number(await intelligence.getAttribute('min')));
  expect(actual).toBeLessThanOrEqual(Number(await intelligence.getAttribute('max')));
  await expect(intelligence).not.toHaveAttribute('aria-invalid', 'true');
});

for (const width of [320, 390, 768, 1440]) test(`primary calculator sections and native targets fit at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  for (const selector of ['[data-remaked-calculator-character]', '#StatusView', '#SkillSet', '[data-remaked-calculator-effects]']) {
    const box = await page.locator(selector).boundingBox();
    expect(box.x, selector).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, selector).toBeLessThanOrEqual(width);
  }
  await expect(page.locator('[data-remaked-number]:visible')).toHaveCount(7);
  const targets = await page.evaluate(() => [...document.querySelectorAll('[data-remaked-number]')].map(node => {
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
  await expect(page.locator('[data-remaked-number]')).toHaveCount(7);
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.locator('[data-remaked-language="0"]').click();
  await expect(page.locator('[data-remaked-number="STR"]')).toHaveAccessibleName('筋力');
  await page.locator('[data-remaked-language="1"]').click();
  await expect(page.locator('[data-remaked-number="STR"]')).toHaveAccessibleName('STR');
  await page.locator('[data-remaked-number="Lev"]').fill('55');
  await page.locator('[data-remaked-number="Lev"]').press('Enter');
  const strength = page.locator('[data-remaked-number="STR"]');
  await strength.fill(String(Number(await strength.inputValue()) + 1)); await strength.press('Enter');
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
  await page.route('**/modern/calculator-controls.js**', route => route.abort());
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


test('Modern hides the unreachable character Potential budget but keeps skill Potential', async ({ page }) => {
  await page.goto('/');
  const hidden = await page.locator('#StatusUnP_0').evaluate(node => node.closest('.input_gt').parentElement.hidden);
  expect(hidden).toBe(true);
  await expect(page.locator('[data-remaked-skill-column-header]')).toContainText('Potential');
  expect(await page.locator('[data-remaked-skill-potential-value]').count()).toBeGreaterThan(0);
  await page.goto('/legacy/');
  expect(await page.locator('#StatusUnP_0').evaluate(node => node.closest('.input_gt').parentElement.hidden)).toBe(false);
});
