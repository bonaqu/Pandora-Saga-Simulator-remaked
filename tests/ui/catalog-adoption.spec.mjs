import { test, expect } from '@playwright/test';
import { compileRecord, draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };

const publicApi = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog';
function publication(revision, records = [], impactRevision = revision) {
  return { ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256,
    characterSourceFingerprint: character.sourceFingerprint, revision, impactRevision, records };
}
function editedWarrior(revision = 2) {
  const source = character.records.find(item => item.id === 'job.0');
  const id = { id: source.id, kind: 'class', category: null, index: 0 };
  const edit = draftFromSource(source, 'class'); edit.progression[0] += 100;
  edit.names.en = 'Published Warrior'; edit.names.ru = 'Опубликованный воин';
  return publication(revision, [compileRecord(validateDraft(edit, id), id, source)]);
}
function socketItems(revision = 1) {
  const next = equipment.records.filter(item => item.legacy_category_id === 0).length + 1;
  const records = ['equipment', 'soul'].map(kind => {
    const id = { id: 'modern.' + kind + '.adoption', kind, category: kind === 'equipment' ? 0 : null, index: kind === 'equipment' ? next : 185 };
    const edit = draftFromSource(null, kind);
    Object.assign(edit, { id: id.id, category: id.category, names: { en: 'Adoption ' + kind, ru: '', jp: '', tw: '' },
      sockets: kind === 'equipment' ? 2 : 0, baseAttack: kind === 'equipment' ? 70 : null,
      effects: kind === 'soul' ? [{ stat: 1, unit: 'flat', value: 7 }] : [] });
    return compileRecord(validateDraft(edit, id), id, null);
  });
  return publication(revision, records);
}
async function state(page) {
  return page.evaluate(() => ({ payload: PandoraRemaked.adapter.serialize(), revision: PandoraRemaked.catalog.getRevision(),
    context: PandoraRemaked.catalog.captureContext(), summary: PandoraRemaked.adapter.readCalculatedSummary(),
    storage: JSON.stringify(localStorage), arrays: JSON.stringify([EquipData, SoulData, Status.Mod]), hash: location.hash }));
}
async function openManager(page) {
  await page.goto('/'); await expect(page.locator('[data-remaked-autosave-status]')).not.toContainText('Autosave…');
  await page.locator('[data-remaked-builds-open]').click();
}
const runUpdate = page => page.evaluate(() => PandoraRemaked.builds.updateCurrentCatalog());
const status = page => page.locator('[data-remaked-catalog-status]');

test('live catalog head updates the current character and autosave without opening Builds or pressing Update', async ({ page }) => {
  const next = editedWarrior();
  await page.route(publicApi + '**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/head')) {
      return route.fulfill({ json: {
        ok: true, schemaVersion: 1, sourceFingerprint: next.sourceFingerprint,
        characterSourceFingerprint: next.characterSourceFingerprint, revision: next.revision, impactRevision: next.impactRevision
      } });
    }
    return route.fulfill({ json: next });
  });
  await page.goto('/');
  const before = await page.evaluate(() => {
    PandoraRemaked.builds.flushAutosave();
    return { lp: Status.LP, payload: PandoraRemaked.adapter.serialize() };
  });
  const result = await page.evaluate(() => PandoraRemaked.builds.checkCatalogHead());
  expect(result.ok).toBe(true);
  expect(result.automatic).toBe(true);
  expect(await page.evaluate(() => PandoraRemaked.catalog.getRevision())).toBe(2);
  expect(await page.evaluate(() => Status.LP)).toBe(before.lp + 100);
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toMatch(/^PS3:2:/);
  expect(await page.evaluate(() => PandoraRemaked.buildStore.readAutosave().record.payload)).toMatch(/^PS3:2:/);
});

