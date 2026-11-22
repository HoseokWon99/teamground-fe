import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";

async function signupAndLogin(
  page: Page,
  request: APIRequestContext,
  email: string,
) {
  await page.goto("/signup");
  await page.getByLabel("이름", { exact: true }).fill("실제 연동 검증");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByRole("button", { name: "가입 메일 요청" }).click();
  await expect(page.getByRole("status")).toContainText("이메일을 확인");
  let token = "";
  await expect
    .poll(async () => {
      const response = await request.get(
        "http://localhost:18086/api/v1/messages",
      );
      const mailbox = await response.json();
      for (const message of mailbox.messages ?? []) {
        if (
          !message.To?.some((to: { Address: string }) => to.Address === email)
        )
          continue;
        const body = await (
          await request.get(
            `http://localhost:18086/api/v1/message/${message.ID}`,
          )
        ).json();
        token =
          String(body.Text).match(/verify-email#token=([A-Za-z0-9_-]+)/)?.[1] ??
          "";
        if (token) return true;
      }
      return false;
    })
    .toBe(true);
  // Transfer via memory; no URL/token values are asserted or attached to reports.
  await page.goto("/verify-email");
  await page.evaluate((value) => {
    window.location.hash = `token=${value}`;
    window.location.reload();
  }, token);
  await page
    .getByLabel("새 비밀번호", { exact: true })
    .fill("Integration password 123!");
  await page
    .getByLabel("비밀번호 확인", { exact: true })
    .fill("Integration password 123!");
  await page.getByRole("button", { name: "가입 완료", exact: true }).click();
  await expect(page).toHaveURL(/completed=signup/);
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill("Integration password 123!");
  await page.getByRole("button", { name: "이메일로 로그인" }).click();
  await expect(
    page.getByRole("heading", { name: "내 팀", exact: true }),
  ).toBeVisible();
}

async function mailToken(request: APIRequestContext, email: string) {
  let token = "";
  await expect
    .poll(async () => {
      const mailbox = await (
        await request.get("http://localhost:18086/api/v1/messages")
      ).json();
      for (const message of mailbox.messages ?? []) {
        if (
          !message.To?.some((to: { Address: string }) => to.Address === email)
        )
          continue;
        const body = await (
          await request.get(
            `http://localhost:18086/api/v1/message/${message.ID}`,
          )
        ).json();
        token =
          String(body.Text).match(/invite#token=([A-Za-z0-9_-]+)/)?.[1] ?? "";
        if (token) return true;
      }
      return false;
    })
    .toBe(true);
  return token;
}
async function openInvitation(page: Page, token: string) {
  await page.goto("/invite");
  await page.evaluate((value) => {
    location.hash = `token=${value}`;
    location.reload();
  }, token);
  await expect(
    page
      .getByRole("button", { name: "초대 수락", exact: true })
      .or(page.getByRole("link", { name: "로그인하고 참여하기" })),
  ).toBeVisible();
  expect(await page.evaluate(() => location.hash.length)).toBe(0);
}
async function loginInvitee(page: Page, email: string) {
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill("Integration password 123!");
  await page.getByRole("button", { name: "이메일로 로그인" }).click();
  await expect(
    page.getByRole("button", { name: "초대 수락", exact: true }),
  ).toBeVisible();
}
test("real SMTP invitation: mismatch, account switch, accept, repeat, leave and historic link", async ({
  page,
  request,
  browser,
}) => {
  const stamp = Date.now();
  const owner = `invite-owner-${stamp}@example.test`;
  const invitee = `invite-member-${stamp}@example.test`;
  await signupAndLogin(page, request, owner);
  const memberContext = await browser.newContext({
    baseURL: "http://localhost:5175",
    viewport: { width: 390, height: 844 },
  });
  const memberPage = await memberContext.newPage();
  await signupAndLogin(memberPage, request, invitee);
  await memberPage
    .getByRole("button", { name: "로그아웃", exact: true })
    .click();
  await page
    .getByRole("link", { name: "팀 만들기", exact: true })
    .first()
    .click();
  await page.getByLabel("팀 이름", { exact: true }).fill(`초대 연동 ${stamp}`);
  await page.getByRole("button", { name: "팀 만들기", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `초대 연동 ${stamp}`, exact: true }),
  ).toBeVisible();
  const teamPath = new URL(page.url()).pathname;
  await page.goto(`${teamPath}/members`);
  await page.getByLabel("초대 이메일", { exact: true }).fill(invitee);
  await page.getByRole("button", { name: "초대 요청", exact: true }).click();
  await expect(
    page.getByText(`${invitee} · 수락 대기`, { exact: false }),
  ).toBeVisible();
  const token = await mailToken(request, invitee);
  // Wrong logged-in account must fail, then SPA account switch keeps the token.
  await openInvitation(page, token);
  await page.getByRole("button", { name: "초대 수락", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("초대받은 계정");
  await page.getByRole("button", { name: "다른 계정으로 로그인" }).click();
  await loginInvitee(page, invitee);
  await page
    .getByRole("button", { name: "초대 수락", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(
    page.getByRole("heading", { name: `초대 연동 ${stamp}`, exact: true }),
  ).toBeVisible();
  await page.goto(`${teamPath}/members`);
  const members = await page.evaluate(
    async (path) =>
      (
        await (
          await fetch(`/api/v1/teamspaces/${path.split("/").pop()}/members`)
        ).json()
      ).data as { userId: string }[],
    teamPath,
  );
  expect(members.length).toBe(2);
  // Logged-out mobile path returns to invitation after email login, repeat is idempotent.
  await openInvitation(memberPage, token);
  await memberPage.getByRole("link", { name: "로그인하고 참여하기" }).click();
  await loginInvitee(memberPage, invitee);
  await memberPage
    .getByRole("button", { name: "초대 수락", exact: true })
    .click();
  await expect(
    memberPage.getByRole("heading", {
      name: `초대 연동 ${stamp}`,
      exact: true,
    }),
  ).toBeVisible();
  await memberPage.goto(`${teamPath}/members`);
  await memberPage
    .getByRole("button", { name: "팀 탈퇴", exact: true })
    .click();
  await memberPage
    .getByRole("dialog")
    .getByRole("button", { name: "확인", exact: true })
    .click();
  await expect(memberPage).toHaveURL(/\/teams$/);
  await openInvitation(memberPage, token);
  await memberPage
    .getByRole("button", { name: "초대 수락", exact: true })
    .click();
  await expect(memberPage.getByRole("alert")).toContainText(
    "현재 팀에 접근할 수 없습니다",
  );
  await memberContext.close();
});

test("real SMTP invitation: replaced and cancelled links cannot join", async ({
  page,
  request,
  browser,
}) => {
  const stamp = Date.now();
  const invitee = `revoked-member-${stamp}@example.test`;
  await signupAndLogin(page, request, `revoked-owner-${stamp}@example.test`);
  const memberContext = await browser.newContext({
    baseURL: "http://localhost:5175",
  });
  const memberPage = await memberContext.newPage();
  await signupAndLogin(memberPage, request, invitee);
  await page
    .getByRole("link", { name: "팀 만들기", exact: true })
    .first()
    .click();
  await page.getByLabel("팀 이름", { exact: true }).fill(`취소 검증 ${stamp}`);
  await page.getByRole("button", { name: "팀 만들기", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `취소 검증 ${stamp}`, exact: true }),
  ).toBeVisible();
  const teamPath = new URL(page.url()).pathname;
  await page.goto(`${teamPath}/members`);
  await page.getByLabel("초대 이메일", { exact: true }).fill(invitee);
  await page.getByRole("button", { name: "초대 요청", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "재발급", exact: true }),
  ).toBeVisible();
  const firstToken = await mailToken(request, invitee);
  await page.getByRole("button", { name: "재발급", exact: true }).click();
  await expect
    .poll(async () => (await mailToken(request, invitee)) !== firstToken)
    .toBe(true);
  const nextToken = await mailToken(request, invitee);
  await openInvitation(memberPage, firstToken);
  await memberPage
    .getByRole("button", { name: "초대 수락", exact: true })
    .click();
  await expect(memberPage.getByRole("alert")).toContainText("새 초대를 요청");
  await page
    .getByText(`${invitee} · 수락 대기`, { exact: false })
    .locator("..")
    .getByRole("button", { name: "초대 취소", exact: true })
    .click();
  await expect(
    page.getByText(`${invitee} · 수락 대기`, { exact: false }),
  ).toHaveCount(0);
  await openInvitation(memberPage, nextToken);
  await memberPage
    .getByRole("button", { name: "초대 수락", exact: true })
    .click();
  await expect(memberPage.getByRole("alert")).toContainText("새 초대를 요청");
  const members = await page.evaluate(
    async (path) =>
      (
        await (
          await fetch(`/api/v1/teamspaces/${path.split("/").pop()}/members`)
        ).json()
      ).data as unknown[],
    teamPath,
  );
  expect(members.length).toBe(1);
  await memberContext.close();
});
