import { test, expect } from '@playwright/test';
import { approvedRacialCorrections } from '../../admin-api/src/racial-corrections.mjs';
import { baselineById, sourceIdentity, characterSourceFingerprint, sourceFingerprint } from '../../admin-api/src/catalog-baseline.mjs';
import { compileRecord } from '../../admin-api/src/catalog-model.mjs';
import { currentRacialDrafts } from '../../admin-api/src/current-racial-data.mjs';

const corrected = { ok: true, schemaVersion: 1, revision: 2, sourceFingerprint, characterSourceFingerprint,
  records: approvedRacialCorrections().map(edit => { const source = baselineById.get(edit.id); return compileRecord(edit, sourceIdentity(source), source); }) };

test('all eighteen racial selections differ from the retained engine only by the two approved critical corrections', async ({ page }) => {
  await page.goto('/'); await page.evaluate(data => PandoraRemaked.catalog.applySnapshot(data), corrected);
  for (const race of [0, 1, 2, 3, 4, 5]) for (const passive of [0, 1, 2]) {
    const actual = await page.evaluate(({ race, passive }) => {
      const raceInput = document.getElementById('SelRace'); raceInput.value = race; raceInput.dispatchEvent(new Event('change', { bubbles: true }));
      const passiveInput = document.getElementById('SelRSkill'); passiveInput.value = passive; passiveInput.dispatchEvent(new Event('change', { bubbles: true }));
      CalcSet('ALL'); return { code: Store(), summary: PandoraRemaked.adapter.readCalculatedSummary() };
    }, { race, passive });
    const original = await page.evaluate(({ code, data }) => {
      const api = PandoraRemaked;
      api.catalog.applySnapshot({ ...data, revision: 0, records: [] }); api.adapter.load(code);
      const summary = api.adapter.readCalculatedSummary(); return summary;
    }, { code: actual.code, data: corrected });
    const changed = original.filter((field, index) => JSON.stringify(field) !== JSON.stringify(actual.summary[index]));
    if (race >= 4 && passive === 0) {
      expect(changed.map(field => field.key)).toEqual(['crit']);
      const correctedCrit = actual.summary.find(field => field.key === 'crit');
      expect(correctedCrit.value).toBe(changed[0].value - 2);
    } else expect(changed).toEqual([]);
    await page.evaluate(data => PandoraRemaked.catalog.applySnapshot(data), corrected);
  }
});

const current = { ...corrected, revision: 3, records: currentRacialDrafts().map(edit => {
  const source = baselineById.get(edit.id); return compileRecord(edit, sourceIdentity(source), source);
}) };

test('all eighteen current racial effects produce independent native outputs and exact switch cleanup', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const results = await page.evaluate(data => {
    const api = PandoraRemaked; const ids = ['18', '146', '8', '76', '142', '149', '150', '151', '70', '69', '62', '65', '52_2', '60', '71', '72', '66', '10', '41'];
    function read() {
      const panel = Flag[2];
      for (const value of [3, 4, 5]) { Flag[2] = value; CalcSet('ALL'); }
      Flag[2] = panel;
      return Object.fromEntries(ids.map(id => [id, document.getElementById('Status_' + id)?.textContent.replaceAll(',', '') || 'missing']));
    }
    const rows = [];
    api.catalog.applySnapshot(data);
    for (let race = 0; race < 6; race++) for (let passive = 0; passive < 3; passive++) {
      Status.Job[0] = race; Status.Job[1] = 3; Status.Equip[0][0] = 0;
      CalcSet('Job'); Status.Job[1] = 3; const before = read();
      const originalOptions = EquipOpt, options = JSON.stringify(EquipOpt);
      Status.Job[1] = passive; const after = read();
      const restored = Status.Job[1] === passive && EquipOpt === originalOptions && JSON.stringify(EquipOpt) === options;
      Status.Job[1] = 3; const removed = read();
      rows.push({ race, passive, before, after, removed, restored });
    }
    Status.Job[1] = 0; CalcSet('ALL'); return rows;
  }, current);
  const changes = {
    '0.1': { 146: 15 }, '0.2': { 8: 15 }, '1.0': { 76: -15 }, '1.2': { 142: 20 },
    '2.0': { 149: 10, 150: 10, 151: 10 }, '2.2': { 70: -5 },
    '3.0': { 69: 5 }, '4.0': { '52_2': -10 }, '4.2': { 71: 10 }, '5.0': { 60: -10 }, '5.1': { 10: 18 }, '5.2': { 72: -10 }
  };
  for (const row of results) {
    const key = row.race + '.' + row.passive, expected = changes[key] || {};
    if (key === '3.1') expected[62] = Math.ceil(Number(row.before[62]) * .10);
    if (key === '3.2') expected[65] = Math.ceil(Number(row.before[65]) * .05);
    const changed = Object.keys(row.before).filter(id => row.before[id] !== row.after[id]);
    expect(changed.sort(), key).toEqual(Object.keys(expected).sort());
    for (const [id, value] of Object.entries(expected)) expect(Number(row.after[id]) - Number(row.before[id]), key + ' stat ' + id).toBe(value);
    expect(row.removed, key + ' removal').toEqual(row.before); expect(row.restored, key + ' native state').toBe(true);
  }
  expect(errors).toEqual([]);
});

