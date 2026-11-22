import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const profile = {
  id: "qa-user",
  displayName: "검증 회원",
  verifiedEmail: "ui@example.test",
  authMethod: "EMAIL",
  timezone: "Asia/Seoul",
  version: 0,
};
const team = {
  id: "qa-team",
  name: "무대 연습팀",
  description: "함께 준비하는 정기 연습",
  role: "OWNER",
  version: 0,
};
const members = [
  {
    membershipId: "qa-membership",
    userId: profile.id,
    displayName: profile.displayName,
    role: "OWNER",
  },
];
const occurrence = {
  id: "qa-occurrence",
  scheduleId: "qa-schedule",
  title: "정기 리허설",
  sequence: 1,
  startsAt: "2026-11-25T09:00:00Z",
  endsAt: "2026-11-25T11:00:00Z",
  status: "SCHEDULED",
  version: 0,
  members: [
    {
      membershipId: "qa-membership",
      userId: profile.id,
      required: true,
      availability: "AVAILABLE",
    },
  ],
};
const video = {
  id: "qa-video",
  occurrenceId: occurrence.id,
  authorId: profile.id,
  authorDisplayName: profile.displayName,
  title: "1막 동선 연습",
  sourceUrl: "https://example.test/rehearsal",
  playbackType: "ORIGINAL_LINK",
  everReceivedFeedback: false,
  version: 0,
};
const scheduling = {
  id: "qa-scheduling",
  createdBy: profile.id,
  conditions: {
    title: "겨울 공연 준비",
    dateFrom: "2026-11-23",
    dateTo: "2026-12-20",
    durationMinutes: 120,
    windows: [{ weekday: 3, start: "18:00", end: "21:00" }],
    attendanceMode: "ALL",
    requiredMemberIds: [],
  },
  selectedCandidateId: null,
  status: "OPEN",
  version: 0,
};

async function mockWorkspace(
  page: Page,
  options: { member?: boolean; empty?: boolean; failure?: boolean } = {},
) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    if (path === "/auth/csrf")
      return route.fulfill({ json: { data: { token: "mock-csrf" } } });
    if (path === "/me") return route.fulfill({ json: { data: profile } });
    if (options.failure && path === "/teamspaces")
      return route.fulfill({
        status: 503,
        json: { error: { code: "SERVER_ERROR" } },
      });
    const currentTeam = { ...team, role: options.member ? "MEMBER" : "OWNER" };
    const values: Record<string, unknown> = {
      "/teamspaces": options.empty ? [] : [currentTeam],
      "/teamspaces/qa-team": currentTeam,
      "/teamspaces/qa-team/members": members,
      "/teamspaces/qa-team/occurrences": [occurrence],
      "/teamspaces/qa-team/occurrences/qa-occurrence": occurrence,
      "/teamspaces/qa-team/occurrences/qa-occurrence/videos": [video],
      "/teamspaces/qa-team/videos/qa-video": video,
      "/teamspaces/qa-team/scheduling-requests": [scheduling],
      "/teamspaces/qa-team/scheduling-requests/qa-scheduling": scheduling,
    };
    await route.fulfill({ json: { data: values[path] ?? [] } });
  });
}

