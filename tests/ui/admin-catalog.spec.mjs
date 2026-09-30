import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { adminCatalog } from '../../admin-api/src/catalog.mjs';

const admin = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
async function openConsole(page) {
  // Only synthetic in-memory sessions. Never read the real administrator's
  // credential file in trace-enabled repository tests.
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/0002_catalog.sql', import.meta.url), 'utf8'));
  const DB = { prepare(sql) {
    let values = [];
    return { bind(...params) { values = params; return this; },
      async first() { return sqlite.prepare(sql).get(...values) || null; },
      async run() { return { meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; },
      async all() { return { results: sqlite.prepare(sql).all(...values) }; }
    };
  }, async batch(statements) {
    sqlite.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
  await page.route(admin + '/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (path === '/api/session') return route.fulfill({ json: { ok: true, username: 'admin', csrfToken: 'synthetic-test-csrf-only', expiresAt: 9999999999 } });
    if (path === '/api/auth/logout') return route.fulfill({ json: { ok: true } });
    if (path.startsWith('/api/admin/')) {
      if (request.method() === 'POST') expect(request.headers()['x-csrf-token']).toBe('synthetic-test-csrf-only');
      try {
        const response = await adminCatalog(new Request(request.url(), { method: request.method(), headers: request.headers(), body: request.postData() || undefined }), { DB });
        return route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
      } catch (error) { return route.fulfill({ status: error.status || 503, json: { ok: false, message: error.message } }); }
    }
    const asset = path === '/admin' ? 'admin.html' : path.slice(1);
    if (!['admin.html', 'admin.css', 'admin.js', 'catalog-ui.js'].includes(asset)) return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: asset.endsWith('.css') ? 'text/css' : asset.endsWith('.js') ? 'text/javascript' : 'text/html', body: fs.readFileSync(new URL('../../admin-api/public/' + asset, import.meta.url), 'utf8') });
  });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(admin + '/admin');
  await expect(page.getByRole('heading', { name: 'GOD MODE ENABLED / WELCOME, ADMIN' })).toBeVisible();
  await expect(page.locator('#catalog-state')).toContainText('Каталог загружен');
  return { sqlite, errors };
}

test('admin edits actual source item, saves private draft, publishes and restores a revision', async ({ page }) => {
  const { sqlite, errors } = await openConsole(page);
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('equipment.0.1');
  await page.locator('.catalog-entry').first().click();
  await expect(page.locator('.catalog-editor')).toContainText('equipment.0.1');
  await page.locator('[data-field="names"][data-language="en"]').fill('Edited sword');
  await page.getByRole('button', { name: 'Добавить характеристику', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Значение', exact: true }).fill('7');
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(0);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Опубликована версия каталога 1');
  expect(JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head').get().snapshot_json)[0].edit.effects[0].value).toBe(7);
  await page.getByRole('button', { name: 'История / откат' }).click();
  await page.getByRole('button', { name: 'Восстановить #0', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Восстановлено как новая версия 2');
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n).toBe(2);
  expect(errors).toEqual([]);
});

test('new armor and Soul use numeric controls and multilingual literal text, including mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { sqlite, errors } = await openConsole(page);
  await page.getByRole('button', { name: 'Новая запись', exact: true }).click();
  await page.locator('[data-field="category"]').selectOption('30');
  await expect(page.locator('[data-field="baseAttack"]')).toHaveCount(0);
  await page.locator('[data-field="names"][data-language="en"]').fill('New armor');
  await page.locator('[data-field="names"][data-language="ru"]').fill('<img src=x onerror=alert(1)>');
  await page.locator('[data-field="sockets"]').fill('3');
  await page.getByRole('button', { name: 'Добавить характеристику', exact: true }).click();
  await page.getByRole('combobox', { name: 'Характеристика', exact: true }).selectOption('49');
  await page.getByRole('spinbutton', { name: 'Значение', exact: true }).fill('15');
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('New armor');
  await expect(page.locator('.catalog-entry').filter({ hasText: '<img src=x onerror=alert(1)>' })).toHaveCount(1);
  await expect(page.locator('#catalog-console img')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('soul');
  await page.getByRole('button', { name: 'Новая запись', exact: true }).click();
  await page.locator('[data-field="names"][data-language="en"]').fill('New Soul');
  await page.getByRole('button', { name: 'Добавить характеристику', exact: true }).click();
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_allocations').get().n).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('failed save preserves entered fields and logout clears the private editor without browser storage', async ({ page }) => {
  await openConsole(page);
  await page.locator('.catalog-entry').first().click();
  await page.locator('[data-field="names"][data-language="en"]').fill('Unsaved name');
  await page.route(admin + '/api/admin/draft', route => route.fulfill({ status: 409, json: { ok: false, message: 'Draft changed in another tab' } }));
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Несохранённые поля оставлены');
  await expect(page.locator('[data-field="names"][data-language="en"]')).toHaveValue('Unsaved name');
  await page.getByRole('button', { name: 'LOGOUT', exact: true }).click();
  await expect(page.locator('#auth-message')).toHaveText('GOD MODE DISABLED');
  await expect(page.locator('#catalog-console')).toBeEmpty();
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});
