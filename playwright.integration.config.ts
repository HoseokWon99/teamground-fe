import { defineConfig, devices } from "@playwright/test";

// Local SMTP/backend only. Never persist authentication tokens or passwords in traces.
export default defineConfig({
  testDir: "./tests/live",
  testMatch: "backend-integration.spec.ts",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  outputDir: "output/playwright/backend-integration",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:5173",
    timezoneId: "Asia/Seoul",
    locale: "ko-KR",
    trace: "off",
    screenshot: "off",
    video: "off",
    actionTimeout: 15_000,
    launchOptions: { args: ["--host-resolver-rules=MAP localhost 127.0.0.1"] },
  },
});
