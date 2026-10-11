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
          const value = pair.querySelector('.input_gt').getBoundingClientRect();
          const textNode = label.querySelector('.help') || label;
          const textRange = document.createRange();
          textRange.selectNodeContents(textNode);
          const textBox = textRange.getBoundingClientRect();
          const style = getComputedStyle(label);
          const textStyle = getComputedStyle(textNode);
          return {
            geometry: [pairBox.x - origin.x, pairBox.y - origin.y, pairBox.width, pairBox.height]
              .map(n => Math.round(n * 10) / 10),
            name: label.textContent.trim(),
            accessible: label.getAttribute('aria-label'),
            fitsInPair: box.left >= pairBox.left - 1 && box.right <= pairBox.right + 1,
            fullTextFits: textBox.left >= pairBox.left - 1 &&
              textBox.right <= value.left - 1 &&
              textBox.top >= pairBox.top - 1 &&
              textBox.bottom <= pairBox.bottom + 1,
            style: [style.whiteSpace, style.overflowX, style.textOverflow, style.fontSize,
              textStyle.whiteSpace, textStyle.textOverflow]
          };
        });
      });
    }
    const baseline = variants.en.map(item => item.geometry);
    for (const locale of ['en', 'ru', 'jp', 'tw']) {
      const rows = variants[locale];
      expect(rows.map(row => row.geometry), locale + ':' + width).toEqual(baseline);
      expect(rows.every(row => row.fitsInPair && row.fullTextFits),
        locale + ':' + width + ':' + JSON.stringify(rows.filter(row => !row.fullTextFits || !row.fitsInPair)))
        .toBe(true);
      for (const row of rows) {
        expect(row.accessible, locale + ':' + width).toBe(row.name);
        expect(row.style.slice(0, 3), locale + ':' + width).toEqual(['nowrap', 'visible', 'clip']);
        expect(row.style.slice(4), locale + ':' + width).toEqual(['nowrap', 'clip']);
      }
      expect(rows.map(row => row.style[3]), locale + ':' + width).toEqual(variants.en.map(row => row.style[3]));
    }
  }
});


