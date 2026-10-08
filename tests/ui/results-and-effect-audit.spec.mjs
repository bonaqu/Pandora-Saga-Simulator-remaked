import { test, expect } from '@playwright/test';

const russianResults = [
  "ОЗ",
  "ОМ",
  "Леч. зельями",
  "Леч. умениями",
  "Расход ОМ",
  "АТК",
  "АТК. спереди",
  "АТК сзади",
  "МАТК",
  "Защита",
  "Сопр. АТК спереди",
  "Сопр. АТК сзади",
  "Сопр. физ (ед.)",
  "Сопр. физ (%)",
  "Сопр. маг. урону",
  "Точность",
  "Точн. спереди",
  "Шанс крита",
  "Крит. урон",
  "Уклонение",
  "Сопр. криту",
  "Получ. крит. урон",
  "Укл. ближ. атак",
  "Укл. дальн. атак",
  "Укл. от магии",
  "Дальн. АТК ближ. боя",
  "Дальн. АТК дальн. боя",
  "Сопр. огню",
  "Скор. атаки",
  "Сопр. льду",
  "Скор. каста",
  "Сокрщ. времени каста",
  "Сопр. молнии",
  "Откат",
  "Сопр. яду",
  "Скор. движения",
  "Скор. в городе",
  "Сопр. чарам",
  "Сопр. свету",
  "Сопр. тьмы",
  "Сопр. аном. тел.",
  "Сопр. аном. дух.",
  "Сопр. магии"
];

test('all 43 result labels match the supplied RU terminology', async ({ page }) => {
  await page.goto('/?ui=ru');
  const actual = await page.evaluate(() => Array.from({ length: 43 }, (_, i) =>
    document.getElementById('TextStatus_' + i)?.textContent.trim() || ''
  ));
  expect(actual).toEqual(russianResults);
  expect(actual[12]).not.toBe(actual[13]); // flat and percent physical reduction
  expect(actual[14]).not.toBe(actual[42]); // magic damage vs magic resistance
});

test('results keep fixed single-line geometry in every language at responsive widths', async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [320, 390, 1024, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const variants = {};
    for (const locale of ['en', 'ru', 'jp', 'tw']) {
      await page.goto('/?ui=' + locale);
      variants[locale] = await page.evaluate(() => {
        const parent = document.querySelector('#StatusView');
        const origin = parent.getBoundingClientRect();
        return Array.from({ length: 43 }, (_, index) => {
          const label = document.getElementById('TextStatus_' + index);
          const pair = label.closest('[data-remaked-calculator-pair]');
          const pairBox = pair.getBoundingClientRect();
          const box = label.getBoundingClientRect();
          const style = getComputedStyle(label);
          return {
            geometry: [pairBox.x - origin.x, pairBox.y - origin.y, pairBox.width, pairBox.height]
              .map(n => Math.round(n * 10) / 10),
            name: label.textContent.trim(),
            accessible: label.getAttribute('aria-label'),
            fitsInPair: box.left >= pairBox.left - 1 && box.right <= pairBox.right + 1,
            style: [style.whiteSpace, style.overflowX, style.textOverflow, style.fontSize]
          };
        });
      });
    }
    const baseline = variants.en.map(item => item.geometry);
    for (const locale of ['en', 'ru', 'jp', 'tw']) {
      const rows = variants[locale];
      expect(rows.map(row => row.geometry), locale + ':' + width).toEqual(baseline);
      expect(rows.every(row => row.fitsInPair), locale + ':' + width).toBe(true);
      for (const row of rows) {
        expect(row.accessible, locale + ':' + width).toBe(row.name);
        expect(row.style.slice(0, 3), locale + ':' + width).toEqual(['nowrap', 'hidden', 'ellipsis']);
      }
      expect(rows.map(row => row.style[3]), locale + ':' + width).toEqual(variants.en.map(row => row.style[3]));
    }
  }
});


