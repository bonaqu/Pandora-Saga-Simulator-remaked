import { test, expect } from '@playwright/test';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
}

test('share and installation assets decode with declared dimensions and stay out of Legacy', async ({ page }) => {
  await openModern(page);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/modern/social-preview.png');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', './modern/apple-touch-icon.png');
  for (const [name, width, height] of [
    ['icon-192.png', 192, 192], ['icon-512.png', 512, 512],
    ['apple-touch-icon.png', 180, 180], ['social-preview.png', 1200, 630]
  ]) {
    const response = await page.request.get(`/modern/${name}`);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
    expect(await page.evaluate(async name => {
      const image = document.createElement('img'); image.src = `./modern/${name}`;
      await image.decode(); return [image.naturalWidth, image.naturalHeight];
    }, name)).toEqual([width, height]);
  }
  await page.goto('/legacy/');
  await expect(page.locator('meta[property^="og:"]')).toHaveCount(0);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(0);
});

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

test('failed autosave blocks activation so an update cannot discard current progress', async ({ page }) => {
  await openModern(page);
  const result = await page.evaluate(() => {
    window.__pwaPostCalls = 0;
    window.PandoraRemaked.builds.flushAutosave = function () {
      return { ok: false, error: { code: 'synthetic-save-failure' } };
    };
    window.PandoraRemaked.pwa.showUpdateNotice({
      postMessage() { window.__pwaPostCalls += 1; }
    });
    document.querySelector('[data-remaked-update-reload]').click();
    return {
      posts: window.__pwaPostCalls,
      disabled: document.querySelector('[data-remaked-update-reload]').disabled
    };
  });
  expect(result).toEqual({ posts: 0, disabled: false });
  await expect(page.locator('[data-remaked-update-notice]')).toBeVisible();
});

test('controller switch flushes again and blocks reload if progress changed after the first save', async ({ page }) => {
  await openModern(page);
  const before = page.url();
  await page.evaluate(() => {
    window.__switchFlushCalls = 0;
    window.PandoraRemaked.builds.flushAutosave = function () {
      window.__switchFlushCalls += 1;
      return { ok: window.__switchFlushCalls === 1 };
    };
    window.PandoraRemaked.pwa.showUpdateNotice({
      postMessage() {
        queueMicrotask(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
      }
    });
  });
  await page.locator('[data-remaked-update-reload]').click();
  await expect.poll(() => page.evaluate(() => window.__switchFlushCalls)).toBeGreaterThanOrEqual(2);
  expect(page.url()).toBe(before);
});

test('stalled worker activation re-enables Reload for a safe retry', async ({ page }) => {
  await openModern(page);
  await page.evaluate(() => {
    window.__pwaTimerCallback = null;
    window.__pwaNativeSetTimeout = window.setTimeout;
    window.setTimeout = function (callback, delay) {
      if (delay === 8000) {
        window.__pwaTimerCallback = callback;
        return 987654;
      }
      return window.__pwaNativeSetTimeout(callback, delay);
    };
    window.PandoraRemaked.pwa.showUpdateNotice({ postMessage() {} });
  });

  const reload = page.locator('[data-remaked-update-reload]');
  await reload.click();
  await expect(reload).toBeDisabled();

  await page.evaluate(() => {
    window.__pwaTimerCallback();
    window.setTimeout = window.__pwaNativeSetTimeout;
  });
  await expect(reload).toBeEnabled();
});

test('service-worker registration bypasses HTTP cache and checks again when requested', async ({ page }) => {
  await openModern(page);
  const result = await page.evaluate(async () => {
    window.__pwaRegisterArgs = null;
    window.__pwaUpdateCalls = 0;
    const fakeRegistration = {
      waiting: null,
      installing: null,
      addEventListener() {},
      update() {
        window.__pwaUpdateCalls += 1;
        return Promise.resolve();
      }
    };
    Object.defineProperty(navigator.serviceWorker, 'register', {
      configurable: true,
      value: (url, options) => {
        window.__pwaRegisterArgs = { url, options };
        return Promise.resolve(fakeRegistration);
      }
    });
    const registration = await window.PandoraRemaked.pwa.register();
    await window.PandoraRemaked.pwa.checkForUpdate();
    return {
      sameRegistration: registration === fakeRegistration,
      args: window.__pwaRegisterArgs,
      updates: window.__pwaUpdateCalls
    };
  });
  expect(result.sameRegistration).toBe(true);
  expect(result.args.url).toBe('./service-worker.js');
  expect(result.args.options).toEqual({ updateViaCache: 'none' });
  expect(result.updates).toBe(1);
});

test('runtime does not duplicate activation when fresh HTML bootstrap owns the update', async ({ page }) => {
  await openModern(page);
  const calls = await page.evaluate(() => {
    window.__pandoraPwaBootstrapUpdating = true;
    window.__bootstrapPostCalls = 0;
    window.PandoraRemaked.pwa.showUpdateNotice({
      postMessage() { window.__bootstrapPostCalls += 1; }
    });
    document.querySelector('[data-remaked-update-reload]').click();
    return window.__bootstrapPostCalls;
  });
  expect(calls).toBe(0);
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
