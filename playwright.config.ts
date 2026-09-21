import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1, timeout: 90000,
  expect: { timeout: 30000 },
  use: { baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  reporter: [['list'], ['json', { outputFile: 'artifacts/browser-results.json' }]],
});
