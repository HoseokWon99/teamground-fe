import { useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, LockKeyhole } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { service } from "@/mocks/service";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PageHeader, ErrorNotice, EmptyState } from "@/components/common";
import { MonthView } from "./MonthView";
const schema = z
  .object({
    title: z.string().max(100, "100자 이내로 입력해 주세요"),
    start: z.string().min(1, "시작 시간을 입력해 주세요"),
    end: z.string().min(1, "종료 시간을 입력해 주세요"),
    allDay: z.boolean(),
  })
  .refine(
    (v) =>
      v.allDay ? v.end.slice(0, 10) >= v.start.slice(0, 10) : v.end > v.start,
    { path: ["end"], message: "종료는 시작보다 늦어야 합니다" },
  );
type EventForm = z.infer<typeof schema>;
export function CalendarPage() {
  const state = useAppStore();
  const userId = state.sessionUserId;
  const events = state.events.filter((e) => e.userId === userId);
  const status = state.calendars.find((c) => c.userId === userId);
  const [month, setMonth] = useState(new Date(2026, 9, 1));
  const [view, setView] = useState<"month" | "list">("month");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(status?.from || "2026-10-14");
  const [to, setTo] = useState(status?.to || "2026-11-06");
  const [syncOpen, setSyncOpen] = useState(false);
  const form = useForm<EventForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      start: "2026-10-14T09:00",
      end: "2026-10-14T10:00",
      allDay: false,
    },
  });
  const allDay = form.watch("allDay");
  const edited = events.find((e) => e.id === editId);
  const readonly = edited?.source === "google";
  const load = () => {
    setLoading(true);
    setError("");
    service
      .load()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [userId]);
  const run = async (task: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError("");
    try {
      await task();
      setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const edit = (id?: string) => {
    const event = events.find((e) => e.id === id);
    setEditId(id);
    form.reset(
      event
        ? {
            title: event.title,
            start: event.allDay
              ? event.start.slice(0, 10)
              : event.start.slice(0, 16),
            end: event.allDay
              ? format(
                  addDays(new Date(event.end.slice(0, 10) + "T12:00:00"), -1),
                  "yyyy-MM-dd",
                )
              : event.end.slice(0, 16),
            allDay: !!event.allDay,
          }
        : {
            title: "",
            start: "2026-10-14T09:00",
            end: "2026-10-14T10:00",
            allDay: false,
          },
    );
    setOpen(true);
  };
  const close = () => {
    if (
      !form.formState.isDirty ||
      window.confirm("저장하지 않은 일정 입력을 버릴까요?")
    )
      setOpen(false);
  };
  return (
    <div className="stack">
      <PageHeader
        eyebrow="MY CALENDAR"
        title="내 일정"
        description="바쁜 시간을 기록하면, 함께할 수 있는 시간이 보입니다."
        action={
          <Button onClick={() => edit()}>
            <Plus size={16} />
            일정 추가
          </Button>
        }
      />
      <div className="card row">
        <LockKeyhole size={20} />
        <p>
          나만 볼 수 있는 일정입니다. 팀에는 참석 가능 여부만 표시돼요.{" "}
          <span className="muted">Asia/Seoul</span>
        </p>
      </div>
      {error && <ErrorNotice message={error} />}{" "}
      {notice && (
        <p role="status" className="badge">
          {notice}
        </p>
      )}
      <div className="page-grid">
        <section className="card stack">
          <h2 className="section-title">일정 입력 확인</h2>
          <p className="muted">
            이 기간의 바쁜 시간을 모두 입력했다면 완료로 표시해 주세요.
          </p>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <label className="field">
              시작일
              <input
                className="input"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="field">
              종료일
              <input
                className="input"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          <span className="badge">
            {status?.confirmed ? "입력 완료" : "입력 확인 필요"}
          </span>
          <Button
            variant="outline"
            disabled={busy || !from || to < from}
            onClick={() =>
              run(
                () => service.confirmCalendar(from, to),
                "확인 기간의 일정 입력을 완료했습니다.",
              )
            }
          >
            {busy ? "저장 중…" : "입력 완료 표시"}
          </Button>
        </section>
        <section className="card stack">
          <h2 className="section-title">Google 캘린더</h2>
          <p className="muted">
            데모 시뮬레이션입니다. 실제 Google 계정에 연결하지 않습니다.
          </p>
          <span className="badge">
            {status?.syncState === "error"
              ? "동기화 실패 · 재시도 필요"
              : status?.connected
                ? "연결 완료"
                : "미연결"}
          </span>
          {status?.lastSync && (
            <p className="muted">
              마지막 동기화 {status.lastSync.slice(0, 16).replace("T", " ")}
            </p>
          )}
          <div className="row">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setSyncOpen(true)}
            >
              {busy
                ? "동기화 중…"
                : status?.connected
                  ? "다시 동기화"
                  : "샘플 캘린더 연결"}
            </Button>
            {status?.connected && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "가져온 Google 일정이 추천에서 제거됩니다. 연결을 해제할까요?",
                    )
                  )
                    void run(
                      () => service.disconnectGoogle(),
                      "연결을 해제했습니다. 직접 입력한 일정은 유지됩니다.",
                    );
                }}
              >
                연결 해제
              </Button>
            )}
          </div>
        </section>
      </div>
      <div className="row">
        <Button
          size="sm"
          variant={view === "month" ? "default" : "outline"}
          onClick={() => setView("month")}
        >
          월 보기
        </Button>
        <Button
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          onClick={() => setView("list")}
        >
          목록 보기
        </Button>
        <Button size="sm" variant="ghost" onClick={load}>
          새로고침
        </Button>
      </div>
      {loading ? (
        <p role="status">일정을 불러오는 중…</p>
      ) : view === "month" ? (
        <MonthView
          month={month}
          onMonth={setMonth}
          items={events.map((event) => ({
            ...event,
            detail: event.source === "google" ? "Google" : "직접 입력",
          }))}
          onSelect={edit}
        />
      ) : events.length ? (
        <div className="stack">
          {events.map((event) => (
            <button
              className="card row"
              key={event.id}
              style={{
                textAlign: "left",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={() => edit(event.id)}
            >
              <div>
                <h3>{event.title}</h3>
                <p className="muted">
                  {event.start.slice(0, 16).replace("T", " ")} ~{" "}
                  {event.end.slice(0, 16).replace("T", " ")}
                </p>
              </div>
              <span className="badge">
                {event.source === "google" ? "Google · 읽기 전용" : "직접 입력"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          title="등록한 바쁜 시간이 없습니다"
          description="바쁜 시간이 없다면 확인 기간을 정하고 입력 완료를 눌러주세요."
        />
      )}
      <Modal
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
        title={
          readonly ? "Google 일정" : editId ? "일정 수정" : "바쁜 시간 추가"
        }
        description="일정 제목은 다른 팀원에게 공개되지 않습니다."
      >
        <form
          className="stack"
          onSubmit={form.handleSubmit(async (values) => {
            await run(async () => {
              await service.saveEvent({
                id: editId,
                title: values.title.trim() || "개인 일정",
                start: values.allDay
                  ? values.start.slice(0, 10) + "T00:00"
                  : values.start,
                end: values.allDay
                  ? format(
                      addDays(
                        new Date(values.end.slice(0, 10) + "T12:00:00"),
                        1,
                      ),
                      "yyyy-MM-dd",
                    ) + "T00:00"
                  : values.end,
                allDay: values.allDay,
                source: "manual",
              });
              setOpen(false);
            }, "일정을 저장했습니다. 입력 완료를 다시 확인해 주세요.");
          })}
        >
          <label className="field">
            제목
            <input
              className="input"
              disabled={readonly}
              {...form.register("title")}
            />
            <span className="field-error">
              {form.formState.errors.title?.message}
            </span>
          </label>
          <label className="row">
            <input
              type="checkbox"
              disabled={readonly}
              {...form.register("allDay", {
                onChange: (e) => {
                  const enabled = e.target.checked;
                  form.setValue(
                    "start",
                    enabled
                      ? form.getValues("start").slice(0, 10)
                      : form.getValues("start").slice(0, 10) + "T09:00",
                  );
                  form.setValue(
                    "end",
                    enabled
                      ? form.getValues("end").slice(0, 10)
                      : form.getValues("end").slice(0, 10) + "T10:00",
                  );
                },
              })}
            />
            종일 일정
          </label>
          <label className="field">
            시작
            <input
              className="input"
              type={allDay ? "date" : "datetime-local"}
              disabled={readonly}
              {...form.register("start")}
            />
            <span className="field-error">
              {form.formState.errors.start?.message}
            </span>
          </label>
          <label className="field">
            종료 {allDay ? "(포함 날짜)" : ""}
            <input
              className="input"
              type={allDay ? "date" : "datetime-local"}
              disabled={readonly}
              {...form.register("end")}
            />
            <span className="field-error">
              {form.formState.errors.end?.message}
            </span>
          </label>
          {error && <ErrorNotice message={error} />}
          <div className="row">
            {!readonly && (
              <Button type="submit" disabled={busy}>
                {busy ? "저장 중…" : "저장"}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={close}>
              닫기
            </Button>
            {editId && !readonly && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("이 개인 일정을 삭제할까요?"))
                    void run(async () => {
                      await service.deleteEvent(editId);
                      setOpen(false);
                    }, "일정을 삭제했습니다. 입력 완료를 다시 확인해 주세요.");
                }}
              >
                삭제
              </Button>
            )}
          </div>
        </form>
      </Modal>
      <Modal
        open={syncOpen}
        onOpenChange={setSyncOpen}
        title="샘플 캘린더 동기화"
        description="실제 OAuth 연결 없이 샘플 일정만 가져옵니다."
      >
        <div className="stack">
          <label className="row">
            <input type="checkbox" checked readOnly />
            개인 캘린더 (데모)
          </label>
          <Button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await service.syncGoogle();
                setSyncOpen(false);
              }, "샘플 일정을 동기화했습니다. 입력 완료를 다시 확인해 주세요.")
            }
          >
            {busy ? "가져오는 중…" : "선택한 캘린더 가져오기"}
          </Button>
          {error && <ErrorNotice message={error} />}
        </div>
      </Modal>
    </div>
  );
}
