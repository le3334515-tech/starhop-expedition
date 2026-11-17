import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { channel: 'chrome', headless: true, baseURL: 'http://127.0.0.1:4173' },
  webServer: { command: 'npm start', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
});
