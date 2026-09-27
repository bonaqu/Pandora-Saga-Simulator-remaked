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

test('capture Modern desktop QA screenshot', async ({ page }, testInfo) => {
  await captureMain(page, testInfo, desktop, 'modern-desktop.png');
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
