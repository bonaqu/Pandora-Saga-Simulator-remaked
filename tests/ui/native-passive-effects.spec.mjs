import { test, expect } from '@playwright/test';
import { baselineById, sourceIdentity, sourceFingerprint, characterSourceFingerprint } from '../../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';

function snapshot(id, mode, effects = [], revision = 1) {
  const source = baselineById.get(id), identity = sourceIdentity(source), edit = draftFromSource(source, 'passive');
  if (mode) edit.intrinsicEffectMode = mode;
  edit.effects = effects;
  return { ok: true, schemaVersion: 1, sourceFingerprint, characterSourceFingerprint, revision,
    records: [compileRecord(validateDraft(edit, identity), identity, source)] };
}

test('remaining native stat hooks remove only their independently calculated contributions and revision zero restores them', async ({ page }) => {
  await page.goto('/');
  const cases = [
    { id: 'skill_entry.0.3', job: 1, branch: 0, kind: 'weapon', stat: 21, calc: 'WeaDAM' },
    { id: 'skill_entry.6.1', job: 11, branch: 6, kind: 'evasion', stat: 65, calc: 'EVA' },
    { id: 'skill_entry.12.1', job: 15, branch: 12, kind: 'spirit', stat: 4, calc: 'SPR' },
    { id: 'skill_entry.17.0', job: 22, branch: 17, kind: 'magic', stat: 42, calc: 'MATK' },
    { id: 'skill_entry.5.1', job: 6, branch: 5, kind: 'shield', stat: 145, calc: 'RESMagic' },
    { id: 'skill_entry.12.2', job: 18, branch: 12, kind: 'light', stats: [141, 142, 145], calcs: ['RESPoison', 'RESCharm', 'RESMagic'] },
    { id: 'skill_entry.17.1', job: 25, branch: 17, kind: 'dark', stats: [138, 139, 140], calcs: ['RESFire', 'RESIce', 'RESLightning'] }
  ].map(row => ({ ...row, data: snapshot(row.id, 'replace') }));
  const result = await page.evaluate(cases => {
    const api = PandoraRemaked, original = api.adapter.serialize(), source = JSON.stringify(Skill), rows = [];
    try {
      for (const entry of cases) {
        api.adapter.load(original); StatusMove('Lev', 54); CalcSet('Lev');
        const jobs = document.getElementById('SelJob'); jobs.selectedIndex = entry.job; jobs.onchange();
        Status.Skill[entry.branch][0] = 40; CalcSet('ALL');
        if (entry.kind === 'shield' && !api.adapter.selectEquipment(1, 200001)) throw Error('Shield fixture unavailable');
        if (entry.kind === 'light' || entry.kind === 'dark') {
          const select = document.getElementById('SelEquip_2_0'), option = [...select.options].find(row => Number(row.value) % 10000 > 0);
          if (!option || !api.adapter.selectEquipment(2, Number(option.value))) throw Error('Armor fixture unavailable');
          const gem = Name.Gem[1].findIndex(row => row[0] === (entry.kind === 'light' ? '光' : '闇'));
          if (gem < 0) throw Error('Element fixture unavailable');
          Status.Equip[2][2] = gem; Status.Equip[2][3] = 1; CalcSet('Equip');
        }
        Flag[2] = 3;
        const stats = entry.stats || [entry.stat], calcs = entry.calcs || [entry.calc];
        const read = () => {
          CalcSet('ALL'); calcs.forEach(key => Calc(key));
          return stats.map(stat => stat === 4 ? Status.SPR[2] : Number(document.getElementById('Status_' + stat).textContent.replace(/,/g, '')));
        };
        const native = read(), sum = Status.Skill[entry.branch][0] + Status.Skill[entry.branch][1];
        let expected = entry.kind === 'evasion' ? 10 + Math.floor(Status.Skill[6][0] + Status.Skill[6][1] / 10)
          : entry.kind === 'magic' ? 10 + Math.floor(sum / 10)
          : entry.kind === 'shield' ? Math.floor(sum / 2)
          : entry.kind === 'light' || entry.kind === 'dark' ? 2 + Math.floor(sum / 50)
          : 1 + Math.floor(sum / 10);
        api.catalog.applySnapshot(entry.data); const replaced = read();
        api.catalog.useRevision(0); const restored = read();
        rows.push({ id: entry.id, native, replaced, restored, expected });
      }
    } finally { api.adapter.load(original); }
    return { rows, sourceUnchanged: JSON.stringify(Skill) === source, restored: api.adapter.serialize() === original };
  }, cases);
  for (const row of result.rows) {
    expect(row.expected, row.id).toBeGreaterThan(0);
    row.native.forEach((value, index) => expect(row.replaced[index], row.id).toBeCloseTo(value - row.expected, 8));
    expect(row.restored, row.id).toEqual(row.native);
  }
  expect(result.sourceUnchanged).toBe(true); expect(result.restored).toBe(true);
});

