import { test, expect } from '@playwright/test';
import { compileRecord, draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };

const fingerprint = equipment.metadata.generated_from[0].sha256;
function record(kind, category, index, effects, name) {
  const id = { id: 'modern.' + kind + '.test' + index, kind, category, index };
  const edit = draftFromSource(null, kind);
  Object.assign(edit, { id: id.id, category, names: { en: name, ru: 'Русское имя ' + index, jp: '', tw: '' }, effects,
    sockets: kind === 'equipment' ? 2 : 0, baseAttack: kind === 'equipment' && category <= 13 ? 70 : null });
  return compileRecord(validateDraft(edit, id), id, null);
}
function snapshot(records, revision = 1) { return { ok: true, schemaVersion: 1, sourceFingerprint: fingerprint, revision, records }; }
async function open(page) {
  await page.goto('/');
  await page.addScriptTag({ path: 'modern/catalog.js' });
  await expect.poll(() => page.evaluate(() => Boolean(window.PandoraRemaked.catalog))).toBe(true);
}
const publicApi = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog';
async function mockCatalog(context, versions, latest = 1, requests = []) {
  await context.route(publicApi + '**', async route => {
    const revision = new URL(route.request().url()).searchParams.get('revision');
    const requested = revision === null ? latest : Number(revision); requests.push(requested);
    if (!versions[requested]) return route.abort();
    return route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:8000' }, body: JSON.stringify(versions[requested]) });
  });
}

test('published new weapon and Soul change actual retained engine calculation, including enhance/socket rules', async ({ page }) => {
  await open(page);
  const next = equipment.records.filter(item => item.legacy_category_id === 0).length + 1;
  const weapon = record('equipment', 0, next, [], 'Modern sword');
  const soul = record('soul', null, 185, [{ stat: 1, value: 7, unit: 'flat' }], 'Modern STR Soul');
  const result = await page.evaluate(data => {
    const api = window.PandoraRemaked;
    const initial = api.adapter.serialize(); const initialStr = window.Status.STR[0] + window.Status.STR[1] + window.Status.STR[2];
    api.catalog.applySnapshot(data);
    api.adapter.selectEquipment(0, data.records[0].engineId);
    const before = Number(document.getElementById('Status_18').textContent);
    const changed = api.adapter.selectSoul({ slotIndex: 0, socketIndex: 4 }, 185);
    return { before, after: Number(document.getElementById('Status_18').textContent), str: Number(window.Status.STR[2]), changed,
      sourceCount: document.getElementById('SelEquip_0_0').options.length, sockets: api.adapter.readItemDetails('equipment', data.records[0].engineId, 0).sockets, initial, initialStr,
      rawWeapon: window.EquipData[0][0][data.records[0].index][7], rawSoul: window.SoulData[0][185][7] };
  }, snapshot([weapon, soul]));
  // Human + Warrior starts with STR 8 (race 5 + class 3), not race-only 5.
  expect(result.initialStr).toBe(8); expect(result.before).toBe(74); expect(result.after).toBe(77); expect(result.str).toBe(7); expect(result.changed).toBe(true); expect(result.sockets).toBe(2);
  expect(result.rawWeapon).toBe('18=W70'); expect(result.rawSoul).toBe('1=7');
  await page.locator('#SelEquip_0_3').selectOption('4', { force: true });
  // This exact expected value follows the retained engine's +4 weapon upgrade;
  // the production implementation contains no copy of its formula.
  expect(await page.evaluate(() => Number(document.getElementById('Status_18').textContent))).toBe(90);
});

test('existing item changes numeric bonus but keeps original canonical Japanese engine identity', async ({ page }) => {
  await open(page);
  const source = equipment.records.find(item => item.id === 'equipment.0.1');
  const identity = { id: source.id, kind: 'equipment', category: 0, index: 1 };
  const edit = draftFromSource(source, 'equipment'); edit.names.en = 'Updated source'; edit.names.jp = '別の表示名';
  edit.effectMode = 'patch'; edit.effects = [{ stat: 1, value: 4, unit: 'flat' }];
  const changed = compileRecord(validateDraft(edit, identity), identity, source);
  const result = await page.evaluate(data => {
    const key = window.EquipData[0][0][1][0];
    window.PandoraRemaked.catalog.applySnapshot(data);
    window.PandoraRemaked.adapter.selectEquipment(0, 1);
    return { key, afterKey: window.EquipData[0][0][1][0], str: window.Status.STR[2], attack: Number(document.getElementById('Status_18').textContent) };
  }, snapshot([changed]));
  expect(result.key).toBe(result.afterKey); expect(result.str).toBe(4); expect(result.attack).toBe(11);
});

