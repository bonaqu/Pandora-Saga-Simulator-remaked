import { test, expect } from '@playwright/test';

for (const width of [1440, 1920]) test(`complete desktop workspace brings Equipment into the first screen at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  const before = await page.evaluate(() => ({ build: PandoraRemaked.adapter.serialize(), equipment: JSON.stringify(EquipData), souls: JSON.stringify(SoulData), skills: JSON.stringify(Skill) }));
  const character = await page.locator('[data-remaked-calculator-character]').boundingBox();
  const skill = await page.locator('#SkillSet').boundingBox();
  const equipment = await page.locator('[data-remaked-picker-section]').boundingBox();
  expect(character.height).toBeLessThanOrEqual(600);
  expect(skill.height).toBeLessThanOrEqual(550);
  expect(equipment.y).toBeLessThanOrEqual(900);
  await expect(page.locator('[data-remaked-step]:visible')).toHaveCount(42);
  await expect(page.locator('[data-remaked-skill-step]:visible')).toHaveCount(80);
  const first = await page.locator('[data-remaked-skill-row="0"]').boundingBox();
  const second = await page.locator('[data-remaked-skill-row="6"]').boundingBox();
  expect(second.x).toBeGreaterThan(first.x + first.width);
  expect(second.y).toBe(first.y);
  for (const selector of ['[data-remaked-calculator-results]', '[data-remaked-calculator-effects]']) {
    const geometry = await page.locator(selector).evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
  }
  expect(await page.evaluate(() => ({ build: PandoraRemaked.adapter.serialize(), equipment: JSON.stringify(EquipData), souls: JSON.stringify(SoulData), skills: JSON.stringify(Skill) }))).toEqual(before);
  await page.screenshot({ path: testInfo.outputPath('desktop-workspace.png') });
});
