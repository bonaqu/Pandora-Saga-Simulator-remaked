import { test, expect } from '@playwright/test';

const desktop = { width: 1440, height: 1000 };
const mobile = { width: 390, height: 844 };

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
  const primary = page.locator('#SelEquip_0_0');
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
  await expect(page.locator('[data-remaked-header]')).toContainText('Проект');
  await page.screenshot({ path: testInfo.outputPath('modern-russian-desktop.png'), fullPage: true });
});

test('capture Russian Modern mobile QA screenshot', async ({ page }, testInfo) => {
  await openModern(page, mobile);
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await expect(page.locator('[data-remaked-mobile-summary]')).toHaveAttribute('aria-label', 'Сводка текущего персонажа');
  await page.screenshot({ path: testInfo.outputPath('modern-russian-mobile.png'), fullPage: false });
});
