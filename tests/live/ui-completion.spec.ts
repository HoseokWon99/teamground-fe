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
        "http://localhost:18025/api/v1/messages",
      );
      const mailbox = await response.json();
      for (const message of mailbox.messages ?? []) {
        if (
          !message.To?.some((to: { Address: string }) => to.Address === email)
        )
          continue;
        const body = await (
          await request.get(
            `http://localhost:18025/api/v1/message/${message.ID}`,
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

test("local backend account: profile persistence, ownership guard, withdrawal and rejected login", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const email = `ui-completion-${stamp}@example.test`;
  await signupAndLogin(page, request, email);
  await page.goto("/account");
  await page.getByLabel("표시 이름", { exact: true }).fill("변경한 실제 회원");
  await page.getByRole("button", { name: "프로필 저장", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("프로필을 저장했습니다");
  await page.reload();
  await expect(page.getByLabel("표시 이름", { exact: true })).toHaveValue(
    "변경한 실제 회원",
  );
  const owned = await page.evaluate(async (name) => {
    const token = (await (await fetch("/api/v1/auth/csrf")).json()).data.token;
    const headers = {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": token,
    };
    const created = await fetch("/api/v1/teamspaces", {
      method: "POST",
      headers,
      body: JSON.stringify({ name, description: "로컬 UI 검증용" }),
    });
    const team = (await created.json()).data;
    const refused = await fetch("/api/v1/me", { method: "DELETE", headers });
    return {
      id: team.id as string,
      name: team.name as string,
      version: team.version as number,
      status: refused.status,
    };
  }, `탈퇴 검증팀 ${stamp}`);
  expect(owned.status).toBe(409);
  await page.reload();
  await page.getByRole("button", { name: "서비스 탈퇴", exact: true }).click();
  await expect(
    page.getByRole("link", { name: `${owned.name} 관리하기`, exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("확인을 위해 ‘서비스 탈퇴’를 입력해 주세요", { exact: true })
    .fill("서비스 탈퇴");
  await expect(
    page.getByRole("button", { name: "탈퇴 확정", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  const deleted = await page.evaluate(async (team) => {
    const token = (await (await fetch("/api/v1/auth/csrf")).json()).data.token;
    return (
      await fetch(`/api/v1/teamspaces/${team.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": token,
          "If-Match": `"${team.version}"`,
        },
        body: JSON.stringify({ confirmationName: team.name }),
      })
    ).status;
  }, owned);
  expect(deleted).toBe(204);
  await page.getByRole("button", { name: "서비스 탈퇴", exact: true }).click();
  await page
    .getByLabel("확인을 위해 ‘서비스 탈퇴’를 입력해 주세요", { exact: true })
    .fill("서비스 탈퇴");
  await page.getByRole("button", { name: "탈퇴 확정", exact: true }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "로그인", exact: true }),
  ).toBeVisible();
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill("Integration password 123!");
  await page
    .getByRole("button", { name: "이메일로 로그인", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("이메일 또는 비밀번호");
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
});
