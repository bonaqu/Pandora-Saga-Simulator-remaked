import { test, expect } from '@playwright/test';

test('skill descriptions paint above the scroll panel and dismiss cleanly in each engine', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => { Flag[3] = 1; StatusMove('Lev', 54); CalcSet('Lev'); Status.Job[2] = 2; CalcSet('Job'); });
  const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  await page.locator('[data-remaked-tab="1"]').click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 568 });
    const icon = page.locator('#LearnSkillIcon_0_15'), tip = page.locator('#LearnSkill_0_15');
    await icon.focus(); await expect(tip).toBeVisible();
    const bounds = await tip.evaluate(node => {
      const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.right - 12, r.bottom - 12);
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, painted: node.contains(hit) || node === hit };
    });
    expect(bounds.painted).toBe(true); expect(bounds.left).toBeGreaterThanOrEqual(8); expect(bounds.top).toBeGreaterThanOrEqual(8);
    expect(bounds.right).toBeLessThanOrEqual(width - 7); expect(bounds.bottom).toBeLessThanOrEqual(561);
    await tip.click(); await expect(tip).toBeVisible();
    await page.keyboard.press('Escape'); await expect(tip).toBeHidden(); await expect(icon).toBeFocused();
    await icon.press('Enter'); await expect(tip).toBeVisible();
    await page.locator('[data-remaked-tab="2"]').click(); await expect(tip).toBeHidden();
    await page.locator('[data-remaked-tab="1"]').click();
  }
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before); expect(errors).toEqual([]);
});

test('native recovery data aliases are temporary and safe in each browser engine', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    Flag[2] = 4; const original = EquipOpt; EquipOpt = []; Calc('MPRec');
    const base = Number(document.getElementById('Status_13').textContent);
    EquipOpt[15] = ['1']; const fixture = EquipOpt; Calc('MPRec');
    const output = { base, value: Number(document.getElementById('Status_13').textContent), identity: EquipOpt === fixture, alias: Object.hasOwn(EquipOpt, '13,15') };
    EquipOpt = original; return output;
  });
  expect(result.value).toBe(result.base + 1); expect(result.identity).toBe(true); expect(result.alias).toBe(false);
});
import { compileRecord, draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };
import skills from '../../data/generated/skills.v1.json' with { type: 'json' };
import { adminOrigin, routeSyntheticWorker } from './helpers/admin-worker-fixture.mjs';
import { assertWorkspaceFits } from './helpers/desktop-workspace.mjs';
import { variant, snapshot } from './helpers/skill-variants.mjs';

test('every inspector switches, floats and closes without changing the build, even after scroll or short-screen resize', async ({ page }) => {
  // This deliberately performs ten full popup switch/close/resize cycles.
  // WebKit can cross the default 30s whole-test budget under CI load even
  // when every interaction succeeds, so give this smoke contract its own cap.
  test.setTimeout(60_000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'RU', exact: true }).click();
    for (const tab of [0, 1, 2, 3, 4]) {
      const opener = page.locator('[data-remaked-tab="' + tab + '"]');
      const panel = page.locator('[data-remaked-native-panel="' + tab + '"]');
      await opener.click(); await expect(panel).toBeVisible();
      await expect(page.locator('[data-remaked-native-panel]:visible')).toHaveCount(1);
      await expect(panel).toHaveAttribute('role', 'dialog');
      expect(await panel.evaluate(node => getComputedStyle(node).position)).toBe('fixed');
      const next = (tab + 1) % 5;
      await page.locator('[data-remaked-tab="' + next + '"]').click();
      await expect(panel).toBeHidden(); await expect(opener).toHaveAttribute('aria-expanded', 'false');
      await page.locator('[data-remaked-tab="' + next + '"]').click();
      await expect(page.locator('[data-remaked-native-panel]:visible')).toHaveCount(0);
      await opener.click(); await opener.press('Escape'); await expect(panel).toBeHidden();
      await opener.click();
      // A popup remains reachable when its opener scrolls out of view and the
      // viewport gets shorter; the source panel itself must not change state.
      await page.evaluate(() => scrollTo(0, 500));
      await page.setViewportSize({ width, height: 568 });
      await expect(panel).toBeVisible();
      const bounds = await panel.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(568);
      await panel.locator('[data-remaked-panel-close]').press('Escape'); await expect(panel).toBeHidden();
      await expect(opener).toBeFocused();
      await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => scrollTo(0, 0));
    }
  }
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before);
  expect(errors).toEqual([]);
});

