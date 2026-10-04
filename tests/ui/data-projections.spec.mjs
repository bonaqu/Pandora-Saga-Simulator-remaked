import { test, expect } from '@playwright/test';

test('generated indexes map stable IDs back to the live Legacy runtime', async ({ page }) => {
  await page.goto('/');
  const projections = await page.evaluate(async () => {
    const names = ['equipment', 'souls', 'skills'];
    const result = {};
    for (const name of names) {
      const response = await fetch(`./data/generated/${name}.v1.json`);
      if (!response.ok) throw new Error(`${name} projection returned ${response.status}`);
      result[name] = await response.json();
    }
    return result;
  });

  expect(projections.equipment.count).toBe(1120);
  expect(projections.souls.count).toBe(184);
  expect(projections.skills.count).toBe(211);
  for (const projection of Object.values(projections)) {
    expect(projection.metadata).toMatchObject({
      schema_version: 1,
      projection_version: 'v1',
      legacy_engine: '2.00',
      remaked_ui: '3.08'
    });
  }

  const equipment = projections.equipment.records.find((record) => record.legacy_id === 2);
  const soul = projections.souls.records.find((record) => record.legacy_id === 2);
  const skill = projections.skills.records.find((record) => record.id === 'skill.0.0');
  expect(equipment).toBeTruthy();
  expect(soul).toBeTruthy();
  expect(skill).toBeTruthy();

  const runtime = await page.evaluate(({ equipment, soul, skill }) => {
    const decode = (value) => {
      const node = document.createElement('textarea');
      node.innerHTML = String(value == null ? '' : value);
      return node.value.trim();
    };
    return {
      equipment: {
        id: equipment.legacy_category_id * 10000 + equipment.legacy_item_index,
        names: {
          jp: decode(window.EquipData[0][equipment.legacy_category_id][equipment.legacy_item_index][0]),
          en: decode(window.EquipData[1][equipment.legacy_category_id][equipment.legacy_item_index][0]),
          tw: decode(window.EquipData[2][equipment.legacy_category_id][equipment.legacy_item_index][0])
        }
      },
      soul: {
        id: soul.legacy_id,
        names: {
          jp: decode(window.SoulData[0][soul.legacy_id][0]),
          en: decode(window.SoulData[1][soul.legacy_id][0]),
          tw: decode(window.SoulData[2][soul.legacy_id][0])
        }
      },
      skill: {
        id: `skill.${skill.legacy_category_id}.${skill.legacy_entry_index}`,
        names: {
          jp: decode(window.Skill[0][skill.legacy_category_id][skill.legacy_entry_index][0]),
          en: decode(window.Skill[1][skill.legacy_category_id][skill.legacy_entry_index][0]),
          tw: decode(window.Skill[2][skill.legacy_category_id][skill.legacy_entry_index][0])
        }
      }
    };
  }, { equipment, soul, skill });

  expect(runtime.equipment).toEqual({ id: equipment.legacy_id, names: equipment.name });
  expect(runtime.soul).toEqual({ id: soul.legacy_id, names: soul.name });
  expect(runtime.skill).toEqual({ id: skill.id, names: skill.name });
});

test('Legacy route remains free of Modern data projection scripts', async ({ page }) => {
  await page.goto('/legacy/');
  await expect(page.locator('#Tab_0_0')).toBeVisible();
  const scripts = page.locator('script[src]');
  const sources = [];
  for (let index = 0; index < await scripts.count(); index += 1) {
    sources.push(await scripts.nth(index).getAttribute('src'));
  }
  expect(sources.some((source) => source && source.includes('data/generated'))).toBe(false);
  expect(await page.evaluate(() => typeof window.PandoraRemaked)).toBe('undefined');
});
