import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

async function signupAndLogin(page: Page, request: APIRequestContext, email: string) {
  await page.goto("/signup");
  await page.getByLabel("이름", { exact: true }).fill("실제 연동 검증");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByRole("button", { name: "가입 메일 요청" }).click();
  await expect(page.getByRole("status")).toContainText("이메일을 확인");
  let token = "";
  await expect.poll(async () => {
    const response = await request.get("http://localhost:18025/api/v1/messages");
    const mailbox = await response.json();
    for (const message of mailbox.messages ?? []) {
      if (!message.To?.some((to: { Address: string }) => to.Address === email)) continue;
      const body = await (await request.get(`http://localhost:18025/api/v1/message/${message.ID}`)).json();
      token = String(body.Text).match(/verify-email#token=([A-Za-z0-9_-]+)/)?.[1] ?? "";
      if (token) return true;
    }
    return false;
  }).toBe(true);
  // Transfer via memory; no URL/token values are asserted or attached to reports.
  await page.goto("/verify-email");
  await page.evaluate((value) => { window.location.hash = `token=${value}`; window.location.reload(); }, token);
  await page.getByLabel("새 비밀번호", { exact: true }).fill("Integration password 123!");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("Integration password 123!");
  await page.getByRole("button", { name: "가입 완료", exact: true }).click();
  await expect(page).toHaveURL(/completed=signup/);
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill("Integration password 123!");
  await page.getByRole("button", { name: "이메일로 로그인" }).click();
  await expect(page.getByRole("heading", { name: "내 팀", exact: true })).toBeVisible();
}

test("local backend: signup, personal availability, scheduling, occurrence and feedback persist", async ({ page, request }) => {
  const stamp = Date.now();
  await signupAndLogin(page, request, `integration-${stamp}@example.test`);
  await page.getByLabel("팀 이름", { exact: true }).fill(`연동 팀 ${stamp}`);
  await page.getByRole("button", { name: "팀 만들기", exact: true }).click();
  await expect(page.getByRole("heading", { name: `연동 팀 ${stamp}`, exact: true })).toBeVisible();
  const teams = await page.evaluate(async () => (await (await fetch("/api/v1/teamspaces")).json()).data as { id: string; name: string }[]);
  const teamId = teams.find((team) => team.name === `연동 팀 ${stamp}`)!.id;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 7);
  const from = tomorrow.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const until = new Date(tomorrow); until.setDate(until.getDate() + 14);
  const to = until.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  await page.goto("/calendar");
  await page.getByLabel("조회·확인 시작일", { exact: true }).fill(from);
  await page.getByLabel("조회·확인 종료일 (포함)", { exact: true }).fill(to);
  await page.getByLabel("일정 제목", { exact: true }).fill("비공개 바쁜 일정");
  await page.getByLabel("시작 시각", { exact: true }).fill(`${from}T10:00`);
  await page.getByLabel("종료 시각", { exact: true }).fill(`${from}T11:00`);
  await page.getByRole("button", { name: "개인 일정 저장", exact: true }).click();
  await expect(page.getByRole("heading", { name: "비공개 바쁜 일정" })).toBeVisible();
  await page.getByRole("button", { name: "이 기간 일정 입력 완료", exact: true }).click();
  await expect(page.getByText(`확인 완료: ${from} ~ ${to}`, { exact: true })).toBeVisible();
  await page.goto(`/teams/${teamId}`);
  await expect(page.getByRole("heading", { name: `연동 팀 ${stamp}`, exact: true })).toBeVisible();
  await expect(page.getByText("비공개 바쁜 일정", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "새 일정 조율", exact: true }).click();
  await page.getByLabel("조율 제목", { exact: true }).fill("실제 API 정기 연습");
  await page.getByLabel("기간 시작일", { exact: true }).fill(from);
  await page.getByLabel("기간 종료일 (포함)", { exact: true }).fill(to);
  await page.getByLabel("연습 길이 (분)", { exact: true }).fill("60");
  await page.getByLabel("탐색 시작 시각", { exact: true }).fill("18:00");
  await page.getByLabel("탐색 종료 시각", { exact: true }).fill("19:00");
  await page.getByRole("button", { name: "조율 조건 저장", exact: true }).click();
  await page.getByRole("button", { name: "추천 후보 조회", exact: true }).click();
  await page.getByRole("button", { name: "이 후보 선택", exact: true }).first().click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "전체 회차 확정", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("확정된 조율");
  await page.getByRole("link", { name: "팀 회차 목록으로", exact: true }).click();
  await page.getByRole("link", { name: /실제 API 정기 연습 · 1회/ }).click();
  const oldStart = await page.getByLabel("회차 시작 시각", { exact: true }).inputValue();
  await page.getByLabel("회차 종료 시각", { exact: true }).fill(`${oldStart.slice(0, 10)}T20:00`);
  await page.getByLabel("회차 시작 시각", { exact: true }).fill(`${oldStart.slice(0, 10)}T19:00`);
  const moved = page.waitForResponse((response) => response.url().includes("/occurrences/") && response.request().method() === "PATCH");
  await page.getByRole("button", { name: "회차 시간 변경", exact: true }).click();
  expect((await moved).status()).toBe(200);
  await expect(page.getByRole("button", { name: "회차 시간 변경", exact: true })).toBeEnabled();
  await page.getByLabel("영상 제목", { exact: true }).fill("회차 영상 A");
  await page.getByLabel("영상 HTTPS 주소", { exact: true }).fill("https://example.test/rehearsal-a");
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await page.getByRole("link", { name: /회차 영상 A ·/ }).click();
  await expect(page.getByRole("link", { name: "영상 원본 열기" })).toHaveAttribute("href", "https://example.test/rehearsal-a");
  await page.getByLabel("피드백 내용", { exact: true }).fill("서버에 저장한 실제 피드백");
  await page.getByRole("button", { name: "피드백 등록", exact: true }).click();
  await expect(page.locator("p").filter({ hasText: /^서버에 저장한 실제 피드백$/ })).toBeVisible();
  await page.reload();
  await expect(page.locator("p").filter({ hasText: /^서버에 저장한 실제 피드백$/ })).toBeVisible();
  await page.getByRole("button", { name: "영상 수정", exact: true }).click();
  await expect(page.getByLabel("영상 HTTPS 주소", { exact: true })).toBeDisabled();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "영상 편집 닫기", exact: true }).click();
  await expect(page.getByLabel("영상 HTTPS 주소", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "피드백 수정", exact: true }).click();
  await page.getByRole("textbox", { name: "수정할 피드백", exact: true }).fill("수정 후 저장된 피드백");
  await page.getByRole("button", { name: "피드백 수정 저장", exact: true }).click();
  await expect(page.locator("p").filter({ hasText: /^수정 후 저장된 피드백$/ })).toBeVisible();
  await page.getByRole("link", { name: "원래 회차로 돌아가기", exact: true }).click();
  await page.getByLabel("영상 제목", { exact: true }).fill("회차 영상 B");
  await page.getByLabel("영상 HTTPS 주소", { exact: true }).fill("https://example.test/rehearsal-b");
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await page.getByRole("link", { name: /회차 영상 B ·/ }).click();
  await expect(page.getByText("첫 피드백을 남겨 보세요.", { exact: true })).toBeVisible();
  await expect(page.locator("p").filter({ hasText: /^수정 후 저장된 피드백$/ })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "회차 영상 B", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/calendar");
  await page.getByRole("button", { name: "일정 수정", exact: true }).click();
  await page.getByLabel("일정 제목", { exact: true }).fill("충돌 뒤 유지할 입력");
  // A second client updates the same record, leaving the visible form's ETag stale.
  const concurrentStatus = await page.evaluate(async ({ from, to }) => {
    const query = new URLSearchParams({ from: `${from}T00:00:00+09:00`, to: `${to}T23:59:59+09:00` });
    const event = (await (await fetch(`/api/v1/me/personal-events?${query}`)).json()).data[0];
    const csrf = (await (await fetch("/api/v1/auth/csrf")).json()).data.token;
    const response = await fetch(`/api/v1/me/personal-events/${event.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf, "If-Match": `"${event.version}"` },
      body: JSON.stringify({ title: "다른 클라이언트 변경", description: "경합 재현", allDay: false, startsAt: event.startsAt, endsAt: event.endsAt }),
    });
    return response.status;
  }, { from, to });
  expect(concurrentStatus).toBe(200);
  const conflict = page.waitForResponse((response) => response.url().includes("/me/personal-events/") && response.request().method() === "PATCH");
  await page.getByRole("button", { name: "개인 일정 저장", exact: true }).click();
  expect((await conflict).status()).toBe(412);
  await expect(page.getByLabel("일정 제목", { exact: true })).toHaveValue("충돌 뒤 유지할 입력");
  await expect(page.getByRole("alert")).toContainText("최신 정보");
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await page.getByRole("button", { name: "일정 수정", exact: true }).click();
  await page.getByLabel("일정 제목", { exact: true }).fill("최신 버전으로 재시도 성공");
  await page.getByRole("button", { name: "개인 일정 저장", exact: true }).click();
  await expect(page.getByRole("heading", { name: "최신 버전으로 재시도 성공", exact: true })).toBeVisible();
  const logoutStatus = await page.evaluate(async () => {
    const csrf = (await (await fetch("/api/v1/auth/csrf")).json()).data.token;
    return (await fetch("/api/v1/auth/logout", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf }, body: "{}" })).status;
  });
  expect(logoutStatus).toBe(204);
  await page.reload();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await expect(page.getByText("최신 버전으로 재시도 성공", { exact: true })).toHaveCount(0);
});
