import { test, expect } from '@playwright/test';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
}

test('PWA action mount exists while Install App stays hidden before capture', async ({ page }) => {
  await openModern(page);
  await expect(page.locator('[data-remaked-pwa-actions]')).toHaveCount(1);
  await expect(page.locator('[data-remaked-install]')).toBeHidden();
});

test('captured install prompt is one-shot and does not mutate the build', async ({ page }) => {
  await openModern(page);
  const before = await page.evaluate(() => window.PandoraRemaked.adapter.serialize());
  const captured = await page.evaluate(() => {
    window.__pwaPromptCalls = 0;
    window.__pwaPrevented = 0;
    window.PandoraRemaked.pwa.captureInstallPrompt({
      preventDefault() { window.__pwaPrevented += 1; },
      prompt() {
        window.__pwaPromptCalls += 1;
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome: 'dismissed' })
    });
    return window.__pwaPrevented;
  });
  expect(captured).toBe(1);

  const install = page.locator('[data-remaked-install]');
  await expect(install).toBeVisible();
  await install.click();
  await expect.poll(() => page.evaluate(() => window.__pwaPromptCalls)).toBe(1);
  await expect(install).toBeHidden();
  expect(await page.evaluate(() => window.PandoraRemaked.adapter.serialize())).toBe(before);
});

test('update notice is polite, keyboard reachable and never reloads immediately', async ({ page }) => {
  await openModern(page);
  const beforeUrl = page.url();
  await page.evaluate(() => {
    window.__waitingWorker = { postMessage() {} };
    window.PandoraRemaked.pwa.showUpdateNotice(window.__waitingWorker);
  });

  const notice = page.locator('[data-remaked-update-notice]');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute('aria-live', 'polite');
  await expect(notice).toContainText('New version available — Reload');
  const reload = notice.locator('[data-remaked-update-reload]');
  await reload.focus();
  await expect(reload).toBeFocused();
  expect(page.url()).toBe(beforeUrl);
});

test('Reload flushes autosave before requesting waiting worker activation', async ({ page }) => {
  await openModern(page);
  await page.evaluate(() => {
    window.__pwaOrder = [];
    window.PandoraRemaked.builds.flushAutosave = function () {
      window.__pwaOrder.push('flush');
      return { ok: true };
    };
    window.__waitingWorker = {
      postMessage(message) {
        window.__pwaOrder.push('post:' + message.type);
      }
    };
    window.PandoraRemaked.pwa.showUpdateNotice(window.__waitingWorker);
  });
  await page.locator('[data-remaked-update-reload]').click();
  await expect.poll(() => page.evaluate(() => window.__pwaOrder)).toEqual([
    'flush',
    'post:SKIP_WAITING'
  ]);
});

test('service-worker registration failure leaves the calculator usable', async ({ page }) => {
  await openModern(page);
  const result = await page.evaluate(async () => {
    Object.defineProperty(navigator.serviceWorker, 'register', {
      configurable: true,
      value: () => Promise.reject(new Error('expected registration failure'))
    });
    const registration = await window.PandoraRemaked.pwa.register();
    return {
      registration,
      shell: Boolean(document.querySelector('[data-remaked-shell]')),
      store: typeof window.Store
    };
  });
  expect(result.registration).toBeNull();
  expect(result.shell).toBe(true);
  expect(result.store).toBe('function');
});

test('repeated PWA initialization does not duplicate controls', async ({ page }) => {
  await openModern(page);
  await page.evaluate(() => {
    window.PandoraRemaked.pwa.init();
    window.PandoraRemaked.pwa.init();
  });
  await expect(page.locator('[data-remaked-pwa-actions]')).toHaveCount(1);
  await expect(page.locator('[data-remaked-install]')).toHaveCount(1);
  await page.evaluate(() => {
    window.PandoraRemaked.pwa.showUpdateNotice({ postMessage() {} });
    window.PandoraRemaked.pwa.showUpdateNotice({ postMessage() {} });
  });
  await expect(page.locator('[data-remaked-update-notice]')).toHaveCount(1);
});
