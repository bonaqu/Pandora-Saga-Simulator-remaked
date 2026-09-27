import { test, expect } from '@playwright/test';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
}

async function ensureJobTabOpen(page, controlSelector) {
  const control = page.locator(controlSelector);
  if (!(await control.isVisible())) {
    await page.locator('[data-remaked-header]').getByRole('button', { name: 'JOB', exact: true }).click();
  }
  await expect(control).toBeVisible();
  return control;
}

async function makeFixtures(page) {
  await openModern(page);
  const fixtures = [];
  const adapter = () => page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const original = await adapter();
  fixtures.push({ name: 'default', payload: original });

  const race = await ensureJobTabOpen(page, '#SelRace');
  const currentRace = await race.evaluate((select) => select.selectedIndex);
  const raceCount = await race.locator('option').count();
  expect(raceCount).toBeGreaterThan(1);
  await race.selectOption({ index: (currentRace + 1) % raceCount });
  fixtures.push({ name: 'changed-race', payload: await adapter() });

  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), original);
  const equipmentPayload = await page.evaluate(() => {
    const adapter = window.PandoraRemaked.adapter;
    const targets = adapter.listEquipmentTargets();
    for (const target of targets) {
      const select = document.getElementById(target.selectId);
      const options = adapter.listEquipmentOptions(target.slotIndex);
      const next = options.find((option) => String(option.value) !== String(select.value));
      if (next && adapter.selectEquipment(target.slotIndex, next.value)) return adapter.serialize();
    }
    return null;
  });
  expect(equipmentPayload).not.toBeNull();
  expect(equipmentPayload).not.toBe(original);
  fixtures.push({ name: 'changed-equipment', payload: equipmentPayload });

  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), original);
  const job = await ensureJobTabOpen(page, '#SelJob');
  const jobCount = await job.locator('option').count();
  if (jobCount > 3) {
    await job.selectOption({ index: 3 });
    const metadata = await page.evaluate(() => window.PandoraRemaked.adapter.readCharacterMetadata());
    if (/dragoon/i.test(metadata.job)) {
      fixtures.push({ name: 'dragoon-oriented', payload: await adapter() });
    }
  }

  return fixtures;
}

async function modernProjection(page, payload) {
  await openModern(page);
  return page.evaluate((build) => window.PandoraRemaked.adapter.evaluateBuild(build), payload);
}

async function legacyProjection(page, payload, fields) {
  await page.goto('/legacy/?lang=en');
  await expect(page.locator('#body')).toHaveCount(1);
  await page.evaluate((build) => {
    document.getElementById('InCode').value = build;
    window.File('CodeLoad');
  }, payload);
  return page.evaluate((definitions) => ({
    metadata: {
      race: (document.getElementById('StatusRace')?.textContent || '').trim(),
      raceSkill: (document.getElementById('StatusRSkill')?.textContent || '').trim(),
      job: (document.getElementById('StatusJob')?.textContent || '').trim(),
      level: Number((document.getElementById('StatusLev')?.textContent || '').trim())
    },
    summary: definitions.map((field) => ({
      key: field.key,
      display: (document.getElementById(field.sourceId)?.textContent || '').trim() || '---'
    }))
  }), fields);
}

test('representative serialized builds produce the same calculated projection in Modern and Legacy', async ({ page }) => {
  const fixtures = await makeFixtures(page);
  expect(fixtures.map((fixture) => fixture.name)).toContain('default');
  expect(fixtures.map((fixture) => fixture.name)).toContain('changed-race');
  expect(fixtures.map((fixture) => fixture.name)).toContain('changed-equipment');

  for (const fixture of fixtures) {
    const modern = await modernProjection(page, fixture.payload);
    const fields = modern.summary.map(({ key, sourceId }) => ({ key, sourceId }));
    const legacy = await legacyProjection(page, fixture.payload, fields);

    expect(legacy.metadata, `${fixture.name} metadata`).toEqual(modern.metadata);
    expect(legacy.summary, `${fixture.name} calculated summary`).toEqual(
      modern.summary.map((field) => ({ key: field.key, display: field.display }))
    );
  }
});
