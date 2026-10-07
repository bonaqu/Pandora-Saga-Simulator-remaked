import { test, expect } from '@playwright/test';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };

const publicApi = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog';
const snapshot = revision => ({ ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256, revision, records: [] });
async function open(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-autosave-status]')).not.toContainText('Autosave…');
  const values = await page.evaluate(() => {
    const original = PandoraRemaked.adapter.serialize();
    StatusMove('Lev', 9); CalcSet('Lev');
    document.getElementById('SwitchUse_4').click();
    const target = 'PS3:2:' + PandoraRemaked.catalog.unpackPayload(PandoraRemaked.adapter.serialize()).payload;
    PandoraRemaked.adapter.load(original); PandoraRemaked.builds.flushAutosave();
    PandoraRemaked.buildStore.saveBuild('Slow target', target);
    return { original, target };
  });
  await page.locator('[data-remaked-builds-open]').click();
  return values;
}
async function state(page) {
  return page.evaluate(() => ({ payload: PandoraRemaked.adapter.serialize(), context: PandoraRemaked.catalog.captureContext(),
    summary: PandoraRemaked.adapter.readCalculatedSummary(), storage: JSON.stringify(localStorage), hash: location.hash }));
}
async function gate(page) {
  let release, started, fulfilled;
  const waiting = new Promise(resolve => { release = resolve; });
  const requested = new Promise(resolve => { started = resolve; });
  const finished = new Promise(resolve => { fulfilled = resolve; });
  await page.route(publicApi + '**', async route => {
    started(); await waiting;
    await route.fulfill({ json: snapshot(2) }); fulfilled();
  });
  return { requested, finish: async () => { release(); await finished; } };
}
async function begin(page, action, target) {
  if (action === 'import') {
    await page.locator('#InCode').fill(target); await page.locator('[data-remaked-import-build]').click();
  } else await page.locator('[data-remaked-build-load]').click();
}
async function waitSettled(page) {
  await expect.poll(() => page.evaluate(() => window.loadRaceSettled)).toBe(true);
}
async function observePreparation(page) {
  await page.evaluate(() => {
    window.loadRaceSettled = false;
    window.loadRaceInFlight = 0;
    const wrap = key => {
      const original = PandoraRemaked.catalog[key];
      PandoraRemaked.catalog[key] = async function () {
        window.loadRaceInFlight += 1;
        try { return await original.apply(this, arguments); }
        finally {
          window.loadRaceInFlight -= 1;
          setTimeout(() => {
            if (window.loadRaceInFlight === 0) window.loadRaceSettled = true;
          }, 0);
        }
      };
    };
    wrap('prepareCurrentPayload');
    wrap('preparePayload');
  });
}
async function showRace(page) {
  if (!(await page.locator('#SelRace').isVisible())) await page.locator('[data-remaked-tab="0"]').click();
  await expect(page.locator('#SelRace')).toBeVisible();
}

for (const action of ['import', 'named load']) {
  for (const newer of ['character', 'close', 'another import']) {
    test('delayed ' + action + ' never replaces a newer ' + newer, async ({ page }) => {
      const values = await open(page), pending = await gate(page);
      // Track the existing public preparation promise, not a fixed sleep.
      await observePreparation(page);
      await begin(page, action, values.target); await pending.requested;
      if (newer === 'character') await page.evaluate(() => { StatusMove('Lev', 2); CalcSet('Lev'); PandoraRemaked.builds.flushAutosave(); });
      if (newer === 'close') await page.keyboard.press('Escape');
      if (newer === 'another import') {
        // Same current character is still a deliberate newer intent.
        await page.evaluate(payload => PandoraRemaked.builds.importPayload(payload), values.original);
      }
      const expected = await state(page); await pending.finish(); await waitSettled(page);
      expect(await state(page)).toEqual(expected);
      if (newer === 'close') {
        await expect(page.locator('[data-remaked-build-manager]')).not.toBeVisible();
        await expect(page.locator('#InCode')).not.toBeFocused();
      }
    });
  }
}

