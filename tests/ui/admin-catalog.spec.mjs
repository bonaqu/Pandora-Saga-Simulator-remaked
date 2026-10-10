import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { adminCatalog } from '../../admin-api/src/catalog.mjs';
import { currentRacialDrafts } from '../../admin-api/src/current-racial-data.mjs';
import rules from '../../data/modern-astir-rules.json' with { type: 'json' };
import { astirIds } from '../../admin-api/src/astir-cleanup.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { draftFromSource } from '../../admin-api/src/catalog-model.mjs';

const admin = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';

test('a late initial session check preserves credentials already entered into the native login form', async ({ page }) => {
  let releaseSession;
  const sessionGate = new Promise(resolve => { releaseSession = resolve; });
  await page.route(admin + '/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/session') {
      await sessionGate;
      return route.fulfill({ status: 401, json: { ok: false } });
    }
    const asset = path === '/admin' ? 'admin.html' : path.slice(1);
    if (!['admin.html', 'admin.css', 'admin.js', 'catalog-ui.js', 'localization-console.js','localization-bulk.js', 'ui-translations.js', 'result-labels.js'].includes(asset)) return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: asset.endsWith('.css') ? 'text/css' : asset.endsWith('.js') ? 'text/javascript' : 'text/html', body: fs.readFileSync(new URL('../../admin-api/public/' + asset, import.meta.url), 'utf8') });
  });
  await page.goto(admin + '/admin');
  await page.locator('#password').fill('synthetic-not-a-real-password');
  releaseSession();
  await expect(page.locator('#auth-message')).toHaveText('Enter your administrator credentials.');
  await expect(page.locator('#password')).toHaveValue('synthetic-not-a-real-password');
  expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).toBe('[{},{}]');
});

test('an origin-denied login explains the safe retry without showing or storing credentials', async ({ page }) => {
  await page.route(admin + '/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/session') return route.fulfill({ status: 401, json: { ok: false } });
    const asset = path === '/admin' ? 'admin.html' : path.slice(1);
    if (!['admin.html', 'admin.css', 'admin.js', 'catalog-ui.js', 'localization-console.js','localization-bulk.js', 'ui-translations.js', 'result-labels.js'].includes(asset)) return route.fulfill({ status: 404 });
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

async function openConsole(page, drafts = []) {
  // Only synthetic in-memory sessions. Never read the real administrator's
  // credential file in trace-enabled repository tests.
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0002_catalog.sql', '0003_skill_variants.sql', '0004_catalog_impact_revision.sql']) sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/' + name, import.meta.url), 'utf8'));
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
  for (const edit of drafts) {
    const call = async (path, input) => {
      const response = await adminCatalog(new Request(admin + '/api/admin/' + path, { method: input ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: input ? JSON.stringify(input) : undefined }), { DB });
      expect(response.status).toBe(200); return response.json();
    };
    const item = await call('item?id=' + edit.id);
    const saved = await call('draft', { edit, expectedDraftVersion: item.draftVersion, expectedCatalogRevision: item.catalogRevision });
    await call('publish', { id: edit.id, expectedDraftVersion: saved.draftVersion, expectedCatalogRevision: saved.catalogRevision });
  }
  await page.route(admin + '/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (path === '/api/session') return route.fulfill({ json: { ok: true, username: 'admin', csrfToken: 'synthetic-test-csrf-only', expiresAt: 9999999999 } });
    if (path === '/api/auth/logout') return route.fulfill({ json: { ok: true } });
    if (path === '/api/admin/localization') {
      return route.fulfill({json:{ok:true,schemaVersion:1,locale:'ru',scope:'game',page:0,pageSize:40,total:0,
        counts:{ui:242,game:2920},items:[]}});
    }
    if (path === '/api/admin/ui-translations') {
      return route.fulfill({json:{ok:true,schemaVersion:1,items:[]}});
    }
    if (path === '/api/admin/result-labels') {
      return route.fulfill({json:{ok:true,schemaVersion:1,items:[]}});
    }
    if (path.startsWith('/api/admin/')) {
      if (request.method() === 'POST') expect(request.headers()['x-csrf-token']).toBe('synthetic-test-csrf-only');
      try {
        const response = await adminCatalog(new Request(request.url(), { method: request.method(), headers: request.headers(), body: request.postData() || undefined }), { DB });
        return route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
      } catch (error) { return route.fulfill({ status: error.status || 503, json: { ok: false, message: error.message } }); }
    }
    const asset = path === '/admin' ? 'admin.html' : path.slice(1);
    if (!['admin.html', 'admin.css', 'admin.js', 'catalog-ui.js', 'localization-console.js','localization-bulk.js', 'ui-translations.js', 'result-labels.js'].includes(asset)) return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: asset.endsWith('.css') ? 'text/css' : asset.endsWith('.js') ? 'text/javascript' : 'text/html', body: fs.readFileSync(new URL('../../admin-api/public/' + asset, import.meta.url), 'utf8') });
  });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(admin + '/admin');
  await expect(page.getByRole('heading', { name: 'GOD MODE ENABLED / WELCOME, ADMIN' })).toBeVisible();
  await expect(page.locator('#catalog-state')).toContainText('Каталог загружен');
  return { sqlite, errors };
}