test('racial ATK uses separate native flat/percent modifiers with the correct weapon categories', async ({ page }) => {
  await page.goto('/');
  const rows = await page.evaluate(data => {
    const api = PandoraRemaked; api.catalog.applySnapshot(data); const result = [];
    for (const [race, passive] of [[0, 0], [2, 1], [4, 1]]) for (let category = -1; category <= 13; category++) {
      Status.Job[0] = race; Status.Job[1] = 3; Status.Equip[0][0] = category < 0 ? 0 : category * 10000 + 1;
      CalcSet('Equip'); CalcSet('ALL'); const before = Number(document.getElementById('Status_18').textContent.replaceAll(',', ''));
      Status.Job[1] = passive; CalcSet('ALL'); const after = Number(document.getElementById('Status_18').textContent.replaceAll(',', ''));
      Status.Job[1] = 3; CalcSet('ALL'); const removed = Number(document.getElementById('Status_18').textContent.replaceAll(',', ''));
      result.push({ race, passive, category, before, after, removed });
    }
    Status.Job[1] = 0; CalcSet('ALL'); return result;
  }, current);
  const categories = { 0: [0, 2, 4, 6, 10, 12], 2: [2, 3, 10, 11], 4: [1, 3, 5, 7, 8, 9, 11, 13] };
  for (const row of rows) {
    const delta = categories[row.race].includes(row.category) ? Math.ceil(row.before * .12) + (row.race === 4 ? 0 : 10) : 0;
    expect(row.after - row.before, JSON.stringify(row)).toBe(delta);
    expect(row.removed).toBe(row.before);
  }
});

