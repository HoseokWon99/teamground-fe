import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  globalTimeout: 10 * 60_000,
  expect: { timeout: 10_000 },
  outputDir: "dist/qa-artifacts/test-results",
  reporter: [["list"], ["html", { outputFolder: "dist/qa-artifacts/report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    timezoneId: "Asia/Seoul",
    locale: "ko-KR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, grepInvert: /@a11y/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, grepInvert: /@a11y/ },
  ],
  webServer: {
    command: "pnpm preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