test('authenticated catalog admin previews archival Astir note cleanup and restores exactly those fields', async ({ page }) => {
  const { sqlite, errors } = await openConsole(page);
  const entries = astirIds.map(id => {
    const source = baselineById.get(id);
    const edit = draftFromSource(source, 'equipment');
    edit.notes = { en: '', ru: '', jp: '', tw: '' };
    return { identity: sourceIdentity(source), edit };
  });
  entries[0].edit.notes.en = rules.historicalNotes[astirIds[0]].en;
  entries[1].edit.notes.jp = rules.historicalNotes[astirIds[1]].jp;
  entries[0].edit.notes.tw = '此設備可以配備護符，並提高恢復力。';
  const json = JSON.stringify(entries);
  sqlite.prepare('UPDATE catalog_head SET version=2,impact_version=2,snapshot_json=? WHERE id=1').run(json);
  sqlite.prepare('INSERT INTO catalog_revisions(version,impact_version,snapshot_json,created_at,note) VALUES(2,2,?,1000,?)')
    .run(json, 'Seed browser fixture');
  const server = await page.evaluate(async () => {
    const response = await fetch('/api/admin/astir-notes', { credentials: 'same-origin' });
    return { status: response.status, body: await response.json() };
  });
  expect(server.status, JSON.stringify(server.body)).toBe(200);
  expect(server.body.fields).toHaveLength(2);
  await page.getByRole('button', { name: 'Очистка примечаний Astir' }).click();
  await expect(page.locator('.catalog-editor')).toContainText('архивных полей: 2', { timeout: 15000 });
  await expect(page.locator('.catalog-editor')).toContainText('Очистка только действующего каталога Modern');
  assertNoChanges();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Подтвердить очистку Modern' }).click();
  await expect(page.locator('.catalog-editor')).toContainText('архивных полей: 0');
  expect(sqlite.prepare('SELECT version,impact_version FROM catalog_head').get()).toMatchObject({version:3,impact_version:2});
  await page.getByRole('button', { name: 'Восстановить примечания #3' }).click();
  await expect(page.locator('.catalog-editor')).toContainText('архивных полей: 2');
  const latest = JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head').get().snapshot_json);
  expect(latest[0].edit.notes.en).toBe(rules.historicalNotes[astirIds[0]].en);
  expect(latest[0].edit.notes.tw).toBe('此設備可以配備護符，並提高恢復力。');
  expect(sqlite.prepare('SELECT impact_version FROM catalog_head').get().impact_version).toBe(2);
  expect(errors).toEqual([]);
  function assertNoChanges() {
    expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(2);
  }
});

