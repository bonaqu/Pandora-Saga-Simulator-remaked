import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { adminCatalog } from '../../admin-api/src/catalog.mjs';

const admin = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';

test('an origin-denied login explains the safe retry without showing or storing credentials', async ({ page }) => {
  await page.route(admin + '/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/session') return route.fulfill({ status: 401, json: { ok: false } });
    const asset = path === '/admin' ? 'admin.html' : path.slice(1);
    if (!['admin.html', 'admin.css', 'admin.js', 'catalog-ui.js'].includes(asset)) return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: asset.endsWith('.css') ? 'text/css' : asset.endsWith('.js') ? 'text/javascript' : 'text/html', body: fs.readFileSync(new URL('../../admin-api/public/' + asset, import.meta.url), 'utf8') });
  });
  await page.goto(admin + '/admin?status=origin');
  await expect(page.locator('#auth-message')).toContainText('CHEAT FAILED / ACCESS DENIED');
  await expect(page.locator('#auth-message')).toContainText('production simulator or this secure page');
  await expect(page.locator('#auth-message')).toContainText('your password has not changed');
  await expect(page.locator('#login-form')).toBeVisible();
  await expect(page.locator('#admin-workspace')).toBeHidden();
  await expect(page.locator('#password')).toHaveValue('');
  expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).toBe('[{},{}]');
});

async function openConsole(page) {
  // Only synthetic in-memory sessions. Never read the real administrator's
  // credential file in trace-enabled repository tests.
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0002_catalog.sql', '0003_skill_variants.sql']) sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/' + name, import.meta.url), 'utf8'));
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