test('catalog variants keep custom learning, keyboard details, decimal effects, literal RU/JP/TW text and native source restoration in every engine', async ({ page }) => {
  await page.goto('/');
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const data = snapshot([variant('skill.0.1', edit => {
    edit.effects = [{ stat: 1, value: 0.29, unit: 'flat' }];
    edit.names = { en: 'New recovery', ru: 'Новая пассивка', jp: '新しい回復', tw: '新恢復' };
    edit.description.ru = '<img src=x onerror=alert(1)>'; edit.bonusRequirements.ridingRequired = true;
    edit.learningRequirements = { classIds: ['job.0'], classScope: 'descendants', minimumLevel: 5, branches: [] };
  })]);
  const source = await page.evaluate(data => { const source = PandoraRemaked.adapter.serialize(); StatusMove('Lev', 11); CalcSet('Lev'); PandoraRemaked.catalog.applySnapshot(data); return source; }, data);
  await page.locator('[data-remaked-tab="1"]').click();
  const card = page.locator('[data-remaked-skill-variant]'); await expect(card).toHaveCount(1);
  await card.locator('summary').focus(); await page.keyboard.press('Enter'); await expect(card).toHaveAttribute('open', '');
  await expect(card.locator('[data-remaked-variant-learning]')).toHaveText('Classes: Warrior and their advanced classes. Level 5 or higher');
  await expect(card.locator('[data-remaked-variant-bonus]')).toHaveText('Passive bonus inactive');
  await page.locator('[data-remaked-tab="1"]').click();
  await expect(page.locator('[data-remaked-native-panel="1"]')).toBeHidden();
  await page.locator('[data-remaked-calculator-action="Text_16"]').click();
  await page.locator('[data-remaked-tab="1"]').click();
  await expect(card).toHaveAttribute('open', '');
  await expect(card.locator('[data-remaked-variant-bonus]')).toHaveText('Passive bonus applied');
  expect(await page.evaluate(() => Status.STR[2])).toBe(0.29);
  for (const [language, label] of [['ru', 'Новая пассивка'], ['jp', '新しい回復'], ['tw', '新恢復']]) {
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click();
    await expect(card.locator('summary strong')).toHaveText(label);
    if (language === 'ru') { await expect(card.locator('[data-remaked-variant-description]')).toHaveText('<img src=x onerror=alert(1)>'); await expect(card.locator('img')).toHaveCount(0); }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(code => PandoraRemaked.adapter.load(code), source);
  await expect(card).toHaveCount(0); expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(source);
  expect(errors).toEqual([]);
});

test('wide workspace and original riding controls remain complete across responsive transitions in every engine', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  await assertWorkspaceFits(page);
  const weapon = await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').boundingBox();
  expect(weapon.y + weapon.height).toBeLessThanOrEqual(900);
  for (const width of [1365, 1366, 390, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await assertWorkspaceFits(page);
  }
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before);
  const expected = await page.evaluate(() => {
    document.getElementById('SwitchUse_4').click();
    const summary = PandoraRemaked.adapter.readCalculatedSummary();
    document.getElementById('SwitchUse_4').click();
    window.__horseCalls = 0; const original = CalcSet;
    window.CalcSet = function (...args) { if (args[0] === 'Horse') window.__horseCalls++; return original.apply(this, args); };
    return summary;
  });
  await page.locator('[data-remaked-calculator-action="Text_16"]').focus();
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => PandoraRemaked.adapter.readCalculatedSummary())).toEqual(expected);
  expect(await page.evaluate(() => window.__horseCalls)).toBe(1);
});

