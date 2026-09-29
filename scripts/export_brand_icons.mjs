// Format exports of the existing vector icon, not newly generated artwork.
// Prerequisites: npm ci; npx playwright install chromium.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch();
try {
  for (const [size, source, target] of [
    [192, 'icon-192.svg', 'icon-192.png'],
    [512, 'icon-512.svg', 'icon-512.png'],
    [180, 'icon-512.svg', 'apple-touch-icon.png']
  ]) {
    const svg = await fs.readFile(path.join(root, 'modern', source));
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<body style="margin:0;background:#f4f6ed"><img width="${size}" height="${size}" src="data:image/svg+xml;base64,${svg.toString('base64')}" alt="">`);
    await page.locator('img').evaluate(image => image.decode());
    await page.screenshot({ path: path.join(root, 'modern', target), omitBackground: false });
    await page.close();
    console.log(`Exported ${target}: ${size}x${size}`);
  }
} finally { await browser.close(); }
