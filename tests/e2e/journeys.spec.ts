import { test, expect } from "@playwright/test";
import { login, recommend } from "./helpers";

test("관리자가 추천을 확정하고 로컬 영상을 재생한 뒤 피드백을 새로고침으로 복원한다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await recommend(page);
  await page.getByRole("button", { name: "이 시간으로 확정" }).click();
  const confirm = page.getByRole("dialog", { name: "이 시간으로 연습을 확정할까요?" });
  for (const date of ["2026-10-14", "2026-10-21", "2026-10-28", "2026-11-04"]) {
    await expect(confirm.getByText(new RegExp(date))).toBeVisible();
  }
  await confirm.getByRole("button", { name: "4개 회차 확정" }).click();
  await expect(page).toHaveURL(/\/occurrences\/[^/]+$/);
  const addVideo = page.getByRole("button", { name: "영상 추가", exact: true, includeHidden: true }).first();
  await addVideo.click();
  const modal = page.getByRole("dialog", { name: "연습 영상 추가" });
  await modal.getByRole("button", { name: "로컬 데모 영상 선택" }).click();
  await modal.getByLabel("영상 제목").fill("회귀 연습 영상");
  await modal.getByRole("button", { name: "영상 추가", exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(addVideo).toBeFocused();
  await page.getByRole("link", { name: /회귀 연습 영상/ }).click();
  const video = page.locator("video");
  await expect(video).toBeVisible();
  // Exercise the actual bundled media, without mocking network or app modules.
  await video.evaluate(async (element: HTMLVideoElement) => { element.muted = true; await element.play(); });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0);
  await page.getByLabel("이 영상에 대한 피드백").fill("동선과 호흡을 다음 연습에서도 이어가요.");
  await page.getByRole("button", { name: "피드백 등록", exact: true }).click();
  await expect(page.getByLabel("이 영상에 대한 피드백")).toHaveValue("");
  await page.reload();
  await expect(page.getByRole("heading", { name: "회귀 연습 영상" })).toBeVisible();
  await expect(page.getByText("동선과 호흡을 다음 연습에서도 이어가요.", { exact: true })).toHaveCount(1);
  const editVideo = page.locator(".page-header").getByRole("button", { name: "수정", exact: true, includeHidden: true });
  await editVideo.click();
  const editModal = page.getByRole("dialog", { name: "영상 수정", exact: true });
  await expect(editModal).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(editModal).toBeHidden();
  await expect(editVideo).toBeFocused();
  expect(errors).toEqual([]);
});

test("뒤로 가기 취소는 미저장 팀을 보존하고 폐기는 목록으로 이동한다", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "팀 만들기", exact: true }).click();
  const name = page.getByPlaceholder("예: 파동 극단");
  await name.fill("미저장 팀");
  await page.goBack();
  const dialog = page.getByRole("dialog", { name: "저장하지 않은 내용을 버릴까요?" });
  await dialog.getByRole("button", { name: "계속 작성" }).click();
  await expect(page).toHaveURL("/teams/new");
  await expect(name).toHaveValue("미저장 팀");
  await page.goBack();
  await dialog.getByRole("button", { name: "버리고 이동" }).click();
  await expect(page).toHaveURL("/teams");
  await expect(page.getByText("미저장 팀", { exact: true })).toHaveCount(0);
});

test("일반 멤버는 추천 조회가 가능하지만 초대와 확정 권한이 없다", async ({ page }) => {
  await login(page, "/teams/padong/members", "하린");
  await expect(page.getByRole("heading", { name: /함께하는 멤버/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "멤버 초대" })).toHaveCount(0);
  await recommend(page);
  await expect(page.getByText("관리자가 일정을 확정할 수 있어요")).toBeVisible();
  await expect(page.getByRole("button", { name: "이 시간으로 확정" })).toHaveCount(0);
  await page.goto("/teams/padong/occurrences/frame-1");
  await expect(page.getByRole("heading", { name: "일정을 찾을 수 없습니다" })).toBeVisible();
});

test("390px 메뉴는 키보드 초점을 유지하고 닫힌 뒤 복원하며 이동한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const opener = page.getByRole("button", { name: "메뉴 열기", includeHidden: true });
  await opener.click();
  const menu = page.getByRole("dialog", { name: "작업 공간 메뉴", exact: true });
  await expect(menu).toBeVisible();
  await expect(opener).toHaveAttribute("aria-expanded", "true");
  for (let index = 0; index < 10; index++) {
    await page.keyboard.press("Tab");
    await expect.poll(() => menu.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await menu.getByRole("link", { name: "내 일정", exact: true }).click();
  await expect(page).toHaveURL("/calendar");
  await expect(menu).toBeHidden();
  await expect(page.getByRole("heading", { name: "2026년 10월", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("초대 모달은 이메일에서 시작해 양방향 Tab을 가두고 Escape 후 초점을 복원한다", async ({ page }) => {
  await login(page, "/teams/padong/members");
  const opener = page.getByRole("button", { name: "멤버 초대", exact: true, includeHidden: true });
  await opener.click();
  const invite = page.getByRole("dialog", { name: "함께할 멤버 초대" });
  await expect(invite.getByRole("textbox")).toBeFocused();
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let index = 0; index < 12; index++) {
      await page.keyboard.press(key);
      await expect.poll(() => invite.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    }
  }
  await page.keyboard.press("Escape");
  await expect(invite).toBeHidden();
  await expect(opener).toBeFocused();
});
