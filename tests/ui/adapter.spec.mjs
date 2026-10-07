import { test, expect } from '@playwright/test';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-header]')).toBeVisible();
}

async function optionRecords(page, selector) {
  // Capture one coherent DOM snapshot instead of hundreds of protocol trips.
  // Preserve exactly the same value/text fields and every parity assertion.
  // Legacy owns window.Set; locator.evaluateAll's selector runtime assumes the
  // native Set constructor. Plain DOM evaluation does not touch that global.
  return page.evaluate(selector => {
    const records = [];
    const options = document.querySelectorAll(`${selector} option`);
    for (let index = 0; index < options.length; index += 1) {
      records.push({
        value: options[index].getAttribute('value') ?? '',
        text: (options[index].textContent ?? '').trim()
      });
    }
    return records;
  }, selector);
}

async function optionValues(page, selector) {
  return (await optionRecords(page, selector)).map((option) => option.value);
}

async function findSelectableEquipment(page, slotIndex = 0) {
  const values = await optionValues(page, `#SelEquip_${slotIndex}_0`);
  expect(values.length).toBeGreaterThan(1);
  return { value: values[1] };
}

async function findSocketBearingTarget(page) {
  const original = await page.evaluate(() => window.Store());
  for (let slotIndex = 0; slotIndex <= 13; slotIndex += 1) {
    const selector = `#SelEquip_${slotIndex}_0`;
    const values = await optionValues(page, selector);
    for (const value of values.slice(1, 60)) {
      // Direct engine-field parity, not a user-facing Modern interaction.
      await page.locator(selector).selectOption(value, { force: true });
      const target = await page.evaluate((slot) => {
        for (let socket = 4; socket <= 6; socket += 1) {
          const node = document.getElementById(`SelEquip_${slot}_${socket}`);
          if (!node) continue;
          // SoulCheck alone controls actual socket availability, even when
          // Modern hides the original select behind its picker trigger.
          if (node.style.display !== 'none' && node.options.length > 1) {
            return { slotIndex: slot, socketIndex: socket, selectId: node.id };
          }
        }
        return null;
      }, slotIndex);
      if (target) {
        const socketBuild = await page.evaluate(() => window.Store());
        return { original, socketBuild, target };
      }
    }
    await page.evaluate((payload) => {
      window.Expand(payload);
      window.ListCreate('Set');
      window.ListCreate('Equip');
      window.ListCreate('Soul');
      window.ListCreate('SoulSelect');
      window.ListCreate('SoulCheck');
      window.CalcSet('ALL');
    }, original);
  }
  return null;
}

test('adapter serialization is byte-identical to legacy Store()', async ({ page }) => {
  await openModern(page);
  expect(await page.evaluate(() => Boolean(window.PandoraRemaked?.adapter))).toBe(true);
  const values = await page.evaluate(() => ({
    adapter: window.PandoraRemaked.adapter.serialize(),
    legacy: window.Store()
  }));
  expect(values.adapter).toBe(values.legacy);
});

test('adapter load round-trips build state without touching legacy localStorage.file', async ({ page }) => {
  await openModern(page);
  expect(await page.evaluate(() => Boolean(window.PandoraRemaked?.adapter))).toBe(true);

  const { value } = await findSelectableEquipment(page, 0);
  await page.evaluate(() => localStorage.setItem('file', 'legacy-sentinel-do-not-touch'));
  await page.evaluate((selected) => window.PandoraRemaked.adapter.selectEquipment(0, selected), value);
  const payloadA = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());

  const otherValues = await optionValues(page, '#SelEquip_0_0');
  const alternate = otherValues.find((candidate) => candidate !== value) ?? otherValues[0];
  await page.locator('#SelEquip_0_0').selectOption(alternate, { force: true });

  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), payloadA);
  expect(await page.evaluate(() => window.Store())).toBe(payloadA);
  expect(await page.evaluate(() => localStorage.getItem('file'))).toBe('legacy-sentinel-do-not-touch');
});

