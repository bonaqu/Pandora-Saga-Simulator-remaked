import { test, expect } from '@playwright/test';

test('opening and Escape in the same task synchronously update every inspector and its opener', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const before = PandoraRemaked.adapter.serialize();
    const states = [0, 1, 2, 3, 4].map(tab => {
      const opener = document.querySelector('[data-remaked-tab="' + tab + '"]');
      const panel = document.querySelector('[data-remaked-native-panel="' + tab + '"]');
      opener.click();
      const opened = { flag: Flag[2], hidden: panel.hidden, expanded: opener.getAttribute('aria-expanded') };
      opener.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      const closed = { flag: Flag[2], hidden: panel.hidden, expanded: opener.getAttribute('aria-expanded'), focused: document.activeElement === opener };
      // Retain independent evidence for the next tab even if this one fails.
      if (Flag[2]) document.getElementById('Tab_' + tab + '_0').click();
      PandoraRemaked.calculatorControls.refresh();
      return { tab, opened, closed };
    });
    return { states, before, after: PandoraRemaked.adapter.serialize() };
  });
  for (const { tab, opened, closed } of result.states) {
    expect(opened, 'synchronous opening of tab ' + tab).toEqual({ flag: tab + 1, hidden: false, expanded: 'true' });
    expect(closed, 'immediate Escape of tab ' + tab).toEqual({ flag: 0, hidden: true, expanded: 'false', focused: true });
  }
  expect(result.after).toBe(result.before);
});

test('JOB retains two readable selection columns; disabled SKILL explains and enables the native list', async ({ page }, testInfo) => {
  await page.goto('/'); const before = await page.evaluate(() => Store());
  await page.locator('[data-remaked-tab="0"]').click();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const race = await page.locator('#SelRace').boundingBox(), job = await page.locator('#SelJob').boundingBox();
    const card = await page.locator('[data-remaked-native-panel="0"] .sub_win').boundingBox();
    expect(job.x).toBeGreaterThanOrEqual(race.x + race.width);
    expect(Math.abs(race.y - job.y)).toBeLessThanOrEqual(1);
    expect(job.x + job.width).toBeGreaterThanOrEqual(card.x + card.width - 10);
    expect(await page.locator('#SelJob').evaluate(node => node.clientHeight >= node.scrollHeight || node.size > 1)).toBe(true);
  }
  expect(await page.evaluate(() => Store())).toBe(before);
  await page.locator('[data-remaked-tab="1"]').click();
  const prompt = page.locator('[data-remaked-skill-list-prompt]'); await expect(prompt).toBeVisible();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const textBounds = await prompt.locator('p').evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth }));
    expect(textBounds.scroll).toBeLessThanOrEqual(textBounds.width + 1);
    const panelBounds = await page.locator('[data-remaked-native-panel="1"]').boundingBox(), promptBounds = await prompt.boundingBox();
    expect(promptBounds.x + promptBounds.width).toBeLessThanOrEqual(panelBounds.x + panelBounds.width);
  }
  await prompt.getByRole('button').click(); await expect(prompt).toBeHidden();
  expect(await page.evaluate(() => Flag[3])).toBe(1);
  await expect(page.locator('#LearnView [id^="LearnSkillIcon_"]').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('enabled-skill-popup-1440.png') });
});

test('attack labels have readable contrast and all five buff columns use actual desktop space', async ({ page }) => {
  await page.goto('/'); await page.locator('[data-remaked-tab="2"]').click();
  const colors = await page.locator('[data-remaked-inspector-stat] .input_lt').first().evaluate(node => {
    const rgb = color => color.match(/\d+/g).slice(0, 3).map(value => { const n = Number(value) / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
    const luminance = values => values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    const foreground = luminance(rgb(getComputedStyle(node).color)), background = luminance(rgb(getComputedStyle(node.closest('[data-remaked-inspector-stat]').firstElementChild).backgroundColor));
    return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
  });
  expect(colors).toBeGreaterThanOrEqual(4.5);
  await page.locator('[data-remaked-tab="4"]').click();
  const columns = page.locator('[data-remaked-buff-column]'); await expect(columns).toHaveCount(5);
  const boxes = await page.evaluate(() => Array.from(document.querySelectorAll('[data-remaked-buff-column]')).map(node => { const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, right: rect.right, width: rect.width }; }));
  for (let index = 1; index < boxes.length; index++) {
    expect(boxes[index].x).toBeGreaterThanOrEqual(boxes[index - 1].right);
    expect(Math.abs(boxes[index].y - boxes[0].y)).toBeLessThanOrEqual(2);
  }
  expect(boxes.every(box => box.width > 80)).toBe(true);
});

for (const [group,widths] of [
  ['mobile and tablet',[320,390,768]],
  ['desktop',[1366,1440,1920]],
]) test('all five inspectors float without shifting the workbench — '+group, async ({ page }, testInfo) => {
  test.setTimeout(90000); await page.goto('/');
  await page.evaluate(() => { StatusMove('Lev', 54); CalcSet('Lev'); });
  const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('[data-remaked-tools]')).toHaveCount(0);
    const restingCharacter = await page.locator('[data-remaked-calculator-character]').boundingBox();
    for (const tab of [0, 1, 2, 3, 4]) {
      const opener = page.locator('[data-remaked-tab="' + tab + '"]'); await opener.click();
      const panel = page.locator('[data-remaked-native-panel="' + tab + '"]');
      await expect(panel).toBeVisible(); await expect(opener).toHaveAttribute('aria-expanded', 'true');
      const bounds = await panel.boundingBox(), character = await page.locator('[data-remaked-calculator-character]').boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.height).toBeLessThanOrEqual(650);
      await expect(panel).toHaveAttribute('role', 'dialog');
      await expect(panel).toHaveAttribute('aria-modal', 'false');
      expect(character.y).toBe(restingCharacter.y);
      expect(await panel.evaluate(node => getComputedStyle(node).position)).toBe('fixed');
      const surface = await panel.locator('.sub_win').evaluate(node => {
        const css = getComputedStyle(node), channels = css.backgroundColor.match(/[\d.]+/g).map(Number);
        return { alpha: channels.length === 4 ? channels[3] : 1, opacity: Number(css.opacity) };
      });
      expect(surface.alpha, 'Popup content must not mix with the calculator underneath').toBe(1);
      expect(surface.opacity).toBe(1);
      expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
      await opener.click(); await expect(panel).toBeHidden();
      await opener.click(); await expect(panel).toBeVisible();
      await opener.press('Escape'); await expect(panel).toBeHidden(); await expect(opener).toBeFocused();
      await opener.click(); await expect(panel).toBeVisible();
      await panel.locator('[data-remaked-panel-close]').focus(); await page.keyboard.press('Escape');
      await expect(panel).toBeHidden(); await expect(opener).toBeFocused();
      await opener.click(); await expect(panel).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (width === 1440 || width === 390) await page.screenshot({ path: testInfo.outputPath('panel-' + tab + '-' + width + '.png') });
      await panel.locator('[data-remaked-panel-close]').focus(); await page.keyboard.press('Enter');
      await expect(panel).toBeHidden(); await expect(opener).toBeFocused(); await expect(opener).toHaveAttribute('aria-expanded', 'false');
    }
  }
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before);
});

