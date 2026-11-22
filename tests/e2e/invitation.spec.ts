import { expect, test, type Page } from "@playwright/test";
const profile = {
  id: "invitee",
  displayName: "초대 회원",
  verifiedEmail: "invitee@example.test",
  authMethod: "EMAIL",
  timezone: "Asia/Seoul",
  version: 0,
};
async function setup(page: Page, authenticated = true) {
  const state = {
    authenticated,
    accepts: 0,
    code: "",
    status: 409,
    left: false,
    failNetwork: false,
  };
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/csrf"))
      return route.fulfill({ json: { data: { token: "csrf" } } });
    if (path.endsWith("/email/login")) {
      state.authenticated = true;
      return route.fulfill({ json: { data: profile } });
    }
    if (path.endsWith("/logout")) {
      state.authenticated = false;
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith("/me"))
      return route.fulfill(
        state.authenticated
          ? { json: { data: profile } }
          : {
              status: 401,
              json: { error: { code: "AUTHENTICATION_REQUIRED" } },
            },
      );
    if (path.endsWith("/invitations/accept")) {
      state.accepts++;
      expect(route.request().postDataJSON()).toEqual({
        token: "private-invitation",
      });
      if (state.failNetwork) return route.abort();
      if (state.code)
        return route.fulfill({
          status: state.status,
          json: { error: { code: state.code } },
        });
      return route.fulfill({
        json: { data: { teamspaceId: "team", membershipId: "membership" } },
      });
    }
    if (path.endsWith("/teamspaces/team") && state.left)
      return route.fulfill({
        status: 403,
        json: { error: { code: "FORBIDDEN" } },
      });
    if (path.endsWith("/members"))
      return route.fulfill({
        json: {
          data: [
            {
              membershipId: "membership",
              userId: profile.id,
              displayName: profile.displayName,
              role: "MEMBER",
            },
          ],
        },
      });
    const team = {
      id: "team",
      name: "초대받은 팀",
      description: "",
      role: "MEMBER",
      version: 0,
    };
    return route.fulfill({
      json: {
        data: path.endsWith("/teamspaces/team")
          ? team
          : path.endsWith("/teamspaces")
            ? [team]
            : [],
      },
    });
  });
  await page.goto("/invite#token=private-invitation");
  await expect(page).toHaveURL(/\/invite$/);
  return state;
}
async function login(page: Page) {
  await page.getByLabel("이메일", { exact: true }).fill(profile.verifiedEmail);
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill("integration password");
  await page.getByRole("button", { name: "이메일로 로그인" }).click();
  await expect(
    page.getByRole("button", { name: "초대 수락", exact: true }),
  ).toBeVisible();
}
test("invitation survives SPA login, requires explicit accept, verifies membership and scrubs secrets", async ({
  page,
}) => {
  const state = await setup(page, false);
  await page.getByRole("link", { name: "로그인하고 참여하기" }).click();
  await login(page);
  expect(state.accepts).toBe(0);
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
        state: history.state,
      }),
    ),
  ).not.toContain("private-invitation");
  await page.getByRole("button", { name: "초대 수락", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "초대받은 팀", exact: true }),
  ).toBeVisible();
  expect(state.accepts).toBe(1);
});
test("mobile account mismatch allows logout/login without losing invitation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page);
  state.status = 403;
  state.code = "INVITATION_EMAIL_MISMATCH";
  await page.getByRole("button", { name: "초대 수락", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("초대받은 계정");
  await page.getByRole("button", { name: "다른 계정으로 로그인" }).click();
  await login(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  state.code = "";
  await page.getByRole("button", { name: "초대 수락", exact: true }).click();
  await expect(page).toHaveURL(/\/teams\/team$/);
});
test("expired session returns to login and network failures can retry", async ({
  page,
}) => {
  const state = await setup(page);
  state.status = 401;
  state.code = "AUTHENTICATION_REQUIRED";
  await page.getByRole("button", { name: "초대 수락", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("로그인이 만료");
  await page.getByRole("link", { name: "로그인하고 참여하기" }).click();
  await login(page);
  state.code = "";
  state.failNetwork = true;
  await page.getByRole("button", { name: "초대 수락", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("연결을 확인");
  state.failNetwork = false;
  await page.getByRole("button", { name: "초대 수락", exact: true }).click();
  await expect(page).toHaveURL(/\/teams\/team$/);
});
for (const [status, code, message] of [
  [404, "INVITATION_NOT_FOUND", "메일의 초대 링크"],
  [409, "INVITATION_NOT_PENDING", "새 초대를 요청"],
  [409, "TEAMSPACE_FULL", "정원이 가득"],
] as const) {
  test(`invitation domain error ${code}`, async ({ page }) => {
    const state = await setup(page);
    state.status = status;
    state.code = code;
    await page.getByRole("button", { name: "초대 수락", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(message);
    if (code !== "TEAMSPACE_FULL")
      await expect(
        page.getByRole("button", { name: "초대 수락", exact: true }),
      ).toHaveCount(0);
  });
}
test("old accepted invitation does not imply departed member rejoined", async ({
  page,
}) => {
  const state = await setup(page);
  state.left = true;
  await page.getByRole("button", { name: "초대 수락", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "현재 팀에 접근할 수 없습니다",
  );
  await expect(page).toHaveURL(/\/invite$/);
});
test("refresh loses memory token and explains how to recover", async ({
  page,
}) => {
  const state = await setup(page);
  await page.reload();
  await expect(
    page.getByText("메일의 초대 링크를 다시 열어 주세요.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "초대 수락", exact: true }),
  ).toHaveCount(0);
  expect(state.accepts).toBe(0);
});
test("rapid repeated accept submits only one request", async ({ page }) => {
  const state = await setup(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/invitations/accept", async (route) => {
    state.accepts++;
    await gate;
    await route.fulfill({
      status: 409,
      json: { error: { code: "TEAMSPACE_FULL" } },
    });
  });
  await page
    .getByRole("button", { name: "초대 수락", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
      button.click();
    });
  await expect.poll(() => state.accepts).toBe(1);
  await expect(
    page.getByRole("button", { name: "처리 중…", exact: true }),
  ).toBeDisabled();
  release();
  await expect(page.getByRole("alert")).toContainText("정원이 가득");
  expect(state.accepts).toBe(1);
});
