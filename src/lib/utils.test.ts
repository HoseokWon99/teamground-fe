import { describe, expect, it } from "vitest";
import { displayDate } from "./utils";

describe("서울 기준 날짜 표시", () => {
  it.each([
    "2026-10-10T23:00:00-05:00",
    "2026-10-11T04:00:00Z",
    "2026-10-11T13:00:00+09:00",
    "2026-10-11T13:00",
  ])("%s의 시간대를 보존한다", (value) => {
    expect(displayDate(value)).toBe(displayDate("2026-10-11"));
  });
});
