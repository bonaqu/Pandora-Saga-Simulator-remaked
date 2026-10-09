import { test, expect } from '@playwright/test';

async function russianText(page, key, values = {}) {
  return page.evaluate(({ key, values }) => {
    const catalogs = window.PandoraRemakedLocales;
    const text = catalogs.ru[key] || catalogs.en[key];
    return text.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) => name in values ? String(values[name]) : match);
  }, { key, values });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
});

test('English is the default language in the unified Modern control', async ({ page }) => {
  const ui = page.locator('[data-remaked-ui-locale]');
  const data = page.locator('[data-remaked-language]');

  await expect(ui).toHaveCount(4);
  await expect(data).toHaveCount(3);
  await expect(ui.filter({ hasText: 'EN' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-remaked-hero]')).toContainText('Character Builder');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => window.Flag[0])).toBe(1);
});

test('RU translates the Modern shell live without changing Legacy build bytes or data language', async ({ page }) => {
  const before = await page.evaluate(() => ({ payload: window.Store(), language: window.Flag[0] }));
  await page.locator('[data-remaked-ui-locale="ru"]').click();

  await expect(page.locator('[data-remaked-header]')).toContainText(await russianText(page, 'header.project'));
  await expect(page.locator('[data-remaked-hero]')).toContainText(await russianText(page, 'hero.eyebrow'));
  await expect(page.locator('[data-remaked-tools]')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('[data-remaked-ui-locale="ru"]')).toHaveAttribute('aria-pressed', 'true');

  const after = await page.evaluate(() => ({
    payload: window.Store(),
    language: window.Flag[0],
    savedLocale: localStorage.getItem('pandora.remaked.uiLocale.v1')
  }));
  expect(after.payload).toBe(before.payload);
  expect(after.language).toBe(before.language);
  expect(after.savedLocale).toBe('ru');
});

test('saved RU locale survives reload and missing strings fall back to English', async ({ page }) => {
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await page.reload();
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
  await expect(page.locator('[data-remaked-hero]')).toContainText(await russianText(page, 'hero.eyebrow'));
  const fallback = await page.evaluate(() => {
    window.PandoraRemakedLocales.en['fixture.missingRussian'] = 'English fallback sentinel';
    return window.PandoraRemaked.i18n.t('fixture.missingRussian');
  });
  expect(fallback).toBe('English fallback sentinel');
});

test('unknown locale is rejected to English without breaking storage', async ({ page }) => {
  const result = await page.evaluate(() => {
    localStorage.setItem('pandora.remaked.uiLocale.v1', 'xx');
    return window.PandoraRemaked.i18n.setLocale('xx');
  });
  expect(result).toBe('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-remaked-header]')).toContainText('Project');
});

test('RU covers Modern surfaces and approved race names while unapproved classes and build bytes stay unchanged', async ({ page }) => {
  const raceBefore = await page.locator('[data-remaked-summary-race]').textContent();
  const classBefore = await page.locator('#StatusJob').textContent();
  const payloadBefore = await page.evaluate(() => Store());
  await page.locator('[data-remaked-ui-locale="ru"]').click();

  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();
  await expect(page.locator('[data-remaked-search-query]')).toHaveAttribute('placeholder', await russianText(page, 'search.equipment.placeholder'));
  await page.getByRole('button', { name: await russianText(page, 'search.close'), exact: true }).click();

  await page.locator('[data-remaked-builds-open]').click();
  await expect(page.locator('[data-remaked-build-manager]')).toContainText(await russianText(page, 'builds.managerTitle'));
  await page.getByRole('button', { name: await russianText(page, 'builds.close'), exact: true }).click();

  await expect(page.locator('[data-remaked-compare-open]')).toHaveText(await russianText(page, 'compare.button'));
  await page.locator('[data-remaked-compare-open]').click();
  await expect(page.locator('[data-remaked-compare]')).toContainText(await russianText(page, 'compare.title'));

  await expect(page.locator('[data-remaked-mobile-summary]')).toHaveAttribute('aria-label', await russianText(page, 'mobile.summary'));
  expect(raceBefore).toBe('Human');
  await expect(page.locator('[data-remaked-summary-race]')).toHaveText('Человек');
  await expect(page.locator('#StatusJob')).toHaveText(classBefore);
  expect(await page.evaluate(() => Store())).toBe(payloadBefore);

  const tooltip = await page.evaluate(() => window.PandoraRemaked.tooltips.get('lp'));
  expect(tooltip.source).toBe(await russianText(page, 'tooltip.source', { node: 'Status_6' }));
  expect(tooltip.definition).toBe(await russianText(page, 'tooltip.definition.lp'));

  await expect(page.locator('[data-remaked-update-notice]')).toHaveCount(0);
});

test('approved workbook game terms appear in Modern search without changing Legacy data', async ({ page }) => {
  const before = await page.evaluate(() => ({ payload: window.Store(), language: window.Flag[0] }));
  const sourceName = await page.evaluate(() => window.PandoraRemaked.adapter.listEquipmentOptions(0).find(option => option.value === '1').name);
  const displayName = sourceName.replace(/^\(+/, '').replace(/\)+$/, '');
  await page.evaluate(() => {
    window.PandoraRemakedGameTerms.ru['equipment.0.1'] = 'Проверочный меч';
  });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').click();

  await expect(page.locator('[data-remaked-search-result][data-value="1"]')).toContainText('Проверочный меч');
  await page.locator('[data-remaked-search-query]').fill(sourceName);
  await expect(page.locator('[data-remaked-search-result][data-value="1"]')).toContainText('Проверочный меч');
  await page.locator('[data-remaked-search-query]').fill('проверочный меч');
  await expect(page.locator('[data-remaked-search-result]')).toHaveCount(1);
  await expect(page.locator('[data-remaked-search-result]')).toHaveAttribute('data-value', '1');
  await page.locator('[data-remaked-search-query]').fill('');
  await page.evaluate(() => window.PandoraRemaked.i18n.setLocale('en'));
  await expect(page.locator('[data-remaked-search-result][data-value="1"] .remaked-search-result-name')).toHaveText(displayName);
  const after = await page.evaluate(() => ({ payload: window.Store(), language: window.Flag[0] }));
  expect(after).toEqual(before);
});

test('Russian shell remains usable without body overflow at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.getByRole('link', { name: await russianText(page, 'header.legacyMode'), exact: true })).toBeVisible();
  await expect(page.locator('[data-remaked-ui-locale="ru"]')).toHaveCSS('background-color', 'rgb(102, 155, 54)');
  await expect(page.locator('[data-remaked-tools]')).toHaveCount(0);
  await expect(page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]')).toBeVisible();
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
});

