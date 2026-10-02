import { test, expect } from '@playwright/test';
import { compileRecord, draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import skills from '../../data/generated/skills.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };

function variant(sourceId, change = () => {}, number = 1) {
  const original = skills.records.find(row => row.id === sourceId);
  const source = { ...original, id: sourceId.replace('skill.', 'skill_entry.'), kind: original.is_active ? 'active' : 'passive' };
  const identity = { id: 'modern.' + source.kind + '.00000000-0000-4000-8000-' + String(number).padStart(12, '0'),
    kind: source.kind, category: source.legacy_category_id, index: source.legacy_entry_index, templateId: source.id };
  const edit = { ...draftFromSource(source, source.kind), id: identity.id, templateId: source.id };
  edit.names.en = 'New ' + source.name.en; change(edit);
  return compileRecord(validateDraft(edit, identity), identity, source);
}
const snapshot = (records, revision = 1) => ({ ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256,
  characterSourceFingerprint: character.sourceFingerprint, revision, records });

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