test('older named builds are visibly marked and safely upgraded when loaded', async ({ page }) => {
  const next = editedWarrior();
  await page.route(publicApi + '**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/head')) {
      return route.fulfill({ json: {
        ok: true, schemaVersion: 1, sourceFingerprint: next.sourceFingerprint,
        characterSourceFingerprint: next.characterSourceFingerprint, revision: next.revision, impactRevision: next.impactRevision
      } });
    }
    return route.fulfill({ json: next });
  });
  await page.goto('/');
  const build = await page.evaluate(() => PandoraRemaked.buildStore.saveBuild('Old build', PandoraRemaked.adapter.serialize()).build);
  await page.evaluate(() => PandoraRemaked.builds.checkCatalogHead());
  await page.locator('[data-remaked-builds-open]').click();

  const row = page.locator('[data-remaked-build-row][data-build-id="' + build.id + '"]');
  await expect(row).toHaveAttribute('data-catalog-stale', 'true');
  await expect(row.locator('[data-remaked-build-stale]')).toHaveText('Possibly outdated');
  const style = await row.evaluate(node => ({ borderStyle: getComputedStyle(node).borderStyle, color: getComputedStyle(node).borderColor }));
  expect(style.borderStyle).toBe('dotted');
  expect(style.color).not.toBe('rgb(208, 221, 192)');

  await row.locator('[data-remaked-build-load]').click();
  await expect(row.locator('[data-remaked-build-stale]')).toHaveCount(0);
  const stored = await page.evaluate(id => PandoraRemaked.buildStore.getBuild(id), build.id);
  expect(stored.payload).toMatch(/^PS3:2:/);
  await expect(page.locator('[data-remaked-build-manager-status]')).toContainText(/updated|current catalog/i);
});

test('name, description and translation-only publications never mark saved builds stale', async ({ page }) => {
  const cosmetic = editedWarrior(2);
  cosmetic.impactRevision = 0;
  cosmetic.records[0].progression = [...character.records.find(item => item.id === 'job.0').progression];
  cosmetic.records[0].names.en = 'Renamed Warrior';
  cosmetic.records[0].names.ru = 'Переименованный воин';
  cosmetic.records[0].description = { en: 'New description only', ru: 'Только новое описание', jp: '', tw: '' };

  await page.route(publicApi + '**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/head')) {
      const { records, ...head } = cosmetic;
      return route.fulfill({ json: head });
    }
    return route.fulfill({ json: cosmetic });
  });
  await page.goto('/');
  const build = await page.evaluate(() => PandoraRemaked.buildStore.saveBuild('Text-only old build', PandoraRemaked.adapter.serialize()).build);
  await page.evaluate(() => PandoraRemaked.builds.checkCatalogHead());
  await page.locator('[data-remaked-builds-open]').click();

  const row = page.locator('[data-remaked-build-row][data-build-id="' + build.id + '"]');
  await expect(row).not.toHaveAttribute('data-catalog-stale', 'true');
  await expect(row.locator('[data-remaked-build-stale]')).toHaveCount(0);
  await expect(page.locator('[data-remaked-catalog-revision]')).toContainText('ревизия 2');
  expect(await page.evaluate(() => PandoraRemaked.builds.getLatestCatalogImpactRevision())).toBe(0);
});

test('catalog adoption is explicit, retains C1 and named pins, and reloads the adopted autosave rather than an old shared link', async ({ page }, info) => {
  const requests = [];
  await page.route(publicApi + '**', route => { requests.push(route.request().url()); return route.fulfill({ json: editedWarrior() }); });
  await page.goto('/');
  const before = await page.evaluate(() => {
    StatusMove('Lev', 54); CalcSet('Lev'); document.getElementById('SwitchUse_4').click();
    document.getElementById('BuffHonor_0').click();
    document.getElementById('SelBuffClan_0').selectedIndex = 2; CalcSet('ALL');
    const payload = PandoraRemaked.adapter.serialize();
    PandoraRemaked.buildStore.saveBuild('Keep original pin', payload); PandoraRemaked.builds.flushAutosave();
    history.replaceState(null, '', '#build=' + encodeURIComponent(payload));
    return { payload, lp: Status.LP, context: PandoraRemaked.catalog.captureContext(), named: localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY) };
  });
  await page.locator('[data-remaked-builds-open]').click();
  await expect(page.locator('[data-remaked-catalog-revision]')).toContainText('source revision 0'); expect(requests).toEqual([]);
  await runUpdate(page); await expect(status(page)).toContainText('Catalog 2 applied');
  const after = await state(page);
  expect(after.revision).toBe(2); expect(after.payload).toMatch(/^PS3:2:C1:/); expect(after.context).toEqual(before.context);
  expect(await page.evaluate(() => Status.LP)).toBe(before.lp + 100);
  expect(await page.evaluate(() => localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY))).toBe(before.named);
  expect(after.hash).toBe(''); expect(requests).toEqual([publicApi]);
  expect(await page.evaluate(() => PandoraRemaked.buildStore.readAutosave().record.payload)).toBe(after.payload);
  await page.screenshot({ path: info.outputPath('modern-catalog-adoption-desktop.png') });
  await page.reload(); await expect(page.locator('[data-remaked-autosave-status]')).toContainText('Restored autosave');
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(after.payload);
  expect(await page.evaluate(() => Status.LP)).toBe(before.lp + 100);
});