test('Worker-owned native form preserves origin and completes the authorized session lifecycle in every engine', async ({ page }) => {
  const { password, sqlite, loginRequests } = await routeSyntheticWorker(page);
  try {
    const document = await page.goto(adminOrigin + '/admin');
    expect(document.headers()['referrer-policy']).toBe('same-origin');
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#auth-message')).toHaveText('Enter your administrator credentials.');
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'AUTHENTICATE', exact: true }).click();
    await expect.poll(() => loginRequests).toEqual([{ method: 'POST', origin: adminOrigin, status: 303, secureSession: true }]);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM admin_sessions').get().n).toBe(1);
    expect((await page.context().cookies(adminOrigin)).filter(cookie => cookie.name === '__Host-pandora_admin').length).toBe(1);
    await page.goto(adminOrigin + '/admin');
    await expect(page.getByRole('heading', { name: 'GOD MODE ENABLED / WELCOME, ADMIN', exact: true })).toBeVisible();
    await expect(page.locator('#password')).toHaveValue('');
    await expect(page.locator('#catalog-state')).toContainText('Каталог загружен');
    expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).toBe('[{},{}]');
    await page.getByRole('button', { name: 'LOGOUT', exact: true }).click();
    await expect(page.locator('#auth-message')).toHaveText('GOD MODE DISABLED');
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM admin_sessions').get().n).toBe(0);
    await page.reload();
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#admin-workspace')).toBeHidden();
  } finally { sqlite.close(); }
});

test.describe('network-routed catalog contract', () => {
  // page.route cannot replace a request intercepted by a service worker. This
  // suite verifies the public-fetch/engine contract with a synthetic API; the
  // offline snapshot and installed-PWA paths remain separately enabled/tested.
  test.use({ serviceWorkers: 'block' });

test('a newer import wins over a delayed catalog response in every engine', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-remaked-autosave-status]')).not.toContainText('Autosave…');
  const values = await page.evaluate(() => {
    const original = PandoraRemaked.adapter.serialize(); StatusMove('Lev', 9); CalcSet('Lev');
    const target = 'PS3:2:' + Store(); PandoraRemaked.adapter.load(original);
    return { original, target };
  });
  let release, started;
  const waiting = new Promise(resolve => { release = resolve; }); const requested = new Promise(resolve => { started = resolve; });
  await page.route('https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog**', async route => {
    started(); await waiting;
    await route.fulfill({ headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:8000' },
      json: { ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256, revision: 2, records: [] } });
  });
  await page.evaluate(payload => {
    window.delayedImport = PandoraRemaked.builds.importPreparedPayload(payload).then(result => ({ ok: result.ok, reason: result.reason }));
  }, values.target);
  await requested;
  expect(await page.evaluate(payload => PandoraRemaked.builds.importPreparedPayload(payload), values.original)).toMatchObject({ ok: true });
  const saved = await page.evaluate(() => JSON.stringify(localStorage)); release();
  expect(await page.evaluate(() => window.delayedImport)).toEqual({ ok: false, reason: 'cancelled' });
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(values.original);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(saved);
});
test('explicit public catalog adoption retains effect context and migrates the named build in every engine', async ({ page }) => {
  const source = character.records.find(item => item.id === 'job.0');
  const identity = { id: source.id, kind: 'class', category: null, index: 0 };
  const edit = draftFromSource(source, 'class'); edit.progression[0] += 100;
  const snapshot = { ok: true, schemaVersion: 1, revision: 2,
    sourceFingerprint: equipment.metadata.generated_from[0].sha256, characterSourceFingerprint: character.sourceFingerprint,
    records: [compileRecord(validateDraft(edit, identity), identity, source)] };
  // The real API returns its exact Pages origin. The local synthetic response
  // must likewise include an exact test origin; WebKit enforces this CORS path.
  await page.route('https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog**', route => route.fulfill({
    headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:8000' }, json: snapshot
  }));
  await page.goto('/');
  const before = await page.evaluate(() => {
    document.getElementById('SwitchUse_4').click();
    const api = PandoraRemaked, payload = api.adapter.serialize(); api.buildStore.saveBuild('Original pin', payload); api.builds.flushAutosave();
    history.replaceState(null, '', '#build=' + encodeURIComponent(payload));
    return { lp: Status.LP, raw: Store(), context: api.catalog.captureContext(), named: localStorage.getItem(api.buildStore.BUILDS_KEY) };
  });
  await page.locator('[data-remaked-builds-open]').click();
  await page.evaluate(() => PandoraRemaked.builds.updateCurrentCatalog());
  await expect(page.locator('[data-remaked-catalog-update]')).toHaveCount(0);
  await expect(page.locator('[data-remaked-catalog-status]')).toContainText('Catalog 2 applied');
  const after = await page.evaluate(() => ({ lp: Status.LP, raw: Store(), context: PandoraRemaked.catalog.captureContext(),
    revision: PandoraRemaked.catalog.getRevision(), named: localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY), hash: location.hash }));
  expect({ ...after, named: before.named }).toEqual({ ...before, lp: before.lp + 100, revision: 2, hash: '' });
  const collection = JSON.parse(before.named);
  collection.builds[0].payload = collection.builds[0].payload.replace(/^PS3:0:/, 'PS3:2:');
  expect(JSON.parse(after.named)).toEqual(collection);
});
});

