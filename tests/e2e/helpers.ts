import { expect, type Page } from "@playwright/test";

export async function login(page: Page, destination = "/teams", account = "지우") {
  await page.goto(`/login?returnTo=${encodeURIComponent(destination)}`);
  await page.getByRole("radio", { name: new RegExp(account) }).check();
  await page.getByRole("button", { name: "선택한 계정으로 시작하기" }).click();
  await expect(page).toHaveURL(destination);
}

export async function recommend(page: Page) {
  await page.goto("/teams/padong/scheduling");
  await page.getByRole("button", { name: "발표 예시 채우기" }).click();
  await page.getByRole("button", { name: /추천 시간 찾기/ }).click();
  await expect(page.getByRole("heading", { name: /매주 수요일/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /매주 금요일/ })).toHaveCount(0);
}
