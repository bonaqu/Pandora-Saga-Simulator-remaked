import { expect } from '@playwright/test';

export async function assertWorkspaceFits(page, { expanded = false } = {}) {
  const width = page.viewportSize().width;
  const minimum = width <= 620 ? 44 : 28;
  await expect(page.locator('[data-remaked-step]:visible')).toHaveCount(42);
  await expect(page.locator('[data-remaked-skill-step]:visible')).toHaveCount(expanded ? 240 : 80);
  const geometry = await page.evaluate(() => {
    const bounds = node => { const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width, height: b.height }; };
    const sections = [...document.querySelectorAll('[data-remaked-calculator-character], #SkillSet, #StatusView, [data-remaked-calculator-effects], [data-remaked-picker-section]')];
    const targets = [...document.querySelectorAll('[data-remaked-step], [data-remaked-skill-step]')].filter(node => node.checkVisibility());
    const labels = [...document.querySelectorAll('[data-remaked-calculator-pair] .input_lt, [id^="TextSkill_"]')].filter(node => node.checkVisibility());
    return {
      document: document.documentElement.scrollWidth,
      sections: sections.map(node => ({ id: node.id || node.tagName, ...bounds(node), client: node.clientWidth, scroll: node.scrollWidth })),
      targets: targets.map(node => ({ id: node.dataset.remakedStep || node.dataset.remakedSkillStep, ...bounds(node) })),
      labels: labels.map(node => ({ id: node.id, ...bounds(node), parent: bounds(node.closest('[data-remaked-calculator-pair], [data-remaked-skill-row]')), client: node.clientWidth, scroll: node.scrollWidth })),
      rows: [...document.querySelectorAll('#SkillSet > [data-remaked-skill-row]')].map(node => Number(node.dataset.remakedSkillRow))
    };
  });
  expect(geometry.document).toBeLessThanOrEqual(width + 1);
  expect(geometry.rows).toEqual(Array.from({ length: 25 }, (_, i) => i));
  for (const box of geometry.sections) {
    expect(box.left, box.id).toBeGreaterThanOrEqual(0);
    expect(box.right, box.id).toBeLessThanOrEqual(width + 1);
    expect(box.scroll, box.id).toBeLessThanOrEqual(box.client + 1);
  }
  for (const box of geometry.targets) {
    expect(box.width, box.id).toBeGreaterThanOrEqual(minimum);
    expect(box.height, box.id).toBeGreaterThanOrEqual(minimum);
    expect(box.left, box.id).toBeGreaterThanOrEqual(0);
    expect(box.right, box.id).toBeLessThanOrEqual(width + 1);
  }
  for (const box of geometry.labels) {
    expect(box.left, box.id).toBeGreaterThanOrEqual(box.parent.left - 1);
    expect(box.right, box.id).toBeLessThanOrEqual(box.parent.right + 1);
    expect(box.scroll, box.id).toBeLessThanOrEqual(box.client + 1);
  }
  const first = await page.locator('[data-remaked-skill-row="0"]').boundingBox();
  const second = await page.locator('[data-remaked-skill-row="6"]').boundingBox();
  if (width >= 1366) {
    expect(second.x).toBeGreaterThan(first.x + first.width);
    expect(second.y).toBe(first.y);
  } else expect(second.y).toBeGreaterThan(first.y);
}
