import { Component, Suspense, lazy, type ReactNode, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  NavLink,
  Link,
} from "react-router-dom";
import {
  CalendarDays,
  Users,
  Grid2X2,
  Sprout,
  ArrowUpRight,
  LogOut,
  Menu,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { useAppStore, storageWarning } from "@/stores/app-store";
import { service } from "@/mocks/service";
import { Button } from "@/components/ui/button";
import { Avatar, EmptyState, ErrorNotice } from "@/components/common";
const LoginPage = lazy(() =>
  import("@/features/auth/pages").then((m) => ({ default: m.LoginPage })),
);
const InvitePage = lazy(() =>
  import("@/features/auth/pages").then((m) => ({ default: m.InvitePage })),
);
const TeamListPage = lazy(() =>
  import("@/features/teams/pages").then((m) => ({ default: m.TeamListPage })),
);
const CreateTeamPage = lazy(() =>
  import("@/features/teams/pages").then((m) => ({ default: m.CreateTeamPage })),
);
const MembersPage = lazy(() =>
  import("@/features/teams/pages").then((m) => ({ default: m.MembersPage })),
);
const TeamHomePage = lazy(() =>
  import("@/features/teams/TeamHome").then((m) => ({
    default: m.TeamHomePage,
  })),
);
const CalendarPage = lazy(() =>
  import("@/features/calendar/pages").then((m) => ({
    default: m.CalendarPage,
  })),
);
const SchedulingPage = lazy(() =>
  import("@/features/scheduling/pages").then((m) => ({
    default: m.SchedulingPage,
  })),
);
const ResultsPage = lazy(() =>
  import("@/features/scheduling/pages").then((m) => ({
    default: m.ResultsPage,
  })),
);
const OccurrencePage = lazy(() =>
  import("@/features/videos/pages").then((m) => ({
    default: m.OccurrencePage,
  })),
);
const VideoPage = lazy(() =>
  import("@/features/videos/pages").then((m) => ({ default: m.VideoPage })),
);
function AuthGuard() {
  const userId = useAppStore((s) => s.sessionUserId);
  const location = useLocation();
  return userId ? (
    <Outlet />
  ) : (
    <Navigate
      to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
      replace
    />
  );
}
function TeamGuard() {
  const { teamId } = useParams();
  const allowed = useAppStore((s) =>
    s.memberships.some(
      (m) => m.userId === s.sessionUserId && m.teamId === teamId,
    ),
  );
  return allowed ? (
    <Outlet />
  ) : (
    <EmptyState
      title="이 팀에 접근할 수 없습니다"
      description="참여 중인 팀을 선택해 주세요."
      action={
        <Button asChild>
          <Link to="/teams">내 팀 목록</Link>
        </Button>
      }
    />
  );
}
function DemoTools() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function run(fn: () => unknown) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="demo-tools">
      <summary>
        <SlidersHorizontal
          size={13}
          style={{ display: "inline", marginRight: 6 }}
        />{" "}
        발표용 데모 도구
      </summary>
      <div className="row">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            if (
              confirm(
                "팀, 일정, 댓글을 발표 기본 상태로 초기화합니다. 계속할까요?",
              )
            )
              void run(async () => {
                await service.reset();
                navigate("/login");
              });
          }}
        >
          <RotateCcw size={13} />
          데모 초기화
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`)
          }
        >
          계정 전환
        </Button>
        {(["missing", "none", "changed"] as const).map((s, i) => (
          <Button
            key={s}
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (
                confirm("추천에 사용하는 일정 데이터가 변경됩니다. 계속할까요?")
              )
                void run(() => service.setScenario(s));
            }}
          >
            {["일정 미확인", "후보 없음", "확정 전 변경"][i]}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void run(() => service.failNext())}
        >
          다음 요청 실패
        </Button>
      </div>
      <ErrorNotice message={error} />
      <p style={{ marginTop: 10 }}>
        시나리오를 변경한 뒤 기본 시연으로 돌아가려면 데모를 초기화하세요.
      </p>
    </details>
  );
}
function Layout() {
  const state = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const teamId = location.pathname.match(/^\/teams\/([^/]+)/)?.[1];
  const teams = state.teams.filter((t) =>
    state.memberships.some(
      (m) => m.teamId === t.id && m.userId === state.sessionUserId,
    ),
  );
  const team = teams.find((t) => t.id === teamId);
  const user = state.users.find((u) => u.id === state.sessionUserId);
  const role = state.memberships.find(
    (m) => m.teamId === teamId && m.userId === state.sessionUserId,
  )?.role;
  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link className="brand" to="/teams" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            <Sprout size={21} />
          </span>
          teamground<span style={{ color: "#acb88d" }}>.</span>
        </Link>
        <p className="sidebar-section">WORKSPACE</p>
        <NavLink
          to="/teams"
          end
          className="nav-item"
          onClick={() => setOpen(false)}
        >
          <Grid2X2 size={18} />내 팀 목록
        </NavLink>
        {team && (
          <>
            <NavLink
              end
              to={`/teams/${team.id}`}
              className="nav-item"
              onClick={() => setOpen(false)}
            >
              <CalendarDays size={18} />팀 일정
            </NavLink>
            <NavLink
              to={`/teams/${team.id}/members`}
              className="nav-item"
              onClick={() => setOpen(false)}
            >
              <Users size={18} />팀 멤버
            </NavLink>
          </>
        )}
        <p className="sidebar-section">PERSONAL</p>
        <NavLink
          to="/calendar"
          className="nav-item"
          onClick={() => setOpen(false)}
        >
          <CalendarDays size={18} />내 일정
        </NavLink>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <strong>함께 만드는 다음 장면</strong>흩어진 시간을 모으고,
            <br />
            우리의 연습을 기록해요.
            <Sprout size={27} style={{ marginTop: 16, color: "#8ea772" }} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await service.logout();
                navigate("/login");
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            <LogOut size={15} />
            로그아웃
          </Button>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <div className="row">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="메뉴 열기"
              onClick={() => setOpen(!open)}
            >
              <Menu size={20} />
            </Button>
            <select
              aria-label="팀 전환"
              value={team?.id || ""}
              onChange={(e) =>
                navigate(e.target.value ? `/teams/${e.target.value}` : "/teams")
              }
            >
              <option value="">내 작업 공간</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {team && (
              <span className="badge">
                {role === "admin" ? "관리자" : "멤버"}
              </span>
            )}
          </div>
          <div className="topbar-right">
            <span className="demo-label">DEMO · 이 브라우저에 저장됩니다</span>
            <span className="user-name">{user?.name}</span>
            <Avatar user={user} />
          </div>
        </div>
        <main className="main-content">
          <ErrorNotice message={error} />
          {storageWarning && (
            <div className="success-notice" role="status">
              {storageWarning}
            </div>
          )}
          <Outlet />
          <DemoTools />
        </main>
      </div>
    </>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="auth-container">
        <EmptyState
          title="화면을 불러오지 못했습니다"
          description="저장된 데이터는 유지됩니다. 새로고침 후 다시 시도해 주세요."
          action={
            <Button onClick={() => window.location.reload()}>새로고침</Button>
          }
        />
      </div>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div className="loading">화면을 준비하는 중…</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invite/:token" element={<InvitePage />} />
            <Route element={<AuthGuard />}>
              <Route element={<Layout />}>
                <Route path="/teams" element={<TeamListPage />} />
                <Route path="/teams/new" element={<CreateTeamPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/teams/:teamId" element={<TeamGuard />}>
                  <Route index element={<TeamHomePage />} />
                  <Route path="members" element={<MembersPage />} />
                  <Route path="scheduling" element={<SchedulingPage />} />
                  <Route path="scheduling/results" element={<ResultsPage />} />
                  <Route
                    path="occurrences/:occurrenceId"
                    element={<OccurrencePage />}
                  />
                  <Route
                    path="occurrences/:occurrenceId/videos/:videoId"
                    element={<VideoPage />}
                  />
                </Route>
                <Route
                  path="*"
                  element={
                    <EmptyState
                      title="페이지를 찾을 수 없습니다"
                      action={
                        <Button asChild>
                          <Link to="/teams">
                            팀으로 돌아가기
                            <ArrowUpRight size={16} />
                          </Link>
                        </Button>
                      }
                    />
                  }
                />
              </Route>
            </Route>
            <Route path="/" element={<Navigate to="/teams" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
