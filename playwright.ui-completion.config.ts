import { defineConfig, devices } from "@playwright/test";

// All real credentials stay in memory. Only explicitly captured mock screens are saved.
export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "**/ui-completion.spec.ts",
    "**/server-auth.spec.ts",
    "**/backend-integration.spec.ts",
  ],
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  outputDir: "output/playwright/ui-completion",
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
