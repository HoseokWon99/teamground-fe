import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
const mailpit = "http://localhost:18025";
async function mailLink(request: APIRequestContext, email: string, path: string) {
  let link = "";
  await expect.poll(async () => {
    const mailbox = await (await request.get(`${mailpit}/api/v1/messages`)).json();
    for (const message of mailbox.messages ?? []) {
      if (!message.To?.some((to: { Address: string }) => to.Address === email)) continue;
      const body = await (await request.get(`${mailpit}/api/v1/message/${message.ID}`)).json();
      const match = String(body.Text).match(new RegExp(`http://localhost:5173/${path}#token=[A-Za-z0-9_-]+`));
      if (match) { link = match[0]; return true; }
    }
    return false;
  }, { timeout: 15_000 }).toBe(true);
  return link;
}
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "이메일로 로그인" }).click();
}
test("live SMTP signup, verify, session restore, team create, logout and session-revoking reset", async ({ page, request, browser }) => {
  const email = `fe-live-${Date.now()}@example.test`;
  const password = "Original password 123!";
  const nextPassword = "Changed password 456!";
  await page.goto("/teams");
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await page.getByRole("link", { name: "회원가입", exact: true }).click();
  await page.getByLabel("이름", { exact: true }).fill("연동 검증 회원");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByRole("button", { name: "가입 메일 요청" }).click();
  await expect(page.getByRole("status")).toContainText("이메일을 확인");
  await page.screenshot({ path: "output/playwright/live-signup-desktop.png" });
  const verifyLink = await mailLink(request, email, "verify-email");
  await page.goto(verifyLink);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("새 비밀번호", { exact: true }).waitFor();
  await page.screenshot({ path: "output/playwright/live-verify-mobile.png" });
  await expect(page).toHaveURL("/verify-email");
  await page.getByLabel("새 비밀번호", { exact: true }).fill(password);
  await page.getByLabel("비밀번호 확인", { exact: true }).fill(password);
  await page.getByRole("button", { name: "가입 완료", exact: true }).click();
  await expect(page).toHaveURL(/completed=signup/);
  await login(page, email, password);
  await expect(page.getByRole("heading", { name: "내 팀", exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText("연동 검증 회원 · 이메일 계정")).toBeVisible();
  await page.getByLabel("팀 이름", { exact: true }).fill("실제 연동 팀");
  await page.getByRole("button", { name: "팀 만들기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "실제 연동 팀" })).toBeVisible();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.goto("/teams"); await expect(page).toHaveURL(/\/login\?returnTo=/);
  await login(page, email, password);
  await expect(page.getByRole("heading", { name: "내 팀", exact: true })).toBeVisible();
  const oldSession = await browser.newContext({ storageState: await page.context().storageState(), baseURL: "http://localhost:5173" });
  const oldPage = await oldSession.newPage();
  await oldPage.goto("/teams"); await expect(oldPage.getByRole("heading", { name: "내 팀", exact: true })).toBeVisible();
  await page.goto("/forgot-password");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByRole("button", { name: "재설정 메일 요청" }).click();
  await expect(page.getByRole("status")).toContainText("이메일을 확인");
  const resetLink = await mailLink(request, email, "reset-password");
  await page.goto(resetLink); await expect(page).toHaveURL("/reset-password");
  await page.getByLabel("새 비밀번호", { exact: true }).fill(nextPassword);
  await page.getByLabel("비밀번호 확인", { exact: true }).fill(nextPassword);
  await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
  await expect(page).toHaveURL(/completed=reset/);
  await oldPage.reload(); await expect(oldPage).toHaveURL(/\/login\?returnTo=/);
  await oldSession.close();
  await login(page, email, password); await expect(page.getByRole("alert")).toContainText("이메일 또는 비밀번호");
  await login(page, email, nextPassword); await expect(page.getByRole("heading", { name: "내 팀", exact: true })).toBeVisible();
  await page.goto(resetLink);
  await page.getByLabel("새 비밀번호", { exact: true }).fill("Another password 789!");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("Another password 789!");
  await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("만료되었거나 이미 사용");
});
