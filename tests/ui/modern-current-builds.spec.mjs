import { test, expect } from '@playwright/test';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };
import records from '../fixtures/current-modern-items.json' with { type: 'json' };

const api = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog';
const published = 'https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/';
function snapshot(revision, items = records) {
  return { ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256,
    characterSourceFingerprint: character.sourceFingerprint, revision, impactRevision: revision, records: items };
}

test('every equipment list sorts by level across categories with stable numeric ties', async ({ page }) => {
  await page.goto('/');
  const lists = await page.evaluate(data => {
    PandoraRemaked.catalog.applySnapshot(data);
    return PandoraRemaked.adapter.listEquipmentTargets().map(target => PandoraRemaked.adapter.listEquipmentOptions(target.slotIndex)
      .filter(option => Number(option.value) % 10000 !== 0).map(option => [option.level, Number(option.value)]));
  }, snapshot(86));
  for (const list of lists) expect(list).toEqual([...list].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  await page.locator('[data-remaked-equipment-picker="SelEquip_11_0"]').click();
  const ids = await page.evaluate(() => Array.from(document.querySelectorAll('[data-remaked-picker-panel] [data-remaked-search-result]')).map(node => Number(node.dataset.value)).filter(id => id % 10000));
  expect(ids).toEqual(lists[11].map(row => row[1]));
});

test('Golden Mantle aliases only its cosmetic identity; functional Golden Cloak stays separate', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked;
    api.adapter.selectEquipment(7, 350003);
    const old = api.adapter.serialize();
    const migrated = api.catalog.migratePayload(old, data);
    api.catalog.applySnapshot(data, { rebuild: false });
    api.adapter.load(migrated.payload);
    return { selected: Number(Status.Equip[7][0]), options: api.adapter.listEquipmentOptions(7).map(option => Number(option.value)) };
  }, snapshot(86));
  expect(result.selected).toBe(350051);
  expect(result.options).not.toContain(350003);
  expect(result.options).toContain(350051);
  expect(result.options).toContain(350038);
});

test('Breast Plate descriptions keep effect lines in both localized detail cards and native data', async ({ page }) => {
  await page.goto('/?ui=ru');
  const plate = records.find(record => record.names.ru === 'Латный нагрудник');
  const description = await page.evaluate(data => {
    PandoraRemaked.catalog.applySnapshot(data);
    const id = data.records.find(record => record.names.ru === 'Латный нагрудник').engineId;
    return { text: PandoraRemaked.adapter.readItemDetails('equipment', id, 2).descriptions.join('\n'), native: EquipData[1][Math.floor(id / 10000)][id % 10000][1] };
  }, snapshot(86));
  expect(description.text).toContain('урон.\nПРВ +1\nСопротивляемость оглушению +8%');
  expect(description.native).toContain('<br />');
  await page.locator('[data-remaked-equipment-picker="SelEquip_3_0"]').click();
  const row = page.locator(`[data-remaked-picker-panel] [data-remaked-search-row][data-value="${plate.engineId}"]`);
  await row.locator('summary').click();
  await expect(row.locator('.remaked-item-description')).toContainText('Слоты душ:');
  expect(await row.locator('.remaked-item-description p').first().evaluate(node => getComputedStyle(node).whiteSpace)).toBe('pre-line');
});

for (const width of [390, 1440]) {
  test('Russian character labels omit the unreachable character Potential budget at ' + width, async ({ page }, info) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 }); await page.goto('/?ui=ru');
    await expect(page.locator('#remaked-level-label')).toHaveText('Уровень');
    await expect(page.locator('#remaked-potential-budget-label')).toHaveCount(0);
    expect(await page.locator('#StatusUnP_0').evaluate(node => node.closest('.input_gt').parentElement.hidden)).toBe(true);
    const labels = await page.evaluate(() => ['StatusStP_0', 'StatusSkP_0'].map(id => document.getElementById(id).closest('.input_gt').previousElementSibling.textContent));
    expect(labels).toEqual(['Хар-ки', 'Умения']);
    await expect(page.locator('[data-remaked-skill-column-header]')).toContainText('Потенциал.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath('modern-character-' + width + '.png') });
  });
}

