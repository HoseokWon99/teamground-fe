export interface Profile {
  id: string;
  displayName: string;
  verifiedEmail: string;
  timezone: string;
  version: number;
  authMethod: "GOOGLE" | "EMAIL";
}
export interface Teamspace {
  id: string;
  name: string;
  description: string | null;
  role: "OWNER" | "MEMBER";
  version: number;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public retryAfter: string | null = null,
  ) {
    super(code);
  }
}
const messages: Record<string, string> = {
  INVITATION_EMAIL_MISMATCH:
    "초대받은 이메일과 현재 계정이 다릅니다. 초대받은 계정으로 다시 로그인해 주세요.",
  INVITATION_NOT_FOUND:
    "초대를 찾을 수 없습니다. 메일의 초대 링크를 다시 확인해 주세요.",
  INVITATION_NOT_PENDING:
    "만료·취소되었거나 새 초대로 대체된 링크입니다. 팀 소유자에게 새 초대를 요청해 주세요.",
  TEAMSPACE_FULL: "팀 정원이 가득 찼습니다. 팀 소유자에게 문의해 주세요.",
  REQUIRED_MEMBER_LEFT:
    "필수 멤버가 팀을 떠났습니다. 이탈한 필수 멤버 대체를 선택한 뒤 현재 멤버를 지정해 주세요.",
  VALIDATION_FAILED: "입력한 기간·시간·조건을 확인해 주세요.",
  INVALID_CREDENTIALS:
    "이메일 또는 비밀번호를 확인해 주세요. Google 가입자는 Google 로그인을 이용해 주세요.",
  INVALID_TOKEN:
    "만료되었거나 이미 사용한 링크입니다. 메일을 다시 요청해 주세요.",
  EMAIL_ALREADY_REGISTERED:
    "이미 가입된 이메일입니다. 기존 로그인 수단을 이용해 주세요.",
  INVALID_EMAIL: "이메일 형식을 확인해 주세요.",
  INVALID_PASSWORD: "비밀번호는 12~128자로 입력해 주세요.",
  ORIGIN_DENIED:
    "현재 사이트 주소가 서버에서 허용되지 않았습니다. 운영자에게 문의해 주세요.",
  INVALID_INPUT: "입력한 내용을 확인해 주세요.",
  RATE_LIMITED: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  AUTH_MAIL_UNAVAILABLE:
    "현재 인증 메일을 보낼 수 없습니다. 잠시 후 다시 시도해 주세요.",
  UPLOAD_INTERRUPTED: "전송이 중단되었습니다. 서버에 저장되었을 수 있으니 최신 목록을 확인한 뒤 다시 시도해 주세요.",
  VIDEO_STORAGE_UNAVAILABLE: "영상 저장소를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  VIDEO_FILE_TOO_LARGE: "영상은 최대 100 MiB까지 업로드할 수 있습니다.",
  INVALID_VIDEO_FILE: "올바른 MP4 또는 WebM 영상 파일을 선택해 주세요.",
  CSRF_DENIED: "보안 확인이 만료되었습니다. 다시 시도해 주세요.",
};
export function explainError(error: unknown): string {
  if (!(error instanceof ApiError))
    return "서버에 연결할 수 없습니다. 연결을 확인하고 다시 시도해 주세요.";
  if (error.status === 401 && error.code !== "INVALID_CREDENTIALS")
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  if (error.status === 403)
    return (
      messages[error.code] ??
      "이 작업을 수행할 권한이 없습니다. 현재 역할을 다시 확인해 주세요."
    );
  if (error.status === 404 && !messages[error.code])
    return "찾을 수 없거나 접근할 수 없는 항목입니다. 목록으로 돌아가 주세요.";
  if (messages[error.code])
    return (
      messages[error.code] +
      (error.status === 429 &&
      error.retryAfter &&
      /^\d+$/.test(error.retryAfter)
        ? ` (${error.retryAfter}초 후 재시도)`
        : "")
    );
  if ([409, 412, 428].includes(error.status))
    return "일정·멤버·항목이 변경되었거나 현재 상태에서는 저장할 수 없습니다. 최신 정보를 다시 불러온 뒤 확인해 주세요.";
  return (
    (messages[error.code] ??
      "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.") +
    (error.status === 429 && error.retryAfter && /^\d+$/.test(error.retryAfter)
      ? ` (${error.retryAfter}초 후 재시도)`
      : "")
  );
}
export async function api<T>(
  path: string,
  body?: unknown,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    version?: number;
  } = {},
): Promise<T> {
  const method = options.method ?? (body === undefined ? "GET" : "POST");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") {
    const csrf = await api<{ token: string }>("/auth/csrf");
    headers["X-CSRF-TOKEN"] = csrf.token;
    headers["Content-Type"] = "application/json";
  }
  if (options.version !== undefined)
    headers["If-Match"] = `"${options.version}"`;
  const response = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    cache: "no-store",
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "SERVER_ERROR",
      response.headers.get("Retry-After"),
    );
  if (!payload || typeof payload !== "object" || !("data" in payload))
    throw new ApiError(502, "INVALID_RESPONSE");
  return payload.data as T;
}
// Only app paths without credentials, query strings or fragments may survive auth.
export function safeReturnTo(value: string | null): string {
  if (
    !value ||
    /[\\?#%\s\u0000-\u001f]/.test(value) ||
    !/^\/(teams(?:\/[^/]+)*|calendar|account|invite)$/.test(value)
  )
    return "/teams";
  return value;
}
export function readReturnTo(value: string | null): string {
  try {
    const path = safeReturnTo(
      value ?? sessionStorage.getItem("teamground.returnTo"),
    );
    sessionStorage.setItem("teamground.returnTo", path);
    return path;
  } catch {
    return safeReturnTo(value);
  }
}
export function enterDemo() {
  try {
    sessionStorage.setItem("teamground.mode", "demo");
    window.location.assign("/login");
  } catch {
    window.alert(
      "브라우저 저장소를 사용할 수 없어 데모 모드를 열 수 없습니다.",
    );
  }
}

export function resolveApiBase(value: string | undefined): string {
  if (value === undefined || value === "") return "/api/v1";
  if (/^\/(?!\/)[A-Za-z0-9/_-]+$/.test(value)) return value.replace(/\/$/, "");
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    )
      return url.href.replace(/\/$/, "");
  } catch {
    /* Invalid configuration is rejected, never replaced with another server. */
  }
  throw new Error(
    "VITE_API_BASE_URL must be a relative path or an HTTPS URL without credentials, query or fragment",
  );
}
export function apiUrl(path: string): string {
  return `${resolveApiBase(import.meta.env.VITE_API_BASE_URL)}${path}`;
}

