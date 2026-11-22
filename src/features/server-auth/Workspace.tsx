import { useUnsavedActions } from "@/app/unsaved-changes";
import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
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
  return (
    <main
      style={{ maxWidth: 1040, margin: "auto", padding: 24 }}
      className="stack"
    >
      <header
        className="row"
        style={{ justifyContent: "space-between", flexWrap: "wrap" }}
      >
        <Link to="/teams">TEAMGROUND · 내 팀</Link>
        <Link to="/calendar">내 개인 일정</Link>
        <span>
          {profile?.displayName} ·{" "}
          {profile?.authMethod === "EMAIL" ? "이메일 계정" : "Google 계정"}
        </span>
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
      </header>
      <ErrorNotice message={error} />
      <Outlet />
    </main>
  );
}
export function ServerTeams() {
  const { profile, setProfile } = useSession();
  const [teams, setTeams] = useState<Teamspace[] | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
        description={`${profile?.verifiedEmail ?? ""} 계정의 팀스페이스입니다.`}
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
        <h2>팀 만들기</h2>
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              await api<Teamspace>("/teamspaces", {
                name: name.trim(),
                description: description.trim() || null,
              });
              setName("");
              setDescription("");
              setRevision((r) => r + 1);
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
      <h1>이 화면은 서버 연결을 준비 중입니다</h1>
      <p>내 팀 목록에서 팀을 선택해 계속해 주세요.</p>
      <Link to="/teams">내 팀 목록으로 이동</Link>
    </section>
  );
}
