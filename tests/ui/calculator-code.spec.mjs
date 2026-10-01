import { test, expect } from '@playwright/test';

const sourceLoad = 'li[onclick="File(\'CodeLoad\');"]';
const codeAction = id => `[data-remaked-code-action="${id}"]`;
const openCode = page => page.locator('[data-remaked-builds-open]').click();

test('code creation/clearing call retained handlers once and failed creation keeps prior input', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await openCode(page);
  await page.evaluate(() => {
    window.__codeCalls = 0;
    window.__sourceDeflate = RawDeflate.deflate;
    for (const action of ['create', 'delete']) {
      const source = document.querySelector(`[data-remaked-code-action="${action}"]`).parentElement;
      const retained = source.onclick;
      source.onclick = function (event) { window.__codeCalls++; return retained.call(this, event); };
    }
  });
  await page.locator(codeAction('create')).click(); await page.locator(codeAction('delete')).click();
  expect(await page.evaluate(() => window.__codeCalls)).toBe(2);
  await page.locator('#InCode').fill('prior input');
  await page.evaluate(() => { RawDeflate.deflate = function () { throw new Error('codec unavailable'); }; });
  await page.locator(codeAction('create')).click();
  await expect(page.locator('#InCode')).toHaveValue('prior input');
  await expect(page.locator('[data-remaked-code-status]')).toContainText('could not be exported');
  expect(await page.evaluate(() => window.__codeCalls)).toBe(3);
  await page.evaluate(() => {
    RawDeflate.deflate = window.__sourceDeflate;
    PandoraRemaked.adapter.serialize = function () { throw new Error('context export unavailable'); };
  });
  await page.locator(codeAction('create')).click();
  await expect(page.locator('#InCode')).toHaveValue('prior input');
  await expect(page.locator('[data-remaked-code-status]')).toContainText('could not be exported');
  expect(await page.evaluate(() => window.__codeCalls)).toBe(4);
  expect(errors).toEqual([]);
});

test('invalid calculator Code Load preserves state and every stored record', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await openCode(page);
  const before = await page.evaluate(() => {
    PandoraRemaked.builds.flushAutosave();
    return { payload: Store(), storage: JSON.stringify(localStorage) };
  });
  await page.locator('#InCode').fill('1,2,3');
  await page.locator(sourceLoad).click();
  expect(await page.evaluate(() => Store())).toBe(before.payload);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before.storage);
  await expect(page.locator('#InCode')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#InCode')).toBeFocused();
  await expect(page.locator('[data-remaked-code-status]')).toContainText('Invalid build code');
  expect(errors).toEqual([]);
});

test('native riding delegates once and preserves source calculations in both states', async ({ page }) => {
  await page.goto('/');
  const button = page.locator('[data-remaked-calculator-action="Text_16"]');
  await expect(button).toHaveAccessibleName('Horsemanship');
  await page.evaluate(() => {
    window.__horseCalls = 0; const original = CalcSet;
    window.CalcSet = function (...args) { if (args[0] === 'Horse') window.__horseCalls++; return original.apply(this, args); };
  });
  for (const state of ['true', 'false']) {
    const expected = await page.evaluate(() => {
      document.getElementById('SwitchUse_4').click();
      const summary = PandoraRemaked.adapter.readCalculatedSummary();
      document.getElementById('SwitchUse_4').click(); window.__horseCalls = 0; return summary;
    });
    await button.focus(); await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', state);
    expect(await page.evaluate(() => window.__horseCalls)).toBe(1);
    expect(await page.evaluate(() => PandoraRemaked.adapter.readCalculatedSummary())).toEqual(expected);
  }
});

test('calculator native code actions round-trip compressed and CSV without touching File storage', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await openCode(page);
  const saved = await page.evaluate(() => {
    StatusMove('Lev', 54); CalcSet('Lev'); StatusMove('STR', 1); CalcSet('STR');
    localStorage.file = 'legacy-sentinel';
    return { payload: Store(), code: Base64.toBase64(RawDeflate.deflate(Base64.utob(Store()))) };
  });
  await page.locator(codeAction('create')).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#InCode')).toHaveValue(saved.code);
  for (const code of [saved.code, saved.payload]) {
    await page.evaluate(() => document.getElementById('Text_9').parentElement.click());
    expect(await page.evaluate(() => Store())).not.toBe(saved.payload);
    await page.locator('#InCode').fill('  ' + code + '  ');
    await page.locator(codeAction('load')).focus(); await page.keyboard.press('Enter');
    expect(await page.evaluate(() => Store())).toBe(saved.payload);
    await expect(page.locator('[data-remaked-code-status]')).toContainText('Build code imported');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pandora-remaked.autosave.v1')).payload)).toBe(saved.payload);
    expect(await page.evaluate(() => localStorage.file)).toBe('legacy-sentinel');
  }
  await page.locator(codeAction('delete')).focus(); await page.keyboard.press('Space');
  await expect(page.locator('#InCode')).toHaveValue('');
  expect(await page.evaluate(() => Store())).toBe(saved.payload);
  expect(errors).toEqual([]);
});

test('malformed compressed and invalid full CSV imports preserve a non-default character', async ({ page }) => {
  await page.goto('/');
  await openCode(page);
  const before = await page.evaluate(() => {
    StatusMove('Lev', 54); CalcSet('Lev'); StatusMove('STR', 1); CalcSet('STR');
    PandoraRemaked.builds.flushAutosave();
    return { payload: Store(), storage: JSON.stringify(localStorage) };
  });
  const invalid = await page.evaluate(payload => {
    const parts = payload.split(','); parts[0] = '9999';
    return ['not-a-code', Base64.toBase64(RawDeflate.deflate(Base64.utob('1,2,3'))), parts.join(',')];
  }, before.payload);
  for (const value of ['', ...invalid]) {
    await page.locator('#InCode').fill(value);
    await page.locator(codeAction('load')).click();
    await expect(page.locator('#InCode')).toHaveAttribute('aria-invalid', 'true');
    expect(await page.evaluate(() => Store())).toBe(before.payload);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before.storage);
  }
});