test('desktop results remain compact and all skill headings fit one line across languages', async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [1366, 1440, 1600, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    let baseline;
    for (const locale of ['ru', 'en', 'jp', 'tw']) {
      await page.goto('/?ui=' + locale);
      const layout = await page.evaluate(() => {
        const rect = node => {
          const r = node.getBoundingClientRect();
          return { x: r.left, y: r.top, width: r.width, height: r.height, right: r.right };
        };
        const panels = [...document.querySelectorAll('[data-remaked-calculator-columns] > :is([data-remaked-calculator-character], #SkillSet, [data-remaked-calculator-effects])')]
          .map(node => rect(node));
        const heads = [...document.querySelectorAll('[data-remaked-skill-column-header] > span')].map(node => {
          const textRange = document.createRange(); textRange.selectNodeContents(node);
          const lineRects = [...textRange.getClientRects()].filter(box => box.width > 0 && box.height > 0);
          const bounds = rect(node);
          return { text: node.textContent.trim(), bounds, lines: lineRects.length,
            overflow: lineRects.some(box => box.left < bounds.x - 1 || box.right > bounds.right + 1) };
        });
        const track = Array.from({ length: 43 }, (_, id) => {
          const label = document.getElementById('TextStatus_' + id);
          const pair = label.closest('[data-remaked-calculator-pair]');
          const numeric = pair.querySelector('.input_gt');
          const range = document.createRange(); range.selectNodeContents(label);
          const text = range.getBoundingClientRect();
          return { column: id % 3, text: label.textContent.trim(), pair: rect(pair),
            textRight: text.right, valueLeft: rect(numeric).x };
        });
        return { panels, heads, track, scrollWidth: document.documentElement.scrollWidth };
      });
      expect(layout.scrollWidth, locale + ':' + width).toBeLessThanOrEqual(width + 1);
      expect(layout.panels).toHaveLength(3);
      expect(layout.panels[1].width, locale + ':' + width).toBeGreaterThanOrEqual(490);
      expect(layout.panels[1].y, locale + ':' + width).toBe(layout.panels[0].y);
      expect(layout.panels[2].y, locale + ':' + width).toBe(layout.panels[0].y);
      expect(layout.heads).toHaveLength(6);
      expect(layout.heads.filter(h => h.lines !== 1 || h.overflow),
        locale + ':' + width + ': ' + JSON.stringify(layout.heads)).toEqual([]);
      expect(layout.track.filter(r => r.textRight > r.valueLeft - 1),
        locale + ':' + width).toEqual([]);
      if (!baseline) baseline = layout.panels.map(({ x, y, width, height }) => [x, y, width]);
      else expect(layout.panels.map(({ x, y, width }) => [x, y, width]), locale + ':' + width).toEqual(baseline);
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


test('Providence grants 25 magic resistance and recomputes idempotently with worn item',async({page})=>{
  await page.goto('/?ui=ru');
  const values=await page.evaluate(()=>{
    Flag[7]=0;
    Flag['0_8']=0;
    CalcSet('ALL');
    const read=()=>Number(document.getElementById('Status_145').textContent.replace(/,/g,'').trim());
    const initial=read();
    if(!Number.isFinite(initial))throw Error('Magic resistance baseline is not numeric');
    Flag['0_8']=1;
    CalcSet('ALL');
    const buffed=read();
    CalcSet('ALL');const repeated=read();
    Flag['0_8']=0;
    CalcSet('ALL');const restored=read();
    const equipOk=PandoraRemaked.adapter.selectEquipment(3,310015);
    const robe=read();
    Flag['0_8']=1;CalcSet('ALL');const combined=read();
    Flag['0_8']=0;
    PandoraRemaked.adapter.selectEquipment(3,0);
    CalcSet('ALL');
    return {initial,buffed,repeated,restored,equipOk,robe,combined,reset:read()};
  });
  expect(values.buffed-values.initial).toBe(25);
  expect(values.repeated).toBe(values.buffed);
  expect(values.restored).toBe(values.initial);
  expect(values.equipOk).toBe(true);
  expect(values.robe-values.initial).toBe(3);
  expect(values.combined-values.initial).toBe(28);
  expect(values.reset).toBe(values.initial);
});

test('real torso equipment and Lapis Medio increase DEF, while mount mode explicitly hides it',async({page})=>{
  await page.goto('/?ui=ru');
  const values=await page.evaluate(()=>{
    Flag[7]=0;Flag['14_4']=0;
    CalcSet('ALL');
    const display=()=>document.getElementById('Status_49').textContent.trim();
    const read=()=>Number(display().replace(/,/g,''));
    const initial=read();
    const equipped=PandoraRemaked.adapter.selectEquipment(3,310015);
    const robe=read();
    Flag['14_4']=1;CalcSet('ALL');
    const buffed=read();
    Flag[7]=1;CalcSet('ALL');
    const mounted=display();
    Flag[7]=0;Flag['14_4']=0;
    PandoraRemaked.adapter.selectEquipment(3,0);
    CalcSet('ALL');
    return {initial,equipped,robe,buffed,mounted,restored:read()};
  });
  expect(values.equipped).toBe(true);
  expect(values.robe-values.initial).toBe(8);
  expect(values.buffed).toBeGreaterThan(values.robe);
  expect(values.mounted).toBe('---');
  expect(values.restored).toBe(values.initial);
});


test('Modern melee and ranged base reach use current-server weapon values without breaking saved builds',async({page})=>{
  await page.goto('/?ui=ru');
  const result=await page.evaluate(()=>{
    const initial=Store();
    const output=index=>document.getElementById('Status_'+index).textContent.trim();
    const snapshot=()=>({melee:output(40),ranged:output(41)});
    Calc('RangeMelee');Calc('RangeRange');
    const unarmed=snapshot();
    const swordEquipped=PandoraRemaked.adapter.selectEquipment(0,10);
    Calc('RangeMelee');Calc('RangeRange');
    const sword=snapshot();
    const bowEquipped=PandoraRemaked.adapter.selectEquipment(0,80003);
    Calc('RangeMelee');Calc('RangeRange');
    const bow=snapshot();
    const wandEquipped=PandoraRemaked.adapter.selectEquipment(0,120002);
    Calc('RangeMelee');Calc('RangeRange');
    const wand=snapshot();
    const equippedReset=PandoraRemaked.adapter.selectEquipment(0,0);
    Calc('RangeMelee');Calc('RangeRange');
    const reset=snapshot();
    return {initial,unarmed,swordEquipped,sword,bowEquipped,bow,wandEquipped,wand,equippedReset,reset};
  });
  expect(result.swordEquipped).toBe(true);
  expect(result.bowEquipped).toBe(true);
  expect(result.equippedReset).toBe(true);
  expect(result.sword.melee).toBe('115');
  expect(result.sword.ranged).toBe('---');
  expect(result.wandEquipped).toBe(true);
  expect(result.wand.melee).toBe('100');
  expect(result.wand.ranged).toBe('---');
  expect(result.bow.melee).toBe('---');
  expect(result.bow.ranged).toBe('2800');
  expect(result.unarmed.melee).toBe('---');
  expect(result.unarmed.ranged).toBe('---');
  expect(result.reset).toEqual(result.unarmed);
  expect(await page.evaluate(()=>Store())).toBe(result.initial);
});

test('Modern reach fails closed if canonical engine identity changed (no invented weapon range)',async({page})=>{
  await page.goto('/?ui=en');
  const result=await page.evaluate(()=>{
    if(!PandoraRemaked.adapter.selectEquipment(0,10))throw Error('Cannot equip Crystal Sword fixture');
    const jp=EquipData[0][0][10];
    const original=jp[0];const output=document.getElementById('Status_40');
    try {
      Calc('RangeMelee');const known=output.textContent;
      jp[0]='UNVERIFIED DIFFERENT ITEM';
      Calc('RangeMelee');const changed=output.textContent;
      return {known,changed};
    } finally {
      jp[0]=original;
      PandoraRemaked.adapter.selectEquipment(0,0);
      Calc('RangeMelee');
    }
  });
  expect(result.known).toBe('115');
  expect(result.changed).toBe('---');
});


test('clicking real Enhancement buttons recalculates Providence magic resistance and Lapis defense',async({page})=>{
  await page.goto('/?ui=ru');
  await page.evaluate(()=>{
    if(Flag['0_8']||Flag['14_4'])throw Error('Unexpected non-default buff state');
    Flag[7]=0;
    CalcSet('ALL');
  });
  const getValue=id=>page.locator('#Status_'+id).evaluate(node=>Number(node.textContent.replace(/,/g,'').trim()));
  const initialMagic=await getValue(145),initialDef=await getValue(49);
  expect(Number.isFinite(initialMagic)&&Number.isFinite(initialDef)).toBe(true);
  await page.locator('[data-remaked-tab="4"]').click();
  const providence=page.locator('#Buff_0_8');
  const lapis=page.locator('#Buff_14_4');
  await expect(providence).toBeVisible();
  await expect(lapis).toBeVisible();
  await expect(page.locator('#Buff_0_8 [data-remaked-buff]')).toContainText('Божественное благословление');
  await providence.click();
  await expect(providence).toHaveClass(/btn2_on/);
  await expect.poll(()=>getValue(145)).toBe(initialMagic+25);
  await page.evaluate(()=>CalcSet('ALL'));
  await expect.poll(()=>getValue(145)).toBe(initialMagic+25);
  await lapis.click();
  await expect(lapis).toHaveClass(/btn2_on/);
  const boostedDef=await getValue(49);
  expect(boostedDef).toBeGreaterThan(initialDef);
  const equipped=await page.evaluate(()=>PandoraRemaked.adapter.selectEquipment(3,310015));
  expect(equipped).toBe(true);
  await expect.poll(()=>getValue(145)).toBe(initialMagic+28);
  await expect.poll(()=>getValue(49)).toBe(boostedDef+8);
  await providence.click();
  await expect(providence).toHaveClass(/btn2_off/);
  await expect.poll(()=>getValue(145)).toBe(initialMagic+3);
  await lapis.click();
  await expect(lapis).toHaveClass(/btn2_off/);
  await expect.poll(()=>getValue(49)).toBe(initialDef+8);
  await page.evaluate(()=>{
    if(!PandoraRemaked.adapter.selectEquipment(3,0))throw Error('Unable to unequip test robe');
    CalcSet('ALL');
  });
  await expect.poll(()=>getValue(145)).toBe(initialMagic);
  await expect.poll(()=>getValue(49)).toBe(initialDef);
});


test('riding explains intentionally unavailable DEF without changing equipment, buff state or numeric calculation',async({page})=>{
  await page.goto('/?ui=ru');
  await page.evaluate(()=>{
    Flag[7]=0;Flag['14_4']=0;
    CalcSet('ALL');PandoraRemaked.calculatorControls.refresh();
  });
  const note=page.locator('[data-remaked-mounted-defense-note]');
  await expect(note).toHaveCount(1);
  await expect(note).toBeHidden();
  const baseline=await page.evaluate(()=>Number(document.querySelector('#Status_49').textContent));
  expect(Number.isFinite(baseline)).toBe(true);
  const after=await page.evaluate(()=>{
    if(!PandoraRemaked.adapter.selectEquipment(3,310015))throw Error('Linen Robe fixture unavailable');
    Flag['14_4']=1;CalcSet('ALL');
    return {def:Number(document.querySelector('#Status_49').textContent),build:Store()};
  });
  expect(after.def).toBeGreaterThanOrEqual(baseline+13);
  await page.evaluate(()=>{
    Flag[7]=1;CalcSet('ALL');PandoraRemaked.calculatorControls.refresh();
  });
  await expect(page.locator('#Status_49')).toHaveText('---');
  await expect(note).toBeVisible();
  for(const [locale,fragment] of [
    ['ru','исходный калькулятор скрывает защиту'],
    ['en','the retained calculator hides DEF'],
    ['jp','防御力を「---」と表示'],
    ['tw','防禦力顯示為']
  ]){
    await page.evaluate(locale=>PandoraRemaked.i18n.setLocale(locale),locale);
    await expect(note).toContainText(fragment);
    await page.setViewportSize({width:390,height:850});
    expect(await note.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);
    await page.setViewportSize({width:1440,height:900});
  }
  expect(await page.evaluate(()=>Store())).toBe(after.build);
  await page.evaluate(()=>{
    Flag[7]=0;CalcSet('ALL');PandoraRemaked.calculatorControls.refresh();
  });
  await expect(note).toBeHidden();
  await expect(page.locator('#Status_49')).toHaveText(String(after.def));
  expect(await page.evaluate(()=>Store())).toBe(after.build);
});

test('regular unmounted results must not mask DEF or Magic Resistance with an unavailable marker',async({page})=>{
  await page.goto('/?ui=ru');
  const out=await page.evaluate(()=>{
    Flag[7]=0;Flag['0_8']=0;Flag['14_4']=0;
    CalcSet('ALL');
    const ids=[18,42,49,60,70,138,139,140,141,142,143,144,145];
    const read=()=>Object.fromEntries(ids.map(id=>[id,document.getElementById('Status_'+id)?.textContent.trim()]));
    const empty=read();
    Flag['0_8']=1;Flag['14_4']=1;CalcSet('ALL');
    const buffed=read();
    CalcSet('ALL');
    const repeated=read();
    Flag['0_8']=0;Flag['14_4']=0;CalcSet('ALL');
    return {empty,buffed,repeated,restored:read()};
  });
  for(const result of Object.values(out))for(const [id,value] of Object.entries(result)){
    expect(value,'Status_'+id).toMatch(/^-?\d+(?:[.,]\d+)?%?$/);
  }
  expect(out.buffed).toEqual(out.repeated);
  expect(out.empty).toEqual(out.restored);
  expect(Number(out.buffed[145])-Number(out.empty[145])).toBe(25);
  expect(Number(out.buffed[49])).toBeGreaterThan(Number(out.empty[49]));
});
