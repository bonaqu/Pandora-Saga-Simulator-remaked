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
  const latestEnglishNotes = await page.evaluate(() => PandoraRemakedRelease.highlights.en);
  expect(await page.evaluate(() => Boolean(PandoraRemakedRelease.technicalOnly))).toBe(false);
  await expect(dialog.locator('li')).toHaveCount(latestEnglishNotes.length);
  await expect(dialog.locator('li').first()).toHaveText(latestEnglishNotes[0]);
  await expect(dialog).not.toContainText('Internal technical improvements.');
  await expect(dialog).not.toContainText('catalog_head.snapshot_json');
  await expect(dialog.locator('li').first()).toHaveCSS('font-size', '15px');
  await expect(dialog.locator('li').first()).toHaveCSS('letter-spacing', 'normal');
  await expect(dialog.getByRole('link', { name: 'Full changelog', exact: true })).toHaveAttribute('href', /CHANGELOG\.en\.md$/);
  await expect(dialog.getByRole('link', { name: 'Report a problem', exact: true })).toHaveAttribute('href', /issues\/new\?template=01-bug.yml$/);
  await expect(dialog.locator('[data-remaked-user-version]')).toContainText(
    'Modern ' + await page.evaluate(() => PandoraRemakedRelease.userVersion));
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await page.getByRole('button', { name: 'Обновления', exact: true }).click();
  const russianDialog = page.getByRole('dialog', { name: 'Что нового', exact: true });
  await expect(russianDialog).toBeVisible();
  await expect(russianDialog.getByRole('link', { name: 'Полный список изменений' }))
    .toHaveAttribute('href', /CHANGELOG\.ru\.md$/);
  await expect(russianDialog.locator('[data-remaked-user-version]')).toContainText('Последние изменения для пользователей:');
  await expect(russianDialog.locator('li').first())
    .toHaveText(await page.evaluate(() => PandoraRemakedRelease.highlights.ru[0]));
  await expect(russianDialog).not.toContainText('Выполнены внутренние технические улучшения.');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => Store())).toBe(before);
  expect(errors).toEqual([]);
});


test('admin-only deployment keeps the last real user release in RU/EN instead of a technical placeholder', async ({page}) => {
  await page.goto('/?ui=en');
  const before=await page.evaluate(()=>Store());
  await page.evaluate(()=>{
    const latest=window.PandoraRemakedRelease;
    window.PandoraRemakedRelease=Object.freeze({
      ...latest,
      version:window.PandoraRemakedVersion.ui,
      userVersion:'4.03',
      date:'2026-10-11',
      highlights:{
        en:['A real, verified update for players.'],
        ru:['Настоящее обновление для игроков.']
      }
    });
  });
  await page.getByRole('button',{name:'Updates',exact:true}).click();
  let dialog=page.getByRole('dialog',{name:"What's new",exact:true});
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-remaked-user-version]')).toContainText('Modern 4.03');
  await expect(dialog.locator('li')).toHaveText(['A real, verified update for players.']);
  await expect(dialog).not.toContainText('Internal technical improvements.');
  await page.keyboard.press('Escape');
  await page.locator('[data-remaked-ui-locale="ru"]').click();
  await page.getByRole('button',{name:'Обновления',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'Что нового',exact:true});
  await expect(dialog.locator('[data-remaked-user-version]')).toContainText('Modern 4.03');
  await expect(dialog.locator('li')).toHaveText(['Настоящее обновление для игроков.']);
  await expect(dialog).not.toContainText('Выполнены внутренние технические улучшения.');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>Store())).toBe(before);
});