test('editing the Code field cancels its pending import without invalidating or stealing focus', async ({ page }) => {
  const values = await open(page), pending = await gate(page);
  await observePreparation(page);
  await begin(page, 'import', values.target); await pending.requested;
  await page.locator('#InCode').fill('My new draft'); await page.locator('[data-remaked-build-name]').focus();
  const expected = await state(page); await pending.finish(); await waitSettled(page);
  expect(await state(page)).toEqual(expected);
  await expect(page.locator('#InCode')).toHaveValue('My new draft'); await expect(page.locator('#InCode')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[data-remaked-build-name]')).toBeFocused();
  await expect(page.locator('[data-remaked-code-status]')).toHaveText('');
});

test('the second prepared import wins even when its character equals the initial one', async ({ page }) => {
  const values = await open(page), pending = await gate(page);
  await page.evaluate(payload => {
    window.slowImport = PandoraRemaked.builds.importPreparedPayload(payload).then(result => { window.slowImportResult = { ok: result.ok, reason: result.reason }; });
  }, values.target);
  await pending.requested;
  expect(await page.evaluate(payload => PandoraRemaked.builds.importPreparedPayload(payload), values.original)).toMatchObject({ ok: true });
  const expected = await state(page); await pending.finish(); await page.evaluate(() => window.slowImport);
  expect(await page.evaluate(() => window.slowImportResult)).toEqual({ ok: false, reason: 'cancelled' });
  expect(await state(page)).toEqual(expected);
});

test('a deleted named build is not loaded by its already pending response', async ({ page }) => {
  await open(page); const pending = await gate(page);
  await observePreparation(page);
  await page.locator('[data-remaked-build-load]').click(); await pending.requested;
  page.once('dialog', dialog => dialog.accept()); await page.locator('[data-remaked-build-delete]').click();
  const expected = await state(page); await pending.finish(); await waitSettled(page);
  expect(await state(page)).toEqual(expected); await expect(page.locator('[data-remaked-build-manager-status]')).toContainText('Deleted');
});

test('a delayed shared link does not undo later character editing', async ({ page }) => {
  const values = await open(page), pending = await gate(page); await page.keyboard.press('Escape');
  await observePreparation(page); await showRace(page);
  await page.evaluate(payload => { location.hash = 'build=' + encodeURIComponent(payload); }, values.target); await pending.requested;
  await page.locator('#SelRace').selectOption({ index: 1 });
  await page.evaluate(() => PandoraRemaked.builds.flushAutosave()); const expected = await state(page);
  await pending.finish(); await waitSettled(page);
  expect(await state(page)).toEqual(expected);
});

test('character edits back to the original value still cancel a delayed shared link', async ({ page }) => {
  const values = await open(page), pending = await gate(page); await page.keyboard.press('Escape');
  await observePreparation(page); await showRace(page);
  await page.evaluate(payload => { location.hash = 'build=' + encodeURIComponent(payload); }, values.target); await pending.requested;
  await page.locator('#SelRace').selectOption({ index: 1 }); await page.locator('#SelRace').selectOption({ index: 0 });
  await page.evaluate(() => PandoraRemaked.builds.flushAutosave()); const expected = await state(page);
  await pending.finish(); await waitSettled(page);
  expect(await state(page)).toEqual(expected);
});

test('catalog pins exceeding the serialized nine-digit format are rejected before mutation', async ({ page }) => {
  await open(page); const expected = await state(page);
  const rejected = await page.evaluate(values => values.map(value => {
    try { PandoraRemaked.catalog.applySnapshot(value); return false; } catch { return true; }
  }), [snapshot(1000000000), snapshot(Number.MAX_SAFE_INTEGER)]);
  expect(rejected).toEqual([true, true]); expect(await state(page)).toEqual(expected);
});
