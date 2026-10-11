import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowUpRight, CalendarDays, List, Plus, Video } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { service } from "@/mocks/service";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  EmptyState,
  ErrorNotice,
  Avatar,
} from "@/components/common";
import { MonthView } from "@/features/calendar/MonthView";
export function TeamHomePage() {
  const { teamId } = useParams();
  const location = useLocation();
  const state = useAppStore();
  const navigate = useNavigate();
  const [view, setView] = useState<"month" | "list">("month");
  const [month, setMonth] = useState(new Date(2026, 9, 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    setError("");
    service
      .load()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [teamId]);
  const team = state.teams.find((t) => t.id === teamId);
  const members = state.memberships.filter((m) => m.teamId === teamId);
  const own = members.find((m) => m.userId === state.sessionUserId);
  const occurrences = state.occurrences
    .filter((o) => o.teamId === teamId)
    .sort((a, b) => a.start.localeCompare(b.start));
  if (!team || !own) return <EmptyState title="팀에 접근할 수 없습니다" />;
  const missing = members.filter(
    (m) =>
      !state.calendars.find(
        (c) => c.userId === m.userId && c.confirmed && c.syncState !== "error",
      ),
  ).length;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const upcoming = occurrences.find((o) => o.start.slice(0, 10) >= today);
  const next = upcoming || occurrences.at(-1);
  return (
    <div className="stack">
      <PageHeader
        eyebrow="TEAM WORKSPACE"
        title={team.name}
        description={team.description}
        action={
          <Button onClick={() => navigate(`/teams/${teamId}/scheduling`)}>
            <Plus size={17} /> 일정 조율
          </Button>
        }
      />
      {location.state?.created && (
        <div
          className="card row"
          style={{ justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <div>
            <b>팀이 만들어졌어요!</b>
            <p className="muted">
              함께할 멤버를 초대하고 첫 연습을 준비해 보세요.
            </p>
          </div>
          <Button onClick={() => navigate(`/teams/${teamId}/members`)}>
            팀원 초대하기
          </Button>
        </div>
      )}
      <div className="row" style={{ flexWrap: "wrap" }}>
        <span className="badge">
          {own.role === "admin" ? "관리자" : "멤버"}
        </span>
        <div className="row">
          {members.map((m) => (
            <Avatar
              key={m.userId}
              user={state.users.find((u) => u.id === m.userId)}
              size={30}
            />
          ))}
        </div>
        <Link className="muted" to={`/teams/${teamId}/members`}>
          멤버 {members.length}명{" "}
          <ArrowUpRight size={13} style={{ display: "inline" }} />
        </Link>
      </div>
      <div className="page-grid">
        <section
          className="card"
          style={{ background: "#254734", color: "#fff" }}
        >
          <span style={{ fontSize: 12, opacity: 0.65 }}>
            {upcoming
              ? "함께 만드는 다음 장면"
              : next
                ? "최근 연습 기록"
                : "함께 만드는 첫 장면"}
          </span>
          <h2 style={{ fontSize: 25, margin: "12px 0" }}>
            {next?.title || "첫 연습을 준비해 볼까요?"}
          </h2>
          <p style={{ opacity: 0.8 }}>
            {next
              ? `${next.start.slice(0, 10)} · ${next.start.slice(11, 16)} – ${next.end.slice(11, 16)}`
              : "모두가 만날 수 있는 시간을 찾아보세요."}
          </p>
          <Button
            variant="outline"
            style={{ marginTop: 16, color: "#254734" }}
            onClick={() =>
              navigate(
                next
                  ? `/teams/${teamId}/occurrences/${next.id}`
                  : `/teams/${teamId}/scheduling`,
              )
            }
          >
            {next ? "연습 기록 보기" : "일정 조율 시작"}{" "}
            <ArrowUpRight size={16} />
          </Button>
        </section>
        <section className="card stack">
          <span className="muted">일정 준비 상태</span>
          <h2 className="section-title">
            {missing
              ? `${missing}명 일정 확인 필요`
              : "모두의 일정이 준비되었어요"}
          </h2>
          <p className="muted">
            개인 일정의 제목은 공유되지 않아요. 가능한 시간만 함께 확인합니다.
          </p>
          <div className="row">
            <Link to="/calendar">내 일정 관리 →</Link>
            <Link to={`/teams/${teamId}/members`}>멤버 보기 →</Link>
          </div>
        </section>
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 className="section-title">
          팀 일정 <span className="muted">{occurrences.length}</span>
        </h2>
        <div className="row">
          <Button
            variant={view === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("month")}
          >
            <CalendarDays size={16} />
            달력
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List size={16} />
            목록
          </Button>
        </div>
      </div>
      {error ? (
        <>
          <ErrorNotice message={error} />
          <Button variant="outline" onClick={load}>
            다시 불러오기
          </Button>
        </>
      ) : loading ? (
        <div className="card" role="status">
          일정을 불러오는 중…
        </div>
      ) : occurrences.length === 0 ? (
        <EmptyState
          title="첫 연습 일정을 정해보세요"
          description="조건을 입력하면 모두가 가능한 시간을 찾아드려요."
          action={
            <Button onClick={() => navigate(`/teams/${teamId}/scheduling`)}>
              일정 조율
            </Button>
          }
        />
      ) : view === "month" ? (
        <MonthView
          month={month}
          onMonth={setMonth}
          items={occurrences.map((o) => ({
            ...o,
            detail: `가능 ${o.attendance.filter((a) => a.status === "available").length}명 · 영상 ${state.videos.filter((v) => v.occurrenceId === o.id).length}`,
          }))}
          onSelect={(id) => navigate(`/teams/${teamId}/occurrences/${id}`)}
        />
      ) : (
        <div className="stack">
          {occurrences.map((o) => (
            <Link
              className="card row"
              style={{ justifyContent: "space-between", flexWrap: "wrap" }}
              key={o.id}
              to={`/teams/${teamId}/occurrences/${o.id}`}
            >
              <div>
                <span className="muted">
                  {o.start.slice(0, 10)} · {o.start.slice(11, 16)}
                </span>
                <h3>{o.title}</h3>
                <span className="muted">
                  참석 가능{" "}
                  {o.attendance.filter((a) => a.status === "available").length}
                  명 · {o.index}/{o.total}회차
                </span>
              </div>
              <span className="badge">
                <Video size={14} /> 영상{" "}
                {state.videos.filter((v) => v.occurrenceId === o.id).length}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