for (const conflict of ['missing item', 'fewer sockets', 'Soul slot', 'class compatibility']) {
  test('incompatible adoption keeps every character/storage value: ' + conflict, async ({ page }) => {
    const original = socketItems(), next = structuredClone(original); next.revision = 2; next.impactRevision = 2;
    if (conflict === 'missing item') next.records = [];
    if (conflict === 'fewer sockets') next.records[0].sockets = 0;
    if (conflict === 'Soul slot') next.records[1].compatibility = [0, 0, 0, 1, 0, 0, 0, 0];
    // Source row has two leading equipment flags, six race flags, then jobs.
    if (conflict === 'class compatibility') next.records[0].compatibility[8] = 0;
    await page.route(publicApi + '**', route => route.fulfill({ json: next })); await openManager(page);
    await page.evaluate(data => {
      PandoraRemaked.catalog.applySnapshot(data); PandoraRemaked.adapter.selectEquipment(0, data.records[0].engineId);
      PandoraRemaked.adapter.selectSoul({ slotIndex: 0, socketIndex: 4 }, 185); PandoraRemaked.builds.flushAutosave();
    }, original);
    const before = await state(page); await runUpdate(page); await expect(status(page)).toContainText('incompatible');
    expect(await state(page)).toEqual(before);
  });
}

test('offline update refuses a cached head and never calls it current', async ({ page }) => {
  let offline = false;
  await page.route(publicApi + '**', route => offline ? route.abort() : route.fulfill({ json: editedWarrior() }));
  await openManager(page); await page.evaluate(() => PandoraRemaked.catalog.fetchSnapshot(null)); offline = true;
  const before = await state(page); await runUpdate(page); await expect(status(page)).toContainText('Could not check');
  expect(await state(page)).toEqual(before);
});

for (const change of ['character', 'share link', 'close']) {
  test('a delayed update is cancelled after a newer user action: ' + change, async ({ page }) => {
    let release, started;
    const gate = new Promise(resolve => { release = resolve; }); const request = new Promise(resolve => { started = resolve; });
    await page.route(publicApi + '**', async route => { started(); await gate; await route.fulfill({ json: editedWarrior() }); });
    await openManager(page);
    const pending = page.evaluate(() => PandoraRemaked.builds.updateCurrentCatalog());
    await request;
    if (change === 'character') await page.evaluate(() => { StatusMove('Lev', 1); CalcSet('Lev'); PandoraRemaked.builds.flushAutosave(); });
    if (change === 'share link') await page.evaluate(() => { history.replaceState(null, '', '#build=another-link'); });
    if (change === 'close') await page.keyboard.press('Escape');
    const before = await state(page); release(); await pending;
    if (change === 'close') await page.locator('[data-remaked-builds-open]').click();
    else await expect(status(page)).toContainText('cancelled');
    expect(await state(page)).toEqual(before);
  });
}

test('same revision and malformed or older heads never rewrite autosave', async ({ page }) => {
  let latest = editedWarrior();
  await page.route(publicApi + '**', route => route.fulfill({ json: latest })); await openManager(page);
  await page.evaluate(data => { PandoraRemaked.catalog.applySnapshot(data); PandoraRemaked.builds.flushAutosave(); }, latest);
  const before = await state(page);
  await runUpdate(page); await expect(status(page)).toContainText('already current'); expect(await state(page)).toEqual(before);
  latest = editedWarrior(1); await runUpdate(page); await expect(status(page)).toContainText('Could not check'); expect(await state(page)).toEqual(before);
  latest = { ...editedWarrior(3), sourceFingerprint: 'wrong' }; await runUpdate(page);
  await expect(status(page)).toContainText('Could not check'); expect(await state(page)).toEqual(before);
});

