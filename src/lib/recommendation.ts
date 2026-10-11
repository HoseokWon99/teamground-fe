import type { Attendance, Data, Draft, Recommendation } from "./types";
const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const time = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export function overlaps(
  start: string,
  end: string,
  otherStart: string,
  otherEnd: string,
) {
  return start < otherEnd && otherStart < end;
}
export function calculateRecommendation(
  data: Data,
  draft: Draft,
): Recommendation {
  const ids = data.memberships
    .filter((m) => m.teamId === draft.teamId)
    .map((m) => m.userId);
  if (
    !draft.title.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.to) ||
    draft.from > draft.to ||
    !draft.weekdays.length ||
    draft.weekdays.some((d) => d < 0 || d > 6) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.endTime) ||
    draft.duration < 30 ||
    draft.duration > 240 ||
    draft.duration % 30 !== 0 ||
    draft.duration > minutes(draft.endTime) - minutes(draft.startTime)
  )
    throw new Error(
      "일정 조건을 확인해 주세요. 기간, 요일과 모임 시간을 올바르게 입력해 주세요.",
    );
  const required = draft.mode === "all" ? ids : draft.requiredIds;
  if (!required.length || required.some((id) => !ids.includes(id)))
    throw new Error("필수 멤버를 한 명 이상 선택해 주세요.");
  const days: string[] = [];
  const cursor = new Date(`${draft.from}T00:00:00Z`),
    end = new Date(`${draft.to}T00:00:00Z`);
  if (
    !Number.isFinite(+cursor) ||
    !Number.isFinite(+end) ||
    +end - +cursor > 55 * 86400000
  )
    throw new Error(
      "탐색 기간은 시작일과 종료일을 포함해 8주 이내로 입력해 주세요.",
    );
  for (; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1))
    days.push(cursor.toISOString().slice(0, 10));
  const result: Recommendation = {
    draft: structuredClone(draft),
    candidates: [],
    revision: data.revision,
    createdAt: new Date().toISOString(),
    missingIds: [],
  };
  for (const weekday of [...new Set(draft.weekdays)]) {
    const dates = days.filter(
      (d) => new Date(`${d}T00:00:00Z`).getUTCDay() === weekday,
    );
    if (!dates.length) continue;
    for (
      let start = minutes(draft.startTime);
      start + draft.duration <= minutes(draft.endTime);
      start += 30
    ) {
      const startTime = time(start),
        endTime = time(start + draft.duration);
      const attendance: Attendance[][] = dates.map((date) =>
        ids.map((userId) => {
          const c = data.calendars.find((c) => c.userId === userId);
          const unknown =
            !c ||
            !c.confirmed ||
            c.syncState === "error" ||
            c.from > date ||
            c.to < date;
          return {
            userId,
            status: unknown
              ? "unknown"
              : data.events.some(
                    (e) =>
                      e.userId === userId &&
                      overlaps(
                        `${date}T${startTime}`,
                        `${date}T${endTime}`,
                        e.start,
                        e.end,
                      ),
                  )
                ? "busy"
                : "available",
          };
        }),
      );
      attendance
        .flat()
        .filter((a) => required.includes(a.userId) && a.status === "unknown")
        .forEach((a) => {
          if (!result.missingIds.includes(a.userId))
            result.missingIds.push(a.userId);
        });
      if (
        attendance.every((row) =>
          row
            .filter((a) => required.includes(a.userId))
            .every((a) => a.status === "available"),
        )
      )
        result.candidates.push({
          id: `candidate-${weekday}-${start}`,
          weekday,
          startTime,
          endTime,
          dates,
          attendance,
        });
    }
  }
  const allCount = (rows: Attendance[][]) =>
    rows.filter((row) => row.every((a) => a.status === "available")).length;
  const availableCount = (rows: Attendance[][]) =>
    rows.flat().filter((a) => a.status === "available").length;
  result.candidates.sort(
    (a, b) =>
      (draft.mode === "required"
        ? allCount(b.attendance) - allCount(a.attendance) ||
          availableCount(b.attendance) - availableCount(a.attendance)
        : 0) ||
      `${a.dates[0]}T${a.startTime}`.localeCompare(
        `${b.dates[0]}T${b.startTime}`,
      ),
  );
  return result;
}
