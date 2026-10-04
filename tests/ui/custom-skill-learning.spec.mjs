import { test, expect } from '@playwright/test';
import { variant, snapshot } from './helpers/skill-variants.mjs';
import skills from '../../data/generated/skills.v1.json' with { type: 'json' };
import { draftFromSource, validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';
import { currentElementalSkillDrafts } from '../../admin-api/src/current-elemental-skills.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const rules = (change = {}) => ({ classIds: ['job.0'], classScope: 'descendants', minimumLevel: 5, branches: [], ...change });
const record = learning => variant('skill.0.1', edit => { edit.learningRequirements = learning; edit.effects = [{ stat: 1, value: 5, unit: 'flat' }]; });
function sourceRecord(learning) {
  const original = skills.records.find(row => row.id === 'skill.18.9');
  const source = { ...original, id: 'skill_entry.18.9', kind: 'active' };
  const identity = { id: source.id, kind: 'active', category: 18, index: 9 };
  const edit = draftFromSource(source, 'active'); edit.learningRequirements = learning;
  return compileRecord(validateDraft(edit, identity), identity, source);
}

test('explicit learning isolates class ancestry, level and branch gates; bonus matches eligibility with the skill view hidden', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, originalSkill = JSON.stringify(Skill), oldLearn = Learn;
    const out = [];
    function state(job, level, points, potential = points, equipment = 0) {
      Status.Job[2] = job; Status.Lev[0] = level;
      Status.Skill[1] = [points, equipment, potential, equipment];
      const status = api.catalog.variantSkills()[0];
      Calc('STR'); out.push({ learned: status.learned, potential: status.potential, bonus: Status.STR[2] });
    }
    api.catalog.applySnapshot(data); Flag[3] = 0;
    state(0, 4, 8); state(0, 5, 7, 8); state(0, 5, 8);
    state(2, 5, 8); state(7, 55, 100); state(0, 5, 7, 7, 1);
    const custom = structuredClone(data); custom.revision = 2; custom.records[0].learningRequirements.classScope = 'exact';
    api.catalog.applySnapshot(custom, { rebuild: false }); state(2, 55, 100); state(0, 5, 8);
    return { out, sourceUnchanged: JSON.stringify(Skill) === originalSkill, learnReferenceUnchanged: Learn === oldLearn };
  }, snapshot([record(rules({ branches: [{ branchId: 'skill_category.1', minimumPoints: 8 }] }))]));
  expect(result.out).toEqual([
    { learned: false, potential: false, bonus: 0 }, { learned: false, potential: true, bonus: 0 },
    { learned: true, potential: true, bonus: 5 }, { learned: true, potential: true, bonus: 5 },
    { learned: false, potential: false, bonus: 0 }, { learned: true, potential: true, bonus: 5 },
    { learned: false, potential: false, bonus: 0 }, { learned: true, potential: true, bonus: 5 }
  ]);
  expect(result.sourceUnchanged).toBe(true); expect(result.learnReferenceUnchanged).toBe(true);
});

test('source learning override changes visible potential/learned list and icon without rewriting original gates; old pin restores it', async ({ page }) => {
  await page.goto('/');
  const original = skills.records.find(row => row.id === 'skill.18.9');
  const source = { ...original, id: original.id.replace('skill.', 'skill_entry.'), kind: 'active' };
  const identity = { id: source.id, kind: 'active', category: 18, index: 9 };
  const edit = draftFromSource(source, 'active'); edit.learningRequirements = rules({ classIds: [], minimumLevel: 1,
    branches: [{ branchId: 'skill_category.18', minimumPoints: 35 }] });
  const published = compileRecord(validateDraft(edit, identity), identity, source);
  const results = await page.evaluate(data => {
    const api = PandoraRemaked, old = api.adapter.serialize(), code = Skill[0][18][9][9], out = [];
    api.catalog.applySnapshot(data);
    Flag[3] = 1;
    for (const count of [33, 34, 35]) {
      Status.Skill[18] = [count, 0, count, 0];
      Learn = [[], [], [], []];
      for (let category = 0; category < Name.Skill.length; category++) { SkillList('Potential', category); SkillList('Adeptness', category); }
      SkillList('Create'); SkillList('Color');
      const icon = document.getElementById('LearnSkillIcon_18_9');
      out.push({ count, potential: Learn[1].includes('18_9'), learned: Learn[0].includes('18_9'),
        iconExists: Boolean(icon), gray: icon?.style.background.includes('/gray/'), code: Skill[0][18][9][9] });
    }
    api.adapter.load(old);
    return { out, code, restoredRevision: api.catalog.getRevision(), gate: Skill[0][18][9][9] };
  }, snapshot([published]));
  expect(results.out.map(row => [row.count, row.potential, row.learned, row.iconExists])).toEqual([[33, false, false, false], [34, false, false, false], [35, true, true, true]]);
  expect(results.out[2].gray).toBe(false);
  expect(results.out.every(row => row.code === results.code)).toBe(true);
  expect(results.restoredRevision).toBe(0); expect(results.gate).toBe('S=18=33');
});

