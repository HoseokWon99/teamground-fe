// Run only against the isolated BE VideoUploadLocalFixture + S3Mock environment.
// TEAMGROUND_VIDEO_BASE=http://localhost:5174 node scripts/verify-video-upload.mjs
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const base = process.env.TEAMGROUND_VIDEO_BASE ?? "http://localhost:5174";
if (!/^http:\/\/localhost:\d+$/.test(base)) throw new Error("Local fixture only");
const team = "33333333-3333-3333-3333-333333333333";
const occurrence = "99999999-9999-9999-9999-999999999999";
const file = process.env.TEAMGROUND_VIDEO_FILE ?? "/tmp/teamground-video-fixture.mp4";
const title = `파일 통합 검증 ${Date.now()}`;
const output = "output/video-upload";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ baseURL: base, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill("VideoTest123!");
  await page.getByRole("button", { name: "이메일로 로그인" }).click();
  await expect(page).toHaveURL(/\/teams$/);
}
async function screenshot(name) {
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
}
try {
  await login(page, "video-owner@example.test");
  await page.goto(`/teams/${team}/occurrences/${occurrence}`);
  await page.getByLabel("영상 제목", { exact: true }).fill(title);
  await page.getByLabel("영상 파일", { exact: true }).setInputFiles(file);
  await screenshot("upload-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot("upload-mobile");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await page.getByRole("link", { name: new RegExp(title) }).click();
  const videoId = new URL(page.url()).pathname.split("/").at(-1);
  const player = page.locator("video");
  await expect(player).toBeVisible();
  await player.evaluate(async (el) => { el.muted = true; await el.play(); });
  await expect.poll(() => player.evaluate((el) => el.currentTime)).toBeGreaterThan(0);
  expect(await player.getAttribute("src")).toContain("19000");
  await page.reload();
  await expect(player).toBeVisible();
  await player.evaluate(async (el) => { el.muted = true; await el.play(); });
  await expect.poll(() => player.evaluate((el) => el.currentTime)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "영상 수정", exact: true }).click();
  await page.getByLabel("영상 제목", { exact: true }).fill(`${title} 수정`);
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${title} 수정`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "영상 수정", exact: true }).click();
  await page.getByLabel("교체할 영상 파일 (선택)").setInputFiles(file);
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByRole("button", { name: "영상 수정", exact: true })).toBeVisible();
  await page.getByLabel("피드백 내용", { exact: true }).fill("실제 업로드 영상의 동선을 확인했습니다.");
  await page.getByRole("button", { name: "피드백 등록", exact: true }).click();
  await expect(page.getByLabel("피드백 내용", { exact: true })).toHaveValue("");
  await expect(page.locator("article").getByText("실제 업로드 영상의 동선을 확인했습니다.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("실제 업로드 영상의 동선을 확인했습니다.", { exact: true })).toBeVisible();
  await screenshot("playback-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot("playback-mobile");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "영상 수정", exact: true }).click();
  await expect(page.getByLabel("교체할 영상 파일 (선택)")).toBeDisabled();
  const memberContext = await browser.newContext({ baseURL: base });
  const member = await memberContext.newPage();
  await login(member, "video-member@example.test");
  await member.goto(`/teams/${team}/videos/${videoId}`);
  await expect(member.getByRole("heading", { name: `${title} 수정`, exact: true })).toBeVisible();
  await expect(member.getByRole("button", { name: "영상 수정", exact: true })).toHaveCount(0);
  const csrf = await memberContext.request.get("/api/v1/auth/csrf");
  const token = (await csrf.json()).data.token;
  const denied = await memberContext.request.patch(`/api/v1/teamspaces/${team}/videos/${videoId}`, { headers: { Origin: base, "X-CSRF-TOKEN": token, "If-Match": '"0"' }, data: { title: "타인 변경" } });
  expect(denied.status()).toBe(403);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ result: "PASS", videoId, title, checks: ["multipart upload", "S3Mock media playback", "reload playback", "JSON title update", "multipart replacement", "feedback persistence", "replacement lock", "non-author UI and API 403", "desktop/mobile no overflow"], screenshots: output }));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  console.error(await page.locator("body").innerText());
  throw error;
} finally { await browser.close(); }
