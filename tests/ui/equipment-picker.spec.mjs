import { test, expect } from '@playwright/test';

test('explicit desktop review survives its late automatic scroll; wheel still cancels it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const row = page.locator('[data-remaked-picker-panel] [data-remaked-search-row][data-value="8"]');
  await row.locator('summary').click();
  await page.evaluate(() => document.querySelector('[data-remaked-picker-panel] [data-remaked-search-results]').dispatchEvent(new Event('scroll', { bubbles: true })));
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await row.locator('summary').hover();
  await page.mouse.wheel(0, -1);
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  expect(await page.evaluate(() => Store())).toBe(before);
});

test('clicking info pins an already hovered card and a second click closes it', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  // Keep this fixture in view: scrolling must deliberately cancel pointer
  // hover, which is covered separately. Here we exercise hover -> explicit pin.
  await page.locator('[data-remaked-picker-panel] [data-remaked-search-query]').fill('Cutlass');
  const row = page.locator('[data-remaked-picker-panel] [data-remaked-search-row][data-value="8"]');
  await row.locator('button').hover();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await row.locator('summary').click();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await row.locator('summary').click();
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  expect(await page.evaluate(() => Store())).toBe(before);
});

for (const width of [320, 390, 1440]) test(`Equipment opens an anchored nonmodal dropdown and dismisses outside at ${width}px without changing the build`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  const opener = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
  await opener.click();
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  const dropdown = page.locator('[data-remaked-equipment-dropdown]');
  await expect(dropdown).toBeVisible();
  const triggerBox = await opener.boundingBox();
  const box = await dropdown.boundingBox();
  expect(Math.min(Math.abs(box.y - triggerBox.y - triggerBox.height), Math.abs(box.y + box.height - triggerBox.y))).toBeLessThanOrEqual(10);
  expect(box.width).toBeLessThanOrEqual(420);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  await opener.click();
  await expect(dropdown).toHaveCount(0);
  await opener.click();
  await expect(dropdown).toBeVisible();
  await page.locator('[data-remaked-header]').click({ position: { x: 5, y: 5 } });
  await expect(dropdown).toHaveCount(0);
  await expect(opener).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => Store())).toBe(before);
});

test('Equipment picker uses compact labelled info controls without a second characteristics row', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const row = page.locator('[data-remaked-search-row][data-value="8"]');
  await row.locator('button').hover();
  const itemBox = await row.locator('button').boundingBox();
  const infoBox = await row.locator('summary').boundingBox();
  expect(Math.abs(itemBox.y - infoBox.y)).toBeLessThanOrEqual(2);
  expect(infoBox.width).toBeLessThanOrEqual(44);
  await expect(row.locator('summary')).toHaveAccessibleName('Details');
  await page.locator('.remaked-search-close').click();
});

test('opening Equipment keeps the currently worn item in view without opening or changing it', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => {
    if (!PandoraRemaked.adapter.selectEquipment(0, '120011')) throw new Error('Cannot select last-page fixture');
    return Store();
  });
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const row = page.locator('[data-remaked-picker-panel] [data-remaked-search-row][data-value="120011"]');
  const itemBox = await row.locator('button').boundingBox();
  const listBox = await page.locator('[data-remaked-picker-panel] [data-remaked-search-results]').boundingBox();
  expect(itemBox.y).toBeGreaterThanOrEqual(listBox.y);
  expect(itemBox.y + itemBox.height).toBeLessThanOrEqual(listBox.y + listBox.height);
  await expect(row.locator('button')).toHaveAttribute('aria-pressed', 'true');
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  expect(await page.evaluate(() => Store())).toBe(before);
});