// XHR exposes upload progress while keeping the existing session/CSRF contract.
export async function uploadVideo<T>(
  path: string,
  value: { title: string; file: File },
  onProgress: (percent: number) => void,
  version?: number,
  signal?: AbortSignal,
): Promise<T> {
  const csrf = await api<{ token: string }>("/auth/csrf");
  if (signal?.aborted) throw new ApiError(0, "UPLOAD_INTERRUPTED");
  const body = new FormData();
  body.append("title", value.title);
  const contentType = value.file.type || (/\.mp4$/i.test(value.file.name) ? "video/mp4" : "video/webm");
  body.append("file", value.file.type ? value.file : new Blob([value.file], { type: contentType }), value.file.name);
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(version === undefined ? "POST" : "PATCH", apiUrl(path));
    xhr.withCredentials = true;
    xhr.timeout = 10 * 60 * 1000;
    const abort = () => xhr.abort();
    signal?.addEventListener("abort", abort, { once: true });
    xhr.onloadend = () => signal?.removeEventListener("abort", abort);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("X-CSRF-TOKEN", csrf.token);
    if (version !== undefined) xhr.setRequestHeader("If-Match", `"${version}"`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    xhr.onerror = xhr.ontimeout = xhr.onabort = () => reject(new ApiError(0, "UPLOAD_INTERRUPTED"));
    xhr.onload = () => {
      let payload;
      try { payload = JSON.parse(xhr.responseText); } catch { /* non-JSON proxy error */ }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError(xhr.status, payload?.error?.code ?? (xhr.status === 413 ? "VIDEO_FILE_TOO_LARGE" : "SERVER_ERROR")));
      } else if (!payload || typeof payload !== "object" || !("data" in payload)) {
        reject(new ApiError(502, "INVALID_RESPONSE"));
      } else resolve(payload.data as T);
    };
    xhr.send(body);
  });
}
