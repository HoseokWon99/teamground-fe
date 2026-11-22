import { GoogleCalendar } from "./GoogleCalendar";
import { useUnsavedActions } from "@/app/unsaved-changes";
import { useState } from "react";
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
  displayTime,
  localTime,
  toInstant,
  useUnsaved,
} from "./shared";
import type { PersonalEvent, Confirmation } from "./types";
export function CalendarPage() {
  const { profile } = useSession();
  const { confirmDiscard } = useUnsavedActions();
  const [formDirty, setFormDirty] = useState(false);
  const action = useAction();
  const [from, setFrom] = useState(dateToday);
  const [to, setTo] = useState(() => dateAfter(60));
  const events = useResource<PersonalEvent[]>(
    `/me/personal-events?${dateRange(from, to)}`,
  );
  const confirmations = useResource<Confirmation[]>(
    "/me/availability-confirmations",
  );
  const [editing, setEditing] = useState<PersonalEvent | null>(null);
  const [formKey, setFormKey] = useState(0);
  return (
    <>
      <PageHeader
        title="내 개인 일정"
        description="직접 입력한 바쁜 일정은 본인에게만 표시됩니다. 모든 시간은 Asia/Seoul입니다."
      />
      <section className="card stack" style={{ padding: 20 }}>
        <Field label="조회·확인 시작일">
          <input
            className="input"
            type="date"
            value={from}
            onChange={(e) => {
              if (e.target.value) setFrom(e.target.value);
            }}
          />
        </Field>
        <Field label="조회·확인 종료일 (포함)">
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
      <EventForm
        key={`${editing?.id ?? "new"}-${formKey}`}
        event={editing}
        onDirty={setFormDirty}
        saved={async () => {
          setEditing(null);
          setFormKey((k) => k + 1);
          await Promise.all([events.reload(), confirmations.reload()]);
        }}
        cancel={() => {
          setFormDirty(false);
          setEditing(null);
          setFormKey((k) => k + 1);
        }}
      />
      <section className="card stack" style={{ padding: 20 }}>
        <h2>개인 일정 목록</h2>
        <LoadState resource={events} />
        {events.data?.length === 0 && (
          <p>이 기간에 직접 입력한 일정이 없습니다.</p>
        )}
        {events.data?.map((event) => (
          <article className="stack" key={event.id}>
            <h3>{event.title || "바쁜 일정"}</h3>
            <p>
              {event.allDay
                ? `${event.startDate} ~ ${event.endDateExclusive} (종료일 제외)`
                : `${displayTime(event.startsAt)} ~ ${displayTime(event.endsAt)}`}
            </p>
            <p>{event.description}</p>
            <div className="row">
              <Button
                variant="outline"
                disabled={action.busy}
                onClick={async () => {
                  if (await confirmDiscard(formDirty)) {
                    setFormDirty(false);
                    setEditing(event);
                    setFormKey((k) => k + 1);
                  }
                }}
              >
                일정 수정
              </Button>
              <Button
                variant="outline"
                disabled={action.busy}
                onClick={() => {
                  if (window.confirm("이 개인 일정을 삭제할까요?"))
                    void action.run(async () => {
                      await api(`/me/personal-events/${event.id}`, undefined, {
                        method: "DELETE",
                        version: event.version,
                      });
                      await Promise.all([
                        events.reload(),
                        confirmations.reload(),
                      ]);
                    });
                }}
              >
                일정 삭제
              </Button>
            </div>
          </article>
        ))}
      </section>
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
}: {
  event: PersonalEvent | null;
  onDirty: (dirty: boolean) => void;
  saved: () => Promise<void>;
  cancel: () => void;
}) {
  const action = useAction();
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
          await saved();
        });
      }}
    >
      <h2>{event ? "개인 일정 수정" : "개인 일정 추가"}</h2>
      <ErrorNotice message={action.error} />
      <Field label="일정 제목">
        <input
          className="input"
          required
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
      <Button
        type="submit"
        disabled={action.busy || (allDay ? endDate <= startDate : end <= start)}
      >
        개인 일정 저장
      </Button>
      {event && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!dirty || window.confirm("수정 중인 내용을 버릴까요?"))
              cancel();
          }}
        >
          수정 취소
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