test('editor shows live values and a private server preview before explicit save and publication', async ({ page }, testInfo) => {
  const { sqlite, errors } = await openConsole(page);
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('equipment.0.1');
  await page.locator('.catalog-entry').first().click();
  const live = page.locator('[data-current-record]'), preview = page.locator('[data-preview-record]');
  await expect(live).toContainText('Базовая атака оружия: 5');
  await expect(page.locator('[data-editor-workflow]')).toContainText('Черновик');
  await expect(page.locator('[data-field="names"][data-language="jp"]')).toBeHidden();
  const japanese = await page.locator('[data-field="names"][data-language="jp"]').inputValue();
  await page.getByRole('button', { name: 'Добавить характеристику', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Значение', exact: true }).fill('7');
  await page.getByRole('button', { name: 'Проверить изменения', exact: true }).click();
  await expect(preview).toContainText('Сила (СИЛ / STR): +7');
  await expect(live).not.toContainText('Сила');
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n).toBe(0);
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(0);
  await page.getByRole('spinbutton', { name: 'Значение', exact: true }).fill('8');
  await expect(preview).toContainText('Изменения ещё не проверены');
  await expect(preview).not.toContainText('+7');
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  await expect(live).toContainText('Базовая атака оружия: 5');
  await expect(page.locator('[data-field="names"][data-language="jp"]')).toHaveValue(japanese);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Опубликована версия каталога 1');
  await expect(live).toContainText('Сила (СИЛ / STR): +8');
  const footerFits = async () => page.locator('.catalog-editor').evaluate(form => {
    const actions = form.querySelector('.editor-actions'), previous = actions.previousElementSibling;
    return { positioned: getComputedStyle(actions).position, gap: actions.getBoundingClientRect().top - previous.getBoundingClientRect().bottom };
  });
  expect(await footerFits()).toMatchObject({ positioned: 'static' });
  expect((await footerFits()).gap).toBeGreaterThanOrEqual(0);
  await page.screenshot({ path: testInfo.outputPath('current-and-preview-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await footerFits()).toMatchObject({ positioned: 'static' });
  expect((await footerFits()).gap).toBeGreaterThanOrEqual(0);
  await page.screenshot({ path: testInfo.outputPath('current-and-preview-mobile.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('racial and skill editors expose current descriptions, numbers and calculation limits', async ({ page }) => {
  const { errors } = await openConsole(page);
  for (const [kind, id, text] of [['racial', 'racial_skill.4.0', 'Получаемый физический урон −10%'], ['active', 'skill_entry.0.0', 'Стоимость MP'], ['passive', 'skill_entry.0.1', 'Исходная механика']]) {
    await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption(kind);
    await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill(id);
    await page.locator('.catalog-entry').first().click();
    await expect(page.locator('[data-current-record]')).toContainText(text);
    await expect(page.getByRole('button', { name: 'Проверить изменения', exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('current characteristics show the unresolved Waist Belt marker as a warning, never a fabricated zero bonus', async ({ page }) => {
  const { errors } = await openConsole(page);
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('equipment.42.32');
  await page.locator('.catalog-entry').first().click();
  const live = page.locator('[data-current-record]');
  await expect(live).toContainText('Выносливость (ВЫН / STA): +1');
  await expect(live).toContainText('Исходный маркер: -7. Числовой эффект не подтверждён.');
  await expect(live).not.toContainText('Legacy #-7: 0');
  expect(errors).toEqual([]);
});

test('cancelling a catalog switch and a failed preview preserve unsaved fields and the selected record', async ({ page }) => {
  const { sqlite, errors } = await openConsole(page);
  const entry = page.locator('.catalog-entry').first(); await entry.click();
  await expect(entry).toHaveAttribute('aria-current', 'true');
  const name = page.locator('[data-field="names"][data-language="en"]'); await name.fill('My unsaved sword');
  page.on('dialog', dialog => dialog.dismiss());
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('racial');
  await expect(page.getByRole('combobox', { name: 'Каталог', exact: true })).toHaveValue('equipment');
  await expect(name).toHaveValue('My unsaved sword');
  await page.route(admin + '/api/admin/preview', route => route.fulfill({ status: 409, json: { ok: false, message: 'Catalog changed in another tab; reload before previewing' } }));
  await page.getByRole('button', { name: 'Проверить изменения', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Catalog changed');
  await expect(page.locator('#catalog-console')).not.toHaveAttribute('inert', '');
  await expect(name).toHaveValue('My unsaved sword');
  await expect(page.locator('[data-preview-record]')).not.toContainText('Проверено сервером');
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n).toBe(0);
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(0); expect(errors).toEqual([]);
});

for (const kind of ['active', 'passive']) test(`administrator creates a distinct ${kind} variant from a source skill with private save and explicit publish`, async ({ page }, testInfo) => {
  const { sqlite, errors } = await openConsole(page);
  const sourceId = kind === 'active' ? 'skill_entry.0.0' : 'skill_entry.0.1';
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption(kind);
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill(sourceId);
  await page.locator('.catalog-entry').first().click();
  await expect(page.locator('.catalog-editor .item-identity').first()).toContainText(sourceId);
  const original = await page.locator('.catalog-editor [data-field="names"][data-language="en"]').inputValue();
  await page.getByRole('button', { name: 'Создать новый навык по этому шаблону', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.catalog-editor [data-skill-template]')).toContainText(sourceId);
  await expect(page.locator('#catalog-state')).toContainText('Исходный навык не изменён');
  await page.locator('.catalog-editor [data-field="names"][data-language="en"]').fill('New <img src=x> variant');
  await page.locator('.catalog-editor [data-field="names"][data-language="ru"]').fill('Новый вариант');
  if (kind === 'active') await page.locator('[data-field="mpCost"]').fill('25');
  else {
    await page.getByRole('button', { name: 'Добавить характеристику', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Значение', exact: true }).fill('5');
  }
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  const row = sqlite.prepare('SELECT * FROM catalog_skill_allocations').get();
  expect(row.template_id).toBe(sourceId); expect(row.id).not.toBe(sourceId);
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(0);
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts WHERE id = ?').get(sourceId).n).toBe(0);
  await expect(page.locator('.catalog-editor h3')).toHaveText('New <img src=x> variant');
  expect(await page.locator('.catalog-editor h3 img').count()).toBe(0);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Опубликована версия каталога 1');
  const entry = JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head').get().snapshot_json)[0];
  expect(entry.identity.templateId).toBe(sourceId); expect(entry.identity.id).toBe(row.id);
  expect(entry.edit.names.en).toBe('New <img src=x> variant');
  await page.screenshot({ path: testInfo.outputPath('skill-variant-' + kind + '-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('skill-variant-' + kind + '-mobile.png'), fullPage: true });
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill(sourceId);
  await page.locator('.catalog-entry').first().click();
  await expect(page.locator('.catalog-editor [data-field="names"][data-language="en"]')).toHaveValue(original);
  expect(errors).toEqual([]);
});

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

test('class editor saves and publishes typed native progression, without pretending new class lineage is supported', async ({ page }, testInfo) => {
  const { sqlite, errors } = await openConsole(page);
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('class');
  await expect(page.getByRole('button', { name: 'Новая запись', exact: true })).toBeDisabled();
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('job.0');
  await page.locator('.catalog-entry').first().click();
  await expect(page.locator('.catalog-editor')).toContainText('job.0');
  await expect(page.getByRole('button', { name: 'Создать вариант', exact: true })).toHaveCount(0);
  await page.locator('[data-field="names"][data-language="en"]').fill('Edited Warrior');
  await page.locator('[data-field="progression0"]').fill('198');
  await page.locator('[data-field="progression2"]').fill('0');
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n).toBe(0);
  await page.locator('[data-field="progression2"]').fill('10');
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(0);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Опубликована версия каталога 1');
  const published = JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head').get().snapshot_json)[0];
  expect(published.edit.progression[0]).toBe(198); expect(published.edit.progression[2]).toBe(10);
  expect(published.identity.id).toBe('job.0');
  await page.screenshot({ path: testInfo.outputPath('class-editor-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('class-editor-mobile.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('racial editor publishes explicit typed replacement as a private draft first, without gear-only controls', async ({ page }, testInfo) => {
  const { sqlite, errors } = await openConsole(page);
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('racial');
  await expect(page.getByRole('button', { name: 'Новая запись', exact: true })).toBeDisabled();
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('racial_skill.0.2');
  await page.locator('.catalog-entry').first().click();
  await expect(page.locator('.catalog-editor')).toContainText('Раса: Human');
  await expect(page.locator('[data-field="sockets"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Создать вариант', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Добавить характеристику', exact: true }).click();
  await expect(page.locator('[data-field="effectMode"]')).toHaveValue('add');
  await page.locator('[data-field="effectMode"]').selectOption('replace');
  await page.getByRole('combobox', { name: 'Характеристика', exact: true }).selectOption('8');
  await page.getByRole('spinbutton', { name: 'Значение', exact: true }).fill('20');
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(0);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Опубликована версия каталога 1');
  const published = JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head').get().snapshot_json)[0];
  expect(published.edit.effects).toEqual([{ stat: 8, value: 20, unit: 'flat' }]); expect(published.edit.effectMode).toBe('replace');
  expect(published.identity.id).toBe('racial_skill.0.2');
  await page.screenshot({ path: testInfo.outputPath('racial-editor-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('racial-editor-mobile.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('late item response cannot replace a newer selection, and saving freezes fields instead of discarding later typing', async ({ page }) => {
  const { errors } = await openConsole(page);
  let releaseItem; const itemGate = new Promise(resolve => { releaseItem = resolve; });
  await page.route(admin + '/api/admin/item**', async route => {
    if (new URL(route.request().url()).searchParams.get('id') === 'equipment.0.1') await itemGate;
    await route.fallback();
  });
  await page.locator('.catalog-entry').first().click();
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('equipment.0.2');
  await page.locator('.catalog-entry').first().click();
  await expect(page.locator('.catalog-editor .item-identity')).toContainText('equipment.0.2');
  releaseItem(); await page.waitForTimeout(150);
  await expect(page.locator('.catalog-editor .item-identity')).toContainText('equipment.0.2');
  let releaseSave; const saveGate = new Promise(resolve => { releaseSave = resolve; });
  await page.route(admin + '/api/admin/draft', async route => { await saveGate; await route.fallback(); });
  await page.locator('[data-field="names"][data-language="en"]').fill('Saved selection');
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-console')).toHaveAttribute('inert', '');
  releaseSave(); await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  await expect(page.locator('#catalog-console')).not.toHaveAttribute('inert', '');
  await expect(page.locator('[data-field="names"][data-language="en"]')).toHaveValue('Saved selection');
  expect(errors).toEqual([]);
});

test('active and passive editors expose distinct real fields and publish their own typed data', async ({ page }, testInfo) => {
  const { sqlite, errors } = await openConsole(page);
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('active');
  await expect(page.getByRole('button', { name: 'Новая запись', exact: true })).toBeDisabled();
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('skill_entry.0.0');
  await page.locator('.catalog-entry').first().click();
  await expect(page.locator('.catalog-editor')).toContainText('Warrior Lv5');
  await page.locator('[data-field="mpCost"]').fill('25'); await page.locator('[data-field="castSeconds"]').fill('1.25');
  await expect(page.getByRole('button', { name: 'Добавить характеристику', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён'); page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click(); await expect(page.locator('#catalog-state')).toContainText('Опубликована версия каталога 1');
  await page.screenshot({ path: testInfo.outputPath('active-editor-desktop.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('passive');
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('skill_entry.1.6');
  await page.locator('.catalog-entry').first().click();
  await expect(page.locator('.catalog-editor')).toContainText('Sword, Knife');
  await expect(page.locator('[data-field="mpCost"]')).toHaveCount(0);
  await expect(page.locator('[data-weapon-category="0"]')).toBeChecked(); await expect(page.locator('[data-weapon-category="6"]')).toBeChecked();
  await page.getByRole('button', { name: 'Добавить характеристику', exact: true }).click(); await page.getByRole('spinbutton', { name: 'Значение', exact: true }).fill('5');
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click(); await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click(); await expect(page.locator('#catalog-state')).toContainText('Опубликована версия каталога 2');
  const entries = JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head').get().snapshot_json);
  expect(entries[0].edit.mpCost).toBe(25); expect(entries[0].edit.castSeconds).toBe(1.25);
  expect(entries[1].edit.effects).toEqual([{ stat: 1, value: 5, unit: 'flat' }]); expect(entries[1].edit.bonusRequirements.weaponCategories).toEqual([0, 1, 6]);
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('passive-editor-mobile.png'), fullPage: true }); expect(errors).toEqual([]);
});
