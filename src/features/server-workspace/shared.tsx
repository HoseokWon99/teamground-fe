import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useUnsavedChanges } from "@/app/unsaved-changes";
import { ErrorNotice } from "@/components/common";
import { Button } from "@/components/ui/button";
import { api, ApiError, explainError } from "@/features/server-auth/api";
import { useSession } from "@/features/server-auth/session";
export const teamPath = (id: string) => `/teamspaces/${encodeURIComponent(id)}`;
export function useResource<T>(path: string) {
  const { setProfile } = useSession();
  const [state, setState] = useState<{
    path: string;
    data?: T;
    error: string;
    loading: boolean;
  }>({ path, error: "", loading: true });
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setState((previous) => ({
      path,
      data: previous.path === path ? previous.data : undefined,
      error: "",
      loading: true,
    }));
    try {
      const data = await api<T>(path);
      if (current === generation.current)
        setState({ path, data, error: "", loading: false });
    } catch (e) {
      if (current !== generation.current) return;
      if (e instanceof ApiError && e.status === 401) setProfile(null);
      setState((previous) => ({
        path,
        data:
          previous.path === path &&
          !(e instanceof ApiError && [401, 403, 404].includes(e.status))
            ? previous.data
            : undefined,
        error: explainError(e),
        loading: false,
      }));
    }
  }, [path, setProfile]);
  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return {
    data: state.path === path ? state.data : undefined,
    error: state.path === path ? state.error : "",
    loading: state.path !== path || state.loading,
    reload,
  };
}
export function useAction() {
  const { setProfile } = useSession();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (work: () => Promise<unknown>) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setProfile(null);
      setError(explainError(e));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { busy, error, run };
}
export function LoadState({
  resource,
}: {
  resource: { loading: boolean; error: string; reload: () => Promise<void> };
}) {
  return (
    <>
      {resource.loading && <p role="status">불러오는 중…</p>}
      <ErrorNotice message={resource.error} />
      {resource.error && (
        <Button onClick={() => void resource.reload()}>다시 불러오기</Button>
      )}
    </>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="stack" style={{ gap: 4 }}>
      {label}
      {children}
    </label>
  );
}
export const inputClass = "input";
export const dateToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
export function dateRange(from: string, to: string) {
  const end = new Date(`${to}T00:00:00+09:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return new URLSearchParams({
    from: new Date(`${from}T00:00:00+09:00`).toISOString(),
    to: end.toISOString(),
  }).toString();
}
export const displayTime = (value: string) =>
  new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
export function localTime(value: string) {
  const d = new Date(new Date(value).getTime() + 9 * 3600000);
  return d.toISOString().slice(0, 16);
}
export function toInstant(value: string) {
  return new Date(`${value}:00+09:00`).toISOString();
}
export function useUnsaved(dirty: boolean, saving = false) {
  return useUnsavedChanges(dirty, saving);
}
export function dateAfter(days: number, start = dateToday()) {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
