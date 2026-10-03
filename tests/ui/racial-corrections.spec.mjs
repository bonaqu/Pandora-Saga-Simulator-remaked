import { test, expect } from '@playwright/test';
import { approvedRacialCorrections } from '../../admin-api/src/racial-corrections.mjs';
import { baselineById, sourceIdentity, characterSourceFingerprint, sourceFingerprint } from '../../admin-api/src/catalog-baseline.mjs';
import { compileRecord } from '../../admin-api/src/catalog-model.mjs';

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