test('keyboard review survives late automatic scroll but PageDown and scrollbar intent cancel it', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').focus();
  await page.keyboard.press('ArrowDown');
  const panel = page.locator('[data-remaked-picker-panel]');
  const row = panel.locator('[data-remaked-search-row][data-value="8"]');
  await row.locator('button').focus();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await page.evaluate(() => document.querySelector('[data-remaked-picker-panel] [data-remaked-search-results]').dispatchEvent(new Event('scroll', { bubbles: true })));
  await expect(row.locator('details')).toHaveAttribute('open', '');
  await page.keyboard.press('PageDown');
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  await panel.locator('[data-remaked-search-query]').focus();
  await row.locator('button').focus();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await page.evaluate(() => document.querySelector('[data-remaked-picker-panel] [data-remaked-search-results]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  expect(await page.evaluate(() => Store())).toBe(before);
});

test('keyboard focus beyond the visible Equipment list keeps its card after automatic scroll; wheel cancels it', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').focus();
  await page.keyboard.press('ArrowDown');
  const value = await page.evaluate(() => {
    const options = PandoraRemaked.adapter.listEquipmentOptions(0);
    for (let index = options.length - 1; index >= 0; index--) {
      const id = Number(options[index].value);
      if (id % 10000 && PandoraRemaked.adapter.readItemDetails('equipment', id, 0).descriptions.length) return String(id);
    }
    throw new Error('No described last-page item');
  });
  const row = page.locator(`[data-remaked-picker-panel] [data-remaked-search-row][data-value="${value}"]`);
  await row.locator('button').focus();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await page.waitForTimeout(150);
  await expect(row.locator('details')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => Store())).toBe(before);
  await row.locator('button').hover();
  await page.mouse.wheel(0, -1);
  await page.waitForTimeout(550);
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  expect(await page.evaluate(() => Store())).toBe(before);
});

async function fixture(page) {
  return page.evaluate(() => {
    for (const option of PandoraRemaked.adapter.listEquipmentOptions(0)) {
      const id = Number(option.value);
      if (!id || ! (id % 10000)) continue;
      const item = PandoraRemaked.adapter.readItemDetails('equipment', id, 0);
      if (item.descriptions.length && item.sockets > 0) return { value: option.value, item };
    }
    throw new Error('No compatible described item with sockets');
  });
}

test('actual Equipment list previews after dwell, cancels on scroll and equips only on activation', async ({ page }) => {
  await page.goto('/');
  const f = await fixture(page);
  const before = await page.evaluate(() => ({ code: Store(), arrays: JSON.stringify(EquipData) }));
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const panel = page.locator('[data-remaked-picker-panel]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-remaked-search-target]')).toHaveCount(0);
  const row = panel.locator(`[data-remaked-search-row][data-value="${f.value}"]`);
  await row.locator('button').hover();
  await page.waitForTimeout(200);
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  await page.mouse.wheel(0, 1);
  await page.waitForTimeout(550);
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  await panel.locator('h2').hover();
  await row.locator('button').hover();
  await expect(row.locator('details')).toHaveAttribute('open', '');
  await expect(row.locator('[data-remaked-item-description]')).toContainText(f.item.descriptions[0]);
  expect(await page.evaluate(() => ({ code: Store(), arrays: JSON.stringify(EquipData) }))).toEqual(before);
  await row.locator('button').click();
  await expect(panel).toHaveCount(0);
  expect(await page.evaluate(() => String(Status.Equip[0][0]))).toBe(f.value);
  await expect(page.locator('[data-remaked-equipment-picker="SelEquip_0_4"]')).toBeVisible();
});

test('touch Equipment and Soul details are separate from selection; existing upgrade/socket state survives review', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const f = await fixture(page);
  await page.evaluate(f => {
    PandoraRemaked.adapter.selectEquipment(0, f.value);
    const node = document.getElementById('SelEquip_0_3');
    node.value = '4'; node.dispatchEvent(new Event('change', { bubbles: true }));
    const target = PandoraRemaked.adapter.listSoulTargets().find(t => t.slotIndex === 0);
    const soul = PandoraRemaked.adapter.listSoulOptions(target).find(o => Number(o.value) > 0);
    PandoraRemaked.adapter.selectSoul(target, soul.value);
  }, f);
  const before = await page.evaluate(() => Store());
  const geometry = await page.evaluate(() => {
    const button = document.querySelector('[data-remaked-equipment-picker="SelEquip_0_0"]');
    const section = button.closest('[data-remaked-picker-section]');
    return { width: button.getBoundingClientRect().width, sectionWidth: section.getBoundingClientRect().width };
  });
  expect(geometry.width).toBeGreaterThanOrEqual(geometry.sectionWidth - 24);
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const panel = page.locator('[data-remaked-picker-panel]');
  const row = panel.locator(`[data-remaked-search-row][data-value="${f.value}"]`);
  await row.locator('summary').click();
  const card = await row.locator('[data-remaked-item-description]').boundingBox();
  const rowBox = await row.boundingBox();
  expect(card.width).toBeGreaterThanOrEqual(rowBox.width - 2);
  await expect(row.locator('[data-remaked-item-description] strong')).toContainText('+4');
  await expect(row.locator('[data-remaked-socket][data-filled="true"]')).toHaveCount(1);
  expect(await page.evaluate(() => Store())).toBe(before);
  await panel.locator('.remaked-search-close').click();
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_4"]').click();
  const soul = panel.locator('[data-remaked-search-row]').filter({ has: page.locator('details') }).first();
  await soul.locator('summary').click();
  await expect(soul.locator('[data-remaked-item-description]')).toBeVisible();
  expect(await page.evaluate(() => Store())).toBe(before);
  await panel.locator('.remaked-search-close').click();
  await expect(page.locator('[data-remaked-equipment-picker="SelEquip_0_4"]')).toBeFocused();
});

