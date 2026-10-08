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

test('result rows preserve shared compact geometry without truncated labels', async ({ page }) => {
  for (const width of [1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const variants = {};
    for (const lang of ['en', 'ru', 'jp', 'tw']) {
      await page.goto('/?ui=' + lang);
      variants[lang] = await page.evaluate(() => {
        const parent = document.querySelector('#StatusView');
        const origin = parent.getBoundingClientRect();
        return Array.from({ length: 43 }, (_, index) => {
          const label = document.getElementById('TextStatus_' + index);
          const pair = label.closest('[data-remaked-calculator-pair]');
          const value = pair.querySelector('.input_gt');
          const box = pair.getBoundingClientRect();
          const textBox = document.createRange();
          textBox.selectNodeContents(label);
          const textRight = textBox.getBoundingClientRect().right;
          return {
            id: index,
            geometry: [box.x - origin.x, box.y - origin.y, box.width, box.height].map(n => Math.round(n * 10) / 10),
            textFits: label.scrollWidth <= label.clientWidth + 1 &&
              textRight <= value.getBoundingClientRect().left + 1,
            label: label.textContent.trim()
          };
        });
      });
    }
    const reference = variants.en.map(item => item.geometry);
    for (const lang of ['en', 'ru', 'jp', 'tw']) {
      expect(variants[lang].map(item => item.geometry), lang + ':' + width).toEqual(reference);
      expect(variants[lang].filter(item => !item.textFits), lang + ':' + width).toEqual([]);
    }
  }
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
