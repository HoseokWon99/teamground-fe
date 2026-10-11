import type { Data, Draft } from "../lib/types";
export const exampleDraft = (teamId: string): Draft => ({
  teamId,
  title: "장면 리허설",
  from: "2026-10-14",
  to: "2026-11-06",
  duration: 120,
  weekdays: [3, 5],
  startTime: "19:00",
  endTime: "21:00",
  mode: "all",
  requiredIds: [],
});
export function createSeed(): Data {
  const users = [
    {
      id: "jiwoo",
      name: "지우",
      email: "jiwoo@teamground.demo",
      color: "#7664cf",
    },
    {
      id: "harin",
      name: "하린",
      email: "harin@teamground.demo",
      color: "#db956d",
    },
    {
      id: "minseo",
      name: "민서",
      email: "minseo@teamground.demo",
      color: "#669d8b",
    },
    {
      id: "doyoon",
      name: "도윤",
      email: "doyoon@teamground.demo",
      color: "#7191ba",
    },
    {
      id: "seoyeon",
      name: "서연",
      email: "seoyeon@teamground.demo",
      color: "#c28daa",
    },
  ];
  return {
    users,
    sessionUserId: null,
    revision: 1,
    failNext: false,
    teams: [
      {
        id: "padong",
        name: "파동 극단",
        description: "서로의 파동이 모여 하나의 무대가 되는 곳",
        category: "공연예술",
      },
      {
        id: "frame",
        name: "프레임 영화팀",
        description: "우리의 시선으로 만드는 짧은 영화",
        category: "영화",
      },
    ],
    memberships: [
      { teamId: "padong", userId: "jiwoo", role: "admin" },
      ...["harin", "minseo", "doyoon"].map((userId) => ({
        teamId: "padong",
        userId,
        role: "member" as const,
      })),
      { teamId: "frame", userId: "jiwoo", role: "admin" },
      { teamId: "frame", userId: "minseo", role: "member" },
    ],
    calendars: users.map((u) => ({
      userId: u.id,
      connected: false,
      syncState: "idle",
      confirmed: u.id !== "seoyeon",
      from: "2026-10-01",
      to: "2026-12-31",
    })),
    events: [
      {
        id: "harin-friday",
        userId: "harin",
        title: "개인 약속",
        start: "2026-10-23T19:00",
        end: "2026-10-23T21:00",
        source: "manual",
      },
      {
        id: "jiwoo-work",
        userId: "jiwoo",
        title: "제작 미팅",
        start: "2026-10-12T14:00",
        end: "2026-10-12T16:00",
        source: "manual",
      },
    ],
    invites: [
      {
        id: "invite-demo",
        teamId: "padong",
        email: "seoyeon@teamground.demo",
        token: "welcome-seoyeon",
        status: "pending",
        expiresAt: "2027-12-31T23:59:59+09:00",
      },
      {
        id: "invite-expired",
        teamId: "padong",
        email: "seoyeon@teamground.demo",
        token: "expired",
        status: "pending",
        expiresAt: "2026-01-01T00:00:00+09:00",
      },
      {
        id: "invite-accepted",
        teamId: "padong",
        email: "harin@teamground.demo",
        token: "accepted",
        status: "accepted",
        expiresAt: "2027-12-31T23:59:59+09:00",
      },
    ],
    occurrences: [
      {
        id: "rehearsal-1",
        teamId: "padong",
        seriesId: "seed-series",
        title: "장면 읽기 · 첫 번째 합",
        start: "2026-10-10T19:00",
        end: "2026-10-10T21:00",
        index: 1,
        total: 1,
        attendance: ["jiwoo", "harin", "minseo", "doyoon"].map((userId) => ({
          userId,
          status: "available",
        })),
        revision: 1,
      },
      {
        id: "frame-1",
        teamId: "frame",
        seriesId: "frame-series",
        title: "시나리오 리딩",
        start: "2026-10-17T15:00",
        end: "2026-10-17T17:00",
        index: 1,
        total: 1,
        attendance: ["jiwoo", "minseo"].map((userId) => ({
          userId,
          status: "available",
        })),
        revision: 1,
      },
    ],
    videos: [
      {
        id: "video-1",
        occurrenceId: "rehearsal-1",
        title: "첫 장면 · 동선 연습",
        url: "/demo/rehearsal.webm",
        authorId: "jiwoo",
        createdAt: "2026-10-10T21:10:00+09:00",
      },
    ],
    feedback: [
      {
        id: "feedback-1",
        videoId: "video-1",
        authorId: "harin",
        body: "처음 마주치는 순간의 호흡이 좋았어요. 다음에는 동선을 조금 더 천천히 맞춰봐요.",
        createdAt: "2026-10-10T21:30:00+09:00",
      },
    ],
    drafts: {},
    recommendations: {},
  };
}
