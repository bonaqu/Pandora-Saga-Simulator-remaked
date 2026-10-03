import { test, expect } from '@playwright/test';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
}

async function seedBuilds(page) {
  await openModern(page);
  return page.evaluate(() => {
    const adapter = window.PandoraRemaked.adapter;
    const store = window.PandoraRemaked.buildStore;
    localStorage.removeItem(store.AUTOSAVE_KEY);
    localStorage.removeItem(store.BUILDS_KEY);

    const active = adapter.serialize();
    const first = store.saveBuild('Build A', active);
    if (!first.ok) throw new Error(first.error?.message || 'Could not save Build A');

    const race = document.getElementById('SelRace');
    const originalRace = race.selectedIndex;
    race.selectedIndex = (originalRace + 1) % race.options.length;
    race.dispatchEvent(new Event('change', { bubbles: true }));
    const changed = adapter.serialize();
    adapter.load(active);

    const second = store.saveBuild('Build B', changed);
    if (!second.ok) throw new Error(second.error?.message || 'Could not save Build B');

    return {
      a: first.build,
      b: second.build,
      active,
      legacyFile: localStorage.getItem('file'),
      autosave: localStorage.getItem(store.AUTOSAVE_KEY),
      named: localStorage.getItem(store.BUILDS_KEY)
    };
  });
}

async function choosePair(page, ids) {
  await page.locator('[data-remaked-compare-a]').selectOption(ids.a.id);
  await page.locator('[data-remaked-compare-b]').selectOption(ids.b.id);
}

test('differences-only filters identical numeric and unavailable rows without modifying any build', async ({ page }) => {
  const builds = await seedBuilds(page);
  await page.locator('[data-remaked-compare-open]').click(); await choosePair(page, builds);
  const rows = page.locator('[data-remaked-compare-row]');
  await expect(rows.first()).toBeVisible();
  const all = await rows.count();
  const unchanged = await page.locator('[data-remaked-compare-row][data-equal="true"]').count();
  expect(unchanged).toBeGreaterThan(0); expect(unchanged).toBeLessThan(all);
  await page.getByRole('checkbox', { name: 'Hide identical stats' }).check();
  await expect(rows.locator(':scope:visible')).toHaveCount(all - unchanged);
  await page.getByRole('checkbox', { name: 'Hide identical stats' }).uncheck();
  await expect(rows.locator(':scope:visible')).toHaveCount(all);
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(builds.active);
  await page.locator('[data-remaked-compare-a]').selectOption(builds.a.id);
  const twin = await page.evaluate(payload => PandoraRemaked.buildStore.saveBuild('Twin', payload).build, builds.a.payload);
  await page.locator('[data-remaked-compare-refresh]').click();
  await page.locator('[data-remaked-compare-b]').selectOption(twin.id);
  await page.getByRole('checkbox', { name: 'Hide identical stats' }).check();
  await expect(page.locator('[data-remaked-compare-identical]')).toHaveText('All displayed stats are identical.');
  await expect(rows.locator(':scope:visible')).toHaveCount(0);
});

test('equal-row filtering never equates missing values, zero or incompatible units', async ({ page }) => {
  await openModern(page);
  const actual = await page.evaluate(() => {
    const equal = PandoraRemaked.compare.identicalFields;
    return [equal({ value: null, display: '---', unit: '%' }, { value: 0, display: '0', unit: '%' }),
      equal({ value: 5, display: '5', unit: '' }, { value: 5, display: '5', unit: '%' }),
      equal({ value: null, display: '---', unit: '' }, { value: null, display: '---', unit: '' }),
      equal({ value: null, display: '---', unit: '' }, { value: null, display: '', unit: '' })];
  });
  expect(actual).toEqual([false, false, true, false]);
});

test('Compare Builds tool opens from Modern tools and lists named builds', async ({ page }) => {
  const builds = await seedBuilds(page);
  const trigger = page.locator('[data-remaked-compare-open]');
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.locator('[data-remaked-compare]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Compare Builds', exact: true })).toBeVisible();
  await expect(page.locator('[data-remaked-compare-a] option')).toHaveCount(3);
  await expect(page.locator('[data-remaked-compare-b] option')).toHaveCount(3);
  await expect(page.locator('[data-remaked-compare-a] option', { hasText: builds.a.name })).toHaveCount(1);
  await expect(page.locator('[data-remaked-compare-b] option', { hasText: builds.b.name })).toHaveCount(1);
});

