import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Users, Grid2X2, Sprout, LogOut, Menu, SlidersHorizontal } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { Modal } from "@/components/ui/modal";
import { StorageNotice } from "@/components/StorageNotice";
import { Button } from "@/components/ui/button";
import { Avatar, ErrorNotice } from "@/components/common";
import { useUnsavedActions } from "./unsaved-changes";
const DemoToolsContent = lazy(() => import("./DemoToolsContent"));
class DemoToolsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <ErrorNotice message="데모 도구를 불러오지 못했습니다. 입력 중인 내용을 저장한 후 새로고침해 주세요." />
      : this.props.children;
  }
}
export default function WorkspaceLayout() {
  const { runAfterDiscard } = useUnsavedActions();
  const state = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [demoLoaded, setDemoLoaded] = useState(false);
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
  useEffect(() => {
    const media = window.matchMedia("(min-width: 761px)");
    const closeOnDesktop = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);
  const navigation = (
    <nav aria-label="작업 공간 메뉴" className="workspace-navigation">
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
              await runAfterDiscard(async () => (await import("@/mocks/service")).service.logout(), "/login");
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          <LogOut size={15} />
          로그아웃
        </Button>
      </div>
    </nav>
  );
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        본문으로 건너뛰기
      </a>
      <aside className="sidebar">{navigation}</aside>
      <Modal
        id="mobile-navigation"
        open={open}
        onOpenChange={setOpen}
        title="작업 공간 메뉴"
      >
        {navigation}
      </Modal>
      <div className="workspace">
        <header className="topbar">
          <div className="row">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="메뉴 열기"
              aria-expanded={open}
              aria-controls="mobile-navigation"
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
        </header>
        <main id="main-content" tabIndex={-1} className="main-content">
          <StorageNotice />
          <ErrorNotice message={error} />
          <Outlet />
          <details className="demo-tools" onToggle={(event) => { if (event.currentTarget.open) setDemoLoaded(true); }}>
            <summary><SlidersHorizontal size={13} style={{ display: "inline", marginRight: 6 }} /> 발표용 데모 도구</summary>
            {demoLoaded && <DemoToolsBoundary><Suspense fallback={<p role="status">데모 도구를 준비하는 중…</p>}><DemoToolsContent /></Suspense></DemoToolsBoundary>}
          </details>
        </main>
      </div>
    </>
  );
}