test('independent native probes restore full data after an exception and reject unsafe public rules before mutation', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = PandoraRemaked;
    const invalid = structuredClone(data); invalid.records[0].learningRequirements.minimumLevel = 56;
    const before = api.adapter.serialize(); let denied = false;
    try { api.catalog.applySnapshot(invalid); } catch { denied = true; }
    const notMutated = before === api.adapter.serialize();
    api.catalog.applySnapshot(data);
    const tables = JSON.stringify(Skill), oldLearn = Learn, flag = Flag[3], options = EquipOpt, native = SkillList;
    Status.Lev[0] = 55; let message;
    try {
      SkillList = function () {
        if (Skill[0][0].length === 1) throw new Error('learning probe sentinel');
        return native.apply(this, arguments);
      };
      try { api.catalog.variantSkills(); } catch (error) { message = error.message; }
    } finally { SkillList = native; }
    const restored = JSON.stringify(Skill) === tables && Learn === oldLearn && Flag[3] === flag && EquipOpt === options;
    return { denied, notMutated, message, restored, recovered: api.catalog.variantSkills()[0].learned };
  }, snapshot([record(rules())]));
  expect(result).toEqual({ denied: true, notMutated: true, message: 'learning probe sentinel', restored: true, recovered: true });
});

test('multiple branch requirements use AND for learned and potential points independently and shed old rules on revision switch', async ({ page }) => {
  await page.goto('/');
  const data = snapshot([record(rules({ classIds: [], minimumLevel: 1, branches: [
    { branchId: 'skill_category.1', minimumPoints: 8 }, { branchId: 'skill_category.18', minimumPoints: 3 }
  ] }))]);
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, oldSkill = JSON.stringify(Skill), original = api.adapter.serialize(), out = [];
    api.catalog.applySnapshot(data); Flag[3] = 0;
    for (const [slash, element, potentialElement] of [[8, 2, 3], [7, 3, 3], [8, 3, 3], [8, 3, 2]]) {
      Status.Skill[1] = [slash, 0, 8, 0]; Status.Skill[18] = [element, 0, potentialElement, 0];
      const state = api.catalog.variantSkills()[0]; Calc('STR'); out.push([state.learned, state.potential, Status.STR[2]]);
    }
    const changed = structuredClone(data); changed.revision = 2; changed.records[0].learningRequirements.branches = [];
    api.catalog.applySnapshot(changed, { rebuild: false }); const newRules = api.catalog.variantSkills()[0].learned;
    api.adapter.load(original);
    return { out, newRules, sourceUnchanged: JSON.stringify(Skill) === oldSkill, removed: api.catalog.variantSkills().length === 0, strength: Status.STR[2] };
  }, data);
  expect(result).toEqual({ out: [[false, true, 0], [false, true, 0], [true, true, 5], [false, false, 0]], newRules: true, sourceUnchanged: true, removed: true, strength: 0 });
});

