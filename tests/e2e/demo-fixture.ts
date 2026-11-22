import { test as base } from "@playwright/test";
export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => sessionStorage.setItem("teamground.mode", "demo"));
    await use(page);
  },
});
