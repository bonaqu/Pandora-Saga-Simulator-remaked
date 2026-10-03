import { test, expect } from '@playwright/test';
import skills from '../../data/generated/skills.v1.json' with { type: 'json' };
import { variant, snapshot } from './helpers/skill-variants.mjs';

test('comparison evaluates each distinct skill revision and restores active catalog, C1 context, native tables and saved builds', async ({ page }) => {
  await page.goto('/');
  const one = variant('skill.0.1', edit => { edit.effects = [{ stat: 6, value: 5, unit: 'flat' }]; edit.bonusRequirements.ridingRequired = true; });
  const two = structuredClone(one); two.effects[0].value = 9;
  const result = await page.evaluate(({ first, second }) => {
    const api = PandoraRemaked; StatusMove('Lev', 54); CalcSet('Lev'); document.getElementById('SwitchUse_4').click();
    const original = api.adapter.serialize(), nativeTables = JSON.stringify(Skill);
    api.catalog.applySnapshot(first); const a = api.adapter.serialize(), lpA = Status.LP;
    const namedA = api.buildStore.saveBuild('Variant old pin', a);
    api.catalog.applySnapshot(second); const b = api.adapter.serialize(), lpB = Status.LP;
    const namedB = api.buildStore.saveBuild('Variant new pin', b); api.builds.flushAutosave();
    const before = { payload: b, context: api.catalog.captureContext(), summary: api.adapter.readCalculatedSummary(), tables: JSON.stringify(Skill), storage: JSON.stringify(localStorage) };
    for (const code of [original, a, b]) api.adapter.evaluateBuild(code);
    const after = { payload: api.adapter.serialize(), context: api.catalog.captureContext(), summary: api.adapter.readCalculatedSummary(), tables: JSON.stringify(Skill), storage: JSON.stringify(localStorage) };
    return { before, after, nativeUnchanged: nativeTables === JSON.stringify(Skill), lpA, lpB, a: namedA.build.id, b: namedB.build.id };
  }, { first: snapshot([one]), second: snapshot([two], 2) });
  expect(result.after).toEqual(result.before); expect(result.nativeUnchanged).toBe(true); expect(result.lpB - result.lpA).toBe(4);
  await page.locator('[data-remaked-compare-open]').click();
  await page.locator('[data-remaked-compare-a]').selectOption(result.a); await page.locator('[data-remaked-compare-b]').selectOption(result.b);
  await expect(page.locator('[data-remaked-compare-row][data-stat-key="lp"] [data-remaked-delta]')).toHaveText('+4');
  expect(await page.evaluate(() => ({ payload: PandoraRemaked.adapter.serialize(), context: PandoraRemaked.catalog.captureContext(), summary: PandoraRemaked.adapter.readCalculatedSummary(), tables: JSON.stringify(Skill), storage: JSON.stringify(localStorage) }))).toEqual(result.before);
});

test('explicit adoption adds a learned variant and updates only current autosave while source tables, C1 and named pins survive reload', async ({ page }) => {
  const data = snapshot([variant('skill.0.1', edit => { edit.effects = [{ stat: 6, value: 5, unit: 'flat' }]; edit.bonusRequirements.ridingRequired = true; })]);
  await page.route('https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog**', route => route.fulfill({ json: data }));
  await page.goto('/');
  const before = await page.evaluate(() => {
    const api = PandoraRemaked; StatusMove('Lev', 54); CalcSet('Lev'); document.getElementById('SwitchUse_4').click();
    const payload = api.adapter.serialize(); api.buildStore.saveBuild('Keep source skill pin', payload); api.builds.flushAutosave();
    return { lp: Status.LP, context: api.catalog.captureContext(), tables: JSON.stringify(Skill), named: localStorage.getItem(api.buildStore.BUILDS_KEY) };
  });
  await page.locator('[data-remaked-builds-open]').click(); await page.locator('[data-remaked-catalog-update]').click();
  await expect(page.locator('[data-remaked-catalog-status]')).toContainText('Catalog 1 applied');
  const after = await page.evaluate(() => ({ payload: PandoraRemaked.adapter.serialize(), lp: Status.LP, context: PandoraRemaked.catalog.captureContext(), tables: JSON.stringify(Skill), named: localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY) }));
  expect(after.payload).toMatch(/^PS3:1:C1:/); expect(after.lp).toBe(before.lp + 5); expect(after.context).toEqual(before.context);
  expect(after.tables).toBe(before.tables); expect(after.named).toBe(before.named);
  await page.reload(); await expect(page.locator('[data-remaked-autosave-status]')).toContainText('Restored autosave');
  expect(await page.evaluate(() => ({ payload: PandoraRemaked.adapter.serialize(), lp: Status.LP }))).toEqual({ payload: after.payload, lp: after.lp });
});

