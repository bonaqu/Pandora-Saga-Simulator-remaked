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
      text5: 'Учитывать мастерство умений',
      text6: 'Учитывать эффекты зелий',
      text7: 'Сброс характеристик',
      text8: 'Сброс умений',
      text9: 'Сбросить все',
      text16: 'Верхом',
      text19: 'Хар-ки верхом'
    });
    expect(labels.scrollWidth).toBeLessThanOrEqual(labels.clientWidth + 1);
  }
});

test('calculator action and riding geometry is locale-invariant', async ({ page }) => {
  for (const width of [390, 1024, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const locales = {};
    for (const locale of ['en', 'ru', 'jp', 'tw']) {
      await page.goto('/?ui=' + locale);
      locales[locale] = await page.evaluate(() => {
        const container = document.querySelector('[data-remaked-calculator-actions]');
        const actions = ['Text_3', 'Text_5', 'Text_6', 'Text_7', 'Text_8', 'Text_9']
          .map(id => document.querySelector('[data-remaked-calculator-action="' + id + '"]'));
        const parent = container.getBoundingClientRect();
        const rect = node => {
          const r = node.getBoundingClientRect();
          // Text above the component may have different heights by language.
          // Compare geometry *inside* the component, not document position.
          return [
            r.x - parent.x, r.y - parent.y, r.width, r.height
          ].map(value => Math.round(value * 10) / 10);
        };
        return {
          container: [parent.width, parent.height].map(value => Math.round(value * 10) / 10),
          actions: actions.map(rect),
          fontSizes: actions.map(node => getComputedStyle(node).fontSize),
          fontWeights: actions.map(node => getComputedStyle(node).fontWeight),
          overflowDetails: actions.filter(node =>
            node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1
          ).map(node => ({
            id: node.getAttribute('data-remaked-calculator-action'),
            text: node.textContent.trim(),
            clientHeight: node.clientHeight,
            scrollHeight: node.scrollHeight,
            clientWidth: node.clientWidth,
            scrollWidth: node.scrollWidth
          })),
          documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        };
      });
    }
    const base = locales.en;
    for (const locale of ['en', 'ru', 'jp', 'tw']) {
      const value = locales[locale];
      expect(value.container, locale + ':' + width).toEqual(base.container);
      expect(value.actions, locale + ':' + width).toEqual(base.actions);
      expect(value.fontSizes, locale + ':' + width).toEqual(Array(6).fill('11px'));
      expect(value.fontWeights, locale + ':' + width).toEqual(Array(6).fill('600'));
      expect(value.overflowDetails, locale + ':' + width).toEqual([]);
      expect(value.documentOverflow, locale + ':' + width).toBe(false);
    }
  }
});

