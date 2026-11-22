import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { login, recommend } from "./helpers";

async function audit(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  await test.info().attach(`${label}-axe`, { body: JSON.stringify(result, null, 2), contentType: "application/json" });
  expect.soft(result.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })), label).toEqual([]);
}

test("@a11y 로그인·팀·추천·영상·모바일 메뉴 WCAG AA 자동 검사", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "선택한 계정으로 시작하기" })).toBeVisible();
  await audit(page, "login");
  await login(page);
  await expect(page.getByRole("button", { name: "팀 만들기", exact: true })).toBeVisible();
  await audit(page, "teams");
  await recommend(page);
  await audit(page, "recommendations");
  await page.goto("/teams/padong/occurrences/rehearsal-1/videos/video-1");
  await expect(page.getByLabel("이 영상에 대한 피드백")).toBeVisible();
  await audit(page, "video-feedback");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await expect(page.getByRole("dialog", { name: "작업 공간 메뉴", exact: true })).toBeVisible();
  await audit(page, "mobile-menu");
});
