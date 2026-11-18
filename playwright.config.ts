import { defineConfig, devices } from '@playwright/test';
import { basePlaywrightConfig, E2E_SERVER_TIMEOUT } from '../../tools/playwright/playwright.base';

const BASE_URL = 'http://localhost:4201';

export default defineConfig({
  ...basePlaywrightConfig,
  testDir: './e2e',
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } }
    }
  ],
  use: {
    ...basePlaywrightConfig.use,
    baseURL: BASE_URL
  },
  webServer: {
    command: 'npx nx run ibid-website:serve-e2e',
    cwd: '../..',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: E2E_SERVER_TIMEOUT,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
