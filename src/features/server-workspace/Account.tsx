import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUnsavedActions } from "@/app/unsaved-changes";
import { ErrorNotice, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  api,
  ApiError,
  type Profile,
  type Teamspace,
} from "@/features/server-auth/api";
import { useSession } from "@/features/server-auth/session";
import {
  Field,
  inputClass,
  LoadState,
  useAction,
  useResource,
  useUnsaved,
} from "./shared";

export function AccountPage() {
  const resource = useResource<Profile>("/me");
  return (
    <>
      <PageHeader
        title="계정 설정"
        description="내 프로필과 서비스 이용 정보를 관리합니다."
      />
      <LoadState resource={resource} />
      {resource.data && (
        <AccountContent key={resource.data.id} initial={resource.data} />
      )}
    </>
  );
}

function AccountContent({ initial }: { initial: Profile }) {
  const { setProfile } = useSession();
  const navigate = useNavigate();
  const { confirmDiscard } = useUnsavedActions();
  const [current, setCurrent] = useState(initial);
  const [name, setName] = useState(initial.displayName);
  const [fieldError, setFieldError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [ownerConflict, setOwnerConflict] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const save = useAction();
  const withdrawal = useAction();
  const teams = useResource<Teamspace[]>("/teamspaces");
  const dirty = name !== current.displayName;
  const clearDirty = useUnsaved(
    dirty || (withdrawOpen && confirmation !== ""),
    save.busy || withdrawal.busy,
  );
  const ownedTeams = teams.data?.filter((team) => team.role === "OWNER") ?? [];

  function submit(event: FormEvent) {
    event.preventDefault();
    if (conflict || save.busy || withdrawal.busy) return;
    const displayName = name.trim();
    if (!displayName || [...displayName].length > 30) {
      setFieldError(
        "표시 이름은 공백을 제외한 이름으로 1~30자 이내로 입력해 주세요.",
      );
      nameInput.current?.focus();
      return;
    }
    setFieldError("");
    setNotice("");
    void save.run(async () => {
      try {
        const updated = await api<Profile>(
          "/me",
          { displayName },
          { method: "PATCH", version: current.version },
        );
        setCurrent(updated);
        setName(updated.displayName);
        setProfile(updated);
        setNotice("프로필을 저장했습니다.");
      } catch (error) {
        if (error instanceof ApiError && [412, 428].includes(error.status))
          setConflict(true);
        throw error;
      }
    });
  }

  function reloadProfile() {
    setNotice("");
    void save.run(async () => {
      const updated = await api<Profile>("/me");
      setCurrent(updated);
      setProfile(updated);
      setConflict(false);
      setNotice(
        "최신 프로필을 불러왔습니다. 입력한 이름은 유지했습니다. 확인 후 다시 저장해 주세요.",
      );
    });
  }

  async function openWithdrawal() {
    if (!(await confirmDiscard(dirty, save.busy))) return;
    setName(current.displayName);
    setConfirmation("");
    setOwnerConflict(false);
    setWithdrawOpen(true);
    void teams.reload();
  }

  function withdraw(event: FormEvent) {
    event.preventDefault();
    if (
      confirmation !== "서비스 탈퇴" ||
      withdrawal.busy ||
      ownedTeams.length ||
      teams.loading ||
      teams.error
    )
      return;
    setOwnerConflict(false);
    void withdrawal.run(async () => {
      try {
        // The withdrawal endpoint requires CSRF, but does not accept an If-Match precondition.
        await api<void>("/me", undefined, { method: "DELETE" });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          setOwnerConflict(true);
          void teams.reload();
        }
        throw error;
      }
      clearDirty();
      try {
        sessionStorage.removeItem("teamground.returnTo");
      } catch {
        /* Session cleanup must succeed without browser storage. */
      }
      setProfile(null);
      void navigate("/login", { replace: true });
    });
  }

  return (
    <div className="stack">
      <section
        className="card stack"
        style={{ padding: 24 }}
        aria-labelledby="account-profile-title"
      >
        <h2 id="account-profile-title">내 프로필</h2>
        <form className="stack" onSubmit={submit} noValidate>
          <Field label="표시 이름">
            <input
              ref={nameInput}
              className={inputClass}
              value={name}
              autoComplete="nickname"
              disabled={save.busy || withdrawal.busy}
              aria-invalid={Boolean(fieldError)}
              aria-describedby="account-name-help account-name-error"
              onChange={(event) => {
                setName(event.target.value);
                setFieldError("");
                setNotice("");
              }}
            />
          </Field>
          <p id="account-name-help" className="muted">
            앞뒤 공백을 제외하고 최대 30자입니다.
          </p>
          <p id="account-name-error" role={fieldError ? "alert" : undefined}>
            {fieldError}
          </p>
          <ErrorNotice message={save.error} />
          {conflict && (
            <div className="stack" role="status">
              <p>
                다른 곳에서 프로필이 변경되었습니다. 최신 정보를 불러온 후
                이름을 확인하고 다시 저장해 주세요.
              </p>
              <Button
                variant="outline"
                disabled={save.busy}
                onClick={reloadProfile}
              >
                최신 프로필 불러오기
              </Button>
            </div>
          )}
          {notice && <p role="status">{notice}</p>}
          <div>
            <Button
              type="submit"
              disabled={save.busy || withdrawal.busy || conflict || !dirty}
            >
              {save.busy ? "처리 중…" : "프로필 저장"}
            </Button>
          </div>
        </form>
        <dl className="stack">
          <div>
            <dt className="muted">이메일</dt>
            <dd style={{ overflowWrap: "anywhere" }}>
              {current.verifiedEmail}
            </dd>
          </div>
          <div>
            <dt className="muted">시간대</dt>
            <dd>{current.timezone}</dd>
          </div>
          <div>
            <dt className="muted">로그인 수단</dt>
            <dd>
              {current.authMethod === "GOOGLE" ? "Google" : "이메일·비밀번호"}
            </dd>
          </div>
        </dl>
        <p className="muted">
          이메일, 시간대와 로그인 수단은 이 화면에서 변경할 수 없습니다.
        </p>
      </section>
      <section
        className="card stack"
        style={{ padding: 24 }}
        aria-labelledby="account-withdraw-title"
      >
        <h2 id="account-withdraw-title">서비스 탈퇴</h2>
        <p>
          탈퇴하면 모든 팀에서 나가고 개인 일정과 캘린더 연결이 삭제되며, 모든
          로그인 세션이 종료됩니다.
        </p>
        <p>
          작성한 영상과 피드백은 팀에 남고 작성자는 ‘탈퇴한 유저’로 표시됩니다.
          같은 계정으로 재가입해도 이전 팀 접근 권한과 작성자 권한은 복구되지
          않습니다.
        </p>
        <p>
          관리자인 팀이 있다면 먼저 기존 멤버에게 관리자 권한을 넘기거나 팀을
          삭제해 주세요.
        </p>
        <div>
          <Button
            variant="destructive"
            disabled={save.busy || withdrawal.busy}
            onClick={() => void openWithdrawal()}
          >
            서비스 탈퇴
          </Button>
        </div>
      </section>
      <Modal
        open={withdrawOpen}
        closeDisabled={withdrawal.busy}
        onOpenChange={(open) => {
          if (!withdrawal.busy) setWithdrawOpen(open);
        }}
        title="정말 서비스를 탈퇴할까요?"
        description="이 작업은 되돌릴 수 없습니다. 개인 일정과 팀 접근 권한은 삭제되며, 작성한 영상과 피드백은 남습니다."
      >
        <form className="stack" onSubmit={withdraw}>
          <LoadState resource={teams} />
          {ownedTeams.length > 0 && (
            <div className="stack" role="alert">
              <p>
                관리자인 팀이 있어 탈퇴할 수 없습니다. 아래 팀에서 관리자 권한을
                넘기거나 팀을 삭제해 주세요.
              </p>
              {ownedTeams.map((team) => (
                <Link
                  key={team.id}
                  to={`/teams/${encodeURIComponent(team.id)}/members`}
                >
                  {team.name} 관리하기
                </Link>
              ))}
            </div>
          )}
          {ownerConflict && (
            <div role="alert">
              <p>
                관리자인 팀이 있어 탈퇴할 수 없습니다. 팀 목록에서 소유한 팀을
                확인해 주세요.
              </p>
              <Link to="/teams">팀 목록으로 이동</Link>
            </div>
          )}
          {!ownerConflict && <ErrorNotice message={withdrawal.error} />}
          <Field label="확인을 위해 ‘서비스 탈퇴’를 입력해 주세요">
            <input
              className={inputClass}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              disabled={withdrawal.busy}
            />
          </Field>
          <div
            className="row"
            style={{ justifyContent: "flex-end", flexWrap: "wrap" }}
          >
            <Button
              variant="outline"
              disabled={withdrawal.busy}
              onClick={() => setWithdrawOpen(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={
                withdrawal.busy ||
                confirmation !== "서비스 탈퇴" ||
                ownedTeams.length > 0 ||
                teams.loading ||
                Boolean(teams.error)
              }
            >
              {withdrawal.busy ? "탈퇴 처리 중…" : "탈퇴 확정"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