test('malformed publication never mutates current character, engine arrays or active revision', async ({ page }) => {
  await open(page);
  const next = equipment.records.filter(item => item.legacy_category_id === 0).length + 1;
  const weapon = record('equipment', 0, next, [], 'Safe sword');
  const result = await page.evaluate(data => {
    const before = window.Store(); const arrays = JSON.stringify([window.EquipData, window.SoulData]);
    const inputs = [ { ...data, sourceFingerprint: 'wrong' }, { ...data, records: [data.records[0], data.records[0]] },
      { ...data, records: [{ ...data.records[0], calculationCode: '999=eval(1)' }] }, { ...data, records: [{ ...data.records[0], engineId: 123456 }] } ];
    const failures = [];
    inputs.forEach(input => { try { window.PandoraRemaked.catalog.applySnapshot(input); failures.push(false); } catch { failures.push(true); } });
    return { failures, before, after: window.Store(), arraysSame: arrays === JSON.stringify([window.EquipData, window.SoulData]), revision: window.PandoraRemaked.catalog.getRevision() };
  }, snapshot([weapon]));
  expect(result.failures).toEqual([true, true, true, true]); expect(result.after).toBe(result.before); expect(result.arraysSame).toBe(true); expect(result.revision).toBe(0);
});

test('a changed Soul slot requirement rejects revision switch before altering the equipped character', async ({ page }) => {
  await open(page);
  const next = equipment.records.filter(item => item.legacy_category_id === 0).length + 1;
  const weapon = record('equipment', 0, next, [], 'Socket sword');
  const soul = record('soul', null, 185, [{ stat: 1, value: 7, unit: 'flat' }], 'Weapon Soul');
  const result = await page.evaluate(data => {
    const api = window.PandoraRemaked;
    api.catalog.applySnapshot(data); api.adapter.selectEquipment(0, data.records[0].engineId);
    api.adapter.selectSoul({ slotIndex: 0, socketIndex: 4 }, 185);
    const before = api.adapter.serialize(); const arrays = JSON.stringify([window.EquipData, window.SoulData]);
    const changed = structuredClone(data); changed.revision = 2; changed.records[1].compatibility = [0, 0, 0, 1, 0, 0, 0, 0];
    let rejected = false;
    try { api.catalog.applySnapshot(changed); } catch { rejected = true; }
    return { rejected, before, after: api.adapter.serialize(), arraysSame: arrays === JSON.stringify([window.EquipData, window.SoulData]), revision: api.catalog.getRevision() };
  }, snapshot([weapon, soul]));
  expect(result.rejected).toBe(true); expect(result.after).toBe(result.before); expect(result.arraysSame).toBe(true); expect(result.revision).toBe(1);
});