test('buff parameter labels and fields share row height and alignment across languages and widths', async ({ page }, testInfo) => {
  await page.goto('/'); await page.locator('[data-remaked-tab="4"]').click();
  const before = await page.evaluate(() => Store());
  for (const language of ['EN', 'RU', 'JP', 'TW']) {
    await page.getByRole('button', { name: language, exact: true }).click();
    for (const width of [320, 390, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const index of [0, 1, 2]) {
        // Responsive discovery moves asynchronously between PC and phone.
        // Measure the pair in one layout, not on opposite sides of that move.
        const { label, input } = await page.evaluate(index => {
          const bounds = node => { const rect = node.getBoundingClientRect(); return { y: rect.y, height: rect.height }; };
          return { label: bounds(document.getElementById('Text_' + (21 + index))), input: bounds(document.getElementById('InBuff_' + index)) };
        }, index);
        expect(Math.abs(label.height - input.height), JSON.stringify({ width, language, index, label, input })).toBeLessThanOrEqual(1);
        expect(Math.abs(label.y - input.y), JSON.stringify({ width, language, index, label, input })).toBeLessThanOrEqual(1);
        expect(input.height).toBeGreaterThanOrEqual(width <= 620 ? 44 : 28);
        await expect(page.locator('#InBuff_' + index)).toHaveAccessibleName(await page.locator('#Text_' + (21 + index)).innerText());
      }
      if (language === 'EN' && (width === 390 || width === 1440)) await page.screenshot({ path: testInfo.outputPath('buff-alignment-' + width + '.png') });
    }
  }
  expect(await page.evaluate(() => Store())).toBe(before);
});

test('native buff controls activate once by keyboard and keep their source labels through language changes', async ({ page }) => {
  await page.goto('/'); await page.locator('[data-remaked-tab="4"]').click();
  const action = page.locator('[data-remaked-buff="0_7"]');
  await expect(action).toHaveAttribute('aria-pressed', 'false');
  const original = await page.evaluate(() => { document.getElementById('Buff_0_7').click(); var expected = Status.ATK; document.getElementById('Buff_0_7').click(); return expected; });
  await action.focus(); await page.keyboard.press('Enter');
  await expect(action).toHaveAttribute('aria-pressed', 'true'); expect(await page.evaluate(() => Status.ATK)).toEqual(original);
  for (const language of ['JP', 'TW', 'EN', 'RU']) {
    await page.getByRole('button', { name: language, exact: true }).click(); await expect(action).toBeVisible(); await expect(action).toHaveAttribute('aria-pressed', 'true');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await action.boundingBox(); expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
});

test('Builds and Compare remain bounded native modal dialogs with a reachable close action', async ({ page }, testInfo) => {
  await page.goto('/'); const before = await page.evaluate(() => PandoraRemaked.adapter.serialize());
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [opener, overlay] of [['[data-remaked-builds-open]', '[data-remaked-build-manager]'], ['[data-remaked-compare-open]', '[data-remaked-compare]']]) {
      await page.locator(opener).click(); const dialog = page.locator(overlay); await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox(); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1); expect(box.y + box.height).toBeLessThanOrEqual(845);
      if (width === 1440 || width === 390) await page.screenshot({ path: testInfo.outputPath((overlay.includes('compare') ? 'compare' : 'builds') + '-' + width + '.png') });
      await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(page.locator(opener)).toBeFocused();
    }
  }
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(before);
});