for (const width of [1440, 390]) {
  test(`server workspace major screens are usable at ${width}px @a11y`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await mockWorkspace(page);
    const screens = [
      ["/teams", "내 팀", "teams"],
      ["/teams/new", "팀 만들기", "create-team"],
      ["/teams/qa-team/members", `${team.name} · 팀 멤버`, "members"],
      ["/calendar", "내 개인 일정", "calendar"],
      ["/teams/qa-team", team.name, "team"],
      ["/teams/qa-team/scheduling", "새 일정 조율", "scheduling"],
      [
        "/teams/qa-team/scheduling/qa-scheduling",
        scheduling.conditions.title,
        "results",
      ],
      [
        "/teams/qa-team/occurrences/qa-occurrence",
        occurrence.title,
        "occurrence",
      ],
      ["/teams/qa-team/videos/qa-video", video.title, "video"],
      ["/account", "계정 설정", "account"],
    ];
    for (const [url, heading, name] of screens) {
      await page.goto(url);
      await expect(
        page.getByRole("heading", { name: heading, exact: true, level: 1 }),
      ).toBeVisible();
      await expect(page.getByText("불러오는 중…", { exact: true })).toHaveCount(
        0,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name}: horizontal overflow`,
      ).toBe(true);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(axe.violations, `${name}: axe`).toEqual([]);
      await page.screenshot({
        path: `output/ui-completion/${name}-${width}.png`,
        fullPage: true,
      });
    }
  });
}

test("server team list distinguishes empty state from load failure and retry", async ({
  page,
}) => {
  await mockWorkspace(page, { empty: true });
  await page.goto("/teams");
  await expect(
    page.getByText("참여 중인 팀이 없습니다.", { exact: false }),
  ).toBeVisible();
  await page.unroute("**/api/v1/**");
  await mockWorkspace(page, { failure: true });
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert").last()).toBeVisible();
  await expect(
    page.getByText("참여 중인 팀이 없습니다.", { exact: false }),
  ).toHaveCount(0);
  await page.unroute("**/api/v1/**");
  await mockWorkspace(page);
  await page
    .getByRole("main")
    .getByRole("button", { name: "다시 불러오기", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("link", { name: team.name, exact: true }),
  ).toBeVisible();
});

test("member sees collaboration content without owner-only team controls", async ({
  page,
}) => {
  await mockWorkspace(page, { member: true });
  await page.goto("/teams/qa-team/members");
  await expect(
    page.getByRole("heading", { name: `${team.name} · 팀 멤버`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "팀 멤버", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "팀 탈퇴", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "관리자 위임", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "팀 삭제", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "초대 요청", exact: true }),
  ).toHaveCount(0);
});

test("public policies survive unauthenticated reload in server mode @a11y", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: "AUTHENTICATION_REQUIRED" } },
    }),
  );
  for (const [path, title] of [
    ["/privacy", "개인정보처리방침"],
    ["/terms", "서비스 이용약관"],
  ]) {
    await page.goto(path);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("link", { name: "hs1j333@gmail.com", exact: true })
        .first(),
    ).toHaveAttribute("href", "mailto:hs1j333@gmail.com");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});

test("account preserves edits across stale version and explains ownership races", async ({
  page,
}) => {
  let current = { ...profile };
  let stale = true;
  let deleted = false;
  await mockWorkspace(page, { empty: true });
  await page.route("**/api/v1/me", async (route) => {
    if (route.request().method() === "PATCH") {
      expect(route.request().headers()["x-csrf-token"]).toBe("mock-csrf");
      if (stale) {
        stale = false;
        current.version = 1;
        return route.fulfill({
          status: 412,
          json: { error: { code: "VERSION_CONFLICT" } },
        });
      }
      expect(route.request().headers()["if-match"]).toBe('"1"');
      current = { ...current, ...route.request().postDataJSON(), version: 2 };
    }
    if (route.request().method() === "DELETE") {
      deleted = true;
      return route.fulfill({
        status: 409,
        json: { error: { code: "OWNED_TEAMSPACE_EXISTS" } },
      });
    }
    await route.fulfill({ json: { data: current } });
  });
  await page.goto("/account");
  await page.getByLabel("표시 이름", { exact: true }).fill("유지할 이름");
  await page.getByRole("button", { name: "프로필 저장", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "프로필 저장", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "최신 프로필 불러오기", exact: true })
    .click();
  await expect(page.getByLabel("표시 이름", { exact: true })).toHaveValue(
    "유지할 이름",
  );
  await page.getByRole("button", { name: "프로필 저장", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("프로필을 저장했습니다");
  const trigger = page.getByRole("button", {
    name: "서비스 탈퇴",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page
    .getByLabel("확인을 위해 ‘서비스 탈퇴’를 입력해 주세요", { exact: true })
    .fill("서비스 탈퇴");
  await page.getByRole("button", { name: "탈퇴 확정", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "관리자인 팀이 있어 탈퇴할 수 없습니다",
  );
  expect(deleted).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("mobile navigation is keyboard accessible and restores trigger focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockWorkspace(page);
  await page.goto("/teams");
  const trigger = page.getByRole("button", { name: "메뉴 열기", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "작업 공간 메뉴",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("personal calendar honors all-day exclusive end across months and switches views", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-22T03:00:00Z"));
  await mockWorkspace(page);
  await page.route("**/api/v1/me/personal-events?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "all-day",
            title: "월 경계 종일 연습",
            description: "",
            allDay: true,
            startDate: "2026-11-30",
            endDateExclusive: "2026-12-02",
            startsAt: "2026-11-29T15:00:00Z",
            endsAt: "2026-12-01T15:00:00Z",
            version: 0,
          },
        ],
      },
    }),
  );
  await page.goto("/calendar");
  const calendar = page.getByRole("region", {
    name: "개인 일정 달력",
    exact: true,
  });
  await expect(
    calendar.getByRole("heading", { name: "2026년 11월", exact: true }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "다음 달", exact: true }).click();
  await expect(
    calendar.getByRole("heading", { name: "2026년 12월", exact: true }),
  ).toBeVisible();
  await expect(
    calendar.getByRole("button", {
      name: /2026년 12월 1일 00:00 월 경계 종일 연습 · 종일/,
    }),
  ).toHaveCount(1);
  await expect(
    calendar.getByRole("button", {
      name: /2026년 12월 2일.*월 경계 종일 연습/,
    }),
  ).toHaveCount(0);
  await calendar.getByRole("button", { name: "목록", exact: true }).click();
  await expect(
    calendar.getByText("2026-11-30 ~ 2026-12-01 · 종일", { exact: true }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "다음 달", exact: true }).click();
  await expect(
    calendar.getByText("이 달에 등록된 일정이 없습니다.", { exact: true }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "오늘", exact: true }).click();
  await expect(
    calendar.getByRole("heading", { name: "2026년 11월", exact: true }),
  ).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`server public authentication and invitation screens at ${width}px @a11y`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.route("**/api/v1/**", (route) =>
      route.fulfill({
        status: 401,
        json: { error: { code: "AUTHENTICATION_REQUIRED" } },
      }),
    );
    for (const [url, heading] of [
      ["/login", "로그인"],
      ["/signup", "이메일 회원가입"],
      ["/forgot-password", "비밀번호 찾기"],
      ["/verify-email#token=mock-visual-token", "이메일 확인 · 가입 완료"],
      ["/reset-password#token=mock-visual-token", "새 비밀번호 설정"],
      ["/invite#token=mock-invitation", "팀 초대 수락"],
    ]) {
      await page.goto(url);
      await expect(
        page.getByRole("heading", { name: heading, exact: true, level: 1 }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
  });
}

test("calendar modal serializes save and delete and keeps failed deletion visible", async ({
  page,
}) => {
  await mockWorkspace(page);
  const date = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
  const event = {
    id: "race-event",
    title: "경합 검증 일정",
    description: "",
    allDay: false,
    startsAt: `${date}T01:00:00Z`,
    endsAt: `${date}T02:00:00Z`,
    startDate: null,
    endDateExclusive: null,
    version: 0,
  };
  await page.route("**/api/v1/me/personal-events?*", (route) =>
    route.fulfill({ json: { data: [event] } }),
  );
  let releaseSave!: () => void;
  let releaseDelete!: () => void;
  const saving = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  const deleting = new Promise<void>((resolve) => {
    releaseDelete = resolve;
  });
  await page.route("**/api/v1/me/personal-events/race-event", async (route) => {
    if (route.request().method() === "PATCH") {
      await saving;
      return route.fulfill({
        status: 503,
        json: { error: { code: "SERVER_ERROR" } },
      });
    }
    await deleting;
    return route.fulfill({
      status: 503,
      json: { error: { code: "SERVER_ERROR" } },
    });
  });
  await page.goto("/calendar");
  await page
    .getByRole("region", { name: "개인 일정 달력", exact: true })
    .getByRole("button", { name: /경합 검증 일정/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog", {
    name: "개인 일정 수정",
    exact: true,
  });
  await dialog.getByLabel("일정 제목", { exact: true }).fill("저장 중 입력");
  const saveRequest = page.waitForRequest(
    (request) => request.method() === "PATCH",
  );
  await dialog
    .getByRole("button", { name: "개인 일정 저장", exact: true })
    .click();
  await saveRequest;
  await expect(
    dialog.getByRole("button", { name: "일정 삭제", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "취소", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeVisible();
  releaseSave();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button", { name: "일정 삭제", exact: true }).click();
  const deleteRequest = page.waitForRequest(
    (request) => request.method() === "DELETE",
  );
  await page
    .getByRole("dialog", { name: "변경 확인", exact: true })
    .getByRole("button", { name: "확인", exact: true })
    .click();
  await deleteRequest;
  await expect(
    dialog.getByRole("button", { name: "개인 일정 저장", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "취소", exact: true }),
  ).toBeDisabled();
  const failedDelete = page.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" && response.status() === 503,
  );
  releaseDelete();
  await failedDelete;
  await expect(dialog.getByRole("alert")).toHaveCount(2);
  await expect(dialog.getByRole("alert").last()).toBeVisible();
  await expect(dialog.getByLabel("일정 제목", { exact: true })).toHaveValue(
    "저장 중 입력",
  );
});

test("mobile recommendation cards show per-occurrence availability without overflow @a11y", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockWorkspace(page);
  await page.route(
    "**/api/v1/teamspaces/qa-team/scheduling-requests/qa-scheduling/candidates",
    (route) =>
      route.fulfill({
        json: {
          data: [
            {
              id: "first",
              weekday: 3,
              localStart: "18:00",
              occurrences: [occurrence],
              score: { minimumAvailableMembers: 1, totalAvailableMembers: 1 },
            },
            {
              id: "second",
              weekday: 5,
              localStart: "19:00",
              occurrences: [
                {
                  ...occurrence,
                  startsAt: "2026-11-27T10:00:00Z",
                  endsAt: "2026-11-27T12:00:00Z",
                },
              ],
              score: { minimumAvailableMembers: 1, totalAvailableMembers: 1 },
            },
          ],
        },
      }),
  );
  await page.goto("/teams/qa-team/scheduling/qa-scheduling");
  await page
    .getByRole("button", { name: "추천 후보 조회", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "이 후보 선택", exact: true }),
  ).toHaveCount(2);
  await page.locator("summary").first().click();
  await expect(page.locator("details[open]")).toContainText(
    profile.displayName,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: "output/ui-completion/candidates-390.png",
    fullPage: true,
  });
});
