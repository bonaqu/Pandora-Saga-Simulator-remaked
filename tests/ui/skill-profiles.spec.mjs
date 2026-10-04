import { test, expect } from '@playwright/test';
import skills from '../../data/generated/skills.v1.json' with { type: 'json' };
import { draftFromSource, validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';
import { snapshot } from './helpers/skill-variants.mjs';
import { currentActiveProfileDrafts } from '../../admin-api/src/current-active-profiles.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';

test('all 17 reviewed active records use their literal source text and class/rank timing at boundary states, with exact old-pin restoration', async ({ page }) => {
  const records = currentActiveProfileDrafts().map(edit => {
    const source = baselineById.get(edit.id), identity = sourceIdentity(source);
    return compileRecord(validateDraft(edit, identity), identity, source);
  });
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, old = api.adapter.serialize(), original = JSON.stringify(Skill);
    const failures = []; let checks = 0;
    api.catalog.applySnapshot(data); Flag[3] = 0;
    // Boundary parser probes, not claims of legal point allocation/combat parity.
    function matches(rule, job, level, points) {
      return (!rule.classIds.length || rule.classIds.includes('job.' + job)) && level >= rule.minimumLevel &&
        rule.branches.every(gate => points[Number(gate.branchId.split('.')[1])] >= gate.minimumPoints);
    }
    for (const record of data.records) for (const definition of [record, ...record.profiles]) {
      const rule = definition.learningRequirements;
      for (const delta of [-1, 0, 1]) for (const job of [Number((rule.classIds[0] || 'job.0').split('.')[1]), 0]) {
        const level = Math.max(1, Math.min(55, rule.minimumLevel + delta)), points = [];
        for (let category = 0; category < Name.Skill.length; category++) {
          const gate = rule.branches.find(row => row.branchId === 'skill_category.' + category);
          points[category] = gate ? Math.max(0, gate.minimumPoints + delta) : 0;
          Status.Skill[category] = [points[category], 0, 200, 0];
        }
        Status.Job[2] = job; Status.Lev[0] = level; CalcSet('ALL');
        const selected = record.profiles.find(profile => matches(profile.learningRequirements, job, level, points)) || record;
        const name = api.catalog.gameLabel(record.id), timing = Skill[1][record.category][record.index].slice(5, 9);
        const description = api.catalog.gameLabel('skill_detail.' + record.category + '.' + record.index + '.3');
        if (name !== selected.names.en || description !== selected.description.en || JSON.stringify(timing) !== JSON.stringify(selected.timing))
          failures.push({ id: record.id, job, level, points, name, timing, expected: selected.id });
        api.i18n.setLocale('ru');
        if (api.catalog.gameLabel(record.id) !== selected.names.ru ||
            api.catalog.gameLabel('skill_detail.' + record.category + '.' + record.index + '.3') !== selected.description.ru)
          failures.push({ id: record.id, job, level, locale: 'ru' });
        api.i18n.setLocale('en'); checks++;
      }
    }
    const retained = Skill[0].reduce((total, group) => total + group.length, 0);
    api.adapter.load(old);
    return { failures, checks, retained, restored: JSON.stringify(Skill) === original, pin: api.catalog.getRevision() };
  }, snapshot(records, 82));
  expect(result.failures).toEqual([]); expect(result.checks).toBe(222);
  expect(result.retained).toBe(211); expect(result.restored).toBe(true); expect(result.pin).toBe(0);
});

function publication() {
  const native = skills.records.find(row => row.id === 'skill.5.3');
  const source = { ...native, id: 'skill_entry.5.3', kind: 'active' };
  const identity = { id: source.id, kind: 'active', category: 5, index: 3 };
  const edit = draftFromSource(source, 'active');
  edit.names.en = 'Base Blocking'; edit.description.ru = 'Базовое блокирование';
  edit.learningRequirements = { classIds: [], classScope: 'exact', minimumLevel: 1,
    branches: [{ branchId: 'skill_category.5', minimumPoints: 8 }] };
  edit.profiles = [
    ['general45', 5, 45, 8, 15], ['paladin45', 6, 45, 8, 25], ['general55', 5, 55, 8, 35],
    ['general-rank', 5, 55, 41, 45]
  ].map(([id, job, level, points, mpCost]) => ({ id,
    names: { en: 'Blocking ' + id, ru: 'Блокирование ' + id },
    description: { en: 'Description ' + id, ru: 'Описание ' + id + ' <img src=x onerror=alert(1)>' },
    learningRequirements: { classIds: ['job.' + job], classScope: 'exact', minimumLevel: level,
      branches: [{ branchId: 'skill_category.5', minimumPoints: points }] },
    mpCost, castSeconds: 1.25, cooldownSeconds: 3.5, durationSeconds: 0 }));
  return snapshot([compileRecord(validateDraft(edit, identity), identity, source)], 81);
}

