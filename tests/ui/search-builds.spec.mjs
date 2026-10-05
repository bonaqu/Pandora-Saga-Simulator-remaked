import { test, expect } from '@playwright/test';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-header]')).toBeVisible();
}

async function optionValues(page, selector) {
  const options = page.locator(`${selector} option`);
  const count = await options.count();
  const values = [];
  for (let index = 0; index < count; index += 1) {
    values.push((await options.nth(index).getAttribute('value')) ?? '');
  }
  return values;
}

async function resultValues(page) {
  const results = page.locator('[data-remaked-search-result]');
  const count = await results.count();
  const values = [];
  for (let index = 0; index < count; index += 1) {
    values.push((await results.nth(index).getAttribute('data-value')) ?? '');
  }
  return values;
}

async function switchLegacySelectIndex(page, id, index) {
  await page.evaluate(({ selectId, selectedIndex }) => {
    const select = document.getElementById(selectId);
    if (!select) throw new Error(`Missing legacy select #${selectId}`);
    select.selectedIndex = selectedIndex;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selectId: id, selectedIndex: index });
}

async function openEquipment(page, slotIndex = null) {
  await page.evaluate((slot) => window.PandoraRemaked.search.openEquipmentSearch(slot), slotIndex);
  await expect(page.locator('[data-remaked-search-panel][data-search-kind="equipment"]')).toBeVisible();
}

async function findEquipmentCompatibilityChange(page) {
  const baseline = await page.evaluate(() => ({
    payload: window.PandoraRemaked.adapter.serialize(),
    values: window.PandoraRemaked.adapter.listEquipmentTargets().map((target) => ({
      slotIndex: target.slotIndex,
      values: window.PandoraRemaked.adapter.listEquipmentOptions(target.slotIndex).map((option) => option.value)
    }))
  }));

  const job = page.locator('#SelJob');
  const jobCount = await job.locator('option').count();
  const originalJobIndex = await job.evaluate((node) => node.selectedIndex);
  for (let index = 0; index < jobCount; index += 1) {
    if (index === originalJobIndex) continue;
    await switchLegacySelectIndex(page, 'SelJob', index);
    const changed = await page.evaluate((before) => {
      for (const entry of before) {
        const now = window.PandoraRemaked.adapter.listEquipmentOptions(entry.slotIndex).map((option) => option.value);
        if (JSON.stringify(now) !== JSON.stringify(entry.values)) return entry.slotIndex;
      }
      return null;
    }, baseline.values);
    if (changed != null) return { baseline: baseline.payload, slotIndex: changed };
  }

  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), baseline.payload);
  const race = page.locator('#SelRace');
  const raceCount = await race.locator('option').count();
  const originalRaceIndex = await race.evaluate((node) => node.selectedIndex);
  for (let index = 0; index < raceCount; index += 1) {
    if (index === originalRaceIndex) continue;
    await switchLegacySelectIndex(page, 'SelRace', index);
    const changed = await page.evaluate((before) => {
      for (const entry of before) {
        const now = window.PandoraRemaked.adapter.listEquipmentOptions(entry.slotIndex).map((option) => option.value);
        if (JSON.stringify(now) !== JSON.stringify(entry.values)) return entry.slotIndex;
      }
      return null;
    }, baseline.values);
    if (changed != null) return { baseline: baseline.payload, slotIndex: changed };
  }
  return null;
}

async function findSocketBearingEquipment(page) {
  const original = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const targets = await page.evaluate(() => window.PandoraRemaked.adapter.listEquipmentTargets());
  for (const target of targets) {
    const values = await optionValues(page, `#${target.selectId}`);
    for (const value of values.slice(1, 70)) {
      await page.evaluate(({ slotIndex, selected }) => window.PandoraRemaked.adapter.selectEquipment(slotIndex, selected), {
        slotIndex: target.slotIndex,
        selected: value
      });
      const soulTargets = await page.evaluate(() => window.PandoraRemaked.adapter.listSoulTargets());
      if (soulTargets.length) {
        return {
          original,
          equipmentSlot: target.slotIndex,
          equipmentValue: value,
          soulTarget: soulTargets[0],
          socketBuild: await page.evaluate(() => window.PandoraRemaked.adapter.serialize())
        };
      }
    }
    await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), original);
  }
  return null;
}

test('search namespace normalizes Unicode and Equipment toolbar opens the panel', async ({ page }) => {
  await openModern(page);
  expect(await page.evaluate(() => Boolean(window.PandoraRemaked?.search))).toBe(true);
  expect(await page.evaluate(() => window.PandoraRemaked.search.normalizeQuery('  ＳｗＯＲＤ  '))).toBe('sword');

  await openEquipment(page);
  const targetSelect = page.locator('[data-remaked-search-target]');
  const targets = await page.evaluate(() => window.PandoraRemaked.adapter.listEquipmentTargets());
  await expect(targetSelect.locator('option')).toHaveCount(targets.length);
  expect(await targetSelect.inputValue()).toBe(String(targets[0].slotIndex));
});