test('search pointer click does not flash characteristics and wheel cancels a pending hover', async ({ page }) => {
  await page.goto('/');
  const f = await fixture(page);
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const row = page.locator(`[data-remaked-search-row][data-value="${f.value}"]`);
  await row.locator('button').hover();
  await page.waitForTimeout(200);
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  await page.mouse.wheel(0, 1);
  await page.waitForTimeout(550);
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  await page.evaluate(value => {
    window.fixturePreviewFlashed = false;
    const details = document.querySelector(`[data-remaked-search-row][data-value="${value}"] details`);
    new MutationObserver(() => { if (details.open) window.fixturePreviewFlashed = true; }).observe(details, { attributes: true, attributeFilter: ['open'] });
  }, f.value);
  await row.locator('button').click();
  expect(await page.evaluate(() => window.fixturePreviewFlashed)).toBe(false);
});

test('RU Equipment chrome, gem selectors and category headings use workbook terminology without changing the build', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.locator('[data-remaked-ui-locale="ru"]').click();

  await expect(page.locator('#TextEquip_0')).toHaveText('Снаряжение');
  await expect(page.locator('[data-remaked-equipment-reset]')).toHaveText('Сброс снаряжения');

  const labels = await page.evaluate(() => PandoraRemaked.adapter.listEquipmentTargets().map(target => target.label));
  expect(labels).toEqual([
    'Оружие', 'Щит', 'Шлем', 'Доспех', 'Перчатки', 'Штаны', 'Ботинки', 'Плащ',
    'Серьги · 1', 'Серьги · 2', 'Амулет', 'Пояс', 'Кольцо · 1', 'Кольцо · 2'
  ]);

  expect(await page.locator('#SelEquip_0_1 option').allTextContents()).toEqual(['Физ', 'Маг']);
  expect(await page.locator('#SelEquip_0_2 option').allTextContents()).toEqual(['Огонь', 'Лед', 'Молния', 'Яд', 'Свет', 'Тьма', 'Призма']);
  await expect(page.locator('#SelEquip_0_4 option').first()).toHaveText('Душа');

  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  const typeLabels = await page.locator('[data-remaked-picker-type-filter] option').allTextContents();
  expect(typeLabels).toEqual(expect.arrayContaining([
    'Одноручный меч', 'Двуручный меч', 'Одноручный топор', 'Двуручный топор',
    'Одноручное копьё', 'Двуручное копьё', 'Кинжал', 'Кастеты', 'Лук', 'Арбалет'
  ]));
  await page.locator('[data-remaked-picker-panel] .remaked-search-close').click();

  expect(await page.evaluate(() => Store())).toBe(before);
});

test('all fourteen actual slots have correct source labels and usable selection dropdowns', async ({ page }) => {
  await page.goto('/');
  const targets = await page.evaluate(() => PandoraRemaked.adapter.listEquipmentTargets());
  expect(targets).toHaveLength(14);
  expect(targets[9].label).toBe('Ear · 2');
  expect(targets[13].label).toBe('Ring · 2');
  for (const target of targets) {
    await page.locator(`[data-remaked-equipment-picker="${target.selectId}"]`).click();
    const panel = page.locator('[data-remaked-picker-panel]');
    await expect(panel.locator('h2')).toHaveText(target.label);
    const expected = await page.evaluate(slot => PandoraRemaked.adapter.listEquipmentOptions(slot).length, target.slotIndex);
    await expect(panel.locator('[data-remaked-search-result]')).toHaveCount(expected);
    await panel.locator('.remaked-search-close').click();
  }
});

