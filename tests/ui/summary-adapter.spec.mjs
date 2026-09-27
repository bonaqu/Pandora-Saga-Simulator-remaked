import { test, expect } from '@playwright/test';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
}

async function chooseDifferentRace(page) {
  await page.locator('[data-remaked-header]').getByRole('button', { name: 'JOB', exact: true }).click();
  const race = page.locator('#SelRace');
  await expect(race).toBeVisible();
  const current = await race.evaluate((select) => select.selectedIndex);
  const count = await race.locator('option').count();
  expect(count).toBeGreaterThan(1);
  await race.selectOption({ index: (current + 1) % count });
  return page.evaluate(() => window.PandoraRemaked.adapter.serialize());
}

test('calculated summary exposes stable legacy-backed comparison fields', async ({ page }) => {
  await openModern(page);
  const summary = await page.evaluate(() => window.PandoraRemaked.adapter.readCalculatedSummary());

  expect(summary.map((field) => field.key)).toEqual([
    'lp',
    'mp',
    'physicalAttack',
    'magicAttack',
    'defense',
    'physicalDamageResist',
    'magicDamageResist',
    'accuracy',
    'dodge',
    'crit',
    'critResist',
    'critDamage',
    'critDamageResist',
    'attackSpeed',
    'moveSpeed',
    'castSpeed',
    'castTime',
    'cooldown',
    'fireResist',
    'iceResist',
    'lightningResist',
    'poisonResist',
    'charmResist',
    'lightResist',
    'darkResist',
    'magicResist'
  ]);

  const lp = summary.find((field) => field.key === 'lp');
  expect(lp.label).toBe('LP / HP');
  expect(lp.sourceId).toBe('Status_6');
  expect(lp.unit).toBe('');
  expect(lp.display).toBe((await page.locator('#Status_6').textContent()).trim());
  expect(lp.value).toBe(Number(lp.display.replaceAll(',', '')));

  const crit = summary.find((field) => field.key === 'crit');
  expect(crit.sourceId).toBe('Status_69');
  expect(crit.unit).toBe('%');
  expect(crit.value).toBe(Number(crit.display.replaceAll(',', '')));
});

test('summary parsing treats unavailable legacy output as unavailable instead of inventing a delta value', async ({ page }) => {
  await openModern(page);
  await page.locator('#Status_73').evaluate((node) => { node.textContent = '---'; });
  const attackSpeed = await page.evaluate(() => window.PandoraRemaked.adapter.readCalculatedSummary().find((field) => field.key === 'attackSpeed'));
  expect(attackSpeed.display).toBe('---');
  expect(attackSpeed.value).toBeNull();
});

test('character metadata comes from the current legacy-calculated character state', async ({ page }) => {
  await openModern(page);
  const metadata = await page.evaluate(() => window.PandoraRemaked.adapter.readCharacterMetadata());
  expect(metadata).toEqual({
    race: ((await page.locator('#StatusRace').textContent()) ?? '').trim(),
    raceSkill: ((await page.locator('#StatusRSkill').textContent()) ?? '').trim(),
    job: ((await page.locator('#StatusJob').textContent()) ?? '').trim(),
    level: Number(((await page.locator('#StatusLev').textContent()) ?? '').trim())
  });
});

test('evaluateBuild calculates another payload then restores active build and all storage sentinels', async ({ page }) => {
  await openModern(page);
  const activePayload = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const otherPayload = await chooseDifferentRace(page);
  expect(otherPayload).not.toBe(activePayload);
  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), activePayload);

  const autosaveSentinel = JSON.stringify({ sentinel: 'autosave-must-not-change' });
  const buildsSentinel = JSON.stringify({ sentinel: 'builds-must-not-change' });
  await page.evaluate(({ autosave, builds }) => {
    localStorage.setItem('file', 'legacy-file-sentinel');
    localStorage.setItem('pandora-remaked.autosave.v1', autosave);
    localStorage.setItem('pandora-remaked.builds.v1', builds);
  }, { autosave: autosaveSentinel, builds: buildsSentinel });

  const evaluated = await page.evaluate((payload) => window.PandoraRemaked.adapter.evaluateBuild(payload), otherPayload);
  expect(evaluated.metadata.race.length).toBeGreaterThan(0);
  expect(evaluated.summary.length).toBeGreaterThan(10);
  expect(evaluated.summary.some((field) => field.key === 'physicalAttack')).toBe(true);

  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(activePayload);
  expect(await page.evaluate(() => localStorage.getItem('file'))).toBe('legacy-file-sentinel');
  expect(await page.evaluate(() => localStorage.getItem('pandora-remaked.autosave.v1'))).toBe(autosaveSentinel);
  expect(await page.evaluate(() => localStorage.getItem('pandora-remaked.builds.v1'))).toBe(buildsSentinel);
});
