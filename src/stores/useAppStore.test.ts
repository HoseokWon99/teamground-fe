import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppStore, STORAGE_KEY } from "./useAppStore";
import { setStorageWarning, useStorageWarning } from "./storage-warning";
import { createSeed, exampleDraft } from "@/mocks/seed";
import { calculateRecommendation } from "@/lib/recommendation";
import type { Data } from "@/lib/types";

function memoryStorage(raw?: string) {
  const entries = new Map<string, string>([["other-app", "keep"]]);
  if (raw !== undefined) entries.set(STORAGE_KEY, raw);
  return {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      entries.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      entries.delete(key);
    }),
  };
}
const envelope = (state: Data, version: unknown = 1) =>
  JSON.stringify({ state, version });
const warning = () => useStorageWarning.getState().message;
beforeEach(() => setStorageWarning(""));

describe("저장 데이터 복원", () => {
  it("빈 저장소는 기본 데모로 시작하며 경고하지 않는다", () => {
    const storage = memoryStorage();
    expect(createAppStore(() => storage).getState()).toEqual(createSeed());
    expect(warning()).toBe("");
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("유효한 사용자 변경과 추천을 그대로 보존하고 failNext만 초기화한다", () => {
    const data = createSeed();
    data.sessionUserId = "harin";
    data.teams[0].name = "사용자가 바꾼 팀";
    data.drafts.padong = exampleDraft("padong");
    data.recommendations.padong = calculateRecommendation(
      data,
      data.drafts.padong,
    );
    data.failNext = true;
    const storage = memoryStorage(envelope(data));
    const store = createAppStore(() => storage);
    expect(store.getState()).toEqual({ ...data, failNext: false });
    expect(warning()).toBe("");
    expect(storage.setItem).not.toHaveBeenCalled();
    store.setState({ revision: 5 });
    expect(createAppStore(() => storage).getState().revision).toBe(5);
  });
  it.each([
    "{broken",
    "null",
    "[]",
    JSON.stringify({ state: {} }),
    envelope(createSeed(), 2),
    envelope(createSeed(), "1"),
    JSON.stringify({ state: createSeed() }),
  ])(
    "잘못된 JSON/schema/version을 복원하지 않으며 원본을 덮어쓰지 않는다: %s",
    (raw) => {
      const storage = memoryStorage(raw);
      const store = createAppStore(() => storage);
      expect(store.getState()).toEqual(createSeed());
      expect(warning()).toContain("복원할 수 없어");
      store.setState({ sessionUserId: "jiwoo" });
      expect(store.getState().sessionUserId).toBe("jiwoo");
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(storage.removeItem).not.toHaveBeenCalled();
    },
  );
  const corruptions: [string, (data: Data) => void][] = [
    [
      "없는 세션",
      (d) => {
        d.sessionUserId = "missing";
      },
    ],
    [
      "실재하지 않는 날짜",
      (d) => {
        d.occurrences[0].start = "2026-02-30T19:00";
      },
    ],
    [
      "역전 시각",
      (d) => {
        d.events[0].end = d.events[0].start;
      },
    ],
    [
      "잘못된 시각",
      (d) => {
        d.occurrences[0].start = "2026-10-10T25:00";
      },
    ],
    [
      "영상 orphan",
      (d) => {
        d.videos[0].occurrenceId = "missing";
      },
    ],
    [
      "댓글 orphan",
      (d) => {
        d.feedback[0].videoId = "missing";
      },
    ],
    [
      "개인 일정 orphan",
      (d) => {
        d.events[0].userId = "missing";
      },
    ],
    [
      "팀 orphan",
      (d) => {
        d.memberships[0].teamId = "missing";
      },
    ],
    [
      "다른 팀 작성자",
      (d) => {
        d.videos[0].authorId = "seoyeon";
      },
    ],
    [
      "중복 ID",
      (d) => {
        d.users.push(d.users[0]);
      },
    ],
    [
      "잘못된 회차",
      (d) => {
        d.occurrences[0].index = 2;
      },
    ],
    [
      "빈 추천 날짜",
      (d) => {
        d.recommendations.padong = calculateRecommendation(
          d,
          exampleDraft("padong"),
        );
        d.recommendations.padong.candidates[0].dates = [];
      },
    ],
    [
      "잘못된 초안 날짜",
      (d) => {
        d.drafts.padong = { ...exampleDraft("padong"), from: "bad" };
      },
    ],
    [
      "초안 팀 불일치",
      (d) => {
        d.drafts.frame = exampleDraft("padong");
      },
    ],
    ...[
      "javascript:alert(1)",
      "data:text/html,bad",
      "//evil.test",
      "/untrusted.webm",
    ].map((url): [string, (d: Data) => void] => [
      url,
      (d) => {
        d.videos[0].url = url;
      },
    ]),
  ];
  it.each(corruptions)("의미 검증: %s", (_name, mutate) => {
    const data = createSeed();
    mutate(data);
    const raw = envelope(data);
    const storage = memoryStorage(raw);
    const store = createAppStore(() => storage);
    expect(store.getState()).toEqual(createSeed());
    expect(warning()).toContain("복원할 수 없어");
    store.setState({ revision: 10 });
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });
  it.each([
    "https://example.com/video",
    "http://example.com/video",
    "/demo/rehearsal.webm",
  ])("허용 주소 %s를 유지한다", (url) => {
    const data = createSeed();
    data.videos[0].url = url;
    expect(
      createAppStore(() => memoryStorage(envelope(data))).getState().videos[0]
        .url,
    ).toBe(url);
    expect(warning()).toBe("");
  });
});

describe("저장소 실패와 명시적 복구", () => {
  it.each(["getter", "read", "absent"])(
    "%s 실패에도 메모리 상태를 변경할 수 있다",
    (kind) => {
      const storage = memoryStorage();
      storage.getItem.mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });
      const store = createAppStore(() => {
        if (kind === "getter")
          throw new DOMException("blocked", "SecurityError");
        return kind === "absent" ? undefined : storage;
      });
      expect(warning()).not.toBe("");
      expect(() => store.setState({ sessionUserId: "jiwoo" })).not.toThrow();
      expect(store.getState().sessionUserId).toBe("jiwoo");
    },
  );
  it.each(["QuotaExceededError", "SecurityError"])(
    "쓰기 %s를 별도 구독자에 즉시 전달하고 메모리를 유지한다",
    (name) => {
      const storage = memoryStorage();
      const store = createAppStore(() => storage);
      const observed: string[] = [];
      const stop = useStorageWarning.subscribe((state) =>
        observed.push(state.message),
      );
      storage.setItem.mockImplementation(() => {
        throw new DOMException("blocked", name);
      });
      store.setState({ sessionUserId: "jiwoo" });
      expect(observed.at(-1)).toContain("저장에 실패");
      expect(store.getState().sessionUserId).toBe("jiwoo");
      stop();
    },
  );
  it("명시적 복구 실패는 원본을 유지하고 재시도 성공 뒤 정상 저장한다", () => {
    const raw = "{broken";
    const storage = memoryStorage(raw);
    const store = createAppStore(() => storage);
    store.setState({ sessionUserId: "jiwoo" });
    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(store.replaceStoredData()).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    expect(store.getState().sessionUserId).toBe("jiwoo");
    expect(store.replaceStoredData()).toBe(true);
    expect(warning()).toBe("");
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({
      state: store.getState(),
      version: 1,
    });
    expect(storage.getItem("other-app")).toBe("keep");
    store.setState({ revision: 8 });
    expect(createAppStore(() => storage).getState().revision).toBe(8);
  });
});

it("실제 서비스의 팀/초대수락/일정/추천확정/영상/피드백 결과를 다시 복원한다", async () => {
  const { service } = await import("@/mocks/service");
  const { useAppStore } = await import("./useAppStore");
  useAppStore.setState(createSeed());
  await service.login("jiwoo");
  await service.createTeam("저장 보존 테스트", "직접 생성한 팀");
  await service.saveEvent({
    title: "내 일정",
    start: "2026-10-12T09:00",
    end: "2026-10-12T10:00",
    source: "manual",
  });
  await service.confirmCalendar("2026-10-01", "2026-12-31");
  const result = await service.recommend(exampleDraft("padong"));
  const occurrence = await service.confirmCandidate(
    "padong",
    result.candidates[0].id,
  );
  const video = await service.addVideo(
    occurrence.id,
    "새 영상",
    "https://example.com/watch",
  );
  await service.addFeedback(video.id, "저장 후 보존할 피드백");
  await service.login("seoyeon");
  await service.acceptInvite("welcome-seoyeon");
  const data = useAppStore.getState();
  const storage = memoryStorage(envelope(data));
  setStorageWarning("");
  expect(createAppStore(() => storage).getState()).toEqual(data);
  expect(warning()).toBe("");
});