test('Equipment query, level filters, reset and empty state operate on current adapter options', async ({ page }) => {
  await openModern(page);
  const target = await page.evaluate(() => window.PandoraRemaked.adapter.listEquipmentTargets()
    .map((candidate) => ({ candidate, options: window.PandoraRemaked.adapter.listEquipmentOptions(candidate.slotIndex) }))
    .find((entry) => entry.options.some((option) => option.level != null && option.name.length >= 4)));
  expect(target).toBeTruthy();

  await openEquipment(page, target.candidate.slotIndex);
  const real = target.options.find((option) => option.level != null && option.name.length >= 4);
  const query = real.name.slice(1, Math.min(real.name.length, 6)).toUpperCase();
  await page.locator('[data-remaked-search-query]').fill(query);
  const filtered = await resultValues(page);
  expect(filtered).toContain(real.value);
  expect(filtered.length).toBeLessThan(target.options.length);

  await page.locator('[data-remaked-search-query]').fill('');
  await page.locator('[data-remaked-min-level]').fill(String(real.level));
  await page.locator('[data-remaked-max-level]').fill(String(real.level));
  const levelValues = await resultValues(page);
  const expected = target.options.filter((option) => option.level === real.level).map((option) => option.value);
  expect(levelValues).toEqual(expected);

  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  expect(await page.locator('[data-remaked-search-query]').inputValue()).toBe('');
  expect(await page.locator('[data-remaked-min-level]').inputValue()).toBe('');
  expect(await page.locator('[data-remaked-max-level]').inputValue()).toBe('');

  await page.locator('[data-remaked-search-query]').fill('__definitely_no_such_equipment__');
  await expect(page.getByText('No matching equipment', { exact: true })).toBeVisible();
  const inlineReset = page.locator('[data-remaked-search-empty-reset]');
  await expect(inlineReset).toHaveText('Reset filter');
  await inlineReset.click();
  expect(await page.locator('[data-remaked-search-query]').inputValue()).toBe('');
  await expect(page.locator('[data-remaked-search-result]').first()).toBeVisible();
});

test('Equipment search rebuilds compatibility from current legacy state', async ({ page }) => {
  await openModern(page);
  const changed = await findEquipmentCompatibilityChange(page);
  expect(changed).not.toBeNull();

  const currentValues = await page.evaluate((slotIndex) => window.PandoraRemaked.adapter
    .listEquipmentOptions(slotIndex).map((option) => option.value), changed.slotIndex);
  await openEquipment(page, changed.slotIndex);
  expect(await resultValues(page)).toEqual(currentValues);
  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), changed.baseline);
});

test('choosing Equipment from Modern Search is payload-identical to direct legacy selection', async ({ page }) => {
  await openModern(page);
  const baseline = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const target = await page.evaluate(() => window.PandoraRemaked.adapter.listEquipmentTargets()
    .map((candidate) => ({ candidate, options: window.PandoraRemaked.adapter.listEquipmentOptions(candidate.slotIndex) }))
    .find((entry) => entry.options.length > 1));
  expect(target).toBeTruthy();
  const selected = target.options[1];

  await openEquipment(page, target.candidate.slotIndex);
  await page.locator(`[data-remaked-search-result][data-value="${selected.value}"]`).click();
  const viaSearch = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());

  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), baseline);
  await page.evaluate(({ slotIndex, value }) => window.PandoraRemaked.adapter.selectEquipment(slotIndex, value), {
    slotIndex: target.candidate.slotIndex,
    value: selected.value
  });
  expect(viaSearch).toBe(await page.evaluate(() => window.PandoraRemaked.adapter.serialize()));
});

