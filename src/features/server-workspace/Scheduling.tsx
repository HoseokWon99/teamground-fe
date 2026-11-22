import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ErrorNotice, PageHeader } from "@/components/common";
import { api, type Teamspace } from "@/features/server-auth/api";
import { useSession } from "@/features/server-auth/session";
import {
  Field,
  LoadState,
  teamPath,
  useAction,
  useResource,
  dateToday,
  displayTime,
  useUnsaved,
} from "./shared";
import type { Candidate, Conditions, Member, SchedulingRequest } from "./types";
const statusLabels = {
  AVAILABLE: "참석 가능",
  UNAVAILABLE: "참석 불가",
  UNKNOWN: "확인 필요",
};
export function SchedulingPage() {
  const { teamId = "", requestId } = useParams();
  return requestId ? (
    <RequestPage
      key={`${teamId}/${requestId}`}
      teamId={teamId}
      requestId={requestId}
    />
  ) : (
    <CreatePage key={teamId} teamId={teamId} />
  );
}
function CreatePage({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const members = useResource<Member[]>(`${teamPath(teamId)}/members`);
  return (
    <>
      <PageHeader
        title="새 일정 조율"
        description="매주 반복할 요일과 시간을 지정합니다. 시간대 Asia/Seoul"
      />
      <Link to={`/teams/${teamId}`}>팀으로 돌아가기</Link>
      <LoadState resource={members} />
      {members.data && (
        <ConditionsForm
          members={members.data}
          save={async (conditions, markSaved) => {
            const r = await api<SchedulingRequest>(
              `${teamPath(teamId)}/scheduling-requests`,
              conditions,
            );
            markSaved();
            navigate(`/teams/${teamId}/scheduling/${r.id}`, { replace: true });
          }}
        />
      )}
    </>
  );
}
function RequestPage({
  teamId,
  requestId,
}: {
  teamId: string;
  requestId: string;
}) {
  const base = `${teamPath(teamId)}/scheduling-requests/${requestId}`;
  const request = useResource<SchedulingRequest>(base);
  const team = useResource<Teamspace>(teamPath(teamId));
  const members = useResource<Member[]>(`${teamPath(teamId)}/members`);
  const action = useAction();
  const { profile } = useSession();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [editing, setEditing] = useState(false);
  const r = request.data;
  const owner = team.data?.role === "OWNER";
  const canEdit = owner || r?.createdBy === profile?.id;
  return (
    <>
      <PageHeader
        title={r?.conditions.title ?? "일정 조율"}
        description="서버가 계산한 참석 가능 정보이며 실제 참석 응답은 아닙니다."
      />
      <Link to={`/teams/${teamId}`}>팀 회차 목록으로</Link>
      <LoadState resource={request} />
      <LoadState resource={team} />
      <LoadState resource={members} />
      <ErrorNotice message={action.error} />
      <Button
        variant="outline"
        disabled={action.busy || request.loading}
        onClick={() => {
          setCandidates(null);
          void request.reload();
        }}
      >
        조율 최신 정보 다시 불러오기
      </Button>
      {r && (
        <>
          <p>
            {r.conditions.dateFrom} ~ {r.conditions.dateTo} ·{" "}
            {r.conditions.durationMinutes}분 ·{" "}
            {r.conditions.attendanceMode === "ALL"
              ? "전원 참석"
              : "필수 멤버 참석"}
          </p>
          {r.conditions.windows.map((w, i) => (
            <p key={i}>
              {["", "월", "화", "수", "목", "금", "토", "일"][w.weekday]}요일{" "}
              {w.start} ~ {w.end}
            </p>
          ))}
          {r.status === "CONFIRMED" ? (
            <p role="status">
              확정된 조율입니다. 팀 회차 목록에서 연습 기록을 남겨 보세요.
            </p>
          ) : (
            <>
              {canEdit && (
                <Button
                  variant="outline"
                  disabled={action.busy || request.loading}
                  onClick={() => {
                    if (
                      !editing ||
                      window.confirm(
                        "편집을 닫으면 저장하지 않은 내용을 버립니다. 계속할까요?",
                      )
                    )
                      setEditing((v) => !v);
                  }}
                >
                  {editing ? "조건 편집 닫기" : "조건 수정"}
                </Button>
              )}
              {editing && members.data && (
                <ConditionsForm
                  key={r.id}
                  initial={r.conditions}
                  members={members.data}
                  save={async (conditions) => {
                    await api(base, conditions, {
                      method: "PATCH",
                      version: r.version,
                    });
                    setCandidates(null);
                    setEditing(false);
                    await request.reload();
                  }}
                />
              )}
              <Button
                disabled={action.busy || request.loading}
                onClick={() =>
                  void action.run(async () => {
                    setCandidates(null);
                    const next = await api<Candidate[]>(
                      `${base}/candidates`,
                      {},
                    );
                    setCandidates(next);
                    await request.reload();
                  })
                }
              >
                추천 후보 조회
              </Button>
              {candidates?.length === 0 && (
                <p>
                  현재 조건을 만족하는 후보가 없습니다. 필수 멤버의 일정 입력
                  완료 여부와 조건을 확인해 주세요. 조건은 자동으로 완화되지
                  않습니다.
                </p>
              )}
              {candidates?.map((candidate) => (
                <article
                  className="card stack"
                  style={{ padding: 20 }}
                  key={candidate.id}
                >
                  <h2>
                    {
                      ["", "월", "화", "수", "목", "금", "토", "일"][
                        candidate.weekday
                      ]
                    }
                    요일 {candidate.localStart}
                  </h2>
                  <p>
                    회차별 최소 {candidate.score.minimumAvailableMembers}명 가능
                    · {candidate.occurrences.length}회
                  </p>
                  {candidate.occurrences.map((slot) => (
                    <details key={slot.startsAt}>
                      <summary>
                        {displayTime(slot.startsAt)} ~{" "}
                        {displayTime(slot.endsAt)}
                      </summary>
                      {slot.members.map((m) => (
                        <p key={m.membershipId}>
                          {members.data?.find(
                            (entry) => entry.membershipId === m.membershipId,
                          )?.displayName ?? "멤버"}{" "}
                          · {statusLabels[m.availability]}{" "}
                          {m.required ? "(필수)" : ""}
                        </p>
                      ))}
                    </details>
                  ))}
                  {canEdit && (
                    <Button
                      disabled={
                        action.busy ||
                        request.loading ||
                        r.selectedCandidateId === candidate.id
                      }
                      onClick={() =>
                        void action.run(async () => {
                          await api(
                            `${base}/selection`,
                            { candidateId: candidate.id },
                            { method: "PUT", version: r.version },
                          );
                          await request.reload();
                        })
                      }
                    >
                      {r.selectedCandidateId === candidate.id
                        ? "선택한 후보"
                        : "이 후보 선택"}
                    </Button>
                  )}
                </article>
              ))}
              {r.selectedCandidateId && (
                <p>
                  후보가 선택되었습니다. 관리자가 최신 조건을 확인하고 확정할 수
                  있습니다.
                </p>
              )}
              {owner && r.selectedCandidateId && (
                <Button
                  disabled={action.busy || request.loading}
                  onClick={() => {
                    if (
                      window.confirm(
                        "선택한 후보의 전체 회차를 확정할까요? 서버가 최신 일정과 멤버를 다시 검사합니다.",
                      )
                    )
                      void action.run(async () => {
                        await api(`${base}/confirm`, {});
                        setCandidates(null);
                        await request.reload();
                      });
                  }}
                >
                  전체 회차 확정
                </Button>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
function ConditionsForm({
  initial,
  members,
  save,
}: {
  initial?: Conditions;
  members: Member[];
  save: (conditions: Conditions, markSaved: () => void) => Promise<void>;
}) {
  const action = useAction();
  const [dirty, setDirty] = useState(false);
  const clearDirty = useUnsaved(dirty, action.busy);
  const [conditions, setConditions] = useState<Conditions>(
    initial ?? {
      title: "",
      dateFrom: dateToday(),
      dateTo: dateToday(),
      durationMinutes: 120,
      windows: [{ weekday: 3, start: "18:00", end: "22:00" }],
      attendanceMode: "ALL",
      requiredMemberIds: [],
    },
  );
  const change = (patch: Partial<Conditions>) => {
    setDirty(true);
    setConditions((c) => ({ ...c, ...patch }));
  };
  return (
    <form
      className="card stack"
      style={{ padding: 20 }}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await save(
            {
              ...conditions,
              title: conditions.title.trim(),
              requiredMemberIds:
                conditions.attendanceMode === "ALL"
                  ? []
                  : conditions.requiredMemberIds,
            },
            clearDirty,
          );
          clearDirty();
          setDirty(false);
        });
      }}
    >
      <ErrorNotice message={action.error} />
      <Field label="조율 제목">
        <input
          className="input"
          required
          maxLength={100}
          value={conditions.title}
          onChange={(e) => change({ title: e.target.value })}
        />
      </Field>
      <Field label="기간 시작일">
        <input
          className="input"
          required
          type="date"
          value={conditions.dateFrom}
          onChange={(e) => change({ dateFrom: e.target.value })}
        />
      </Field>
      <Field label="기간 종료일 (포함)">
        <input
          className="input"
          required
          type="date"
          min={conditions.dateFrom}
          value={conditions.dateTo}
          onChange={(e) => change({ dateTo: e.target.value })}
        />
      </Field>
      <Field label="연습 길이 (분)">
        <input
          className="input"
          required
          type="number"
          min={1}
          max={1440}
          value={conditions.durationMinutes}
          onChange={(e) => change({ durationMinutes: Number(e.target.value) })}
        />
      </Field>
      {conditions.windows.map((window, index) => (
        <fieldset className="stack" key={index}>
          <legend>탐색 시간대 {index + 1}</legend>
          <Field label="요일">
            <select
              className="input"
              value={window.weekday}
              onChange={(e) =>
                change({
                  windows: conditions.windows.map((w, i) =>
                    i === index ? { ...w, weekday: Number(e.target.value) } : w,
                  ),
                })
              }
            >
              {["월", "화", "수", "목", "금", "토", "일"].map((day, i) => (
                <option key={day} value={i + 1}>
                  {day}요일
                </option>
              ))}
            </select>
          </Field>
          {(["start", "end"] as const).map((key) => (
            <Field
              key={key}
              label={key === "start" ? "탐색 시작 시각" : "탐색 종료 시각"}
            >
              <input
                className="input"
                type="time"
                required
                value={window[key]}
                onChange={(e) =>
                  change({
                    windows: conditions.windows.map((w, i) =>
                      i === index ? { ...w, [key]: e.target.value } : w,
                    ),
                  })
                }
              />
            </Field>
          ))}
          {conditions.windows.length > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                change({
                  windows: conditions.windows.filter((_, i) => i !== index),
                })
              }
            >
              시간대 제거
            </Button>
          )}
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          change({
            windows: [
              ...conditions.windows,
              { weekday: 5, start: "18:00", end: "22:00" },
            ],
          })
        }
      >
        탐색 시간대 추가
      </Button>
      <Field label="참석 조건">
        <select
          className="input"
          value={conditions.attendanceMode}
          onChange={(e) =>
            change({ attendanceMode: e.target.value as "ALL" | "REQUIRED" })
          }
        >
          <option value="ALL">전원 참석</option>
          <option value="REQUIRED">필수 멤버 참석</option>
        </select>
      </Field>
      {conditions.attendanceMode === "REQUIRED" && (
        <fieldset>
          <legend>필수 멤버 선택</legend>
          {members.map((m) => (
            <label className="row" key={m.membershipId}>
              <input
                type="checkbox"
                checked={conditions.requiredMemberIds.includes(m.membershipId)}
                onChange={(e) =>
                  change({
                    requiredMemberIds: e.target.checked
                      ? [...conditions.requiredMemberIds, m.membershipId]
                      : conditions.requiredMemberIds.filter(
                          (id) => id !== m.membershipId,
                        ),
                  })
                }
              />
              {m.displayName}
            </label>
          ))}
        </fieldset>
      )}
      <Button
        type="submit"
        disabled={
          action.busy ||
          conditions.dateTo < conditions.dateFrom ||
          (conditions.attendanceMode === "REQUIRED" &&
            !conditions.requiredMemberIds.length)
        }
      >
        조율 조건 저장
      </Button>
    </form>
  );
}