test('all 211 variant learning results match retained source ordering across 28 classes, levels and branch allocation with the view closed', async ({ page }) => {
  test.setTimeout(90000); await page.goto('/');
  const data = snapshot(skills.records.map((row, index) => variant(row.id, () => {}, index + 1)));
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, tables = JSON.stringify(Skill); api.catalog.applySnapshot(data);
    const mismatches = [];
    for (let job = 0; job < 28; job++) for (const level of [1, 55]) {
      document.getElementById('SelJob').selectedIndex = job; document.getElementById('SelJob').onchange();
      StatusMove('Lev', level - Status.Lev[0]); CalcSet('Lev');
      for (const allocated of [false, true]) {
        if (allocated) {
          document.getElementById('remaked-skill-4-Potential-right3').click();
          document.getElementById('remaked-skill-4-Adeptness-right3').click();
          document.getElementById('remaked-skill-15-Potential-right3').click();
          document.getElementById('remaked-skill-15-Adeptness-right3').click();
        }
        const oldLearn = Learn, oldFlag = Flag[3]; let learned, potential;
        try {
          Learn = [[], [], [], []]; Flag[3] = 1;
          // Exact retained CalcSet('Job') traversal, not the adapter's traversal.
          for (let category = 0; category < Name.Skill.length; category++) {
            SkillList('Potential', category); SkillList('Adeptness', category);
          }
          learned = Learn[0].slice(); potential = Learn[1].slice();
        } finally { Learn = oldLearn; Flag[3] = oldFlag; }
        for (const row of api.catalog.variantSkills()) {
          const key = row.category + '_' + row.index;
          if (row.learned !== learned.includes(key) || row.potential !== potential.includes(key)) mismatches.push({ job, level, allocated, id: row.id });
        }
      }
    }
    return { mismatches, tableUnchanged: tables === JSON.stringify(Skill), classes: Skill.P.length, count: api.catalog.variantSkills().length };
  }, data);
  expect(result.mismatches).toEqual([]); expect(result.tableUnchanged).toBe(true); expect(result.classes).toBe(28); expect(result.count).toBe(211);
});

test('a native learning exception restores the original Learn, flags, option cache and permits recovery without stale bonuses', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked; api.catalog.applySnapshot(data);
    const oldLearn = Learn, oldFlag = Flag[3], oldOptions = EquipOpt, tables = JSON.stringify(Skill), native = SkillList;
    let message; StatusMove('Lev', 11);
    try {
      SkillList = function () { throw new Error('native learning sentinel'); };
      try { api.catalog.variantSkills(); } catch (error) { message = error.message; }
    } finally { SkillList = native; }
    const restored = Learn === oldLearn && Flag[3] === oldFlag && EquipOpt === oldOptions && JSON.stringify(Skill) === tables;
    CalcSet('Lev'); return { message, restored, strength: Status.STR[2], learned: api.catalog.variantSkills()[0].learned };
  }, snapshot([variant('skill.0.1', edit => { edit.effects = [{ stat: 1, value: 5, unit: 'flat' }]; })]));
  expect(result.message).toBe('native learning sentinel'); expect(result.restored).toBe(true); expect(result.strength).toBe(5); expect(result.learned).toBe(true);
});

