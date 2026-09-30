import { test, expect } from '@playwright/test';
import { compileRecord, draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import skills from '../../data/generated/skills.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
function publication(sourceId, change, revision = 1) {
  const original = skills.records.find(record => record.id === sourceId);
  const source = { ...original, id: original.id.replace('skill.', 'skill_entry.'), kind: original.is_active ? 'active' : 'passive' };
  const identity = { id: source.id, kind: source.kind, category: source.legacy_category_id, index: source.legacy_entry_index };
  const edit = draftFromSource(source, source.kind); change(edit);
  return { ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256, characterSourceFingerprint: character.sourceFingerprint, revision, records: [compileRecord(validateDraft(edit, identity), identity, source)] };
}

test('active skill timing and text project into actual learned-skill view and source code restores every table', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = window.PandoraRemaked; window.Flag[3] = 1; window.StatusMove('Lev', 54); window.CalcSet('Lev'); window.CalcSet('Job');
    const original = api.adapter.serialize(); const source = JSON.stringify(window.Skill); const prerequisite = window.Skill[0][0][0][9];
    api.catalog.applySnapshot(data);
    api.i18n.setLocale('ru'); const translated = document.querySelector('#LearnSkill_0_0 > ul:nth-child(9) > li').textContent;
    api.i18n.setLocale('en');
    const published = { timing: window.Skill[0][0][0].slice(5, 9), prerequisite: window.Skill[0][0][0][9], name: api.catalog.gameLabel('skill_entry.0.0'), cost: document.getElementById('LearnSkillMP_0_0')?.textContent, translated };
    const code = api.adapter.serialize(); api.adapter.load(original); const restored = source === JSON.stringify(window.Skill);
    api.adapter.load(code); return { published, prerequisite, restored, loaded: window.Skill[0][0][0].slice(5, 9), classCaps: window.Skill.P.length };
  }, publication('skill.0.0', edit => { edit.names.en = 'Updated Provoke'; edit.description.ru = 'Русское описание <img src=x onerror=alert(1)>'; edit.mpCost = 25; edit.castSeconds = 1.25; edit.cooldownSeconds = 20; edit.durationSeconds = 2; }));
  expect(result.published.timing).toEqual([25, 1.25, 20, 2]); expect(result.published.prerequisite).toBe(result.prerequisite);
  expect(result.published.name).toBe('Updated Provoke'); expect(result.published.cost).toBe('25'); expect(result.restored).toBe(true); expect(result.loaded).toEqual([25, 1.25, 20, 2]); expect(result.classCaps).toBe(28);
  expect(result.published.translated).toBe('Русское описание <img src=x onerror=alert(1)>');
});

test('additional passive bonus uses native learning even with the Skill List hidden, and level changes trigger complete recalculation', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = window.PandoraRemaked; window.Flag[3] = 0; const learned = window.Learn;
    const original = api.adapter.serialize(); api.catalog.applySnapshot(data); const low = window.Status.STR[2];
    window.StatusMove('Lev', 11); window.CalcSet('Lev'); const high = window.Status.STR[2]; const code = api.adapter.serialize();
    window.CalcSet('ALL'); window.CalcSet('Equip'); window.CalcSet('ALL'); const repeated = window.Status.STR[2];
    api.adapter.load(original); const restored = window.Status.STR[2]; api.adapter.load(code);
    return { low, high, repeated, restored, loaded: window.Status.STR[2], flag: window.Flag[3], sameLearnObject: window.Learn === learned };
  }, publication('skill.0.1', edit => { edit.effects = [{ stat: 1, value: 5, unit: 'flat' }]; }));
  expect(result.low).toBe(0); expect(result.high).toBe(5); expect(result.repeated).toBe(5); expect(result.restored).toBe(0); expect(result.loaded).toBe(5); expect(result.flag).toBe(0); expect(result.sameLearnObject).toBe(true);
});

test('additional passive bonus obeys explicit weapon requirements and never activates without the configured weapon', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = window.PandoraRemaked; window.StatusMove('Lev', 54); window.CalcSet('Lev');
    api.catalog.applySnapshot(data); const unarmed = window.Status.STR[2];
    api.adapter.selectEquipment(0, 1); const sword = window.Status.STR[2];
    api.adapter.selectEquipment(0, 60002); const knife = window.Status.STR[2];
    return { unarmed, sword, knife };
  }, publication('skill.0.1', edit => { edit.effects = [{ stat: 1, value: 5, unit: 'flat' }]; edit.bonusRequirements.weaponCategories = [0]; }));
  expect(result.unarmed).toBe(0); expect(result.sword).toBe(5); expect(result.knife).toBe(0);
});

test('additional shield/riding bonus responds to native Equip and Horse callbacks without stale attribute output', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = window.PandoraRemaked; window.StatusMove('Lev', 54); window.CalcSet('Lev');
    api.catalog.applySnapshot(data); const before = window.Status.STR[2];
    const selected = api.adapter.selectEquipment(1, 200001); const unmounted = window.Status.STR[2];
    window.Flag[7] = 1; window.CalcSet('Horse'); const mounted = window.Status.STR[2];
    window.Flag[7] = 0; window.CalcSet('Horse'); const stopped = window.Status.STR[2];
    return { before, selected, unmounted, mounted, stopped };
  }, publication('skill.0.1', edit => { edit.effects = [{ stat: 1, value: 5, unit: 'flat' }]; edit.bonusRequirements.shieldRequired = true; edit.bonusRequirements.ridingRequired = true; }));
  expect(result.selected).toBe(true); expect(result.before).toBe(0); expect(result.unmounted).toBe(0); expect(result.mounted).toBe(5); expect(result.stopped).toBe(0);
});

test('all 211 source skill projections preserve native summary, prerequisites and type; source revision restores exact tables', async ({ page }) => {
  await page.goto('/');
  const records = skills.records.map(source => publication(source.id, () => {}).records[0]);
  const result = await page.evaluate(data => {
    const api = window.PandoraRemaked; const original = api.adapter.serialize(); const source = JSON.stringify(window.Skill); const before = api.adapter.readCalculatedSummary();
    api.catalog.applySnapshot(data); const after = api.adapter.readCalculatedSummary(); api.adapter.load(original);
    return { before, after, tablesRestored: source === JSON.stringify(window.Skill), payloadRestored: original === api.adapter.serialize() };
  }, { ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256, characterSourceFingerprint: character.sourceFingerprint, revision: 1, records });
  expect(result.after).toEqual(result.before); expect(result.tablesRestored).toBe(true); expect(result.payloadRestored).toBe(true);
});

test('bad skill type, prerequisites, timings and active effects fail before changing tables or character', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(data => {
    const api = window.PandoraRemaked; const original = api.adapter.serialize(); const source = JSON.stringify(window.Skill);
    const invalid = [ { ...data, records: [{ ...data.records[0], prerequisiteCode: 'J=0=1' }] }, { ...data, records: [{ ...data.records[0], kind: 'passive' }] },
      { ...data, records: [{ ...data.records[0], timing: [-1, 0, 0, 0] }] }, { ...data, records: [{ ...data.records[0], effects: [{ stat: 1, value: 5, unit: 'flat' }] }] }, { ...data, characterSourceFingerprint: 'wrong' } ];
    const rejected = invalid.map(input => { try { api.catalog.applySnapshot(input); return false; } catch { return true; } });
    return { rejected, same: source === JSON.stringify(window.Skill) && original === api.adapter.serialize() };
  }, publication('skill.0.0', () => {}));
  expect(result.rejected).toEqual([true, true, true, true, true]); expect(result.same).toBe(true);
});
