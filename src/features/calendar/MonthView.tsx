import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useState } from "react";
import "./MonthView.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export interface CalendarItem {
  id: string;
  start: string;
  end: string;
  title: string;
  detail?: string;
}
export function MonthView({
  month,
  onMonth,
  items,
  onSelect,
}: {
  month: Date;
  onMonth: (date: Date) => void;
  items: CalendarItem[];
  onSelect: (id: string) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
  const monthKey = format(month, "yyyy-MM");
  const [selection, setSelection] = useState({ month: monthKey, day: "" });
  const firstEventDay = items.map((item) => item.start.slice(0, 10))
    .filter((day) => day.startsWith(monthKey)).sort()[0];
  const selectedDay = selection.month === monthKey && selection.day
    ? selection.day
    : firstEventDay ?? `${monthKey}-01`;
  const selectedDate = new Date(`${selectedDay}T12:00:00`);
  const selectedItems = items.filter((item) => item.start.slice(0, 10) === selectedDay)
    .sort((a, b) => a.start.localeCompare(b.start));
  function timeRange(item: CalendarItem) {
    const endDate = item.end.slice(0, 10) === selectedDay
      ? ""
      : `${item.end.slice(0, 10).replaceAll("-", "/")} `;
    return `${item.start.slice(11, 16)}–${endDate}${item.end.slice(11, 16)}`;
  }
  function changeMonth(date: Date, day = "") {
    setSelection({ month: format(date, "yyyy-MM"), day });
    onMonth(date);
  }
  return (
    <section className="card month-view" style={{ padding: 0, overflow: "hidden" }}>
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          padding: 20,
          flexWrap: "wrap",
        }}
      >
        <h2 className="section-title">{format(month, "yyyy년 M월")}</h2>
        <div className="row">
          <Button
            variant="ghost"
            size="icon"
            aria-label="이전 달"
            onClick={() => changeMonth(addMonths(month, -1))}
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
              }).format(new Date());
              changeMonth(new Date(`${today}T12:00:00`), today);
            }}
          >
            오늘
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="다음 달"
            onClick={() => changeMonth(addMonths(month, 1))}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,minmax(0,1fr))",
        }}
      >
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <div
            key={day}
            className="muted"
            style={{ padding: 10, textAlign: "center", fontSize: 12 }}
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayItems = items.filter((item) => item.start.slice(0, 10) === dateKey);
          return (
          <div
            key={dateKey}
            className="month-view-cell"
            style={{
              minHeight: 100,
              borderTop: "1px solid var(--border, #e4e7df)",
              borderRight: "1px solid var(--border, #e4e7df)",
              padding: 5,
              background: isSameMonth(day, month) ? undefined : "#f4f6ef",
              minWidth: 0,
            }}
          >
            <button
              className="month-view-date"
              aria-label={`${format(day, "yyyy년 M월 d일")} 일정 ${dayItems.length}개`}
              aria-pressed={selectedDay === dateKey}
              onClick={() => setSelection({ month: monthKey, day: dateKey })}
            >
              <span>{format(day, isSameMonth(day, month) ? "d" : "M/d")}</span>
              <small>{dayItems.length || "–"}</small>
            </button>
            <span className="muted month-view-desktop" style={{ fontSize: 12 }}>
              {format(day, isSameMonth(day, month) ? "d" : "M/d")}
            </span>
            {dayItems.map((item) => (
                <button
                  key={item.id}
                  className="month-view-desktop"
                  aria-label={`${format(day, "yyyy년 M월 d일")} ${item.start.slice(11, 16)} ${item.title}${item.detail ? ` · ${item.detail}` : ""}`}
                  onClick={() => onSelect(item.id)}
                  style={{
                    display: "block",
                    background: "#e4ede0",
                    border: 0,
                    borderRadius: 5,
                    padding: "6px 4px",
                    marginTop: 5,
                    width: "100%",
                    textAlign: "left",
                    color: "#36533e",
                    fontSize: 11,
                    cursor: "pointer",
                    overflowWrap: "anywhere",
                  }}
                >
                  <b>{item.start.slice(11, 16)}</b>
                  <br />
                  {item.title}
                  {item.detail && (
                    <>
                      <br />
                      <small>{item.detail}</small>
                    </>
                  )}
                </button>
              ))}
          </div>
          );
        })}
      </div>
      <div className="month-view-agenda" role="region" aria-label="선택한 날짜 일정">
        <h3 aria-live="polite">{format(selectedDate, "yyyy년 M월 d일")} · 일정 {selectedItems.length}개</h3>
        {selectedItems.length === 0 ? <p className="muted">이 날짜에 등록된 일정이 없습니다.</p> : (
          <ul>
            {selectedItems.map((item) => (
              <li key={item.id}>
                <button onClick={() => onSelect(item.id)}
                  aria-label={`${format(selectedDate, "yyyy년 M월 d일")} ${timeRange(item)} ${item.title}${item.detail ? ` · ${item.detail}` : ""}`}>
                  <span className="month-view-time">{timeRange(item)}</span>
                  <strong>{item.title}</strong>
                  {item.detail && <span>{item.detail}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
