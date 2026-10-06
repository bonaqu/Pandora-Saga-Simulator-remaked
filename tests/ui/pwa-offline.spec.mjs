import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { startStaticServer } from '../../scripts/lib/legacy-runtime.mjs';
import { createPublishedFixture, publishedLocaleFingerprints } from './helpers/published-fixture.mjs';

test('installed Modern and Legacy routes boot offline without changing the build', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const payload = await page.evaluate(() => window.Store());

  try {
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-remaked-shell]')).toBeVisible();
    const modern = await page.evaluate(() => ({
      store: typeof window.Store,
      calc: typeof window.CalcSet,
      payload: window.Store()
    }));
    expect(modern.store).toBe('function');
    expect(modern.calc).toBe('function');
    expect(modern.payload).toBe(payload);

    const optionalIcon = await page.evaluate(async () => {
      try {
        const response = await fetch('./image/icon/not-cached.png');
        return { resolved: true, ok: response.ok };
      } catch (error) {
        return { resolved: false, ok: false };
      }
    });
    expect(optionalIcon.ok).toBe(false);
    await expect(page.locator('[data-remaked-shell]')).toBeVisible();

    await page.goto('/legacy/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#body')).toHaveCount(1);
    await expect(page.locator('#Tab_0_0')).toBeVisible();
    const legacy = await page.evaluate(() => ({
      store: typeof window.Store,
      calc: typeof window.CalcSet
    }));
    expect(legacy.store).toBe('function');
    expect(legacy.calc).toBe('function');
  } finally {
    await context.setOffline(false);
  }
});

test('translation-only artifact update activates automatically and reaches an existing offline installation', async ({ page, context }) => {
  const originalLocales = await publishedLocaleFingerprints();
  const fixture = await test.step('Copy isolated published artifact', () => createPublishedFixture(test.info()));
  const site = fixture.site;
  const server = await startStaticServer(site);
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    await page.goto(url);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await page.locator('[data-remaked-ui-locale="ru"]').click();
    const before = await page.evaluate(() => ({ payload: window.Store(), version: window.PandoraRemakedVersion.ui }));

    // Stage a next-generation HTML file with a visible marker. index.html is a
    // hardlink in this fixture, so replace it copy-on-write instead of editing
    // the shared _site inode.
    const indexPath = path.join(site, 'index.html');
    const indexSource = await fs.readFile(indexPath, 'utf8');
    const nextIndexPath = indexPath + '.next';
    await fs.writeFile(
      nextIndexPath,
      indexSource.replace('</body>', '<div data-remaked-generation-marker="next">next generation</div></body>')
    );
    await fs.rename(nextIndexPath, indexPath);

    const catalogPath = path.join(site, 'modern/locales.js');
    const source = await fs.readFile(catalogPath, 'utf8');
    const catalogs = JSON.parse(source.split('Object.freeze(')[1].replace(/\);\s*$/, ''));
    catalogs.ru['header.project'] = 'Проверка обновления из таблицы';
    await fs.writeFile(catalogPath, 'window.PandoraRemakedLocales = Object.freeze(' + JSON.stringify(catalogs) + ');\n');

    // The old active worker must keep serving its complete old generation even
    // though newer HTML/assets already exist on the server.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-remaked-generation-marker]')).toHaveCount(0);
    await expect(page.locator('[data-remaked-header]')).not.toContainText('Проверка обновления из таблицы');

    execFileSync(process.env.PYTHON || 'python', [
      '-c',
      'import pathlib,sys; from scripts.build_pages import _materialize_service_worker; _materialize_service_worker(pathlib.Path.cwd(), pathlib.Path(sys.argv[1]))',
      site
    ]);
    expect(await publishedLocaleFingerprints()).toEqual(originalLocales);

    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await expect(page.locator('[data-remaked-generation-marker]')).toHaveCount(1);
    await expect(page.locator('[data-remaked-header]')).toContainText('Проверка обновления из таблицы');
    const after = await page.evaluate(() => ({ payload: window.Store(), version: window.PandoraRemakedVersion.ui }));
    expect(after).toEqual(before);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-remaked-header]')).toContainText('Проверка обновления из таблицы');
    expect(await page.evaluate(() => window.Store())).toBe(before.payload);
  } finally {
    await context.setOffline(false);
    await page.goto('about:blank');
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await fixture.cleanup();
  }
});
