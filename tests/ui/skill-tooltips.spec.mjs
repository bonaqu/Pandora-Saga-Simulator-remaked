import { test, expect } from '@playwright/test';

async function openSkills(page) {
  await page.goto('/');
  await page.evaluate(() => { Flag[3] = 1; StatusMove('Lev', 54); CalcSet('Lev'); Status.Job[2] = 2; CalcSet('Job'); });
  await page.locator('[data-remaked-tab="1"]').click();
  await expect(page.locator('#LearnSkillIcon_0_15')).toBeVisible();
}

async function assertVisibleSurface(page, tip) {
  const result = await tip.evaluate(node => {
    const r = node.getBoundingClientRect();
    const sample = document.elementFromPoint(r.right - 12, r.bottom - 12);
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, painted: sample === node || node.contains(sample),
      viewport: { width: innerWidth, height: innerHeight }, position: getComputedStyle(node).position };
  });
  expect(result.position).toBe('fixed'); expect(result.painted).toBe(true);
  expect(result.left).toBeGreaterThanOrEqual(8); expect(result.top).toBeGreaterThanOrEqual(8);
  expect(result.right).toBeLessThanOrEqual(result.viewport.width - 8 + 1);
  expect(result.bottom).toBeLessThanOrEqual(result.viewport.height - 8 + 1);
}

test('skill descriptions escape the scroll panel and remain readable on hover without changing the build', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await openSkills(page);
  const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  const icon = page.locator('#LearnSkillIcon_0_15'), tip = page.locator('#LearnSkill_0_15');
  const sourceText = await tip.textContent();
  await icon.hover(); await page.waitForTimeout(200); await expect(tip).toBeHidden();
  await expect(tip).toBeVisible(); await expect(tip).toHaveAttribute('data-remaked-skill-tooltip', '');
  await expect(tip).toHaveAttribute('role', 'tooltip'); await expect(icon).toHaveAttribute('aria-describedby', 'LearnSkill_0_15');
  await assertVisibleSurface(page, tip); expect(await tip.textContent()).toBe(sourceText);
  const panelBounds = await page.locator('[data-remaked-native-panel="1"]').boundingBox(), tipBounds = await tip.boundingBox();
  expect(tipBounds.x + tipBounds.width).toBeGreaterThan(panelBounds.x + panelBounds.width);
  await tip.hover(); await page.waitForTimeout(250); await expect(tip).toBeVisible();
  await tip.click(); await expect(tip).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('skill-hover-desktop.png') });
  await page.keyboard.press('Escape'); await expect(tip).toBeHidden();
  await expect(page.locator('[data-remaked-native-panel="1"]')).toBeVisible();
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before);
});

test('keyboard and narrow-screen skill details keep complete scrollable content and dismiss before the panel', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 }); await openSkills(page);
  const icon = page.locator('#LearnSkillIcon_0_15'), tip = page.locator('#LearnSkill_0_15');
  await icon.focus(); await expect(tip).toBeVisible(); await assertVisibleSurface(page, tip);
  await expect(icon).toHaveAttribute('role', 'button'); await expect(icon).toHaveAccessibleName('Bash');
  const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  const description = tip.locator(':scope > ul:last-child > li');
  await description.evaluate(node => { node.textContent = ('Long complete description. ').repeat(120) + 'DESCRIPTION END'; });
  await page.setViewportSize({ width: 390, height: 568 }); await assertVisibleSurface(page, tip);
  expect(await tip.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  await tip.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(tip).toBeVisible();
  expect(await tip.evaluate(node => node.scrollHeight - node.scrollTop - node.clientHeight)).toBeLessThanOrEqual(1);
  await expect(description).toContainText('DESCRIPTION END');
  await page.screenshot({ path: testInfo.outputPath('skill-long-mobile.png') });
  await page.keyboard.press('Escape'); await expect(tip).toBeHidden(); await expect(icon).toBeFocused();
  await expect(page.locator('[data-remaked-native-panel="1"]')).toBeVisible();
  await icon.press('Enter'); await expect(tip).toBeVisible();
  await icon.press('Space'); await expect(tip).toBeHidden();
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before);
});