test('public skill additions are explicit keyboard details with literal names, timings, template and bonus state; source restore removes them', async ({ page }, testInfo) => {
  await page.goto('/');
  const records = [variant('skill.0.0', edit => { edit.names.en = 'Field Provoke'; edit.names.ru = 'Полевой вызов'; edit.description.ru = '<img src=x onerror=alert(1)>'; edit.castSeconds = 1.005; }),
    variant('skill.0.1', edit => { edit.names.en = 'Field recovery'; edit.effects = [{ stat: 1, value: 0.29, unit: 'flat' }]; edit.bonusRequirements.shieldRequired = true; }, 2)];
  const original = await page.evaluate(data => { const original = PandoraRemaked.adapter.serialize(); PandoraRemaked.catalog.applySnapshot(data); return original; }, snapshot(records));
  await page.locator('[data-remaked-tab="1"]').click();
  const panel = page.locator('[data-remaked-native-panel="1"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-remaked-catalog-skills]')).toBeVisible();
  await expect(page.locator('#remaked-skill-list-row')).toHaveCount(0);
  const geometry = await panel.evaluate(node => {
    const box = node.getBoundingClientRect(), columns = document.querySelector('[data-remaked-calculator-columns]').getBoundingClientRect();
    return { height: box.height, bottom: box.bottom, columnsTop: columns.top };
  });
  expect(geometry.height).toBeLessThanOrEqual(560);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.columnsTop);
  const active = page.locator('[data-remaked-skill-variant="' + records[0].id + '"]');
  await expect(active.locator('summary')).toContainText('Not learned');
  await active.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(active).toHaveAttribute('open', '');
  await expect(active.locator('[data-remaked-variant-timing="1"]')).toContainText('1.005');
  await expect(active).toContainText('Learning template: Provoke');
  await expect(active).toContainText('does not simulate their damage');
  await page.evaluate(() => { StatusMove('Lev', 11); CalcSet('Lev'); });
  await expect(active.locator('summary')).toContainText('Learned');
  const passive = page.locator('[data-remaked-skill-variant="' + records[1].id + '"]');
  await passive.locator('summary').click();
  await expect(passive.locator('[data-remaked-variant-bonus]')).toHaveText('Passive bonus inactive');
  await expect(passive.locator('[data-remaked-variant-requirements]')).toHaveText('Bonus requirements: Shield');
  await page.evaluate(() => PandoraRemaked.adapter.selectEquipment(1, 200001));
  await expect(passive.locator('[data-remaked-variant-bonus]')).toHaveText('Passive bonus applied');
  await page.evaluate(() => PandoraRemaked.i18n.setLocale('ru'));
  await expect(active.locator('summary')).toContainText('Полевой вызов');
  await expect(active.locator('[data-remaked-variant-description]')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(active.locator('img')).toHaveCount(0);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(active.locator('summary')).toBeVisible();
    const metrics = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth,
      cards: [...document.querySelectorAll('[data-remaked-skill-variant]')].map(node => ({ width: node.clientWidth, scroll: node.scrollWidth })) }));
    expect(metrics.document).toBeLessThanOrEqual(metrics.viewport);
    for (const card of metrics.cards) expect(card.scroll).toBeLessThanOrEqual(card.width);
    await page.screenshot({ path: testInfo.outputPath('skill-additions-' + width + '.png'), fullPage: true });
  }
  await page.evaluate(code => PandoraRemaked.adapter.load(code), original);
  await expect(page.locator('[data-remaked-catalog-skills]')).toBeHidden();
  await expect(page.locator('[data-remaked-skill-variant]')).toHaveCount(0);
  await page.locator('[data-remaked-tab="1"]').click();
  await expect(panel).toBeHidden();
});

test('two-decimal effects and three-decimal timings survive public validation without rounding or accepting excess precision', async ({ page }) => {
  // Construct valid wire records independently: the browser's precision guard
  // must be tested even while the server guard is still RED.
  const passive = variant('skill.0.1'), active = variant('skill.0.0');
  passive.effects = [{ stat: 1, value: 0.29, unit: 'flat' }]; active.timing[1] = 1.005;
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked; StatusMove('Lev', 11); CalcSet('Lev'); api.catalog.applySnapshot(data);
    const strength = Status.STR[2], timing = api.catalog.variantSkills().find(row => row.active).timing[1];
    const before = api.adapter.serialize(), tables = JSON.stringify(Skill);
    const badEffect = structuredClone(data); badEffect.records[0].effects[0].value = 0.2901;
    const badTiming = structuredClone(data); badTiming.records[1].timing[1] = 1.0051;
    const rejected = [badEffect, badTiming].map(input => { try { api.catalog.applySnapshot(input); return false; } catch { return true; } });
    return { strength, timing, rejected, unchanged: api.adapter.serialize() === before && JSON.stringify(Skill) === tables };
  }, snapshot([passive, active]));
  expect(result.strength).toBe(0.29); expect(result.timing).toBe(1.005);
  expect(result.rejected).toEqual([true, true]); expect(result.unchanged).toBe(true);
});

