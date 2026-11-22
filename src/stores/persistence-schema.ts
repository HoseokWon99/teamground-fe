import { z } from "zod/mini";
import type { Attendance, Data, Draft } from "@/lib/types";
const string = z.string();
const id = string.check(z.minLength(1));
const date = string.check(z.regex(/^\d{4}-\d{2}-\d{2}$/), z.refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value
  );
}));
const time = string.check(z.regex(/^([01]\d|2[0-3]):[0-5]\d$/));
const datetime = string.check(z.refine((value) => {
  return (
    date.safeParse(value.slice(0, 10)).success &&
    /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)?$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value))
  );
}));
const localDatetime = datetime.check(z.refine(
  (value) => !/(Z|[+-]\d{2}:\d{2})$/.test(value),
));
const count = z.number().check(z.int(), z.gte(0));
const videoUrl = string.check(z.refine((value) => {
  if (value === "/demo/rehearsal.webm") return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}));
const attendance = z.object({
  userId: id,
  status: z.enum(["available", "busy", "unknown"]),
});
const draft = z.object({
  teamId: id,
  title: string,
  from: date,
  to: date,
  duration: z.number().check(z.gte(30), z.lte(240), z.multipleOf(30)),
  weekdays: z.array(z.number().check(z.int(), z.gte(0), z.lte(6))),
  startTime: time,
  endTime: time,
  mode: z.enum(["all", "required"]),
  requiredIds: z.array(string),
});
const schema = z.object({
  users: z.array(
    z.object({ id: id, name: string, email: string, color: string }),
  ),
  teams: z.array(
    z.object({
      id: id,
      name: string,
      description: string,
      category: string,
    }),
  ),
  memberships: z.array(
    z.object({
      teamId: id,
      userId: id,
      role: z.enum(["admin", "member"]),
    }),
  ),
  invites: z.array(
    z.object({
      id: id,
      teamId: id,
      email: string,
      token: string,
      status: z.enum(["pending", "accepted"]),
      expiresAt: datetime,
    }),
  ),
  events: z.array(
    z.object({
      id: id,
      userId: id,
      title: string,
      start: localDatetime,
      end: localDatetime,
      source: z.enum(["manual", "google"]),
      allDay: z.optional(z.boolean()),
    }),
  ),
  calendars: z.array(
    z.object({
      userId: id,
      connected: z.boolean(),
      syncState: z.enum(["idle", "success", "error"]),
      lastSync: z.optional(datetime),
      confirmed: z.boolean(),
      from: date,
      to: date,
    }),
  ),
  occurrences: z.array(
    z.object({
      id: id,
      teamId: id,
      seriesId: id,
      title: string,
      start: localDatetime,
      end: localDatetime,
      index: count,
      total: count,
      attendance: z.array(attendance),
      revision: count,
    }),
  ),
  videos: z.array(
    z.object({
      id: id,
      occurrenceId: id,
      title: string,
      url: videoUrl,
      authorId: id,
      createdAt: datetime,
    }),
  ),
  feedback: z.array(
    z.object({
      id: id,
      videoId: id,
      authorId: id,
      body: string,
      createdAt: datetime,
      updatedAt: z.optional(datetime),
    }),
  ),
  drafts: z.record(string, draft),
  recommendations: z.record(
    string,
    z.object({
      draft,
      candidates: z.array(
        z.object({
          id: id,
          weekday: z.number().check(z.int(), z.gte(0), z.lte(6)),
          startTime: time,
          endTime: time,
          dates: z.array(date).check(z.minLength(1)),
          attendance: z.array(z.array(attendance)),
        }),
      ),
      revision: count,
      createdAt: datetime,
      missingIds: z.array(string),
    }),
  ),
  revision: count,
  sessionUserId: z.nullable(string),
  failNext: z.boolean(),
});

const unique = (values: string[]) => new Set(values).size === values.length;
const minutes = (value: string) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