test('Merciful Blessing replacement disables exactly the three native healing amplifiers, not the healing formulas', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, original = api.adapter.serialize();
    try {
      StatusMove('Lev', 54); CalcSet('Lev'); const jobs = document.getElementById('SelJob'); jobs.selectedIndex = 16; jobs.onchange();
      Status.Skill[13][0] = 20; CalcSet('ALL'); Flag[5] = 1;
      const read = () => { ['FirstAid', 'Heal', 'HealingAura'].forEach(key => Calc(key)); return [0, 1, 2].map(index => Number(document.getElementById('ViewHeal_' + index + '_1').textContent)); };
      const lev = Status.Lev[0], ban = Status.Skill[13][0] + Status.Skill[13][1], int = Status.INT[0] + Status.INT[1] + Status.INT[2], factor = Status.LSk / 100;
      const expectedNative = [25 + lev * 2.5 + ban * 2.8 + int * 3, 105 + lev * 2 + ban * 5 + int * 10, 150 + lev * 2 + ban * 4 + int * 8.5].map(value => Math.floor(value * factor));
      const expectedReplaced = [25 + lev * 2.5 + ban * 1.4 + int, 50 + lev * 2 + ban * 3 + int * 6, 150 + lev * 2 + ban * 3 + int * 6].map(value => Math.floor(value * factor));
      const native = read(); api.catalog.applySnapshot(data); const replaced = read(); api.catalog.useRevision(0); const restored = read();
      return { native, replaced, restored, expectedNative, expectedReplaced };
    } finally { api.adapter.load(original); }
  }, snapshot('skill_entry.13.3', 'replace'));
  expect(result.native).toEqual(result.expectedNative); expect(result.replaced).toEqual(result.expectedReplaced); expect(result.restored).toEqual(result.native);
  for (let index = 0; index < 3; index++) expect(result.replaced[index]).toBeLessThan(result.native[index]);
});

test('all four riding replacements remove their class contribution and stat 81 bonus stays explicitly display-only', async ({ page }) => {
  await page.goto('/');
  const data = [3, 6, 10, 27].map((job, index) => ({ job, data: snapshot('skill_entry.24.' + index, 'replace'),
    display: snapshot('skill_entry.24.' + index, 'replace', [{ stat: 81, value: 7, unit: 'flat' }], 2) }));
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, original = api.adapter.serialize(), rows = [];
    try {
      for (const entry of data) {
        api.adapter.load(original); StatusMove('Lev', 54); CalcSet('Lev');
        const jobs = document.getElementById('SelJob'); jobs.selectedIndex = entry.job; jobs.onchange();
        api.adapter.selectEquipment(0, 1); Flag[7] = 1; Flag[3] = 1;
        const read = () => { CalcSet('ALL'); Calc('RelHorse'); return [18, 62, 65, 73, 77, 79, 81].map(stat => document.getElementById('Status_' + stat).textContent); };
        const native = read(); api.catalog.applySnapshot(entry.data); const replaced = read();
        api.catalog.applySnapshot(entry.display); const displayed = read();
        SkillList('Create'); SkillList('Color');
        const key = entry.display.records[0].category + '_' + entry.display.records[0].index;
        const visibleLearned = Learn[0].includes(key);
        StatusMove('Lev', -11); CalcSet('Lev'); const low = read();
        StatusMove('Lev', 11); CalcSet('Lev'); const high = read();
        api.catalog.useRevision(0); const restored = read();
        rows.push({ job: entry.job, native, replaced, displayed, low, high, visibleLearned, restored, level: Status.Lev[0], classId: Status.Job[2] });
      }
    } finally { api.adapter.load(original); }
    return rows;
  }, data);
  for (const row of result) {
    expect(Number(row.native[6]) - Number(row.replaced[6])).toBe(row.job === 10 ? 20 : row.job === 27 ? 30 : 40);
    expect(row.displayed.slice(0, 6)).toEqual(row.replaced.slice(0, 6));
    expect(Number(row.displayed[6]), JSON.stringify(row)).toBe(Number(row.replaced[6]) + 7); expect(row.restored).toEqual(row.native);
    expect(row.visibleLearned).toBe(true); expect(Number(row.low[6])).toBe(Number(row.replaced[6])); expect(row.high).toEqual(row.displayed);
  }
});

