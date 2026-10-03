import { test, expect } from '@playwright/test';

test('all skill actions delegate exactly once to retained source callbacks', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await expect(page.locator('[data-remaked-skill-step]')).toHaveCount(240);
  const results = await page.evaluate(() => {
    StatusMove('Lev', 54); CalcSet('Lev');
    const initial = Store();
    const results = [];
    for (const button of document.querySelectorAll('[data-remaked-skill-step]')) for (const allocated of [false, true]) {
      const source = document.getElementById(button.dataset.remakedSkillStep);
      if (allocated) {
        const index = source.id.split('-')[2];
        document.getElementById('remaked-skill-' + index + '-Potential-right3').click();
        document.getElementById('remaked-skill-' + index + '-Adeptness-right3').click();
      }
      const fixture = Store();
      source.click(); const expected = Store();
      PandoraRemaked.adapter.load(fixture);
      let calls = 0; const retained = source.onclick;
      source.onclick = function (event) { calls++; return retained.call(this, event); };
      button.click(); const actual = Store();
      source.onclick = retained;
      results.push({ id: source.id, expected, actual, calls });
      PandoraRemaked.adapter.load(initial);
    }
    return results;
  });
  for (const row of results) { expect(row.actual, row.id).toBe(row.expected); expect(row.calls, row.id).toBe(1); }
});

test('full names, keyboard steps and panel-wide larger steps preserve build state', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#TextSkill_9')).toHaveText('Assassination');
  const before = await page.evaluate(() => Store());
  await expect(page.locator('[data-remaked-skill-step]:visible')).toHaveCount(80);
  await page.getByRole('button', { name: 'Larger steps', exact: true }).click();
  await expect(page.locator('[data-remaked-skill-step]:visible')).toHaveCount(240);
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.getByRole('button', { name: 'Larger steps', exact: true }).click();
  await page.locator('[data-remaked-number="Lev"]').fill('55');
  await page.locator('[data-remaked-number="Lev"]').press('Enter');
  const initial = await page.evaluate(() => Store());
  const action = page.locator('[data-remaked-skill-step="remaked-skill-1-Adeptness-right1"]');
  await action.focus(); await page.keyboard.press('Space');
  expect(await page.evaluate(() => Store())).not.toBe(initial);
  await page.evaluate(code => PandoraRemaked.adapter.load(code), initial);
  await action.focus(); await page.keyboard.press('Enter');
  expect(await page.evaluate(() => Store())).not.toBe(initial);
});

test('effects are explicit keyboard controls, not hover switches; values and hints survive', async ({ page }) => {
  await page.goto('/');
  const source = await page.evaluate(() => ({ build: Store(),
    units: document.getElementById('ViewBuff_0_1').parentElement.textContent,
    hint: document.getElementById('ViewBuff_0_2').textContent }));
  const pot = page.locator('[data-remaked-effect="1"]');
  const skill = page.locator('[data-remaked-effect="0"]');
  await expect(skill).toHaveAttribute('aria-pressed', 'true');
  await pot.hover(); await expect(skill).toHaveAttribute('aria-pressed', 'true');
  await pot.focus(); await page.keyboard.press('Enter');
  await expect(pot).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#POTView')).toBeVisible();
  await expect(page.locator('#SkillView')).toBeHidden();
  await skill.focus(); await page.keyboard.press('Space');
  await expect(page.locator('#SkillView')).toBeVisible();
  expect(await page.evaluate(() => Store())).toBe(source.build);
  expect(await page.locator('#ViewBuff_0_1').evaluate(node => node.parentElement.textContent)).toBe(source.units);
  await expect(page.locator('#ViewBuff_0_2')).toHaveText(source.hint);
});

for (const width of [320, 390, 768, 1440]) test(`skill/effect controls fit and remain readable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  for (const expanded of [false, true]) {
    if (expanded) await page.getByRole('button', { name: 'Larger steps', exact: true }).click();
    const geometry = await page.evaluate(() => [...document.querySelectorAll('[data-remaked-skill-step], [data-remaked-effect]')]
      .filter(node => node.getClientRects().length).map(node => {
        const b = node.getBoundingClientRect(); return { x: b.x, right: b.right, width: b.width, height: b.height };
      }));
    for (const b of geometry) {
      expect(b.x).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(width);
      expect(b.width).toBeGreaterThanOrEqual(width <= 620 ? 44 : 28);
      expect(b.height).toBeGreaterThanOrEqual(width <= 620 ? 44 : 28);
    }
    for (const selector of ['#SkillSet', '[data-remaked-calculator-effects]']) {
      const bounds = await page.locator(selector).evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth }));
      expect(bounds.scroll, selector + ' ' + JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.width);
    }
  }
});

test('locale, approved long names, reset/load and repeat enhancement preserve source state', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.evaluate(() => {
    PandoraRemakedGameTerms.ru['skill.9'] = 'Проверочное очень длинное название ветки умений';
    PandoraRemaked.skillControls.refresh(); PandoraRemaked.skillControls.refresh();
  });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.locator('#TextSkill_9')).toHaveText('Проверочное очень длинное название ветки умений');
  expect(await page.locator('#TextSkill_9').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.locator('[data-remaked-ui-locale="en"]').click();
  await expect(page.locator('#TextSkill_9')).toHaveText('Assassination');
  await page.locator('[data-remaked-language="0"]').click();
  await expect(page.locator('#TextSkill_9')).toHaveText('暗殺');
  await page.locator('[data-remaked-language="1"]').click();
  await expect(page.locator('#TextSkill_9')).toHaveText('Assassination');
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.locator('[data-remaked-number="Lev"]').fill('55');
  await page.locator('[data-remaked-number="Lev"]').press('Enter');
  await page.locator('[data-remaked-skill-step="remaked-skill-1-Adeptness-right1"]').click();
  const saved = await page.evaluate(() => Store());
  await page.locator('[data-remaked-calculator-action="Text_8"]').click();
  await page.evaluate(code => PandoraRemaked.adapter.load(code), saved);
  expect(await page.evaluate(() => Store())).toBe(saved);
  await expect(page.locator('[data-remaked-skill-step]')).toHaveCount(240);
  await expect(page.locator('[data-remaked-effect]')).toHaveCount(2);
});

test('unavailable skill enhancement retains the source controls and museum is unaffected', async ({ page }) => {
  await page.route('**/modern/skill-controls.js', route => route.abort()); await page.goto('/');
  await expect(page.locator('[data-remaked-skill-step]')).toHaveCount(0);
  await expect(page.locator('#SkillSet input[type="image"]').first()).toBeVisible();
  await page.evaluate(() => { StatusMove('Lev', 54); CalcSet('Lev'); });
  const before = await page.evaluate(() => Store());
  await page.locator('#SkillSet input[alt="+1"]').first().click();
  expect(await page.evaluate(() => Store())).not.toBe(before);
  await page.goto('/legacy/');
  await expect(page.locator('[data-remaked-skill-step]')).toHaveCount(0);
  await expect(page.locator('#SkillSet input[type="image"]')).toHaveCount(240);
});
