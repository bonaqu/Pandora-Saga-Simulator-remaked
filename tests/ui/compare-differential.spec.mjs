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
  return page.evaluate((build) => ({
    ...window.PandoraRemaked.adapter.evaluateBuild(build),
    approvedNames: window.PandoraRemakedGameTerms.en
  }), payload);
}

async function legacyProjection(page, payload, fields) {
  await page.goto('/legacy/?lang=en');
  await expect(page.locator('#body')).toHaveCount(1);
  await page.evaluate((build) => {
    window.Expand(build);
    window.ListCreate('Set');
    window.ListCreate('Equip');
    window.ListCreate('SoulSelect');
    window.ListCreate('SoulCheck');

    document.getElementById('SelRace').selectedIndex = window.Status.Job[0];
    window.RJChange('RSkill');
    document.getElementById('SelRSkill').selectedIndex = window.Status.Job[1];
    document.getElementById('SelJob').selectedIndex = window.Status.Job[2];
    document.getElementById('StatusRace').innerHTML = window.Name.Race[window.Status.Job[0]][window.Flag[0]];
    document.getElementById('StatusRSkill').innerHTML = window.Name.Race.Skill[window.Status.Job[0]][window.Status.Job[1]][window.Flag[0]];
    document.getElementById('StatusJob').innerHTML = window.Name.Job[window.Status.Job[2]][window.Flag[0] + 2];
    document.getElementById('StatusLev').innerHTML = window.Status.Lev[0];
    document.getElementById('StatusStP_0').innerHTML = window.Status.StP[0];
    document.getElementById('StatusStP_1').innerHTML = window.Status.StP[1];
    document.getElementById('StatusSkP_0').innerHTML = window.Status.SkP[0];
    document.getElementById('StatusSkP_1').innerHTML = window.Status.SkP[1];
    document.getElementById('StatusUnP_0').innerHTML = window.Status.UnP[0];
    document.getElementById('StatusUnP_1').innerHTML = window.Status.UnP[1];

    for (let index = 0; index < window.Name.Skill.length; index += 1) {
      document.getElementById('Skill_' + index + '_1').innerHTML = window.Status.Skill[index][0];
      document.getElementById('Skill_' + index + '_2').innerHTML = window.Status.Skill[index][2];
      if (index !== 0 && index !== 6 && index !== 12 && index !== 17 && index !== 22) {
        const next = document.getElementById('Skill_' + index + '_3');
        next.innerHTML = (window.Status.Skill[index][2] + window.Status.Skill[index][3] === window.MaxSk)
          ? '-'
          : window.SPt[window.Status.Skill[index][2] + window.Status.Skill[index][3] + 1][1];
        window.CalcSet('Skill', index, 0, 'Potential');
        window.CalcSet('Skill', index, 0, 'Adeptness');
      }
    }

    window.SkillBar('ALL');
    window.CalcSet('ALL');
    window.Log();
  }, payload);

  return page.evaluate((definitions) => ({
    identity: window.Status.Job.slice(0, 3),
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

    // Modern deliberately uses approved current names; the museum must keep
    // its historical names. Resolve by stable source IDs, not by fuzzy text,
    // while retaining exact metadata and numerical projection assertions.
    const [race, racialSkill, job] = legacy.identity;
    const expectedMetadata = {
      ...legacy.metadata,
      race: modern.approvedNames[`race.${race}`] || legacy.metadata.race,
      raceSkill: modern.approvedNames[`racial_skill.${race}.${racialSkill}`] || legacy.metadata.raceSkill,
      job: modern.approvedNames[`job.${job}`] || legacy.metadata.job
    };
    expect(modern.metadata, `${fixture.name} current metadata`).toEqual(expectedMetadata);
    if (fixture.name === 'changed-race') {
      expect(legacy.metadata.raceSkill).toBe('Harmony with Nature');
      expect(modern.metadata.raceSkill).toBe("Nature's Harmony");
    }
    expect(legacy.summary, `${fixture.name} calculated summary`).toEqual(
      modern.summary.map((field) => ({ key: field.key, display: field.display }))
    );
  }
});
