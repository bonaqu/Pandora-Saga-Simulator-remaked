import { test, expect } from '@playwright/test';

test('RU equipment previews use published D1 terminology for class, category and DEF without changing builds', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const adapter = PandoraRemaked.adapter, i18n = PandoraRemaked.i18n;
    const before = Store();
    const chosen = EquipData[0][32].findIndex((row, index) =>
      index > 0 && row && /(?:^|_)49=/.test(String(row[7])) && Boolean(row[16]));
    if (chosen < 1) throw new Error('No defensive gloves compatible with Warrior in source');
    const value = 320000 + chosen;
    i18n.setLocale('ru');
    const offline = adapter.readItemDetails('equipment', value, 4);
    // Source arrays are not edited. The public localization shape is identical
    // to /api/localization, but with distinct values to catch stale Legacy text.
    const overrides = { ui: { ru: { 'search.itemStatDefense': 'Защита Д1' }, en: {}, jp: {}, tw: {} },
      game: { ru: { 'equipment_category.32': 'Перчатки Д1', 'job.0': 'Воин Д1' }, en: {}, jp: {}, tw: {} } };
    if (!i18n.applyUnifiedLocalization({ ok: true, schemaVersion: 1, overrides }))
      throw new Error('Unified translation rejected');
    i18n.setLocale('ru');
    const russian = adapter.readItemDetails('equipment', value, 4);
    i18n.setLocale('en');
    const english = adapter.readItemDetails('equipment', value, 4);
    return { offline, russian, english, before, after: Store() };
  });
  expect(result.offline.category).toBe('Перчатки');
  expect(result.offline.classes).toContain('Воин');
  expect(result.offline.baseStats).toContainEqual(expect.objectContaining({ label: 'Защита' }));
  expect(result.russian.category).toBe('Перчатки Д1');
  expect(result.russian.classes).toContain('Воин Д1');
  expect(result.russian.baseStats).toContainEqual(expect.objectContaining({ label: 'Защита Д1' }));
  expect(result.english.category).not.toBe('Перчатки Д1');
  expect(result.english.classes).not.toContain('Воин Д1');
  expect(result.english.baseStats).toContainEqual(expect.objectContaining({ label: 'Defense' }));
  expect(result.after).toBe(result.before);
});

test('open Equipment picker invalidates cached previews when a D1 translation arrives', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const panel = page.locator('[data-remaked-picker-panel]');
  const row = panel.locator('[data-remaked-search-row]').filter({ has: page.locator('details') }).first();
  await expect(row).toHaveCount(1);
  await row.locator('summary').click();
  await expect(row.locator('.remaked-item-title')).toBeVisible();
  const changed = await page.evaluate(() => {
    const old = document.querySelector('[data-remaked-picker-panel] [data-remaked-search-row]');
    const data = {
      ui: { ru: { 'search.itemStatDefense': 'Защита из D1' }, en: {}, jp: {}, tw: {} },
      game: { ru: { 'job.0': 'Воин из D1' }, en: {}, jp: {}, tw: {} }
    };
    if (!PandoraRemaked.i18n.applyUnifiedLocalization({ ok: true, schemaVersion: 1, overrides: data }))
      throw new Error('Published camelCase UI keys must be accepted');
    return old !== document.querySelector('[data-remaked-picker-panel] [data-remaked-search-row]');
  });
  expect(changed).toBe(true);
  expect(await page.evaluate(() => Store())).toBe(before);
});

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
  await expect(page.locator('[data-remaked-search-panel]')).toHaveCount(0);
  await expect(page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]')).toBeFocused();
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

test('compact equipment effects regain meaningful line breaks without changing numbers', async ({ page }) => {
  await page.goto('/');
  const example = 'ПРВ +1За каждые 2 единицы улучшения:Скорость атаки +2%При улучшении на +7 и выше: ПРВ +1';
  const actual = await page.evaluate(value => PandoraRemaked.catalogText.lines(value), example);
  expect(actual).toBe([
    'ПРВ +1',
    'За каждые 2 единицы улучшения:',
    'Скорость атаки +2%',
    'При улучшении на +7 и выше: ПРВ +1'
  ].join('\n'));
  expect(actual.replace(/\s/g, '')).toBe(example.replace(/\s/g, ''));
});


test('a published Soul modifier replaces only its own description field', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const i18n = PandoraRemaked.i18n, adapter = PandoraRemaked.adapter;
    const language = Number(Flag[0]);
    let id = 0;
    const plain = value => {
      const node = document.createElement('div');
      node.innerHTML = String(value || '');
      return node.textContent.trim();
    };
    for (let index = 1; index < SoulData[language].length; index++) {
      const row = SoulData[language][index];
      if (row && plain(row[1]) && plain(row[2]) && adapter.readItemDetails('soul',index)?.descriptions.length >= 2) {
        id = index; break;
      }
    }
    if (!id) throw Error('Expected a Soul with modifiers and a description');
    const before = adapter.readItemDetails('soul',id);
    const originals = JSON.stringify([EquipData,SoulData]);
    const locale = i18n.getLocale();
    const data = { ui: { ru: {}, en: {}, jp: {}, tw: {} }, game: { ru: {}, en: {}, jp: {}, tw: {} } };
    data.game[locale]['soul.'+id+'.modifiers'] = 'UNIQUE SOUL MODIFIER';
    if (!i18n.applyUnifiedLocalization({ ok: true, schemaVersion: 1, overrides: data }))
      throw Error('Localization rejected');
    const after = adapter.readItemDetails('soul',id);
    return { before: before.descriptions, after: after.descriptions,
      unchanged: originals === JSON.stringify([EquipData,SoulData]) };
  });
  expect(result.before.length).toBeGreaterThanOrEqual(2);
  expect(result.after[0]).toBe('UNIQUE SOUL MODIFIER');
  expect(result.after.slice(1)).toEqual(result.before.slice(1));
  expect(result.after.filter(line=>line.includes('UNIQUE SOUL MODIFIER'))).toHaveLength(1);
  expect(result.unchanged).toBe(true);
});


