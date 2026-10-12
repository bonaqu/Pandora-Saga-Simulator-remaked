import { test, expect } from '@playwright/test';

async function openGuild(page) {
  await page.locator('[data-remaked-tab="4"]').click();
  await expect(page.locator('[data-remaked-guild-trigger]')).toHaveCount(11);
}
async function hoverLevel(page, index, level) {
  await page.locator('[data-remaked-guild-trigger="' + index + '"]').click();
  const item = page.locator('[data-remaked-guild-option="' + level + '"]');
  await item.hover();
  await expect(page.locator('[data-remaked-guild-tooltip]')).toBeVisible();
  return item;
}
test('44 guild effects use contextual styled hover help, not a huge two-column pane', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?ui=ru');
  await openGuild(page);
  const before = await page.evaluate(() => window.Store());
  const counts = [12,5,5,2,2,2,2,5,3,3,3];
  for (const [index, count] of counts.entries()) {
    await page.locator('[data-remaked-guild-trigger="' + index + '"]').click();
    await expect(page.locator('[data-remaked-guild-tooltip]')).toBeHidden();
    const popup = page.locator('[data-remaked-guild-popup]');
    const rect = await popup.boundingBox();
    expect(rect.width).toBeLessThanOrEqual(240);
    expect(await popup.locator('[data-remaked-guild-option]').count()).toBe(count+1);
    const item = page.locator('[data-remaked-guild-option="' + count + '"]');
    await item.hover();
    const expected = await page.evaluate(([i, level]) =>
      window.PandoraRemakedGuildSkills.skills[i].levels[level-1].ru, [index, count]);
    await expect(page.locator('[data-remaked-guild-tooltip]')).toHaveText(expected);
    expect(await page.locator('#SelBuffClan_' + index).inputValue()).toBe('0');
    await page.keyboard.press('Escape');
  }
  expect(await page.evaluate(() => window.Store())).toBe(before);
});
test('guild level presets retain calculations and native original selects', async ({ page }) => {
  await page.goto('/?ui=ru'); await openGuild(page);
  const item = await hoverLevel(page, 0, 12);
  await expect(page.locator('[data-remaked-guild-tooltip]')).toContainText('максимальные ОЗ +12%');
  await item.click();
  for(const [idx,value] of [[0,'12'],[1,'5'],[2,'5'],[7,'5']])
    await expect(page.locator('#SelBuffClan_'+idx)).toHaveValue(value);
  await page.locator('[data-remaked-guild-trigger="0"]').click();
  await page.locator('[data-remaked-guild-option="0"]').click();
  await expect(page.locator('#SelBuffClan_0')).toHaveValue('0');
  await expect(page.locator('#SelBuffClan_1')).toHaveValue('0');
});
test('passive descriptions are clean, D1 overrides retain priority, keyboard works', async ({ page }) => {
  await page.goto('/?ui=ru'); await openGuild(page);
  await hoverLevel(page,6,1);
  await expect(page.locator('[data-remaked-guild-tooltip]')).toHaveText('Уменьшает получаемый магический урон на 3%.');
  await expect(page.locator('[data-remaked-guild-tooltip]')).not.toContainText('Пассивно:');
  await page.keyboard.press('Escape');
  const published = { ok:true,schemaVersion:1, overrides:{
    ui:{ru:{},en:{},jp:{},tw:{}},
    game:{ru:{'calculator.clan.10.level.3.hint':'Проверенный текст, опубликованный в D1.'},en:{},jp:{},tw:{}}
  }};
  expect(await page.evaluate(x=>PandoraRemaked.i18n.applyUnifiedLocalization(x),published)).toBe(true);
  await page.locator('[data-remaked-guild-trigger="10"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-remaked-guild-option="2"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-remaked-guild-option="3"]')).toBeFocused();
  await expect(page.locator('[data-remaked-guild-tooltip]')).toHaveText('Проверенный текст, опубликованный в D1.');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-remaked-guild-option="2"]')).toBeFocused();
  await expect(page.locator('[data-remaked-guild-tooltip]')).toContainText('магическую атаку на 4%');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-remaked-guild-tooltip]')).toHaveText('Проверенный текст, опубликованный в D1.');
  await page.keyboard.press('Enter');
  await expect(page.locator('#SelBuffClan_10')).toHaveValue('3');
  await page.locator('[data-remaked-ui-locale="en"]').click();
  await hoverLevel(page,10,3);
  await expect(page.locator('[data-remaked-guild-tooltip]')).toContainText('physical and magical attack by 6%');
});
test('guild and Honor rows are aligned and chevron is vertically centered', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/?ui=ru'); await openGuild(page);
  const geometry = await page.evaluate(() => {
    const values=[];
    for(let i=0;i<11;i++){
    const guild=document.querySelector('#BuffClan_'+i+' .remaked-guild-trigger').getBoundingClientRect();
    const honor=document.querySelector('#BuffHonor_'+i+' [data-remaked-buff]').getBoundingClientRect();
    const arrow=document.querySelector('#BuffClan_'+i+' .remaked-guild-chevron').getBoundingClientRect();
    values.push({guildTop:guild.top,honorTop:honor.top,guildHeight:guild.height,honorHeight:honor.height,
      arrowDelta: Math.abs(arrow.top+arrow.height/2-guild.top-guild.height/2)});
    }
    return values;
  });
  for(const [index,g] of geometry.entries()){
    expect(Math.abs(g.guildTop-g.honorTop),'row '+index).toBeLessThanOrEqual(1);
    expect(g.guildHeight).toBe(g.honorHeight);
    expect(g.arrowDelta).toBeLessThanOrEqual(4);
  }
});
test('phone retains a compact dropdown and a viewport-safe detached hover tip', async ({ page }) => {
  await page.setViewportSize({width:390,height:780});
  await page.goto('/?ui=ru');await openGuild(page);
  await hoverLevel(page,8,2);
  await expect(page.locator('[data-remaked-guild-tooltip]')).toContainText('1 жёлтый кристалл');
  for(const selector of ['[data-remaked-guild-popup]','[data-remaked-guild-tooltip]']){
    const box=await page.locator(selector).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(391);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y+box.height).toBeLessThanOrEqual(781);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-remaked-guild-popup]')).toHaveCount(0);
});
