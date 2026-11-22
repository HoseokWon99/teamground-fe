import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/live", workers: 1, timeout: 60_000,
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5173", trace: "off", screenshot: "only-on-failure" },
  outputDir: "output/playwright/live-auth",
});