test('RU uses compact skill and effect terminology without wrapping effect tabs', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?ui=ru');

    const skillHeaders = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-remaked-skill-column-header] > span'))
        .map(node => node.textContent.trim()).filter(Boolean)
    );
    expect(skillHeaders).toEqual(['Изучено (ОЧ)', 'Потенциал.', 'Изучено (ОЧ)', 'Потенциал.']);

    await expect(page.locator('[data-remaked-effect="0"]')).toHaveText('Эффекты умений');
    await expect(page.locator('[data-remaked-effect="1"]')).toHaveText('Эффекты зелий');

    const metrics = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-remaked-effect]')).map(node => ({
        whiteSpace: getComputedStyle(node).whiteSpace,
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth
      }))
    );
    for (const metric of metrics) {
      expect(metric.whiteSpace).toBe('nowrap');
      expect(metric.scrollWidth).toBeLessThanOrEqual(metric.clientWidth + 1);
    }
  }
});

test('effect tabs have matching geometry and readable unclipped typography in every language', async ({ page }) => {
  for (const width of [320, 390, 1024, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const variants = {};
    for (const locale of ['en', 'ru', 'jp', 'tw']) {
      await page.goto('/?ui=' + locale);
      variants[locale] = await page.evaluate(() => {
        const parent = document.querySelector('[data-remaked-effect-tabs]');
        const origin = parent.getBoundingClientRect();
        return Array.from(parent.querySelectorAll('[data-remaked-effect]')).map(button => {
          const bounds = button.getBoundingClientRect();
          const text = document.createRange();
          text.selectNodeContents(button);
          const textBounds = text.getBoundingClientRect();
          const style = getComputedStyle(button);
          return {
            text: button.textContent.trim(),
            geometry: [bounds.x - origin.x, bounds.y - origin.y, bounds.width, bounds.height]
              .map(value => Math.round(value * 10) / 10),
            typography: [style.fontSize, style.fontWeight, style.whiteSpace,
              style.paddingLeft, style.paddingRight, style.letterSpacing],
            clipped: button.scrollWidth > button.clientWidth + 1 ||
              button.scrollHeight > button.clientHeight + 1 ||
              textBounds.left < bounds.left - 1 ||
              textBounds.right > bounds.right + 1 ||
              textBounds.top < bounds.top - 1 ||
              textBounds.bottom > bounds.bottom + 1
          };
        });
      });
    }
    const baseline = variants.en;
    expect(baseline).toHaveLength(2);
    for (const locale of ['en', 'ru', 'jp', 'tw']) {
      const actual = variants[locale];
      expect(actual, locale + ':' + width).toHaveLength(2);
      expect(actual.map(item => item.geometry), locale + ':' + width)
        .toEqual(baseline.map(item => item.geometry));
      expect(actual.map(item => item.typography), locale + ':' + width)
        .toEqual(baseline.map(item => item.typography));
      for (const item of actual) {
        expect(item.typography[0], locale + ':' + width + ':' + item.text).toBe('11px');
        expect(item.typography[2], locale + ':' + width + ':' + item.text).toBe('nowrap');
        expect(item.clipped, locale + ':' + width + ':' + item.text).toBe(false);
      }
    }
  }
});

test('desktop Effects buttons retain their readable pre-rebalance typography without narrowing Skills', async ({ page }) => {
  for (const width of [1366, 1440, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    let reference = null;
    for (const locale of ['ru', 'en', 'jp', 'tw']) {
      await page.goto('/?ui=' + locale);
      const metrics = await page.evaluate(() => {
        const box = node => node.getBoundingClientRect();
        const effects = document.querySelector('[data-remaked-calculator-effects]');
        const skills = document.querySelector('#SkillSet[data-remaked-skill-controls]');
        const character = document.querySelector('[data-remaked-calculator-character]');
        const buttons = [...document.querySelectorAll('[data-remaked-effect-tabs] [data-remaked-effect]')];
        return {
          panelWidth: box(effects).width, skillWidth: box(skills).width,
          skillsOverflow: skills.scrollWidth > skills.clientWidth + 1,
          characterWidth: box(character).width,
          buttonMetrics: buttons.map(node => {
            const b = box(node);
            const range = document.createRange(); range.selectNodeContents(node);
            const text = range.getBoundingClientRect();
            const style = getComputedStyle(node);
            return {
              width: b.width, height: b.height, fontSize: style.fontSize,
              letterSpacing: parseFloat(style.letterSpacing),
              lineHeight: style.lineHeight, whiteSpace: style.whiteSpace,
              fits: text.left >= b.left - 1 && text.right <= b.right + 1 &&
                text.top >= b.top - 1 && text.bottom <= b.bottom + 1
            };
          })
        };
      });
      expect(metrics.panelWidth, locale + ':' + width).toBeCloseTo(232, 1);
      // Match the previous compact workbench: the real guarantee is that the
      // Skills panel remains usable and never introduces internal overflow.
      expect(metrics.skillWidth, locale + ':' + width).toBeGreaterThanOrEqual(488);
      expect(metrics.skillsOverflow, locale + ':' + width).toBe(false);
      expect(metrics.characterWidth, locale + ':' + width).toBeCloseTo(600, 1);
      expect(metrics.buttonMetrics).toHaveLength(2);
      for (const item of metrics.buttonMetrics) {
        expect(item.fontSize).toBe('11px');
        expect(item.letterSpacing).toBeCloseTo(-0.66, 2);
        expect(item.whiteSpace).toBe('nowrap');
        expect(item.fits, locale + ':' + width).toBe(true);
      }
      if (reference) expect(metrics, locale + ':' + width).toEqual(reference);
      else reference = metrics;
    }
  }
});

test('RU calculator actions and riding labels use the requested wording without horizontal overflow', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?ui=ru');

    const labels = await page.evaluate(() => ({
      text3: document.querySelector('[data-remaked-calculator-action="Text_3"]')?.textContent.trim(),
      text5: document.querySelector('[data-remaked-calculator-action="Text_5"]')?.textContent.trim(),
      text6: document.querySelector('[data-remaked-calculator-action="Text_6"]')?.textContent.trim(),
      text7: document.querySelector('[data-remaked-calculator-action="Text_7"]')?.textContent.trim(),
      text8: document.querySelector('[data-remaked-calculator-action="Text_8"]')?.textContent.trim(),
      text9: document.querySelector('[data-remaked-calculator-action="Text_9"]')?.textContent.trim(),
      text16: document.querySelector('[data-remaked-calculator-action="Text_16"]')?.textContent.trim(),
      text19: document.getElementById('Text_19')?.textContent.trim(),
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));

    expect(labels).toMatchObject({
      text3: 'Учитывать умения',
      text5: 'Учитывать мастерство',
      text6: 'Учитывать эфф. зелий',
      text7: 'Сброс характеристик',
      text8: 'Сброс умений',
      text9: 'Сбросить все',
      text16: 'Верхом',
      text19: 'Хар-ки верхом'
    });
    expect(labels.scrollWidth).toBeLessThanOrEqual(labels.clientWidth + 1);
  }
});

test('calculator action geometry and typography match in EN, RU, JP and TW', async ({ page }) => {
  for (const width of [390, 1024, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const locales = {};
    for (const locale of ['en', 'ru', 'jp', 'tw']) {
      await page.goto('/?ui=' + locale);
      locales[locale] = await page.evaluate(() => {
        const container = document.querySelector('[data-remaked-calculator-actions]');
        const outer = container.getBoundingClientRect();
        const actions = ['Text_3', 'Text_5', 'Text_6', 'Text_7', 'Text_8', 'Text_9']
          .map(id => document.querySelector('[data-remaked-calculator-action="' + id + '"]'));
        return {
          containerSize: [outer.width, outer.height].map(n => Math.round(n * 10) / 10),
          geometry: actions.map(node => {
            const r = node.getBoundingClientRect();
            return [r.x - outer.x, r.y - outer.y, r.width, r.height]
              .map(n => Math.round(n * 10) / 10);
          }),
          typography: actions.map(node => {
            const s = getComputedStyle(node);
            return [s.fontSize, s.fontWeight, s.whiteSpace];
          }),
          overflow: actions.filter(node =>
            node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1
          ).map(node => ({
            id: node.getAttribute('data-remaked-calculator-action'),
            label: node.textContent.trim(),
            height: [node.clientHeight, node.scrollHeight],
            width: [node.clientWidth, node.scrollWidth]
          }))
        };
      });
    }
    for (const locale of ['en', 'ru', 'jp', 'tw']) {
      const result = locales[locale];
      expect(result.containerSize, locale + ':' + width).toEqual(locales.en.containerSize);
      expect(result.geometry, locale + ':' + width).toEqual(locales.en.geometry);
      expect(result.typography, locale + ':' + width).toEqual(locales.en.typography);
      expect(result.typography, locale + ':' + width)
        .toEqual(Array.from({ length: 6 }, () => [width <= 620 ? '11px' : '10.5px', '700', 'normal']));
      expect(result.overflow, locale + ':' + width).toEqual([]);
      if (width >= 1366) {
        // Equal columns for the six compact actions, regardless of language.
        const firstRow = result.geometry.slice(0, 3);
        const secondRow = result.geometry.slice(3, 6);
        expect(Math.max(...firstRow.map(rect => rect[2])) - Math.min(...firstRow.map(rect => rect[2]))).toBeLessThanOrEqual(0.2);
        expect(firstRow.map(rect => rect[1])).toEqual([firstRow[0][1], firstRow[0][1], firstRow[0][1]]);
        expect(secondRow.map(rect => rect[1])).toEqual([secondRow[0][1], secondRow[0][1], secondRow[0][1]]);
        expect(secondRow[0][1]).toBeGreaterThan(firstRow[0][1]);
      }
    }
  }
});

test('riding toggle matches its neighboring stat field in every language and viewport', async ({ page }) => {
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ['ru', 'en', 'jp', 'tw']) {
      await page.goto('/?ui=' + locale);
      const riding = await page.evaluate(() => {
        const toggle = document.querySelector('[data-remaked-calculator-action="Text_16"]');
        const label = document.getElementById('Text_19');
        const value = document.querySelector('[data-remaked-calculator-horse] tr:last-child .input_gt');
        const measure = node => {
          const r = node.getBoundingClientRect();
          return { top: r.top, height: r.height, bottom: r.bottom };
        };
        return { toggle: measure(toggle), label: measure(label), value: measure(value) };
      });
      if (width <= 620) {
        // On phones the riding controls stack vertically, and the native
        // action remains a full-size 44px touch target.
        expect(riding.toggle.height, locale + ':' + width).toBeGreaterThanOrEqual(44);
      } else {
        for (const adjacent of [riding.label, riding.value]) {
          expect(Math.abs(riding.toggle.height - adjacent.height), locale + ':' + width).toBeLessThanOrEqual(1);
          // Only the wide desktop layout (1366px+) puts both cells in one row.
          if (width >= 1366) {
            expect(Math.abs(riding.toggle.top - adjacent.top), locale + ':' + width).toBeLessThanOrEqual(1);
          }
        }
        expect(riding.toggle.height, locale + ':' + width).toBeCloseTo(28, 0);
      }
    }
  }
});