test('compact workspace keeps Builds visible on phones and Legacy FILE recovery unchanged in every engine', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 }); await page.goto('/');
  for (const selector of ['[data-remaked-builds-open]', '[data-remaked-compare-open]']) {
    const box = await page.locator(selector).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  const result = await page.evaluate(() => {
    const store = window.PandoraRemaked.buildStore, payload = window.Store();
    const raw = window.Base64.toBase64(window.RawDeflate.deflate(window.Base64.utob(payload)));
    localStorage.setItem('file', raw);
    const first = store.importLegacySlots(), second = store.importLegacySlots();
    return { first, second, intact: localStorage.getItem('file') === raw && window.Store() === payload };
  });
  expect(result).toEqual({ first: { ok: true, added: 1, skipped: 0 }, second: { ok: true, added: 0, skipped: 1 }, intact: true });
});

test('complete effect context restores riding and clan data and survives source language change in every engine', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const api = window.PandoraRemaked; const source = api.adapter.serialize();
    document.getElementById('Buff_0_7').click(); document.getElementById('SwitchUse_4').click();
    document.getElementById('SelBuffClan_10').selectedIndex = 3; window.CalcSet('ALL');
    const payload = api.adapter.serialize(), summary = api.adapter.readCalculatedSummary(); api.adapter.load(source); api.adapter.load(payload);
    document.getElementById('Lang_2').click();
    return { payload, after: api.adapter.serialize(), summary, afterSummary: api.adapter.readCalculatedSummary(), horse: window.Flag[7], clan: document.getElementById('SelBuffClan_10').selectedIndex };
  });
  expect(result.payload).toMatch(/^PS3:0:C1:/); expect(result.after).toBe(result.payload); expect(result.afterSummary).toEqual(result.summary); expect(result.horse).toBe(1); expect(result.clan).toBe(3);
});

test('learned passive bonus recalculates through native level callback with hidden Skill List in each engine', async ({ page }) => {
  const original = skills.records.find(source => source.id === 'skill.0.1');
  const source = { ...original, id: 'skill_entry.0.1', kind: 'passive' };
  const identity = { id: source.id, kind: 'passive', category: 0, index: 1 }, edit = draftFromSource(source, 'passive'); edit.effects = [{ stat: 1, value: 5, unit: 'flat' }];
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = window.PandoraRemaked; window.Flag[3] = 0; const original = api.adapter.serialize(); api.catalog.applySnapshot(data); const low = window.Status.STR[2];
    window.StatusMove('Lev', 11); window.CalcSet('Lev'); const high = window.Status.STR[2]; const code = api.adapter.serialize();
    api.adapter.load(original); const restored = window.Status.STR[2]; api.adapter.load(code);
    return { low, high, restored, loaded: window.Status.STR[2], flag: window.Flag[3] };
  }, { ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256, characterSourceFingerprint: character.sourceFingerprint, revision: 1, records: [compileRecord(validateDraft(edit, identity), identity, source)] });
  expect(result).toEqual({ low: 0, high: 5, restored: 0, loaded: 5, flag: 0 });
});

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

test('local IDDQD entry is a keyboard-accessible secure-login handoff with unchanged character state', async ({ page }) => {
  await page.goto('/'); const before = await page.evaluate(() => Store());
  await page.keyboard.type('IDDQD');
  const dialog = page.locator('[data-remaked-admin-entry]');
  await expect(dialog).toBeVisible();
  const link = dialog.getByRole('link', { name: 'OPEN SECURE LOGIN', exact: true });
  await expect(link).toBeFocused();
  await expect(link).toHaveAttribute('href', adminOrigin + '/admin');
  await expect(dialog.locator('form, input')).toHaveCount(0);
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
});

