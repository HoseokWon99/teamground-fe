import { useUnsavedActions } from "@/app/unsaved-changes";
import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  CalendarDays,
  Grid2X2,
  Menu,
  Sprout,
  Users,
  UserRound,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { LegalFooter } from "@/components/LegalFooter";
import {
  useResource,
  LoadState,
  useUnsaved,
} from "@/features/server-workspace/shared";
import { Button } from "@/components/ui/button";
import { ErrorNotice, PageHeader } from "@/components/common";
import {
  api,
  ApiError,
  explainError,
  safeReturnTo,
  type Teamspace,
} from "./api";
import { useSession } from "./session";
export function ServerGuard() {
  const { profile, loading, error, refresh } = useSession();
  const location = useLocation();
  if (loading)
    return (
      <p className="loading" role="status">
        로그인을 확인하는 중…
      </p>
    );
  if (error)
    return (
      <main className="auth-container">
        <ErrorNotice message={error} />
        <Button onClick={() => void refresh()}>다시 확인</Button>
      </main>
    );
  return profile ? (
    <Outlet />
  ) : (
    <Navigate
      to={`/login?returnTo=${encodeURIComponent(safeReturnTo(location.pathname))}`}
      replace
    />
  );
}
export function ServerLayout() {
  const { profile, setProfile } = useSession();
  const { runAfterDiscard } = useUnsavedActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const teams = useResource<Teamspace[]>("/teamspaces");
  const teamId = location.pathname.match(/^\/teams\/([^/]+)/)?.[1];
  const team = teams.data?.find((t) => t.id === teamId);
  useEffect(() => {
    void teams.reload();
  }, [location.pathname]);
  const navigation = (
    <nav aria-label="작업 공간 메뉴" className="workspace-navigation">
      <Link to="/teams" className="brand" onClick={() => setOpen(false)}>
        <span className="brand-mark">
          <Sprout size={21} />
        </span>
        teamground.
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
            to={`/teams/${team.id}`}
            end
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
      <NavLink
        to="/account"
        className="nav-item"
        onClick={() => setOpen(false)}
      >
        <UserRound size={18} />내 계정
      </NavLink>
      <div className="sidebar-bottom">
        <p className="sidebar-note">
          함께 만드는 다음 장면
          <br />
          흩어진 시간을 모으고 우리의 연습을 기록해요.
        </p>
      </div>
    </nav>
  );
  return (
    <>
      <a href="#main-content" className="skip-link">
        본문으로 건너뛰기
      </a>
      <aside className="sidebar">{navigation}</aside>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="작업 공간 메뉴"
        id="mobile-navigation"
      >
        {navigation}
      </Modal>
      <div className="workspace server-workspace">
        <header className="topbar">
          <div className="row">
            <Button
              className="mobile-menu"
              variant="ghost"
              size="icon"
              aria-label="메뉴 열기"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </Button>
            <select
              aria-label="팀 전환"
              value={team?.id ?? ""}
              onChange={(e) =>
                navigate(e.target.value ? `/teams/${e.target.value}` : "/teams")
              }
            >
              <option value="">내 작업 공간</option>
              {teams.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="topbar-right">
            <Link to="/account" className="user-name">
              {profile?.displayName}
            </Link>
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await runAfterDiscard(async () => {
                    await api("/auth/logout", {});
                    setProfile(null);
                  }, "/login");
                } catch (e) {
                  setError(explainError(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "로그아웃 중…" : "로그아웃"}
            </Button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="main-content stack">
          <ErrorNotice message={error} />
          {teams.error && <LoadState resource={teams} />}
          <Outlet />
        </main>
        <LegalFooter />
      </div>
    </>
  );
}
export function ServerTeams() {
  const { profile, setProfile } = useSession();
  const [teams, setTeams] = useState<Teamspace[] | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setTeams(null);
    setError("");
    api<Teamspace[]>("/teamspaces")
      .then((data) => {
        if (active) setTeams(data);
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) setProfile(null);
        else setError(explainError(e));
      });
    return () => {
      active = false;
    };
  }, [revision, setProfile]);
  return (
    <>
      <PageHeader
        title="내 팀"
        description={`${profile?.displayName ?? ""}님, 함께 연습할 팀을 선택하세요.`}
        action={
          <Button asChild>
            <Link to="/teams/new">팀 만들기</Link>
          </Button>
        }
      />
      <ErrorNotice message={error} />
      {error && (
        <Button onClick={() => setRevision((r) => r + 1)}>다시 불러오기</Button>
      )}
      {!teams && !error && <p role="status">팀을 불러오는 중…</p>}
      {teams?.length === 0 && (
        <p>참여 중인 팀이 없습니다. 첫 팀을 만들어 보세요.</p>
      )}
      {teams?.map((team) => (
        <article key={team.id} className="card stack" style={{ padding: 20 }}>
          <h2>
            <Link to={`/teams/${team.id}`}>{team.name}</Link>
          </h2>
          <span>{team.role === "OWNER" ? "관리자" : "멤버"}</span>
          <p>{team.description}</p>
        </article>
      ))}
      <section className="card stack" style={{ padding: 24 }}>
        <h2>사용 가능한 기능</h2>
        <p>
          팀 상세에서 멤버 관리, 일정 조율, 회차별 영상과 피드백을 사용할 수
          있습니다. 먼저 개인 일정을 입력하고 기간을 확인해 주세요.
        </p>
        <p>
          {profile?.authMethod === "EMAIL"
            ? "이메일 계정은 Google 캘린더를 연결할 수 없습니다. Google 로그인 계정만 연결할 수 있으며, 로그인 수단 연결은 아직 지원하지 않습니다."
            : "Google 캘린더는 로그인과 별도 동의가 필요합니다. 내 개인 일정 화면에서 연결할 수 있습니다."}
        </p>
      </section>
    </>
  );
}
export function UnavailablePage() {
  return (
    <section className="card stack" style={{ padding: 24 }}>
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>주소를 확인하거나 내 팀 목록으로 돌아가 주세요.</p>
      <Link to="/teams">내 팀 목록으로 이동</Link>
    </section>
  );
}

export function NewTeamPage() {
  const navigate = useNavigate();
  const { setProfile } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const clearDirty = useUnsaved(Boolean(name || description), busy);
  return (
    <>
      <PageHeader
        title="팀 만들기"
        description="새로운 팀의 첫 연습을 준비해 보세요."
      />
      <Link to="/teams">내 팀 목록으로</Link>
      <ErrorNotice message={error} />
      <section className="card stack" style={{ padding: 24 }}>
        <h2>팀 만들기</h2>
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              const team = await api<Teamspace>("/teamspaces", {
                name: name.trim(),
                description: description.trim() || null,
              });
              clearDirty();
              navigate(`/teams/${team.id}`);
            } catch (e) {
              if (e instanceof ApiError && e.status === 401) setProfile(null);
              else setError(explainError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="team-name">팀 이름</label>
          <input
            className="input"
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
            pattern=".*\S.*"
          />
          <label htmlFor="team-description">팀 설명 (선택)</label>
          <textarea
            className="input"
            id="team-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "만드는 중…" : "팀 만들기"}
          </Button>
        </form>
      </section>
    </>
  );
}