test('a slow obsolete shared-link request cannot replace a newer character or its autosave', async ({ page }) => {
  await open(page);
  const next = equipment.records.filter(item => item.legacy_category_id === 0).length + 1;
  const first = snapshot([record('equipment', 0, next, [], 'Slow sword')]);
  const original = await page.evaluate(() => window.Store());
  const versioned = await page.evaluate(data => {
    const api = window.PandoraRemaked; const original = api.adapter.serialize(); api.catalog.applySnapshot(data);
    api.adapter.selectEquipment(0, data.records[0].engineId); const payload = api.adapter.serialize(); api.adapter.load(original); return payload;
  }, first);
  const result = await page.evaluate(async ({ versioned, original }) => {
    const api = window.PandoraRemaked; const prepare = api.catalog.preparePayload; let release;
    const gate = new Promise(resolve => { release = resolve; });
    api.catalog.preparePayload = async payload => { if (payload === versioned) await gate; return prepare(payload); };
    let started, finished; const slowStarted = new Promise(resolve => { started = resolve; });
    const slowFinished = new Promise(resolve => { finished = resolve; });
    api.catalog.preparePayload = async payload => { if (payload === versioned) { started(); await gate; } const result = await prepare(payload); if (payload === versioned) finished(); return result; };
    location.hash = 'build=' + encodeURIComponent(versioned); await slowStarted;
    location.hash = 'build=' + encodeURIComponent(original);
    await new Promise(resolve => setTimeout(resolve, 50)); const saved = localStorage.getItem(api.buildStore.AUTOSAVE_KEY);
    release(); await slowFinished; await new Promise(resolve => setTimeout(resolve, 50)); api.catalog.preparePayload = prepare;
    return { payload: api.adapter.serialize(), saved, afterSaved: localStorage.getItem(api.buildStore.AUTOSAVE_KEY) };
  }, { versioned, original });
  expect(result.payload).toBe(original); expect(result.afterSaved).toBe(result.saved);
});

test('versioned codes round-trip through calculator and Build Manager, while original codes still restore exact source state', async ({ page }) => {
  await open(page);
  const original = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const next = equipment.records.filter(item => item.legacy_category_id === 0).length + 1;
  const weapon = record('equipment', 0, next, [], 'Modern sword');
  await page.evaluate(data => { window.PandoraRemaked.catalog.applySnapshot(data); window.PandoraRemaked.adapter.selectEquipment(0, data.records[0].engineId); }, snapshot([weapon]));
  const payload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  expect(payload).toMatch(/^PS3:1:/);
  await page.locator('[data-remaked-code-action="create"]').click();
  await expect(page.locator('#InCode')).toHaveValue(payload);
  const restored = await page.evaluate(code => window.PandoraRemaked.builds.importPayload(code), original);
  expect(restored.ok).toBe(true);
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(original);
  const imported = await page.evaluate(code => window.PandoraRemaked.builds.importPreparedPayload(code), payload);
  expect(imported.ok).toBe(true);
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(payload);
});

test('comparison evaluates each pinned revision and restores the active catalog, character and stored records', async ({ page }) => {
  await open(page);
  const next = equipment.records.filter(item => item.legacy_category_id === 0).length + 1;
  const weapon = record('equipment', 0, next, [], 'Compared sword');
  const result = await page.evaluate(({ first, second }) => {
    const api = window.PandoraRemaked;
    const original = api.adapter.serialize();
    api.catalog.applySnapshot(first); api.adapter.selectEquipment(0, first.records[0].engineId);
    const one = api.adapter.serialize(); const a = api.buildStore.saveBuild('Old stats', one);
    api.catalog.applySnapshot(second); const secondItem = Number(window.Status.Equip[0][0]); const two = api.adapter.serialize(); const b = api.buildStore.saveBuild('New stats', two);
    api.builds.flushAutosave();
    const saved = localStorage.getItem(api.buildStore.BUILDS_KEY); const autosave = localStorage.getItem(api.buildStore.AUTOSAVE_KEY);
    const source = api.adapter.evaluateBuild(original), earlier = api.adapter.evaluateBuild(one), later = api.adapter.evaluateBuild(two);
    return { a: a.build.id, b: b.build.id, active: two, secondItem, saved, autosave, beforeAttack: document.getElementById('Status_18').textContent,
      sourceAttack: source.summary.find(row => row.key === 'physicalAttack').value,
      earlierAttack: earlier.summary.find(row => row.key === 'physicalAttack').value,
      laterAttack: later.summary.find(row => row.key === 'physicalAttack').value,
      after: api.adapter.serialize(), revision: api.catalog.getRevision() };
  }, { first: snapshot([weapon]), second: snapshot([{ ...weapon, calculationCode: '18=W95' }], 2) });
  expect(result.secondItem).toBe(weapon.engineId);
  expect(result.sourceAttack).toBe(5); expect(result.earlierAttack).toBe(74); expect(result.laterAttack).toBe(99);
  expect(result.after).toBe(result.active); expect(result.revision).toBe(2);
  await page.locator('[data-remaked-compare-open]').click();
  await page.locator('[data-remaked-compare-a]').selectOption(result.a);
  await page.locator('[data-remaked-compare-b]').selectOption(result.b);
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-row][data-stat-key="physicalAttack"] [data-remaked-delta]')).toHaveText('+25');
  const state = await page.evaluate(() => ({ active: PandoraRemaked.adapter.serialize(), revision: PandoraRemaked.catalog.getRevision(), saved: localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY), autosave: localStorage.getItem(PandoraRemaked.buildStore.AUTOSAVE_KEY) }));
  expect(state).toEqual({ active: result.active, revision: 2, saved: result.saved, autosave: result.autosave });
});