test('production startup and old share link load latest mechanics even when historical metadata is unavailable', async ({ page }) => {
  await page.route(published + '**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/Pandora-Saga-Simulator-remaked/', '/');
    const response = await route.fetch({ url: 'http://127.0.0.1:8000' + path }); await route.fulfill({ response });
  });
  await page.route(api + '**', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('revision') && Number(url.searchParams.get('revision')) !== 86) return route.fulfill({ status: 404 });
    const data = snapshot(86); const { records, ...head } = data;
    return route.fulfill({ json: url.pathname.endsWith('/head') ? head : data });
  });
  await page.goto('/');
  const old = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  await page.goto(published + '#build=' + encodeURIComponent('PS3:1:' + old));
  await expect(page.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
  expect(await page.evaluate(() => PandoraRemaked.catalog.getRevision())).toBe(86);
  expect(await page.evaluate(() => PandoraRemaked.buildStore.readAutosave().record.payload)).toMatch(/^PS3:86:/);
  expect(await page.evaluate(() => PandoraRemaked.adapter.listEquipmentOptions(7).some(option => option.value === '350051'))).toBe(true);
});

test('new share code is substantially shorter and malformed code cannot replace the current character', async ({ page }) => {
  await page.goto('/'); await page.locator('[data-remaked-builds-open]').click();
  const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  await page.locator('[data-remaked-share-build]').click();
  // The short-link POST is asynchronous; CI intentionally has no trusted IP
  // so an offline-compatible S1 fallback is also a valid, working result.
  await expect(page.locator('[data-remaked-share-url]')).toHaveValue(/#(?:b=[A-Za-z0-9_-]{12}|build=S1\.)/);
  const url = await page.locator('[data-remaked-share-url]').inputValue();
  expect(url).toMatch(/#(?:b=[A-Za-z0-9_-]{12}|build=S1\.)/);
  expect(url.length).toBeLessThan(('http://127.0.0.1:8000/#build=' + encodeURIComponent(before)).length / 2);
  await page.evaluate(() => { location.hash = 'build=S1.AQ'; });
  await expect(page.locator('[data-remaked-autosave-status]')).toContainText('Invalid share link');
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before);
});

for (const conflict of ['changed stats','deleted canonical','disabled canonical']) {
  test('reviewed Golden Mantle identity remains stable after '+conflict,async({page})=>{
    await page.goto('/');
    const data=snapshot(87,structuredClone(records));
    const canonical=data.records.find(record=>record.engineId===350051);
    if(conflict==='changed stats'){canonical.names.en='Updated golden mantle';canonical.calculationCode='49=0_6=50';}
    if(conflict==='deleted canonical') data.records=data.records.filter(record=>record!==canonical);
    if(conflict==='disabled canonical') canonical.disabled=true;
    const result=await page.evaluate(data=>{
      PandoraRemaked.adapter.selectEquipment(7,350003);const old=PandoraRemaked.adapter.serialize();
      const migrated=PandoraRemaked.catalog.migratePayload(old,data);PandoraRemaked.catalog.applySnapshot(data,{rebuild:false});PandoraRemaked.adapter.load(migrated.payload);
      return {selected:Number(Status.Equip[7][0]),options:PandoraRemaked.adapter.listEquipmentOptions(7).map(item=>Number(item.value)),changes:migrated.changes};
    },data);
    expect(result.selected).toBe(conflict==='changed stats'?350051:350000);
    expect(result.options).not.toContain(350003);expect(result.options).toContain(350038);
    expect(result.changes).toContainEqual(expect.objectContaining({kind:'equipment',type:conflict==='changed stats'?'changed':'removed'}));
  });
}