test.describe('touch hardware emulation', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('explicit inline characteristics stay readable during scroll and close on a second tap', async ({ page }) => {
    await page.goto('/');
    const f = await fixture(page);
    const before = await page.evaluate(() => Store());
    await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').tap();
    const row = page.locator(`[data-remaked-picker-panel] [data-remaked-search-row][data-value="${f.value}"]`);
    await row.locator('summary').tap();
    await expect(row.locator('details')).toHaveAttribute('open', '');
    await page.evaluate(() => {
      document.querySelector('[data-remaked-search-results]').dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    await expect(row.locator('details')).toHaveAttribute('open', '');
    await row.locator('summary').tap();
    await expect(row.locator('details')).not.toHaveAttribute('open', '');
    expect(await page.evaluate(() => Store())).toBe(before);
  });
});

test('keyboard selection matches the original engine and Escape restores Equipment focus', async ({ page }) => {
  await page.goto('/');
  const f = await fixture(page);
  const original = await page.evaluate(() => Store());
  const expected = await page.evaluate(f => {
    const original = Store();
    PandoraRemaked.adapter.selectEquipment(0, f.value);
    const result = Store(); PandoraRemaked.adapter.load(original); return result;
  }, f);
  const opener = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
  await opener.focus(); await page.keyboard.press('ArrowDown');
  const panel = page.locator('[data-remaked-picker-panel]');
  await expect(panel.locator('[data-remaked-search-query]')).toBeFocused();
  await panel.locator('[data-remaked-search-query]').fill(f.item.name);
  await page.keyboard.press('Tab');
  const row = panel.locator(`[data-remaked-search-row][data-value="${f.value}"]`);
  await expect(row.locator('button')).toBeFocused();
  await expect(row.locator('details')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => Store())).toBe(original);
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => Store())).toBe(expected);
  await expect(opener).toBeFocused();
  await opener.press('Enter');
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
});

test('picker values, labels and socket visibility follow load, source-language and race redraw', async ({ page }) => {
  await page.goto('/');
  const f = await fixture(page);
  const saved = await page.evaluate(f => {
    PandoraRemaked.adapter.selectEquipment(0, f.value); return Store();
  }, f);
  await page.evaluate(() => PandoraRemaked.adapter.selectEquipment(0, '0'));
  await expect(page.locator('[data-remaked-equipment-picker="SelEquip_0_4"]')).toBeHidden();
  await page.evaluate(code => PandoraRemaked.adapter.load(code), saved);
  await expect(page.locator('[data-remaked-equipment-picker="SelEquip_0_4"]')).toBeVisible();
  await page.locator('[data-remaked-language="0"]').click();
  await expect.poll(() => page.evaluate(() => {
    const select = document.getElementById('SelEquip_0_0');
    return select._remakedPicker.textContent === select.options[select.selectedIndex].textContent.trim();
  })).toBe(true);
  expect(await page.evaluate(() => Store())).toBe(saved);
  await page.locator('[data-remaked-tab="0"]').click();
  await expect(page.locator('#SelRace')).toBeVisible();
  await page.locator('#SelRace').selectOption('1');
  const targets = await page.evaluate(() => PandoraRemaked.adapter.listEquipmentTargets());
  for (const target of targets) {
    const opener = page.locator(`[data-remaked-equipment-picker="${target.selectId}"]`);
    await expect(opener).toBeVisible();
    const expected = await page.evaluate(id => {
      const node = document.getElementById(id);
      // Modern removes only the category's decorative prefix, never a real
      // name or enhancement. Native options/values stay source-owned below.
      return node.options[node.selectedIndex].textContent.trim().replace(/^\+-----\s*/, '');
    }, target.selectId);
    await expect(opener).toHaveText(expected);
  }
});

test('clean category captions retain native options and do not strip a real leading enhancement', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  const opener = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
  const raw = await page.evaluate(() => document.getElementById('SelEquip_0_0').selectedOptions[0].textContent);
  expect(raw.trim()).toBe('+----- 1H Sword');
  await expect(opener).toHaveText('1H Sword');
  // Disposable DOM label, not a catalog publication or source formula change.
  await page.evaluate(() => { document.getElementById('SelEquip_0_0').selectedOptions[0].textContent = '+4 Knife'; PandoraRemaked.equipmentPicker.refresh(); });
  await expect(opener).toHaveText('+4 Knife');
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.evaluate(raw => { document.getElementById('SelEquip_0_0').selectedOptions[0].textContent = raw; PandoraRemaked.equipmentPicker.refresh(); }, raw);
  await expect(opener).toHaveText('1H Sword');
  expect(await page.evaluate(() => document.getElementById('SelEquip_0_0').selectedOptions[0].textContent)).toBe(raw);
});