test('source tooltip and added skill show the actual custom requirements in EN/RU, on desktop and phone, without rewriting native descriptions', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  await expect(page).toHaveTitle(/Pandora Saga Simulator/);
  const data = snapshot([sourceRecord(rules({ classIds: [], minimumLevel: 1, branches: [{ branchId: 'skill_category.18', minimumPoints: 35 }] })),
    record(rules({ branches: [{ branchId: 'skill_category.1', minimumPoints: 8 }] }))]);
  const originalDescription = await page.evaluate(data => {
    const before = Skill[1][18][9][1]; PandoraRemaked.catalog.applySnapshot(data);
    StatusMove('Lev', 54); CalcSet('Lev'); Flag[3] = 1;
    document.getElementById('SelJob').selectedIndex = 23; document.getElementById('SelJob').onchange();
    CalcSet('Skill', 18, Math.max(0, 35 - Status.Skill[18][2] - Status.Skill[18][3]), 'Potential');
    CalcSet('Skill', 18, Math.max(0, 35 - Status.Skill[18][0] - Status.Skill[18][1]), 'Adeptness');
    if (Status.Skill[18][0] + Status.Skill[18][1] < 35 || Status.Skill[18][2] + Status.Skill[18][3] < 35) throw new Error('Fixture did not allocate 35 Elemental points: ' + JSON.stringify(Status.Skill[18]));
    return before;
  }, data);
  await page.locator('[data-remaked-tab="1"]').click();
  const icon = page.locator('#LearnSkillIcon_18_9'), tooltip = page.locator('#LearnSkill_18_9');
  await icon.focus(); await expect(tooltip).toBeVisible();
  const requirements = tooltip.locator(':scope > ul:nth-child(6) > li');
  await expect(requirements).toHaveText('Any class. Level 1 or higher. Elemental: 35 points or more');
  await expect(page.locator('[data-remaked-native-panel="1"]')).toBeVisible();
  await expect(page.locator('vite-error-overlay, nextjs-portal')).toHaveCount(0);
  const directory = process.platform === 'win32' ? 'D:/CODEX/Tasks/pandora-admin-runtime/custom-learning-local' : path.join(os.tmpdir(), 'pandora-custom-learning-local');
  await fs.mkdir(directory, { recursive: true });
  await page.screenshot({ path: directory + '/public-learning-1440.png' });
  await page.keyboard.press('Escape');
  const card = page.locator('[data-remaked-skill-variant]'); await card.locator('summary').focus(); await card.locator('summary').press('Enter');
  await expect(card.locator('[data-remaked-variant-learning]')).toHaveText('Classes: Warrior and their advanced classes. Level 5 or higher. Slash: 8 points or more');
  await expect(card).not.toContainText('Learning template:');
  await page.evaluate(() => PandoraRemaked.i18n.setLocale('ru'));
  await expect(card.locator('[data-remaked-variant-learning]')).toContainText('Уровень 5 или выше');
  await expect(card.locator('[data-remaked-variant-learning]')).toContainText('не меньше 8 очков');
  await expect(card).toContainText('Настроенные условия изучения');
  await page.setViewportSize({ width: 390, height: 844 }); await icon.focus(); await expect(tooltip).toBeVisible();
  await expect(requirements).toHaveText('Любой класс. Уровень 1 или выше. Elemental: не меньше 35 очков');
  const bounds = await tooltip.boundingBox(); expect(bounds.x).toBeGreaterThanOrEqual(8); expect(bounds.x + bounds.width).toBeLessThanOrEqual(382);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: directory + '/public-learning-390.png' });
  expect(await page.evaluate(() => Skill[1][18][9][1])).toBe(originalDescription);
  expect(errors).toEqual([]);
});

test('comparison of different custom learning revisions restores the active character, learned bonus, C1 and named pins', async ({ page }) => {
  await page.goto('/');
  const one = variant('skill.0.1', edit => { edit.learningRequirements = rules(); edit.effects = [{ stat: 6, value: 5, unit: 'flat' }]; edit.bonusRequirements.ridingRequired = true; });
  const two = structuredClone(one); two.learningRequirements.minimumLevel = 55;
  const result = await page.evaluate(({ first, second }) => {
    const api = PandoraRemaked; StatusMove('Lev', 9); CalcSet('Lev'); document.getElementById('SwitchUse_4').click();
    const source = api.adapter.serialize(); api.catalog.applySnapshot(first); const a = api.adapter.serialize(), lpA = Status.LP;
    const namedA = api.buildStore.saveBuild('Custom learned', a);
    api.catalog.applySnapshot(second); const b = api.adapter.serialize(), lpB = Status.LP;
    const namedB = api.buildStore.saveBuild('Custom not learned', b); api.builds.flushAutosave();
    const read = () => ({ payload: api.adapter.serialize(), context: api.catalog.captureContext(), summary: api.adapter.readCalculatedSummary(), tables: JSON.stringify(Skill), storage: JSON.stringify(localStorage) });
    const before = read(); for (const code of [source, a, b]) api.adapter.evaluateBuild(code);
    return { before, after: read(), lpA, lpB, a: namedA.build.id, b: namedB.build.id };
  }, { first: snapshot([one]), second: snapshot([two], 2) });
  expect(result.after).toEqual(result.before); expect(result.lpA - result.lpB).toBe(5);
  await page.locator('[data-remaked-compare-open]').click();
  await page.locator('[data-remaked-compare-a]').selectOption(result.a); await page.locator('[data-remaked-compare-b]').selectOption(result.b);
  await expect(page.locator('[data-remaked-compare-row][data-stat-key="lp"] [data-remaked-delta]')).toHaveText('-5');
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(result.before.payload);
});