test('real race/passive controls remove old bonuses and pinned save/load restores the current rather than historical crit', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.evaluate(data => { PandoraRemaked.catalog.applySnapshot(data); StatusMove('Lev', 54); CalcSet('Lev'); }, current);
  await page.locator('[data-remaked-tab="0"]').click();
  await page.locator('#SelRace').selectOption('4'); await page.locator('#SelRSkill').selectOption('0');
  expect(await page.evaluate(() => PandoraRemaked.adapter.selectEquipment(0, 10001))).toBe(true);
  const read = () => page.evaluate(() => PandoraRemaked.adapter.readCalculatedSummary());
  const value = (rows, key) => rows.find(field => field.key === key).value;
  const stone = await read(); expect(value(stone, 'physicalDamageResist')).toBe(-10);
  await page.locator('#SelRSkill').selectOption('1'); const arm = await read();
  expect(value(arm, 'physicalDamageResist')).toBe(0);
  expect(value(arm, 'crit')).toBe(value(stone, 'crit'));
  expect(value(arm, 'physicalAttack') - value(stone, 'physicalAttack')).toBe(Math.ceil(value(stone, 'physicalAttack') * .12));
  await page.locator('#SelRSkill').selectOption('2'); const spirit = await read();
  expect(value(spirit, 'physicalAttack')).toBe(value(stone, 'physicalAttack'));
  expect(value(spirit, 'critDamage')).toBe(110); expect(value(spirit, 'crit')).toBe(value(stone, 'crit'));
  await page.locator('#SelRace').selectOption('3'); await page.locator('#SelRSkill').selectOption('0');
  const myrine = await read(); expect(value(myrine, 'physicalDamageResist')).toBe(0); expect(value(myrine, 'critDamage')).toBe(100);
  await expect(page.locator('#RemakedRacialInfo')).toContainText('Acute Senses');
  await page.evaluate(() => PandoraRemaked.i18n.setLocale('ru'));
  await expect(page.locator('#RemakedRacialInfo')).toContainText('Охотничье чутьё');
  await expect(page.locator('#RemakedRacialInfo')).toContainText('Увеличивает вероятность критического удара на 5%.');
  const payload = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  const old = await page.evaluate(data => { PandoraRemaked.catalog.applySnapshot(data); return PandoraRemaked.adapter.readCalculatedSummary(); }, corrected);
  expect(value(myrine, 'crit') - value(old, 'crit')).toBe(3);
  await page.evaluate(code => PandoraRemaked.adapter.load(code), payload);
  expect(await page.evaluate(() => PandoraRemaked.catalog.getRevision())).toBe(3);
  expect(await read()).toEqual(myrine);
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(payload);
  await page.locator('#SelRace').selectOption('1'); await page.locator('#SelRSkill').selectOption('1');
  await expect(page.locator('#RemakedRacialInfo')).toContainText('Дальность +500 указана справочно');
  await page.evaluate(() => PandoraRemaked.i18n.setLocale('en'));
  await expect(page.locator('#RemakedRacialInfo')).toContainText('Increases attack range by 500');
  await expect(page.locator('#RemakedRacialInfo')).toContainText('Calculation limit:');
  async function checkDescriptionBounds() {
    const info = page.locator('#RemakedRacialInfo');
    await info.scrollIntoViewIfNeeded();
    const geometry = await info.evaluate(node => {
      const card = node.closest('.sub_win'), content = node.closest('.remaked-native-panel-content');
      if (!card || !content) return null;
      const a = node.getBoundingClientRect(), b = card.getBoundingClientRect();
      return { left: a.left - b.left, right: b.right - a.right, top: a.top - b.top, bottom: b.bottom - a.bottom };
    });
    expect(geometry).not.toBeNull();
    expect(Object.values(geometry).every(value => value >= -1)).toBe(true);
  }
  await checkDescriptionBounds();
  await page.screenshot({ path: testInfo.outputPath('racial-job-desktop.png'), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => PandoraRemaked.i18n.setLocale('ru'));
  await page.locator('#SelRace').selectOption('5'); await page.locator('#SelRSkill').selectOption('1');
  await expect(page.locator('#RemakedRacialInfo')).toContainText('Всплеск магии');
  await expect(page.locator('#RemakedRacialInfo')).toContainText('18%');
  await checkDescriptionBounds();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('racial-job-touch.png'), fullPage: false });
});

test('client rejects duplicate units and forged racial conditions before mutating the build', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked; api.catalog.applySnapshot(data); const payload = api.adapter.serialize(), summary = api.adapter.readCalculatedSummary();
    const rejected = [];
    for (const change of [record => record.effects.push({ ...record.effects[0] }), record => record.bonusRequirements.weaponCategories.push(0), record => record.bonusRequirements.shieldRequired = 'false', record => record.calculationNotes = { xx: 'bad locale' }, record => record.effects[0].unit = 'unknown']) {
      const invalid = structuredClone(data); change(invalid.records[0]);
      try { api.catalog.applySnapshot(invalid); rejected.push(false); } catch { rejected.push(true); }
    }
    return { rejected, unchanged: payload === api.adapter.serialize(), summaryUnchanged: JSON.stringify(summary) === JSON.stringify(api.adapter.readCalculatedSummary()), revision: api.catalog.getRevision() };
  }, current);
  expect(result).toEqual({ rejected: [true, true, true, true, true], unchanged: true, summaryUnchanged: true, revision: 3 });
});