test('fresh recipient loads pinned catalog revision, not newer stats; reload can use cached public catalog offline', async ({ page, browser }) => {
  await open(page);
  const next = equipment.records.filter(item => item.legacy_category_id === 0).length + 1;
  const weapon = record('equipment', 0, next, [], 'Pinned sword');
  const soul = record('soul', null, 185, [{ stat: 1, value: 7, unit: 'flat' }], 'Pinned Soul');
  const first = snapshot([weapon, soul]);
  const latest = snapshot([{ ...weapon, calculationCode: '18=W95' }, soul], 2);
  await page.evaluate(data => {
    const api = window.PandoraRemaked; api.catalog.applySnapshot(data); api.adapter.selectEquipment(0, data.records[0].engineId);
    api.adapter.selectSoul({ slotIndex: 0, socketIndex: 4 }, 185);
    document.getElementById('SelEquip_0_3').value = '4'; document.getElementById('SelEquip_0_3').dispatchEvent(new Event('change', { bubbles: true }));
  }, first);
  const payload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const context = await browser.newContext(); const requests = [];
  await mockCatalog(context, { 1: first, 2: latest }, 2, requests);
  const recipient = await context.newPage();
  await recipient.goto('http://127.0.0.1:8000/#build=' + encodeURIComponent(payload));
  await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
  expect(await recipient.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(payload);
  expect(await recipient.evaluate(() => Number(document.getElementById('Status_18').textContent))).toBe(90);
  expect(requests).not.toContain(2);
  await recipient.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => recipient.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await recipient.reload();
  await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
  expect(await recipient.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(payload);
  expect(await recipient.evaluate(() => Number(document.getElementById('Status_18').textContent))).toBe(90);
  await context.close();
});

test('missing catalog never replaces protected autosave; failed import leaves a non-default current character and all records intact', async ({ page, browser }) => {
  await open(page);
  const raw = await page.evaluate(() => window.Store());
  const stored = { schema: 1, engine: 'legacy-2.00', payload: 'PS3:987:' + raw, updatedAt: '2026-09-30T10:00:00.000Z' };
  const context = await browser.newContext();
  await context.route(publicApi + '**', route => route.abort());
  await context.addInitScript(value => localStorage.setItem('pandora-remaked.autosave.v1', JSON.stringify(value)), stored);
  const offline = await context.newPage(); await offline.goto('http://127.0.0.1:8000/');
  await expect(offline.locator('[data-remaked-autosave-status]')).toContainText('Autosave warning');
  const result = await offline.evaluate(async () => {
    const before = window.PandoraRemaked.adapter.serialize(); const saved = localStorage.getItem('pandora-remaked.autosave.v1');
    const flushed = window.PandoraRemaked.builds.flushAutosave();
    const imported = await window.PandoraRemaked.builds.importPreparedPayload('PS3:986:' + window.Store());
    return { flushed, imported: imported.ok, before, after: window.PandoraRemaked.adapter.serialize(), saved, currentSaved: localStorage.getItem('pandora-remaked.autosave.v1') };
  });
  expect(result.flushed.ok).toBe(false); expect(result.flushed.error.code).toBe('catalog-unavailable'); expect(result.imported).toBe(false);
  expect(result.after).toBe(result.before); expect(result.currentSaved).toBe(result.saved); expect(JSON.parse(result.saved)).toEqual(stored);
  await context.close();
});
