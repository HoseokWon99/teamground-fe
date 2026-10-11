import { create } from "zustand";
import { z } from "zod";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import type { Data } from "../lib/types";
import { createSeed } from "../mocks/seed";
export let storageWarning = "";
const storage: StateStorage = {
  getItem(name) {
    try {
      return globalThis.localStorage?.getItem(name) ?? null;
    } catch {
      storageWarning =
        "브라우저 저장소를 사용할 수 없어 이번 실행에서만 데이터를 유지합니다.";
      return null;
    }
  },
  setItem(name, value) {
    try {
      globalThis.localStorage?.setItem(name, value);
    } catch {
      storageWarning =
        "브라우저 저장에 실패했습니다. 이번 실행에서만 데이터를 유지합니다.";
    }
  },
  removeItem(name) {
    try {
      globalThis.localStorage?.removeItem(name);
    } catch {
      /* Memory state remains available. */
    }
  },
};
const string = z.string();
const attendance = z.object({
  userId: string,
  status: z.enum(["available", "busy", "unknown"]),
});
const draft = z.object({
  teamId: string,
  title: string,
  from: string,
  to: string,
  duration: z.number(),
  weekdays: z.array(z.number()),
  startTime: string,
  endTime: string,
  mode: z.enum(["all", "required"]),
  requiredIds: z.array(string),
});
const schema = z.object({
  users: z.array(
    z.object({ id: string, name: string, email: string, color: string }),
  ),
  teams: z.array(
    z.object({
      id: string,
      name: string,
      description: string,
      category: string,
    }),
  ),
  memberships: z.array(
    z.object({
      teamId: string,
      userId: string,
      role: z.enum(["admin", "member"]),
    }),
  ),
  invites: z.array(
    z.object({
      id: string,
      teamId: string,
      email: string,
      token: string,
      status: z.enum(["pending", "accepted"]),
      expiresAt: string,
    }),
  ),
  events: z.array(
    z.object({
      id: string,
      userId: string,
      title: string,
      start: string,
      end: string,
      source: z.enum(["manual", "google"]),
      allDay: z.boolean().optional(),
    }),
  ),
  calendars: z.array(
    z.object({
      userId: string,
      connected: z.boolean(),
      syncState: z.enum(["idle", "success", "error"]),
      lastSync: string.optional(),
      confirmed: z.boolean(),
      from: string,
      to: string,
    }),
  ),
  occurrences: z.array(
    z.object({
      id: string,
      teamId: string,
      seriesId: string,
      title: string,
      start: string,
      end: string,
      index: z.number(),
      total: z.number(),
      attendance: z.array(attendance),
      revision: z.number(),
    }),
  ),
  videos: z.array(
    z.object({
      id: string,
      occurrenceId: string,
      title: string,
      url: string,
      authorId: string,
      createdAt: string,
    }),
  ),
  feedback: z.array(
    z.object({
      id: string,
      videoId: string,
      authorId: string,
      body: string,
      createdAt: string,
      updatedAt: string.optional(),
    }),
  ),
  drafts: z.record(string, draft),
  recommendations: z.record(
    string,
    z.object({
      draft,
      candidates: z.array(
        z.object({
          id: string,
          weekday: z.number(),
          startTime: string,
          endTime: string,
          dates: z.array(string),
          attendance: z.array(z.array(attendance)),
        }),
      ),
      revision: z.number(),
      createdAt: string,
      missingIds: z.array(string),
    }),
  ),
  revision: z.number(),
  sessionUserId: string.nullable(),
  failNext: z.boolean(),
});
function valid(value: unknown): value is Data {
  return schema.safeParse(value).success;
}
export const useAppStore = create<Data>()(
  persist(() => createSeed(), {
    name: "teamground-prototype-v1",
    version: 1,
    storage: createJSONStorage(() => storage),
    merge(persisted, current) {
      if (persisted === undefined) return current;
      if (valid(persisted)) return { ...persisted, failNext: false };
      storageWarning = "저장 데이터 형식이 변경되어 기본 데모로 복원했습니다.";
      return current;
    },
    onRehydrateStorage: () => (_state, error) => {
      if (error)
        storageWarning = "저장 데이터를 읽지 못해 기본 데모로 시작합니다.";
    },
  }),
);