test('unavailable protected autosave blocks adoption before any fetch or storage write', async ({ page }) => {
  const requests = []; await page.route(publicApi + '**', route => { requests.push(route.request().url()); return route.abort(); });
  await page.goto('/'); const csv = await page.evaluate(() => Store());
  const protectedSave = JSON.stringify({ schema: 1, engine: 'legacy-2.00', payload: 'PS3:987:' + csv, updatedAt: '2026-09-30T10:00:00.000Z' });
  await page.evaluate(value => localStorage.setItem(PandoraRemaked.buildStore.AUTOSAVE_KEY, value), protectedSave);
  await page.reload(); await expect(page.locator('[data-remaked-autosave-status]')).toContainText('Autosave warning');
  await page.locator('[data-remaked-builds-open]').click(); requests.length = 0;
  const before = await state(page); await runUpdate(page); await expect(status(page)).toContainText('Restore or export');
  expect(await state(page)).toEqual(before); expect(requests).toEqual([]);
});

test('native recalculation failure rolls back catalog, C1, calculated results and storage', async ({ page }) => {
  await page.route(publicApi + '**', route => route.fulfill({ json: editedWarrior() })); await openManager(page);
  await page.evaluate(() => {
    document.getElementById('SwitchUse_4').click(); PandoraRemaked.builds.flushAutosave();
    const retained = CalcSet; let fail = true;
    window.CalcSet = function () { if (fail) { fail = false; throw new Error('Native adoption fixture'); } return retained.apply(this, arguments); };
  });
  const before = await state(page); await runUpdate(page); await expect(status(page)).toContainText('Recalculation failed');
  expect(await state(page)).toEqual(before);
});

test('quota failure keeps the old autosave and reports the adopted character as unsaved', async ({ page }) => {
  await page.route(publicApi + '**', route => route.fulfill({ json: editedWarrior() })); await openManager(page);
  const before = await page.evaluate(() => {
    PandoraRemaked.builds.flushAutosave(); const saved = JSON.stringify(localStorage);
    Storage.prototype.setItem = function () { throw new DOMException('Synthetic quota', 'QuotaExceededError'); }; return saved;
  });
  await runUpdate(page); await expect(status(page)).toContainText('autosave failed');
  expect(await page.evaluate(() => PandoraRemaked.catalog.getRevision())).toBe(2);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);
  await expect(page.locator('[data-remaked-autosave-status]')).toHaveAttribute('data-state', 'warning');
});

test('failed rollback is reported honestly and pauses autosave until a successful recovery', async ({ page }) => {
  await page.route(publicApi + '**', route => route.fulfill({ json: editedWarrior() })); await openManager(page);
  const before = await page.evaluate(() => {
    PandoraRemaked.builds.flushAutosave(); const state = { payload: PandoraRemaked.adapter.serialize(), saved: JSON.stringify(localStorage) };
    window.adoptionRetainedCalcSet = CalcSet; window.CalcSet = function () { throw new Error('Persistent native adoption fixture'); };
    return state;
  });
  await runUpdate(page); await expect(status(page)).toContainText('restoration could not be verified');
  const failed = await page.evaluate(() => {
    const flushed = PandoraRemaked.builds.flushAutosave();
    return { ok: flushed.ok, code: flushed.error?.code, saved: JSON.stringify(localStorage) };
  });
  expect(failed).toEqual({ ok: false, code: 'restore-failed', saved: before.saved });
  await page.evaluate(payload => { window.CalcSet = window.adoptionRetainedCalcSet; return PandoraRemaked.builds.importPayload(payload); }, before.payload);
  expect(await page.evaluate(() => PandoraRemaked.builds.flushAutosave().ok)).toBe(true);
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before.payload);
});

