import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
    },
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'iPhone-14-Pro',
      use: { ...devices['iPhone 14 Pro'] },
    },
    {
      name: 'Pixel-5',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'iPad-Air',
      use: { ...devices['iPad Air'] },
    },
    {
      name: 'Android-Tablet',
      use: { ...devices['Galaxy Tab S4'] },
    },
    {
      name: 'Desktop-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'Desktop-1920',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
})
