import type { Data, Draft, PersonalEvent, Video } from "../lib/types";
import { useAppStore } from "../stores/useAppStore";
import { calculateRecommendation } from "../lib/recommendation";
import { createSeed } from "./seed";
const state = () => useAppStore.getState();
const set = (data: Partial<Data>) => useAppStore.setState(data);
const id = () => globalThis.crypto.randomUUID();
const now = () => new Date().toISOString();
const user = () => {
  const u = state().users.find((u) => u.id === state().sessionUserId);
  if (!u) throw new Error("로그인이 필요합니다.");
  return u;
};
const member = (teamId: string, admin = false) => {
  const m = state().memberships.find(
    (m) => m.teamId === teamId && m.userId === user().id,
  );
  if (!m || (admin && m.role !== "admin"))
    throw new Error(
      admin
        ? "관리자만 사용할 수 있습니다."
        : "이 팀에 접근할 권한이 없습니다.",
    );
  return m;
};
const occurrence = (occurrenceId: string) => {
  const o = state().occurrences.find((o) => o.id === occurrenceId);
  if (!o) throw new Error("존재하지 않는 일정입니다.");
  member(o.teamId);
  return o;
};
const video = (videoId: string, own = false) => {
  const v = state().videos.find((v) => v.id === videoId);
  if (!v) throw new Error("존재하지 않는 영상입니다.");
  occurrence(v.occurrenceId);
  if (own && v.authorId !== user().id)
    throw new Error("본인이 작성한 영상만 변경할 수 있습니다.");
  return v;
};
const feedback = (feedbackId: string) => {
  const f = state().feedback.find((f) => f.id === feedbackId);
  if (!f) throw new Error("존재하지 않는 피드백입니다.");
  video(f.videoId);
  if (f.authorId !== user().id)
    throw new Error("본인이 작성한 피드백만 변경할 수 있습니다.");
  return f;
};
const text = (value: string, max: number, label: string) => {
  const v = value.trim();
  if (!v || v.length > max)
    throw new Error(`${label}은 1~${max}자로 입력해 주세요.`);
  return v;
};
const videoUrl = (value: string) => {
  if (value === "/demo/rehearsal.webm") return value;
  try {
    const u = new URL(value);
    if (!["https:", "http:"].includes(u.protocol)) throw new Error();
    return u.href;
  } catch {
    throw new Error("http 또는 https 영상 주소를 입력해 주세요.");
  }
};
async function wait() {
  await new Promise((r) => setTimeout(r, 160));
  if (state().failNext) {
    set({ failNext: false });
    throw new Error(
      "데모 요청이 실패했습니다. 입력을 유지했으니 다시 시도해 주세요.",
    );
  }
}
// Coalesce duplicate in-flight submissions without suppressing intentional later writes.
const pending = new Map<string, Promise<unknown>>();
function request<T>(key: string, fn: () => T | Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const result = wait()
    .then(fn)
    .finally(() => pending.delete(key));
  pending.set(key, result);
  return result;
}
const revision = () => state().revision + 1;
export const service = {
  load: () => request("load", () => undefined),
  login: (userId: string, signal?: AbortSignal) =>
    request(`login:${userId}`, () => {
      if (signal?.aborted) throw new DOMException("로그인이 취소되었습니다.", "AbortError");
      if (!state().users.some((u) => u.id === userId))
        throw new Error("데모 계정을 선택해 주세요.");
      set({ sessionUserId: userId });
    }),
  logout: () => request("logout", () => set({ sessionUserId: null })),
  createTeam: (name: string, description: string) =>
    request(`team:${name}:${description}`, () => {
      const u = user();
      const team = {
        id: id(),
        name: text(name, 50, "팀 이름"),
        description: description.trim(),
        category: "새 프로젝트",
      };
      if (team.description.length > 200)
        throw new Error("설명은 200자 이하로 입력해 주세요.");
      set({
        teams: [...state().teams, team],
        memberships: [
          ...state().memberships,
          { teamId: team.id, userId: u.id, role: "admin" },
        ],
        revision: revision(),
      });
      return team;
    }),
  invite: (teamId: string, email: string) =>
    request(`invite:${teamId}:${email}`, () => {
      member(teamId, true);
      email = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("이메일 형식을 확인해 주세요.");
      if (
        state().memberships.some(
          (m) =>
            m.teamId === teamId &&
            state().users.find((u) => u.id === m.userId)?.email === email,
        )
      )
        throw new Error("이미 팀에 참여 중인 계정입니다.");
      const existing = state().invites.find(
        (i) =>
          i.teamId === teamId &&
          i.email === email &&
          i.status === "pending" &&
          new Date(i.expiresAt) > new Date(),
      );
      if (existing) return existing;
      const invite = {
        id: id(),
        teamId,
        email,
        token: id(),
        status: "pending" as const,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      };
      set({ invites: [...state().invites, invite] });
      return invite;
    }),
  acceptInvite: (token: string) =>
    request(`accept:${token}`, () => {
      const u = user(),
        i = state().invites.find((i) => i.token === token);
      if (!i) throw new Error("유효하지 않은 초대입니다.");
      if (i.email.toLowerCase() !== u.email.toLowerCase())
        throw new Error("초대받은 이메일 계정으로 로그인해 주세요.");
      if (
        state().memberships.some(
          (m) => m.teamId === i.teamId && m.userId === u.id,
        )
      )
        return i.teamId;
      if (i.status !== "pending" || new Date(i.expiresAt) <= new Date())
        throw new Error("만료되었거나 사용할 수 없는 초대입니다.");
      set({
        memberships: [
          ...state().memberships,
          { teamId: i.teamId, userId: u.id, role: "member" },
        ],
        invites: state().invites.map((v) =>
          v.id === i.id ? { ...v, status: "accepted" } : v,
        ),
        revision: revision(),
      });
      return i.teamId;
    }),
  saveEvent: (input: Omit<PersonalEvent, "id" | "userId"> & { id?: string }) =>
    request(`event:${JSON.stringify(input)}`, () => {
      const u = user();
      const existing = input.id
        ? state().events.find((e) => e.id === input.id)
        : undefined;
      if (input.id && (!existing || existing.userId !== u.id))
        throw new Error("본인의 일정만 수정할 수 있습니다.");
      if (input.source !== "manual" || existing?.source === "google")
        throw new Error("구글 일정은 읽기 전용입니다.");
      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.start) ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.end) ||
        input.start >= input.end
      )
        throw new Error("종료 시각은 시작 시각 이후여야 합니다.");
      const event = {
        ...input,
        title: text(input.title, 100, "일정 제목"),
        id: input.id ?? id(),
        userId: u.id,
      };
      set({
        events: [...state().events.filter((e) => e.id !== event.id), event],
        calendars: state().calendars.map((c) =>
          c.userId === u.id ? { ...c, confirmed: false } : c,
        ),
        revision: revision(),
      });
    }),
  deleteEvent: (eventId: string) =>
    request(`delete-event:${eventId}`, () => {
      const u = user(),
        e = state().events.find((e) => e.id === eventId);
      if (!e || e.userId !== u.id || e.source === "google")
        throw new Error("본인이 입력한 일정만 삭제할 수 있습니다.");
      set({
        events: state().events.filter((e) => e.id !== eventId),
        calendars: state().calendars.map((c) =>
          c.userId === u.id ? { ...c, confirmed: false } : c,
        ),
        revision: revision(),
      });
    }),
  confirmCalendar: (from: string, to: string) =>
    request(`calendar:${from}:${to}`, () => {
      const u = user();
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
        from > to
      )
        throw new Error("확인 기간을 올바르게 입력해 주세요.");
      set({
        calendars: state().calendars.map((c) =>
          c.userId === u.id ? { ...c, confirmed: true, from, to } : c,
        ),
        revision: revision(),
      });
    }),
  syncGoogle: async () => {
    const u = user();
    try {
      await request(`sync:${u.id}`, () => {
        set({
          events: [
            ...state().events.filter(
              (e) => !(e.userId === u.id && e.source === "google"),
            ),
            {
              id: `google-${u.id}`,
              userId: u.id,
              title: "구글 · 샘플 미팅",
              start: "2026-10-19T14:00",
              end: "2026-10-19T15:00",
              source: "google",
            },
          ],
          calendars: state().calendars.map((c) =>
            c.userId === u.id
              ? {
                  ...c,
                  connected: true,
                  syncState: "success",
                  lastSync: now(),
                  confirmed: false,
                }
              : c,
          ),
          revision: revision(),
        });
      });
    } catch (e) {
      set({
        calendars: state().calendars.map((c) =>
          c.userId === u.id
            ? { ...c, syncState: "error", confirmed: false }
            : c,
        ),
        revision: revision(),
      });
      throw e;
    }
  },
  disconnectGoogle: () =>
    request("disconnect", () => {
      const u = user();
      set({
        events: state().events.filter(
          (e) => !(e.userId === u.id && e.source === "google"),
        ),
        calendars: state().calendars.map((c) =>
          c.userId === u.id
            ? {
                ...c,
                connected: false,
                syncState: "idle",
                lastSync: undefined,
                confirmed: false,
              }
            : c,
        ),
        revision: revision(),
      });
    }),
  saveDraft: (draft: Draft) =>
    request(`draft:${draft.teamId}`, () => {
      member(draft.teamId);
      set({
        drafts: { ...state().drafts, [draft.teamId]: structuredClone(draft) },
      });
    }),
  recommend: (draft: Draft) =>
    request(`recommend:${JSON.stringify(draft)}`, () => {
      member(draft.teamId);
      const result = calculateRecommendation(state(), draft);
      set({
        drafts: { ...state().drafts, [draft.teamId]: structuredClone(draft) },
        recommendations: { ...state().recommendations, [draft.teamId]: result },
      });
      return result;
    }),
  confirmCandidate: (teamId: string, candidateId: string) =>
    request(`confirm:${teamId}:${candidateId}`, () => {
      member(teamId, true);
      const r = state().recommendations[teamId];
      if (!r) throw new Error("추천을 먼저 조회해 주세요.");
      if (r.revision !== state().revision)
        throw new Error(
          "일정 또는 멤버 정보가 변경되었습니다. 추천을 다시 조회해 주세요.",
        );
      const c = r.candidates.find((c) => c.id === candidateId);
      if (!c) throw new Error("유효하지 않은 후보입니다.");
      const seriesId = `${teamId}:${r.createdAt}:${candidateId}`;
      const existing = state().occurrences.find((o) => o.seriesId === seriesId);
      if (existing) return existing;
      const fresh = calculateRecommendation(state(), r.draft);
      if (!fresh.candidates.some((v) => v.id === candidateId))
        throw new Error("추천을 다시 조회해 주세요.");
      const occurrences = c.dates.map((date, index) => ({
        id: id(),
        teamId,
        seriesId,
        title: r.draft.title,
        start: `${date}T${c.startTime}`,
        end: `${date}T${c.endTime}`,
        index: index + 1,
        total: c.dates.length,
        attendance: c.attendance[index],
        revision: r.revision,
      }));
      set({ occurrences: [...state().occurrences, ...occurrences] });
      return occurrences[0];
    }),
  addVideo: (occurrenceId: string, title: string, url: string) =>
    request(`video:${occurrenceId}:${title}:${url}`, () => {
      occurrence(occurrenceId);
      const v: Video = {
        id: id(),
        occurrenceId,
        title: text(title, 100, "영상 제목"),
        url: videoUrl(url),
        authorId: user().id,
        createdAt: now(),
      };
      set({ videos: [...state().videos, v] });
      return v;
    }),
  updateVideo: (videoId: string, title: string, url: string) =>
    request(`update-video:${videoId}`, () => {
      const v = video(videoId, true);
      url = videoUrl(url);
      if (v.url !== url && state().feedback.some((f) => f.videoId === videoId))
        throw new Error("피드백이 있는 영상의 주소는 변경할 수 없습니다.");
      title = text(title, 100, "영상 제목");
      set({
        videos: state().videos.map((v) =>
          v.id === videoId ? { ...v, title, url } : v,
        ),
      });
    }),
  deleteVideo: (videoId: string) =>
    request(`delete-video:${videoId}`, () => {
      video(videoId, true);
      set({
        videos: state().videos.filter((v) => v.id !== videoId),
        feedback: state().feedback.filter((f) => f.videoId !== videoId),
      });
    }),
  addFeedback: (videoId: string, body: string) =>
    request(`feedback:${videoId}:${body}`, () => {
      video(videoId);
      set({
        feedback: [
          ...state().feedback,
          {
            id: id(),
            videoId,
            body: text(body, 2000, "피드백"),
            authorId: user().id,
            createdAt: now(),
          },
        ],
      });
    }),
  updateFeedback: (feedbackId: string, body: string) =>
    request(`update-feedback:${feedbackId}`, () => {
      feedback(feedbackId);
      body = text(body, 2000, "피드백");
      set({
        feedback: state().feedback.map((f) =>
          f.id === feedbackId ? { ...f, body, updatedAt: now() } : f,
        ),
      });
    }),
  deleteFeedback: (feedbackId: string) =>
    request(`delete-feedback:${feedbackId}`, () => {
      feedback(feedbackId);
      set({ feedback: state().feedback.filter((f) => f.id !== feedbackId) });
    }),
  reset: async () => {
    set(createSeed());
  },
  failNext: async () => {
    set({ failNext: true });
  },
  setScenario: async (scenario: "default" | "missing" | "none" | "changed") => {
    if (scenario === "changed") {
      set({ revision: revision() });
      return;
    }
    const seed = createSeed();
    const events = state().events.filter((e) => !e.id.startsWith("scenario-"));
    let calendars = state().calendars.map((c) =>
      c.userId === "harin"
        ? {
            ...c,
            confirmed: true,
            from: "2026-10-01",
            to: "2026-12-31",
            syncState: "idle" as const,
          }
        : c,
    );
    if (scenario === "missing")
      calendars = calendars.map((c) =>
        c.userId === "harin" ? { ...c, confirmed: false } : c,
      );
    if (scenario === "none")
      events.push({
        id: "scenario-block",
        userId: "jiwoo",
        title: "데모 불가 시간",
        start: "2026-10-01T00:00",
        end: "2027-01-01T00:00",
        source: "manual",
      });
    set({
      events,
      calendars: calendars.length ? calendars : seed.calendars,
      revision: revision(),
    });
  },
};
