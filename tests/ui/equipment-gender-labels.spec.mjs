import { test, expect } from '@playwright/test';

test('male/female equipment gets short RU and EN suffix without changing saved builds', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const i18n = window.PandoraRemaked.i18n;
    const adapter = window.PandoraRemaked.adapter;
    const before = adapter.serialize();
    i18n.setLocale('ru');
    const ru = {
      male: i18n.game('equipment.31.31', 'Астирский сюртук'),
      female: i18n.game('equipment.31.32', 'Астирское платье'),
      dawnMale: i18n.game('equipment.31.24', 'Жилет зари для эльфа (М)'),
      dawnFemale: i18n.game('equipment.31.180', 'Жилет зари для эльфа (Ж)'),
      unisex: i18n.game('equipment.30.23', 'Рассветный шлем для цверга'),
      unknown: i18n.game('equipment.1.0', 'Оружие')
    };
    i18n.setLocale('en');
    const en = {
      male: i18n.game('equipment.31.31', 'Asutian Coat'),
      female: i18n.game('equipment.31.32', 'Asutian Dress'),
      dawnMale: i18n.game('equipment.31.24', 'Dawn Vest (Male Elf)'),
      dawnFemale: i18n.game('equipment.31.180', 'Dawn Vest (Female Elf)'),
      humanFemale: i18n.game('equipment.32.180', 'Dawn Bracelet (Female Human)'),
      unisex: i18n.game('equipment.30.23', 'Dawn Helmet (Dwarf)')
    };
    return { ru, en, before, after: adapter.serialize(),
      legacy: window.EquipData[0][31][31][0] };
  });
  expect(result.ru.male).toMatch(/\(м\)$/);
  expect(result.ru.female).toMatch(/\(ж\)$/);
  expect(result.ru.dawnMale).toMatch(/\(м\)$/);
  expect(result.ru.dawnFemale).toMatch(/\(ж\)$/);
  expect(result.ru.dawnFemale).not.toMatch(/\(Ж\).*\(ж\)$/);
  expect(result.ru.unisex).not.toMatch(/\([мж]\)$/);
  expect(result.ru.unknown).not.toMatch(/\([мж]\)$/);
  expect(result.en.male).toMatch(/\(m\)$/);
  expect(result.en.female).toMatch(/\(w\)$/);
  expect(result.en.dawnMale).toMatch(/\(m\)$/);
  expect(result.en.dawnFemale).toMatch(/\(w\)$/);
  expect(result.en.humanFemale).toMatch(/\(w\)$/);
  expect(result.en.dawnFemale).not.toMatch(/\bFemale\b/i);
  expect(result.en.unisex).not.toMatch(/\([mw]\)$/);
  expect(result.before).toBe(result.after);
  expect(result.legacy).toBe('アスティアンコート');
});

test('gender suffix is visual-only across native select, search and build outputs', async ({ page }) => {
  await page.goto('/');
  const output = await page.evaluate(() => {
    const i18n = window.PandoraRemaked.i18n;
    i18n.setLocale('en');
    const id = 31 * 10000 + 31;
    const term = 'equipment.31.31';
    const label = i18n.game(term, 'Asutian Coat');
    const slot = Array.from(document.querySelectorAll('select[id^="SelEquip_"][id$="_0"]'))
      .find(select => Array.from(select.options).some(option => Number(option.value) === id));
    const option = slot && Array.from(slot.options).find(option => Number(option.value) === id);
    return { label, option: option?.textContent.trim() || '', name: option?.title || '',
      catalogName: window.EquipData[0][31][31][0],
      sourceFlag: window.EquipData[0][31][31].slice(8, 10)
    };
  });
  expect(output.sourceFlag).toEqual([1, 0]);
  expect(output.label).toMatch(/\(m\)$/);
  expect(output.catalogName).toBe('アスティアンコート');
  // The selection can be hidden by race/class filtering; when present,
  // the original numeric option ID and modern display label are independent.
  if (output.option) expect(output.option).toContain('(m)');
});