test('Russian skills help and Enhancement buffs show full names and localized native hover descriptions', async ({ page }) => {
  await page.goto('/?ui=ru');
  const before = await page.evaluate(() => window.Store());
  const help = page.locator('[data-remaked-i18n="skills.help"]');
  await expect(help).toContainText('Изучение расходует очки умений');
  for (const foreign of ['Adeptness', 'Potential', 'Skill', 'Legacy']) {
    await expect(help).not.toContainText(foreign);
  }

  await page.locator('[data-remaked-tab="4"]').click();
  for (const [id, text] of [['Text_21', 'СД'], ['Text_22', 'Благословение'], ['Text_23', 'Песнопения']]) {
    await expect(page.locator('#' + id)).toHaveText(text);
  }
  for (const id of ['Buff_0_7', 'Buff_14_3', 'Buff_18_8']) {
    const button = page.locator('#' + id + ' [data-remaked-buff]');
    const expected = await page.evaluate(id => {
      const [, category, index] = id.split('_');
      return {
        name: PandoraRemaked.i18n.game('skill_entry.' + category + '.' + index, ''),
        description: PandoraRemaked.i18n.game('skill_detail.' + category + '.' + index + '.3', '')
      };
    }, id);
    await expect(button).toContainText(expected.name);
    const hover = await button.locator('.help').first().getAttribute('title');
    expect(hover).toBe(expected.name + String.fromCharCode(10) + expected.description);
    await expect(button).toHaveAttribute('title', hover);
  }

  const translated = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('#BUFFView [id^="Buff_"]:not([id^="Buff_30_"]) [id^="TextBuff_"]')];
    return labels.map(label => {
      const [, category, index] = label.closest('[id^="Buff_"]').id.split('_');
      const name = PandoraRemaked.i18n.game('skill_entry.' + category + '.' + index, '');
      const description = PandoraRemaked.i18n.game('skill_detail.' + category + '.' + index + '.3', '');
      const hover = (label.querySelector('.help') || label).getAttribute('title');
      return { visible: label.textContent.trim(), name, description, hover };
    });
  });
  expect(translated).toHaveLength(36);
  for (const entry of translated) {
    expect(entry.name).toBeTruthy();
    expect(entry.description).toBeTruthy();
    expect(entry.visible).toBe(entry.name);
    expect(entry.hover).toBe(entry.name + String.fromCharCode(10) + entry.description);
  }
  expect(await page.evaluate(() => window.Store())).toBe(before);

  await page.locator('[data-remaked-ui-locale="en"]').click();
  await expect(page.locator('#Text_21')).toHaveText('SPR');
  await expect(page.locator('#Text_22')).toHaveText('Blessing');
  await expect(page.locator('#Text_23')).toHaveText('Hymn');
  await expect(page.locator('#Buff_0_7')).toContainText('War Cry');
  await expect(page.locator('#Buff_0_7 .help')).toHaveAttribute('title', /Increases Physical Attack Power/);
  await expect(page.locator('#Buff_0_7 [data-remaked-buff]')).not.toHaveAttribute('title');
  expect(await page.evaluate(() => window.Store())).toBe(before);
});

