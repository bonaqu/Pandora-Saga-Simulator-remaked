import { test, expect } from '@playwright/test';

for (const route of ['/', '/legacy/']) {
  test(`runtime scripts parse without browser errors at ${route}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
    const codecs = await page.evaluate(() => ({
      base64: typeof window.Base64?.toBase64,
      deflate: typeof window.RawDeflate?.deflate,
      inflate: typeof window.RawDeflate?.inflate
    }));
    expect(codecs).toEqual({ base64: 'function', deflate: 'function', inflate: 'function' });
  });

  test(`preserved compressed File save/load round-trips at ${route}`, async ({ page }) => {
    await page.goto(route);
    const saved = await page.evaluate(() => {
      const payload = window.Store();
      window.File('Save', 0);
      return { payload, compressed: localStorage.file };
    });
    expect(saved.compressed).toMatch(/^[A-Za-z0-9+/=]+$/);
    await page.evaluate(() => {
      const race = document.getElementById('SelRace');
      race.selectedIndex = 1;
      race.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(await page.evaluate(() => window.Store())).not.toBe(saved.payload);
    await page.evaluate(() => window.File('Load', 0));
    expect(await page.evaluate(() => window.Store())).toBe(saved.payload);
    expect(await page.evaluate(() => localStorage.file)).toBe(saved.compressed);
  });
}
