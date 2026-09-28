import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  expect: { timeout: 5000 },
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