test('full guild localization and real damage reduction keep stats and selection IDs consistent', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?ui=ru');
  await page.locator('[data-remaked-tab="4"]').click();

  for (const [id, text] of [['Text_21', 'СД'], ['Text_22', 'Благословение'], ['Text_23', 'Песнопения'], ['Text_24', 'Гильдия']]) {
    await expect(page.locator('#' + id)).toHaveText(text);
  }
  const russianNames = [
    'Гильдия', 'Сила гильдии', 'Дух гильдии', 'Восстановление силы',
    'Восстановление духа', 'Физическая устойчивость', 'Магическая устойчивость',
    'Опыт', 'Магистр исцеления', 'Магистр битвы', 'Магистр магии'
  ];
  for (const [index, text] of russianNames.entries()) {
    const select = page.locator('#SelBuffClan_' + index);
    await expect(select.locator('option[value="0"]')).toHaveText(text);
    await expect(select.locator('option[value="1"]')).toHaveText(text + ' Ур. 1');
    expect(await select.locator('option[value="1"]').getAttribute('value')).toBe('1');
  }
  await expect(page.locator('#SelBuffClan_0 option[value="12"]')).toHaveText('Гильдия Ур. 12');

  // The captions are single-line: no forced wrap, clipping or ellipsis.
  const geometry = await page.evaluate(() => [21, 22, 23].map(id => {
    const label = document.getElementById('Text_' + id);
    const input = document.getElementById('InBuff_' + (id - 21));
    const line = label.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(label);
    const textBox = range.getBoundingClientRect();
    return {
      label: label.textContent.trim(), whiteSpace: getComputedStyle(label).whiteSpace,
      textWidth: textBox.width, availableWidth: line.width,
      inputWidth: input.getBoundingClientRect().width, height: line.height, textHeight: textBox.height
    };
  }));
  for (const entry of geometry) {
    expect(entry.whiteSpace, entry.label).toBe('nowrap');
    expect(entry.textWidth, JSON.stringify(entry)).toBeLessThanOrEqual(entry.availableWidth + 1);
    expect(entry.textHeight, JSON.stringify(entry)).toBeLessThan(entry.height + 1);
  }
  expect(geometry[0].inputWidth).toBeLessThanOrEqual(44);
  expect(geometry[1].inputWidth).toBeLessThanOrEqual(38);
  expect(geometry[2].inputWidth).toBeLessThanOrEqual(38);

  const currentStats = () => page.evaluate(() => ({
    physical: Number(document.getElementById('Status_52_2').textContent),
    magical: Number(document.getElementById('Status_60').textContent),
    defense: document.getElementById('Status_49').textContent
  }));
  const base = await currentStats();
  await page.locator('#SelBuffClan_5').selectOption('1');
  let current = await currentStats();
  expect(current.physical).toBe(base.physical - 3);
  expect(current.magical).toBe(base.magical);
  expect(current.defense).toBe(base.defense);

  await page.locator('#SelBuffClan_5').selectOption('2');
  current = await currentStats();
  expect(current.physical).toBe(base.physical - 6);
  await page.locator('#SelBuffClan_6').selectOption('1');
  current = await currentStats();
  expect(current.physical).toBe(base.physical - 6);
  expect(current.magical).toBe(base.magical - 3);

  await page.locator('#SelBuffClan_6').selectOption('2');
  current = await currentStats();
  expect(current.magical).toBe(base.magical - 6);
  await page.locator('#SelBuffClan_5').selectOption('0');
  await page.locator('#SelBuffClan_6').selectOption('0');
  expect(await currentStats()).toEqual(base);

  await page.locator('[data-remaked-ui-locale="en"]').click();
  await expect(page.locator('#Text_21')).toHaveText('SPR');
  await expect(page.locator('#SelBuffClan_0 option[value="12"]')).toHaveText('Clan Lv12');
  await expect(page.locator('#SelBuffClan_5 option[value="1"]')).toHaveText('Physical Resist Lv1');
});