test('Equipment options preserve select membership and sort by level then stable ID', async ({ page }) => {
  await openModern(page);
  const target = await page.evaluate(() => window.PandoraRemaked.adapter.listEquipmentTargets()[0]);
  expect(target.slotIndex).toBe(0);
  expect(target.selectId).toBe('SelEquip_0_0');
  expect(target.label.trim().length).toBeGreaterThan(0);

  const adapterOptions = await page.evaluate(() => window.PandoraRemaked.adapter.listEquipmentOptions(0));
  const legacyOptions = (await optionRecords(page, '#SelEquip_0_0')).sort((a, b) => (Number(a.text.match(/^Lv:\s*(\d+)/)?.[1] ?? -1) - Number(b.text.match(/^Lv:\s*(\d+)/)?.[1] ?? -1)) || Number(a.value) - Number(b.value));
  expect(adapterOptions.map((option) => option.value)).toEqual(legacyOptions.map((option) => option.value));
  expect(adapterOptions.length).toBe(legacyOptions.length);

  for (let index = 0; index < adapterOptions.length; index += 1) {
    const match = legacyOptions[index].text.match(/^Lv:\s*(\d+)\s+(.*)$/);
    if (match) {
      expect(adapterOptions[index].level).toBe(Number(match[1]));
      expect(adapterOptions[index].name).toBe(match[2]);
    } else {
      expect(adapterOptions[index].level).toBeNull();
      expect(adapterOptions[index].name).toBe(legacyOptions[index].text);
    }
  }
});

test('Equipment adapter selection is payload-identical to manual legacy selection', async ({ page }) => {
  await openModern(page);
  const baseline = await page.evaluate(() => window.Store());
  const { value } = await findSelectableEquipment(page, 0);

  expect(await page.evaluate((selected) => window.PandoraRemaked.adapter.selectEquipment(0, selected), value)).toBe(true);
  const viaAdapter = await page.evaluate(() => window.Store());

  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), baseline);
  await page.locator('#SelEquip_0_0').selectOption(value, { force: true });
  const manually = await page.evaluate(() => window.Store());
  expect(viaAdapter).toBe(manually);

  const beforeInvalid = await page.evaluate(() => window.Store());
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.selectEquipment(999, '__missing__'))).toBe(false);
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.selectEquipment(0, '__missing__'))).toBe(false);
  expect(await page.evaluate(() => window.Store())).toBe(beforeInvalid);
});

test('Soul targets/options mirror usable legacy socket selects and select with parity', async ({ page }) => {
  await openModern(page);
  const found = await findSocketBearingTarget(page);
  expect(found).not.toBeNull();
  const { socketBuild, target } = found;

  const listedTargets = await page.evaluate(() => window.PandoraRemaked.adapter.listSoulTargets());
  expect(listedTargets.some((candidate) => candidate.selectId === target.selectId)).toBe(true);

  const adapterOptions = await page.evaluate((candidate) => window.PandoraRemaked.adapter.listSoulOptions(candidate), target);
  const legacyValues = await optionValues(page, `#${target.selectId}`);
  expect(adapterOptions.map((option) => option.value)).toEqual(legacyValues);
  expect(adapterOptions.length).toBeGreaterThan(1);

  const soulValue = adapterOptions[1].value;
  expect(await page.evaluate(({ candidate, value }) => window.PandoraRemaked.adapter.selectSoul(candidate, value), { candidate: target, value: soulValue })).toBe(true);
  const viaAdapter = await page.evaluate(() => window.Store());

  await page.evaluate((payload) => window.PandoraRemaked.adapter.load(payload), socketBuild);
  await page.locator(`#${target.selectId}`).selectOption(soulValue, { force: true });
  const manually = await page.evaluate(() => window.Store());
  expect(viaAdapter).toBe(manually);
});
