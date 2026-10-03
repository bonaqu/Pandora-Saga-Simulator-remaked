import { test, expect } from '@playwright/test';

test('the native recovery loops consume the correct option array without changing formulas or leaving an alias behind', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(() => {
    Flag[2] = 4;
    const output = [];
    for (const [name, ids] of [['LPRec', [12, 14]], ['MPRec', [13, 15]]]) {
      const original = EquipOpt;
      // A controlled valid native option fixture, not a fake public balance.
      EquipOpt = []; Calc(name); const base = document.getElementById('Status_' + ids[0]).textContent;
      EquipOpt[ids[0]] = ['2', '3']; EquipOpt[ids[1]] = ['4'];
      const fixture = EquipOpt; Calc(name);
      output.push({ name, base: Number(base), actual: Number(document.getElementById('Status_' + ids[0]).textContent), unchanged: EquipOpt === fixture,
        standing: EquipOpt[ids[0]].slice(), seated: EquipOpt[ids[1]].slice(), alias: Object.hasOwn(EquipOpt, ids.join(',')),
        unimplemented: document.getElementById('Status_' + ids[1]).textContent });
      EquipOpt = original;
    }
    return output;
  });
  for (const result of results) {
    expect(result.actual, result.name).toBe(result.base + 9); expect(result.unchanged).toBe(true);
    expect(result.standing).toEqual(['2', '3']); expect(result.seated).toEqual(['4']); expect(result.alias).toBe(false);
    expect(result.unimplemented).toBe('---');
  }
});

test('actual Silver Wand and Waist Belt calculate safely with source data restored', async ({ page }) => {
  await page.goto('/');
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const result = await page.evaluate(() => {
    function select(id, value) { const node = document.getElementById(id); if (id === 'SelJob') node.selectedIndex = value; else node.value = String(value); node.dispatchEvent(new Event('change', { bubbles: true })); }
    StatusMove('Lev', 55 - Status.Lev[0]); CalcSet('Lev');
    // The source compatibility table, not the English display name, selects
    // a real class allowed to wield this wand.
    select('SelJob', EquipData[0][12][29].slice(16, 44).indexOf(1));
    select('SelEquip_0_0', 120029);
    const equipped = Status.Equip[0][0]; Flag[2] = 4; CalcSet('ALL');
    const recovery = Number(document.getElementById('Status_13').textContent), options = EquipOpt;
    EquipOpt = []; Calc('MPRec'); const base = Number(document.getElementById('Status_13').textContent);
    EquipOpt = options; Calc('MPRec');
    const aliasAbsent = !Object.hasOwn(EquipOpt, '13,15');
    select('SelEquip_11_0', 420032); CalcSet('ALL');
    return { equipped, recovery, base, aliasAbsent, belt: Status.Equip[11][0], staminaBonus: Status.STA[2],
      originalBeltCode: EquipData[0][42][32][7], warning: PandoraRemaked.adapter.equipmentCalculationWarning(420032) };
  });
  expect(Number(result.equipped)).toBe(120029); expect(result.recovery).toBe(result.base + 1); expect(result.aliasAbsent).toBe(true);
  expect(Number(result.belt)).toBe(420032); expect(result.staminaBonus).toBe(1); expect(result.originalBeltCode).toBe('0=1_-7');
  expect(result.warning).toContain('unresolved marker -7'); expect(errors).toEqual([]);
});

test('a retained recovery renderer failure restores the exact cache and permits the next calculation', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    Flag[2] = 4; const original = EquipOpt, target = document.getElementById('Status_13');
    const fixture = []; fixture[15] = ['1']; EquipOpt = fixture;
    Object.defineProperty(target, 'innerHTML', { configurable: true, set() { throw new Error('recovery-renderer-sentinel'); } });
    let message;
    try { Calc('MPRec'); } catch (error) { message = error.message; }
    const restored = EquipOpt === fixture && !Object.hasOwn(EquipOpt, '13,15');
    delete target.innerHTML; Calc('MPRec'); const recovered = Number.isFinite(Number(target.textContent));
    EquipOpt = original; return { message, restored, recovered };
  });
  expect(result).toEqual({ message: 'recovery-renderer-sentinel', restored: true, recovered: true });
});