for (const width of [320, 390, 768, 1440]) test(`riding and calculator code targets fit at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  const riding = await page.locator('[data-remaked-calculator-horse]').evaluate(node => {
    const value = node.querySelector('#Status_81');
    const unit = document.createRange(); unit.selectNode(value.parentElement.parentElement.lastChild);
    return { height: node.getBoundingClientRect().height, difference: Math.abs(unit.getBoundingClientRect().top - value.getBoundingClientRect().top),
      buttonWidth: node.querySelector('button').getBoundingClientRect().width, width: node.getBoundingClientRect().width };
  });
  expect(riding.height).toBeLessThan(100);
  expect(riding.difference).toBeLessThan(1);
  expect(riding.buttonWidth).toBeGreaterThanOrEqual(riding.width - 4);
  const horse = await page.locator('[data-remaked-calculator-action="Text_16"]').boundingBox();
  expect(horse.height).toBeGreaterThanOrEqual(width <= 620 ? 44 : 28);
  expect(horse.x).toBeGreaterThanOrEqual(0); expect(horse.x + horse.width).toBeLessThanOrEqual(width);
  await openCode(page);
  for (const selector of ['#InCode', codeAction('create'), codeAction('load'), codeAction('delete')]) {
    const box = await page.locator(selector).boundingBox();
    expect(box.x, selector).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, selector).toBeLessThanOrEqual(width);
    expect(box.height, selector).toBeGreaterThanOrEqual(width <= 620 ? 44 : 28);
    expect(box.width, selector).toBeGreaterThanOrEqual(width <= 620 ? 44 : 28);
  }
  await page.locator('#InCode').fill('invalid'); await page.locator(codeAction('load')).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('approved labels, repeated refresh and missing safe-import module keep controls predictable', async ({ page, browser }) => {
  await page.goto('/');
  await page.evaluate(() => {
    Object.assign(PandoraRemakedGameTerms.ru, { 'calculator.text.16': 'Верховая езда', 'calculator.literal.create': 'Создать код' });
    PandoraRemaked.calculatorControls.refresh(); PandoraRemaked.calculatorControls.refresh();
  });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.locator('[data-remaked-calculator-action="Text_16"]')).toHaveText('Верховая езда');
  await openCode(page);
  await expect(page.locator(codeAction('create'))).toHaveText('Создать код');
  await expect(page.locator('[data-remaked-code-action]')).toHaveCount(3);
  const payload = await page.evaluate(() => Store());
  const missingContext = await browser.newContext();
  try {
    const missing = await missingContext.newPage();
    await missing.route('**/modern/builds.js', route => route.abort()); await missing.goto('/');
    await missing.locator('#InCode').fill(payload); await missing.locator(codeAction('load')).click();
    expect(await missing.evaluate(() => Store())).toBe(payload);
    await expect(missing.locator('[data-remaked-code-status]')).toContainText(/unavailable|недоступ/i);
  } finally { await missingContext.close(); }
  await page.goto('/legacy/');
  await expect(page.locator('[data-remaked-code-action]')).toHaveCount(0);
  await expect(page.locator('[data-remaked-calculator-action="Text_16"]')).toHaveCount(0);
});

test('valid code with unavailable autosave preserves old storage and reports a warning', async ({ page }) => {
  await page.goto('/');
  await openCode(page);
  const before = await page.evaluate(() => {
    PandoraRemaked.builds.flushAutosave();
    const payload = Store(); StatusMove('Lev', 54); CalcSet('Lev');
    const candidate = Store(); PandoraRemaked.adapter.load(payload);
    window.__importCandidate = candidate;
    Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); };
    return { candidate, storage: JSON.stringify(localStorage) };
  });
  await page.locator('#InCode').fill(before.candidate); await page.locator('#InCode').press('Enter');
  expect(await page.evaluate(() => Store())).toBe(before.candidate);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before.storage);
  await expect(page.locator('[data-remaked-code-status]')).toContainText('autosave is unavailable');
  await expect(page.locator('[data-remaked-code-status]')).toHaveAttribute('data-state', 'warning');
});

test('clearing an error stays cleared across locales and skill min/max labels use the existing translation keys', async ({ page }) => {
  await page.goto('/');
  await openCode(page);
  await page.locator('#InCode').fill('invalid'); await page.locator(codeAction('load')).click();
  await page.locator('#InCode').fill('new input');
  await page.keyboard.press('Escape');
  await page.evaluate(() => Object.assign(PandoraRemakedGameTerms.ru, { 'calculator.literal.max': 'Максимум', 'calculator.literal.min': 'Минимум' }));
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.locator('[data-remaked-code-status]')).toBeEmpty();
  await expect(page.locator('#InCode')).not.toHaveAttribute('aria-invalid', 'true');
  await page.locator('[data-remaked-skill-bulk]').click();
  await expect(page.locator('[data-remaked-skill-step="remaked-skill-1-Adeptness-right3"]')).toHaveText('Максимум');
  await expect(page.locator('[data-remaked-skill-step="remaked-skill-1-Adeptness-left3"]')).toHaveText('Минимум');
  await page.locator('[data-remaked-ui-locale="en"]').click();
  await expect(page.locator('[data-remaked-skill-step="remaked-skill-1-Adeptness-right3"]')).toHaveText('max');
});