test('an interrupted native probe restores profile rows, learned state and flags before retrying selection', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked; api.catalog.applySnapshot(data); Flag[3] = 0;
    Status.Job[2] = 5; Status.Lev[0] = 45; Status.Skill[5] = [8, 0, 100, 0];
    api.catalog.gameLabel('skill_entry.5.3');
    const before = JSON.stringify(Skill), learn = Learn, original = SkillList;
    Status.Lev[0] = 55;
    let failed = false;
    // Throw in the full-list parser after profile eligibility and projection.
    SkillList = function (mode, category) {
      if (mode === 'Potential' && category === 1) throw new Error('intentional interrupted profile probe');
      return original.apply(this, arguments);
    };
    try { api.catalog.gameLabel('skill_entry.5.3'); } catch (error) { failed = error.message === 'intentional interrupted profile probe'; }
    finally { SkillList = original; }
    const restored = JSON.stringify(Skill) === before && Learn === learn && Flag[3] === 0;
    const retried = api.catalog.gameLabel('skill_entry.5.3');
    return { failed, restored, retried, mp: Skill[1][5][3][5], learnPreserved: Learn === learn, flag: Flag[3] };
  }, publication());
  expect(result).toEqual({ failed: true, restored: true, retried: 'Blocking general55', mp: 35, learnPreserved: true, flag: 0 });
});

test('most-specific learned profile selects by class, level and branch points, not array order, while source IDs and old pins restore', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, old = api.adapter.serialize(), original = JSON.stringify(Skill);
    const count = Skill[0].reduce((total, group) => total + group.length, 0), code = Skill[0][5][3][9];
    api.catalog.applySnapshot(data); Flag[3] = 0;
    const learn = Learn, states = [];
    // Synthetic parser diagnostics, not assertions of legal spendable builds.
    for (const [job, level, points] of [[5, 44, 8], [5, 45, 8], [5, 55, 8], [5, 55, 41], [5, 55, 40], [6, 55, 8], [4, 55, 8], [5, 55, 7]]) {
      Status.Job[2] = job; Status.Lev[0] = level; Status.Skill[5] = [points, 0, 100, 0];
      CalcSet('ALL'); CalcSet('ALL');
      states.push({ name: api.catalog.gameLabel('skill_entry.5.3'), timing: Skill[1][5][3].slice(5, 9), code: Skill[0][5][3][9] });
    }
    const preserved = Flag[3] === 0 && Learn === learn && Skill[0].reduce((total, group) => total + group.length, 0) === count;
    data.records[0].profiles.reverse(); api.catalog.applySnapshot(data); CalcSet('ALL');
    Status.Skill[5] = [41, 0, 100, 0]; CalcSet('ALL');
    const reverse = api.catalog.gameLabel('skill_entry.5.3');
    const pinned = api.adapter.serialize(); api.adapter.load(old);
    const restored = JSON.stringify(Skill) === original;
    api.adapter.load(pinned); const loaded = api.catalog.gameLabel('skill_entry.5.3');
    return { states, preserved, restored, reverse, loaded, code, count };
  }, publication());
  expect(result.states.map(row => row.name)).toEqual(['Base Blocking', 'Blocking general45', 'Blocking general55',
    'Blocking general-rank', 'Blocking general55', 'Blocking paladin45', 'Base Blocking', 'Base Blocking']);
  expect(result.states.map(row => row.timing[0])).toEqual([5, 15, 35, 45, 35, 25, 5, 5]);
  expect(result.states.every(row => row.code === result.code)).toBe(true);
  expect(result.count).toBe(211); expect(result.preserved).toBe(true); expect(result.restored).toBe(true);
  expect(result.reverse).toBe('Blocking general-rank'); expect(result.loaded).toBe('Blocking general-rank');
});

test('profile timing, RU/EN tooltip and learned icon use the same selected record and never interpret description HTML', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked; StatusMove('Lev', 54); CalcSet('Lev');
    const jobs = document.getElementById('SelJob'); jobs.selectedIndex = 5; jobs.onchange();
    api.catalog.applySnapshot(data); Flag[3] = 1;
    const missing = 8 - Status.Skill[5][0] - Status.Skill[5][1];
    if (missing) CalcSet('Skill', 5, missing, 'Adeptness');
    SkillList('Create'); SkillList('Color');
    const icon = document.getElementById('LearnSkillIcon_5_3');
    api.i18n.setLocale('ru');
    const ru = { name: api.catalog.gameLabel('skill_entry.5.3'), description: api.catalog.gameLabel('skill_detail.5.3.3'),
      visible: document.querySelector('#LearnSkill_5_3 > ul:nth-child(9) > li').textContent,
      requirements: api.catalog.gameLabel('skill_detail.5.3.1') };
    api.i18n.setLocale('en');
    return { ru, en: api.catalog.gameLabel('skill_entry.5.3'), mp: document.getElementById('LearnSkillMP_5_3').textContent,
      points: Status.Skill[5][0] + Status.Skill[5][1], learned: Learn[0].includes('5_3'), gray: icon.style.background.includes('/gray/'),
      interpreted: document.querySelectorAll('#LearnSkill_5_3 img[src="x"]').length };
  }, publication());
  expect(result.points).toBe(8); expect(result.learned).toBe(true); expect(result.gray).toBe(false);
  expect(result.mp).toBe('35'); expect(result.en).toBe('Blocking general55');
  expect(result.ru.name).toBe('Блокирование general55'); expect(result.ru.visible).toBe(result.ru.description);
  expect(result.ru.description).toContain('<img src=x onerror=alert(1)>'); expect(result.interpreted).toBe(0);
  expect(result.ru.requirements).toContain('55'); expect(result.ru.requirements).toContain('8');
});

