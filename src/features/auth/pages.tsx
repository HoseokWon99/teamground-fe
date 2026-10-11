import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Clapperboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { service } from "@/mocks/service";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  EmptyState,
  ErrorNotice,
  PageHeader,
} from "@/components/common";
import { errorMessage, useLoad } from "./use-load";

function safeReturnTo(value: string | null) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.startsWith("/login")
    ? value
    : "/teams";
}
export function LoginPage() {
  const users = useAppStore((s) => s.users);
  const [selected, setSelected] = useState("jiwoo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const request = useRef<AbortController | null>(null);
  const [cancelled, setCancelled] = useState(false);
  useEffect(() => () => request.current?.abort(), []);
  async function login() {
    if (busy) return;
    const controller = new AbortController();
    request.current = controller;
    setCancelled(false);
    setBusy(true);
    setError("");
    try {
      await service.login(selected, controller.signal);
      if (controller.signal.aborted) return;
      navigate(safeReturnTo(params.get("returnTo")), { replace: true });
    } catch (e) {
      if (!controller.signal.aborted) setError(errorMessage(e));
    } finally {
      request.current = null;
      setBusy(false);
    }
  }
  return (
    <div
      className="page-grid"
      style={{ maxWidth: 1080, margin: "36px auto", alignItems: "center" }}
    >
      <section className="stack" style={{ padding: "24px 0" }}>
        <span className="badge">우리의 다음 장면을 함께</span>
        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 60px)",
            lineHeight: 1.16,
            letterSpacing: "-0.06em",
            margin: "16px 0",
          }}
        >
          함께할 시간을 찾고,
          <br />더 좋은 장면을 만들어요.
        </h1>
        <p className="muted" style={{ maxWidth: 390, lineHeight: 1.8 }}>
          일정 조율부터 연습 영상과 피드백까지.
          <br />
          팀의 모든 준비를 팀그라운드에서 이어가세요.
        </p>
        <div className="stack" style={{ marginTop: 24, gap: 18 }}>
          <div className="row">
            <CalendarDays size={20} /> 모두가 만날 수 있는 시간
          </div>
          <div className="row">
            <Clapperboard size={20} /> 회차마다 쌓이는 연습 기록
          </div>
          <div className="row">
            <Users size={20} /> 다음 장면을 위한 피드백
          </div>
        </div>
      </section>
      <section className="card stack" style={{ padding: 32 }}>
        <PageHeader
          eyebrow="WELCOME TO TEAMGROUND"
          title="반가워요!"
          description="발표용 데모 계정을 선택하고 시작하세요."
        />
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 12, fontWeight: 600 }}>
            데모 계정 선택
          </legend>
          <div className="stack" style={{ gap: 8 }}>
            {users.map((user) => (
              <label
                key={user.id}
                className="row"
                style={{
                  padding: 12,
                  border: `1px solid ${selected === user.id ? "#426a42" : "#e6e8e1"}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  background: selected === user.id ? "#f1f6ed" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="account"
                  value={user.id}
                  checked={selected === user.id}
                  onChange={() => setSelected(user.id)}
                />
                <Avatar user={user} />
                <span style={{ flex: 1 }}>
                  <strong>{user.name}</strong>
                  <span
                    className="muted"
                    style={{ display: "block", fontSize: 12 }}
                  >
                    {user.email}
                  </span>
                </span>
                <span className="badge">
                  {user.id === "jiwoo"
                    ? "관리자"
                    : user.id === "seoyeon"
                      ? "초대 대상"
                      : "멤버"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <ErrorNotice message={error} />}
        <Button
          onClick={login}
          disabled={busy || !users.some((user) => user.id === selected)}
        >
          {busy
            ? "로그인 중…"
            : error
              ? "다시 로그인하기"
              : "선택한 계정으로 시작하기"}
          <ArrowRight size={16} />
        </Button>
        {busy && <Button variant="ghost" disabled={cancelled} onClick={() => { request.current?.abort(); setCancelled(true); }}>{cancelled ? '취소 중…' : '로그인 취소'}</Button>}
        {cancelled && <p role="status" className="muted">로그인을 취소했습니다. 계정을 선택해 다시 시작할 수 있어요.</p>}
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
          <ShieldCheck
            size={14}
            style={{ display: "inline", verticalAlign: "middle" }}
          />{" "}
          로그인은 시뮬레이션이며 실제 소셜 인증을 진행하지 않습니다. 변경
          내용은 이 브라우저에 저장됩니다. 초대는 로그인 후 별도로 수락합니다.
        </p>
      </section>
    </div>
  );
}

export function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { loading, error: loadError, retry } = useLoad();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { invites, teams, users, sessionUserId, memberships } = useAppStore();
  const invite = invites.find((i) => i.token === token);
  const team = teams.find((t) => t.id === invite?.teamId);
  const user = users.find((u) => u.id === sessionUserId);
  const member = memberships.some(
    (m) => m.teamId === invite?.teamId && m.userId === sessionUserId,
  );
  const expired = invite
    ? new Date(invite.expiresAt).getTime() <= Date.now()
    : false;
  const matches = user?.email.toLowerCase() === invite?.email.toLowerCase();
  const loginPath = `/login?returnTo=${encodeURIComponent(`/invite/${token ?? ""}`)}`;
  async function accept() {
    if (!token || busy) return;
    setBusy(true);
    setError("");
    try {
      const teamId = await service.acceptInvite(token);
      navigate(`/teams/${teamId}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="card stack"
      style={{ maxWidth: 560, margin: "48px auto", padding: 32 }}
    >
      <PageHeader
        eyebrow="YOU'RE INVITED"
        title="새로운 장면에 초대받았어요"
        description="초대 정보를 확인하고 팀에 참여하세요."
      />
      {loading ? (
        <p role="status">초대를 확인하고 있어요…</p>
      ) : loadError ? (
        <>
          <ErrorNotice message={loadError} />
          <Button onClick={retry}>다시 확인</Button>
        </>
      ) : !invite || !team ? (
        <EmptyState
          title="유효하지 않은 초대 링크입니다"
          description="팀 관리자에게 새로운 초대를 요청해주세요."
          action={<Link to="/teams">내 팀으로 이동</Link>}
        />
      ) : (
        <>
          <div style={{ padding: 24, background: "#f4f6ef", borderRadius: 16 }}>
            <Users size={28} />
            <h2 style={{ margin: "12px 0" }}>{team.name}</h2>
            <p className="muted">{team.description}</p>
            <p>
              초대 대상:{" "}
              {user
                ? invite.email
                : invite.email.replace(/^(.).*(@.*)$/, "$1***$2")}
            </p>
            <span className="badge">
              {member
                ? "참여 중"
                : expired
                  ? "만료됨"
                  : invite.status === "accepted"
                    ? "수락 완료"
                    : "참여 대기"}
            </span>
          </div>
          {error && <ErrorNotice message={error} />}
          {member ? (
            <>
              <p>이미 참여 중인 팀입니다.</p>
              <Button onClick={() => navigate(`/teams/${team.id}`)}>
                팀으로 이동
                <ArrowRight size={16} />
              </Button>
            </>
          ) : expired || invite.status === "accepted" ? (
            <p role="status">
              사용할 수 없는 초대입니다. 팀 관리자에게 새로운 링크를
              요청해주세요.
            </p>
          ) : !user ? (
            <Button onClick={() => navigate(loginPath)}>
              로그인하고 참여하기
            </Button>
          ) : !matches ? (
            <>
              <ErrorNotice
                message={`현재 ${user.name} 계정은 초대 이메일과 일치하지 않습니다.`}
              />
              <Button variant="outline" onClick={() => navigate(loginPath)}>
                초대받은 계정으로 전환
              </Button>
            </>
          ) : (
            <>
              <p className="row">
                <Avatar user={user} />
                {user.name} 계정으로 참여합니다.
              </p>
              <Button onClick={accept} disabled={busy}>
                {busy ? "참여 중…" : "초대 수락"}
              </Button>
            </>
          )}
        </>
      )}
      <p className="muted" style={{ fontSize: 12 }}>
        데모 초대입니다. 실제 메일은 발송되지 않습니다.
      </p>
    </section>
  );
}
