import { defineConfig, devices } from '@playwright/test';
import { authStorageStatePath } from './e2e/support';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  globalSetup: './e2e/global-setup.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: authStorageStatePath },
    },
  ],
});
