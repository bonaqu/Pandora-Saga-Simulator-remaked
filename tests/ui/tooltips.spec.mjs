import { test, expect } from '@playwright/test';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
}

async function seedComparison(page) {
  await openModern(page);
  return page.evaluate(() => {
    const adapter = window.PandoraRemaked.adapter;
    const store = window.PandoraRemaked.buildStore;
    localStorage.removeItem(store.BUILDS_KEY);
    const active = adapter.serialize();
    const a = store.saveBuild('Tooltip A', active).build;
    const race = document.getElementById('SelRace');
    race.selectedIndex = (race.selectedIndex + 1) % race.options.length;
    race.dispatchEvent(new Event('change', { bubbles: true }));
    const changed = adapter.serialize();
    adapter.load(active);
    const b = store.saveBuild('Tooltip B', changed).build;
    return { a, b };
  });
}

test('tooltip registry exposes conservative definitions and exact Legacy source nodes', async ({ page }) => {
  await openModern(page);
  const result = await page.evaluate(() => ({
    attack: window.PandoraRemaked.tooltips.get('physicalAttack'),
    crit: window.PandoraRemaked.tooltips.get('crit'),
    fire: window.PandoraRemaked.tooltips.get('fireResist'),
    unknown: window.PandoraRemaked.tooltips.get('not-a-real-stat')
  }));

  expect(result.attack.definition).toMatch(/physical attack/i);
  expect(result.attack.source).toMatch(/Status_18/);
  expect(result.attack.source).toMatch(/Legacy 2\.00/i);
  expect(result.crit.source).toMatch(/Status_69/);
  expect(result.fire.source).toMatch(/Status_138/);
  expect(result.unknown).toBeNull();

  const text = JSON.stringify(result).toLowerCase();
  expect(text).not.toMatch(/str contribution|weapon contribution|base \d|base \+|= weapon|formula:/i);
});

test('Compare Builds stat labels are decorated with keyboard-focusable help controls', async ({ page }) => {
  const builds = await seedComparison(page);
  await page.locator('[data-remaked-compare-open]').click();
  await page.locator('[data-remaked-compare-a]').selectOption(builds.a.id);
  await page.locator('[data-remaked-compare-b]').selectOption(builds.b.id);

  const help = page.locator('[data-remaked-stat-help="physicalAttack"]');
  await expect(help).toBeVisible();
  await expect(help).toHaveAttribute('aria-describedby', /remaked-stat-tooltip-/);
});

test('focusing a stat help control reveals definition and source and blur hides it', async ({ page }) => {
  const builds = await seedComparison(page);
  await page.locator('[data-remaked-compare-open]').click();
  await page.locator('[data-remaked-compare-a]').selectOption(builds.a.id);
  await page.locator('[data-remaked-compare-b]').selectOption(builds.b.id);

  const help = page.locator('[data-remaked-stat-help="physicalAttack"]');
  const describedBy = await help.getAttribute('aria-describedby');
  const tooltip = page.locator('#' + describedBy);
  await help.focus();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText(/physical attack/i);
  await expect(tooltip).toContainText(/Status_18/);
  await expect(tooltip).toContainText(/Legacy 2\.00/i);
  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await expect(page.locator('[data-remaked-compare]')).toBeVisible();
  await help.blur();
  await help.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(tooltip).toBeHidden();
});