test('new passive learns through its original native template with the list closed and never mutates source ordering or doubles intrinsic mechanics', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, table = JSON.stringify(Skill), original = api.adapter.serialize();
    const learn = Learn; Flag[3] = 0;
    api.catalog.applySnapshot(data);
    const low = Status.STR[2]; StatusMove('Lev', 11); CalcSet('Lev');
    const high = Status.STR[2]; const metadata = api.catalog.variantSkills();
    const code = api.adapter.serialize(); CalcSet('ALL'); CalcSet('Equip'); CalcSet('ALL');
    const repeated = Status.STR[2], variantPotion = Status.POT;
    api.adapter.load(original); const restored = Status.STR[2];
    StatusMove('Lev', 11); CalcSet('Lev'); const baselinePotion = Status.POT;
    return { low, high, repeated, restored, metadata, code, variantPotion, baselinePotion,
      sameTable: table === JSON.stringify(Skill), sameLearn: Learn === learn, flag: Flag[3] };
  }, snapshot([variant('skill.0.1', edit => { edit.effects = [{ stat: 1, value: 5, unit: 'flat' }]; })]));
  expect(result.low).toBe(0); expect(result.high).toBe(5); expect(result.repeated).toBe(5); expect(result.restored).toBe(0);
  expect(result.metadata[0].learned).toBe(true); expect(result.metadata[0].potential).toBe(true);
  expect(result.metadata[0].templateId).toBe('skill_entry.0.1');
  expect(result.sameTable).toBe(true); expect(result.sameLearn).toBe(true); expect(result.flag).toBe(0);
  expect(result.code).toMatch(/^PS3:1:/);
  // The variant adds STR only: the template's intrinsic potion bonus is not
  // duplicated. Compare actual engine summary rather than reconstructing it.
  expect(result.variantPotion).toBe(result.baselinePotion); expect(result.variantPotion).toBe(110);
});

test('active variants keep distinct literal metadata while their source entries and existing learning stay unchanged', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, tables = JSON.stringify(Skill), learn = Learn, flag = Flag[3];
    api.catalog.applySnapshot(data); const low = api.catalog.variantSkills();
    StatusMove('Lev', 4); CalcSet('Lev'); const high = api.catalog.variantSkills();
    return { low, high, unchanged: JSON.stringify(Skill) === tables && Learn === learn && Flag[3] === flag,
      original: api.catalog.gameLabel('skill_entry.0.0'), variant: api.catalog.gameLabel(data.records[0].id) };
  }, snapshot([variant('skill.0.0', edit => { edit.mpCost = 25; edit.castSeconds = 1.25; edit.description.en = '<img src=x onerror=alert(1)>'; }), variant('skill.0.0', () => {}, 2)]));
  expect(result.low.every(row => !row.learned)).toBe(true); expect(result.high.every(row => row.learned)).toBe(true);
  expect(result.high).toHaveLength(2); expect(result.high[0].timing).toEqual([25, 1.25, 15, 1]);
  expect(result.high[0].description.en).toBe('<img src=x onerror=alert(1)>');
  expect(result.original).toBe(''); expect(result.variant).toBe('New Provoke'); expect(result.unchanged).toBe(true);
});

