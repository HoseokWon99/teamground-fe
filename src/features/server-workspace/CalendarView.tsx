import { useState } from "react";
import {
  addMonths,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { MonthView, type CalendarItem } from "@/features/calendar/MonthView";
import { Button } from "@/components/ui/button";
import { dateToday, dateAfter, localTime } from "./shared";
export function useCalendarMonth() {
  const [month, setMonth] = useState(() => new Date(`${dateToday()}T12:00:00`));
  return {
    month,
    setMonth,
    from: format(startOfWeek(startOfMonth(month)), "yyyy-MM-dd"),
    to: format(endOfWeek(endOfMonth(month)), "yyyy-MM-dd"),
  };
}
export interface CalendarEntry {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  detail?: string;
  allDay?: boolean;
  startDate?: string | null;
  endDateExclusive?: string | null;
}
// Expand only the visible interval; all ranges are start-inclusive/end-exclusive in KST.
export function calendarItems(
  entries: CalendarEntry[],
  from: string,
  to: string,
): CalendarItem[] {
  return entries.flatMap((entry) => {
    const start =
      entry.allDay && entry.startDate
        ? `${entry.startDate}T00:00`
        : localTime(entry.startsAt);
    const end =
      entry.allDay && entry.endDateExclusive
        ? `${entry.endDateExclusive}T00:00`
        : localTime(entry.endsAt);
    const result: CalendarItem[] = [];
    for (
      let day = start.slice(0, 10) < from ? from : start.slice(0, 10);
      day <= to && `${day}T00:00` < end;
      day = dateAfter(1, day)
    ) {
      const next = `${dateAfter(1, day)}T00:00`;
      result.push({
        id: `${entry.id}|${day}`,
        title: entry.title,
        start: start > `${day}T00:00` ? start : `${day}T00:00`,
        end: end < next ? end : next,
        detail: [entry.allDay ? "종일" : undefined, entry.detail]
          .filter(Boolean)
          .join(" · "),
      });
    }
    return result;
  });
}
export function CalendarView({
  month,
  onMonth,
  entries,
  onSelect,
  from,
  to,
  label,
  pending = false,
}: {
  month: Date;
  onMonth: (value: Date) => void;
  entries: CalendarEntry[];
  onSelect: (id: string) => void;
  from: string;
  to: string;
  label: string;
  pending?: boolean;
}) {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const visible = entries
    .filter((e) => {
      const start = e.allDay
        ? e.startDate!
        : localTime(e.startsAt).slice(0, 10);
      const end = e.allDay
        ? `${e.endDateExclusive}T00:00`
        : localTime(e.endsAt);
      return (
        start <= format(endOfMonth(month), "yyyy-MM-dd") &&
        end > `${format(startOfMonth(month), "yyyy-MM-dd")}T00:00`
      );
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    <section className="stack" aria-label={label}>
      <div className="row calendar-switch">
        <Button
          variant={view === "calendar" ? "default" : "outline"}
          aria-pressed={view === "calendar"}
          onClick={() => setView("calendar")}
        >
          캘린더
        </Button>
        <Button
          variant={view === "list" ? "default" : "outline"}
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
        >
          목록
        </Button>
      </div>
      {pending ? null : view === "calendar" ? (
        <MonthView
          month={month}
          onMonth={onMonth}
          items={calendarItems(entries, from, to)}
          onSelect={(id) => onSelect(id.split("|")[0])}
        />
      ) : (
        <section className="card stack calendar-list">
          <div className="row calendar-list-toolbar">
            <h2>{format(month, "yyyy년 M월")}</h2>
            <div className="row">
              <Button
                variant="outline"
                aria-label="이전 달"
                onClick={() => onMonth(addMonths(month, -1))}
              >
                이전
              </Button>
              <Button
                variant="outline"
                onClick={() => onMonth(new Date(`${dateToday()}T12:00:00`))}
              >
                오늘
              </Button>
              <Button
                variant="outline"
                aria-label="다음 달"
                onClick={() => onMonth(addMonths(month, 1))}
              >
                다음
              </Button>
            </div>
          </div>
          {visible.length === 0 ? (
            <p>이 달에 등록된 일정이 없습니다.</p>
          ) : (
            visible.map((e) => (
              <button
                className="calendar-list-entry"
                key={e.id}
                onClick={() => onSelect(e.id)}
              >
                <strong>{e.title}</strong>
                <span>
                  {e.allDay
                    ? `${e.startDate} ~ ${dateAfter(-1, e.endDateExclusive!)} · 종일`
                    : `${localTime(e.startsAt).replace("T", " ")} ~ ${localTime(e.endsAt).replace("T", " ")}`}
                </span>
                {e.detail && <span>{e.detail}</span>}
              </button>
            ))
          )}
        </section>
      )}
    </section>
  );
}
