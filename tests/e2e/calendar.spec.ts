import { test, expect, type Page } from "./demo-fixture";
import { login } from "./helpers";

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const agenda = page.getByRole("region", { name: "선택한 날짜 일정" });
  expect(await agenda.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
}

for (const width of [320, 390]) {
  test(`${width}px 개인 달력은 모든 날짜와 일정, 빈 상태, 월 이동을 키보드로 탐색한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await login(page, "/calendar");
    const agenda = page.getByRole("region", { name: "선택한 날짜 일정" });
    const event = page.getByRole("button", { name: "2026년 10월 12일 14:00–16:00 제작 미팅 · 직접 입력" });
    await expect(event).toHaveCount(1);
    await expect(agenda.getByText("14:00–16:00")).toBeVisible();
    await expect(agenda.getByText("직접 입력", { exact: true })).toBeVisible();
    await expectNoOverflow(page);
    const emptyDay = page.getByRole("button", { name: "2026년 10월 1일 일정 0개", exact: true });
    await emptyDay.focus();
    await page.keyboard.press("Enter");
    await expect(emptyDay).toHaveAttribute("aria-pressed", "true");
    await expect(agenda.getByText("이 날짜에 등록된 일정이 없습니다.")).toBeVisible();
    for (let day = 1; day <= 31; day++) {
      await expect(page.getByRole("button", { name: new RegExp(`^2026년 10월 ${day}일 일정 \\d+개$`) })).toBeVisible();
    }
    const occupiedDay = page.getByRole("button", { name: "2026년 10월 12일 일정 1개", exact: true });
    await occupiedDay.focus();
    await page.keyboard.press("Space");
    await event.click();
    await expect(page.getByRole("dialog", { name: "일정 수정", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "다음 달" }).click();
    await expect(page.getByRole("heading", { name: "2026년 11월", exact: true })).toBeVisible();
    await expect(agenda.getByRole("heading")).toHaveText("2026년 11월 1일 · 일정 0개");
    await page.getByRole("button", { name: "이전 달" }).click();
    await expect(event).toBeVisible();
    await expectNoOverflow(page);
  });

  test(`${width}px 팀 달력은 전체 제목과 참석·영상 정보를 표시하고 회차로 이동한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await login(page, "/teams/padong");
    const agenda = page.getByRole("region", { name: "선택한 날짜 일정" });
    await expect(agenda.getByText("장면 읽기 · 첫 번째 합", { exact: true })).toBeVisible();
    await expect(agenda.getByText("19:00–21:00")).toBeVisible();
    await expect(agenda.getByText("가능 4명 · 영상 1", { exact: true })).toBeVisible();
    await expectNoOverflow(page);
    await agenda.getByRole("button", { name: /2026년 10월 10일 19:00.*장면 읽기/ }).click();
    await expect(page).toHaveURL("/teams/padong/occurrences/rehearsal-1");
  });
}

test("데스크톱 달력은 칸별 일정을 유지하고 화면 전환 후 중복 버튼이 없다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, "/teams/padong");
  const event = page.getByRole("button", { name: /2026년 10월 10일 19:00.*장면 읽기/ });
  await expect(event).toHaveCount(1);
  await expect(page.getByRole("region", { name: "선택한 날짜 일정" })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(event).toHaveCount(1);
  await expect(page.getByRole("region", { name: "선택한 날짜 일정" })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(event).toHaveCount(1);
  await event.click();
  await expect(page).toHaveURL("/teams/padong/occurrences/rehearsal-1");
});

test("오늘은 서울 기준 현재 날짜를 선택한다", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-21T16:00:00Z"));
  await page.setViewportSize({ width: 320, height: 844 });
  await login(page, "/calendar");
  await page.getByRole("button", { name: "오늘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "2026년 11월", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "2026년 11월 22일 일정 0개", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "선택한 날짜 일정" }).getByRole("heading")).toHaveText("2026년 11월 22일 · 일정 0개");
});

test("320px에서 같은 날짜의 긴 제목 일정도 빠짐없이 열 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await login(page, "/calendar");
  await page.getByRole("button", { name: /일정 추가/, exact: false }).click();
  const dialog = page.getByRole("dialog", { name: "바쁜 시간 추가", exact: true });
  const title = "다음 공연을 준비하는 배우와 제작진의 아주 긴 제작 미팅 제목";
  await dialog.getByLabel("제목", { exact: true }).fill(title);
  await dialog.getByLabel("시작", { exact: true }).fill("2026-10-12T17:00");
  await dialog.getByLabel("종료", { exact: true }).fill("2026-10-13T01:00");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "2026년 10월 12일 일정 2개", exact: true }).click();
  const agenda = page.getByRole("region", { name: "선택한 날짜 일정" });
  await expect(agenda.getByRole("button")).toHaveCount(2);
  await expect(agenda.getByText(title, { exact: true })).toBeVisible();
  await expect(agenda.getByText("17:00–2026/10/13 01:00", { exact: true })).toBeVisible();
  await expectNoOverflow(page);
  await agenda.getByRole("button", { name: new RegExp(title) }).click();
  await expect(page.getByRole("dialog", { name: "일정 수정", exact: true }).getByLabel("제목", { exact: true })).toHaveValue(title);
});