export function validPersistedData(value: unknown): value is Data {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return false;
  const data = parsed.data;
  const users = new Set(data.users.map((item) => item.id));
  const teams = new Set(data.teams.map((item) => item.id));
  const occurrences = new Map(data.occurrences.map((item) => [item.id, item]));
  const videos = new Map(data.videos.map((item) => [item.id, item]));
  const member = (teamId: string, userId: string) =>
    data.memberships.some(
      (item) => item.teamId === teamId && item.userId === userId,
    );
  const validAttendance = (teamId: string, rows: Attendance[]) =>
    unique(rows.map((row) => row.userId)) &&
    rows.every((row) => member(teamId, row.userId));
  const validDraft = (key: string, draft: Draft) =>
    teams.has(key) &&
    draft.teamId === key &&
    draft.from <= draft.to &&
    Date.parse(draft.to) - Date.parse(draft.from) <= 55 * 86400000 &&
    draft.weekdays.length > 0 &&
    unique(draft.weekdays.map(String)) &&
    minutes(draft.endTime) - minutes(draft.startTime) >= draft.duration &&
    unique(draft.requiredIds) &&
    draft.requiredIds.every((userId) => member(key, userId)) &&
    (draft.mode !== "required" || draft.requiredIds.length > 0);
  return (
    [
      data.users,
      data.teams,
      data.invites,
      data.events,
      data.occurrences,
      data.videos,
      data.feedback,
    ].every((items) => unique(items.map((item) => item.id))) &&
    unique(
      data.memberships.map((item) =>
        JSON.stringify([item.teamId, item.userId]),
      ),
    ) &&
    unique(data.calendars.map((item) => item.userId)) &&
    (data.sessionUserId === null || users.has(data.sessionUserId)) &&
    data.memberships.every(
      (item) => teams.has(item.teamId) && users.has(item.userId),
    ) &&
    data.invites.every((item) => teams.has(item.teamId)) &&
    data.events.every(
      (item) =>
        users.has(item.userId) && Date.parse(item.start) < Date.parse(item.end),
    ) &&
    data.calendars.every(
      (item) => users.has(item.userId) && item.from <= item.to,
    ) &&
    data.occurrences.every(
      (item) =>
        teams.has(item.teamId) &&
        Date.parse(item.start) < Date.parse(item.end) &&
        item.index >= 1 &&
        item.index <= item.total &&
        validAttendance(item.teamId, item.attendance),
    ) &&
    data.videos.every((item) => {
      const occurrence = occurrences.get(item.occurrenceId);
      return (
        occurrence !== undefined && member(occurrence.teamId, item.authorId)
      );
    }) &&
    data.feedback.every((item) => {
      const video = videos.get(item.videoId);
      const occurrence = video && occurrences.get(video.occurrenceId);
      return (
        occurrence !== undefined && member(occurrence.teamId, item.authorId)
      );
    }) &&
    Object.entries(data.drafts).every(([key, draft]) =>
      validDraft(key, draft),
    ) &&
    Object.entries(data.recommendations).every(
      ([key, result]) =>
        validDraft(key, result.draft) &&
        result.missingIds.every((userId) => member(key, userId)) &&
        unique(result.candidates.map((candidate) => candidate.id)) &&
        result.candidates.every(
          (candidate) =>
            candidate.startTime < candidate.endTime &&
            candidate.dates.length === candidate.attendance.length &&
            unique(candidate.dates) &&
            candidate.dates.every(
              (date) =>
                date >= result.draft.from &&
                date <= result.draft.to &&
                new Date(`${date}T00:00:00Z`).getUTCDay() === candidate.weekday,
            ) &&
            candidate.attendance.every((rows) => validAttendance(key, rows)),
        ),
    )
  );
}

export function normalizePersistedData(value: unknown): Data | null {
  return validPersistedData(value) ? schema.parse(value) : null;
}
