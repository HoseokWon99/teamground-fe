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
  useUnsaved,
  dateToday,
  dateAfter,
  dateRange,
  displayTime,
} from "./shared";
import type {
  Invitation,
  Member,
  Occurrence,
  SchedulingRequest,
} from "./types";
export function TeamPage() {
  const { teamId = "" } = useParams();
  const team = useResource<Teamspace>(teamPath(teamId));
  return (
    <>
      <LoadState resource={team} />
      {team.data && (
        <TeamContent key={teamId} team={team.data} reload={team.reload} />
      )}
    </>
  );
}
function TeamContent({
  team,
  reload,
}: {
  team: Teamspace;
  reload: () => Promise<void>;
}) {
  const base = teamPath(team.id);
  const owner = team.role === "OWNER";
  const { profile } = useSession();
  const navigate = useNavigate();
  const action = useAction();
  const members = useResource<Member[]>(`${base}/members`);
  const requests = useResource<SchedulingRequest[]>(
    `${base}/scheduling-requests`,
  );
  const [from, setFrom] = useState(dateToday);
  const [to, setTo] = useState(() => dateAfter(60));
  const occurrences = useResource<Occurrence[]>(
    `${base}/occurrences?${dateRange(from, to)}`,
  );
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [confirmationName, setConfirmationName] = useState("");
  const clearDirty = useUnsaved(
    name !== team.name || description !== (team.description ?? ""),
  );
  return (
    <>
      <PageHeader
        title={team.name}
        description={team.description ?? "팀 일정과 연습 기록"}
      />
      <p>{owner ? "관리자" : "멤버"} · 시간대 Asia/Seoul</p>
      <ErrorNotice message={action.error} />
      <Button
        variant="outline"
        disabled={action.busy}
        onClick={() => void reload()}
      >
        팀 최신 정보 다시 불러오기
      </Button>
      <section className="card stack" style={{ padding: 20 }}>
        <h2>팀 멤버</h2>
        <LoadState resource={members} />
        {members.data?.map((m) => (
          <div
            key={m.membershipId}
            className="row"
            style={{ flexWrap: "wrap" }}
          >
            <span>
              {m.displayName} · {m.role === "OWNER" ? "관리자" : "멤버"}
            </span>
            {owner && m.userId !== profile?.id && (
              <>
                <Button
                  disabled={action.busy}
                  variant="outline"
                  onClick={() => {
                    if (
                      window.confirm(
                        `${m.displayName}님에게 관리자 권한을 넘길까요?`,
                      )
                    )
                      void action.run(async () => {
                        await api(`${base}/ownership`, { userId: m.userId });
                        await reload();
                      });
                  }}
                >
                  관리자 위임
                </Button>
                <Button
                  disabled={action.busy}
                  variant="outline"
                  onClick={() => {
                    if (
                      window.confirm(`${m.displayName}님을 팀에서 내보낼까요?`)
                    )
                      void action.run(async () => {
                        await api(`${base}/members/${m.userId}`, undefined, {
                          method: "DELETE",
                        });
                        await members.reload();
                      });
                  }}
                >
                  내보내기
                </Button>
              </>
            )}
          </div>
        ))}
      </section>
      {owner && <Invitations base={base} />}
      <section className="card stack" style={{ padding: 20 }}>
        <h2>일정 조율</h2>
        <Link to={`/teams/${team.id}/scheduling`}>새 일정 조율</Link>
        <LoadState resource={requests} />
        {requests.data?.length === 0 && <p>진행 중인 조율이 없습니다.</p>}
        {requests.data?.map((r) => (
          <Link key={r.id} to={`/teams/${team.id}/scheduling/${r.id}`}>
            {r.conditions.title} ·{" "}
            {r.status === "CONFIRMED"
              ? "확정"
              : r.status === "SELECTED"
                ? "선택됨"
                : "조율 중"}
          </Link>
        ))}
      </section>
      <section className="card stack" style={{ padding: 20 }}>
        <h2>팀 회차</h2>
        <Field label="조회 시작일">
          <input
            className="input"
            type="date"
            value={from}
            onChange={(e) => {
              if (e.target.value) setFrom(e.target.value);
            }}
          />
        </Field>
        <Field label="조회 종료일">
          <input
            className="input"
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              if (e.target.value) setTo(e.target.value);
            }}
          />
        </Field>
        <LoadState resource={occurrences} />
        {occurrences.data?.length === 0 && <p>해당 기간에 회차가 없습니다.</p>}
        {occurrences.data?.map((o) => (
          <Link key={o.id} to={`/teams/${team.id}/occurrences/${o.id}`}>
            {o.title} · {o.sequence}회 · {displayTime(o.startsAt)}{" "}
            {o.status === "CANCELLED" ? "(취소)" : ""}
          </Link>
        ))}
      </section>
      {owner ? (
        <section className="card stack" style={{ padding: 20 }}>
          <h2>팀 관리</h2>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(async () => {
                await api(
                  base,
                  { name: name.trim(), description: description.trim() },
                  { method: "PATCH", version: team.version },
                );
                await reload();
              });
            }}
          >
            <Field label="팀 이름">
              <input
                className="input"
                required
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="설명">
              <textarea
                className="input"
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={action.busy}>
              팀 정보 저장
            </Button>
          </form>
          <Field label="팀 삭제 확인: 팀 이름 입력">
            <input
              className="input"
              value={confirmationName}
              onChange={(e) => setConfirmationName(e.target.value)}
            />
          </Field>
          <Button
            variant="outline"
            disabled={action.busy || confirmationName !== team.name}
            onClick={() => {
              if (
                window.confirm(
                  "팀과 하위 기록에 더 이상 접근할 수 없습니다. 삭제할까요?",
                )
              )
                void action.run(async () => {
                  await api(
                    base,
                    { confirmationName },
                    { method: "DELETE", version: team.version },
                  );
                  clearDirty();
                  navigate("/teams");
                });
            }}
          >
            팀 삭제
          </Button>
        </section>
      ) : (
        <Button
          variant="outline"
          disabled={action.busy}
          onClick={() => {
            if (window.confirm("이 팀에서 탈퇴할까요?"))
              void action.run(async () => {
                await api(`${base}/members/me`, undefined, {
                  method: "DELETE",
                });
                clearDirty();
                navigate("/teams");
              });
          }}
        >
          팀 탈퇴
        </Button>
      )}
    </>
  );
}
function Invitations({ base }: { base: string }) {
  const list = useResource<Invitation[]>(`${base}/invitations`);
  const action = useAction();
  const [email, setEmail] = useState("");
  const clearDirty = useUnsaved(Boolean(email), action.busy);
  return (
    <section className="card stack" style={{ padding: 20 }}>
      <h2>이메일 초대</h2>
      <ErrorNotice message={action.error} />
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await api(`${base}/invitations`, { email: email.trim() });
            clearDirty();
            setEmail("");
            await list.reload();
          });
        }}
      >
        <Field label="초대 이메일">
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={action.busy}>
          초대 요청
        </Button>
      </form>
      <p>메일 전달 결과는 아래 상태를 확인해 주세요.</p>
      <LoadState resource={list} />
      {list.data?.length === 0 && <p>초대 내역이 없습니다.</p>}
      {list.data?.map((i) => (
        <div className="stack" key={i.id}>
          <span>
            {i.email} · {i.status} · 메일 {i.deliveryStatus}
          </span>
          {i.status !== "ACCEPTED" && (
            <div className="row">
              <Button
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await api(`${base}/invitations/${i.id}/resend`, {});
                    await list.reload();
                  })
                }
              >
                재발급
              </Button>
              <Button
                variant="outline"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await api(`${base}/invitations/${i.id}`, undefined, {
                      method: "DELETE",
                    });
                    await list.reload();
                  })
                }
              >
                초대 취소
              </Button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
export function InvitationPage({ token }: { token: string }) {
  const { profile, loading } = useSession();
  const action = useAction();
  const navigate = useNavigate();
  return (
    <main className="auth-container stack">
      <h1>팀 초대 수락</h1>
      <ErrorNotice message={action.error} />
      {!token ? (
        <p>
          메일의 초대 링크를 다시 열어 주세요. 새로고침하면 보안을 위해 링크
          정보가 지워집니다.
        </p>
      ) : loading ? (
        <p role="status">로그인을 확인하는 중…</p>
      ) : profile ? (
        <>
          <p>{profile.verifiedEmail} 계정으로 초대를 수락합니다.</p>
          <Button
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                const result = await api<{ teamspaceId: string }>(
                  "/invitations/accept",
                  { token },
                );
                navigate(`/teams/${result.teamspaceId}`, { replace: true });
              })
            }
          >
            초대 수락
          </Button>
        </>
      ) : (
        <>
          <p>
            초대받은 이메일로 로그인한 뒤 메일의 초대 링크를 다시 열어 주세요.
          </p>
          <Link to="/login">로그인</Link>
        </>
      )}
      <Link to="/teams">내 팀으로</Link>
    </main>
  );
}