test('conditional skill profile editor keeps one compact form, isolated base values and server-reviewed variants through draft/publication', async ({ page }) => {
  const { sqlite, errors } = await openConsole(page);
  await expect(page).toHaveTitle('Pandora Admin Terminal');
  await expect(page.locator('#admin-workspace')).toBeVisible();
  const consoleErrors = [];
  page.on('console', message => {
    if (!['error', 'warning'].includes(message.type())) return;
    if (message.location().url === admin + '/api/admin/preview' && /status of 400/.test(message.text())) return;
    consoleErrors.push(message.text());
  });
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('active');
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('skill_entry.5.3');
  await page.locator('.catalog-entry').first().click();
  await page.locator('[data-field="names"][data-language="en"]').fill('Default Blocking');
  const root = page.locator('[data-root-learning]');
  await root.locator('[data-field="learningMode"]').selectOption('custom');
  await root.getByRole('button', { name: 'Добавить требование ветки', exact: true }).click();
  await root.locator('[data-learning-branch]').selectOption('skill_category.5');
  await root.locator('[data-learning-points]').fill('8');
  const section = page.locator('[data-skill-profiles]'), profile = section.locator('[data-profile-editor]');
  async function add(name, job, mp) {
    await section.getByRole('button', { name: 'Добавить вариант', exact: true }).click();
    await profile.locator('[data-profile-field="names"][data-language="en"]').fill(name);
    await profile.locator('[data-profile-field="names"][data-language="ru"]').fill('Вариант ' + name);
    await profile.locator('[data-profile-field="learningLevel"]').fill('45');
    await profile.getByText('Разрешённые классы · ничего не отмечено = любой', { exact: true }).click();
    await profile.locator('[data-learning-class="job.' + job + '"]').check();
    await profile.locator('[data-profile-field="mpCost"]').fill(String(mp));
  }
  await add('General Blocking', 5, 15); await add('Paladin Blocking', 6, 25);
  await expect(page.locator('[data-field="names"][data-language="en"]')).toHaveValue('Default Blocking');
  await expect(page.locator('[data-field="mpCost"]')).toHaveValue('5');
  await expect(root.locator('[data-learning-class]:checked')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(await profile.locator('input, select, textarea').evaluateAll(inputs => inputs.filter(input => !input.checkValidity()).map(input => ({ field: input.dataset.profileField, message: input.validationMessage, value: input.value })))).toEqual([]);
  await section.locator('[data-profile-choice]').selectOption('0');
  await expect(profile.locator('[data-profile-field="names"][data-language="en"]')).toHaveValue('General Blocking');
  await expect(profile.locator('[data-learning-class="job.5"]')).toBeChecked();
  await expect(profile.locator('[data-learning-class="job.6"]')).not.toBeChecked();
  await expect(section.locator('[data-profile-field="learningLevel"]')).toHaveCount(1);
  await section.locator('[data-profile-choice]').selectOption('1');
  await profile.getByText('Разрешённые классы · ничего не отмечено = любой', { exact: true }).click();
  await profile.locator('[data-learning-class="job.6"]').uncheck(); await profile.locator('[data-learning-class="job.5"]').check();
  await page.getByRole('button', { name: 'Проверить изменения', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Условия вариантов совпадают');
  await expect(profile.locator('[data-profile-field="mpCost"]')).toHaveValue('25');
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n).toBe(0);
  await profile.locator('[data-learning-class="job.5"]').uncheck(); await profile.locator('[data-learning-class="job.6"]').check();
  await page.getByRole('button', { name: 'Проверить изменения', exact: true }).click();
  await expect(page.locator('[data-preview-record]')).toContainText('Условные варианты: 2');
  await expect(page.locator('[data-preview-record]')).toContainText('MP: 15');
  await expect(page.locator('[data-preview-record]')).toContainText('MP: 25');
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(0);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.locator('[data-current-record]')).toContainText('Условные варианты: 2');
  const published = JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head').get().snapshot_json);
  expect(published).toHaveLength(1); expect(published[0].identity.id).toBe('skill_entry.5.3');
  expect(published[0].edit.learningRequirements.classIds).toEqual([]);
  expect(published[0].edit.profiles.map(row => [row.names.en, row.mpCost, row.learningRequirements.classIds])).toEqual([
    ['General Blocking', 15, ['job.5']], ['Paladin Blocking', 25, ['job.6']]
  ]);
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_skill_allocations').get().n).toBe(0);
  await section.locator('[data-profile-choice]').selectOption('1');
  await profile.locator('[data-learning-points]').fill('12');
  await section.locator('[data-profile-choice]').selectOption('0');
  await expect(profile.locator('[data-learning-points]')).toHaveValue('8');
  await section.locator('[data-profile-choice]').selectOption('1');
  await expect(profile.locator('[data-learning-points]')).toHaveValue('12');
  await expect(root.locator('[data-learning-points]')).toHaveValue('8');
  const directory = process.platform === 'win32' ? 'D:/CODEX/Tasks/pandora-admin-runtime/skill-profiles-local' : path.join(os.tmpdir(), 'pandora-skill-profiles-local');
  fs.mkdirSync(directory, { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await section.locator('[data-profile-choice]').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(directory, 'admin-' + width + '.png') });
  }
  await section.getByRole('button', { name: 'Удалить выбранный вариант', exact: true }).click();
  await expect(profile.locator('[data-profile-field="names"][data-language="en"]')).toHaveValue('General Blocking');
  await section.getByRole('button', { name: 'Удалить выбранный вариант', exact: true }).click();
  await expect(section).toContainText('Вариантов пока нет. Используются основные поля навыка выше.');
  await expect(section.locator('[data-profile-choice]')).toBeDisabled();
  await expect(profile.locator('input')).toHaveCount(0);
  await page.getByRole('button', { name: 'Проверить изменения', exact: true }).click();
  await expect(page.locator('[data-preview-record]')).not.toContainText('Условные варианты:');
  expect(JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head').get().snapshot_json)[0].edit.profiles).toHaveLength(2);
  await page.getByRole('button', { name: 'Создать новый навык по этому шаблону', exact: true }).click();
  await expect(page.locator('[data-skill-profiles]')).toHaveCount(0);
  await expect(page.locator('[data-field="names"][data-language="en"]')).toHaveValue('Default Blocking');
  expect(errors).toEqual([]); expect(consoleErrors).toEqual([]);
});

test('mapped native passive editor clearly separates add and replacement, and a duplicate never inherits native replacement', async ({ page }) => {
  const { sqlite, errors } = await openConsole(page);
  const consoleErrors = []; page.on('console', message => { if (['error', 'warning'].includes(message.type())) consoleErrors.push(message.text()); });
  expect(page.url()).toBe(admin + '/admin'); await expect(page).toHaveTitle('Pandora Admin Terminal');
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('passive');
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('skill_entry.6.0');
  await page.locator('.catalog-entry').first().click();
  await expect(page.locator('[data-field="intrinsicEffectMode"]')).toHaveValue('add');
  await expect(page.locator('[data-current-record]')).toContainText('Встроенный эффект сохранён');
  await expect(page.locator('[data-current-record]')).toContainText('+10');
  await page.locator('[data-field="intrinsicEffectMode"]').selectOption('replace');
  await page.getByRole('button', { name: 'Проверить изменения', exact: true }).click();
  await expect(page.locator('[data-preview-record]')).toContainText('Рассчитываемых числовых бонусов нет');
  await expect(page.locator('[data-preview-record]')).not.toContainText('Это не означает отсутствие исходного эффекта');
  await page.getByRole('button', { name: 'Добавить характеристику', exact: true }).click();
  await page.getByRole('combobox', { name: 'Характеристика', exact: true }).selectOption('62');
  await page.getByRole('spinbutton', { name: 'Значение', exact: true }).fill('3');
  await page.getByRole('button', { name: 'Проверить изменения', exact: true }).click();
  await expect(page.locator('[data-preview-record]')).toContainText('Встроенный эффект заменён');
  await expect(page.locator('[data-preview-record]')).not.toContainText('Исходная механика сохраняется');
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(0);
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Опубликована версия каталога 1');
  const record = JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head').get().snapshot_json)[0];
  expect(record.edit.intrinsicEffectMode).toBe('replace'); expect(record.edit.effects).toEqual([{ stat: 62, value: 3, unit: 'flat' }]);
  const directory = process.platform === 'win32' ? 'D:/CODEX/Tasks/pandora-admin-runtime/native-passive-local' : path.join(os.tmpdir(), 'pandora-native-passive-local');
  fs.mkdirSync(directory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-field="intrinsicEffectMode"]').scrollIntoViewIfNeeded(); await page.screenshot({ path: directory + '/admin-1440.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-field="intrinsicEffectMode"]').scrollIntoViewIfNeeded(); await page.screenshot({ path: directory + '/admin-390.png' });
  await page.getByRole('button', { name: 'Создать новый навык по этому шаблону', exact: true }).click();
  await expect(page.locator('[data-field="intrinsicEffectMode"]')).toHaveCount(0);
  await page.locator('[data-field="names"][data-language="en"]').fill('Synthetic additional accuracy');
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  expect(errors).toEqual([]); expect(consoleErrors).toEqual([]);
});

