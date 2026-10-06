import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { startStaticServer } from '../../scripts/lib/legacy-runtime.mjs';
import { createPublishedFixture, publishedLocaleFingerprints } from './helpers/published-fixture.mjs';

async function immutableState(page) {
  return page.evaluate(() => {
    // JSON.stringify(array) loses named properties such as Name.Race.Skill.
    const ownTree = value => value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ownTree(value[key])]))
      : value;
    return {
      data: JSON.stringify(ownTree({ Name, Skill, EquipData, SoulData, Set, Status, Flag })),
      payload: Store(), language: Flag[0],
      numbers: PandoraRemaked.adapter.readCalculatedSummary()
    };
  });
}

test('approved workbook race, class and racial-skill names decorate the calculator and summary', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => {
    const source = JSON.stringify({ race: window.Name.Race, job: window.Name.Job, racialSkill: window.Name.Race.Skill });
    window.PandoraRemakedGameTerms.ru['race.0'] = 'Проверочная раса';
    window.PandoraRemakedGameTerms.ru['job.0'] = 'Проверочный класс';
    window.PandoraRemakedGameTerms.ru['racial_skill.0.0'] = 'Проверочный расовый навык';
    return { source, payload: window.Store(), language: window.Flag[0] };
  });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.locator('#StatusRace')).toHaveText('Проверочная раса');
  await expect(page.locator('#StatusJob')).toHaveText('Проверочный класс');
  await expect(page.locator('#StatusRSkill')).toHaveText('Проверочный расовый навык');
  await expect(page.locator('[data-remaked-summary-race]')).toHaveText('Проверочная раса');
  const after = await page.evaluate(() => ({
    source: JSON.stringify({ race: window.Name.Race, job: window.Name.Job, racialSkill: window.Name.Race.Skill }),
    payload: window.Store(), language: window.Flag[0]
  }));
  expect(after).toEqual(before);
});

