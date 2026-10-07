import { test, expect } from '@playwright/test';
import { compileRecord, draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };

function publication(records) {
  return {
    ok: true,
    schemaVersion: 1,
    sourceFingerprint: equipment.metadata.generated_from[0].sha256,
    characterSourceFingerprint: character.sourceFingerprint,
    revision: 85,
    impactRevision: 85,
    records
  };
}

function customEquipment(category, index, name, effects = [], extra = {}) {
  const id = { id: 'modern.equipment.test-' + category + '-' + index, kind: 'equipment', category, index };
  const edit = draftFromSource(null, 'equipment');
  Object.assign(edit, {
    id: id.id,
    category,
    names: { en: name, ru: name, jp: '', tw: '' },
    level: extra.level ?? 40,
    sockets: extra.sockets ?? 0,
    baseAttack: extra.baseAttack ?? null,
    armorClass: extra.armorClass ?? null,
    effects
  });
  return compileRecord(validateDraft(edit, id), id, null);
}

async function equipAndMeasure(page, engineId, plus) {
  return page.evaluate(({ engineId, plus }) => {
    Status.Equip[0] = [engineId, 0, 0, plus, 0, 0, 0];
    EquipCheck();
    const sum = stat => (EquipOpt[stat] || []).reduce((total, token) => total + Number(String(token).replace('%', '')), 0);
    return {
      agiEquipmentBonus: Status.AGI[2],
      attackSpeed: Number(document.getElementById('Status_73').textContent),
      attackSpeedOptions: [...(EquipOpt[73] || [])],
      agiOptions: [...(EquipOpt[2] || [])],
      attackSpeedOptionTotal: sum(73)
    };
  }, { engineId, plus });
}

test('Robust War Crossbow follows the live +2/+4/+6/+7 enhancement thresholds', async ({ page }) => {
  const crossbow = customEquipment(9, 19, 'War Crossbow D', [{ stat: 2, unit: 'flat', value: 1 }], {
    baseAttack: 70,
    sockets: 2
  });
  expect(crossbow.engineId).toBe(90019);

  await page.goto('/');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), publication([crossbow]));

  const p0 = await equipAndMeasure(page, crossbow.engineId, 0);
  const p2 = await equipAndMeasure(page, crossbow.engineId, 2);
  const p4 = await equipAndMeasure(page, crossbow.engineId, 4);
  const p6 = await equipAndMeasure(page, crossbow.engineId, 6);
  const p7 = await equipAndMeasure(page, crossbow.engineId, 7);
  const p8 = await equipAndMeasure(page, crossbow.engineId, 8);

  expect(p2.attackSpeedOptionTotal - p0.attackSpeedOptionTotal).toBe(2);
  expect(p4.attackSpeedOptionTotal - p0.attackSpeedOptionTotal).toBe(4);
  expect(p6.attackSpeedOptionTotal - p0.attackSpeedOptionTotal).toBe(6);
  expect(p7.attackSpeedOptionTotal - p0.attackSpeedOptionTotal).toBe(6);
  expect(p8.attackSpeedOptionTotal - p0.attackSpeedOptionTotal).toBe(8);

  expect(p0.agiEquipmentBonus).toBe(1);
  expect(p6.agiEquipmentBonus).toBe(1);
  expect(p7.agiEquipmentBonus).toBe(2);
  expect(p8.agiEquipmentBonus).toBe(2);

  expect(p2.attackSpeed).toBeGreaterThan(p0.attackSpeed);
  expect(p4.attackSpeed).toBeGreaterThanOrEqual(p2.attackSpeed + 2);
  expect(p6.attackSpeed).toBeGreaterThanOrEqual(p4.attackSpeed + 2);
});

test('Strong War Crossbow grants its full +2 enhancement stat at +7', async ({ page }) => {
  const crossbow = customEquipment(9, 21, 'War Crossbow S', [{ stat: 2, unit: 'flat', value: 1 }], {
    baseAttack: 75,
    sockets: 1
  });
  expect(crossbow.engineId).toBe(90021);

  await page.goto('/');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), publication([crossbow]));
  const p6 = await equipAndMeasure(page, crossbow.engineId, 6);
  const p7 = await equipAndMeasure(page, crossbow.engineId, 7);
  expect(p6.agiEquipmentBonus).toBe(1);
  expect(p7.agiEquipmentBonus).toBe(3);
});

