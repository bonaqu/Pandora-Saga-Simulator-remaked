import { test, expect } from '@playwright/test';

const leafBranches = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 16, 18, 19, 20, 21, 23, 24];

async function selectCleric(page) {
  await page.locator('[data-remaked-number="Lev"]').fill('50');
  await page.locator('[data-remaked-number="Lev"]').press('Enter');
  await page.evaluate(() => {
    const jobs = document.getElementById('SelJob');
    jobs.selectedIndex = 16;
    jobs.onchange();
  });
}

test('all leaf branches use direct Adeptness numbers while Potential stays read-only', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-remaked-skill-number]')).toHaveCount(20);
  await expect(page.locator('[data-remaked-skill-step]')).toHaveCount(0);
  expect(await page.locator('[data-remaked-skill-number]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.remakedSkillNumber)))).toEqual(leafBranches);

  for (const index of leafBranches) {
    const group = page.locator(`[data-remaked-skill-row="${index}"] [data-remaked-skill-group="Potential"]`);
    await expect(group.locator('button, input')).toHaveCount(0);
    await expect(group.locator(`[data-remaked-skill-potential-value="${index}"]`)).toHaveCount(1);
  }

  await selectCleric(page);
  const cleave = page.locator('[data-remaked-skill-number="3"]');
  await expect(cleave).toHaveAttribute('min', '0');
  await expect(cleave).toHaveAttribute('max', '15');
  await expect(page.locator('[data-remaked-skill-potential-value="3"]')).toHaveText('15');

  const expected = await page.evaluate(() => {
    const fixture = Store();
    const current = Status.Skill[3][0] + Status.Skill[3][1];
    CalcSet('Skill', 3, 8 - current, 'Adeptness');
    const expected = Store();
    PandoraRemaked.adapter.load(fixture);
    return expected;
  });
  await cleave.fill('8');
  await cleave.press('Enter');
  expect(await page.evaluate(() => Store())).toBe(expected);
  expect(await page.evaluate(() => ({
    adeptness: Status.Skill[3][0] + Status.Skill[3][1],
    potential: Status.Skill[3][2] + Status.Skill[3][3],
    addedPotential: Status.Skill[3][3]
  }))).toEqual({ adeptness: 8, potential: 15, addedPotential: 0 });

  const beforeInvalid = await page.evaluate(() => Store());
  await cleave.fill('16');
  await cleave.press('Enter');
  await expect(cleave).toHaveAttribute('aria-invalid', 'true');
  expect(await page.evaluate(() => Store())).toBe(beforeInvalid);
  await cleave.press('Escape');
  await expect(cleave).toHaveValue('8');
});

test('Clobber is gray below Cleave 8 and active at 8 after direct edits', async ({ page }) => {
  await page.goto('/');
  await selectCleric(page);
  await page.evaluate(() => {
    Flag[3] = 1;
    Learn = [[], [], [], []];
    for (let category = 0; category < Name.Skill.length; category++) SkillList('Potential', category);
    SkillList('Adeptness', 0);
    SkillList('Create');
    SkillList('Color');
  });

  const cleave = page.locator('[data-remaked-skill-number="3"]');
  await cleave.fill('7');
  await cleave.press('Enter');
  let state = await page.evaluate(() => {
    const icon = document.getElementById('LearnSkillIcon_3_0');
    return { exists: Boolean(icon), gray: icon?.style.background.includes('/gray/'), learned: Learn[0].includes('3_0') };
  });
  expect(state).toEqual({ exists: true, gray: true, learned: false });

  // Simulate the stale derived pools that previously could survive catalog/UI
  // changes. The direct edit must reconstruct them from current engine state.
  await page.evaluate(() => { Learn = [[], [], [], []]; });
  await cleave.fill('8');
  await cleave.press('Enter');
  state = await page.evaluate(() => {
    const icon = document.getElementById('LearnSkillIcon_3_0');
    return { exists: Boolean(icon), gray: icon?.style.background.includes('/gray/'), learned: Learn[0].includes('3_0') };
  });
  expect(state).toEqual({ exists: true, gray: false, learned: true });

  await cleave.fill('7');
  await cleave.press('Enter');
  state = await page.evaluate(() => {
    const icon = document.getElementById('LearnSkillIcon_3_0');
    return { exists: Boolean(icon), gray: icon?.style.background.includes('/gray/'), learned: Learn[0].includes('3_0') };
  });
  expect(state).toEqual({ exists: true, gray: true, learned: false });
});

test('direct skill input is keyboard-operable and respects the retained skill-point budget', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-remaked-number="Lev"]').fill('55');
  await page.locator('[data-remaked-number="Lev"]').press('Enter');
  const input = page.locator('[data-remaked-skill-number="1"]');
  const initial = await page.evaluate(() => Store());
  const current = Number(await input.inputValue());
  const maximum = Number(await input.getAttribute('max'));
  expect(maximum).toBeGreaterThan(current);

  await input.focus();
  await input.fill(String(current + 1));
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => Store())).not.toBe(initial);

  const changed = await page.evaluate(() => Store());
  await input.fill(String(Number(await input.inputValue()) + 1));
  await input.press('Escape');
  expect(await page.evaluate(() => Store())).toBe(changed);
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
  const geometry = await page.evaluate(() => [...document.querySelectorAll('[data-remaked-skill-number], [data-remaked-effect]')]
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
  const slash = page.locator('[data-remaked-skill-number="1"]');
  await slash.fill(String(Number(await slash.inputValue()) + 1));
  await slash.press('Enter');
  const saved = await page.evaluate(() => Store());
  await page.locator('[data-remaked-calculator-action="Text_8"]').click();
  await page.evaluate(code => PandoraRemaked.adapter.load(code), saved);
  expect(await page.evaluate(() => Store())).toBe(saved);
  await expect(page.locator('[data-remaked-skill-number]')).toHaveCount(20);
  await expect(page.locator('[data-remaked-effect]')).toHaveCount(2);
});

test('unavailable skill enhancement retains the source controls and museum is unaffected', async ({ page }) => {
  await page.route('**/modern/skill-controls.js', route => route.abort()); await page.goto('/');
  await expect(page.locator('[data-remaked-skill-number]')).toHaveCount(0);
  await expect(page.locator('#SkillSet input[type="image"]').first()).toBeVisible();
  await page.evaluate(() => { StatusMove('Lev', 54); CalcSet('Lev'); });
  const before = await page.evaluate(() => Store());
  await page.locator('#SkillSet input[alt="+1"]').first().click();
  expect(await page.evaluate(() => Store())).not.toBe(before);
  await page.goto('/legacy/');
  await expect(page.locator('[data-remaked-skill-number]')).toHaveCount(0);
  await expect(page.locator('#SkillSet input[type="image"]')).toHaveCount(240);
});
