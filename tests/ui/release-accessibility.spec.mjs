import { test, expect } from '@playwright/test';

test('skip navigation reaches the calculator before repeated chrome', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to calculator', exact: true });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement.closest('main')))).toBe(true);
});

for (const [name, trigger, panel] of [
  ['builds', '[data-remaked-builds-open]', '[data-remaked-build-manager]'],
  ['compare', '[data-remaked-compare-open]', '[data-remaked-compare]']
]) {
  test(`${name} traps keyboard focus, blocks background and restores opener`, async ({ page }) => {
    await page.goto('/');
    const opener = page.locator(trigger);
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(panel)).toBeVisible();
    const background = page.locator('[data-remaked-ui-locale="ru"]');
    await background.evaluate(node => node.focus());
    expect(await page.evaluate(selector => Boolean(document.activeElement.closest(selector)), panel)).toBe(true);
    const first = page.locator(panel).locator('button, input, select, textarea, a[href]').first();
    await first.focus();
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(selector => Boolean(document.activeElement.closest(selector)), panel)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator(panel)).not.toBeVisible();
    await expect(opener).toBeFocused();
    await background.focus();
    await expect(background).toBeFocused();
  });
}

test('Updates provides an accessible on-site release panel without altering the build', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const before = await page.evaluate(() => Store());
  const trigger = page.getByRole('button', { name: 'Updates', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: "What's new", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(await page.evaluate(() => PandoraRemakedVersion.ui));
  await expect(dialog).toContainText('Legacy engine: 2.00');
  await expect(dialog.locator('li').first()).toHaveCSS('font-size', '15px');
  await expect(dialog.locator('li').first()).toHaveCSS('letter-spacing', 'normal');
  await expect(dialog.getByRole('link', { name: 'Full changelog', exact: true })).toHaveAttribute('href', /CHANGELOG\.md$/);
  await expect(dialog.getByRole('link', { name: 'Report a problem', exact: true })).toHaveAttribute('href', /issues\/new\?template=bug_report.yml$/);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => Store())).toBe(before);
  expect(errors).toEqual([]);
});
