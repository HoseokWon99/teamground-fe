import { beforeEach, describe, expect, it } from "vitest";
import { calculateRecommendation, overlaps } from "./recommendation";
import { createSeed, exampleDraft } from "../mocks/seed";
import { service } from "../mocks/service";
import { useAppStore, storageWarning } from "../stores/useAppStore";
describe("반복 일정 추천", () => {
  it.each([0, 45, 270, NaN])(
    "지원 범위 밖 모임 길이 %s분을 거절한다",
    (duration) => {
      const draft = exampleDraft("padong");
      draft.duration = duration;
      draft.startTime = "09:00";
      draft.endTime = "21:00";
      expect(() => calculateRecommendation(createSeed(), draft)).toThrow(
        "조건",
      );
    },
  );
  it("시작·종료일 포함 8주까지만 탐색한다", () => {
    const draft = exampleDraft("padong");
    draft.from = "2026-10-01";
    draft.to = "2026-11-25";
    expect(() => calculateRecommendation(createSeed(), draft)).not.toThrow();
    draft.to = "2026-11-26";
    expect(() => calculateRecommendation(createSeed(), draft)).toThrow("8주");
  });
  it("첫 실행에서 저장 데이터 복원 오류를 표시하지 않는다", () => {
    expect(storageWarning).toBe("");
  });
  it("네 수요일을 추천하고 둘째 주 금요일 충돌을 제외한다", () => {
    const r = calculateRecommendation(createSeed(), exampleDraft("padong"));
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].dates).toEqual([
      "2026-10-14",
      "2026-10-21",
      "2026-10-28",
      "2026-11-04",
    ]);
  });
  it("끝과 시작이 맞닿으면 충돌하지 않는다", () => {
    expect(
      overlaps(
        "2026-10-14T17:00",
        "2026-10-14T19:00",
        "2026-10-14T19:00",
        "2026-10-14T21:00",
      ),
    ).toBe(false);
    expect(
      overlaps(
        "2026-10-14T18:00",
        "2026-10-14T19:01",
        "2026-10-14T19:00",
        "2026-10-14T21:00",
      ),
    ).toBe(true);
  });
  it.each(["unconfirmed", "range", "sync"])(
    "필수 멤버의 %s 데이터를 참석 가능으로 간주하지 않는다",
    (kind) => {
      const data = createSeed();
      const c = data.calendars.find((c) => c.userId === "harin")!;
      if (kind === "unconfirmed") c.confirmed = false;
      if (kind === "range") c.to = "2026-10-20";
      if (kind === "sync") c.syncState = "error";
      const r = calculateRecommendation(data, exampleDraft("padong"));
      expect(r.candidates).toHaveLength(0);
      expect(r.missingIds).toContain("harin");
    },
  );
  it("필수 멤버 변경을 반영하고 전원 가능한 수요일을 먼저 정렬한다", () => {
    const draft = exampleDraft("padong");
    draft.mode = "required";
    draft.requiredIds = ["jiwoo"];
    const r = calculateRecommendation(createSeed(), draft);
    expect(r.candidates).toHaveLength(2);
    expect(r.candidates.map((c) => c.weekday)).toEqual([3, 5]);
  });
});
describe("mock 서비스 정합성", () => {
  beforeEach(() => {
    useAppStore.setState(createSeed());
    useAppStore.setState({ sessionUserId: "jiwoo" });
  });
  it("확정 전 변경은 거절하며 반복 확정은 중복 생성하지 않는다", async () => {
    const r = await service.recommend(exampleDraft("padong"));
    const [a, b] = await Promise.all([
      service.confirmCandidate("padong", r.candidates[0].id),
      service.confirmCandidate("padong", r.candidates[0].id),
    ]);
    expect(a.id).toBe(b.id);
    expect(useAppStore.getState().occurrences).toHaveLength(6);
    await service.confirmCandidate("padong", r.candidates[0].id);
    expect(useAppStore.getState().occurrences).toHaveLength(6);
    await service.setScenario("changed");
    await expect(
      service.confirmCandidate("padong", r.candidates[0].id),
    ).rejects.toThrow("변경");
  });
  it("일반 멤버 초대/확정과 타인 영상 변경을 제한한다", async () => {
    const r = await service.recommend(exampleDraft("padong"));
    await service.login("harin");
    await expect(service.invite("padong", "new@test.com")).rejects.toThrow(
      "관리자",
    );
    await expect(
      service.confirmCandidate("padong", r.candidates[0].id),
    ).rejects.toThrow("관리자");
    await expect(service.deleteVideo("video-1")).rejects.toThrow("본인");
    await expect(
      service.addVideo("frame-1", "test", "https://example.com/video"),
    ).rejects.toThrow("권한");
  });
  it("초대 이메일 검증과 중복 수락을 처리한다", async () => {
    await expect(service.acceptInvite("welcome-seoyeon")).rejects.toThrow(
      "이메일",
    );
    await service.login("seoyeon");
    await service.acceptInvite("welcome-seoyeon");
    await service.acceptInvite("welcome-seoyeon");
    expect(
      useAppStore.getState().memberships.filter((m) => m.userId === "seoyeon"),
    ).toHaveLength(1);
  });
  it("다음 요청만 실패하고 재시도는 성공한다", async () => {
    await service.failNext();
    await expect(service.load()).rejects.toThrow("실패");
    await expect(service.load()).resolves.toBeUndefined();
  });
  it("피드백 있는 영상 URL 수정 제한과 연결 삭제를 지킨다", async () => {
    await expect(
      service.updateVideo("video-1", "제목", "https://example.com/new"),
    ).rejects.toThrow("주소");
    await service.deleteVideo("video-1");
    expect(useAppStore.getState().feedback).toHaveLength(0);
  });
});