test('equipment hover card uses in-game inspired dark legible sections while preserving data',async({page})=>{
  await page.goto('/');
  const before=await page.evaluate(()=>JSON.stringify([EquipData,SoulData,Store()]));
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const row=page.locator('[data-remaked-search-row]').filter({
    has:page.locator('[data-remaked-item-description]')
  }).first();
  await expect(row).toBeVisible();
  await row.locator('summary').click();
  const tip=row.locator('[data-remaked-item-description]');
  await expect(tip).toBeVisible();
  await expect(tip.locator('.remaked-item-title')).toBeVisible();
  await expect(tip.locator('.remaked-item-metadata')).toBeVisible();
  const css=await tip.evaluate(node=>{
    const style=getComputedStyle(node);
    return {background:style.backgroundImage,color:style.color,border:style.borderStyle,
      paragraphs:[...node.querySelectorAll('.remaked-item-prose')].map(x=>getComputedStyle(x).whiteSpace)};
  });
  expect(css.background).toContain('linear-gradient');
  expect(css.border).toBe('ridge');
  expect(css.paragraphs.every(x=>x==='pre-wrap')).toBe(true);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>JSON.stringify([EquipData,SoulData,Store()]))).toBe(before);
});

test('large equipment results avoid eagerly calculating off-screen item previews', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const adapter = PandoraRemaked.adapter;
    window.originalPreviewReader = adapter.readItemDetails;
    window.previewReadCount = 0;
    adapter.readItemDetails = function () {
      window.previewReadCount += 1;
      return window.originalPreviewReader.apply(this, arguments);
    };
  });
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const results = page.locator('[data-remaked-picker-panel] [data-remaked-search-result]');
  const total = await results.count();
  expect(total).toBeGreaterThan(30);
  const originalCalls = await page.evaluate(() => window.previewReadCount);
  // Opening and rendering a full list must not calculate every hidden card.
  expect(originalCalls).toBeLessThan(5);
  const first = page.locator('[data-remaked-picker-panel] [data-remaked-search-row]').filter({
    has: page.locator('details')
  }).first();
  await first.locator('summary').click();
  await expect(first.locator('.remaked-item-title')).toBeVisible();
  const afterOpen = await page.evaluate(() => window.previewReadCount);
  expect(afterOpen).toBe(originalCalls + 1);

  await first.locator('details').evaluate(node => { node.open = false; });
  await expect(first.locator('details')).not.toHaveAttribute('open', '');
  await first.locator('details').evaluate(node => { node.open = true; });
  await expect(first.locator('.remaked-item-title')).toBeVisible();
  expect(await page.evaluate(() => window.previewReadCount)).toBe(afterOpen);

  await page.locator('[data-remaked-picker-panel] [data-remaked-search-query]').fill('nonexistent-unique-item-12345');
  await expect(results).toHaveCount(0);
  expect(await page.evaluate(() => window.previewReadCount)).toBe(afterOpen);
  await page.locator('[data-remaked-picker-panel] [data-remaked-search-query]').fill('');
  await expect(results).toHaveCount(total);
  // Refreshing the list still must not eagerly recalculate hidden details.
  expect(await page.evaluate(() => window.previewReadCount)).toBe(afterOpen);
});

test('Soul search uses lazy previews without altering socket selection or original build', async ({ page }) => {
  await page.goto('/');
  const picked = await page.evaluate(() => {
    const targets = PandoraRemaked.adapter.listSoulTargets();
    return targets.length ? targets[0] : null;
  });
  if (!picked) {
    // Empty Soul sockets are covered in search-builds.spec.mjs; this test
    // observes a compatible socket only where the native engine exposes it.
    return;
  }
  const current = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  await page.evaluate(() => {
    const adapter = PandoraRemaked.adapter;
    const original = adapter.readItemDetails;
    window.soulPreviewCalls = 0;
    adapter.readItemDetails = function (kind) {
      if (kind === 'soul') window.soulPreviewCalls += 1;
      return original.apply(this, arguments);
    };
  });
  await page.evaluate(target => PandoraRemaked.search.openSoulSearch(target), picked);
  const rows = page.locator('[data-remaked-search-row]').filter({ has: page.locator('details') });
  await expect(rows.first()).toBeVisible();
  expect(await page.evaluate(() => window.soulPreviewCalls)).toBe(0);
  const first = rows.first();
  await first.locator('summary').click();
  await expect(first.locator('.remaked-item-title')).toBeVisible();
  expect(await page.evaluate(() => window.soulPreviewCalls)).toBe(1);
  await page.locator('.remaked-search-close').click();
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(current);
});
