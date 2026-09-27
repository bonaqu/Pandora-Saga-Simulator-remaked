import { test, expect } from '@playwright/test';

async function capture(page, testInfo, viewport, name) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await expect(page.locator('[data-remaked-header]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: true });
}

test('capture Modern desktop QA screenshot', async ({ page }, testInfo) => {
  await capture(page, testInfo, { width: 1440, height: 1000 }, 'modern-desktop.png');
});

test('capture Modern mobile QA screenshot', async ({ page }, testInfo) => {
  await capture(page, testInfo, { width: 390, height: 844 }, 'modern-mobile.png');
});
