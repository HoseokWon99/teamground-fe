import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, explainError, type Profile } from "./api";
const Context = createContext<{
  profile: Profile | null; loading: boolean; error: string;
  refresh: () => Promise<void>; setProfile: (profile: Profile | null) => void;
} | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [profile, updateProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const setProfile = useCallback((next: Profile | null) => {
    generation.current += 1;
    updateProfile(next);
    setLoading(false);
    setError("");
  }, []);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError("");
    try { const next = await api<Profile>("/me"); if (request === generation.current) updateProfile(next); }
    catch (e) {
      if (request !== generation.current) return;
      updateProfile(null);
      if (!(e instanceof ApiError && e.status === 401)) setError(explainError(e));
    } finally { if (request === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return <Context.Provider value={{ profile, loading, error, refresh, setProfile }}>{children}</Context.Provider>;
}
export function useSession() {
  const context = useContext(Context);
  if (!context) throw new Error("SessionProvider required");
  return context;
}
