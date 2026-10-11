import { useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { service } from "@/mocks/service";
import { exampleDraft } from "@/mocks/seed";
import type { Candidate, Draft } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PageHeader, EmptyState, ErrorNotice } from "@/components/common";
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const schema = z
  .object({
    teamId: z.string(),
    title: z
      .string()
      .trim()
      .min(1, "일정 제목을 입력해 주세요")
      .max(100, "100자 이내로 입력해 주세요"),
    from: z.string().min(1, "시작일을 선택해 주세요"),
    to: z.string().min(1, "종료일을 선택해 주세요"),
    duration: z
      .number()
      .min(30, "최소 30분입니다")
      .max(240, "최대 4시간입니다")
      .multipleOf(30, "30분 단위로 선택해 주세요"),
    weekdays: z.array(z.number()).min(1, "요일을 하나 이상 선택해 주세요"),
    startTime: z.string().min(1, "시작 시간을 선택해 주세요"),
    endTime: z.string().min(1, "종료 시간을 선택해 주세요"),
    mode: z.enum(["all", "required"]),
    requiredIds: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    if (
      v.from &&
      v.to &&
      differenceInCalendarDays(parseISO(v.to), parseISO(v.from)) > 55
    )
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "탐색 기간은 최대 8주입니다",
      });
    if (v.to < v.from)
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "종료일은 시작일 이후여야 합니다",
      });
    if (minutes(v.endTime) - minutes(v.startTime) < v.duration)
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "탐색 시간대에 모임 길이가 들어가야 합니다",
      });
    if (v.mode === "required" && !v.requiredIds.length)
      ctx.addIssue({
        code: "custom",
        path: ["requiredIds"],
        message: "필수 멤버를 한 명 이상 선택해 주세요",
      });
  });