test('frontend rejects malformed, ambiguous and unsupported profile records before mutating the current catalog', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, before = api.adapter.serialize(), source = JSON.stringify(Skill), invalid = [];
    function reject(change) {
      const clone = structuredClone(data); change(clone.records[0]);
      try { api.catalog.applySnapshot(clone); invalid.push(false); } catch { invalid.push(true); }
    }
    reject(record => record.profiles = null);
    reject(record => record.profiles = []);
    reject(record => record.profiles[0].timing[0] = 1.5);
    reject(record => record.profiles[0].timing[1] = .0001);
    reject(record => record.profiles[0].learningRequirements.minimumLevel = 56);
    reject(record => record.profiles[0].formula = 'eval(1)');
    reject(record => record.profiles[0].effects = [{ stat: 69, value: 5, unit: 'flat' }]);
    reject(record => record.profiles[1].id = record.profiles[0].id);
    reject(record => { record.profiles[1].learningRequirements = structuredClone(record.profiles[0].learningRequirements); });
    reject(record => {
      record.profiles[0].learningRequirements = { classIds: ['job.4'], classScope: 'descendants', minimumLevel: 35, branches: [] };
      record.profiles[1].learningRequirements = { classIds: ['job.4', 'job.5', 'job.6'], classScope: 'exact', minimumLevel: 35, branches: [] };
    });
    reject(record => { record.profiles[0].learningRequirements.minimumLevel = 34; record.profiles[0].learningRequirements.branches[0].minimumPoints = 42; });
    reject(record => record.profiles[0].names.en = '');
    return { invalid, preserved: api.adapter.serialize() === before && JSON.stringify(Skill) === source && api.catalog.getRevision() === 0 };
  }, publication());
  expect(result.invalid).toEqual(Array(12).fill(true)); expect(result.preserved).toBe(true);
});

test('comparison, fresh shared recipient and offline reload restore the exact derived profile without persisting a selected-profile token', async ({ page, browser }) => {
  const data = publication();
  await page.goto('/');
  const saved = await page.evaluate(data => {
    const api = PandoraRemaked; StatusMove('Lev', 54); CalcSet('Lev');
    const jobs = document.getElementById('SelJob'); jobs.selectedIndex = 5; jobs.onchange();
    const missing = 8 - Status.Skill[5][0] - Status.Skill[5][1];
    if (missing) CalcSet('Skill', 5, missing, 'Adeptness');
    const old = api.adapter.serialize(), oldSummary = api.adapter.readCalculatedSummary();
    api.catalog.applySnapshot(data);
    const payload = api.adapter.serialize(), summary = api.adapter.readCalculatedSummary();
    const beforeStorage = JSON.stringify(localStorage), compared = api.adapter.evaluateBuild(old);
    const restored = api.adapter.serialize() === payload && JSON.stringify(localStorage) === beforeStorage &&
      JSON.stringify(compared.summary) === JSON.stringify(oldSummary);
    return { payload, summary, restored, name: api.catalog.gameLabel('skill_entry.5.3'), timing: Skill[1][5][3].slice(5, 9) };
  }, data);
  expect(saved.restored).toBe(true); expect(saved.name).toBe('Blocking general55');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const errors = [];
  try {
    await context.route('**/api/catalog**', route => route.fulfill({ status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' }, json: data }));
    const recipient = await context.newPage();
    recipient.on('pageerror', error => errors.push(error.message));
    recipient.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await recipient.goto('/#build=' + encodeURIComponent(saved.payload));
    for (const offline of [false, true]) {
      if (offline) {
        await recipient.evaluate(() => navigator.serviceWorker.ready);
        await expect.poll(() => recipient.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
        await context.setOffline(true); await recipient.reload();
      }
      await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
      expect(await recipient.evaluate(() => ({ payload: PandoraRemaked.adapter.serialize(), summary: PandoraRemaked.adapter.readCalculatedSummary(),
        name: PandoraRemaked.catalog.gameLabel('skill_entry.5.3'), timing: Skill[1][5][3].slice(5, 9) }))).toEqual({
        payload: saved.payload, summary: saved.summary, name: saved.name, timing: saved.timing });
      expect(await recipient.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await recipient.locator('img[src*="media.fc2.com/counter_img.php"]').count()).toBe(0);
    }
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
