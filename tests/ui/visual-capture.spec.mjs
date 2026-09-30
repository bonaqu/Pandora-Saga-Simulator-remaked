import { test, expect } from '@playwright/test';

for (const width of [320, 1440]) test(`capture native skills and effects at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  await page.locator('#SkillSet').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath(`modern-skills-${width}.png`) });
  await page.getByRole('button', { name: 'Larger steps', exact: true }).click();
  await page.locator('[data-remaked-skill-row="1"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath(`modern-skills-expanded-${width}.png`) });
  await page.locator('[data-remaked-calculator-effects]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath(`modern-effects-${width}.png`) });
});

for (const width of [320, 1440]) test(`capture calculator controls and long translated identity at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await page.evaluate(() => Object.assign(PandoraRemakedGameTerms.ru, {
    'race.0': 'Проверочное очень длинное название расы персонажа',
    'calculator.status.0': 'Проверочное длинное имя характеристики'
  }));
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await page.locator('[data-remaked-step="remaked-level-up3"]').click();
  await page.locator('[data-remaked-step="remaked-attribute-STR-up1"]').focus();
  await page.locator('[data-remaked-calculator-character]').screenshot({ path: testInfo.outputPath(`modern-calculator-controls-${width}.png`) });
});

test('capture off-screen Equipment keyboard characteristic card', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]').focus();
  await page.keyboard.press('ArrowDown');
  const row = page.locator('[data-remaked-picker-panel] [data-remaked-search-row][data-value="120011"]');
  await row.locator('button').focus();
  await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
  await page.waitForTimeout(150);
  await expect(row.locator('details')).toHaveAttribute('open', '');
  await page.screenshot({ path: testInfo.outputPath('modern-equipment-keyboard-bottom-1440.png') });
});

