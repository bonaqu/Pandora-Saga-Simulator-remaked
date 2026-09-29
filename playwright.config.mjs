import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  expect: { timeout: 5000 },
  projects: [
    { name: 'chromium', testIgnore: '**/cross-browser-smoke.spec.mjs', use: { browserName: 'chromium' } },
    ...['chromium', 'firefox', 'webkit'].map(browserName => ({
      name: browserName + '-smoke',
      testMatch: '**/cross-browser-smoke.spec.mjs',
      use: { browserName }
    }))
  ],
  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'python scripts/build_pages.py --output _site && node scripts/serve_pages.mjs _site',
    url: 'http://127.0.0.1:8000',
    reuseExistingServer: true,
    timeout: 30000
  }
});
