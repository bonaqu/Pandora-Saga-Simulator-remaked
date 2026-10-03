import { expect } from '@playwright/test';

export async function assertWorkspaceFits(page, { expanded = false } = {}) {
  const width = page.viewportSize().width;
  const minimum = width <= 620 ? 44 : 28;
  const geometry = await page.evaluate(() => {
    const bounds = node => { const b = node.getBoundingClientRect(); return { top: b.top, left: b.left, right: b.right, width: b.width, height: b.height }; };
    const sections = [...document.querySelectorAll('[data-remaked-calculator-character], #SkillSet, #StatusView, [data-remaked-calculator-effects], [data-remaked-picker-section]')];
    const targets = [...document.querySelectorAll('[data-remaked-number], [data-remaked-skill-step]')].filter(node => node.checkVisibility());
    const labels = [...document.querySelectorAll('[data-remaked-calculator-pair] .input_lt, [id^="TextSkill_"]')].filter(node => node.checkVisibility());
    return {
      document: document.documentElement.scrollWidth,
      sections: sections.map(node => ({ id: node.id || node.tagName, ...bounds(node), client: node.clientWidth, scroll: node.scrollWidth })),
      targets: targets.map(node => ({ id: node.dataset.remakedNumber || node.dataset.remakedSkillStep, ...bounds(node) })),
      numbers: targets.filter(node => node.hasAttribute('data-remaked-number')).length,
      steps: targets.filter(node => node.hasAttribute('data-remaked-skill-step')).length,
      labels: labels.map(node => ({ id: node.id, ...bounds(node), parent: bounds(node.closest('[data-remaked-calculator-pair], [data-remaked-skill-row]')), client: node.clientWidth, scroll: node.scrollWidth })),
      rows: [...document.querySelectorAll('#SkillSet > [data-remaked-skill-row]')].map(node => Number(node.dataset.remakedSkillRow)),
      first: bounds(document.querySelector('[data-remaked-skill-row="0"]')),
      second: bounds(document.querySelector('[data-remaked-skill-row="6"]'))
    };
  });
  expect(geometry.document).toBeLessThanOrEqual(width + 1);
  expect(geometry.numbers).toBe(7);
  expect(geometry.steps).toBe(expanded ? 240 : 80);
  expect(geometry.rows).toEqual(Array.from({ length: 25 }, (_, i) => i));
  // One rendered snapshot and aggregate failures preserve every geometric
  // bound without thousands of tracing/IPC steps in the font/locale matrix.
  expect(geometry.sections.filter(box => box.left < 0 || box.right > width + 1 || box.scroll > box.client + 1)).toEqual([]);
  expect(geometry.targets.filter(box => box.width < minimum || box.height < minimum || box.left < 0 || box.right > width + 1)).toEqual([]);
  expect(geometry.labels.filter(box => box.left < box.parent.left - 1 || box.right > box.parent.right + 1 || box.scroll > box.client + 1)).toEqual([]);
  const { first, second } = geometry;
  if (width >= 1366) {
    expect(second.left).toBeGreaterThan(first.right);
    expect(second.top).toBe(first.top);
  } else expect(second.top).toBeGreaterThan(first.top);
}