test('replacement follows custom class and level gates and pinned comparison/fresh online recipients restore the same calculation', async ({ page, browser }) => {
  const data = snapshot('skill_entry.0.3', 'replace', [{ stat: 21, value: 7, unit: 'flat' }]);
  data.records[0].learningRequirements = { classIds: ['job.1'], classScope: 'exact', minimumLevel: 20, branches: [] };
  await page.goto('/');
  const saved = await page.evaluate(data => {
    const api = PandoraRemaked, original = api.adapter.serialize(); StatusMove('Lev', 54); CalcSet('Lev');
    const jobs = document.getElementById('SelJob'); jobs.selectedIndex = 1; jobs.onchange(); Flag[2] = 3;
    api.catalog.applySnapshot(data);
    const read = () => { CalcSet('ALL'); Calc('WeaDAM'); return Number(document.getElementById('Status_21').textContent); };
    const high = read(), payload = api.adapter.serialize(), summary = api.adapter.readCalculatedSummary();
    StatusMove('Lev', -40); CalcSet('Lev'); const low = read();
    StatusMove('Lev', 40); CalcSet('Lev'); jobs.selectedIndex = 2; jobs.onchange(); const otherClass = read();
    api.adapter.load(payload); const restored = read(); api.builds.flushAutosave(); const beforeStorage = JSON.stringify(localStorage);
    const comparison = api.adapter.evaluateBuild(original); const intact = api.adapter.serialize() === payload && JSON.stringify(localStorage) === beforeStorage;
    return { high, low, otherClass, restored, payload, summary, intact, comparisonSummary: comparison.summary };
  }, data);
  expect(saved.high).toBe(7); expect(saved.low).toBe(0); expect(saved.otherClass).toBe(0); expect(saved.restored).toBe(7); expect(saved.intact).toBe(true); expect(saved.comparisonSummary).not.toEqual(saved.summary);
  const context = await browser.newContext();
  try {
    await context.route('https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog**', route => route.fulfill({ status: 200, json: data }));
    const recipient = await context.newPage();
    await recipient.goto('http://127.0.0.1:8000/#build=' + encodeURIComponent(saved.payload));
    await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
    expect(await recipient.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(saved.payload);
    expect(await recipient.evaluate(() => PandoraRemaked.adapter.readCalculatedSummary())).toEqual(saved.summary);
    await recipient.reload();
    await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
    expect(await recipient.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(saved.payload);
    expect(await recipient.evaluate(() => PandoraRemaked.adapter.readCalculatedSummary())).toEqual(saved.summary);
  } finally { await context.close(); }
});

test('Brewer replacement removes the real native potion bonus instead of double stacking, with old pins and repeated calculations intact', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(({ add, replace, remove }) => {
    const api = PandoraRemaked, original = api.adapter.serialize(), source = JSON.stringify(Skill);
    StatusMove('Lev', 54); CalcSet('Lev');
    const read = () => { CalcSet('ALL'); return Number(document.getElementById('Status_8').textContent); };
    const native = read(); api.catalog.applySnapshot(add); const added = read(), oldCode = api.adapter.serialize();
    api.catalog.applySnapshot(replace); const replaced = read(), newCode = api.adapter.serialize();
    const repeated = [read(), read(), read()];
    api.catalog.applySnapshot(remove); const removed = read();
    api.adapter.load(oldCode); const old = read(); api.adapter.load(newCode); const current = read();
    api.adapter.load(original);
    return { native, added, replaced, removed, repeated, old, current, unchanged: JSON.stringify(Skill) === source, restored: api.adapter.serialize() === original };
  }, { add: snapshot('skill_entry.0.1', null, [{ stat: 8, value: 7, unit: 'flat' }]),
    replace: snapshot('skill_entry.0.1', 'replace', [{ stat: 8, value: 7, unit: 'flat' }], 2),
    remove: snapshot('skill_entry.0.1', 'replace', [], 3) });
  expect(result.native).toBeGreaterThan(100); expect(result.added).toBe(result.native + 7);
  expect(result.replaced).toBe(107); expect(result.removed).toBe(100); expect(result.repeated).toEqual([107, 107, 107]);
  expect(result.old).toBe(result.added); expect(result.current).toBe(107); expect(result.unchanged).toBe(true); expect(result.restored).toBe(true);
});

test('Hawkeye removes only its accuracy contribution and adds the declared flat bonus once, without altering source state', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, original = api.adapter.serialize(), skill = JSON.stringify(Skill);
    StatusMove('Lev', 54); CalcSet('Lev'); document.getElementById('SelJob').selectedIndex = 8; document.getElementById('SelJob').onchange();
    const read = () => { CalcSet('ALL'); return Number(document.getElementById('Status_62').textContent); };
    const native = read(), contribution = 10 + Math.floor(Status.Skill[6][0] + Status.Skill[6][1] / 10);
    api.catalog.applySnapshot(data); const replacement = read(); api.catalog.useRevision(0); CalcSet('ALL'); const restored = read();
    api.adapter.load(original); return { native, contribution, replacement, restored, sourceUnchanged: skill === JSON.stringify(Skill) };
  }, snapshot('skill_entry.6.0', 'replace', [{ stat: 62, value: 3, unit: 'flat' }]));
  expect(result.replacement).toBe(result.native - result.contribution + 3); expect(result.restored).toBe(result.native); expect(result.sourceUnchanged).toBe(true);
});

