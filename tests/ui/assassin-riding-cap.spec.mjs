import { test, expect } from '@playwright/test';
import { draftFromSource, validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';
import character from '../../data/generated/character.v1.json' with { type: 'json' };
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };

function publication(revision, cap) {
  const source = character.records.find(row => row.id === 'job.12');
  const identity = { id: source.id, kind: 'class', category: null, index: source.index };
  const edit = draftFromSource(source, 'class'); edit.potentialCaps = [...source.potentialCaps]; edit.potentialCaps[19] = cap;
  return { ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256,
    characterSourceFingerprint: character.sourceFingerprint, revision, impactRevision: revision,
    records: [compileRecord(validateDraft(edit, identity), identity, source)] };
}

test('Assassin riding cap updates through a catalog revision and old builds keep their allocations', async ({ page }) => {
  const next = publication(1, 10);
  await page.goto('/');
  const before = await page.evaluate(() => {
    StatusMove('Lev', 54); CalcSet('Lev');
    const jobs = document.getElementById('SelJob'); jobs.selectedIndex = 12; jobs.onchange();
    CalcSet('Skill', 1, 5, 'Adeptness');
    return { payload: PandoraRemaked.adapter.serialize(), skill: Status.Skill[1].slice(), points: Status.SkP[0] };
  });
  await expect(page.locator('[data-remaked-skill-number="24"]')).toHaveAttribute('max', '0');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), next);
  await expect(page.locator('[data-remaked-skill-number="24"]')).toHaveAttribute('max', '10');
  expect(await page.evaluate(() => Status.Skill[1])).toEqual(before.skill);
  expect(await page.evaluate(() => Status.SkP[0])).toBe(before.points);

  const migrated = await page.evaluate(({ payload, snapshot }) => PandoraRemaked.catalog.migratePayload(payload, snapshot), { payload: before.payload, snapshot: next });
  expect(migrated.changes).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'changed', kind: 'class' })]));
  await page.evaluate(payload => PandoraRemaked.adapter.load(payload), migrated.payload);
  expect(await page.evaluate(() => Status.Skill[1])).toEqual(before.skill);
  await page.locator('[data-remaked-skill-number="24"]').fill('10');
  await page.locator('[data-remaked-skill-number="24"]').press('Enter');
  await expect(page.locator('[data-remaked-skill-number="24"]')).toHaveValue('10');
  const saved = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  await page.evaluate(payload => PandoraRemaked.adapter.load(payload), migrated.payload);
  expect(await page.evaluate(() => Status.Skill[24][0] + Status.Skill[24][1])).toBe(0);
  await page.evaluate(payload => PandoraRemaked.adapter.load(payload), saved);
  expect(await page.evaluate(() => Status.Skill[24][0] + Status.Skill[24][1])).toBe(10);
});

test('reduced branch caps return only excess invested points and preserve unrelated skills', async ({ page }) => {
  const old = publication(1, 10), next = publication(2, 4);
  await page.goto('/');
  const before = await page.evaluate(snapshot => {
    StatusMove('Lev', 54); CalcSet('Lev');
    const jobs = document.getElementById('SelJob'); jobs.selectedIndex = 12; jobs.onchange();
    PandoraRemaked.catalog.applySnapshot(snapshot);
    CalcSet('Skill', 1, 5, 'Adeptness'); CalcSet('Skill', 24, 10, 'Adeptness');
    return { payload: PandoraRemaked.adapter.serialize(), points: Status.SkP[0], skill: Status.Skill[1].slice() };
  }, old);
  const migrated = await page.evaluate(({payload,snapshot}) => PandoraRemaked.catalog.migratePayload(payload,snapshot), {payload:before.payload,snapshot:next});
  expect(migrated.changes[0].details.join(' ')).toContain('10→4');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot, { rebuild: false }), next);
  await page.evaluate(payload => PandoraRemaked.adapter.load(payload), migrated.payload);
  expect(await page.evaluate(() => Status.Skill[24])).toEqual([0,4,4,0]);
  expect(await page.evaluate(() => Status.SkP[0])).toBe(before.points + 6);
  expect(await page.evaluate(() => Status.Skill[1])).toEqual(before.skill);
  await expect(page.locator('[data-remaked-skill-number="24"]')).toHaveAttribute('max', '4');
  const repeated = await page.evaluate(({payload,snapshot}) => PandoraRemaked.catalog.migratePayload(payload,snapshot), {payload:migrated.payload,snapshot:next});
  expect(repeated.changes).toHaveLength(0);
});