test('translated static actions retain handlers and compressed build behavior', async ({ page }) => {
  await page.goto('/');
  const payload = await page.evaluate(() => {
    Object.assign(PandoraRemakedGameTerms.ru, {
      'calculator.literal.create': 'Создать код', 'calculator.literal.code_load': 'Применить код',
      'calculator.literal.delete': 'Очистить код', 'calculator.literal.file_save': 'Записать',
      'calculator.literal.file_slot': 'Слот'
    });
    return Store();
  });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await page.locator('[data-remaked-builds-open]').click();
  const create = page.locator('[data-remaked-code-action="create"]');
  const load = page.locator('[data-remaked-code-action="load"]');
  await expect(create).toHaveText('Создать код');
  await expect(load).toHaveText('Применить код');
  await create.click();
  expect(await page.locator('#InCode').inputValue()).not.toBe('');
  await page.evaluate(() => {
    const race = document.getElementById('SelRace'); race.value = '1';
    race.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await load.click();
  expect(await page.evaluate(() => Store())).toBe(payload);
  await expect(page.locator('[data-remaked-tab="6"]')).toHaveCount(0);
  await expect(page.locator('#Tab_6_1 .head2').first()).toHaveText('Слот:01');
  await expect(page.locator('li[onclick="File(\'Save\',0);"] > div')).toHaveText('Записать');
  // Modern no longer exposes a second File manager. The retained API still
  // preserves old browser slots; translation anchors remain display-only.
  await page.evaluate(() => window.File('Save', 0));
  expect(await page.evaluate(() => Boolean(localStorage.file))).toBe(true);
  await page.keyboard.press('Escape');
  await page.locator('[data-remaked-ui-locale="en"]').click();
  await expect(create).toHaveText('Export current');
});

test('translated skill descriptions and units leave their numeric values unchanged', async ({ page }) => {
  await page.goto('/');
  const fixture = await page.evaluate(() => {
    Flag[3] = 1; Flag[5] = 1;
    for (let index = 0; index < Name.Skill.length; index++) {
      SkillList('Potential', index); SkillList('Adeptness', index);
    }
    SkillList('Create'); CalcSet('ALL');
    const popup = document.querySelector('[id^="LearnSkill_"]');
    const [, category, entry] = popup.id.split('_');
    Object.assign(PandoraRemakedGameTerms.ru, {
      [`skill_detail.${category}.${entry}.3`]: 'Описание из таблицы.\nВторая строка описания.',
      'calculator.learn.4': 'сек', 'calculator.skill_effect.2': 'ступень'
    });
    return { id: popup.id, seconds: popup.querySelector('ul:nth-child(3) > li:nth-child(2)').textContent,
      phase: document.getElementById('ViewBuff_3_1').textContent };
  });
  expect(fixture.seconds).toMatch(/\d+s\s*$/);
  expect(fixture.phase).toMatch(/\d+ph$/);
  const before = await immutableState(page);
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.locator(`#${fixture.id} > ul:nth-child(9) > li`)).toHaveText('Описание из таблицы.\nВторая строка описания.');
  await expect(page.locator(`#${fixture.id} > ul:nth-child(3) > li:nth-child(2)`)).toHaveText(fixture.seconds.replace(/s\s*$/, 'сек'));
  await expect(page.locator('#ViewBuff_3_1')).toHaveText(fixture.phase.replace(/ph$/, 'ступень'));
  expect(await immutableState(page)).toEqual(before);
  await page.locator('[data-remaked-ui-locale="en"]').click();
  await expect(page.locator(`#${fixture.id} > ul:nth-child(3) > li:nth-child(2)`)).toHaveText(fixture.seconds);
  await expect(page.locator('#ViewBuff_3_1')).toHaveText(fixture.phase);
  expect(await immutableState(page)).toEqual(before);
});

test('an actual edited workbook publishes calculator labels and names together', async ({ browser }) => {
  const sourceLocales = await publishedLocaleFingerprints();
  let fixture, server, context;
  try {
    fixture = await test.step('Copy isolated published artifact', () => createPublishedFixture(test.info()));
    const source = path.join(fixture.directory, 'source'), site = fixture.site;
    await test.step('Copy source workbook', async () => {
      await fs.mkdir(path.join(source, 'localization'), { recursive: true });
      for (const file of ['translations.xlsx', 'ui.en.json', 'game-terms.ru.json']) {
        await fs.copyFile(path.resolve('localization', file), path.join(source, 'localization', file));
      }
    });
    await test.step('Compile edited workbook and service worker', async () => execFileSync('python', ['-c', [
      'import pathlib, sys',
      'sys.path.insert(0, str(pathlib.Path.cwd() / "tests"))',
      'from test_translation_workbook import set_russian_cell, set_translation_cell',
      'from scripts.build_pages import _materialize_locales, _materialize_game_terms, _materialize_service_worker',
      'from scripts.translation_workbook import load_editable_catalogs',
      'root, site = map(pathlib.Path, sys.argv[1:])',
      'workbook = root / "localization/translations.xlsx"',
      'set_russian_cell(workbook, "race.0", "Имя из таблицы")',
      'set_russian_cell(workbook, "calculator.text.0", "Подпись из таблицы")',
      'set_translation_cell(workbook, "race.0", "Custom Human", "I")',
      'set_translation_cell(workbook, "equipment.0.1", "Owner\'s custom weapon", "I")',
      'set_translation_cell(workbook, "calculator.text.0", "Custom race label", "I")',
      'set_translation_cell(workbook, "header.project", "Community project", "I")',
      'catalogs = load_editable_catalogs(root)',
      '_materialize_locales(root, site, catalogs.ui_russian, catalogs.ui_japanese, catalogs.ui_traditional_chinese, catalogs.ui_english)',
      '_materialize_game_terms(site, catalogs.game_russian, catalogs.game_english)',
      '_materialize_service_worker(pathlib.Path.cwd(), site)'
    ].join('\n'), source, site], { cwd: process.cwd(), stdio: 'pipe' }));
    expect(await publishedLocaleFingerprints()).toEqual(sourceLocales);
    server = await startStaticServer(site);
    context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?ui=ru`);
    await expect(page.locator('#StatusRace')).toHaveText('Имя из таблицы');
    await expect(page.locator('#Text_0')).toHaveText('Подпись из таблицы');
    await expect(page.locator('[data-remaked-summary-race]')).toHaveText('Имя из таблицы');
    const original = await page.evaluate(() => ({
      source: JSON.stringify({ Name, EquipData, SoulData, Skill }), payload: Store(),
      jp: Name.Race[0][0], tw: Name.Race[0][2]
    }));
    await page.locator('[data-remaked-ui-locale="en"]').click();
    await expect(page.locator('#StatusRace')).toHaveText('Custom Human');
    await expect(page.locator('#Text_0')).toHaveText('Custom race label');
    await expect(page.locator('[data-remaked-i18n="header.project"]')).toHaveText('Community project');
    expect(await page.evaluate(() => PandoraRemaked.i18n.game('equipment.0.1', 'fallback'))).toBe("Owner's custom weapon");
    await page.locator('[data-remaked-language="0"]').click();
    await expect(page.locator('#StatusRace')).toHaveText(original.jp);
    await page.locator('[data-remaked-language="2"]').click();
    await expect(page.locator('#StatusRace')).toHaveText(original.tw);
    await page.locator('[data-remaked-ui-locale="ru"]').click();
    await expect(page.locator('#StatusRace')).toHaveText('Имя из таблицы');
    expect(await page.evaluate(() => PandoraRemaked.i18n.game('equipment.0.1', 'fallback'))).toBe("Owner's custom weapon");
    expect(await page.evaluate(() => ({ source: JSON.stringify({ Name, EquipData, SoulData, Skill }), payload: Store() })))
      .toEqual({ source: original.source, payload: original.payload });
    expect(errors).toEqual([]);
  } finally {
    await context?.close();
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await fixture?.cleanup();
  }
});

test('inherited labels, qualified effects, hints and implicit option values decorate without changing inputs', async ({ page }) => {
  await page.goto('/');
  const original = await page.evaluate(() => {
    Object.assign(PandoraRemakedGameTerms.ru, {
      'calculator.text.0': 'Раса персонажа', 'calculator.tab.0': 'Профессия',
      'calculator.potion.0': 'Лечебное мясо', 'calculator.qualified_buff.5': 'Чары: магическая атака',
      'calculator.gem.1.0': 'Без камня', 'calculator.attack.0.hint': 'Урон животным'
    });
    const gem = document.querySelector('#SelGem select option');
    return { value: gem.value, title: document.querySelector('#TextATK_0 [title]').title };
  });
  const before = await immutableState(page);
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.locator('#Text_0')).toHaveText('Раса персонажа');
  await expect(page.locator('[data-remaked-tab="0"]')).toHaveText('Профессия');
  await expect(page.locator('#ViewPOT_0_0')).toHaveText('Лечебное мясо');
  await expect(page.locator('#ViewBuff_5_0')).toHaveText('Чары: магическая атака');
  await expect(page.locator('#TextATK_0 [title]')).toHaveAttribute('title', 'Урон животным');
  await expect(page.locator('#SelGem select option').first()).toHaveText('Без камня');
  expect(await page.locator('#SelGem select option').first().evaluate(node => node.value)).toBe(original.value);
  expect(await immutableState(page)).toEqual(before);
  await page.locator('[data-remaked-ui-locale="en"]').click();
  await expect(page.locator('#TextATK_0 [title]')).toHaveAttribute('title', original.title);
  expect(await page.locator('#SelGem select option').first().evaluate(node => node.value)).toBe(original.value);
  expect(await immutableState(page)).toEqual(before);
});

test('requested Russian calculator labels, skill groups and effect hints render from the workbook', async ({ page }) => {
  await page.goto('/');
  const before = await immutableState(page);
  await page.locator('[data-remaked-ui-locale="ru"]').click();

  await expect(page.locator('#Text_10')).toHaveText('ВЫН');
  await expect(page.locator('#Text_15')).toHaveText('ИНТ');
  await expect(page.locator('#TextStatus_0')).toHaveText('ОЗ');
  await expect(page.locator('#TextStatus_3')).toHaveText('% исцел ОЗ');
  await expect(page.locator('#TextStatus_3 [title]')).toHaveAttribute('title', '% исцеленного ОЗ');
  await expect(page.locator('#TextStatus_25')).toHaveText('Дист ближ АТК');
  await expect(page.locator('#TextStatus_25 [title]')).toHaveAttribute('title', 'Дальность атак ближнего боя');
  await expect(page.locator('#TextStatus_26')).toHaveText('Дист дальн АТК');
  await expect(page.locator('#TextStatus_26 [title]')).toHaveAttribute('title', 'Дальность атак дальнего боя');

  await expect(page.locator('#TextSkill_0')).toHaveText('Ближний бой');
  await expect(page.locator('#TextSkill_13')).toHaveText('Исцеление');
  await expect(page.locator('#TextSkill_24')).toHaveText('Верховая езда');

  await expect(page.locator('#ViewBuff_5_0')).toHaveText('Усил МАТК');
  await expect(page.locator('#ViewBuff_5_0 [title]')).toHaveAttribute('title', 'Усиление урона магией');
  await expect(page.locator('#ViewBuff_6_0')).toHaveText('Усил АУР');
  await expect(page.locator('#ViewBuff_6_0 [title]')).toHaveAttribute('title', 'Усиление урона аурой');
  await expect(page.locator('#ViewBuff_9_0')).toHaveText('ПЕСН МАТК');
  await expect(page.locator('#ViewBuff_9_0 [title]')).toHaveAttribute('title', 'Усиление урона магией');
  await expect(page.locator('#ViewBuff_10_0')).toHaveText('ПЕСН Откат');
  await expect(page.locator('#ViewBuff_10_0 [title]')).toHaveAttribute('title', 'Ускорение перезарядки умений');

  expect(await immutableState(page)).toEqual(before);
});

test('a hint-only translation restores its source on leaving RU', async ({ page }) => {
  await page.goto('/');
  const original = await page.locator('#TextATK_0 [title]').getAttribute('title');
  await page.evaluate(() => { PandoraRemakedGameTerms.ru['calculator.attack.0.hint'] = 'Только подсказка'; });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.locator('#TextATK_0 [title]')).toHaveAttribute('title', 'Только подсказка');
  await page.locator('[data-remaked-ui-locale="en"]').click();
  await expect(page.locator('#TextATK_0 [title]')).toHaveAttribute('title', original);
});

test('localized Legacy help keeps keyboard focus through numeric redraw and EN restoration', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { PandoraRemakedGameTerms.ru['calculator.attack.0'] = 'Урон животным'; });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await page.locator('[data-remaked-tab="2"]').click();
  const help = page.locator('#TextATK_0 .help');
  // Simulate another Modern decorator: translation must preserve its DOM node.
  await help.evaluate(node => { node.tabIndex = 0; });
  await help.focus();
  await page.evaluate(() => {
    window.__translationFocusFixture = document.activeElement;
    CalcSet('ALL');
  });
  await expect(page.locator('#TextATK_0')).toHaveText('Урон животным');
  await page.waitForTimeout(100); // Allow the coalesced display observer to run.
  expect(await page.evaluate(() => document.activeElement === window.__translationFocusFixture && window.__translationFocusFixture.isConnected)).toBe(true);
  await page.evaluate(() => PandoraRemaked.i18n.setLocale('en'));
  expect(await page.evaluate(() => document.activeElement === window.__translationFocusFixture && window.__translationFocusFixture.isConnected)).toBe(true);
});

test('compare projection reads translated metadata synchronously and restores the original build', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { PandoraRemakedGameTerms.ru['race.0'] = 'Переведённая раса'; });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  const result = await page.evaluate(() => {
    const payload = Store();
    const projection = PandoraRemaked.adapter.evaluateBuild(payload);
    return { name: projection.metadata.race, restored: Store() === payload };
  });
  expect(result).toEqual({ name: 'Переведённая раса', restored: true });
});

test('game display does not mutate any Legacy data, calculation or serialized input', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => Object.assign(PandoraRemakedGameTerms.ru, {
    'race.0': '<img src=x onerror=alert(1)>', 'job.0': 'Класс', 'skill.1': 'Навык',
    'equipment.0.1': 'Предмет', 'soul.1': 'Камень'
  }));
  const before = await immutableState(page);
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.locator('#StatusRace')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#StatusRace img')).toHaveCount(0);
  expect(await immutableState(page)).toEqual(before);
  await page.locator('[data-remaked-ui-locale="en"]').click();
  await expect(page.locator('#StatusRace')).toHaveText('Human');
  expect(await immutableState(page)).toEqual(before);
});

test('native equipment and Soul options translate by value, retain prefixes and restore all source languages', async ({ page }) => {
  await page.goto('/');
  const fixture = await page.evaluate(() => {
    const item = [...document.querySelectorAll('#SelEquip_0_0 option')].find(option => Number(option.value) % 10000 !== 0);
    const soul = [...document.querySelectorAll('select[id^="SelEquip_"][id$="_4"] option')].find(option => Number(option.value) > 0);
    const category = Math.floor(Number(item.value) / 10000), index = Number(item.value) % 10000;
    PandoraRemakedGameTerms.ru[`equipment.${category}.${index}`] = 'Проверочное оружие';
    PandoraRemakedGameTerms.ru[`soul.${soul.value}`] = 'Проверочный камень';
    return { value: item.value, category, index, soulValue: soul.value, soulSelect: soul.parentElement.id, prefix: item.textContent.match(/^Lv:\s*\d+ /)[0] };
  });
  const item = page.locator(`#SelEquip_0_0 option[value="${fixture.value}"]`);
  const soul = page.locator(`#${fixture.soulSelect} option[value="${fixture.soulValue}"]`);
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(item).toHaveText(fixture.prefix + 'Проверочное оружие');
  await expect(soul).toHaveText('Проверочный камень');
  for (const language of [0, 2, 1]) {
    await page.locator(`[data-remaked-language="${language}"]`).click();
    const source = await page.evaluate(({ category, index, soulValue }) => ({ item: EquipData[Flag[0]][category][index][0], soul: SoulData[Flag[0]][soulValue][0] }), fixture);
    // Unified control now selects both the retained game source language and
    // the matching Modern shell locale, with English fallback where JP/TW is blank.
    expect(await page.evaluate(() => PandoraRemaked.i18n.getLocale())).toBe(['jp', 'en', 'tw'][language]);
    await expect(item).toHaveText(fixture.prefix + source.item);
    await expect(soul).toHaveText(source.soul);
    await page.locator('[data-remaked-ui-locale="ru"]').click();
    expect(await page.evaluate(() => Flag[0])).toBe(1);
    await expect(item).toHaveText(fixture.prefix + 'Проверочное оружие');
    await expect(soul).toHaveText('Проверочный камень');
  }
});

test('selected names survive redraw, race changes and build load; blank cells retain source labels', async ({ page }) => {
  await page.goto('/');
  const payload = await page.evaluate(() => {
    Object.assign(PandoraRemakedGameTerms.ru, {
      'race.0': 'Человек', 'race.1': 'Эльф', 'racial_skill.1.0': 'Лесной навык', 'skill.1': 'Рубящий навык'
    });
    return Store();
  });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.locator('#TextSkill_1')).toHaveText('Рубящий навык');
  await page.evaluate(() => {
    const select = document.getElementById('SelRace');
    select.value = '1'; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#StatusRace')).toHaveText('Эльф');
  await expect(page.locator('#StatusRSkill')).toHaveText('Лесной навык');
  await expect(page.locator('#StatusJob')).toHaveText('Warrior');
  await page.evaluate(build => PandoraRemaked.adapter.load(build), payload);
  await expect(page.locator('#StatusRace')).toHaveText('Человек');
  await expect(page.locator('#SelRace')).toHaveValue('0');
  expect(await page.evaluate(() => Store())).toBe(payload);
});

test('individual learned skills and healing names use the same stable term', async ({ page }) => {
  await page.goto('/');
  const fixture = await page.evaluate(() => {
    Flag[3] = 1;
    for (let index = 0; index < Name.Skill.length; index++) {
      SkillList('Potential', index); SkillList('Adeptness', index);
    }
    SkillList('Create');
    const popup = document.querySelector('[id^="LearnSkill_"]');
    const [, category, entry] = popup.id.split('_');
    PandoraRemakedGameTerms.ru[`skill_entry.${category}.${entry}`] = 'Проверочный выученный навык';
    PandoraRemakedGameTerms.ru['skill_entry.13.5'] = 'Проверочное лечение';
    return { id: popup.id, source: Skill[Flag[0]][category][entry][0] };
  });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  const name = page.locator(`#${fixture.id} > ul:first-child > li`);
  await expect(name).toHaveText('Проверочный выученный навык');
  await expect(page.locator('#ViewHeal_0_0')).toHaveText('Проверочное лечение');
  await page.locator('[data-remaked-ui-locale="en"]').click();
  await expect(name).toHaveText(fixture.source);
});
