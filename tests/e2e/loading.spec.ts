import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("로그인 초기 전송은 작업공간·서비스·추천·데모 도구를 제외한다", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(request.url());
  });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "선택한 계정으로 시작하기" })).toBeVisible();
  expect(scripts.some((url) => /\/(service|recommendation|DemoToolsContent|WorkspaceLayout)-/.test(url))).toBe(false);
  await page.getByRole("button", { name: "선택한 계정으로 시작하기" }).click();
  await expect(page).toHaveURL("/teams");
  await expect(page.getByRole("heading", { name: "지우님의 팀" })).toBeVisible();
  expect(scripts.some((url) => /\/service-/.test(url))).toBe(true);
  expect(scripts.some((url) => /\/(recommendation|DemoToolsContent)-/.test(url))).toBe(false);
  await page.getByText("발표용 데모 도구", { exact: true }).click();
  await expect(page.getByRole("button", { name: "데모 초기화" })).toBeVisible();
  expect(scripts.some((url) => /\/DemoToolsContent-/.test(url))).toBe(true);
});

test("차가운 상세 링크는 로그인 후 목적지를 복원하고 새로고침해도 유지한다", async ({ page }) => {
  const destination = "/teams/padong/members";
  await page.goto(destination);
  await expect(page).toHaveURL(`/login?returnTo=${encodeURIComponent(destination)}`);
  await page.getByRole("button", { name: "선택한 계정으로 시작하기" }).click();
  await expect(page).toHaveURL(destination);
  await expect(page.getByRole("heading", { name: /함께하는 멤버/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /함께하는 멤버/ })).toBeVisible();
});

test("지연된 인증 chunk는 로딩 안내를 표시하고 로드 후 화면을 복원한다", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/assets/pages-*.js", async (route) => { await gate; await route.continue(); });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  try {
    await expect(page.getByText("화면을 준비하는 중…")).toBeVisible();
  } finally { release(); }
  await expect(page.getByRole("button", { name: "선택한 계정으로 시작하기" })).toBeVisible();
});

test("로그인 서비스 chunk 실패는 새로고침으로 복구한다", async ({ page }) => {
  await page.route("**/assets/service-*.js", (route) => route.abort());
  await page.goto("/login");
  await page.getByRole("button", { name: "선택한 계정으로 시작하기" }).click();
  await expect(page.getByText("로그인 기능을 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.")).toBeVisible();
  await page.unroute("**/assets/service-*.js");
  await page.getByRole("button", { name: "새로고침", exact: true }).click();
  await page.getByRole("button", { name: "선택한 계정으로 시작하기" }).click();
  await expect(page).toHaveURL("/teams");
});

test("서비스를 가져오는 동안 로그인 취소는 세션을 만들지 않는다", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/assets/service-*.js", async (route) => { await gate; await route.continue(); });
  await page.goto("/login");
  await page.getByRole("button", { name: "선택한 계정으로 시작하기" }).click();
  try { await page.getByRole("button", { name: "로그인 취소", exact: true }).click(); }
  finally { release(); }
  await expect(page.getByRole("button", { name: "선택한 계정으로 시작하기" })).toBeEnabled();
  await expect(page).toHaveURL("/login");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("teamground-prototype-v1") || "null")?.state.sessionUserId ?? null)).toBeNull();
  await page.getByRole("button", { name: "선택한 계정으로 시작하기" }).click();
  await expect(page).toHaveURL("/teams");
});

test("lazy 목적지로 이동을 취소하면 미저장 입력이 유지된다", async ({ page }) => {
  await login(page, "/teams/new");
  const name = page.getByPlaceholder("예: 파동 극단");
  await name.fill("lazy 이동 보존");
  await page.getByRole("link", { name: "내 일정", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "저장하지 않은 내용을 버릴까요?" });
  await dialog.getByRole("button", { name: "계속 작성" }).click();
  await expect(name).toHaveValue("lazy 이동 보존");
  await page.getByRole("link", { name: "내 일정", exact: true }).click();
  await dialog.getByRole("button", { name: "버리고 이동" }).click();
  await expect(page).toHaveURL("/calendar");
  await expect(page.getByRole("heading", { name: "2026년 10월" })).toBeVisible();
});


test("데모 도구 chunk 실패는 미저장 폼을 제거하지 않는다", async ({ page }) => {
  await login(page, "/teams/new");
  const name = page.getByPlaceholder("예: 파동 극단");
  await name.fill("도구 오류에도 보존");
  await page.route("**/assets/DemoToolsContent-*.js", (route) => route.abort());
  await page.getByText("발표용 데모 도구", { exact: true }).click();
  await expect(page.getByText("데모 도구를 불러오지 못했습니다. 입력 중인 내용을 저장한 후 새로고침해 주세요.")).toBeVisible();
  await expect(name).toHaveValue("도구 오류에도 보존");
  await page.getByRole("link", { name: "내 일정", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "저장하지 않은 내용을 버릴까요?" })).toBeVisible();
});
