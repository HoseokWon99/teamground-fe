import { CalendarView, useCalendarMonth } from "./CalendarView";
import { Modal } from "@/components/ui/modal";
import { GoogleCalendar } from "./GoogleCalendar";
import { useUnsavedActions } from "@/app/unsaved-changes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, PageHeader } from "@/components/common";
import { api } from "@/features/server-auth/api";
import { useSession } from "@/features/server-auth/session";
import {
  Field,
  LoadState,
  useAction,
  useResource,
  dateToday,
  dateAfter,
  dateRange,
  localTime,
  toInstant,
  useUnsaved,
} from "./shared";
import type { PersonalEvent, Confirmation } from "./types";
export function CalendarPage() {
  const { profile } = useSession();
  const { confirmDiscard } = useUnsavedActions();
  const [formSaving, setFormSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [formDirty, setFormDirty] = useState(false);
  const action = useAction();
  const [from, setFrom] = useState(dateToday);
  const [to, setTo] = useState(() => dateAfter(60));
  const {
    month,
    setMonth,
    from: calendarFrom,
    to: calendarTo,
  } = useCalendarMonth();
  const events = useResource<PersonalEvent[]>(
    `/me/personal-events?${dateRange(calendarFrom, calendarTo)}`,
  );
  const confirmations = useResource<Confirmation[]>(
    "/me/availability-confirmations",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalEvent | null>(null);
  const [formKey, setFormKey] = useState(0);
  return (
    <>
      <PageHeader
        title="내 개인 일정"
        description="직접 입력한 바쁜 일정은 본인에게만 표시됩니다. 모든 시간은 Asia/Seoul입니다."
        action={
          <Button
            onClick={async () => {
              setEditing(null);
              setOpen(true);
            }}
          >
            일정 추가
          </Button>
        }
      />
      <section className="card stack" style={{ padding: 20 }}>
        <Field label="확인·동기화 시작일">
          <input
            className="input"
            type="date"
            value={from}
            onChange={(e) => {
              if (e.target.value) setFrom(e.target.value);
            }}
          />
        </Field>
        <Field label="확인·동기화 종료일 (포함)">
          <input
            className="input"
            type="date"
            min={from}
            value={to}
            onChange={(e) => {
              if (e.target.value) setTo(e.target.value);
            }}
          />
        </Field>
        <ErrorNotice message={action.error} />
        <Button
          disabled={action.busy || from > to}
          onClick={() =>
            void action.run(async () => {
              await api("/me/availability-confirmations", {
                dateFrom: from,
                dateTo: to,
              });
              await confirmations.reload();
            })
          }
        >
          이 기간 일정 입력 완료
        </Button>
        <p>
          일정이 없더라도 입력 완료로 확인해야 참석 가능으로 판단할 수 있습니다.
        </p>
        <LoadState resource={confirmations} />
        {confirmations.data?.map((c) => (
          <p key={c.id}>
            확인 완료: {c.dateFrom} ~ {c.dateTo}
          </p>
        ))}
      </section>
      {notice && <p role="status">{notice}</p>}
      <LoadState resource={events} />
      {
        <CalendarView
          label="개인 일정 달력"
          month={month}
          onMonth={setMonth}
          from={calendarFrom}
          to={calendarTo}
          pending={!events.data}
          entries={(events.data ?? []).map((e) => ({
            ...e,
            title: e.title || "바쁜 일정",
            detail: "직접 입력 · 비공개",
          }))}
          onSelect={(id) => {
            const event = events.data?.find((e) => e.id === id);
            if (event) {
              setEditing(event);
              setOpen(true);
            }
          }}
        />
      }
      <Modal
        open={open}
        closeDisabled={formSaving || action.busy}
        onOpenChange={async (value) => {
          if (
            value ||
            (await confirmDiscard(formDirty, formSaving || action.busy))
          ) {
            setOpen(value);
            if (!value) {
              setFormDirty(false);
              setFormKey((k) => k + 1);
            }
          }
        }}
        title={editing ? "개인 일정 수정" : "개인 일정 추가"}
      >
        <ErrorNotice message={action.error} />
        <EventForm
          key={`${editing?.id ?? "new"}-${formKey}`}
          event={editing}
          onDirty={setFormDirty}
          onSaving={setFormSaving}
          parentBusy={action.busy}
          saved={async (date) => {
            setMonth(new Date(`${date}T12:00:00`));
            setNotice("개인 일정을 저장했습니다.");
            setEditing(null);
            setFormKey((k) => k + 1);
            setOpen(false);
            await Promise.all([events.reload(), confirmations.reload()]);
          }}
          cancel={() => {
            setFormDirty(false);
            setEditing(null);
            setOpen(false);
            setFormKey((k) => k + 1);
          }}
        />
        {editing && (
          <Button
            variant="outline"
            disabled={action.busy || formSaving}
            onClick={async () => {
              if (await action.confirm("이 개인 일정을 삭제할까요?"))
                void action.run(async () => {
                  await api(`/me/personal-events/${editing.id}`, undefined, {
                    method: "DELETE",
                    version: editing.version,
                  });
                  setFormDirty(false);
                  setOpen(false);
                  setEditing(null);
                  await Promise.all([events.reload(), confirmations.reload()]);
                });
            }}
          >
            일정 삭제
          </Button>
        )}
      </Modal>
      {profile?.authMethod === "EMAIL" ? (
        <p>
          이메일 계정은 Google 캘린더를 연결할 수 없습니다. 개인 일정을 직접
          입력해 주세요.
        </p>
      ) : (
        <GoogleCalendar
          from={from}
          to={to}
          changed={async () => {
            await Promise.all([events.reload(), confirmations.reload()]);
          }}
        />
      )}
    </>
  );
}
function EventForm({
  event,
  saved,
  cancel,
  onDirty,
  onSaving,
  parentBusy,
}: {
  event: PersonalEvent | null;
  onDirty: (dirty: boolean) => void;
  onSaving: (saving: boolean) => void;
  parentBusy: boolean;
  saved: (date: string) => Promise<void>;
  cancel: () => void;
}) {
  const action = useAction();
  useEffect(() => {
    onSaving(action.busy);
    return () => onSaving(false);
  }, [action.busy, onSaving]);
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [start, setStart] = useState(
    event ? localTime(event.startsAt) : `${dateToday()}T18:00`,
  );
  const [end, setEnd] = useState(
    event ? localTime(event.endsAt) : `${dateToday()}T19:00`,
  );
  const [startDate, setStartDate] = useState(event?.startDate ?? dateToday());
  const [endDate, setEndDate] = useState(
    event?.endDateExclusive ?? dateAfter(1),
  );
  const [dirty, setDirty] = useState(false);
  const clearDirty = useUnsaved(dirty, action.busy);
  return (
    <form
      className="card stack"
      style={{ padding: 20 }}
      onChange={() => {
        setDirty(true);
        onDirty(true);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (parentBusy) return;
        void action.run(async () => {
          await api(
            event ? `/me/personal-events/${event.id}` : "/me/personal-events",
            {
              title: title.trim(),
              description: description.trim(),
              allDay,
              ...(allDay
                ? { startDate, endDateExclusive: endDate }
                : { startsAt: toInstant(start), endsAt: toInstant(end) }),
            },
            { method: event ? "PATCH" : "POST", version: event?.version },
          );
          clearDirty();
          setDirty(false);
          onDirty(false);
          await saved(allDay ? startDate : start.slice(0, 10));
        });
      }}
    >
      <h2>{event ? "개인 일정 수정" : "개인 일정 추가"}</h2>
      <ErrorNotice message={action.error} />
      <Field label="일정 제목">
        <input
          className="input"
          required
          pattern={".*\\S.*"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="설명">
        <textarea
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <label>
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        />{" "}
        종일 일정
      </label>
      {allDay ? (
        <>
          <Field label="시작일">
            <input
              className="input"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="종료일 (이 날짜는 포함하지 않음)">
            <input
              className="input"
              type="date"
              required
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="시작 시각">
            <input
              className="input"
              type="datetime-local"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="종료 시각">
            <input
              className="input"
              type="datetime-local"
              required
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </>
      )}
      {(allDay ? endDate <= startDate : end <= start) && (
        <p role="alert" className="error-notice">
          종료는 시작보다 늦어야 합니다.
        </p>
      )}
      <Button
        type="submit"
        disabled={
          parentBusy ||
          action.busy ||
          (allDay ? endDate <= startDate : end <= start)
        }
      >
        개인 일정 저장
      </Button>
      {(event || dirty) && (
        <Button
          type="button"
          variant="outline"
          disabled={parentBusy || action.busy}
          onClick={async () => {
            if (!dirty || (await action.confirm("수정 중인 내용을 버릴까요?")))
              cancel();
          }}
        >
          취소
        </Button>
      )}
      {action.error && (
        <p>
          입력은 유지됩니다. 목록을 다시 불러온 뒤 최신 항목에서 수정해 주세요.
        </p>
      )}
    </form>
  );
}