test('Jousting replacement is isolated to its class; other riding passives, context and source arrays remain unchanged', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, original = api.adapter.serialize(); StatusMove('Lev', 54); CalcSet('Lev');
    const records = [], source = JSON.stringify(Skill);
    for (const job of [3, 6, 10, 27]) {
      document.getElementById('SelJob').selectedIndex = job; document.getElementById('SelJob').onchange();
      Flag[7] = 1; const read = () => { CalcSet('ALL'); return Number(document.getElementById('Status_81').textContent); };
      api.catalog.useRevision(0); const before = read(); api.catalog.applySnapshot(data); const after = read();
      records.push({ job, before, after });
    }
    const context = api.catalog.captureContext(); api.adapter.load(original);
    return { records, riding: context.riding, sourceUnchanged: source === JSON.stringify(Skill) };
  }, snapshot('skill_entry.24.0', 'replace'));
  for (const row of result.records) expect(row.after).toBe(row.before - (row.job === 3 ? 40 : 0));
  expect(result.riding).toBe(1); expect(result.sourceUnchanged).toBe(true);
});

test('public codec rejects unsupported replacement identities and active/variant source mutations before changing the character', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, before = api.adapter.serialize(), invalid = [];
    for (const mutate of [record => record.intrinsicEffectMode = 'eval(1)', record => record.active = true,
      record => { record.id = 'skill_entry.1.6'; record.category = 1; record.index = 6; record.prerequisiteCode = Skill[0][1][6][9]; }]) {
      const changed = structuredClone(data); mutate(changed.records[0]);
      try { api.catalog.applySnapshot(changed); invalid.push(false); } catch { invalid.push(true); }
    }
    return { invalid, unchanged: before === api.adapter.serialize() };
  }, snapshot('skill_entry.6.0', 'replace'));
  expect(result).toEqual({ invalid: [true, true, true], unchanged: true });
});
