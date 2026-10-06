import { test, expect } from '@playwright/test';

test('Modern consolidates Builds and Compare in one header group without LOG FILE or inherited theme controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('workspace-desktop.png'), fullPage: true });
  const header = page.locator('[data-remaked-header]');
  await expect(header.locator('[data-remaked-tab]')).toHaveCount(5);
  await expect(header.getByRole('button', { name: 'LOG', exact: true })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'FILE', exact: true })).toHaveCount(0);
  await expect(header.locator('[data-remaked-density]')).toHaveCount(0);
  const builds = header.locator('[data-remaked-build-actions]');
  await expect(builds.locator('button')).toHaveCount(2);
  await expect(builds.locator('button').first()).toHaveCSS('border-radius', '0px');
  await expect(builds.locator('button').last()).toHaveCSS('border-radius', '0px');
  await expect(page.locator('[data-remaked-builds-open]')).toHaveCount(1);
  await expect(page.locator('[data-remaked-compare-open]')).toHaveCount(1);
  const before = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  await builds.locator('[data-remaked-builds-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-remaked-build-manager]')).toBeVisible(); await page.keyboard.press('Escape');
  await builds.locator('[data-remaked-compare-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-remaked-compare]')).toBeVisible(); await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(before);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const control of ['[data-remaked-builds-open]', '[data-remaked-compare-open]']) {
      const box = await header.locator(control).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
  }
});

test('desktop skill rows keep direct Adeptness input and read-only Potential compact without shrinking phone targets', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  const row = page.locator('[data-remaked-skill-row="1"]');
  const desktop = await row.boundingBox(); expect(desktop.height).toBeLessThanOrEqual(44);
  await expect(row.locator('[data-remaked-skill-group]')).toHaveCount(2);
  await expect(row.locator('[data-remaked-skill-number="1"]')).toHaveCount(1);
  await expect(row.locator('[data-remaked-skill-group="Potential"] button, [data-remaked-skill-group="Potential"] input')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const control = row.locator('[data-remaked-skill-number="1"]');
  const box = await control.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: testInfo.outputPath('workspace-mobile-header.png') });
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('workspace-mobile-skills.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('compact stat costs, native number fields and riding text stay visually centered', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const geometry = await page.evaluate(() => {
    function box(node) {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2 };
    }
    function textCenter(node, directTextOnly = false) {
      let target;
      if (directTextOnly) target = Array.from(node.childNodes).find(part => part.nodeType === Node.TEXT_NODE && part.textContent.trim());
      else target = Array.from(node.childNodes).find(part => part.nodeType === Node.TEXT_NODE && part.textContent.trim()) || node;
      const range = document.createRange();
      range.selectNodeContents(target);
      const rect = range.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }

    const sta = document.querySelector('[data-remaked-number="STA"]');
    const staCost = document.getElementById('StatusSTA_4');
    const skill = document.querySelector('[data-remaked-skill-number="1"]');
    const horseLabel = document.getElementById('Text_19');
    const horseValue = document.getElementById('Status_81');
    const horseBox = horseValue.closest('.input_gt');
    const percentNode = Array.from(horseBox.childNodes).find(part => part.nodeType === Node.TEXT_NODE && part.textContent.includes('%'));
    const percentRange = document.createRange(); percentRange.selectNodeContents(percentNode);
    const percentRect = percentRange.getBoundingClientRect();

    return {
      sta: { type: sta.type, step: sta.step, ...box(sta) },
      skill: { type: skill.type, step: skill.step, ...box(skill) },
      cost: { box: box(staCost), text: textCenter(staCost) },
      horseLabel: { box: box(horseLabel), text: textCenter(horseLabel) },
      horseValue: { box: box(horseBox), text: textCenter(horseValue) },
      horsePercentY: percentRect.y + percentRect.height / 2
    };
  });

  expect(geometry.sta.type).toBe('number');
  expect(geometry.skill.type).toBe('number');
  expect(geometry.sta.step).toBe('1');
  expect(geometry.skill.step).toBe('1');
  expect(geometry.sta.width).toBeCloseTo(44, 0);
  expect(geometry.skill.width).toBeCloseTo(52, 0);
  expect(Math.abs(geometry.cost.text.y - geometry.sta.cy)).toBeLessThanOrEqual(1.5);
  const statCost = page.locator('#StatusSTA_4');
  // The original translucent white input_lt2_2 fill composites over the
  // simulator's green base to this soft gray-green used color.
  await expect(statCost).toHaveCSS('background-color', 'rgb(231, 255, 213)');
  expect(Math.abs(geometry.horseLabel.text.y - geometry.horseLabel.box.cy)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(geometry.horseValue.text.y - geometry.horseValue.box.cy)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(geometry.horsePercentY - geometry.horseValue.box.cy)).toBeLessThanOrEqual(1.5);

  await page.evaluate(() => {
    Status.SPR[2] = 14;
    document.getElementById('StatusSPR_0').textContent = '54';
    PandoraRemaked.calculatorControls.refresh();
  });
  const spacing = await page.evaluate(() => {
    const total = document.querySelector('[data-remaked-number-total="SPR"]').getBoundingClientRect();
    const cost = document.getElementById('StatusSPR_4').getBoundingClientRect();
    return { totalRight: total.right, costLeft: cost.left };
  });
  expect(spacing.totalRight).toBeLessThanOrEqual(spacing.costLeft + 1);
});

