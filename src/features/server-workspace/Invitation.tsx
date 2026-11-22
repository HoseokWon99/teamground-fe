import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/common";
import {
  api,
  ApiError,
  explainError,
  type Teamspace,
} from "@/features/server-auth/api";
import { AuthFrame } from "@/features/server-auth/pages";
import { useSession } from "@/features/server-auth/session";
import type { Member } from "./types";

export function InvitationPage({ token }: { token: string }) {
  const {
    profile,
    loading,
    error: sessionError,
    refresh,
    setProfile,
  } = useSession();
  const navigate = useNavigate();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unusable, setUnusable] = useState(false);

  async function run(changeAccount = false) {
    if (pending.current || !profile || !token) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      if (changeAccount) {
        await api("/auth/logout", {});
        setProfile(null);
        navigate("/login?returnTo=%2Finvite");
        return;
      }
      const result = await api<{ teamspaceId: string; membershipId: string }>(
        "/invitations/accept",
        { token },
      );
      // An accepted invitation can refer to a membership that has since left.
      // Check current server access before claiming that the user joined.
      try {
        const base = `/teamspaces/${encodeURIComponent(result.teamspaceId)}`;
        const [team, members] = await Promise.all([
          api<Teamspace>(base),
          api<Member[]>(`${base}/members`),
        ]);
        if (!members.some((member) => member.userId === profile.id)) {
          setUnusable(true);
          setError(
            "이전에 수락한 초대이지만 현재 팀 멤버가 아닙니다. 팀 소유자에게 새 초대를 요청해 주세요.",
          );
          return;
        }
        navigate(`/teams/${encodeURIComponent(team.id)}`, { replace: true });
      } catch (e) {
        if (e instanceof ApiError && [403, 404].includes(e.status)) {
          setUnusable(true);
          setError(
            "이전에 수락한 초대이지만 현재 팀에 접근할 수 없습니다. 팀 소유자에게 새 초대를 요청해 주세요.",
          );
          return;
        }
        throw e;
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setProfile(null);
      if (
        e instanceof ApiError &&
        ["INVITATION_NOT_FOUND", "INVITATION_NOT_PENDING"].includes(e.code)
      )
        setUnusable(true);
      setError(explainError(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="팀 초대 수락">
      <ErrorNotice message={error || sessionError} />
      {!token ? (
        <p>
          메일의 초대 링크를 다시 열어 주세요. 새로고침·새 탭·Google 로그인
          후에는 보안을 위해 링크 정보가 사라집니다.
        </p>
      ) : loading ? (
        <p role="status">로그인을 확인하는 중…</p>
      ) : sessionError ? (
        <Button onClick={() => void refresh()}>로그인 상태 다시 확인</Button>
      ) : profile ? (
        <>
          <p className="break-all">현재 로그인 계정: {profile.verifiedEmail}</p>
          <p>메일을 받은 계정인지 확인한 뒤 초대를 수락해 주세요.</p>
          {!unusable && (
            <Button disabled={busy} onClick={() => void run()}>
              {busy ? "처리 중…" : "초대 수락"}
            </Button>
          )}
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void run(true)}
          >
            다른 계정으로 로그인
          </Button>
        </>
      ) : (
        <>
          <p>
            초대받은 이메일로 로그인해 주세요. 로그인만으로 초대가 수락되지는
            않습니다.
          </p>
          <Button asChild>
            <Link to="/login?returnTo=%2Finvite">로그인하고 참여하기</Link>
          </Button>
          <Link to="/signup">회원가입</Link>
        </>
      )}
      <p className="muted">
        회원가입·비밀번호 재설정·Google 로그인 후에는 원래 초대 메일의 링크를
        다시 열어 주세요.
      </p>
      <Link to="/teams">내 팀으로</Link>
    </AuthFrame>
  );
}