test('touch skill details toggle and disappear on panel close, source rerender or outside activation', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await openSkills(page);
    const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
    const icon = page.locator('#LearnSkillIcon_0_15'), tip = page.locator('#LearnSkill_0_15');
    await icon.tap(); await expect(tip).toBeVisible(); await assertVisibleSurface(page, tip);
    await tip.tap(); await expect(tip).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('skill-touch-mobile.png') });
    await icon.tap(); await expect(tip).toBeHidden();
    await icon.tap(); await expect(tip).toBeVisible();
    await page.locator('[data-remaked-tab="2"]').tap(); await expect(tip).toBeHidden();
    await page.locator('[data-remaked-tab="1"]').tap(); await icon.tap(); await expect(tip).toBeVisible();
    await page.getByRole('button', { name: 'RU', exact: true }).tap();
    await expect(page.locator('[data-remaked-skill-tooltip]:visible')).toHaveCount(0);
    await icon.tap(); await expect(tip).toBeVisible();
    await page.evaluate(() => SkillList('Create')); await expect(page.locator('[data-remaked-skill-tooltip]:visible')).toHaveCount(0);
    await expect(page.locator('#LearnSkill_0_15')).toHaveCount(1);
    await icon.tap(); await expect(tip).toBeVisible();
    await page.locator('[data-remaked-native-panel="1"] [data-remaked-panel-close]').tap(); await expect(tip).toBeHidden();
    expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before); expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('skill tooltip portal fallback preserves native IDs and cleans up after the skill list rebuilds', async ({ page }) => {
  await page.addInitScript(() => { HTMLElement.prototype.showPopover = undefined; HTMLElement.prototype.hidePopover = undefined; });
  await openSkills(page); const icon = page.locator('#LearnSkillIcon_0_15'), tip = page.locator('#LearnSkill_0_15');
  await icon.focus(); await expect(tip).toBeVisible(); await assertVisibleSurface(page, tip);
  expect(await tip.evaluate(node => node.parentElement === document.body)).toBe(true);
  await page.evaluate(() => SkillList('Create')); await expect(page.locator('[data-remaked-skill-tooltip]:visible')).toHaveCount(0);
  await expect(page.locator('#LearnSkill_0_15')).toHaveCount(1);
  await icon.focus(); await expect(tip).toBeVisible(); await page.keyboard.press('Escape'); await expect(tip).toBeHidden();
  expect(await tip.evaluate(node => node.parentElement.id)).toBe('LearnSkillIcon_0_15');
});


test('RU skill hover shows localized labels and already translated mastery prerequisites', async ({ page }) => {
  await page.goto('/?ui=ru');
  await page.evaluate(() => {
    Flag[3] = 1; StatusMove('Lev', 54); CalcSet('Lev');
    Status.Job[2] = 8; CalcSet('Job'); SkillList('Create');
  });
  await page.locator('[data-remaked-tab="1"]').click();
  // Stable display fixture: the native renderer draws only eligible skills.
  // Include the real skill in the list without altering its data or conditions.
  await page.evaluate(() => {
    if (!Learn[1].includes('7_5')) Learn[1].push('7_5');
    Learn[2] = Learn[1].map(entry => entry.split('_'));
    SkillList('Create');
  });
  const icon = page.locator('#LearnSkillIcon_7_5');
  await expect(icon).toHaveCount(1);
  await icon.focus();
  const tooltip = page.locator('#LearnSkill_7_5');
  await expect(tooltip).toBeVisible();
  const lines = await tooltip.evaluate(node => [...node.children].filter(row => row.tagName === 'UL').map(row => row.textContent));
  expect(lines[0]).toContain('Пылающая стрела');
  expect(lines[2]).toContain('Скорость применения');
  expect(lines[2]).toContain('Откат');
  expect(lines[4]).toContain('Необходимо');
  expect(lines[5]).toContain('Стрельба 8');
  expect(lines[6]).toContain('Требования снаряжения');
  expect(lines[1]).toContain('Расход ОМ');
  await page.evaluate(() => PandoraRemaked.i18n.setLocale('en'));
  await icon.blur();
  await icon.focus();
  const english = await tooltip.evaluate(node => [...node.children].filter(row => row.tagName === 'UL').map(row => row.textContent));
  expect(english[4]).toContain('Prerequisites');
  expect(english[5]).toContain('Shot 8');
  expect(english[6]).toContain('Equipment requirements');
});