test('custom learning editor previews current classes/level/branches, preserves unsaved values and publishes only explicitly', async ({ page }) => {
  const { sqlite, errors } = await openConsole(page);
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('active');
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('skill_entry.18.9');
  await page.locator('.catalog-entry').first().click();
  const mode = page.locator('[data-field="learningMode"]');
  await expect(mode).toHaveValue('native'); await expect(page.locator('[data-custom-learning]')).toBeHidden();
  await mode.selectOption('custom');
  await page.locator('[data-field="learningLevel"]').fill('3');
  await page.locator('[data-field="learningClassScope"]').selectOption('descendants');
  await page.getByText('Разрешённые классы · ничего не отмечено = любой', { exact: true }).click();
  await page.locator('[data-learning-class="job.4"]').check();
  await page.getByRole('button', { name: 'Добавить требование ветки', exact: true }).click();
  await page.locator('[data-learning-branch]').selectOption('skill_category.18');
  await page.locator('[data-learning-points]').fill('35');
  await mode.selectOption('native'); await mode.selectOption('custom');
  await expect(page.locator('[data-learning-points]')).toHaveValue('35');
  await expect(page.locator('[data-learning-class="job.4"]')).toBeChecked();
  await page.getByRole('button', { name: 'Проверить изменения', exact: true }).click();
  const preview = page.locator('[data-preview-record]');
  await expect(preview).toContainText('Минимальный уровень: 3');
  await expect(preview).toContainText('Knight и их последующие профессии');
  await expect(preview).toContainText('Elemental ≥ 35');
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n).toBe(0);
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.locator('[data-learning-points]')).toHaveValue('35');
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(0);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.locator('[data-current-record]')).toContainText('Минимальный уровень: 3');
  await expect(page.locator('[data-current-record]')).toContainText('Elemental ≥ 35');
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(1);
  const proofDirectory = process.platform === 'win32' ? 'D:/CODEX/Tasks/pandora-admin-runtime/custom-learning-local' : path.join(os.tmpdir(), 'pandora-custom-learning-local');
  fs.mkdirSync(proofDirectory, { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('[data-field="learningMode"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-field="learningLevel"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(proofDirectory, 'admin-' + width + '.png') });
  }
  await page.locator('[data-field="learningLevel"]').fill('56');
  expect(await page.locator('[data-field="learningLevel"]').evaluate(input => input.validity.rangeOverflow)).toBe(true);
  await expect(page.locator('[data-learning-points]')).toHaveValue('35');
  expect(errors).toEqual([]);
});

