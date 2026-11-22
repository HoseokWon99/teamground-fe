import { describe, expect, it } from "vitest";
import { calendarItems } from "./CalendarView";

describe("server calendar visible date boundaries", () => {
  it("excludes the all-day end date across a month boundary", () => {
    const items = calendarItems(
      [
        {
          id: "a",
          title: "종일",
          allDay: true,
          startDate: "2026-11-30",
          endDateExclusive: "2026-12-02",
          startsAt: "2026-11-29T15:00:00Z",
          endsAt: "2026-12-01T15:00:00Z",
        },
      ],
      "2026-11-29",
      "2026-12-05",
    );
    expect(items.map((item) => item.start)).toEqual([
      "2026-11-30T00:00",
      "2026-12-01T00:00",
    ]);
    expect(items.at(-1)?.end).toBe("2026-12-02T00:00");
  });
  it("splits timed events on Korean midnight, without an extra ending day", () => {
    const items = calendarItems(
      [
        {
          id: "a",
          title: "자정 경계",
          startsAt: "2026-11-29T14:30:00Z",
          endsAt: "2026-11-30T15:00:00Z",
        },
      ],
      "2026-11-01",
      "2026-12-05",
    );
    expect(items.map(({ start, end }) => ({ start, end }))).toEqual([
      { start: "2026-11-29T23:30", end: "2026-11-30T00:00" },
      { start: "2026-11-30T00:00", end: "2026-12-01T00:00" },
    ]);
  });
  it("clips long events to the visible calendar range", () => {
    const items = calendarItems(
      [
        {
          id: "a",
          title: "여러 달",
          startsAt: "2026-01-01T00:00:00Z",
          endsAt: "2027-01-01T00:00:00Z",
        },
      ],
      "2026-11-30",
      "2026-12-01",
    );
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.start.slice(0, 10))).toEqual([
      "2026-11-30",
      "2026-12-01",
    ]);
  });
});
