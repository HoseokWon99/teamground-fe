import { Play } from "lucide-react";
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
  displayTime,
  localTime,
  toInstant,
  useUnsaved,
  dateRange,
  dateAfter,
} from "./shared";
import type { Feedback, Occurrence, Video, Member } from "./types";
export function OccurrencePage() {
  const { teamId = "", occurrenceId = "" } = useParams();
  const base = teamPath(teamId);
  const occurrence = useResource<Occurrence>(
    `${base}/occurrences/${occurrenceId}`,
  );
  const team = useResource<Teamspace>(base);
  const videos = useResource<Video[]>(
    `${base}/occurrences/${occurrenceId}/videos`,
  );
  const action = useAction();
  return (
    <>
      <PageHeader
        title={occurrence.data?.title ?? "회차 상세"}
        description="회차별 연습 영상과 기록"
      />
      <Link to={`/teams/${teamId}`}>팀 회차 목록으로</Link>
      <LoadState resource={occurrence} />
      <LoadState resource={team} />
      <ErrorNotice message={action.error} />
      <Button variant="outline" onClick={() => void occurrence.reload()}>
        회차 최신 정보 다시 불러오기
      </Button>
      {occurrence.data && (
        <>
          <OccurrenceContext
            key={occurrence.data.id}
            teamId={teamId}
            occurrence={occurrence.data}
          />
          <p>
            {occurrence.data.sequence}회 ·{" "}
            {displayTime(occurrence.data.startsAt)} ~{" "}
            {displayTime(occurrence.data.endsAt)} ·{" "}
            {occurrence.data.status === "CANCELLED" ? "취소됨" : "예정"}
          </p>
          {team.data?.role === "OWNER" &&
            occurrence.data.status !== "CANCELLED" && (
              <MoveForm
                key={`${teamId}/${occurrenceId}`}
                base={base}
                occurrence={occurrence.data}
                reload={occurrence.reload}
              />
            )}
          {occurrence.data.status !== "CANCELLED" && (
            <VideoForm
              key={`${teamId}/${occurrenceId}`}
              save={async (value) => {
                await api(`${base}/occurrences/${occurrenceId}/videos`, value);
                await videos.reload();
              }}
            />
          )}
        </>
      )}
      <section className="card stack" style={{ padding: 20 }}>
        <h2>연습 영상</h2>
        <LoadState resource={videos} />
        {videos.data?.length === 0 && <p>이 회차에 등록된 영상이 없습니다.</p>}
        <div className="video-card-grid">
          {videos.data?.map((v) => (
            <Link
              className="card video-card"
              key={v.id}
              to={`/teams/${teamId}/videos/${v.id}`}
            >
              <span className="video-card-mark">
                <Play aria-hidden="true" />
              </span>
              <strong>{v.title}</strong>
              <span>{v.authorDisplayName}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
function OccurrenceContext({
  teamId,
  occurrence,
}: {
  teamId: string;
  occurrence: Occurrence;
}) {
  const members = useResource<Member[]>(`${teamPath(teamId)}/members`);
  const date = localTime(occurrence.startsAt).slice(0, 10);
  const siblings = useResource<Occurrence[]>(
    `${teamPath(teamId)}/occurrences?${dateRange(dateAfter(-366, date), dateAfter(366, date))}`,
  );
  const sequence =
    siblings.data
      ?.filter(
        (o) =>
          o.scheduleId === occurrence.scheduleId &&
          Boolean(occurrence.scheduleId),
      )
      .sort((a, b) => a.sequence - b.sequence) ?? [];
  const index = sequence.findIndex((o) => o.id === occurrence.id);
  const previous = index > 0 ? sequence[index - 1] : undefined;
  const next = index >= 0 ? sequence[index + 1] : undefined;
  return (
    <section className="card stack" style={{ padding: 20 }}>
      <h2>참석 가능 정보</h2>
      <p className="muted">
        확정·변경 당시의 일정 확인 결과입니다. 실제 참석 응답과 다를 수
        있습니다.
      </p>
      <LoadState resource={members} />
      <ul className="member-status-list">
        {occurrence.members.map((m) => (
          <li key={m.membershipId}>
            <strong>
              {members.data?.find(
                (member) => member.membershipId === m.membershipId,
              )?.displayName ?? "이전 팀 멤버"}
            </strong>
            <p>
              {
                {
                  AVAILABLE: "참석 가능",
                  UNAVAILABLE: "참석 불가",
                  UNKNOWN: "확인 필요",
                }[m.availability]
              }
              {m.required ? " · 필수 멤버" : ""}
            </p>
          </li>
        ))}
      </ul>
      <LoadState resource={siblings} />
      <nav className="row" aria-label="같은 정기 일정 회차 탐색">
        {previous ? (
          <Button asChild variant="outline">
            <Link to={`/teams/${teamId}/occurrences/${previous.id}`}>
              이전 회차 · {previous.sequence}회
            </Link>
          </Button>
        ) : (
          <span className="muted">조회 범위에 이전 회차 없음</span>
        )}
        {next ? (
          <Button asChild variant="outline">
            <Link to={`/teams/${teamId}/occurrences/${next.id}`}>
              다음 회차 · {next.sequence}회
            </Link>
          </Button>
        ) : (
          <span className="muted">조회 범위에 다음 회차 없음</span>
        )}
      </nav>
      <p className="muted">
        현재 회차 전후 1년의 같은 정기 일정을 탐색합니다. 다른 기간은 팀
        달력에서 확인하세요.
      </p>
    </section>
  );
}
function MoveForm({
  base,
  occurrence,
  reload,
}: {
  base: string;
  occurrence: Occurrence;
  reload: () => Promise<void>;
}) {
  const action = useAction();
  const [start, setStart] = useState(localTime(occurrence.startsAt));
  const [end, setEnd] = useState(localTime(occurrence.endsAt));
  const members = useResource<Member[]>(`${base}/members`);
  const [replaceRequired, setReplaceRequired] = useState(false);
  const originalRequired = occurrence.members
    .filter((m) => m.required)
    .map((m) => m.membershipId);
  const [requiredMemberIds, setRequiredMemberIds] = useState(originalRequired);
  const clearDirty = useUnsaved(
    requiredMemberIds.join() !== originalRequired.join() ||
      start !== localTime(occurrence.startsAt) ||
      end !== localTime(occurrence.endsAt),
    action.busy,
  );
  return (
    <section className="card stack" style={{ padding: 20 }}>
      <h2>회차 관리</h2>
      <ErrorNotice message={action.error} />
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await api(
              `${base}/occurrences/${occurrence.id}`,
              {
                startsAt: toInstant(start),
                endsAt: toInstant(end),
                ...(replaceRequired
                  ? {
                      requiredMemberIds: requiredMemberIds.filter((id) =>
                        members.data?.some((m) => m.membershipId === id),
                      ),
                    }
                  : {}),
              },
              { method: "PATCH", version: occurrence.version },
            );
            clearDirty();
            await reload();
          });
        }}
      >
        <Field label="회차 시작 시각">
          <input
            className="input"
            required
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="회차 종료 시각">
          <input
            className="input"
            required
            type="datetime-local"
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
        <label>
          <input
            type="checkbox"
            checked={replaceRequired}
            onChange={(e) => setReplaceRequired(e.target.checked)}
          />{" "}
          이탈한 필수 멤버 대체 (필수 멤버 이탈 오류가 발생한 경우)
        </label>
        {replaceRequired && (
          <fieldset>
            <legend>필수 멤버 (이탈 멤버를 대체할 수 있습니다)</legend>
            <LoadState resource={members} />
            {members.data?.map((m) => (
              <label className="row" key={m.membershipId}>
                <input
                  type="checkbox"
                  checked={requiredMemberIds.includes(m.membershipId)}
                  onChange={(e) =>
                    setRequiredMemberIds((ids) =>
                      e.target.checked
                        ? [...ids, m.membershipId]
                        : ids.filter((id) => id !== m.membershipId),
                    )
                  }
                />
                {m.displayName}
              </label>
            ))}
          </fieldset>
        )}
        <Button
          type="submit"
          disabled={
            action.busy ||
            end <= start ||
            members.loading ||
            (replaceRequired &&
              !requiredMemberIds.some((id) =>
                members.data?.some((m) => m.membershipId === id),
              ))
          }
        >
          회차 시간 변경
        </Button>
      </form>
      <Button
        disabled={action.busy}
        variant="outline"
        onClick={async () => {
          if (
            await action.confirm(
              "이 회차를 취소할까요? 기존 기록은 유지됩니다.",
            )
          )
            void action.run(async () => {
              await api(
                `${base}/occurrences/${occurrence.id}/cancel`,
                {},
                { version: occurrence.version },
              );
              clearDirty();
              await reload();
            });
        }}
      >
        회차 취소
      </Button>
    </section>
  );
}
export function VideoPage() {
  const { teamId = "", videoId = "" } = useParams();
  const base = teamPath(teamId);
  const video = useResource<Video>(`${base}/videos/${videoId}`);
  return (
    <>
      <LoadState resource={video} />
      {video.data && (
        <VideoContent
          key={`${teamId}/${videoId}`}
          teamId={teamId}
          video={video.data}
          reload={video.reload}
        />
      )}
    </>
  );
}
function VideoContent({
  teamId,
  video,
  reload,
}: {
  teamId: string;
  video: Video;
  reload: () => Promise<void>;
}) {
  const base = teamPath(teamId);
  const path = `${base}/videos/${video.id}`;
  const { profile } = useSession();
  const navigate = useNavigate();
  const action = useAction();
  const targets = useResource<Occurrence[]>(
    `${base}/occurrences?${dateRange(dateAfter(-365), dateAfter(365))}`,
  );
  const team = useResource<Teamspace>(base);
  const occurrence = useResource<Occurrence>(
    `${base}/occurrences/${video.occurrenceId}`,
  );
  const feedback = useResource<Feedback[]>(`${path}/feedback`);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [playError, setPlayError] = useState(false);
  const clearFeedbackDirty = useUnsaved(Boolean(body), action.busy);
  const owner = team.data?.role === "OWNER";
  const author = video.authorId === profile?.id;
  const active = occurrence.data?.status === "SCHEDULED";
  return (
    <>
      <PageHeader
        title={video.title}
        description={`등록자 ${video.authorDisplayName}`}
      />
      <Link to={`/teams/${teamId}/occurrences/${video.occurrenceId}`}>
        원래 회차로 돌아가기
      </Link>
      <LoadState resource={team} />
      <LoadState resource={occurrence} />
      <ErrorNotice message={action.error} />
      <Button
        variant="outline"
        disabled={action.busy}
        onClick={() => void reload()}
      >
        영상 최신 정보 다시 불러오기
      </Button>
      {video.playbackType !== "ORIGINAL_LINK" && (
        <video
          style={{ width: "100%", maxHeight: 500 }}
          controls
          preload="metadata"
          src={video.sourceUrl}
          onError={() => setPlayError(true)}
        />
      )}
      {playError && (
        <p role="status">
          영상 재생이 어렵습니다. 원본 링크를 열어 주세요. 피드백은 계속 확인할
          수 있습니다.
        </p>
      )}
      <a href={video.sourceUrl} target="_blank" rel="noopener noreferrer">
        영상 원본 열기
      </a>
      {author && (
        <Button
          variant="outline"
          onClick={async () => {
            if (
              !editing ||
              (await action.confirm(
                "편집을 닫으면 저장하지 않은 내용을 버립니다. 계속할까요?",
              ))
            )
              setEditing((v) => !v);
          }}
        >
          {editing ? "영상 편집 닫기" : "영상 수정"}
        </Button>
      )}
      {editing && author && (
        <VideoForm
          key={video.id}
          initial={video}
          targets={targets.data}
          lockSource={video.everReceivedFeedback || !active}
          save={async (value) => {
            await api(path, value, { method: "PATCH", version: video.version });
            setEditing(false);
            await reload();
          }}
        />
      )}
      {(author || owner) && (
        <Button
          variant="outline"
          disabled={action.busy}
          onClick={async () => {
            if (
              await action.confirm(
                "영상을 삭제하면 연결된 모든 피드백도 삭제됩니다. 외부 원본 영상은 삭제하지 않습니다. 계속할까요?",
              )
            )
              void action.run(async () => {
                await api(path, undefined, {
                  method: "DELETE",
                  version: video.version,
                });
                navigate(`/teams/${teamId}/occurrences/${video.occurrenceId}`);
              });
          }}
        >
          영상 삭제
        </Button>
      )}
      <section className="card stack" style={{ padding: 20 }}>
        <h2>영상 피드백</h2>
        <LoadState resource={feedback} />
        {feedback.data?.length === 0 && <p>첫 피드백을 남겨 보세요.</p>}
        {feedback.data?.map((f) => (
          <FeedbackRow
            key={f.id}
            feedback={f}
            author={f.authorId === profile?.id}
            canDelete={f.authorId === profile?.id || owner}
            path={`${path}/feedback/${f.id}`}
            reload={feedback.reload}
          />
        ))}
        {active ? (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(async () => {
                await api(
                  `${path}/feedback`,
                  { body: body.trim() },
                  { version: video.version },
                );
                clearFeedbackDirty();
                setBody("");
                await Promise.all([feedback.reload(), reload()]);
              });
            }}
          >
            <Field label="피드백 내용">
              <textarea
                className="input"
                required
                maxLength={2000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={action.busy || !body.trim()}>
              피드백 등록
            </Button>
          </form>
        ) : (
          <p>취소된 회차에는 새 피드백을 작성할 수 없습니다.</p>
        )}
      </section>
    </>
  );
}
function VideoForm({
  initial,
  lockSource = false,
  save,
  targets,
}: {
  initial?: Video;
  targets?: Occurrence[];
  lockSource?: boolean;
  save: (value: {
    title: string;
    sourceUrl?: string;
    occurrenceId?: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const action = useAction();
  const [occurrenceId, setOccurrenceId] = useState(initial?.occurrenceId ?? "");
  const clearDirty = useUnsaved(
    occurrenceId !== (initial?.occurrenceId ?? "") ||
      title !== (initial?.title ?? "") ||
      sourceUrl !== (initial?.sourceUrl ?? ""),
    action.busy,
  );
  return (
    <form
      className="card stack"
      style={{ padding: 20 }}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await save({
            title: title.trim(),
            ...(!lockSource
              ? {
                  sourceUrl: sourceUrl.trim(),
                  ...(initial ? { occurrenceId } : {}),
                }
              : {}),
          });
          clearDirty();
          if (!initial) {
            setTitle("");
            setSourceUrl("");
          }
        });
      }}
    >
      <h2>{initial ? "영상 정보 수정" : "영상 추가"}</h2>
      <ErrorNotice message={action.error} />
      <Field label="영상 제목">
        <input
          className="input"
          required
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="영상 HTTPS 주소">
        <input
          className="input"
          required
          type="url"
          pattern="https://.*"
          disabled={lockSource}
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
      </Field>
      {initial && !lockSource && (
        <Field label="영상이 속한 회차">
          <select
            className="input"
            value={occurrenceId}
            onChange={(e) => setOccurrenceId(e.target.value)}
          >
            <option value={initial.occurrenceId}>현재 회차</option>
            {targets
              ?.filter(
                (o) =>
                  o.id !== initial.occurrenceId && o.status === "SCHEDULED",
              )
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} · {displayTime(o.startsAt)}
                </option>
              ))}
          </select>
        </Field>
      )}
      {lockSource && (
        <p>
          피드백이 달린 적이 있거나 취소된 회차의 영상 원본은 변경할 수
          없습니다.
        </p>
      )}
      <Button type="submit" disabled={action.busy || !title.trim()}>
        영상 저장
      </Button>
    </form>
  );
}
function FeedbackRow({
  feedback,
  author,
  canDelete,
  path,
  reload,
}: {
  feedback: Feedback;
  author: boolean;
  canDelete: boolean;
  path: string;
  reload: () => Promise<void>;
}) {
  const action = useAction();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(feedback.body);
  const clearDirty = useUnsaved(editing && body !== feedback.body, action.busy);
  return (
    <article className="stack">
      <p>{feedback.authorDisplayName}</p>
      <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {feedback.body}
      </p>
      <ErrorNotice message={action.error} />
      {author && (
        <Button
          variant="outline"
          onClick={async () => {
            if (
              !editing ||
              (await action.confirm(
                "편집을 닫으면 저장하지 않은 내용을 버립니다. 계속할까요?",
              ))
            )
              setEditing((v) => !v);
          }}
        >
          피드백 수정
        </Button>
      )}
      {editing && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              await api(
                path,
                { body: body.trim() },
                { method: "PATCH", version: feedback.version },
              );
              clearDirty();
              await reload();
            });
          }}
        >
          <Field label="수정할 피드백">
            <textarea
              className="input"
              required
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={action.busy || !body.trim()}>
            피드백 수정 저장
          </Button>
        </form>
      )}
      {canDelete && (
        <Button
          variant="outline"
          disabled={action.busy}
          onClick={async () => {
            if (await action.confirm("이 피드백을 삭제할까요?"))
              void action.run(async () => {
                await api(path, undefined, {
                  method: "DELETE",
                  version: feedback.version,
                });
                clearDirty();
                await reload();
              });
          }}
        >
          피드백 삭제
        </Button>
      )}
    </article>
  );
}
