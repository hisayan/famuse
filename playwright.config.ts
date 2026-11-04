import { defineConfig, devices } from '@playwright/test';

/**
 * famuse smoke E2E config.
 *
 * Scope is intentionally small: demo sign-in, real-time messaging between
 * two members, and household task toggling. See docs/testing.md for the
 * testing strategy and what is deliberately not covered here.
 *
 * The suite runs against the Void dev server (`pnpm run dev`, port 5173).
 * Locally an already-running dev server is reused; in CI Playwright starts
 * a fresh one. Tests share one seeded household, so they run serially
 * (workers: 1) and use unique message text to stay independent.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // The household context drawer (tasks) is only visible at xl widths.
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