export function SchedulingPage() {
  const { teamId = "" } = useParams();
  const state = useAppStore();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const form = useForm<Draft>({
    resolver: zodResolver(schema),
    defaultValues: state.drafts[teamId] || {
      teamId,
      title: "",
      from: "",
      to: "",
      duration: 120,
      weekdays: [],
      startTime: "18:00",
      endTime: "22:00",
      mode: "all",
      requiredIds: [],
    },
  });
  const values = form.watch();
  const members = state.memberships.filter((m) => m.teamId === teamId);
  const missing = members.filter(
    (m) =>
      !state.calendars.some(
        (c) => c.userId === m.userId && c.confirmed && c.syncState !== "error",
      ),
  );
  const err = (key: keyof Draft) =>
    form.formState.errors[key]?.message as string | undefined;
  const submit = form.handleSubmit(async (draft) => {
    setBusy(true);
    setError("");
    try {
      await service.saveDraft(draft);
      await service.recommend(draft);
      navigate(`/teams/${teamId}/scheduling/results`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  });
  return (
    <div className="stack">
      <Link
        className="muted"
        to={`/teams/${teamId}`}
        onClick={(e) => {
          if (
            form.formState.isDirty &&
            !window.confirm("아직 저장하지 않은 조율 조건을 버릴까요?")
          )
            e.preventDefault();
        }}
      >
        ← 팀 일정
      </Link>
      <PageHeader
        eyebrow="FIND OUR TIME"
        title="우리의 시간을 맞춰볼까요?"
        description="모임 조건을 알려주시면, 모든 회차에서 가능한 시간을 찾아드려요."
        action={
          <Button
            variant="outline"
            onClick={() => form.reset(exampleDraft(teamId))}
          >
            <Sparkles size={16} />
            발표 예시 채우기
          </Button>
        }
      />
      {missing.length > 0 && (
        <div className="card">
          <p>
            <b>
              {missing
                .map((m) => state.users.find((u) => u.id === m.userId)?.name)
                .join(", ")}
            </b>
            님의 일정 확인이 필요합니다.
          </p>
          <div className="row">
            <Link to="/calendar">내 일정 확인 →</Link>
            <Link to={`/teams/${teamId}/members`}>팀 멤버 →</Link>
          </div>
        </div>
      )}
      <form className="stack" onSubmit={submit}>
        <section className="card stack">
          <span className="badge">01 · 모임 설정</span>
          <label className="field">
            일정 제목
            <input
              className="input"
              placeholder="예: 장면 리허설"
              {...form.register("title")}
            />
            <span className="field-error">{err("title")}</span>
          </label>
          <div className="page-grid">
            <label className="field">
              반복 주기
              <select className="select" aria-label="반복 주기">
                <option>매주</option>
              </select>
            </label>
            <label className="field">
              모임 길이
              <select
                className="select"
                {...form.register("duration", { valueAsNumber: true })}
              >
                {[30, 60, 90, 120, 150, 180, 210, 240].map((n) => (
                  <option value={n} key={n}>
                    {n % 60 === 0 ? `${n / 60}시간` : `${n}분`}
                  </option>
                ))}
              </select>
              <span className="field-error">{err("duration")}</span>
            </label>
          </div>
        </section>
        <section className="card stack">
          <span className="badge">02 · 가능한 날짜와 시간</span>
          <div className="page-grid">
            <label className="field">
              시작일
              <input className="input" type="date" {...form.register("from")} />
              <span className="field-error">{err("from")}</span>
            </label>
            <label className="field">
              종료일
              <input className="input" type="date" {...form.register("to")} />
              <span className="field-error">{err("to")}</span>
            </label>
          </div>
          <div className="field">
            탐색 요일
            <div className="row" style={{ flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <label
                  key={day}
                  className="badge"
                  style={{
                    padding: "10px 14px",
                    background: values.weekdays.includes(day)
                      ? "#dfeada"
                      : undefined,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={values.weekdays.includes(day)}
                    onChange={(e) =>
                      form.setValue(
                        "weekdays",
                        e.target.checked
                          ? [...values.weekdays, day]
                          : values.weekdays.filter((d) => d !== day),
                        { shouldValidate: true, shouldDirty: true },
                      )
                    }
                  />
                  {weekdays[day]}
                </label>
              ))}
            </div>
            <span className="field-error">{err("weekdays")}</span>
          </div>
          <div className="page-grid">
            <label className="field">
              시작 시간
              <input
                className="input"
                type="time"
                step="1800"
                {...form.register("startTime")}
              />
              <span className="field-error">{err("startTime")}</span>
            </label>
            <label className="field">
              종료 시간
              <input
                className="input"
                type="time"
                step="1800"
                {...form.register("endTime")}
              />
              <span className="field-error">{err("endTime")}</span>
            </label>
          </div>
          <p className="muted">
            모든 시간은 대한민국 표준시(Asia/Seoul)를 기준으로 합니다.
          </p>
        </section>
        <section className="card stack">
          <span className="badge">03 · 함께해야 하는 멤버</span>
          <label className="row">
            <input type="radio" value="all" {...form.register("mode")} />
            <span>
              <b>전원 참석 가능</b>
              <br />
              <small className="muted">
                모든 멤버가 모든 회차에 가능한 시간을 찾아요.
              </small>
            </span>
          </label>
          <label className="row">
            <input type="radio" value="required" {...form.register("mode")} />
            <span>
              <b>필수 멤버 지정</b>
              <br />
              <small className="muted">
                선택한 멤버의 모든 회차 참석 가능 여부를 확인해요.
              </small>
            </span>
          </label>
          {values.mode === "required" && (
            <div className="row" style={{ flexWrap: "wrap" }}>
              {members.map((m) => (
                <label className="badge" key={m.userId}>
                  <input
                    type="checkbox"
                    checked={values.requiredIds.includes(m.userId)}
                    onChange={(e) =>
                      form.setValue(
                        "requiredIds",
                        e.target.checked
                          ? [...values.requiredIds, m.userId]
                          : values.requiredIds.filter((id) => id !== m.userId),
                        { shouldValidate: true, shouldDirty: true },
                      )
                    }
                  />
                  {state.users.find((u) => u.id === m.userId)?.name}
                </label>
              ))}
            </div>
          )}
          <span className="field-error">{err("requiredIds")}</span>
        </section>
        {error && <ErrorNotice message={error} />}
        <div
          className="row"
          style={{ justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <p className="muted">확정 전까지 팀 일정은 변경되지 않습니다.</p>
          <Button type="submit" disabled={busy}>
            {busy ? "가능한 시간 찾는 중…" : "추천 시간 찾기"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
}
export function ResultsPage() {
  const { teamId = "" } = useParams();
  const state = useAppStore();
  const navigate = useNavigate();
  const result = state.recommendations[teamId];
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const admin = state.memberships.some(
    (m) =>
      m.teamId === teamId &&
      m.userId === state.sessionUserId &&
      m.role === "admin",
  );
  if (!result)
    return (
      <EmptyState
        title="먼저 조율 조건을 입력해 주세요"
        description="추천할 기간과 멤버를 정하면 시간을 찾아드려요."
        action={
          <Button onClick={() => navigate(`/teams/${teamId}/scheduling`)}>
            조건 입력하기
          </Button>
        }
      />
    );
  const { draft } = result;
  const stale = result.revision !== state.revision;
  const names = (ids: string[]) =>
    ids
      .map((id) => state.users.find((u) => u.id === id)?.name || "멤버")
      .join(", ");
  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      await service.recommend(draft);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const first = await service.confirmCandidate(teamId, selected.id);
      navigate(`/teams/${teamId}/occurrences/${first.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack">
      <PageHeader
        eyebrow="OUR NEXT REHEARSAL"
        title="함께할 수 있는 시간"
        description="같은 요일, 같은 시간. 모든 회차의 일정을 확인했어요."
        action={
          <Button
            variant="outline"
            onClick={() => navigate(`/teams/${teamId}/scheduling`)}
          >
            조건 수정
          </Button>
        }
      />
      <section className="card stack">
        <h2 className="section-title">{draft.title}</h2>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <span className="badge">
            {draft.from} ~ {draft.to}
          </span>
          <span className="badge">
            매주 {draft.weekdays.map((d) => weekdays[d]).join("·")}요일
          </span>
          <span className="badge">
            {draft.duration}분 · {draft.startTime}–{draft.endTime}
          </span>
          <span className="badge">
            {draft.mode === "all"
              ? "전원 참석 가능"
              : `필수: ${names(draft.requiredIds)}`}
          </span>
        </div>
        <p className="muted">
          Asia/Seoul · 추천 기준{" "}
          {new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(result.createdAt))}
        </p>
      </section>
      {stale && (
        <div className="card stack">
          <ErrorNotice message="일정 또는 멤버 정보가 변경되었습니다. 확정하려면 추천을 다시 조회해 주세요." />
          <Button disabled={busy} onClick={refresh}>
            {busy ? "조회 중…" : "최신 정보로 다시 조회"}
          </Button>
        </div>
      )}
      {error && <ErrorNotice message={error} />}
      {result.missingIds.length > 0 ? (
        <EmptyState
          title="일정을 확인할 멤버가 있습니다"
          description={`${names(result.missingIds)}님의 일정 입력 완료 여부와 확인 기간을 확인해 주세요. 확인되지 않은 시간은 참석 가능으로 처리하지 않습니다.`}
          action={
            <div className="row">
              <Button variant="outline" onClick={() => navigate("/calendar")}>
                내 일정 확인
              </Button>
              <Button disabled={busy} onClick={refresh}>
                다시 조회
              </Button>
            </div>
          }
        />
      ) : result.candidates.length === 0 ? (
        <EmptyState
          title="현재 조건을 만족하는 시간이 없습니다"
          description="모든 회차의 조건을 충족하는 후보가 없어요. 탐색 기간이나 시간대, 참석 조건을 직접 수정해 주세요."
          action={
            <Button onClick={() => navigate(`/teams/${teamId}/scheduling`)}>
              조건 수정
            </Button>
          }
        />
      ) : (
        <>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 className="section-title">
              추천 후보 {result.candidates.length}개
            </h2>
            <span className="muted">모든 회차 확인 완료</span>
          </div>
          {result.candidates.map((candidate, i) => (
            <article
              className="card stack"
              key={candidate.id}
              style={{ border: i === 0 ? "1px solid #739369" : undefined }}
            >
              <div
                className="row"
                style={{ justifyContent: "space-between", flexWrap: "wrap" }}
              >
                <div>
                  <span className="badge">
                    <Check size={13} />
                    필수 조건 충족
                  </span>
                  <h2 style={{ fontSize: 26, marginTop: 12 }}>
                    매주 {weekdays[candidate.weekday]}요일{" "}
                    <span style={{ fontWeight: 400 }}>
                      {candidate.startTime}–{candidate.endTime}
                    </span>
                  </h2>
                  <p className="muted">
                    {candidate.dates.length}회 연습 · {candidate.dates[0]}부터
                  </p>
                </div>
                {admin ? (
                  <Button
                    disabled={busy || stale}
                    onClick={() => {
                      setError("");
                      setSelected(candidate);
                    }}
                  >
                    이 시간으로 확정
                    <ArrowRight size={16} />
                  </Button>
                ) : (
                  <span className="badge">
                    관리자가 일정을 확정할 수 있어요
                  </span>
                )}
              </div>
              <details open={i === 0}>
                <summary style={{ cursor: "pointer", padding: "12px 0" }}>
                  회차별 참석 가능 멤버 확인
                </summary>
                <div className="stack">
                  {candidate.dates.map((date, index) => (
                    <div
                      key={date}
                      className="row"
                      style={{
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        padding: "12px 0",
                        borderTop: "1px solid #eceee7",
                      }}
                    >
                      <b>
                        {index + 1}회차 · {date}
                      </b>
                      <div className="row" style={{ flexWrap: "wrap" }}>
                        {candidate.attendance[index].map((a) => (
                          <span key={a.userId} className="badge">
                            {names([a.userId])} ·{" "}
                            {a.status === "available"
                              ? "가능"
                              : a.status === "busy"
                                ? "불가"
                                : "확인 필요"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </article>
          ))}
        </>
      )}
      <p className="muted">
        참석 가능 여부는 개인 일정 충돌을 기준으로 계산한 결과이며, 실제 참석
        응답이 아닙니다.
      </p>
      <Modal
        open={!!selected}
        onOpenChange={(v) => {
          if (!v && !busy) setSelected(null);
        }}
        title="이 시간으로 연습을 확정할까요?"
        description="아래 전체 회차가 한 번에 팀 일정에 추가됩니다."
      >
        <div className="stack">
          <h3>{draft.title}</h3>
          <p>
            매주 {selected && weekdays[selected.weekday]}요일 ·{" "}
            {selected?.startTime}–{selected?.endTime} · Asia/Seoul
          </p>
          <div className="stack">
            {selected?.dates.map((date, i) => (
              <div className="badge" key={date}>
                {i + 1}회차 · {date}
              </div>
            ))}
          </div>
          {error && <ErrorNotice message={error} />}
          <Button disabled={busy || stale} onClick={confirm}>
            {busy ? "확정 중…" : `${selected?.dates.length}개 회차 확정`}
          </Button>
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => setSelected(null)}
          >
            돌아가기
          </Button>
        </div>
      </Modal>
    </div>
  );
}
