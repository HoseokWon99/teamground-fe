import { useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ErrorNotice, PageHeader } from "@/components/common";
import { api, apiUrl, enterDemo, explainError, readReturnTo, type Profile } from "./api";
import { useSession } from "./session";
const email = z.string().trim().toLowerCase().email("올바른 이메일을 입력해 주세요.");
const password = z.string().refine((v) => Array.from(v).length >= 12 && Array.from(v).length <= 128, "비밀번호는 12~128자로 입력해 주세요.");
const loginSchema = z.object({ email, password: z.string().min(1, "비밀번호를 입력해 주세요.") });
const requestSchema = z.object({ email, displayName: z.string().trim().refine((v) => Array.from(v).length <= 30, "이름은 30자 이하로 입력해 주세요.") });
const tokenSchema = z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "비밀번호가 일치하지 않습니다." });
export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return <main className="auth-container" style={{ maxWidth: 560, margin: "32px auto", padding: 20 }}><section className="card stack" style={{ padding: 28 }}>
    <Link to="/login" className="eyebrow">TEAMGROUND</Link><PageHeader title={title} />{children}
  </section></main>;
}
function FieldError({ id, message }: { id: string; message?: string }) { return message ? <p id={id} className="error-notice" role="alert">{message}</p> : null; }
export function LoginPage() {
  const { setProfile } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [returnTo] = useState(() => readReturnTo(params.get("returnTo")));
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  return <AuthFrame title="로그인">
    {params.get("completed") && <p role="status">{params.get("completed") === "signup" ? "가입이 완료되었습니다." : "비밀번호를 변경했습니다. 모든 기존 세션이 종료되었습니다."} 로그인해 주세요.</p>}
    {params.get("authError") && <ErrorNotice message="Google 로그인을 완료하지 못했습니다. 다시 시도해 주세요." />}
    <form className="stack" noValidate onSubmit={handleSubmit(async (values) => {
      setError("");
      try { setProfile(await api<Profile>("/auth/email/login", values)); navigate(returnTo, { replace: true }); }
      catch (e) { setError(explainError(e)); }
    })}>
      <label htmlFor="email">이메일</label><input className="input" id="email" type="email" autoComplete="username" {...register("email")} aria-invalid={!!errors.email} aria-describedby="email-error" />
      <FieldError id="email-error" message={errors.email?.message} />
      <label htmlFor="password">비밀번호</label><input className="input" id="password" type="password" autoComplete="current-password" {...register("password")} aria-invalid={!!errors.password} aria-describedby="password-error" />
      <FieldError id="password-error" message={errors.password?.message} /><ErrorNotice message={error} />
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "로그인 중…" : "이메일로 로그인"}</Button>
    </form>
    <Button asChild variant="outline"><a href={apiUrl(`/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`)}>Google로 로그인</a></Button>
    <div className="row" style={{ flexWrap: "wrap" }}><Link to="/signup">회원가입</Link><Link to="/forgot-password">비밀번호 찾기</Link></div>
    <Button variant="ghost" onClick={enterDemo}>데모 체험하기</Button><p className="muted">데모는 실제 계정과 분리된 브라우저 내 체험입니다.</p>
  </AuthFrame>;
}
export function RequestPage({ signup }: { signup: boolean }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const schema = signup ? requestSchema.refine((v) => v.displayName.length > 0, { path: ["displayName"], message: "이름을 입력해 주세요." }) : requestSchema;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", displayName: "" } });
  return <AuthFrame title={signup ? "이메일 회원가입" : "비밀번호 찾기"}>
    <p>{signup ? "이름과 이메일을 입력하면 가입 링크를 요청합니다. 이메일 확인 후 비밀번호를 설정합니다." : "이메일을 입력하면 비밀번호 재설정 링크를 요청합니다."}</p>
    <form className="stack" noValidate onSubmit={handleSubmit(async (values) => {
      setError(""); setSent(false);
      try { await api(signup ? "/auth/email/signup" : "/auth/password/reset-request", signup ? values : { email: values.email }); setSent(true); }
      catch (e) { setError(explainError(e)); }
    })}>
      {signup && <><label htmlFor="displayName">이름</label><input className="input" id="displayName" autoComplete="name" {...register("displayName")} aria-invalid={!!errors.displayName} aria-describedby="name-error" /><FieldError id="name-error" message={errors.displayName?.message} /></>}
      <label htmlFor="email">이메일</label><input className="input" id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} aria-describedby="email-error" /><FieldError id="email-error" message={errors.email?.message} />
      <ErrorNotice message={error} /><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "요청 중…" : sent ? "메일 다시 요청" : signup ? "가입 메일 요청" : "재설정 메일 요청"}</Button>
    </form>
    {sent && <p role="status">요청을 확인했습니다. 이메일을 확인해 주세요.</p>}
    <p className="muted">이미 가입했다면 기존 로그인 수단을 이용해 주세요. Google 가입자는 Google로 로그인해 주세요.</p><Link to="/login">로그인으로 돌아가기</Link>
  </AuthFrame>;
}
export function TokenPage({ signup, token }: { signup: boolean; token: string }) {
  const { setProfile } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(tokenSchema), defaultValues: { password: "", confirm: "" } });
  return <AuthFrame title={signup ? "이메일 확인 · 가입 완료" : "새 비밀번호 설정"}>
    {!token ? <><ErrorNotice message="메일의 링크를 다시 열어 주세요. 새로고침하면 보안을 위해 링크 정보가 사라집니다." /><Link to={signup ? "/signup" : "/forgot-password"}>메일 다시 요청하기</Link></> : <>
      <p>새 비밀번호를 12~128자로 입력해 주세요. 공백도 비밀번호에 포함됩니다.</p>
      <form className="stack" noValidate onSubmit={handleSubmit(async ({ password }) => {
        setError("");
        try { await api(signup ? "/auth/email/verify" : "/auth/password/reset", { token, password }); if (!signup) setProfile(null); reset(); navigate(`/login?completed=${signup ? "signup" : "reset"}`, { replace: true }); }
        catch (e) { setError(explainError(e)); }
      })}>
        <label htmlFor="password">새 비밀번호</label><input className="input" id="password" type="password" autoComplete="new-password" {...register("password")} aria-invalid={!!errors.password} aria-describedby="password-error" /><FieldError id="password-error" message={errors.password?.message} />
        <label htmlFor="confirm">비밀번호 확인</label><input className="input" id="confirm" type="password" autoComplete="new-password" {...register("confirm")} aria-invalid={!!errors.confirm} aria-describedby="confirm-error" /><FieldError id="confirm-error" message={errors.confirm?.message} />
        <ErrorNotice message={error} /><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "저장 중…" : signup ? "가입 완료" : "비밀번호 변경"}</Button>
      </form><Link to={signup ? "/signup" : "/forgot-password"}>새 링크 요청하기</Link>
    </>}<Link to="/login">로그인으로 돌아가기</Link>
  </AuthFrame>;
}
