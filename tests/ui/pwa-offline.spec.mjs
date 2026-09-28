import { test, expect } from '@playwright/test';

test('installed Modern and Legacy routes boot offline without changing the build', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const payload = await page.evaluate(() => window.Store());

  try {
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-remaked-shell]')).toBeVisible();
    const modern = await page.evaluate(() => ({
      store: typeof window.Store,
      calc: typeof window.CalcSet,
      payload: window.Store()
    }));
    expect(modern.store).toBe('function');
    expect(modern.calc).toBe('function');
    expect(modern.payload).toBe(payload);

    const optionalIcon = await page.evaluate(async () => {
      try {
        const response = await fetch('./image/icon/not-cached.png');
        return { resolved: true, ok: response.ok };
      } catch (error) {
        return { resolved: false, ok: false };
      }
    });
    expect(optionalIcon.ok).toBe(false);
    await expect(page.locator('[data-remaked-shell]')).toBeVisible();

    await page.goto('/legacy/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#body')).toHaveCount(1);
    await expect(page.locator('#Tab_0_0')).toBeVisible();
    const legacy = await page.evaluate(() => ({
      store: typeof window.Store,
      calc: typeof window.CalcSet
    }));
    expect(legacy.store).toBe('function');
    expect(legacy.calc).toBe('function');
  } finally {
    await context.setOffline(false);
  }
});
