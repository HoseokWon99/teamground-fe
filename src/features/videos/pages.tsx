import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  MessageSquare,
  Play,
  Plus,
  Video as VideoIcon,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppStore } from "@/stores/app-store";
import { service } from "@/mocks/service";
import {
  Avatar,
  EmptyState,
  ErrorNotice,
  PageHeader,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { displayDate, displayTime } from "@/lib/utils";
import type { Video } from "@/lib/types";
const videoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "영상 제목을 입력해 주세요.")
    .max(100, "100자 이내로 입력해 주세요."),
  url: z
    .string()
    .refine(
      (v) => v === "/demo/rehearsal.webm" || /^https?:\/\//i.test(v),
      "http 또는 https 영상 주소를 입력해 주세요.",
    ),
});
function VideoForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Video;
  onSave: (title: string, url: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");
  const form = useForm<z.infer<typeof videoSchema>>({
    resolver: zodResolver(videoSchema),
    defaultValues: { title: initial?.title || "", url: initial?.url || "" },
  });
  return (
    <form
      className="stack"
      onSubmit={form.handleSubmit(async (v) => {
        setError("");
        try {
          await onSave(v.title, v.url);
        } catch (e) {
          setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
        }
      })}
    >
      <div className="field">
        <label htmlFor="video-title">영상 제목</label>
        <input
          id="video-title"
          className="input"
          placeholder="예: 1막 동선 리허설"
          {...form.register("title")}
        />
        <span className="field-error">
          {form.formState.errors.title?.message}
        </span>
      </div>
      <div className="field">
        <label htmlFor="video-url">영상 주소</label>
        <input
          id="video-url"
          className="input"
          placeholder="https://…"
          {...form.register("url")}
        />
        <span className="field-error">
          {form.formState.errors.url?.message}
        </span>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          form.setValue("url", "/demo/rehearsal.webm", {
            shouldValidate: true,
            shouldDirty: true,
          });
          if (!form.getValues("title"))
            form.setValue("title", "움직임 스터디 · 데모 영상", {
              shouldDirty: true,
            });
        }}
      >
        <VideoIcon size={16} />
        로컬 데모 영상 선택
      </Button>
      <p className="muted" style={{ fontSize: 12 }}>
        외부 영상은 원본 서비스의 접근 설정이 적용됩니다. 데모 영상은 추상적인
        움직임 연습용 샘플입니다. 피드백이 있는 영상은 주소를 변경할 수
        없습니다.
      </p>
      <ErrorNotice message={error} />
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Button
          variant="ghost"
          onClick={() => {
            if (
              !form.formState.isDirty ||
              confirm("작성 중인 내용을 버릴까요?")
            )
              onCancel();
          }}
        >
          취소
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? "저장 중…"
            : initial
              ? "변경 저장"
              : "영상 추가"}
        </Button>
      </div>
    </form>
  );
}
function useLoad() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  function retry() {
    setLoading(true);
    setError("");
    service
      .load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    retry();
  }, []);
  return { error, loading, retry };
}
export function OccurrencePage() {
  const { teamId, occurrenceId } = useParams();
  const state = useAppStore();
  const [open, setOpen] = useState(false);
  const load = useLoad();
  const occurrence = state.occurrences.find(
    (o) => o.id === occurrenceId && o.teamId === teamId,
  );
  if (load.loading)
    return <div className="loading">연습 기록을 불러오는 중…</div>;
  if (load.error)
    return (
      <div className="stack">
        <ErrorNotice message={load.error} />
        <Button onClick={load.retry}>다시 시도</Button>
      </div>
    );
  if (!occurrence)
    return (
      <EmptyState
        title="일정을 찾을 수 없습니다"
        action={
          <Button asChild>
            <Link to={`/teams/${teamId}`}>팀 일정으로</Link>
          </Button>
        }
      />
    );
  const videos = state.videos.filter((v) => v.occurrenceId === occurrence.id);
  const series = state.occurrences
    .filter((o) => o.seriesId === occurrence.seriesId && o.teamId === teamId)
    .sort((a, b) => a.start.localeCompare(b.start));
  const index = series.findIndex((o) => o.id === occurrence.id);
  return (
    <>
      <Link className="back-link" to={`/teams/${teamId}`}>
        <ArrowLeft size={14} />팀 일정으로 돌아가기
      </Link>
      <PageHeader
        eyebrow="REHEARSAL RECORD"
        title={occurrence.title}
        description={`${displayDate(occurrence.start)} · ${displayTime(occurrence.start)}–${displayTime(occurrence.end)} · Asia/Seoul`}
        action={
          <span className="badge">
            {occurrence.index} / {occurrence.total} 회차
          </span>
        }
      />
      <div className="hero-strip" style={{ marginBottom: 28 }}>
        <div>
          <p className="eyebrow">OUR NEXT SCENE</p>
          <h2>함께 연습하고, 더 나은 장면으로.</h2>
          <p className="muted">
            이번 회차의 영상을 모으고 팀의 생각을 나눠보세요.
          </p>
        </div>
        <div className="hero-art" />
      </div>
      <div className="detail-grid">
        <section className="stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2>
              연습 영상 <span className="muted">{videos.length}</span>
            </h2>
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} />
              영상 추가
            </Button>
          </div>
          {videos.length ? (
            <div
              className="video-grid"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(min(230px,100%),1fr))",
              }}
            >
              {videos.map((v) => (
                <Link
                  className="card video-card"
                  key={v.id}
                  to={`/teams/${teamId}/occurrences/${occurrenceId}/videos/${v.id}`}
                >
                  <div className="video-thumb">
                    <Play className="play" size={53} />
                  </div>
                  <div className="video-card-info">
                    <h3>{v.title}</h3>
                    <div className="meta">
                      <span>
                        {state.users.find((u) => u.id === v.authorId)?.name}
                      </span>
                      <MessageSquare size={13} />
                      {state.feedback.filter((f) => f.videoId === v.id).length}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="첫 연습 영상을 남겨보세요"
              description="이 회차에 등록한 영상과 피드백을 한곳에서 확인할 수 있어요."
              action={
                <Button variant="outline" onClick={() => setOpen(true)}>
                  영상 추가
                </Button>
              }
            />
          )}
          <div className="row" style={{ justifyContent: "space-between" }}>
            {series[index - 1] ? (
              <Button asChild variant="outline">
                <Link
                  to={`/teams/${teamId}/occurrences/${series[index - 1].id}`}
                >
                  <ArrowLeft size={15} />
                  이전 회차
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {series[index + 1] && (
              <Button asChild variant="outline">
                <Link
                  to={`/teams/${teamId}/occurrences/${series[index + 1].id}`}
                >
                  다음 회차
                  <ArrowRight size={15} />
                </Link>
              </Button>
            )}
          </div>
        </section>
        <aside className="card stack" style={{ alignSelf: "start" }}>
          <h3>이번 연습</h3>
          <div className="meta">
            <CalendarDays size={16} />
            {displayDate(occurrence.start)}
          </div>
          <div className="meta">
            <Clock3 size={16} />
            {displayTime(occurrence.start)}–{displayTime(occurrence.end)}
          </div>
          <hr style={{ border: 0, borderTop: "1px solid #edf0e8" }} />
          <h3>참석 가능 멤버</h3>
          <p className="muted" style={{ fontSize: 12 }}>
            일정 확정 시점의 정보이며 실제 출석 응답이 아닙니다.
          </p>
          {occurrence.attendance.map((a) => (
            <div className="row" key={a.userId}>
              <Avatar user={state.users.find((u) => u.id === a.userId)} />
              <span style={{ flex: 1 }}>
                {state.users.find((u) => u.id === a.userId)?.name}
              </span>
              <span className="badge">
                {a.status === "available"
                  ? "가능"
                  : a.status === "busy"
                    ? "불가"
                    : "확인 필요"}
              </span>
            </div>
          ))}
          {occurrence.revision !== state.revision && (
            <p className="muted" style={{ fontSize: 12 }}>
              확정 이후 일정 정보가 변경되었습니다. 위 정보는 확정 당시
              기준입니다.
            </p>
          )}
        </aside>
      </div>
      <Modal
        open={open}
        onOpenChange={(v) => {
          if (
            !v &&
            !confirm("영상 추가를 닫을까요? 입력한 내용은 저장되지 않습니다.")
          )
            return;
          setOpen(v);
        }}
        title="연습 영상 추가"
        description="이 회차에 연결할 영상을 등록하세요."
      >
        <VideoForm
          onCancel={() => setOpen(false)}
          onSave={async (title, url) => {
            await service.addVideo(occurrence.id, title, url);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
}
const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "피드백을 입력해 주세요.")
    .max(2000, "2,000자 이내로 입력해 주세요."),
});
export function VideoPage() {
  const { teamId, occurrenceId, videoId } = useParams();
  const state = useAppStore();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editVideo, setEditVideo] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [failed, setFailed] = useState(false);
  const form = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "" },
  });
  const load = useLoad();
  const occurrence = state.occurrences.find(
    (o) => o.id === occurrenceId && o.teamId === teamId,
  );
  const video = state.videos.find(
    (v) => v.id === videoId && v.occurrenceId === occurrence?.id,
  );
  const comments = state.feedback
    .filter((f) => f.videoId === videoId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  if (load.loading) return <div className="loading">영상을 불러오는 중…</div>;
  if (load.error)
    return (
      <div className="stack">
        <ErrorNotice message={load.error} />
        <Button onClick={load.retry}>다시 시도</Button>
      </div>
    );
  if (!video || !occurrence)
    return (
      <EmptyState
        title="영상을 찾을 수 없습니다"
        action={
          <Button asChild>
            <Link to={`/teams/${teamId}`}>팀 일정으로</Link>
          </Button>
        }
      />
    );
  const back = `/teams/${teamId}/occurrences/${occurrenceId}`;
  const playable =
    video.url === "/demo/rehearsal.webm" ||
    /\.(mp4|webm)(\?.*)?$/i.test(video.url);
  return (
    <>
      <Link className="back-link" to={back}>
        <ArrowLeft size={14} />
        {occurrence.title} · {occurrence.index}회차
      </Link>
      <PageHeader
        eyebrow="WATCH & REFLECT"
        title={video.title}
        description={`${state.users.find((u) => u.id === video.authorId)?.name} 등록 · ${displayDate(video.createdAt)}`}
        action={
          video.authorId === state.sessionUserId ? (
            <div className="row">
              <Button variant="outline" onClick={() => setEditVideo(true)}>
                <Pencil size={14} />
                수정
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      "영상과 연결된 피드백이 함께 삭제됩니다. 삭제할까요?",
                    )
                  )
                    void action(async () => {
                      await service.deleteVideo(video.id);
                      navigate(back);
                    });
                }}
              >
                <Trash2 size={14} />
                삭제
              </Button>
            </div>
          ) : undefined
        }
      />
      <ErrorNotice message={error} />
      <div className="stack">
        <section className="card" style={{ padding: 12 }}>
          {playable && !failed ? (
            <video
              className="video-player"
              src={
                video.url === "/demo/rehearsal.webm"
                  ? "/demo/rehearsal.mp4"
                  : video.url
              }
              poster={
                video.url.startsWith("/demo/") ? "/demo/poster.jpg" : undefined
              }
              controls
              preload="auto"
              onError={() => setFailed(true)}
              aria-label={video.title}
            />
          ) : (
            <EmptyState
              title={
                failed
                  ? "영상을 재생할 수 없습니다"
                  : "원본 서비스에서 영상을 확인해 주세요"
              }
              description="기존 피드백은 아래에서 계속 확인할 수 있습니다."
              action={
                <Button asChild variant="outline">
                  <a href={video.url} target="_blank" rel="noreferrer">
                    원본 열기
                    <ExternalLink size={15} />
                  </a>
                </Button>
              }
            />
          )}
          <div className="meta" style={{ padding: "12px 5px 2px" }}>
            <VideoIcon size={14} />
            {video.url.startsWith("/demo/")
              ? "로컬 데모 · 추상 동선 샘플 · 8초"
              : "외부 영상 · 원본 서비스의 접근 권한이 적용됩니다"}
          </div>
        </section>
        <section className="card">
          <h2>
            피드백 <span className="muted">{comments.length}</span>
          </h2>
          <p className="muted" style={{ marginTop: 6, marginBottom: 20 }}>
            좋았던 순간부터, 함께 다듬고 싶은 장면까지.
          </p>
          {comments.length ? (
            comments.map((c) => (
              <article className="comment" key={c.id}>
                <Avatar user={state.users.find((u) => u.id === c.authorId)} />
                <div className="comment-content">
                  <div
                    className="row"
                    style={{ justifyContent: "space-between" }}
                  >
                    <div className="row">
                      <strong>
                        {state.users.find((u) => u.id === c.authorId)?.name}
                      </strong>
                      <span className="meta">
                        {displayDate(c.createdAt)}
                        {c.updatedAt ? " · 수정됨" : ""}
                      </span>
                    </div>
                    {c.authorId === state.sessionUserId && (
                      <div className="row">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(c.id);
                            setEditBody(c.body);
                          }}
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            if (confirm("피드백을 삭제할까요?"))
                              void action(() => service.deleteFeedback(c.id));
                          }}
                        >
                          삭제
                        </Button>
                      </div>
                    )}
                  </div>
                  {editing === c.id ? (
                    <div className="stack">
                      <textarea
                        aria-label="피드백 수정"
                        className="textarea"
                        value={editBody}
                        maxLength={2000}
                        onChange={(e) => setEditBody(e.target.value)}
                      />
                      <div className="row">
                        <Button
                          disabled={busy || !editBody.trim()}
                          onClick={() =>
                            void action(async () => {
                              await service.updateFeedback(c.id, editBody);
                              setEditing(null);
                            })
                          }
                        >
                          수정 저장
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setEditing(null)}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-body">{c.body}</p>
                  )}
                </div>
              </article>
            ))
          ) : (
            <p className="muted" style={{ padding: "25px 0" }}>
              첫 피드백을 남겨보세요.
            </p>
          )}
          <form
            className="stack"
            style={{ marginTop: 24 }}
            onSubmit={form.handleSubmit(async ({ body }) => {
              setError("");
              try {
                await service.addFeedback(video.id, body);
                form.reset();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "저장하지 못했습니다.",
                );
              }
            })}
          >
            <div className="field">
              <label htmlFor="feedback-body">이 영상에 대한 피드백</label>
              <textarea
                id="feedback-body"
                className="textarea"
                placeholder="함께 나누고 싶은 생각을 남겨주세요."
                {...form.register("body")}
              />
              <span className="field-error">
                {form.formState.errors.body?.message}
              </span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted" style={{ fontSize: 12 }}>
                최대 2,000자 · 팀 멤버에게만 표시
              </span>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "등록 중…" : "피드백 등록"}
              </Button>
            </div>
          </form>
        </section>
      </div>
      <Modal open={editVideo} onOpenChange={setEditVideo} title="영상 수정">
        <VideoForm
          initial={video}
          onCancel={() => setEditVideo(false)}
          onSave={async (title, url) => {
            await service.updateVideo(video.id, title, url);
            setEditVideo(false);
            setFailed(false);
          }}
        />
      </Modal>
    </>
  );
}