test('increasing a cap refunds potential points that would exceed the engine maximum', async ({ page }) => {
  const old = publication(1, 10), next = publication(2, 120);
  await page.goto('/');
  const before = await page.evaluate(snapshot => {
    StatusMove('Lev', 54); CalcSet('Lev');
    const jobs = document.getElementById('SelJob'); jobs.selectedIndex = 12; jobs.onchange();
    PandoraRemaked.catalog.applySnapshot(snapshot);
    // Three previously allocated potential points are legal on this branch.
    Status.Skill[24][3] = 3; Status.UnP[0] -= 3;
    return { payload: PandoraRemaked.adapter.serialize(), points: Status.UnP[0] };
  }, old);
  const migrated = await page.evaluate(({payload,snapshot}) => PandoraRemaked.catalog.migratePayload(payload,snapshot), {payload:before.payload,snapshot:next});
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot, { rebuild: false }), next);
  await page.evaluate(payload => PandoraRemaked.adapter.load(payload), migrated.payload);
  expect(await page.evaluate(() => [Status.Skill[24][2], Status.Skill[24][3], Status.UnP[0]])).toEqual([120,0,before.points+3]);
});

test('catalog update migrates the active and saved builds with a recovery journal', async ({ page }) => {
  const old = publication(1, 10), next = publication(2, 4);
  const endpoint = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog';
  await page.route(endpoint + '**', route => {
    const url = new URL(route.request().url());
    const snapshot = Number(url.searchParams.get('revision')) === old.revision ? old : next;
    if (url.pathname.endsWith('/head')) { const { records, ...head } = snapshot; return route.fulfill({json:head}); }
    return route.fulfill({json:snapshot});
  });
  await page.goto('/');
  await expect(page.locator('[data-remaked-autosave-status]')).toHaveText('Autosave enabled');
  const before = await page.evaluate(snapshot => {
    StatusMove('Lev',54); CalcSet('Lev');
    const jobs=document.getElementById('SelJob');jobs.selectedIndex=12;jobs.onchange();
    PandoraRemaked.catalog.applySnapshot(snapshot);
    CalcSet('Skill',24,10,'Adeptness');
    const points=Status.SkP[0], payload=PandoraRemaked.adapter.serialize();
    PandoraRemaked.builds.flushAutosave();
    return {points, id:PandoraRemaked.buildStore.saveBuild('Assassin',payload).build.id};
  }, old);
  const result = await page.evaluate(async () => {
    const update=await PandoraRemaked.builds.updateCurrentCatalog();
    return {ok:update.ok, error:update.error?.message, changes:update.changes};
  });
  expect(result.ok, result.error).toBe(true);
  expect(result.changes[0].details.join(' ')).toContain('10→4');
  const after = await page.evaluate(id => ({
    revision:PandoraRemaked.catalog.getRevision(), skill:Status.Skill[24].slice(), points:Status.SkP[0],
    build:PandoraRemaked.buildStore.getBuild(id), journal:localStorage.getItem(PandoraRemaked.buildStore.RECOVERY_KEY)
  }), before.id);
  expect(after.revision).toBe(2); expect(after.skill).toEqual([0,4,4,0]); expect(after.points).toBe(before.points+6);
  expect(after.build.payload).toMatch(/^PS3:2:/); expect(after.build.migrationReport).toHaveLength(1);
  expect(after.journal).toBeNull();
});
