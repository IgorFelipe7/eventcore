import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:3000'

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../playwright-report' }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @eventcore/api dev',
      url: 'http://localhost:4000/health/ready',
      reuseExistingServer: true,
      cwd: '../..',
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @eventcore/web dev',
      url: baseURL,
      reuseExistingServer: true,
      cwd: '../..',
      timeout: 120_000,
    },
  ],
})