test('publication order and duplicate templates do not change native learning, while explicit equipment/shield/riding gates still apply', async ({ page }) => {
  await page.goto('/');
  const records = [variant('skill.0.1', edit => { edit.effects = [{ stat: 1, value: 5, unit: 'flat' }]; edit.bonusRequirements.weaponCategories = [0]; edit.bonusRequirements.shieldRequired = true; edit.bonusRequirements.ridingRequired = true; }),
    variant('skill.4.2', () => {}, 2)];
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, table = JSON.stringify(Skill);
    StatusMove('Lev', 54); CalcSet('Lev'); api.catalog.applySnapshot(data);
    const unarmed = Status.STR[2]; api.adapter.selectEquipment(0, 1); api.adapter.selectEquipment(1, 200001);
    const unmounted = Status.STR[2]; document.getElementById('SwitchUse_4').click();
    const mounted = Status.STR[2], learning = api.catalog.variantSkills().map(row => ({ id: row.id, learned: row.learned, potential: row.potential }));
    const reversed = structuredClone(data); reversed.revision = 2; reversed.records.reverse(); api.catalog.applySnapshot(reversed);
    const after = Status.STR[2], reversedLearning = api.catalog.variantSkills().map(row => ({ id: row.id, learned: row.learned, potential: row.potential }));
    api.adapter.selectEquipment(0, 60002); const knife = Status.STR[2];
    return { unarmed, unmounted, mounted, after, knife, learning, reversedLearning, sameTable: JSON.stringify(Skill) === table };
  }, snapshot(records));
  expect(result.unarmed).toBe(0); expect(result.unmounted).toBe(0); expect(result.mounted).toBe(5); expect(result.after).toBe(5); expect(result.knife).toBe(0);
  expect(result.reversedLearning).toEqual(result.learning); expect(result.sameTable).toBe(true);
});

test('forged template/type/policy/identity and excess variants fail before changing the character or existing catalog', async ({ page }) => {
  await page.goto('/');
  const data = snapshot([variant('skill.0.0')]);
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, raw = api.adapter.serialize(), table = JSON.stringify(Skill);
    const record = data.records[0];
    const invalid = [
      { ...record, templateId: 'skill_entry.4.2' }, { ...record, kind: 'passive' },
      { ...record, nativeEffectPolicy: 'retained-plus-bonus' }, { ...record, id: record.templateId },
      { ...record, prerequisiteCode: 'J=0=1' }, { ...record, effects: [{ stat: 1, value: 5, unit: 'flat' }] }
    ].map(record => ({ ...data, records: [record] }));
    invalid.push({ ...data, records: [record, record] });
    invalid.push({ ...data, records: Array.from({ length: 257 }, (_, index) => ({ ...record, id: 'modern.active.00000000-0000-4000-8000-' + String(index).padStart(12, '0') })) });
    const rejected = invalid.map(input => { try { api.catalog.applySnapshot(input); return false; } catch { return true; } });
    return { rejected, same: api.adapter.serialize() === raw && JSON.stringify(Skill) === table };
  }, data);
  expect(result.rejected).toEqual(Array(8).fill(true)); expect(result.same).toBe(true);
});

test('fresh shared recipient and cached offline reload restore a variant bonus with its immutable catalog and C1 riding context', async ({ page, browser }) => {
  const data = snapshot([variant('skill.0.1', edit => { edit.effects = [{ stat: 1, value: 5, unit: 'flat' }]; edit.bonusRequirements.ridingRequired = true; })]);
  await page.goto('/');
  const saved = await page.evaluate(data => {
    const api = PandoraRemaked; StatusMove('Lev', 54); CalcSet('Lev'); api.catalog.applySnapshot(data);
    document.getElementById('SwitchUse_4').click();
    return { payload: api.adapter.serialize(), summary: api.adapter.readCalculatedSummary(), strength: Status.STR[2], skills: JSON.stringify(Skill) };
  }, data);
  expect(saved.strength).toBe(5); expect(saved.payload).toMatch(/^PS3:1:C1:/);
  const context = await browser.newContext();
  await context.route('https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog**', route => route.fulfill({ status: 200,
    contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) }));
  try {
    const recipient = await context.newPage(); const errors = []; recipient.on('pageerror', error => errors.push(error.message));
    await recipient.goto('http://127.0.0.1:8000/#build=' + encodeURIComponent(saved.payload));
    await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
    for (const offline of [false, true]) {
      if (offline) {
        await recipient.evaluate(() => navigator.serviceWorker.ready);
        await expect.poll(() => recipient.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
        await context.setOffline(true); await recipient.reload();
        await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
      }
      const loaded = await recipient.evaluate(() => ({ payload: PandoraRemaked.adapter.serialize(), summary: PandoraRemaked.adapter.readCalculatedSummary(),
        strength: Status.STR[2], skills: JSON.stringify(Skill) }));
      expect(loaded).toEqual(saved);
    }
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
