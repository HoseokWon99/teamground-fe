import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const profile = {
  id: "real-user",
  displayName: "실제 회원",
  verifiedEmail: "real@example.com",
  authMethod: "EMAIL",
  timezone: "Asia/Seoul",
  version: 0,
};
test("server mode never uses saved demo identity, restores session and logs out", async ({
  page,
}) => {
  let authenticated = false;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/csrf"))
      return route.fulfill({ json: { data: { token: "csrf" } } });
    if (route.request().method() === "POST") {
      expect(route.request().headers()["x-csrf-token"]).toBe("csrf");
      if (path.endsWith("/login")) {
        authenticated = true;
        return route.fulfill({ json: { data: profile } });
      }
      if (path.endsWith("/logout")) {
        authenticated = false;
        return route.fulfill({ status: 204 });
      }
    }
    if (path.endsWith("/me"))
      return route.fulfill(
        authenticated
          ? { json: { data: profile } }
          : {
              status: 401,
              json: { error: { code: "AUTHENTICATION_REQUIRED" } },
            },
      );
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto("/teams");
  await expect(
    page.getByRole("heading", { name: "로그인", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("데모 계정 선택")).toHaveCount(0);
  await page.getByLabel("이메일", { exact: true }).fill("real@example.com");
  await page.getByLabel("비밀번호", { exact: true }).fill("long password 123");
  await page.getByRole("button", { name: "이메일로 로그인" }).click();
  await expect(
    page.getByText("참여 중인 팀이 없습니다.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("이메일 계정은 Google 캘린더", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "실제 회원", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});
test("mail links scrub tokens; GET does not verify; refresh requires reopening the mail", async ({
  page,
}) => {
  let submissions = 0;
  await page.route("**/api/v1/**", async (route) => {
    if (route.request().method() === "POST") submissions++;
    return route.fulfill({
      status: 401,
      json: { error: { code: "AUTHENTICATION_REQUIRED" } },
    });
  });
  await page.goto("/verify-email#token=private-token");
  await expect(page.getByLabel("새 비밀번호", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/verify-email$/);
  expect(submissions).toBe(0);
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("private-token");
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "메일의 링크를 다시 열어",
  );
});
test("mail errors retain input, and mobile auth forms meet automated accessibility checks @a11y", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/**", async (route) => {
    if (route.request().url().endsWith("/csrf"))
      return route.fulfill({ json: { data: { token: "csrf" } } });
    return route.fulfill({
      status: 503,
      json: { error: { code: "AUTH_MAIL_UNAVAILABLE" } },
    });
  });
  await page.goto("/signup");
  await page.getByLabel("이름", { exact: true }).fill("새 회원");
  await page.getByLabel("이메일", { exact: true }).fill("new@example.com");
  await page.getByRole("button", { name: "가입 메일 요청" }).click();
  await expect(page.getByRole("alert")).toContainText("보낼 수 없습니다");
  await expect(page.getByLabel("이메일", { exact: true })).toHaveValue(
    "new@example.com",
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("a late session restoration cannot overwrite a successful login", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) {
      await pending;
      return route.fulfill({
        status: 401,
        json: { error: { code: "AUTHENTICATION_REQUIRED" } },
      });
    }
    if (path.endsWith("/csrf"))
      return route.fulfill({ json: { data: { token: "csrf" } } });
    return route.fulfill({
      json: { data: path.endsWith("/login") ? profile : [] },
    });
  });
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill("real@example.com");
  await page.getByLabel("비밀번호", { exact: true }).fill("long password 123");
  await page.getByRole("button", { name: "이메일로 로그인" }).click();
  await expect(
    page.getByRole("heading", { name: "내 팀", exact: true }),
  ).toBeVisible();
  release?.();
  await expect(
    page.getByText("참여 중인 팀이 없습니다.", { exact: false }),
  ).toBeVisible();
});
test("Google callback errors survive the root redirect", async ({ page }) => {
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: "AUTHENTICATION_REQUIRED" } },
    }),
  );
  await page.goto("/?authError=cancelled");
  await expect(page.getByRole("alert")).toContainText(
    "Google 로그인을 완료하지 못했습니다",
  );
});