test('without the enhancement script the original Equipment fields stay usable', async ({ page }) => {
  await page.route('**/modern/equipment-picker.js', route => route.abort());
  await page.goto('/');
  const f = await fixture(page);
  await expect(page.locator('#SelEquip_0_0')).toBeVisible();
  await expect(page.locator('[data-remaked-equipment-picker]')).toHaveCount(0);
  await page.locator('#SelEquip_0_0').selectOption(f.value);
  expect(await page.evaluate(() => String(Status.Equip[0][0]))).toBe(f.value);
  await expect(page.locator('#SelEquip_0_4')).toBeVisible();
});

test('load/evaluation rebuild stat-bearing equipment effects and rollback leaves the exact active build', async ({ page }) => {
  await page.goto('/');
  const original = await page.evaluate(() => ({ code: Store(), summary: PandoraRemaked.adapter.readCalculatedSummary() }));
  const selected = await page.evaluate(() => {
    // Cutlass has a literal STR +2 in preserved data; use the real handler.
    PandoraRemaked.adapter.selectEquipment(0, '8');
    return { code: Store(), summary: PandoraRemaked.adapter.readCalculatedSummary(), strength: Status.STR[2] };
  });
  expect(selected.strength).toBe(2);
  const evaluated = await page.evaluate(code => PandoraRemaked.adapter.evaluateBuild(code), original.code);
  expect(evaluated.summary).toEqual(original.summary);
  expect(await page.evaluate(() => ({ code: Store(), summary: PandoraRemaked.adapter.readCalculatedSummary() }))).toEqual({ code: selected.code, summary: selected.summary });
  await page.evaluate(code => PandoraRemaked.adapter.load(code), original.code);
  expect(await page.evaluate(() => ({ code: Store(), summary: PandoraRemaked.adapter.readCalculatedSummary() }))).toEqual(original);
  await page.evaluate(code => PandoraRemaked.adapter.load(code), selected.code);
  expect(await page.evaluate(() => ({ code: Store(), summary: PandoraRemaked.adapter.readCalculatedSummary() }))).toEqual({ code: selected.code, summary: selected.summary });
});

test('phone bulk modifiers fit the Equipment section, recalculate through Legacy and reset with keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const original = await page.evaluate(() => Store());
  await page.evaluate(() => PandoraRemaked.adapter.selectEquipment(0, '8'));
  const reference = await page.evaluate(() => {
    const original = Store();
    const enhance = document.getElementById('SelEquip_0_3');
    enhance.value = '4'; enhance.dispatchEvent(new Event('change', { bubbles: true }));
    const result = PandoraRemaked.adapter.readCalculatedSummary();
    PandoraRemaked.adapter.load(original); return result;
  });
  const toolbar = page.locator('[data-remaked-picker-toolbar]');
  const section = await page.locator('[data-remaked-picker-section]').boundingBox();
  const bulk = toolbar.locator('select').nth(1);
  for (const control of [toolbar.locator('select').first(), bulk, toolbar.locator('button')]) {
    const box = await control.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(section.x);
    expect(box.x + box.width).toBeLessThanOrEqual(section.x + section.width);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await bulk.selectOption({ index: 4 });
  expect(await page.evaluate(() => PandoraRemaked.adapter.readCalculatedSummary())).toEqual(reference);
  await toolbar.locator('button').focus(); await page.keyboard.press('Enter');
  expect(await page.evaluate(() => Store())).toBe(original);
  await expect(page.locator('[data-remaked-equipment-picker="SelEquip_0_4"]')).toBeHidden();
});

test('Equipment reset fits its text instead of inheriting a fixed Legacy width, with bounded long translations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  // A wider installed/fallback font must not turn an ordinary desktop action
  // into two lines. Linux and Windows need not have identical font metrics.
  await page.addStyleTag({ content: ':root { --rm-font: monospace; }' });
  const toolbar = page.locator('[data-remaked-picker-toolbar]');
  const reset = toolbar.locator('[data-remaked-equipment-reset]');
  await expect(reset).toHaveText('Equipment reset');
  expect((await reset.boundingBox()).height).toBeLessThanOrEqual(40);
  const initial = await page.evaluate(() => Store());
  const longLabel = 'Сбросить всё надетое снаряжение персонажа '.repeat(12);
  await page.evaluate(label => { document.getElementById('Text_26').textContent = label; }, longLabel);
  await expect(reset).toHaveText(longLabel.trim());
  for (const width of [1440, 701, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const section = await page.locator('[data-remaked-picker-section]').boundingBox();
    const box = await reset.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(section.x);
    expect(box.x + box.width).toBeLessThanOrEqual(section.x + section.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await reset.focus(); await page.keyboard.press('Enter');
  expect(await page.evaluate(() => Store())).toBe(initial);
});