test('admin publication overrides Excel only for selected RU term and never changes the build', async ({ page }) => {
  await page.goto('/?ui=ru');
  const before = await page.evaluate(() => Store());
  await expect(page.locator('#TextStatus_25')).toHaveText('Дальн. АТК ближ. боя');
  const applied = await page.evaluate(() => PandoraRemaked.i18n.applyPublishedResultLabels({
    ok: true, schemaVersion: 1,
    overrides: { 'calculator.status.25': 'Дальность ближнего боя' }
  }));
  expect(applied).toBe(true);
  await expect(page.locator('#TextStatus_25')).toHaveText('Дальность ближнего боя');
  await expect(page.locator('#TextStatus_25')).toHaveAttribute('aria-label', 'Дальность ближнего боя');
  await page.evaluate(() => PandoraRemaked.i18n.setLocale('en'));
  await expect(page.locator('#TextStatus_25')).toHaveText('Melee');
  await page.evaluate(() => PandoraRemaked.i18n.setLocale('ru'));
  await expect(page.locator('#TextStatus_25')).toHaveText('Дальность ближнего боя');
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.evaluate(() => PandoraRemaked.i18n.applyPublishedResultLabels({
    ok: true, schemaVersion: 1, overrides: {}
  }));
  await expect(page.locator('#TextStatus_25')).toHaveText('Дальн. АТК ближ. боя');
});

test('malformed public labels are ignored without losing the approved workbook baseline', async ({ page }) => {
  await page.goto('/?ui=ru');
  const baseline = await page.locator('#TextStatus_13').textContent();
  const accepted = await page.evaluate(() => PandoraRemaked.i18n.applyPublishedResultLabels({
    ok: true, schemaVersion: 1,
    overrides: { 'calculator.status.43': 'Поддельный параметр' }
  }));
  expect(accepted).toBe(false);
  await expect(page.locator('#TextStatus_13')).toHaveText(baseline.trim());
});

test('all visible result and effect slots remain finite or explicit unavailable after recalc', async ({ page }) => {
  await page.goto('/?ui=ru');
  const snapshots = [];
  for (const mode of [false, true]) {
    await page.evaluate(riding => {
      Flag[7] = riding ? 1 : 0;
      CalcSet('ALL');
    }, mode);
    snapshots.push(await page.evaluate(() => {
      const result = Array.from(document.querySelectorAll('#StatusView .input_gt')).map(x => x.textContent.trim());
      const effects = Array.from(document.querySelectorAll(
        '#SkillView [id^="ViewHeal_"][id$="_1"], #SkillView [id^="ViewBuff_"][id$="_1"], #SkillView [id^="ViewBuff_"][id$="_3"], #SkillView [id^="ViewOther_"][id$="_1"], #POTView [id^="ViewPOT_"][id$="_1"]'
      )).map(x => x.textContent.trim());
      return { result, effects, attackSpeed: document.getElementById('Status_73').textContent.trim() };
    }));
  }
  for (const frame of snapshots) {
    expect(frame.result.length).toBe(43);
    expect(frame.effects.length).toBeGreaterThan(5);
    for (const value of frame.result.concat(frame.effects)) {
      expect(value).not.toMatch(/NaN|Infinity|undefined|null|---\d/i);
    }
  }
  expect(snapshots[1].attackSpeed).toBe('---');
  expect(snapshots[0].attackSpeed).toMatch(/^\d+$/);
});

test('defense inspector regeneration effects read each equipped stat modifier without throwing', async ({ page }) => {
  await page.goto('/?ui=ru');
  const actual = await page.evaluate(() => {
    const previous = Flag[2];
    const original = [12, 13].map(id => ({ id, value: EquipOpt[id] }));
    const result = {};
    try {
      Flag[2] = 4;
      for (const [id, mode, field] of [[12, 'LPRec', 'Status_12'], [13, 'MPRec', 'Status_13']]) {
        EquipOpt[id] = [];
        Calc(mode);
        const before = Number(document.getElementById(field).textContent);
        EquipOpt[id] = ['5'];
        Calc(mode);
        const after = Number(document.getElementById(field).textContent);
        result[mode] = [before, after];
      }
      return result;
    } finally {
      for (const entry of original) {
        if (entry.value === undefined) delete EquipOpt[entry.id];
        else EquipOpt[entry.id] = entry.value;
      }
      Flag[2] = previous;
      CalcSet('ALL');
    }
  });
  for (const pair of Object.values(actual)) {
    expect(pair[0]).toBeGreaterThanOrEqual(0);
    expect(pair[1] - pair[0]).toBe(5);
  }
});
