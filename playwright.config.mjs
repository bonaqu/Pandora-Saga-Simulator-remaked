import { defineConfig } from '@playwright/test';

const webServerCommand = process.env.PW_PREBUILT_SITE === '1'
  ? 'node scripts/serve_pages.mjs _site'
  : 'python scripts/build_pages.py --output _site && node scripts/serve_pages.mjs _site';
const chromiumUse = process.env.PW_USE_SYSTEM_CHROME === '1'
  ? { browserName: 'chromium', channel: 'chrome' }
  : { browserName: 'chromium' };

export default defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: process.env.PW_FULLY_PARALLEL === '1',
  projects: [
    { name: 'chromium', testIgnore: '**/cross-browser-smoke.spec.mjs', use: chromiumUse },
    ...['chromium', 'firefox', 'webkit'].map(browserName => ({
      name: browserName + '-smoke',
      testMatch: '**/cross-browser-smoke.spec.mjs',
      use: browserName === 'chromium' ? chromiumUse : { browserName }
    }))
  ],
  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: webServerCommand,
    url: 'http://127.0.0.1:8000',
    reuseExistingServer: true,
    timeout: 30000
  }
});