test('Adeptness and Potential headings stay centered over their real value tracks', async ({ page }) => {
  await page.goto('/');
  for (const width of [861, 1024, 1280, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const offsets = await page.evaluate(() => {
      const header = document.querySelector('[data-remaked-skill-column-header]');
      const spans = header.querySelectorAll(':scope > span');
      function cx(node) {
        const rect = node.getBoundingClientRect();
        return rect.x + rect.width / 2;
      }
      function rowOffsets(rowIndex, adeptnessHeading, potentialHeading) {
        const row = document.querySelector(`[data-remaked-skill-row="${rowIndex}"]`);
        return {
          adeptness: Math.abs(cx(spans[adeptnessHeading]) - cx(row.querySelector('[data-remaked-skill-number]'))),
          potential: Math.abs(cx(spans[potentialHeading]) - cx(row.querySelector('[data-remaked-skill-potential-value]')))
        };
      }
      const first = rowOffsets(1, 1, 2);
      const copyVisible = getComputedStyle(spans[4]).display !== 'none';
      return { first, second: copyVisible ? rowOffsets(7, 4, 5) : null };
    });
    expect(offsets.first.adeptness, `Adeptness at ${width}`).toBeLessThanOrEqual(1.5);
    expect(offsets.first.potential, `Potential at ${width}`).toBeLessThanOrEqual(1.5);
    if (offsets.second) {
      expect(offsets.second.adeptness, `second Adeptness at ${width}`).toBeLessThanOrEqual(1.5);
      expect(offsets.second.potential, `second Potential at ${width}`).toBeLessThanOrEqual(1.5);
    }
  }
});

test('desktop character controls and results do not push equipment behind a tall card stack', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  const character = await page.locator('[data-remaked-calculator-character]').boundingBox();
  expect(character.height).toBeLessThanOrEqual(850);
  const equipment = await page.locator('#TextEquip_0').boundingBox();
  expect(equipment.y).toBeLessThanOrEqual(1200);
});

test('skill allocation help remains keyboard-accessible while obsolete Potential controls stay removed', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  await expect(page.locator('[data-remaked-skill-number]')).toHaveCount(20);
  await expect(page.locator('[data-remaked-skill-group="Potential"] button, [data-remaked-skill-group="Potential"] input')).toHaveCount(0);
  await expect(page.locator('[data-remaked-skill-bulk]')).toHaveCount(0);
  const help = page.locator('.remaked-skill-help');
  await expect(help.locator('p')).toBeHidden();
  await help.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(help.locator('p')).toBeVisible();
  await expect(help.locator('p')).toContainText('Adeptness');
  await page.keyboard.press('Enter'); await expect(help.locator('p')).toBeHidden();
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(before);
});

test('tablet-to-desktop transition preserves readable controls without clipping the work area', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  for (const width of [861, 1024, 1099, 1280, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const selector of ['[data-remaked-calculator-character]', '#SkillSet', '#StatusView', '[data-remaked-calculator-effects]', '[data-remaked-picker-section]']) {
      const geometry = await page.locator(selector).evaluate(node => ({ right: node.getBoundingClientRect().right, width: node.clientWidth, scroll: node.scrollWidth }));
      expect(geometry.right, selector + ' at ' + width).toBeLessThanOrEqual(width);
      expect(geometry.scroll, selector + ' at ' + width).toBeLessThanOrEqual(geometry.width + 1);
    }
  }
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(before);
});

test('direct skill numbers fit system-font fallbacks without wrapping a compact skill row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  for (const font of ['Arial, sans-serif', 'Verdana, sans-serif', 'Consolas, monospace']) {
    await page.addStyleTag({ content: `.remaked-modern { --rm-font: ${font}; }` });
    const row = page.locator('[data-remaked-skill-row="1"]');
    const layout = await row.evaluate(node => {
      const input = node.querySelector('[data-remaked-skill-number]');
      return { height: node.getBoundingClientRect().height, input: { width: input.clientWidth, height: input.getBoundingClientRect().height, font: getComputedStyle(input).font } };
    });
    expect(layout.height, JSON.stringify({ font, ...layout })).toBeLessThanOrEqual(44);
    expect(layout.input.width).toBeGreaterThanOrEqual(28);
    expect(layout.input.height).toBeGreaterThanOrEqual(28);
  }
});