test('current racial editor preserves both attack units, weapon conditions and reference-only limits', async ({ page }, testInfo) => {
  const { sqlite, errors } = await openConsole(page, currentRacialDrafts());
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('racial');
  async function select(id) {
    await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill(id);
    await page.locator('.catalog-entry').first().click();
  }
  await select('racial_skill.0.0');
  const live = page.locator('[data-current-record]'), preview = page.locator('[data-preview-record]');
  await expect(live).toContainText('Бойцовский дух');
  await expect(live).toContainText('Физическая атака (ATK): +10');
  await expect(live).toContainText('Физическая атака (ATK): +12 % от базы');
  await expect(live).toContainText('Условие оружия:');
  await expect(page.locator('[data-weapon-category="0"]')).toBeChecked();
  await expect(page.locator('[data-weapon-category="1"]')).not.toBeChecked();
  await expect(page.locator('.effect-rows .effect-row')).toHaveCount(2);
  await page.getByRole('spinbutton', { name: 'Значение', exact: true }).first().fill('11');
  await page.getByRole('button', { name: 'Проверить изменения', exact: true }).click();
  await expect(preview).toContainText('Физическая атака (ATK): +11');
  await expect(preview).toContainText('Физическая атака (ATK): +12 % от базы');
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(18);
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.locator('#catalog-state')).toContainText('Опубликована версия каталога 19');
  await expect(live).toContainText('Физическая атака (ATK): +11');
  await select('racial_skill.1.1');
  await expect(live).toContainText('Зоркость');
  await expect(live).toContainText('Дальность +500 указана справочно');
  await expect(live).toContainText('Рассчитываемых числовых бонусов нет');
  await expect(page.locator('[data-field="calculationNotes"][data-language="ru"]')).toHaveValue(/Дальность \+500/);
  await page.screenshot({ path: testInfo.outputPath('racial-current-desktop.png'), fullPage: true });
  await select('racial_skill.4.0');
  await expect(live).toContainText('Каменная кожа');
  await expect(live).toContainText('-10 % получаемого урона');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.numeric-effects').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('racial-editor-touch.png'), fullPage: false });
  expect(errors).toEqual([]);
});

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
  for (const [kind, id, text] of [['racial', 'racial_skill.4.0', 'Получаемый физический урон −10%'], ['active', 'skill_entry.0.0', 'Стоимость MP'], ['passive', 'skill_entry.0.1', 'Встроенный эффект сохранён']]) {
    await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption(kind);
    await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill(id);
    await page.locator('.catalog-entry').first().click();
    await expect(page.locator('[data-current-record]')).toContainText(text);
    if (kind === 'passive') {
      await expect(page.locator('[data-current-record]')).toContainText('+10 процентных пунктов');
      await expect(page.locator('[data-current-record]')).toContainText('с уровня 12');
      await expect(page.locator('[data-field="intrinsicEffectMode"]')).toHaveValue('add');
    }
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
  // Synthetic admin list search is debounced and async; retain the strict
  // literal XSS text assertion while tolerating a saturated CI runner.
  await expect(page.locator('.catalog-entry').filter({ hasText: '<img src=x onerror=alert(1)>' })).toHaveCount(1, { timeout: 15000 });
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


test('admin workflow exposes skill creation from a selected template and four-language coverage', async ({ page }) => {
  const { errors } = await openConsole(page);
  await expect(page.getByRole('navigation', { name: 'Быстрый переход по админке' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('active');
  const create = page.getByRole('button', { name: 'Новый навык из выбранного', exact: true });
  await expect(create).toBeDisabled();
  await page.getByRole('searchbox', { name: 'Поиск в каталоге' }).fill('skill_entry.0.0');
  await page.locator('.catalog-entry').first().click();
  await expect(create).toBeEnabled();
  await expect(page.locator('[data-language-coverage]')).toContainText('Название:');
  await create.click();
  await expect(create).toBeDisabled();
  await expect(page.locator('.catalog-editor')).toContainText('Это отдельный новый навык');
  await page.locator('[data-field="names"][data-language="en"]').fill('New supported skill variant');
  await page.locator('[data-field="names"][data-language="ru"]').fill('Новый навык');
  await expect(page.locator('[data-language-coverage]')).toContainText('RU');
  await page.locator('[data-field="names"][data-language="en"]').focus();
  await page.keyboard.press('Control+s');
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  expect(errors).toEqual([]);
});

test('active and passive editors expose distinct real fields and publish their own typed data', async ({ page }, testInfo) => {
  const { sqlite, errors } = await openConsole(page);
  await page.getByRole('combobox', { name: 'Каталог', exact: true }).selectOption('active');
  await expect(page.getByRole('button', { name: 'Новый навык из выбранного', exact: true })).toBeDisabled();
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


test('saved catalog drafts from different items appear in a shared queue and publish as one revision',async({page})=>{
  const {sqlite,errors}=await openConsole(page);
  const search=page.getByRole('searchbox',{name:'Поиск в каталоге'});
  const board=page.locator('.catalog-draft-board');
  await expect(board.locator('summary')).toContainText('Сохранённые черновики каталога: 0');
  for(const [index,id] of ['equipment.0.1','equipment.0.2'].entries()){
    await search.fill(id);
    await page.locator('.catalog-entry[data-record-id="'+id+'"]').click();
    await page.locator('.catalog-editor [data-field="names"][data-language="ru"]').fill('Черновик для выпуска '+index);
    await page.getByRole('button',{name:'Сохранить черновик',exact:true}).click();
    await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
    await expect(board.locator('summary')).toContainText('Сохранённые черновики каталога: '+(index+1));
    await expect(page.locator('.catalog-entry[data-record-id="'+id+'"]')).toHaveAttribute('data-has-draft','true');
  }
  expect(sqlite.prepare('SELECT version FROM catalog_head').get().version).toBe(0);
  await board.locator('summary').click();
  await expect(board.locator('.catalog-draft-entry')).toHaveCount(2);
  await board.getByRole('button',{name:'Выбрать все'}).click();
  await expect(board).toContainText('Выбрано: 2 из 2');
  await board.getByRole('button',{name:'Снять выделение'}).click();
  await expect(board).toContainText('Выбрано: 0 из 2');
  await board.getByRole('button',{name:'Выбрать все'}).click();
  page.once('dialog',dialog=>dialog.accept());
  await board.getByRole('button',{name:'Опубликовать выбранные'}).click();
  await expect(board.locator('summary')).toContainText('Сохранённые черновики каталога: 0');
  await expect(page.locator('#catalog-state')).toContainText('Опубликовано 2 черновиков одной версией #1');
  const published=JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head').get().snapshot_json);
  expect(published).toHaveLength(2);
  expect(published.map(x=>x.edit.names.ru).sort()).toEqual(['Черновик для выпуска 0','Черновик для выпуска 1']);
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n).toBe(1);
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts WHERE is_dirty=1').get().n).toBe(0);
  expect(errors).toEqual([]);
});


test('admin exposes numeric engine IDs and saves a typed healing bonus every two upgrades',async({page})=>{
  const {sqlite,errors}=await openConsole(page);
  const search=page.getByRole('searchbox',{name:'Поиск в каталоге'});
  await search.fill('equipment.0.1');
  await page.locator('.catalog-entry[data-record-id="equipment.0.1"]').click();
  await expect(page.locator('.catalog-editor .item-identity')).toContainText('Игровой ID: 1');
  const upgrades=page.locator('.catalog-editor .upgrade-editor');
  await expect(upgrades).toContainText('Бонусы от заточки');
  await upgrades.getByRole('button',{name:'Добавить бонус заточки'}).click();
  await expect(upgrades.locator('.upgrade-rule-row')).toHaveCount(1);
  const edit=upgrades.locator('.upgrade-rule-row');
  await expect(edit.locator('.effect-row select').first()).toHaveValue('11');
  await expect(edit.locator('[data-upgrade="from"]')).toHaveValue('2');
  await expect(edit.locator('[data-upgrade="every"]')).toHaveValue('2');
  await expect(edit.locator('[data-upgrade="to"]')).toHaveValue('10');
  await page.getByRole('button',{name:'Сохранить черновик',exact:true}).click();
  await expect(page.locator('#catalog-state')).toContainText('Черновик сохранён');
  let stored=JSON.parse(sqlite.prepare('SELECT payload_json FROM catalog_drafts WHERE id=?').get('equipment.0.1').payload_json);
  expect(stored.upgradeBonuses).toEqual([{stat:11,value:1,unit:'flat',from:2,every:2,to:10}]);
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Опубликовать',exact:true}).click();
  await expect(page.locator('#catalog-state')).toContainText('Опубликована версия каталога 1');
  expect(sqlite.prepare('SELECT impact_version FROM catalog_head WHERE id=1').get().impact_version).toBe(1);
  stored=JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head WHERE id=1').get().snapshot_json)[0];
  expect(stored.edit.upgradeBonuses).toHaveLength(1);
  await search.fill('1');
  await expect(page.locator('.catalog-entry[data-record-id="equipment.0.1"]')).toBeVisible();
  expect(errors).toEqual([]);
});


test('catalog item preview updates live with RU multiline descriptions and Soul rings without writing a draft',async({page})=>{
  const {sqlite,errors}=await openConsole(page);
  const entries=page.locator('.catalog-entry');
  await expect(entries.first()).toBeVisible();
  await entries.first().click();
  const preview=page.locator('[data-catalog-item-live-preview]');
  await expect(preview).toBeVisible();
  const description=page.locator('.catalog-editor [data-field="description"][data-language="ru"]');
  await description.fill('Описание предмета.\\n\\nЗа каждые 2 уровня улучшения:\\nТочность +1');
  await page.locator('.catalog-editor [data-field="names"][data-language="ru"]').fill('Предпросмотр меча');
  await page.locator('.catalog-editor [data-field="sockets"]').fill('2');
  await expect(preview.locator('.catalog-item-preview-name')).toHaveText('Предпросмотр меча');
  await expect(preview.locator('.catalog-item-preview-socket')).toHaveCount(2);
  await expect(preview.locator('.catalog-item-preview-description').first()).toContainText('За каждые 2 уровня улучшения:');
  expect(await preview.locator('.catalog-item-preview-description').first().evaluate(node=>getComputedStyle(node).whiteSpace)).toBe('pre-wrap');
  await preview.getByRole('combobox',{name:'Язык предпросмотра предмета'}).selectOption('en');
  await expect(preview.locator('.catalog-item-preview-name')).not.toHaveText('Предпросмотр меча');
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts WHERE is_dirty=1').get().n).toBe(0);
  expect(errors).toEqual([]);
});
