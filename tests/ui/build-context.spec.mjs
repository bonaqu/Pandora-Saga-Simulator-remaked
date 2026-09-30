import { test, expect } from '@playwright/test';

async function withEffects(page) {
  return page.evaluate(() => {
    const api = window.PandoraRemaked;
    window.StatusMove('Lev', 54); window.CalcSet('Lev');
    const original = api.adapter.serialize();
    document.getElementById('Buff_0_7').click();
    document.getElementById('BuffHonor_2').click();
    document.getElementById('SelBuffClan_10').selectedIndex = 3;
    document.getElementById('InBuff_0').value = '175';
    document.getElementById('SwitchUse_4').click(); window.CalcSet('ALL');
    return { original, payload: api.adapter.serialize(), summary: api.adapter.readCalculatedSummary() };
  });
}

test('Modern code restores riding, effects, honor, clan and caster data without changing source Store format', async ({ page }) => {
  await page.goto('/'); const saved = await withEffects(page);
  const state = await page.evaluate(({ original, payload }) => {
    const api = window.PandoraRemaked; api.adapter.load(original);
    const reset = { horse: window.Flag[7], buff: window.Flag['0_7'], honor: window.Flag.Honor || 0, clan: document.getElementById('SelBuffClan_10').selectedIndex, caster: document.getElementById('InBuff_0').value };
    api.adapter.load(payload);
    return { reset, summary: api.adapter.readCalculatedSummary(), roundtrip: api.adapter.serialize(), raw: window.Store(), horse: window.Flag[7], buff: window.Flag['0_7'], honor: window.Flag.Honor, clan: document.getElementById('SelBuffClan_10').selectedIndex, caster: document.getElementById('InBuff_0').value, pressed: document.getElementById('SwitchUse_4').className };
  }, saved);
  expect(saved.payload).toMatch(/^PS3:0:C1:/);
  expect(state.reset).toEqual({ horse: 0, buff: 0, honor: 0, clan: 0, caster: '134' });
  expect(state.summary).toEqual(saved.summary); expect(state.roundtrip).toBe(saved.payload);
  expect(state.raw).toBe(saved.original); expect(state.horse).toBe(1); expect(state.buff).toBe(1); expect(state.honor).toBe(3); expect(state.clan).toBe(3); expect(state.caster).toBe('175'); expect(state.pressed).toBe('btn2_on');
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-code-action="create"]').click();
  await expect(page.locator('#InCode')).toHaveValue(saved.payload);
});

test('fresh shared recipient and offline reload calculate the same complete context, not current local switches', async ({ page, browser }) => {
  await page.goto('/'); const saved = await withEffects(page);
  const context = await browser.newContext(); const recipient = await context.newPage();
  await recipient.goto('http://127.0.0.1:8000/#build=' + encodeURIComponent(saved.payload));
  await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
  expect(await recipient.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(saved.payload);
  expect(await recipient.evaluate(() => window.PandoraRemaked.adapter.readCalculatedSummary())).toEqual(saved.summary);
  await recipient.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => recipient.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true); await recipient.reload();
  await expect(recipient.locator('[data-remaked-autosave-status]')).toContainText('Shared build loaded');
  expect(await recipient.evaluate(() => window.PandoraRemaked.adapter.readCalculatedSummary())).toEqual(saved.summary);
  await context.close();
});

test('comparison restores active switches and stored records after evaluating a build with different effects', async ({ page }) => {
  await page.goto('/'); const saved = await withEffects(page);
  const result = await page.evaluate(({ original, payload }) => {
    const api = window.PandoraRemaked; api.builds.flushAutosave(); const storage = JSON.stringify(localStorage);
    const source = api.adapter.evaluateBuild(original); const effect = api.adapter.evaluateBuild(payload);
    return { source, effect, active: api.adapter.serialize(), storage, afterStorage: JSON.stringify(localStorage) };
  }, saved);
  expect(result.source.summary).not.toEqual(saved.summary); expect(result.effect.summary).toEqual(saved.summary);
  expect(result.active).toBe(saved.payload); expect(result.afterStorage).toBe(result.storage);
});

test('malformed context is rejected before mutation and failed import retains every switch and stored build', async ({ page }) => {
  await page.goto('/'); const saved = await withEffects(page);
  const result = await page.evaluate(async payload => {
    const api = window.PandoraRemaked; api.builds.flushAutosave(); const before = api.adapter.serialize(), storage = JSON.stringify(localStorage);
    const context = { riding: 1, buffs: ['0_7'], honor: 3, clan: window.Name.Clan.map(() => 0), caster: [175, 90, 30] };
    const bad = [ { ...context, riding: 2 }, { ...context, buffs: ['evil'] }, { ...context, buffs: ['0_7', '0_7'] }, { ...context, buffs: ['6_2', '11_0'] }, { ...context, honor: 14 }, { ...context, clan: [999] }, { ...context, caster: [-1, 90, 30] }, { ...context, password: 'not a field' } ];
    const codes = bad.map(value => 'PS3:0:C1:' + btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + ':' + window.Store());
    codes.push('PS3:0:C1:!:' + window.Store());
    const rejected = [];
    for (const code of codes) rejected.push(!(await api.builds.importPreparedPayload(code)).ok);
    return { rejected, before, after: api.adapter.serialize(), storage, afterStorage: JSON.stringify(localStorage) };
  }, saved.payload);
  expect(result.rejected).toEqual(Array(9).fill(true)); expect(result.after).toBe(result.before); expect(result.afterStorage).toBe(result.storage);
});

test('old CSV, compressed and first PS3 codes read safely with default effect context', async ({ page }) => {
  await page.goto('/'); const saved = await withEffects(page);
  const result = await page.evaluate(original => {
    const api = window.PandoraRemaked;
    const compressed = window.Base64.toBase64(window.RawDeflate.deflate(window.Base64.utob(original)));
    api.adapter.load(compressed);
    return { payload: api.adapter.serialize(), riding: window.Flag[7], buff: window.Flag['0_7'], honor: window.Flag.Honor, parsed: api.catalog.unpackPayload('PS3:1:' + original).context };
  }, saved.original);
  expect(result.payload).toBe(saved.original); expect(result.riding).toBe(0); expect(result.buff).toBe(0); expect(result.honor).toBe(0); expect(result.parsed).toBeNull();
});

test('changing source language preserves clan selections, caster values and complete effect context', async ({ page }) => {
  await page.goto('/'); const saved = await withEffects(page);
  for (const language of ['JP', 'TW', 'RU', 'EN']) {
    await page.locator('[data-remaked-language-panel] button').filter({ hasText: new RegExp('^' + language + '$') }).click();
    expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(saved.payload);
    expect(await page.evaluate(() => window.PandoraRemaked.adapter.readCalculatedSummary())).toEqual(saved.summary);
  }
});