test('Soul Search explains missing sockets then rebuilds targets after equipping a socket item', async ({ page }) => {
  await openModern(page);
  await page.evaluate(() => window.PandoraRemaked.search.openSoulSearch(null));
  await expect(page.locator('[data-remaked-search-panel][data-search-kind="soul"]')).toBeVisible();
  const initialTargets = await page.evaluate(() => window.PandoraRemaked.adapter.listSoulTargets());
  if (!initialTargets.length) {
    await expect(page.getByText('No available Soul sockets', { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Close search', exact: true }).click();

  const socket = await findSocketBearingEquipment(page);
  expect(socket).not.toBeNull();
  await page.evaluate((target) => window.PandoraRemaked.search.openSoulSearch(target), socket.soulTarget);
  const panel = page.locator('[data-remaked-search-panel][data-search-kind="soul"]');
  await expect(panel).toBeVisible();
  const targetSelect = panel.locator('[data-remaked-search-target]');
  expect(await targetSelect.inputValue()).toBe(`${socket.soulTarget.slotIndex}:${socket.soulTarget.socketIndex}`);

  const expectedValues = await page.evaluate((target) => window.PandoraRemaked.adapter
    .listSoulOptions(target).map((option) => option.value), socket.soulTarget);
  expect(await resultValues(page)).toEqual(expectedValues);
});

test('Soul query filters localized names and selection keeps exact legacy payload semantics', async ({ page }) => {
  await openModern(page);
  const socket = await findSocketBearingEquipment(page);
  expect(socket).not.toBeNull();
  const options = await page.evaluate((target) => window.PandoraRemaked.adapter.listSoulOptions(target), socket.soulTarget);
  expect(options.length).toBeGreaterThan(1);
  const selected = options.find((option, index) => index > 0 && option.name.length >= 2) ?? options[1];

  await page.evaluate((target) => window.PandoraRemaked.search.openSoulSearch(target), socket.soulTarget);
  const query = selected.name.slice(0, Math.min(selected.name.length, 5));
  await page.locator('[data-remaked-search-query]').fill(query);
  expect(await resultValues(page)).toContain(selected.value);
  await page.locator(`[data-remaked-search-result][data-value="${selected.value}"]`).click();
  const viaSearch = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());

  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), socket.socketBuild);
  await page.evaluate(({ target, value }) => window.PandoraRemaked.adapter.selectSoul(target, value), {
    target: socket.soulTarget,
    value: selected.value
  });
  expect(viaSearch).toBe(await page.evaluate(() => window.PandoraRemaked.adapter.serialize()));
});

test('equipment picker supports arrows, Enter and one-key Escape inside a 390px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openModern(page);
  const opener = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
  await opener.focus();
  await opener.press('Enter');
  const panel = page.locator('[data-remaked-search-panel]');
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);

  const query = panel.locator('[data-remaked-search-query]');
  await query.focus();
  await query.press('ArrowDown');
  const focusedValue = await page.evaluate(() => document.activeElement?.dataset?.value || '');
  expect(focusedValue).not.toBe('');
  await page.keyboard.press('Enter');
  await expect(panel).toHaveCount(0);

  await opener.focus();
  await opener.press('Enter');
  await expect(page.locator('[data-remaked-search-panel]')).toBeVisible();
  const details = page.locator('[data-remaked-search-panel] details').first();
  if (await details.count()) {
    await details.evaluate((node) => { node.open = true; });
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-remaked-search-panel]')).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('equipment picker renders native type separators as headings and can filter by type', async ({ page }) => {
  await openModern(page);
  const target = await page.evaluate(() => window.PandoraRemaked.adapter.listEquipmentTargets()
    .map((candidate) => {
      const options = window.PandoraRemaked.adapter.listEquipmentOptions(candidate.slotIndex);
      let currentCategory = '';
      const categories = [];
      const groupHeadings = [];
      for (const option of options) {
        const heading = String(option.name || '').match(/^\+-----\s*(.+?)\s*$/)?.[1]?.trim() || '';
        if (heading) {
          currentCategory = heading;
          groupHeadings.push(heading);
          continue;
        }
        if (currentCategory && !categories.includes(currentCategory)) categories.push(currentCategory);
      }
      return { candidate, categories, groupHeadings };
    })
    .find((entry) => entry.categories.length >= 2));
  expect(target).toBeTruthy();

  const opener = page.locator(`[data-remaked-equipment-picker="${target.candidate.selectId}"]`);
  await opener.click();
  const panel = page.locator('[data-remaked-search-panel]');
  const filter = panel.locator('[data-remaked-picker-type-filter]');
  await expect(filter).toBeVisible();
  await expect(panel.locator('[data-remaked-picker-group]')).toHaveCount(target.groupHeadings.length);

  const selectedType = target.categories[1];
  await filter.selectOption({ label: selectedType });
  const expectedGroupCount = target.groupHeadings.filter((heading) => heading === selectedType).length;
  await expect(panel.locator('[data-remaked-picker-group]')).toHaveCount(expectedGroupCount);
  await expect(panel.locator('[data-remaked-picker-group]')).toHaveText(
    Array(expectedGroupCount).fill(selectedType)
  );

  await panel.locator('[data-remaked-search-query]').fill('__definitely_no_such_picker_item__');
  await expect(panel.locator('[data-remaked-search-empty-reset]')).toHaveText('Reset filter');
  await panel.locator('[data-remaked-search-empty-reset]').click();
  expect(await filter.inputValue()).toBe('');
  await expect(panel.locator('[data-remaked-search-result]').first()).toBeVisible();
});
