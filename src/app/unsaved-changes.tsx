import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Outlet, useBlocker, useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type Entry = { dirty: boolean; saving: boolean };
type Coordinator = {
  register: (id: symbol, entry: Entry) => void;
  remove: (id: symbol) => void;
  confirmDiscard: (dirty: boolean, saving?: boolean) => Promise<boolean>;
  runAfterDiscard: (
    action: () => Promise<unknown>,
    destination: string,
  ) => Promise<void>;
};
const Context = createContext<Coordinator | null>(null);

export function UnsavedChangesProvider() {
  const navigate = useNavigate();
  const transition = useRef(false);
  const [transitioning, setTransitioning] = useState(false);
  const entries = useRef(new Map<symbol, Entry>());
  const bypass = useRef(false);
  const [protectedPage, setProtectedPage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<{
    resolve: (allow: boolean) => void;
    saving: boolean;
  } | null>(null);
  const pendingRef = useRef(false);
  const refresh = useCallback(() => {
    const values = [...entries.current.values()];
    setProtectedPage(values.some((entry) => entry.dirty || entry.saving));
    setSaving(values.some((entry) => entry.saving));
  }, []);
  const register = useCallback(
    (id: symbol, entry: Entry) => {
      entries.current.set(id, entry);
      refresh();
    },
    [refresh],
  );
  const remove = useCallback(
    (id: symbol) => {
      entries.current.delete(id);
      refresh();
    },
    [refresh],
  );
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !bypass.current &&
      (transition.current ||
        [...entries.current.values()].some(
          (entry) => entry.dirty || entry.saving,
        )) &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash),
  );
  useEffect(() => {
    if (!protectedPage) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [protectedPage]);
  const confirmDiscard = useCallback(
    (dirty: boolean, isSaving = false): Promise<boolean> => {
      if (!dirty && !isSaving) return Promise.resolve(true);
      if (pendingRef.current) return Promise.resolve(false);
      pendingRef.current = true;
      return new Promise((resolve) =>
        setPending({ resolve, saving: isSaving }),
      );
    },
    [],
  );
  const runAfterDiscard = useCallback(
    async (action: () => Promise<unknown>, destination: string) => {
      if (transition.current) return;
      const values = [...entries.current.values()];
      if (
        !(await confirmDiscard(
          values.some((entry) => entry.dirty),
          values.some((entry) => entry.saving),
        ))
      )
        return;
      if (transition.current) return;
      transition.current = true;
      setTransitioning(true);
      try {
        await action();
        // Only the successful mutation's explicit redirect bypasses the blocker.
        bypass.current = true;
        await navigate(destination);
      } finally {
        bypass.current = false;
        transition.current = false;
        setTransitioning(false);
      }
    },
    [confirmDiscard, navigate],
  );
  const blocked = blocker.state === "blocked";
  const waitingForSave = transitioning || (pending ? pending.saving : saving);
  function answer(allow: boolean) {
    if (transitioning || (allow && waitingForSave)) return;
    if (pending) {
      pending.resolve(allow);
      pendingRef.current = false;
      setPending(null);
    } else if (blocker.state === "blocked") {
      if (allow) blocker.proceed();
      else blocker.reset();
    }
  }
  return (
    <Context.Provider
      value={{ register, remove, confirmDiscard, runAfterDiscard }}
    >
      <Outlet />
      <Modal
        open={blocked || pending !== null || transitioning}
        onOpenChange={(open) => {
          if (!open) answer(false);
        }}
        title={
          waitingForSave ? "저장 중입니다" : "저장하지 않은 내용을 버릴까요?"
        }
        description={
          waitingForSave
            ? "저장이 끝난 후 다시 이동해 주세요."
            : "계속 작성하면 입력한 내용과 현재 화면을 유지합니다."
        }
      >
        <div
          className="row"
          style={{ justifyContent: "flex-end", flexWrap: "wrap" }}
        >
          <Button
            variant="outline"
            disabled={transitioning}
            onClick={() => answer(false)}
          >
            {transitioning ? "처리 중…" : "계속 작성"}
          </Button>
          {!waitingForSave && (
            <Button onClick={() => answer(true)}>버리고 이동</Button>
          )}
        </div>
      </Modal>
    </Context.Provider>
  );
}

export function useUnsavedActions() {
  const context = useContext(Context);
  if (!context) throw new Error("UnsavedChangesProvider is required");
  return context;
}

export function useUnsavedChanges(dirty: boolean, saving = false) {
  const { register, remove } = useUnsavedActions();
  const [id] = useState(() => Symbol("draft"));
  useLayoutEffect(() => {
    register(id, { dirty, saving });
    return () => remove(id);
  }, [id, dirty, saving, register, remove]);
  // Reset the source synchronously before a success redirect; RHF reset renders
  // on the next tick and must not cause a false unsaved-change prompt.
  return useCallback(() => remove(id), [id, remove]);
}