test('enhancement-ranged Souls use the enhancement level of their host item', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), publication([]));
  const result = await page.evaluate(() => {
    const sum = stat => (EquipOpt[stat] || []).reduce((total, token) => total + Number(String(token).replace('%', '')), 0);

    Status.Equip[2] = [0, 0, 0, 7, 164, 0, 0];
    EquipCheck();
    const parade7 = sum(160);
    Status.Equip[2] = [0, 0, 0, 8, 164, 0, 0];
    EquipCheck();
    const parade8 = sum(160);

    Status.Equip[3] = [0, 0, 0, 7, 163, 0, 0];
    Status.Equip[2] = [0, 0, 0, 0, 0, 0, 0];
    EquipCheck();
    const mirror7 = sum(135);
    Status.Equip[3] = [0, 0, 0, 8, 163, 0, 0];
    EquipCheck();
    const mirror8 = sum(135);

    return { parade7, parade8, mirror7, mirror8 };
  });
  expect(result.parade7).toBe(25);
  expect(result.parade8).toBe(50);
  expect(result.mirror7).toBe(3);
  expect(result.mirror8).toBe(5);
});

test('server unison set effects work even when members use Modern-only identities', async ({ page }) => {
  const records = [
    customEquipment(30, 70, 'Divine Hat'),
    customEquipment(31, 66, 'Divine Cuirass'),
    customEquipment(32, 106, 'Divine Bracers'),
    customEquipment(33, 99, 'Divine Aloub'),
    customEquipment(34, 72, 'Divine Boots')
  ];
  const ids = Object.fromEntries(records.map(r => [r.category, r.engineId]));

  await page.goto('/');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), publication(records));
  const result = await page.evaluate(ids => {
    Status.Equip[2] = [ids[30], 0, 0, 0, 0, 0, 0];
    Status.Equip[3] = [ids[31], 0, 0, 5, 0, 0, 0];
    Status.Equip[4] = [ids[32], 0, 0, 0, 0, 0, 0];
    Status.Equip[5] = [ids[33], 0, 0, 0, 0, 0, 0];
    Status.Equip[6] = [ids[34], 0, 0, 0, 0, 0, 0];
    EquipCheck();
    const values = stat => [...(EquipOpt[stat] || [])].map(String);
    return {
      mp: values(7),
      armor: values(49),
      castInterrupt: values(134),
      cooldown: values(79)
    };
  }, ids);

  expect(result.mp).toContain('200');
  expect(result.mp).toContain('40');
  expect(result.armor).toContain('4');
  expect(result.castInterrupt).toContain('12');
  expect(result.castInterrupt).toContain('4');
  expect(result.cooldown).toContain('-8');
});

test('safe omitted base stats are visible in the retained calculator', async ({ page }) => {
  const bullseye = customEquipment(30, 111, 'Bullseye Cap', [{ stat: 3, unit: 'flat', value: 1 }], { armorClass: 7 });
  const cloak = customEquipment(35, 50, "Novice's Cloak");
  const earring = customEquipment(40, 61, "Priest's Earring");

  await page.goto('/');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), publication([bullseye, cloak, earring]));
  const result = await page.evaluate(ids => {
    Status.Equip[2] = [ids.bullseye, 0, 0, 0, 0, 0, 0];
    Status.Equip[7] = [ids.cloak, 0, 0, 0, 0, 0, 0];
    Status.Equip[8] = [ids.earring, 0, 0, 0, 0, 0, 0];
    EquipCheck();
    return {
      accuracyTokens: [...(EquipOpt[62] || [])],
      townMoveTokens: [...(EquipOpt[75] || [])],
      expTokens: [...(EquipOpt[82] || [])],
      auraTokens: [...(EquipOpt[33] || [])]
    };
  }, { bullseye: bullseye.engineId, cloak: cloak.engineId, earring: earring.engineId });

  expect(result.accuracyTokens).toContain('10%');
  expect(result.townMoveTokens).toContain('15');
  expect(result.expTokens).toContain('5');
  expect(result.auraTokens).toContain('2');
});
