import { test, expect } from '@playwright/test';

async function openMobile(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
}

async function projection(page) {
  return page.evaluate(() => ({
    metadata: window.PandoraRemaked.adapter.readCharacterMetadata(),
    summary: window.PandoraRemaked.adapter.readCalculatedSummary(),
    payload: window.PandoraRemaked.adapter.serialize()
  }));
}

function field(summary, key) {
  return summary.find((entry) => entry.key === key);
}

test('390px shows adapter-backed sticky character summary', async ({ page }) => {
  await openMobile(page);
  const expected = await projection(page);
  const summary = page.locator('[data-remaked-mobile-summary]');
  await expect(summary).toBeVisible();
  await expect(summary.locator('[data-remaked-summary-race]')).toHaveText(expected.metadata.race);
  await expect(summary.locator('[data-remaked-summary-job]')).toHaveText(expected.metadata.job);
  await expect(summary.locator('[data-remaked-summary-level]')).toContainText(String(expected.metadata.level));
  await expect(summary.locator('[data-remaked-summary-lp]')).toContainText(field(expected.summary, 'lp').display);
  await expect(summary.locator('[data-remaked-summary-atk]')).toContainText(field(expected.summary, 'physicalAttack').display);
  await expect(summary.locator('[data-remaked-summary-def]')).toContainText(field(expected.summary, 'defense').display);
});

test('summary follows intentional Legacy state changes without adding extra mutations', async ({ page }) => {
  await openMobile(page);
  const before = await projection(page);
  const jobButton = page.locator('[data-remaked-header]').getByRole('button', { name: 'JOB', exact: true });
  const race = page.locator('#SelRace');
  if (!(await race.isVisible())) await jobButton.click();
  await expect(race).toBeVisible();
  const count = await race.locator('option').count();
  expect(count).toBeGreaterThan(1);
  const current = await race.evaluate((select) => select.selectedIndex);
  await race.selectOption({ index: (current + 1) % count });

  await expect.poll(async () => (await projection(page)).metadata.race).not.toBe(before.metadata.race);
  const after = await projection(page);
  await expect(page.locator('[data-remaked-summary-race]')).toHaveText(after.metadata.race);
  expect(after.payload).not.toBe(before.payload);
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(after.payload);
});

test('inline calculator panels close and reopen by keyboard without changing the build', async ({ page }) => {
  await openMobile(page);
  // LOG is intentionally removed in Modern; test a real calculator card instead.
  await page.locator('[data-remaked-nav]').getByRole('button', { name: 'JOB', exact: true }).click();
  const opener = page.locator('[data-remaked-tab="0"]');
  const panel = page.locator('[data-remaked-native-panel="0"]');
  const toggle = panel.locator('[data-remaked-panel-close="0"]');
  await expect(toggle).toBeVisible();
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  const before = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());

  await toggle.focus();
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(opener).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(before);

  await page.keyboard.press('Enter');
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(before);
});

test('equipment row is decorated for phone layout with a usable picker and retained engine select', async ({ page }) => {
  await openMobile(page);
  const primary = page.locator('#SelEquip_0_0');
  await expect(primary).toBeHidden();
  await expect(page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]')).toBeVisible();
  const row = primary.locator('xpath=ancestor::*[@data-remaked-equipment-row][1]');
  const line = primary.locator('xpath=ancestor::*[@data-remaked-equipment-line][1]');
  await expect(row).toHaveCount(1);
  await expect(line).toHaveCount(1);
  await expect(primary).toBeEnabled();
});

test('essential Modern phone controls are touch-sized and page has no body overflow', async ({ page }) => {
  await openMobile(page);
  const selectors = [
    '[data-remaked-nav] button',
    '[data-remaked-language]',
    '[data-remaked-tools] button',
    '[data-remaked-collapse-toggle]'
  ];
  for (const selector of selectors) {
    const controls = page.locator(selector);
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const control = controls.nth(index);
      if (!(await control.isVisible())) continue;
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box.height, `${selector} #${index} height`).toBeGreaterThanOrEqual(40);
    }
  }

  const size = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth + 1);
});
