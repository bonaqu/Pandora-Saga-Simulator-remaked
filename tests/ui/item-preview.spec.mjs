import { test, expect } from '@playwright/test';

test('slot rings match source counts and equipped upgrades do not leak into another candidate', async ({ page }) => {
  await page.goto('/');
  const fixtures = await page.evaluate(() => {
    const adapter = PandoraRemaked.adapter, found = {};
    for (const target of adapter.listEquipmentTargets()) {
      for (const option of adapter.listEquipmentOptions(target.slotIndex)) {
        const id = Number(option.value), data = EquipData[0][Math.floor(id / 10000)]?.[id % 10000];
        if (id % 10000 && [1, 2, 3].includes(data?.[5]) && !found[data[5]]) found[data[5]] = { slot: target.slotIndex, value: option.value };
      }
    }
    return found;
  });
  expect(Object.keys(fixtures).sort()).toEqual(['1', '2', '3']);
  for (const [count, fixture] of Object.entries(fixtures)) {
    await page.evaluate(f => PandoraRemaked.search.openEquipmentSearch(f.slot), fixture);
    const row = page.locator(`[data-remaked-search-row][data-value="${fixture.value}"]`);
    await row.locator('summary').click();
    await expect(row.locator('[data-remaked-socket]')).toHaveCount(Number(count));
    await page.locator('.remaked-search-close').click();
  }
  const item = fixtures['3'];
  const selected = await page.evaluate(f => {
    const adapter = PandoraRemaked.adapter;
    if (!adapter.selectEquipment(f.slot, f.value)) throw new Error('Fixture not compatible');
    const enhance = document.getElementById(`SelEquip_${f.slot}_3`);
    enhance.value = '4'; enhance.dispatchEvent(new Event('change', { bubbles: true }));
    const target = adapter.listSoulTargets().find(t => t.slotIndex === f.slot);
    const soul = adapter.listSoulOptions(target).find(s => Number(s.value) > 0);
    if (!soul || !adapter.selectSoul(target, soul.value)) throw new Error('No compatible Soul');
    return { code: Store(), soul: soul.value, arrays: JSON.stringify(EquipData) + JSON.stringify(SoulData) };
  }, item);
  await page.evaluate(f => PandoraRemaked.search.openEquipmentSearch(f.slot), item);
  const row = page.locator(`[data-remaked-search-row][data-value="${item.value}"]`);
  await row.locator('summary').click();
  await expect(row.locator('[data-remaked-item-description] strong')).toContainText('+4');
  await expect(row.locator('[data-remaked-socket][data-filled="true"]')).toHaveCount(1);
  await expect(row.locator('[data-remaked-socket][data-filled="false"]')).toHaveCount(2);
  const before = await page.evaluate(() => ({ code: Store(), arrays: JSON.stringify(EquipData) + JSON.stringify(SoulData) }));
  expect(before).toEqual({ code: selected.code, arrays: selected.arrays });
  const other = page.locator('[data-remaked-search-row]').filter({ has: page.locator('details') }).filter({ hasNot: page.locator(`[data-remaked-search-result][data-value="${item.value}"]`) }).first();
  await other.locator('summary').click();
  await expect(other.locator('[data-remaked-item-description] strong')).not.toContainText('+4');
  await expect(other.locator('[data-remaked-socket][data-filled="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => Store())).toBe(selected.code);
});

test('equipment hover and keyboard preview expose Legacy descriptions without equipping', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => ({ code: window.Store(), data: JSON.stringify(window.EquipData) }));
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const fixture = await page.evaluate(() => {
    for (const option of PandoraRemaked.adapter.listEquipmentOptions(0)) {
      const id = Number(option.value);
      if (!id || id % 10000 === 0) continue;
      const source = EquipData[1][Math.floor(id / 10000)][id % 10000];
      const node = document.createElement('div'); node.innerHTML = source[1];
      const expected = node.textContent.trim();
      if (expected) return { value: option.value, name: option.name, expected };
    }
    throw new Error('No compatible item with a nonempty Legacy description');
  });
  expect(fixture.expected).not.toBe('');
  const row = page.locator(`[data-remaked-search-row][data-value="${fixture.value}"]`);
  await row.locator('[data-remaked-search-result]').hover();
  await expect(row.locator('details')).toHaveAttribute('open', '');
  await expect(row.locator('[data-remaked-item-description]')).toContainText(fixture.expected);
  await row.locator('[data-remaked-item-description]').hover();
  const query = page.locator('[data-remaked-search-query]');
  await query.hover();
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  await query.fill(fixture.name);
  await expect(page.locator('[data-remaked-search-result]')).toHaveCount(1);
  await query.focus();
  await page.keyboard.press('Tab');
  await expect(row.locator('[data-remaked-search-result]')).toBeFocused();
  await expect(row.locator('details')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-remaked-search-panel]')).toBeVisible();
  expect(await page.evaluate(() => ({ code: window.Store(), data: JSON.stringify(window.EquipData) }))).toEqual(before);
});

test('touch detail action does not equip, and Soul descriptions come from preserved arrays', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => {
    const adapter = window.PandoraRemaked.adapter;
    adapter.selectEquipment(0, '1');
    // Test setup exposes the existing socket selector without changing source arrays.
    document.getElementById('SelEquip_0_4').style.display = '';
  });
  const before = await page.evaluate(() => ({ code: window.Store(), data: JSON.stringify(window.SoulData) }));
  await page.evaluate(() => window.PandoraRemaked.search.openSoulSearch({ slotIndex: 0, socketIndex: 4 }));
  const row = page.locator('[data-remaked-search-row]').filter({ has: page.locator('[data-remaked-search-result]:not([data-value="0"])') }).first();
  await row.locator('summary').click();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  const value = await row.getAttribute('data-value');
  const expected = await page.evaluate(value => {
    const node = document.createElement('div'); node.innerHTML = window.SoulData[1][Number(value)][2];
    return node.textContent.trim();
  }, value);
  expect(expected).not.toBe('');
  await expect(row.locator('[data-remaked-item-description]')).toContainText(expected);
  expect(await page.evaluate(() => ({ code: window.Store(), data: JSON.stringify(window.SoulData) }))).toEqual(before);
});