for (const width of [390, 1440]) {
  test(`capture actual Equipment picker at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => {
      const adapter = PandoraRemaked.adapter;
      for (const option of adapter.listEquipmentOptions(0)) {
        const item = adapter.readItemDetails('equipment', option.value, 0);
        if (item?.sockets === 3 && Number(option.value) % 10000) {
          adapter.selectEquipment(0, option.value);
          const select = document.getElementById('SelEquip_0_3');
          select.value = '4'; select.dispatchEvent(new Event('change', { bubbles: true }));
          const target = adapter.listSoulTargets().find(t => t.slotIndex === 0);
          const soul = adapter.listSoulOptions(target).find(s => Number(s.value) > 0);
          adapter.selectSoul(target, soul.value);
          break;
        }
      }
    });
    const opener = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
    await opener.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`modern-actual-equipment-${width}.png`) });
    await opener.click();
    const selected = await page.evaluate(() => String(Status.Equip[0][0]));
    const row = page.locator(`[data-remaked-picker-panel] [data-remaked-search-row][data-value="${selected}"]`);
    await row.locator('summary').click();
    await expect(row.locator('[data-remaked-item-description] strong')).toContainText('+4');
    await expect(row.locator('[data-remaked-socket][data-filled="true"]')).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath(`modern-actual-equipment-preview-${width}.png`) });
  });
}

const desktop = { width: 1440, height: 1000 };
const mobile = { width: 390, height: 844 };

for (const [name, viewport] of [['desktop', desktop], ['mobile', mobile]]) {
  test(`capture item preview and sharing ${name}`, async ({ page }, testInfo) => {
    await openModern(page, viewport);
    await page.locator('[data-remaked-ui-locale="ru"]').click();
    await page.locator('[data-remaked-equipment-search]').click();
    const row = page.locator('[data-remaked-search-row][data-value="2"]');
    await row.locator('summary').click();
    await expect(row.locator('[data-remaked-item-description]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`modern-item-preview-${name}.png`), fullPage: false });
    await page.locator('.remaked-search-close').click();
    await page.evaluate(() => {
      const adapter = PandoraRemaked.adapter;
      if (!adapter.selectEquipment(0, '2')) throw new Error('Cannot equip the socketed screenshot fixture');
      const enhancement = document.getElementById('SelEquip_0_3');
      enhancement.value = '4'; enhancement.dispatchEvent(new Event('change', { bubbles: true }));
      const target = adapter.listSoulTargets().find(t => t.slotIndex === 0);
      const soul = adapter.listSoulOptions(target).find(s => Number(s.value) > 0);
      if (!soul || !adapter.selectSoul(target, soul.value)) throw new Error('No compatible Soul for screenshot');
    });
    await page.locator('[data-remaked-equipment-search]').click();
    await row.locator('summary').click();
    await expect(row.locator('[data-remaked-item-description] strong')).toContainText('+4');
    await expect(row.locator('[data-remaked-socket][data-filled="true"]')).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath(`modern-equipped-item-${name}.png`), fullPage: false });
    await page.locator('.remaked-search-close').click();
    await page.locator('[data-remaked-builds-open]').click();
    await page.locator('[data-remaked-share-build]').click();
    await expect(page.locator('[data-remaked-share-url]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`modern-build-sharing-${name}.png`), fullPage: false });
  });
}

for (const [name, viewport] of [['desktop', desktop], ['mobile', mobile]]) {
  test(`capture on-site Updates ${name}`, async ({ page }, testInfo) => {
    await openModern(page, viewport);
    if (name === 'mobile') await page.locator('[data-remaked-ui-locale="ru"]').click();
    await page.locator('[data-remaked-updates-open]').click();
    await expect(page.locator('[data-remaked-updates]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`modern-updates-${name}.png`), fullPage: false });
  });
}

async function openModern(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await expect(page.locator('[data-remaked-header]')).toBeVisible();
  await page.waitForLoadState('networkidle');
}

async function captureMain(page, testInfo, viewport, name) {
  await openModern(page, viewport);
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: true });
}

async function captureEquipmentSearch(page, testInfo, viewport, name) {
  await openModern(page, viewport);
  await page.locator('[data-remaked-equipment-search]').click();
  await expect(page.locator('[data-remaked-search-panel][data-search-kind="equipment"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: false });
}

async function captureBuildManager(page, testInfo, viewport, name) {
  await openModern(page, viewport);
  await page.locator('[data-remaked-builds-open]').click();
  await expect(page.locator('[data-remaked-build-manager]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: false });
}

async function captureCompareBuilds(page, testInfo, viewport, name) {
  await openModern(page, viewport);
  const builds = await page.evaluate(() => {
    const adapter = window.PandoraRemaked.adapter;
    const store = window.PandoraRemaked.buildStore;
    localStorage.removeItem(store.BUILDS_KEY);

    const active = adapter.serialize();
    const first = store.saveBuild('Baseline build', active);
    if (!first.ok) throw new Error(first.error?.message || 'Could not save baseline build');

    const race = document.getElementById('SelRace');
    race.selectedIndex = (race.selectedIndex + 1) % race.options.length;
    race.dispatchEvent(new Event('change', { bubbles: true }));
    const changed = adapter.serialize();
    adapter.load(active);

    const second = store.saveBuild('Changed race', changed);
    if (!second.ok) throw new Error(second.error?.message || 'Could not save changed build');
    return { a: first.build.id, b: second.build.id };
  });

  await page.locator('[data-remaked-compare-open]').click();
  await page.locator('[data-remaked-compare-a]').selectOption(builds.a);
  await page.locator('[data-remaked-compare-b]').selectOption(builds.b);
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  await expect(page.locator('[data-remaked-stat-help="physicalAttack"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: false });
}

async function captureMobileEquipment(page, testInfo) {
  await openModern(page, mobile);
  const primary = page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
  await expect(primary).toBeVisible();
  await expect(primary.locator('xpath=ancestor::*[@data-remaked-equipment-row][1]')).toHaveCount(1);
  await primary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('modern-mobile-equipment.png'), fullPage: false });
}

async function captureMobileCollapsedCard(page, testInfo) {
  await openModern(page, mobile);
  await page.locator('[data-remaked-nav]').getByRole('button', { name: 'LOG', exact: true }).click();
  const toggle = page.locator('[data-remaked-collapse-toggle]:visible').first();
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.screenshot({ path: testInfo.outputPath('modern-mobile-collapsed-card.png'), fullPage: false });
}

async function captureMobileUpdateNotice(page, testInfo) {
  await openModern(page, mobile);
  await page.evaluate(() => {
    window.PandoraRemaked.pwa.showUpdateNotice({ postMessage() {} });
  });
  await expect(page.locator('[data-remaked-update-notice]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('modern-mobile-update-notice.png'), fullPage: false });
}

test('capture Modern desktop QA screenshot', async ({ page }, testInfo) => {
  await openModern(page, desktop);
  await expect(page.locator('[data-remaked-mobile-summary]')).toBeHidden();
  await expect(page.locator('[data-remaked-collapse-toggle]').first()).toBeHidden();
  await expect(page.locator('[data-remaked-install]')).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('modern-desktop.png'), fullPage: true });
});

test('capture Modern mobile QA screenshot', async ({ page }, testInfo) => {
  await captureMain(page, testInfo, mobile, 'modern-mobile.png');
});

test('capture Equipment Search desktop QA screenshot', async ({ page }, testInfo) => {
  await captureEquipmentSearch(page, testInfo, desktop, 'modern-equipment-search-desktop.png');
});

test('capture Equipment Search mobile QA screenshot', async ({ page }, testInfo) => {
  await captureEquipmentSearch(page, testInfo, mobile, 'modern-equipment-search-mobile.png');
});

test('capture Build Manager desktop QA screenshot', async ({ page }, testInfo) => {
  await captureBuildManager(page, testInfo, desktop, 'modern-build-manager-desktop.png');
});

test('capture Build Manager mobile QA screenshot', async ({ page }, testInfo) => {
  await captureBuildManager(page, testInfo, mobile, 'modern-build-manager-mobile.png');
});

test('capture Compare Builds desktop QA screenshot', async ({ page }, testInfo) => {
  await captureCompareBuilds(page, testInfo, desktop, 'modern-compare-builds-desktop.png');
});

test('capture Compare Builds mobile QA screenshot', async ({ page }, testInfo) => {
  await captureCompareBuilds(page, testInfo, mobile, 'modern-compare-builds-mobile.png');
});

test('capture Phase 4 mobile equipment QA screenshot', async ({ page }, testInfo) => {
  await captureMobileEquipment(page, testInfo);
});

test('capture Phase 4 collapsed card QA screenshot', async ({ page }, testInfo) => {
  await captureMobileCollapsedCard(page, testInfo);
});

test('capture Phase 4 update notice QA screenshot', async ({ page }, testInfo) => {
  await captureMobileUpdateNotice(page, testInfo);
});

test('capture Russian Modern desktop QA screenshot', async ({ page }, testInfo) => {
  await openModern(page, desktop);
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  const project = await page.evaluate(() => window.PandoraRemaked.i18n.t('header.project'));
  await expect(page.locator('[data-remaked-header]')).toContainText(project);
  await page.screenshot({ path: testInfo.outputPath('modern-russian-desktop.png'), fullPage: true });
});

test('capture Russian Modern mobile QA screenshot', async ({ page }, testInfo) => {
  await openModern(page, mobile);
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  const summary = await page.evaluate(() => window.PandoraRemaked.i18n.t('mobile.summary'));
  await expect(page.locator('[data-remaked-mobile-summary]')).toHaveAttribute('aria-label', summary);
  await page.screenshot({ path: testInfo.outputPath('modern-russian-mobile.png'), fullPage: false });
});
