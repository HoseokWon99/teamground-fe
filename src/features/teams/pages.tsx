import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  Mail,
  Plus,
  Users,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppStore } from "@/stores/app-store";
import { service } from "@/mocks/service";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Avatar,
  EmptyState,
  ErrorNotice,
  PageHeader,
} from "@/components/common";
import { errorMessage, useLoad } from "@/features/auth/use-load";

export function TeamListPage() {
  const { teams, memberships, sessionUserId, users, occurrences } =
    useAppStore();
  const navigate = useNavigate();
  const { loading, error, retry } = useLoad();
  const mine = memberships.filter((m) => m.userId === sessionUserId);
  const user = users.find((u) => u.id === sessionUserId);
  return (
    <div className="stack">
      <PageHeader
        eyebrow="YOUR CREATIVE SPACE"
        title={`${user?.name ?? ""}님의 팀`}
        description="함께하는 사람들, 함께 만들어갈 다음 장면."
        action={
          <Button onClick={() => navigate("/teams/new")}>
            <Plus size={17} />팀 만들기
          </Button>
        }
      />
      {loading ? (
        <div className="card" role="status">
          팀을 불러오는 중…
        </div>
      ) : error ? (
        <div className="card stack">
          <ErrorNotice message={error} />
          <Button onClick={retry}>다시 불러오기</Button>
        </div>
      ) : mine.length === 0 ? (
        <EmptyState
          title="아직 참여 중인 팀이 없어요"
          description="새 팀을 만들거나 전달받은 초대 링크로 팀에 참여하세요."
          action={
            <Button onClick={() => navigate("/teams/new")}>첫 팀 만들기</Button>
          }
        />
      ) : (
        <div className="page-grid">
          {mine.map((membership) => {
            const team = teams.find((t) => t.id === membership.teamId);
            if (!team) return null;
            const members = memberships.filter((m) => m.teamId === team.id);
            return (
              <Link
                className="card stack"
                key={team.id}
                to={`/teams/${team.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  padding: 26,
                }}
              >
                <div
                  className="row"
                  style={{ justifyContent: "space-between" }}
                >
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 52,
                      height: 52,
                      background: "#edf2e5",
                      borderRadius: 16,
                    }}
                  >
                    <Users size={25} />
                  </span>
                  <span className="badge">
                    {membership.role === "admin" ? "관리자" : "멤버"}
                  </span>
                </div>
                <div>
                  <p className="muted" style={{ fontSize: 12 }}>
                    {team.category}
                  </p>
                  <h2 style={{ margin: "6px 0", fontSize: 24 }}>{team.name}</h2>
                  <p className="muted">
                    {team.description ||
                      "함께 만들어갈 이야기를 기다리고 있어요."}
                  </p>
                </div>
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    borderTop: "1px solid #e7e9e0",
                    paddingTop: 16,
                  }}
                >
                  <div className="row">
                    {members.slice(0, 4).map((m) => (
                      <Avatar
                        key={m.userId}
                        user={users.find((u) => u.id === m.userId)}
                        size={28}
                      />
                    ))}
                    <span className="muted">
                      {members.length}명 · 일정{" "}
                      {occurrences.filter((o) => o.teamId === team.id).length}개
                    </span>
                  </div>
                  <ArrowRight size={18} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <div
        className="card row"
        style={{
          justifyContent: "space-between",
          flexWrap: "wrap",
          background: "#f1f4eb",
        }}
      >
        <div className="row">
          <CalendarDays size={24} />
          <div>
            <strong>내 일정을 먼저 준비해볼까요?</strong>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              개인 일정 내용은 나에게만 보여요.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/calendar")}>
          내 일정 관리
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

const teamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "팀 이름을 입력해주세요.")
    .max(50, "팀 이름은 50자 이내로 입력해주세요."),
  description: z.string().max(200, "설명은 200자 이내로 입력해주세요."),
});
export function CreateTeamPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const form = useForm<z.infer<typeof teamSchema>>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: "", description: "" },
  });
  const { isDirty, isSubmitting, errors } = form.formState;
  useEffect(() => {
    if (!isDirty || isSubmitting) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmLink = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a[href]");
      if (
        link &&
        !window.confirm("작성 중인 팀 정보가 저장되지 않았습니다. 나갈까요?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", confirmLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", confirmLink, true);
    };
  }, [isDirty, isSubmitting]);
  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      const team = await service.createTeam(
        values.name,
        values.description.trim(),
      );
      form.reset();
      navigate(`/teams/${team.id}`, { state: { created: true } });
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <PageHeader
        eyebrow="NEW TEAM"
        title="함께할 팀 만들기"
        description="팀을 만든 후 멤버를 초대하고 첫 연습을 준비하세요."
      />
      <form className="card stack" onSubmit={submit} noValidate>
        <label className="field">
          팀 이름 <span className="muted">필수 · 최대 50자</span>
          <input
            className="input"
            autoFocus
            placeholder="예: 파동 극단"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "team-name-error" : undefined}
            {...form.register("name")}
          />
          {errors.name && (
            <span id="team-name-error" className="field-error">
              {errors.name.message}
            </span>
          )}
        </label>
        <label className="field">
          팀 소개 <span className="muted">선택 · 최대 200자</span>
          <textarea
            className="textarea"
            rows={4}
            placeholder="우리 팀이 만들어갈 이야기를 소개해주세요."
            aria-invalid={!!errors.description}
            {...form.register("description")}
          />
          {errors.description && (
            <span className="field-error">{errors.description.message}</span>
          )}
        </label>
        <p className="muted">
          팀을 만든 계정이 관리자가 되어 멤버 초대와 일정 확정을 진행합니다.
        </p>
        {error && <ErrorNotice message={error} />}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => (isDirty ? setCancelOpen(true) : navigate("/teams"))}
          >
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "팀을 만드는 중…" : "팀 만들기"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
      <Modal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="팀 만들기를 나갈까요?"
        description="입력한 팀 정보는 저장되지 않습니다."
      >
        <div className="row">
          <Button variant="outline" onClick={() => setCancelOpen(false)}>
            계속 작성
          </Button>
          <Button onClick={() => navigate("/teams")}>나가기</Button>
        </div>
      </Modal>
    </div>
  );
}

const inviteSchema = z.object({
  email: z.string().trim().email("올바른 이메일 주소를 입력해주세요."),
});
export function MembersPage() {
  const { teamId } = useParams();
  const { teams, users, memberships, sessionUserId, invites, calendars } =
    useAppStore();
  const { loading, error: loadError, retry } = useLoad();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState("");
  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });
  const team = teams.find((t) => t.id === teamId);
  const ownMembership = memberships.find(
    (m) => m.teamId === teamId && m.userId === sessionUserId,
  );
  const admin = ownMembership?.role === "admin";
  const members = memberships.filter((m) => m.teamId === teamId);
  const teamInvites = invites.filter((i) => i.teamId === teamId);
  const inviteUrl = (token: string) =>
    `${window.location.origin}/invite/${encodeURIComponent(token)}`;
  const submit = form.handleSubmit(async ({ email }) => {
    if (!teamId) return;
    setError("");
    setSuccess("");
    try {
      const invite = await service.invite(teamId, email);
      setSuccess(
        teamInvites.some((existing) => existing.id === invite.id)
          ? "이미 대기 중인 초대가 있어 기존 링크를 표시합니다. 실제 메일은 발송되지 않습니다."
          : "데모 초대가 생성되었습니다. 실제 메일은 발송되지 않습니다.",
      );
      form.reset();
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      setCopied(token);
    } catch {
      setSuccess(
        "자동 복사를 사용할 수 없습니다. 아래 초대 주소를 직접 선택해 복사해주세요.",
      );
    }
  }
  if (!team || !ownMembership)
    return (
      <EmptyState
        title="팀에 접근할 수 없습니다"
        action={<Link to="/teams">내 팀으로 이동</Link>}
      />
    );
  return (
    <div className="stack">
      <PageHeader
        eyebrow="BETTER TOGETHER"
        title="팀 멤버"
        description={`${team.name}의 장면을 함께 만드는 ${members.length}명`}
        action={
          admin ? (
            <Button
              onClick={() => {
                setError("");
                setOpen(true);
              }}
            >
              <Plus size={17} />
              멤버 초대
            </Button>
          ) : (
            <span className="badge">멤버 권한</span>
          )
        }
      />
      {success && (
        <div className="card" role="status" style={{ background: "#edf4e8" }}>
          {success}
        </div>
      )}
      {loading ? (
        <p role="status">멤버를 불러오는 중…</p>
      ) : loadError ? (
        <div className="stack">
          <ErrorNotice message={loadError} />
          <Button onClick={retry}>다시 불러오기</Button>
        </div>
      ) : (
        <>
          <section className="card stack">
            <h2 className="section-title">
              함께하는 멤버 <span className="muted">{members.length}</span>
            </h2>
            {members.map((member) => {
              const user = users.find((u) => u.id === member.userId);
              const status = calendars.find((c) => c.userId === member.userId);
              return (
                <div
                  className="row"
                  key={member.userId}
                  style={{
                    padding: "14px 0",
                    borderTop: "1px solid #ecede6",
                    flexWrap: "wrap",
                  }}
                >
                  <Avatar user={user} />
                  <strong style={{ flex: 1 }}>
                    {user?.name ?? "알 수 없는 사용자"}{" "}
                    {member.userId === sessionUserId && (
                      <span className="badge">나</span>
                    )}
                  </strong>
                  <span className="badge">
                    {member.role === "admin" ? "관리자" : "멤버"}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {status?.confirmed && status.syncState !== "error"
                      ? "일정 입력 완료"
                      : "일정 확인 필요"}
                  </span>
                </div>
              );
            })}
            <p className="muted" style={{ fontSize: 12 }}>
              개인 일정의 제목과 내용, 다른 멤버의 로그인 이메일은 공개하지
              않습니다.
            </p>
          </section>
          {admin ? (
            <section className="card stack">
              <div className="row">
                <Mail size={18} />
                <h2 className="section-title">초대 현황</h2>
              </div>
              {teamInvites.length === 0 ? (
                <p className="muted">
                  아직 생성한 초대가 없어요. 이메일로 첫 멤버를 초대해보세요.
                </p>
              ) : (
                teamInvites.map((invite) => {
                  const expired =
                    new Date(invite.expiresAt).getTime() <= Date.now();
                  const pending = invite.status === "pending" && !expired;
                  return (
                    <div
                      className="stack"
                      key={invite.id}
                      style={{
                        padding: "16px 0",
                        borderTop: "1px solid #ecede6",
                        gap: 10,
                      }}
                    >
                      <div className="row" style={{ flexWrap: "wrap" }}>
                        <strong style={{ flex: 1, overflowWrap: "anywhere" }}>
                          {invite.email}
                        </strong>
                        <span className="badge">
                          {invite.status === "accepted"
                            ? "수락 완료"
                            : expired
                              ? "만료"
                              : "참여 대기"}
                        </span>
                        {pending && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copy(invite.token)}
                          >
                            {copied === invite.token ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                            {copied === invite.token ? "복사됨" : "링크 복사"}
                          </Button>
                        )}
                        {expired && invite.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              form.setValue("email", invite.email);
                              setError("");
                              setOpen(true);
                            }}
                          >
                            다시 초대
                          </Button>
                        )}
                      </div>
                      {pending && (
                        <>
                          <input
                            className="input"
                            aria-label={`${invite.email} 초대 링크`}
                            readOnly
                            value={inviteUrl(invite.token)}
                            onFocus={(event) => event.target.select()}
                          />
                          <Link
                            to={`/invite/${invite.token}`}
                            style={{ fontSize: 13 }}
                          >
                            초대 화면 확인 →
                          </Link>
                        </>
                      )}
                    </div>
                  );
                })
              )}
              <p className="muted" style={{ fontSize: 12 }}>
                이메일 전송 없는 로컬 데모입니다. 링크를 열고 초대받은 계정으로
                전환하여 수락할 수 있습니다.
              </p>
            </section>
          ) : (
            <p className="muted">멤버 초대는 팀 관리자에게 요청해주세요.</p>
          )}
        </>
      )}
      <Modal
        open={open}
        onOpenChange={(next) => {
          if (form.formState.isSubmitting) return;
          if (
            !next &&
            form.formState.isDirty &&
            !window.confirm("입력한 이메일을 저장하지 않고 닫을까요?")
          )
            return;
          setOpen(next);
        }}
        title="함께할 멤버 초대"
        description="데모 초대 링크가 생성됩니다. 실제 메일은 발송되지 않습니다."
      >
        <form className="stack" onSubmit={submit} noValidate>
          <label className="field">
            초대할 이메일
            <input
              autoFocus
              className="input"
              type="email"
              placeholder="seoyeon@teamground.demo"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <span className="field-error">
                {form.formState.errors.email.message}
              </span>
            )}
          </label>
          <p className="muted" style={{ fontSize: 12 }}>
            초대받은 이메일과 로그인 계정이 일치해야 참여할 수 있습니다.
          </p>
          {error && <ErrorNotice message={error} />}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "초대 생성 중…" : "데모 초대 생성"}
            <ArrowRight size={16} />
          </Button>
        </form>
      </Modal>
    </div>
  );
}
