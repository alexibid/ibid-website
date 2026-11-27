import { defineConfig, devices } from '@playwright/test';
import { basePlaywrightConfig, E2E_SERVER_TIMEOUT } from '../../tools/playwright/playwright.base';

const BASE_URL = 'http://localhost:4201';
const isCI = !!process.env['CI'];

export default defineConfig({
  ...basePlaywrightConfig,
  testDir: './e2e',
  expect: isCI
    ? basePlaywrightConfig.expect
    : { ...basePlaywrightConfig.expect, timeout: 5000 },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 844 } }
    }
  ],
  use: {
    ...basePlaywrightConfig.use,
    baseURL: BASE_URL,
    ...(isCI ? {} : { actionTimeout: 5000, navigationTimeout: 10000 })
  },
  webServer: {
    command: 'npx nx run ibid-website:serve-e2e',
    cwd: '../..',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: E2E_SERVER_TIMEOUT,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
