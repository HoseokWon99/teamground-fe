import { test, expect } from "@playwright/test";

test("server upload preserves file on failure, guards duplicates and sends multipart with CSRF", async ({ page }) => {
  let uploads = 0;
  let release: (() => void) | undefined;
  const profile = { id: "user", displayName: "회원", verifiedEmail: "user@example.com", authMethod: "EMAIL", timezone: "Asia/Seoul", version: 0 };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/me")) return route.fulfill({ json: { data: profile } });
    if (path.endsWith("/auth/csrf")) return route.fulfill({ json: { data: { token: "upload-csrf" } } });
    if (path.endsWith("/videos") && request.method() === "POST") {
      uploads++;
      expect(request.headers()["content-type"]).toContain("multipart/form-data; boundary=");
      expect(request.headers()["x-csrf-token"]).toBe("upload-csrf");
      const body = request.postDataBuffer()!.toString();
      expect(body).toContain('name="file"; filename="rehearsal.mp4"');
      expect(body).toContain('name="title"');
      expect(body).not.toContain('name="sourceUrl"');
      if (uploads === 1) return route.fulfill({ status: 503, json: { error: { code: "VIDEO_STORAGE_UNAVAILABLE" } } });
      if (uploads === 2) return route.abort("connectionfailed");
      await new Promise<void>((resolve) => { release = resolve; });
      return route.fulfill({ status: 201, json: { data: { id: "v" } } });
    }
    if (path.endsWith("/occurrences/occ")) return route.fulfill({ json: { data: { id: "occ", title: "연습 회차", status: "SCHEDULED", sequence: 1, startsAt: "2026-11-22T10:00:00Z", endsAt: "2026-11-22T11:00:00Z", members: [], version: 0 } } });
    if (path.endsWith("/teamspaces/team")) return route.fulfill({ json: { data: { id: "team", name: "팀", role: "MEMBER", version: 0 } } });
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto("/teams/team/occurrences/occ");
  await expect(page.getByLabel("영상 HTTPS 주소")).toHaveCount(0);
  await page.getByLabel("영상 제목", { exact: true }).fill("로컬 연습");
  const file = page.getByLabel("영상 파일", { exact: true });
  await file.setInputFiles({ name: "invalid.txt", mimeType: "text/plain", buffer: Buffer.from("bad") });
  await expect(page.getByText("MP4 또는 WebM 영상 파일을 선택해 주세요.")).toBeVisible();
  await expect(page.getByRole("button", { name: "영상 저장", exact: true })).toBeDisabled();
  await file.setInputFiles("public/demo/rehearsal.mp4");
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByText("영상 저장소를 사용할 수 없습니다.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("영상 제목", { exact: true })).toHaveValue("로컬 연습");
  expect(await file.evaluate((el: HTMLInputElement) => el.files?.[0].name)).toBe("rehearsal.mp4");
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByText("전송이 중단되었습니다.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "영상 저장", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "저장 결과 확인함 · 재시도 허용" }).click();
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByRole("button", { name: "저장 중…", exact: true })).toBeDisabled();
  await expect.poll(() => uploads).toBe(3);
  release!();
  await expect(page.getByLabel("영상 제목", { exact: true })).toHaveValue("");
  expect(await file.evaluate((el: HTMLInputElement) => el.files?.length)).toBe(0);
  expect(uploads).toBe(3);
});

test("video editing uses JSON for title, multipart for replacement and locks feedback originals", async ({ page }) => {
  let video = { id: "v", occurrenceId: "occ", authorId: "user", authorDisplayName: "회원", title: "첫 영상", sourceUrl: "/demo/rehearsal.mp4", playbackType: "DIRECT_MP4", everReceivedFeedback: false, version: 2 };
  const types: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path.endsWith("/me")) return route.fulfill({ json: { data: { id: "user", displayName: "회원", verifiedEmail: "a@example.com", authMethod: "EMAIL" } } });
    if (path.endsWith("/csrf")) return route.fulfill({ json: { data: { token: "csrf" } } });
    if (path.endsWith("/videos/v")) {
      if (req.method() === "PATCH") {
        expect(req.headers()["if-match"]).toBe(`"${video.version}"`);
        types.push(req.headers()["content-type"]);
        if (types.length === 1) {
          expect(req.postDataJSON()).toEqual({ title: "제목 변경", occurrenceId: "occ" });
          video = { ...video, title: "제목 변경", version: 3 };
        } else {
          expect(req.postDataBuffer()!.toString()).toContain('name="file"');
          expect(req.postDataBuffer()!.toString()).not.toContain('name="sourceUrl"');
          video = { ...video, version: 4, everReceivedFeedback: true };
        }
      }
      return route.fulfill({ json: { data: video } });
    }
    if (path.endsWith("/occurrences/occ")) return route.fulfill({ json: { data: { id: "occ", status: "SCHEDULED", startsAt: "2026-11-22T10:00:00Z", endsAt: "2026-11-22T11:00:00Z", members: [] } } });
    if (path.endsWith("/teamspaces/team")) return route.fulfill({ json: { data: { id: "team", name: "팀", role: "MEMBER" } } });
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto("/teams/team/videos/v");
  await page.getByRole("button", { name: "영상 수정", exact: true }).click();
  await page.getByLabel("영상 제목", { exact: true }).fill("제목 변경");
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByRole("heading", { name: "제목 변경", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "영상 수정", exact: true }).click();
  await page.getByLabel("교체할 영상 파일 (선택)").setInputFiles("public/demo/rehearsal.mp4");
  await expect(page.getByLabel("영상이 속한 회차")).toBeDisabled();
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByRole("button", { name: "영상 수정", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "영상 수정", exact: true }).click();
  await expect(page.getByLabel("교체할 영상 파일 (선택)")).toBeDisabled();
  expect(types[0]).toBe("application/json");
  expect(types[1]).toContain("multipart/form-data; boundary=");
});