test('enhancement captions keep fixed positions for RU EN JP TW and Honor selects one passive or none', async ({page}) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await page.goto('/');
  await page.locator('[data-remaked-tab="4"]').click();
  const rectangles = [];
  for (const locale of ['ru', 'en', 'ja', 'zh-TW']) {
    const localeButton = {'ru':'ru','en':'en','ja':'jp','zh-TW':'tw'}[locale];
    await page.locator('[data-remaked-ui-locale="' + localeButton + '"]').click();
    const sample = await page.evaluate(() => {
      const items = [0,1,2].map(i => {
        const label = document.getElementById('Text_' + (i+21));
        const input = document.getElementById('InBuff_' + i);
        const textRange = document.createRange(); textRange.selectNodeContents(label);
        const textRect = textRange.getBoundingClientRect();
        const labelRect = label.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        const buttonRect = document.querySelector('#BUFFView [data-remaked-buff-column]:nth-child(' + (i+1) + ') [data-remaked-buff]')?.getBoundingClientRect();
        return {text:label.textContent.trim(), left:inputRect.left, right:inputRect.right,
          labelRight:labelRect.right, textWidth:textRect.width, labelWidth:labelRect.width,
          labelHeight:labelRect.height, textHeight:textRect.height, buttonLeft:buttonRect?.left};
      });
      return items;
    });
    for (const item of sample) {
      expect(item.textWidth, JSON.stringify({locale,item})).toBeLessThanOrEqual(item.labelWidth+1);
      expect(item.textHeight, JSON.stringify({locale,item})).toBeLessThanOrEqual(item.labelHeight+1);
    }
    rectangles.push(sample);
  }
  for (const sample of rectangles.slice(1))
    for (let i=0;i<3;i++) {
      expect(Math.abs(sample[i].left-rectangles[0][i].left)).toBeLessThan(1);
      expect(Math.abs(sample[i].right-rectangles[0][i].right)).toBeLessThan(1);
      expect(Math.abs(sample[i].labelRight-rectangles[0][i].labelRight)).toBeLessThan(1);
    }
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.locator('#Text_25')).toHaveText('Честь');
  const first = page.locator('#BuffHonor_0 [data-remaked-buff]');
  const second = page.locator('#BuffHonor_1 [data-remaked-buff]');
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(second).toHaveAttribute('aria-pressed', 'false');
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(second).toHaveAttribute('aria-pressed', 'false');
  await second.click();
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await second.click();
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(second).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => Flag.Honor)).toBe(0);
  // The Legacy crossed-out classification must not disguise a usable buff.
  await expect(page.locator('#Buff_14_2')).toBeVisible();
  const decoration = await page.locator('#Buff_14_2 [id^="TextBuff_"]').evaluate(el => getComputedStyle(el).textDecorationLine);
  expect(decoration).toBe('none');

  for (const [id, name] of [
    ['Buff_18_8','Сопр. огню'],['Buff_18_9','Сопр. льду'],
    ['Buff_18_10','Сопр. молнии'],['Buff_20_7','Сопр. тьме'],
    ['Buff_21_7','Сопр. чарам']
  ]) await expect(page.locator('#'+id+' [data-remaked-buff]')).toContainText(name);
  await expect(page.locator('#TextStatus_39')).toContainText('Сопр. тьме');
});
