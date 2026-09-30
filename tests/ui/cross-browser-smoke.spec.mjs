import { test, expect } from '@playwright/test';
import { compileRecord, draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import character from '../../data/generated/character.v1.json' with { type: 'json' };
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };

test('native class parameters and racial replacement survive pinned-code load in each browser engine', async ({ page }) => {
  await page.goto('/');
  const records = ['job.0', 'racial_skill.0.2'].map(id => {
    const source = character.records.find(record => record.id === id);
    const identity = { id, kind: source.kind, category: source.category, index: source.index }; const edit = draftFromSource(source, source.kind);
    if (source.kind === 'class') edit.progression[0] += 100;
    else { edit.effectMode = 'replace'; edit.effects = [{ stat: 8, value: 20, unit: 'flat' }]; }
    return compileRecord(validateDraft(edit, identity), identity, source);
  });
  const result = await page.evaluate(data => {
    const api = window.PandoraRemaked; window.Status.Job[1] = 2; window.CalcSet('ALL');
    const original = api.adapter.serialize(); const lp = window.Status.LP;
    api.catalog.applySnapshot(data); const code = api.adapter.serialize(); const published = { lp: window.Status.LP, pot: window.Status.POT };
    api.adapter.load(original); const source = { lp: window.Status.LP, pot: window.Status.POT };
    api.adapter.load(code); return { lp, published, source, loaded: { lp: window.Status.LP, pot: window.Status.POT }, slot: window.Status.Job[1] };
  }, { ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256, characterSourceFingerprint: character.sourceFingerprint, revision: 1, records });
  expect(result.published).toEqual({ lp: result.lp + 100, pot: 120 }); expect(result.source).toEqual({ lp: result.lp, pot: 115 }); expect(result.loaded).toEqual(result.published); expect(result.slot).toBe(2);
});

test('IDDQD login is a keyboard-accessible native modal with unchanged character state', async ({ page }) => {
  await page.goto('/'); const before = await page.evaluate(() => Store());
  await page.keyboard.type('IDDQD');
  const dialog = page.locator('[data-remaked-admin-entry]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[name="password"]')).toBeFocused();
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
});

test('calculator code rejects invalid data, restores compressed data and riding works by keyboard', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 900 }); await page.goto('/');
  await page.locator('[data-remaked-step="remaked-level-up3"]').click();
  const before = await page.evaluate(() => { localStorage.file = 'legacy-sentinel'; return Store(); });
  await page.locator('[data-remaked-code-action="create"]').focus(); await page.keyboard.press('Enter');
  const code = await page.locator('#InCode').inputValue();
  await page.locator('#InCode').fill('1,2,3'); await page.locator('#InCode').press('Enter');
  expect(await page.evaluate(() => Store())).toBe(before);
  await expect(page.locator('#InCode')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('[data-remaked-calculator-action="Text_9"]').click();
  await page.locator('#InCode').fill(code); await page.locator('#InCode').press('Enter');
  expect(await page.evaluate(() => Store())).toBe(before);
  expect(await page.evaluate(() => localStorage.file)).toBe('legacy-sentinel');
  const horse = page.locator('[data-remaked-calculator-action="Text_16"]');
  await horse.focus(); await page.keyboard.press('Space');
  await expect(horse).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('native skill steps, full branch names and explicit effects work on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.goto('/');
  await expect(page.locator('#TextSkill_9')).toHaveText('Assassination');
  await page.locator('[data-remaked-step="remaked-level-up3"]').click();
  const initial = await page.evaluate(() => Store());
  const expected = await page.evaluate(() => { document.getElementById('remaked-skill-1-Adeptness-right1').click(); return Store(); });
  await page.evaluate(code => PandoraRemaked.adapter.load(code), initial);
  await page.locator('[data-remaked-skill-step="remaked-skill-1-Adeptness-right1"]').focus();
  await page.keyboard.press('Space'); expect(await page.evaluate(() => Store())).toBe(expected);
  await page.locator('[data-remaked-effect="1"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#POTView')).toBeVisible();
  expect(await page.evaluate(() => Store())).toBe(expected);
  expect(await page.locator('#SkillSet').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
});

test('native calculator steps retain callback parity and phone primary sections reflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const button = page.locator('[data-remaked-step="remaked-level-up3"]');
  await button.focus(); await page.keyboard.press('Space');
  await expect(page.locator('#StatusLev')).toHaveText('55');
  const before = await page.evaluate(() => Store());
  const expected = await page.evaluate(() => { document.getElementById('remaked-attribute-STR-up1').click(); return Store(); });
  await page.evaluate(code => PandoraRemaked.adapter.load(code), before);
  await page.locator('[data-remaked-step="remaked-attribute-STR-up1"]').click();
  expect(await page.evaluate(() => Store())).toBe(expected);
  const bounds = await page.locator('#SkillSet').boundingBox();
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});