for (const draft of ["", "작성 중인 피드백"]) {
  test(`successful video deletion returns to occurrence without another discard prompt (${draft ? "draft" : "empty"})`, async ({ page }) => {
    let deletes = 0;
    let failDelete = true;
    const video = { id: "v", occurrenceId: "occ", authorId: "user", authorDisplayName: "회원", title: "삭제할 영상", sourceUrl: "/demo/rehearsal.mp4", playbackType: "DIRECT_MP4", everReceivedFeedback: true, version: 3 };
    await page.route("**/api/v1/**", async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      if (path.endsWith("/me")) return route.fulfill({ json: { data: { id: "user", displayName: "회원", verifiedEmail: "a@example.com", authMethod: "EMAIL" } } });
      if (path.endsWith("/csrf")) return route.fulfill({ json: { data: { token: "csrf" } } });
      if (path.endsWith("/videos/v")) {
        if (req.method() === "DELETE") {
          deletes++;
          expect(req.headers()["if-match"]).toBe('"3"');
          if (failDelete) return route.fulfill({ status: 503, json: { error: { code: "SERVER_ERROR" } } });
          return route.fulfill({ status: 204 });
        }
        return route.fulfill({ json: { data: video } });
      }
      if (path.endsWith("/occurrences/occ")) return route.fulfill({ json: { data: { id: "occ", title: "원래 회차", sequence: 1, status: "SCHEDULED", startsAt: "2026-11-22T10:00:00Z", endsAt: "2026-11-22T11:00:00Z", members: [], version: 0 } } });
      if (path.endsWith("/teamspaces/team")) return route.fulfill({ json: { data: { id: "team", name: "팀", role: "OWNER" } } });
      return route.fulfill({ json: { data: [] } });
    });
    await page.goto("/teams/team/videos/v");
    await page.getByRole("textbox", { name: "피드백 내용", exact: true }).fill(draft);
    await page.getByRole("button", { name: "영상 삭제", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "취소", exact: true }).click();
    expect(deletes).toBe(0);
    await expect(page.getByRole("textbox", { name: "피드백 내용", exact: true })).toHaveValue(draft);
    await page.getByRole("button", { name: "영상 삭제", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "확인", exact: true }).click();
    await expect.poll(() => deletes).toBe(1);
    await expect(page.getByText("요청을 처리하지 못했습니다.", { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/\/videos\/v$/);
    await expect(page.getByRole("textbox", { name: "피드백 내용", exact: true })).toHaveValue(draft);
    if (draft) {
      await page.getByRole("link", { name: "원래 회차로 돌아가기" }).click();
      await expect(page.getByRole("dialog", { name: "저장하지 않은 내용을 버릴까요?" })).toBeVisible();
      await page.getByRole("button", { name: "계속 작성", exact: true }).click();
    }
    failDelete = false;
    await page.getByRole("button", { name: "영상 삭제", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "확인", exact: true }).click();
    await expect(page).toHaveURL(/\/occurrences\/occ$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(deletes).toBe(2);
  });
}