test('adopted equipped weapon and Soul share their new pin with a fresh recipient, not a later head', async ({ page, browser }) => {
  const original = socketItems(), next = structuredClone(original); next.revision = 2; next.impactRevision = 2; next.records[0].calculationCode = '18=W95';
  await page.route(publicApi + '**', route => route.fulfill({ json: next })); await openManager(page);
  await page.evaluate(data => {
    PandoraRemaked.catalog.applySnapshot(data); PandoraRemaked.adapter.selectEquipment(0, data.records[0].engineId);
    PandoraRemaked.adapter.selectSoul({ slotIndex: 0, socketIndex: 4 }, 185); document.getElementById('SwitchUse_4').click();
    PandoraRemaked.builds.flushAutosave();
  }, original);
  // Retained ATK applies the untrained Warrior riding multiplier: ceil(77/10).
  expect(await page.evaluate(() => Number(document.getElementById('Status_18').textContent))).toBe(8);
  await runUpdate(page); await expect(status(page)).toContainText('Catalog 2 applied');
  const adopted = await state(page); expect(adopted.payload).toMatch(/^PS3:2:C1:/);
  // New base 95 plus STR 7 gives 102 on foot, then ceil(102/10) while riding.
  expect(await page.evaluate(() => Number(document.getElementById('Status_18').textContent))).toBe(11);
  expect(await page.evaluate(() => Number(Status.Equip[0][4]))).toBe(185);
  await page.locator('[data-remaked-share-build]').click(); const link = await page.locator('[data-remaked-share-url]').inputValue();
  const context = await browser.newContext(), requests = []; const recipient = await context.newPage();
  try {
    await context.route(publicApi + '**', route => {
      const revision = new URL(route.request().url()).searchParams.get('revision'); requests.push(revision);
      const later = structuredClone(next); later.revision = 3; later.impactRevision = 3; later.records[0].calculationCode = '18=W125';
      return route.fulfill({ json: revision === '2' ? next : later });
    });
    await recipient.goto(link); await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
    expect(await recipient.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(adopted.payload);
    expect(await recipient.evaluate(() => Number(document.getElementById('Status_18').textContent))).toBe(11); expect(requests).toEqual(['2']);
    await recipient.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => recipient.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await context.setOffline(true); await recipient.reload(); await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
    expect(await recipient.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(adopted.payload);
  } finally { await context.close(); }
});

test('automatic catalog status is compact, localized and has no manual update button', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.route(publicApi + '**', route => route.fulfill({ json: publication(0) }));
  await page.goto('/');
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await page.locator('[data-remaked-builds-open]').click();

  await expect(page.locator('[data-remaked-catalog-update]')).toHaveCount(0);
  const catalogLine = page.locator('[data-remaked-catalog-revision]');
  await expect(catalogLine).toHaveText('Каталог: исходная ревизия 0 · обновляется автоматически');
  await expect(catalogLine).toHaveAttribute('title', /названий/);
  await expect(page.locator('#remaked-catalog-update-help')).toHaveCount(0);
  const box = await page.locator('.remaked-build-catalog').boundingBox();
  expect(box.height).toBeLessThan(70);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('modern-catalog-adoption-mobile.png') });
});

for (const action of ['import', 'named load']) {
  test('explicit ' + action + ' clears an obsolete shared link only after success and survives reload', async ({ page }) => {
    await openManager(page);
    const target = await page.evaluate(() => {
      const original = PandoraRemaked.adapter.serialize();
      StatusMove('Lev', 54); CalcSet('Lev'); document.getElementById('SwitchUse_4').click();
      const target = PandoraRemaked.adapter.serialize(); PandoraRemaked.buildStore.saveBuild('Target', target);
      PandoraRemaked.adapter.load(original); PandoraRemaked.builds.flushAutosave();
      history.replaceState(null, '', '#build=' + encodeURIComponent(original)); return target;
    });
    await page.keyboard.press('Escape'); await page.locator('[data-remaked-builds-open]').click();
    if (action === 'import') {
      const before = await state(page); await page.locator('#InCode').fill('1,2,3');
      await page.locator('[data-remaked-import-build]').click(); await expect(page.locator('[data-remaked-code-status]')).toContainText('Invalid');
      expect(await state(page)).toEqual(before);
      await page.locator('#InCode').fill(target); await page.locator('[data-remaked-import-build]').click();
      await expect(page.locator('[data-remaked-code-status]')).toContainText('imported');
    } else {
      await page.locator('[data-remaked-build-load]').click(); await expect(page.locator('[data-remaked-build-manager-status]')).toContainText('Loaded');
    }
    expect(await page.evaluate(() => location.hash)).toBe('');
    expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(target);
    await page.reload(); await expect(page.locator('[data-remaked-autosave-status]')).toContainText('Restored autosave');
    expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(target);
  });
}
