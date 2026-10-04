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
  const inputs = page.locator('[data-remaked-skill-number]');
  const indexes = [];
  for (let index = 0; index < await inputs.count(); index++)
    indexes.push(Number(await inputs.nth(index).getAttribute('data-remaked-skill-number')));
  expect(indexes).toEqual(leafBranches);

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

async function configureElfClericHealing(page) {
  await page.goto('/');
  await page.evaluate(() => {
    const races = document.getElementById('SelRace');
    races.selectedIndex = 1;
    races.onchange();
    // Choose the class before adding level points. Selecting an advanced class
    // after leveling makes the retained engine try to preserve Warrior base
    // stats and consumes part of the 504-point Lv50 budget.
    const jobs = document.getElementById('SelJob');
    jobs.selectedIndex = 16;
    jobs.onchange();
  });
  const level = page.locator('[data-remaked-number="Lev"]');
  await level.fill('50');
  await level.press('Enter');
  await expect(level).toHaveValue('50');

  for (const [key, value] of [['STA', 27], ['DEX', 40], ['SPR', 40], ['INT', 93]]) {
    const input = page.locator(`[data-remaked-number="${key}"]`);
    await input.fill(String(value));
    await input.press('Enter');
    await expect(input).toHaveValue(String(value));
  }
  for (const [branch, value] of [[13, 71], [14, 54]]) {
    const input = page.locator(`[data-remaked-skill-number="${branch}"]`);
    await input.fill(String(value));
    await input.press('Enter');
    await expect(input).toHaveValue(String(value));
  }
}

async function enableCalculatorAction(page, textId) {
  const button = page.locator(`[data-remaked-calculator-action="${textId}"]`);
  if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

test('real Cleric skill-list toggle colors every learned native skill from current prerequisites', async ({ page }) => {
  await configureElfClericHealing(page);
  await enableCalculatorAction(page, 'Text_3');
  await page.evaluate(() => document.getElementById('Tab_1_0').click());

  const learned = ['13_0', '13_2', '13_3', '13_5', '13_10', '13_11', '14_3', '14_8'];
  const state = await page.evaluate(ids => Object.fromEntries(ids.map(id => {
    const icon = document.getElementById('LearnSkillIcon_' + id);
    return [id, {
      exists: Boolean(icon),
      learned: Learn[0].includes(id),
      gray: icon ? icon.style.backgroundImage.includes('/gray/') : null
    }];
  })), learned);

  for (const id of learned)
    expect(state[id], id).toEqual({ exists: true, learned: true, gray: false });
});

test('level 50 to 49 recalculates Merciful Blessing effects and exposes an over-budget allocation', async ({ page }) => {
  await configureElfClericHealing(page);
  await enableCalculatorAction(page, 'Text_3');
  await enableCalculatorAction(page, 'Text_5');
  await enableCalculatorAction(page, 'Text_6');

  await expect(page.locator('#ViewHeal_1_1')).toHaveText('1490');
  await expect(page.locator('#StatusStP_0')).toHaveText('0');
  await expect(page.locator('#LearnSkillIcon_13_3')).not.toHaveAttribute('style', /gray\//);

  const level = page.locator('[data-remaked-number="Lev"]');
  await level.fill('49');
  await level.press('Enter');

  await expect(page.locator('#ViewHeal_1_1')).toHaveText('919');
  await expect(page.locator('#StatusStP_0')).toHaveText('-16');
  await expect(page.locator('#LearnSkillIcon_13_3')).toHaveAttribute('style', /gray\//);
  await expect(page.locator('#remaked-budget-warning')).toContainText('Status -16');
  const statusBudget = page.locator('#StatusStP_0').locator('xpath=ancestor::ul[li[contains(@class,"input_lt")]][1]');
  await expect(statusBudget).toHaveAttribute('data-remaked-budget-deficit', '');
  await expect(statusBudget).toHaveAttribute('title', /Status -16/);
  await expect(page.locator('#StatusSkP_0').locator('xpath=ancestor::ul[li[contains(@class,"input_lt")]][1]'))
    .not.toHaveAttribute('data-remaked-budget-deficit', '');
});

test('Level, Status, Skill and Potential budget rows share the same compact geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const geometry = await page.evaluate(() => {
    const rows = [
      document.querySelector('[data-remaked-calculator-level]'),
      document.getElementById('StatusStP_0').closest('.input_gt').parentElement,
      document.getElementById('StatusSkP_0').closest('.input_gt').parentElement,
      document.getElementById('StatusUnP_0').closest('.input_gt').parentElement
    ];
    return rows.map(row => {
      const box = row.getBoundingClientRect();
      const label = row.querySelector('.input_lt').getBoundingClientRect();
      return { width: box.width, height: box.height, labelWidth: label.width };
    });
  });
  expect(new Set(geometry.map(row => Math.round(row.width))).size).toBe(1);
  expect(new Set(geometry.map(row => Math.round(row.height))).size).toBe(1);
  expect(new Set(geometry.map(row => Math.round(row.labelWidth))).size).toBe(1);
  expect(Math.round(geometry[0].labelWidth)).toBe(58);
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


test('direct skill input commits a valid edit when focus leaves the field', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-remaked-number="Lev"]').fill('55');
  await page.locator('[data-remaked-number="Lev"]').press('Enter');
  const input = page.locator('[data-remaked-skill-number="1"]');
  const before = Number(await input.inputValue());
  await input.fill(String(before + 1));
  await page.locator('#TextSkill_2').click();
  await expect(input).toHaveValue(String(before + 1));
  expect(await page.evaluate(() => Status.Skill[1][0] + Status.Skill[1][1])).toBe(before + 1);
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