test('comparing two saved builds renders metadata and neutral B minus A deltas without mutating current state', async ({ page }) => {
  const builds = await seedBuilds(page);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page, builds);

  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-row]')).not.toHaveCount(0);
  await expect(page.locator('[data-remaked-compare-meta-a]')).toContainText('Build A');
  await expect(page.locator('[data-remaked-compare-meta-b]')).toContainText('Build B');

  const state = await page.evaluate(() => {
    const adapter = window.PandoraRemaked.adapter;
    const store = window.PandoraRemaked.buildStore;
    return {
      active: adapter.serialize(),
      legacyFile: localStorage.getItem('file'),
      autosave: localStorage.getItem(store.AUTOSAVE_KEY),
      named: localStorage.getItem(store.BUILDS_KEY)
    };
  });
  expect(state).toEqual({
    active: builds.active,
    legacyFile: builds.legacyFile,
    autosave: builds.autosave,
    named: builds.named
  });

  const deltaCells = page.locator('[data-remaked-delta]');
  const count = await deltaCells.count();
  const directions = [];
  for (let index = 0; index < count; index += 1) {
    directions.push(await deltaCells.nth(index).getAttribute('data-direction'));
  }
  expect(directions.length).toBeGreaterThan(5);
  expect(directions.every((value) => ['up', 'down', 'flat', 'unavailable'].includes(value))).toBe(true);
  await expect(page.locator('[data-remaked-compare]')).not.toContainText(/winner|better|best|worse/i);
});

test('delta helper reports signed B minus A differences and unavailable values without judging them', async ({ page }) => {
  await openModern(page);
  const values = await page.evaluate(() => {
    const compare = window.PandoraRemaked.compare;
    return [
      compare.computeDelta({ value: 100, unit: '' }, { value: 137, unit: '' }),
      compare.computeDelta({ value: 15, unit: '%' }, { value: 13, unit: '%' }),
      compare.computeDelta({ value: 10, unit: '' }, { value: 10, unit: '' }),
      compare.computeDelta({ value: null, unit: '' }, { value: 10, unit: '' })
    ];
  });
  expect(values[0]).toEqual({ value: 37, display: '+37', direction: 'up' });
  expect(values[1]).toEqual({ value: -2, display: '-2%', direction: 'down' });
  expect(values[2]).toEqual({ value: 0, display: '0', direction: 'flat' });
  expect(values[3]).toEqual({ value: null, display: '—', direction: 'unavailable' });
});

test('fewer than two valid builds shows a clear empty state instead of fake comparison data', async ({ page }) => {
  await openModern(page);
  await page.evaluate(() => {
    const store = window.PandoraRemaked.buildStore;
    localStorage.removeItem(store.BUILDS_KEY);
    store.saveBuild('Only build', window.PandoraRemaked.adapter.serialize());
  });
  await page.locator('[data-remaked-compare-open]').click();
  await expect(page.locator('[data-remaked-compare-empty]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-empty]')).toContainText(/at least two/i);
  await expect(page.locator('[data-remaked-compare-table]')).toBeHidden();
});

test('deleted selected build becomes an explicit recoverable error', async ({ page }) => {
  const builds = await seedBuilds(page);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page, builds);
  await page.evaluate((id) => window.PandoraRemaked.buildStore.deleteBuild(id), builds.b.id);
  await page.locator('[data-remaked-compare-refresh]').click();
  await expect(page.locator('[data-remaked-compare-status]')).toContainText(/no longer available|choose two|at least two/i);
  await expect(page.locator('[data-remaked-compare-table]')).toBeHidden();
});

test('Escape closes Compare Builds and returns focus to the opener', async ({ page }) => {
  await seedBuilds(page);
  const trigger = page.locator('[data-remaked-compare-open]');
  await trigger.focus();
  await trigger.click();
  await expect(page.locator('[data-remaked-compare]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-remaked-compare]')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('Compare Builds remains usable at 390px without body-level horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const builds = await seedBuilds(page);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page, builds);
  await expect(page.locator('[data-remaked-compare]')).toBeVisible();
  const size = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth + 1);
  await expect(page.locator('[data-remaked-compare-a]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-b]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
});
