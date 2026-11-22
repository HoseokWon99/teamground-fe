import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/live",
  testMatch: "invitation-integration.spec.ts",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: "list",
  outputDir: "output/playwright/invitation-integration",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:5175",
    trace: "off",
    screenshot: "off",
    video: "off",
    launchOptions: { args: ["--host-resolver-rules=MAP localhost 127.0.0.1"] },
  },
});
