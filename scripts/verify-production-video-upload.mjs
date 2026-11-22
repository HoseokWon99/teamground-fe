// Explicitly authorized production QA only, with a private synthetic fixture file.
// TEAMGROUND_PRODUCTION_FIXTURE=/absolute/private.json node scripts/verify-production-video-upload.mjs
import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
const base = "https://app.jointeamground.com";
const fixturePath = process.env.TEAMGROUND_PRODUCTION_FIXTURE;
if (!fixturePath || !fixturePath.startsWith("/")) throw new Error("Private fixture file required");
if ((await stat(fixturePath)).mode & 0o077) throw new Error("Fixture must have mode 0600");
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
if (fixture.purpose !== "teamground-production-video-qa") throw new Error("Synthetic fixture only");
const { teamId: team, occurrenceId: occurrence, email, password } = fixture;
if (!/^[a-f0-9-]{36}$/.test(team) || !/^[a-f0-9-]{36}$/.test(occurrence) || !email.endsWith("@example.test")) throw new Error("Invalid synthetic fixture");
if (team !== "9e392415-4532-4e41-9724-313be1b93191" || occurrence !== "0a39ade9-69bd-45ff-be67-fa89b7a2d652") throw new Error("Fixture not in approved production allowlist");
const file = process.env.TEAMGROUND_VIDEO_FILE ?? "/tmp/teamground-video-fixture.mp4";
const title = `운영 파일 검증 ${Date.now()}`;
const output = "output/playwright/video-production";
await mkdir(output, { recursive: true });
const evidence = { checks: [], screenshots: output };
let stage = "login";
const browser = await chromium.launch();
const context = await browser.newContext({ baseURL: base, viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  window.__videoProgress = [];
  new MutationObserver(() => {
    const el = document.querySelector('progress[aria-label="영상 업로드 진행률"]');
    if (el && !window.__videoProgress.includes(el.value)) window.__videoProgress.push(el.value);
  }).observe(document, { subtree: true, childList: true, attributes: true });
});
const page = await context.newPage();
const mediaResponses = [];
page.on("response", response => {
  const url = new URL(response.url());
  if (/\.s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(url.hostname)) mediaResponses.push({ host: url.hostname, status: response.status() });
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
async function login(page, email, secret = password) {
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "이메일로 로그인" }).click();
  await expect(page).toHaveURL(/\/teams$/);
}
async function screenshot(name) {
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
}
try {
  await login(page, email);
  stage = "upload";
  await page.goto(`/teams/${team}/occurrences/${occurrence}`);
  await page.getByLabel("영상 제목", { exact: true }).fill(title);
  await page.getByLabel("영상 파일", { exact: true }).setInputFiles(file);
  await screenshot("upload-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot("upload-mobile");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  evidence.uploadProgress = await page.evaluate(() => window.__videoProgress);
  expect(evidence.uploadProgress.length).toBeGreaterThan(0);
  await page.getByRole("link", { name: new RegExp(title) }).click();
  const videoId = new URL(page.url()).pathname.split("/").at(-1);
  evidence.videoId = videoId;
  stage = "playback";
  const player = page.locator("video");
  await expect(player).toBeVisible();
  await player.evaluate(async (el) => { el.muted = true; await el.play(); });
  await expect.poll(() => player.evaluate((el) => el.currentTime)).toBeGreaterThan(0);
  const signed = new URL(await player.getAttribute("src"));
  expect(signed.hostname).toMatch(/\.s3[.-][a-z0-9-]+\.amazonaws\.com$/);
  expect(signed.searchParams.has("X-Amz-Signature")).toBe(true);
  const unsigned = new URL(signed); unsigned.search = "";
  const direct = await context.request.get(unsigned.href);
  expect(direct.status()).toBe(403);
  const range = await context.request.get(signed.href, { headers: { Range: "bytes=0-1023" } });
  expect(range.status()).toBe(206);
  evidence.storage = { host: signed.hostname, unsignedStatus: direct.status(), signedRangeStatus: range.status(), contentType: range.headers()["content-type"], range: range.headers()["content-range"] };
  evidence.initialObjectKey = decodeURIComponent(signed.pathname.slice(1));
  evidence.initialPlaybackTime = await player.evaluate(el => el.currentTime);
  await page.reload();
  await expect(player).toBeVisible();
  await player.evaluate(async (el) => { el.muted = true; await el.play(); });
  await expect.poll(() => player.evaluate((el) => el.currentTime)).toBeGreaterThan(0);
  stage = "edit";
  await page.getByRole("button", { name: "영상 수정", exact: true }).click();
  await page.getByLabel("영상 제목", { exact: true }).fill(`${title} 수정`);
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${title} 수정`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "영상 수정", exact: true }).click();
  await page.getByLabel("교체할 영상 파일 (선택)").setInputFiles(file);
  await page.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByRole("button", { name: "영상 수정", exact: true })).toBeVisible();
  await expect.poll(async () => new URL(await player.getAttribute("src")).pathname).not.toBe(signed.pathname);
  await player.evaluate(async el => { el.muted = true; await el.play(); });
  await expect.poll(() => player.evaluate(el => el.currentTime)).toBeGreaterThan(0);
  evidence.replacementObjectKey = decodeURIComponent(new URL(await player.getAttribute("src")).pathname.slice(1));
  evidence.replacementPlaybackTime = await player.evaluate(el => el.currentTime);
  await page.getByLabel("피드백 내용", { exact: true }).fill("실제 업로드 영상의 동선을 확인했습니다.");
  await page.getByRole("button", { name: "피드백 등록", exact: true }).click();
  await expect(page.getByLabel("피드백 내용", { exact: true })).toHaveValue("");
  await expect(page.locator("article").getByText("실제 업로드 영상의 동선을 확인했습니다.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("실제 업로드 영상의 동선을 확인했습니다.", { exact: true })).toBeVisible();
  await player.evaluate(async el => { el.muted = true; await el.play(); });
  await expect.poll(() => player.evaluate(el => el.currentTime)).toBeGreaterThan(0);
  evidence.reloadPlaybackTime = await player.evaluate(el => el.currentTime);
  await screenshot("playback-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot("playback-mobile");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "영상 수정", exact: true }).click();
  await expect(page.getByLabel("교체할 영상 파일 (선택)")).toBeDisabled();
  await page.getByRole("button", { name: "영상 편집 닫기", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "확인", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  stage = "member permission";
  if (fixture.memberEmail && fixture.memberPassword) {
    if (!fixture.memberEmail.endsWith("@example.test")) throw new Error("Synthetic member only");
    const memberContext = await browser.newContext({ baseURL: base });
    const member = await memberContext.newPage();
    try {
      await login(member, fixture.memberEmail, fixture.memberPassword);
      await member.goto(`/teams/${team}/videos/${videoId}`);
      await expect(member.getByRole("heading", { name: `${title} 수정`, exact: true })).toBeVisible();
      await expect(member.getByRole("button", { name: "영상 수정", exact: true })).toHaveCount(0);
      const csrf = await memberContext.request.get("https://jointeamground.com/api/v1/auth/csrf");
      const token = (await csrf.json()).data.token;
      const denied = await memberContext.request.patch(`https://jointeamground.com/api/v1/teamspaces/${team}/videos/${videoId}`, { headers: { Origin: base, "X-CSRF-TOKEN": token, "If-Match": '"0"' }, data: { title: "권한 검증" } });
      expect(denied.status()).toBe(403);
      evidence.memberEditStatus = denied.status();
      await member.getByRole("button", { name: "로그아웃", exact: true }).click();
      await expect(member).toHaveURL(/\/login/);
    } finally { await memberContext.close(); }
  }
  stage = "cleanup";
  await page.getByRole("button", { name: "영상 삭제", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "확인", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/occurrences/${occurrence}$`));
  await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
  evidence.videoDeleted = true;
  evidence.browserMediaResponses = mediaResponses;
  expect(mediaResponses.some(item => item.status === 206 || item.status === 200)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  evidence.loggedOut = true;
  expect(errors).toEqual([]);
  evidence.result = "PASS";
  evidence.checks = ["real production multipart upload", "AWS private S3 media playback", "unsigned 403", "signed range 206", "reload playback", "JSON title update", "multipart replacement", "feedback persistence", "replacement lock", "desktop/mobile no overflow", "video and feedback deletion", "logout"];
  await writeFile(`${output}/result.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  await writeFile(`${output}/result.json`, JSON.stringify({ ...evidence, result: "FAIL", stage }, null, 2));
  console.error(JSON.stringify({ result: "FAIL", stage, errorType: error.name }));
  process.exitCode = 1;
} finally { await browser.close(); }