test('calculator code rejects invalid data, restores compressed data and riding works by keyboard', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 900 }); await page.goto('/');
  await page.locator('[data-remaked-number="Lev"]').fill('55');
  await page.locator('[data-remaked-number="Lev"]').press('Enter');
  const before = await page.evaluate(() => { localStorage.file = 'legacy-sentinel'; return Store(); });
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-code-action="create"]').focus(); await page.keyboard.press('Enter');
  const code = await page.locator('#InCode').inputValue();
  await page.locator('#InCode').fill('1,2,3'); await page.locator('#InCode').press('Enter');
  expect(await page.evaluate(() => Store())).toBe(before);
  await expect(page.locator('#InCode')).toHaveAttribute('aria-invalid', 'true');
  await page.evaluate(() => document.getElementById('Text_9').parentElement.click());
  await page.locator('#InCode').fill(code); await page.locator('#InCode').press('Enter');
  expect(await page.evaluate(() => Store())).toBe(before);
  expect(await page.evaluate(() => localStorage.file)).toBe('legacy-sentinel');
  await page.keyboard.press('Escape');
  const horse = page.locator('[data-remaked-calculator-action="Text_16"]');
  await horse.focus(); await page.keyboard.press('Space');
  await expect(horse).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('direct skill numbers, full branch names and explicit effects work on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.goto('/');
  await expect(page.locator('#TextSkill_9')).toHaveText('Assassination');
  await page.locator('[data-remaked-number="Lev"]').fill('55');
  await page.locator('[data-remaked-number="Lev"]').press('Enter');
  const input = page.locator('[data-remaked-skill-number="1"]');
  const initial = await page.evaluate(() => Store());
  const current = Number(await input.inputValue());
  const expected = await page.evaluate(value => {
    CalcSet('Skill', 1, value - (Status.Skill[1][0] + Status.Skill[1][1]), 'Adeptness');
    return Store();
  }, current + 1);
  await page.evaluate(code => PandoraRemaked.adapter.load(code), initial);
  await input.fill(String(current + 1)); await input.press('Enter');
  expect(await page.evaluate(() => Store())).toBe(expected);
  await page.locator('[data-remaked-effect="1"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#POTView')).toBeVisible();
  expect(await page.evaluate(() => Store())).toBe(expected);
  expect(await page.locator('#SkillSet').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
});

test('native numeric calculator retains callback parity and phone primary sections reflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const level = page.locator('[data-remaked-number="Lev"]');
  await level.fill('55'); await level.press('Enter');
  await expect(page.locator('#StatusLev')).toHaveText('55');
  const before = await page.evaluate(() => Store());
  const expected = await page.evaluate(() => { StatusMove('Status', 'STR', 1); CalcSet('STR'); return Store(); });
  await page.evaluate(code => PandoraRemaked.adapter.load(code), before);
  const strength = page.locator('[data-remaked-number="STR"]');
  expect(await page.evaluate(() => document.querySelector('[data-remaked-number="STR"]').value)).toBe(String(await page.evaluate(() => Status.STR[0] + Status.STR[1])));
  await strength.fill(String(Number(await strength.inputValue()) + 1)); await strength.press('Enter');
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
  const equipmentOpener = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
  await equipmentOpener.click();
  const equipmentPanel = page.locator('[data-remaked-search-panel]');
  const summary = equipmentPanel.locator('[data-remaked-search-row] summary').first();
  await expect(summary).toBeVisible();
  const row = summary.locator('../..');
  await summary.click();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await summary.focus();
  // Modern 3.12 makes Escape a picker-level command: one press closes the
  // picker even if the currently focused row has an expanded preview.
  await page.keyboard.press('Escape');
  await expect(equipmentPanel).toHaveCount(0);
  await expect(equipmentOpener).toBeFocused();
  expect(await page.evaluate(() => ({ code: Store(), data: JSON.stringify(EquipData) }))).toEqual(before);
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-share-build]').click();
  // Short links are resolved asynchronously (or use the offline-compatible
  // full S1 fallback). Wait for generation before opening a fresh browser.
  await expect(page.locator('[data-remaked-share-url]')).toHaveValue(/#(?:b|build)=/);
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
  for (const selector of ['[data-remaked-builds-open]', '[data-remaked-compare-open]', '[data-remaked-updates-open]']) {
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
      const opener = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
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