test('off-screen Equipment keyboard review survives automatic scroll but not wheel input', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').focus();
  await page.keyboard.press('ArrowDown');
  const row = page.locator('[data-remaked-picker-panel] [data-remaked-search-row][data-value="120011"]');
  await row.locator('button').focus();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await page.waitForTimeout(150);
  // WebKit can deliver focus-induced scrolling after the preview's render
  // frames. Preserve keyboard review independent of that event's timing.
  await page.evaluate(() => document.querySelector('[data-remaked-picker-panel] [data-remaked-search-results]').dispatchEvent(new Event('scroll', { bubbles: true })));
  await expect(row.locator('details')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => Store())).toBe(before);
  await row.locator('button').hover();
  await page.mouse.wheel(0, -1);
  await page.waitForTimeout(550);
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  expect(await page.evaluate(() => Store())).toBe(before);
});

test('actual Equipment picker separates review and selection and preserves native-engine parity', async ({ page }) => {
  await page.goto('/');
  const original = await page.evaluate(() => Store());
  const opener = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
  await opener.click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('[data-remaked-equipment-dropdown]')).toBeVisible();
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  const panel = page.locator('[data-remaked-picker-panel]');
  const row = panel.locator('[data-remaked-search-row][data-value="2"]');
  await row.locator('summary').click();
  await page.evaluate(() => document.querySelector('[data-remaked-picker-panel] [data-remaked-search-results]').dispatchEvent(new Event('scroll', { bubbles: true })));
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  expect(await page.evaluate(() => Store())).toBe(original);
  await row.locator('button').click();
  await expect(panel).toHaveCount(0);
  await expect(opener).toBeFocused();
  const selected = await page.evaluate(() => Store());
  const expected = await page.evaluate(code => {
    PandoraRemaked.adapter.load(code);
    const select = document.getElementById('SelEquip_0_0');
    select.value = '2'; select.dispatchEvent(new Event('change', { bubbles: true }));
    return Store();
  }, original);
  expect(selected).toBe(expected);
});

test('item preview and shared build link work without mutating Legacy data', async ({ page, browser }) => {
  await page.goto('/');
  const before = await page.evaluate(() => ({ code: Store(), data: JSON.stringify(EquipData) }));
  await page.locator('[data-remaked-equipment-search]').click();
  const row = page.locator('[data-remaked-search-row][data-value="1"]');
  await row.locator('summary').click();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await row.locator('summary').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await page.evaluate(() => ({ code: Store(), data: JSON.stringify(EquipData) }))).toEqual(before);
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-share-build]').click();
  const url = await page.locator('[data-remaked-share-url]').inputValue();
  const recipientContext = await browser.newContext();
  try {
    const recipient = await recipientContext.newPage();
    await recipient.goto(url);
    await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
    expect(await recipient.evaluate(() => Store())).toBe(before.code);
  } finally { await recipientContext.close(); }
});

test('native Modern dialogs keep focus and restore their opener', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  for (const selector of ['[data-remaked-equipment-search]', '[data-remaked-builds-open]', '[data-remaked-compare-open]', '[data-remaked-updates-open]']) {
    const opener = page.locator(selector);
    await opener.focus(); await page.keyboard.press('Enter');
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toHaveCount(1);
    await page.locator('[data-remaked-ui-locale="ru"]').evaluate(node => node.focus());
    expect(await page.evaluate(() => Boolean(document.activeElement.closest('dialog[open]')))).toBe(true);
    await dialog.locator('button').first().focus();
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement.closest('dialog[open]')))).toBe(true);
    await page.keyboard.press('Tab');
    await expect(dialog.locator('button').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
  expect(await page.evaluate(() => Store())).toBe(before);
});

    for (const route of ['/', '/legacy/']) {
      test(`compressed build round-trip and runtime at ${route}`, async ({ page }) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(route);
        await expect(page.locator('#Status_6')).not.toHaveText('');
        const saved = await page.evaluate(() => {
          const payload = Store();
          File('Save', 0);
          return { payload, compressed: localStorage.file };
        });
        await page.evaluate(() => {
          const race = document.getElementById('SelRace');
          race.selectedIndex = 1;
          race.dispatchEvent(new Event('change', { bubbles: true }));
        });
        expect(await page.evaluate(() => Store())).not.toBe(saved.payload);
        await page.evaluate(() => File('Load', 0));
        expect(await page.evaluate(() => Store())).toBe(saved.payload);
        expect(await page.evaluate(() => localStorage.file)).toBe(saved.compressed);
        if (route === '/legacy/') expect(await page.evaluate(() => [...document.scripts].some(script => /modern\//.test(script.src)))).toBe(false);
        expect(errors).toEqual([]);
      });
    }

    test('Modern RU display, source search and keyboard Escape at 390px', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/');
      const source = await page.evaluate(() => {
        Object.assign(PandoraRemakedGameTerms.ru, { 'race.0': 'Проверочная раса', 'equipment.0.1': 'Проверочный предмет' });
        return { name: PandoraRemaked.adapter.listEquipmentOptions(0).find(option => option.value === '1').name, payload: Store() };
      });
      await page.locator('[data-remaked-ui-locale="ru"]').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#StatusRace')).toHaveText('Проверочная раса');
      const opener = page.locator('[data-remaked-equipment-search]');
      await opener.focus();
      await page.keyboard.press('Enter');
      await page.locator('[data-remaked-search-query]').fill(source.name);
      await expect(page.locator('[data-remaked-search-result][data-value="1"]')).toContainText('Проверочный предмет');
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-remaked-search-panel]')).toHaveCount(0);
      await expect(opener).toBeFocused();
      expect(await page.evaluate(() => Store())).toBe(source.payload);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
