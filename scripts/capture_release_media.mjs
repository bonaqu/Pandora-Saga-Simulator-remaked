// Capture actual simulator screens in an isolated browser context.
// Usage: node scripts/capture_release_media.mjs <site-url> <expected-ui-version>
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2];
const expected = process.argv[3];
if (!base || !expected) throw new Error('Supply the site URL and expected UI version.');
const media = path.join(root, 'docs/assets/screenshots');
await fs.mkdir(media, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  async function open(viewport) {
    await page.setViewportSize(viewport);
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('[data-remaked-shell]').waitFor();
    const version = await page.evaluate(() => PandoraRemakedVersion.ui);
    if (version !== expected) throw new Error(`Expected UI ${expected}; got ${version}`);
  }
  await open({ width: 1200, height: 630 });
  await page.screenshot({ path: path.join(root, 'modern/social-preview.png') });
  await open({ width: 1440, height: 1000 });
  await page.locator('[data-remaked-equipment-search]').click();
  await page.locator('[data-remaked-search-panel]').waitFor();
  await page.locator('[data-remaked-search-panel]').screenshot({ path: path.join(media, 'equipment-search-desktop.png') });
  // Hovering/focusing a result can open its preview; Escape dismisses that
  // layer first. Close the search dialog explicitly before the next capture.
  await page.locator('.remaked-search-close').click();
  await page.locator('[data-remaked-search-backdrop]').waitFor({ state: 'hidden' });
  const ids = await page.evaluate(() => {
    const adapter = PandoraRemaked.adapter;
    const store = PandoraRemaked.buildStore;
    const active = adapter.serialize();
    const a = store.saveBuild('Baseline (example)', active);
    const race = document.getElementById('SelRace');
    race.selectedIndex = (race.selectedIndex + 1) % race.options.length;
    race.dispatchEvent(new Event('change', { bubbles: true }));
    const b = store.saveBuild('Different race (example)', adapter.serialize());
    adapter.load(active);
    if (!a.ok || !b.ok) throw new Error('Could not prepare example builds');
    return { a: a.build.id, b: b.build.id };
  });
  await page.locator('[data-remaked-compare-open]').click();
  await page.locator('[data-remaked-compare-a]').selectOption(ids.a);
  await page.locator('[data-remaked-compare-b]').selectOption(ids.b);
  await page.locator('[data-remaked-compare-table]').waitFor();
  await page.locator('[data-remaked-compare]').screenshot({ path: path.join(media, 'compare-builds-desktop.png') });
  await page.keyboard.press('Escape');
  await open({ width: 390, height: 844 });
  await page.locator('[data-remaked-builds-open]').click();
  await page.locator('[data-remaked-build-manager]').waitFor();
  await page.screenshot({ path: path.join(media, 'build-manager-mobile.png') });
  console.log(`Captured release media from ${base} — UI ${expected}; original game names, isolated example builds.`);
} finally { await browser.close(); }