test('fresh shared recipient and cached offline reload retain explicit learning rules, bonus, catalog pin and C1 context', async ({ page, browser }) => {
  const data = snapshot([variant('skill.0.1', edit => { edit.learningRequirements = rules(); edit.effects = [{ stat: 1, value: 5, unit: 'flat' }]; edit.bonusRequirements.ridingRequired = true; })]);
  await page.goto('/');
  const saved = await page.evaluate(data => {
    StatusMove('Lev', 9); CalcSet('Lev'); PandoraRemaked.catalog.applySnapshot(data); document.getElementById('SwitchUse_4').click();
    return { payload: PandoraRemaked.adapter.serialize(), summary: PandoraRemaked.adapter.readCalculatedSummary(), strength: Status.STR[2], learned: PandoraRemaked.catalog.variantSkills()[0].learned };
  }, data);
  expect(saved.strength).toBe(5); expect(saved.learned).toBe(true); expect(saved.payload).toMatch(/^PS3:1:C1:/);
  const context = await browser.newContext();
  await context.route('https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog**', route => route.fulfill({ json: data }));
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
      expect(await recipient.evaluate(() => ({ payload: PandoraRemaked.adapter.serialize(), summary: PandoraRemaked.adapter.readCalculatedSummary(), strength: Status.STR[2], learned: PandoraRemaked.catalog.variantSkills()[0].learned }))).toEqual(saved);
    }
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('reviewed Resist Ice/Lightning data use 35/41 actual learning thresholds across all retained class identities and leave character effects unchanged', async ({ page }) => {
  await page.goto('/');
  const records = currentElementalSkillDrafts().map(edit => {
    const source = baselineById.get(edit.id), identity = sourceIdentity(source);
    return compileRecord(validateDraft(edit, identity), identity, source);
  });
  const result = await page.evaluate(data => {
    const api = PandoraRemaked, original = api.adapter.serialize(), before = api.adapter.readCalculatedSummary();
    const sourceCodes = [Skill[0][18][9][9], Skill[0][18][10][9]];
    api.catalog.applySnapshot(data); const after = api.adapter.readCalculatedSummary(); Flag[3] = 1;
    const mismatches = [];
    // Synthetic parser diagnostics verify the reference's all-28 class flags;
    // these are not claimed to be legally spendable builds for every class.
    for (let job = 0; job < 28; job++) for (const points of [33, 34, 35, 40, 41]) {
      Status.Job[2] = job; Status.Lev[0] = 55; Status.Skill[18] = [points, 0, points, 0];
      Learn = [[], [], [], []];
      for (let category = 0; category < Name.Skill.length; category++) { SkillList('Potential', category); SkillList('Adeptness', category); }
      SkillList('Create'); SkillList('Color');
      for (const [index, threshold] of [[9, 35], [10, 41]]) {
        const id = '18_' + index, expected = points >= threshold;
        const icon = document.getElementById('LearnSkillIcon_18_' + index);
        if (Learn[0].includes(id) !== expected || Learn[1].includes(id) !== expected || Boolean(icon) !== expected || icon?.style.background.includes('/gray/'))
          mismatches.push({ job, points, index });
      }
    }
    const names = [api.catalog.gameLabel('skill_entry.18.9'), api.catalog.gameLabel('skill_entry.18.10')];
    const description = api.catalog.gameLabel('skill_detail.18.9.3');
    api.adapter.load(original);
    return { before, after, mismatches, names, description, sourceCodes,
      restoredCodes: [Skill[0][18][9][9], Skill[0][18][10][9]], restoredRevision: api.catalog.getRevision() };
  }, snapshot(records));
  expect(result.after).toEqual(result.before); expect(result.mismatches).toEqual([]);
  expect(result.names).toEqual(['Resist Ice', 'Resist Lightning']);
  expect(result.description).toBe("Increases your target's Ice Resistance, but reduces their Fire and Lightning Resistance.");
  expect(result.sourceCodes).toEqual(['S=18=33', 'S=18=33']); expect(result.restoredCodes).toEqual(result.sourceCodes);
  expect(result.restoredRevision).toBe(0);
});
