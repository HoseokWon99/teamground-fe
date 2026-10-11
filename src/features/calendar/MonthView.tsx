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
  return (
    <section className="card" style={{ padding: 0, overflow: "hidden" }}>
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
            onClick={() => onMonth(addMonths(month, -1))}
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onMonth(
                new Date(
                  new Intl.DateTimeFormat("en-CA", {
                    timeZone: "Asia/Seoul",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date()) + "T12:00:00",
                ),
              )
            }
          >
            오늘
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="다음 달"
            onClick={() => onMonth(addMonths(month, 1))}
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
        {days.map((day) => (
          <div
            key={format(day, "yyyy-MM-dd")}
            style={{
              minHeight: 100,
              borderTop: "1px solid var(--border, #e4e7df)",
              borderRight: "1px solid var(--border, #e4e7df)",
              padding: 5,
              opacity: isSameMonth(day, month) ? 1 : 0.4,
              minWidth: 0,
            }}
          >
            <span className="muted" style={{ fontSize: 12 }}>
              {format(day, "d")}
            </span>
            {items
              .filter(
                (item) => item.start.slice(0, 10) === format(day, "yyyy-MM-dd"),
              )
              .map((item) => (
                <button
                  key={item.id}
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
        ))}
      </div>
    </section>
  );
}
