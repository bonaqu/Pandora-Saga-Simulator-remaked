import { test, expect } from '@playwright/test';

test('diagnose Build Manager runtime bootstrap', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.stack || error.message || String(error));
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();

  const snapshot = await page.evaluate(() => ({
    namespace: Boolean(window.PandoraRemaked),
    adapter: Boolean(window.PandoraRemaked && window.PandoraRemaked.adapter),
    buildStore: Boolean(window.PandoraRemaked && window.PandoraRemaked.buildStore),
    builds: Boolean(window.PandoraRemaked && window.PandoraRemaked.builds),
    tools: Boolean(document.querySelector('[data-remaked-tools]')),
    buildsButton: Boolean(document.querySelector('[data-remaked-builds-open]')),
    autosaveStatus: Boolean(document.querySelector('[data-remaked-autosave-status]')),
    manager: Boolean(document.querySelector('[data-remaked-build-manager]')),
    legacyBody: Boolean(document.getElementById('body')),
    serializeType: window.PandoraRemaked && window.PandoraRemaked.adapter
      ? typeof window.PandoraRemaked.adapter.serialize
      : null,
    flushType: window.PandoraRemaked && window.PandoraRemaked.builds
      ? typeof window.PandoraRemaked.builds.flushAutosave
      : null
  }));

  console.log('BUILD_MANAGER_DIAGNOSTIC=' + JSON.stringify({ snapshot, pageErrors, consoleErrors }));

  expect(pageErrors, 'page errors during bootstrap').toEqual([]);
  expect(snapshot.builds).toBe(true);
  expect(snapshot.tools).toBe(true);
  expect(snapshot.buildsButton).toBe(true);
  expect(snapshot.autosaveStatus).toBe(true);
  expect(snapshot.manager).toBe(true);
});
