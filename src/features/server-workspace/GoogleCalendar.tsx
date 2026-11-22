import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/common";
import { api, apiUrl } from "@/features/server-auth/api";
import {
  dateRange,
  displayTime,
  LoadState,
  useAction,
  useResource,
  useUnsaved,
} from "./shared";
interface Connection {
  status: string;
  generation: number | null;
  sources: {
    calendarId: string;
    name: string;
    selected: boolean;
    syncStatus: string;
    lastSuccessAt: string | null;
    coverageFrom: string | null;
    coverageTo: string | null;
    current: boolean;
  }[];
}
export function GoogleCalendar({
  from,
  to,
  changed,
}: {
  from: string;
  to: string;
  changed: () => Promise<void>;
}) {
  const connection = useResource<Connection>("/me/calendar-connection");
  const [params] = useSearchParams();
  return (
    <section className="card stack" style={{ padding: 20 }}>
      <h2>Google 캘린더</h2>
      {params.has("calendarError") && (
        <ErrorNotice message="Google 캘린더를 연결하지 못했습니다. 같은 Google 계정인지 확인하고 다시 연결해 주세요." />
      )}
      <LoadState resource={connection} />
      {connection.data && (
        <ConnectionForm
          key={`${connection.data.generation}-${connection.data.sources.map((s) => `${s.calendarId}:${s.selected}`).join(",")}`}
          connection={connection.data}
          from={from}
          to={to}
          reload={async () => {
            await Promise.all([connection.reload(), changed()]);
          }}
        />
      )}
    </section>
  );
}
function ConnectionForm({
  connection,
  from,
  to,
  reload,
}: {
  connection: Connection;
  from: string;
  to: string;
  reload: () => Promise<void>;
}) {
  const action = useAction();
  const [selected, setSelected] = useState(
    connection.sources.filter((s) => s.selected).map((s) => s.calendarId),
  );
  const dirty =
    selected.join(",") !==
    connection.sources
      .filter((s) => s.selected)
      .map((s) => s.calendarId)
      .join(",");
  const clearDirty = useUnsaved(dirty, action.busy);
  return (
    <>
      <ErrorNotice message={action.error} />
      <p>{connection.status === "CONNECTED" ? "연결됨" : "연결되지 않음"}</p>
      {connection.status !== "CONNECTED" ? (
        <a href={apiUrl("/me/calendar-connection/google/start")}>
          Google 캘린더 읽기 전용 연결
        </a>
      ) : (
        <>
          <fieldset className="stack">
            <legend>가져올 캘린더 선택</legend>
            {connection.sources.map((source) => (
              <label className="stack" key={source.calendarId}>
                <span>
                  <input
                    type="checkbox"
                    checked={selected.includes(source.calendarId)}
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked
                          ? [...ids, source.calendarId]
                          : ids.filter((id) => id !== source.calendarId),
                      )
                    }
                  />{" "}
                  {source.name}
                </span>
                <span>
                  동기화{" "}
                  {(
                    {
                      NEVER_SYNCED: "아직 동기화하지 않음",
                      SYNCING: "진행 중",
                      SUCCEEDED: "완료",
                      FAILED: "실패",
                    } as Record<string, string>
                  )[source.syncStatus] ?? "상태 확인 필요"}{" "}
                  · {source.current ? "현재 선택 기준" : "다시 동기화 필요"}
                  {source.lastSuccessAt
                    ? ` · 마지막 성공 ${displayTime(source.lastSuccessAt)}`
                    : " · 성공 기록 없음"}
                </span>
              </label>
            ))}
          </fieldset>
          <Button
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                await api(
                  "/me/calendar-connection/sources",
                  { calendarIds: selected },
                  { method: "PUT" },
                );
                clearDirty();
                await reload();
              })
            }
          >
            캘린더 선택 저장
          </Button>
          <Button
            disabled={action.busy || dirty || from > to}
            onClick={() =>
              void action.run(async () => {
                const range = new URLSearchParams(dateRange(from, to));
                await api("/me/calendar-connection/sync", {
                  from: range.get("from"),
                  to: range.get("to"),
                });
                await reload();
              })
            }
          >
            확인 기간 동기화
          </Button>
          <Button
            variant="outline"
            disabled={action.busy}
            onClick={async () => {
              if (
                await action.confirm(
                  "연결을 해제하면 가져온 일정과 입력 완료 확인이 제거됩니다. 계속할까요?",
                )
              )
                void action.run(async () => {
                  await api("/me/calendar-connection", undefined, {
                    method: "DELETE",
                  });
                  clearDirty();
                  await reload();
                });
            }}
          >
            Google 캘린더 연결 해제
          </Button>
        </>
      )}
    </>
  );
}
