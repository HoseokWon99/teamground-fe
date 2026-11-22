import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import type { Data } from "@/lib/types";
import { createSeed } from "@/mocks/seed";
import {
  normalizePersistedData,
  validPersistedData,
} from "./persistence-schema";
import { setStorageWarning } from "./storage-warning";
export { storageWarning } from "./storage-warning";

export const STORAGE_KEY = "teamground-prototype-v1";
const unavailable =
  "브라우저 저장소를 사용할 수 없어 이번 실행에서만 데이터를 유지합니다. 새로고침하면 변경 내용이 사라질 수 있습니다.";
const invalid =
  "저장 데이터를 복원할 수 없어 기본 데모로 시작합니다. 기존 저장 데이터는 보존하며 이번 실행의 변경은 저장하지 않습니다.";
type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createAppStore(
  getStorage: () => BrowserStorage | undefined = () => globalThis.localStorage,
) {
  // A failed read must never turn a later write into silent replacement of unread data.
  let preserveStoredData = false;
  const storage: StateStorage = {
    getItem(name) {
      try {
        const target = getStorage();
        if (!target) {
          preserveStoredData = true;
          setStorageWarning(unavailable);
          return null;
        }
        const raw = target.getItem(name);
        if (raw === null) return null;
        const envelope: unknown = JSON.parse(raw);
        if (
          typeof envelope !== "object" ||
          envelope === null ||
          !("version" in envelope) ||
          envelope.version !== 1 ||
          !("state" in envelope) ||
          !validPersistedData(envelope.state)
        ) {
          preserveStoredData = true;
          setStorageWarning(invalid);
          return null;
        }
        return raw;
      } catch {
        preserveStoredData = true;
        setStorageWarning(invalid + " 브라우저 저장소 접근도 확인해 주세요.");
        return null;
      }
    },
    setItem(name, value) {
      if (preserveStoredData) return;
      try {
        const target = getStorage();
        if (!target) {
          setStorageWarning(unavailable);
          return;
        }
        target.setItem(name, value);
      } catch {
        setStorageWarning(
          "브라우저 저장에 실패했습니다. 변경 내용은 이번 실행에서만 유지되며 새로고침하면 사라질 수 있습니다.",
        );
      }
    },
    removeItem(name) {
      try {
        const target = getStorage();
        if (!target) {
          setStorageWarning(unavailable);
          return;
        }
        target.removeItem(name);
        preserveStoredData = false;
        setStorageWarning("");
      } catch {
        setStorageWarning(
          "브라우저 저장 데이터를 삭제하지 못했습니다. 기존 저장 데이터가 남아 있습니다.",
        );
      }
    },
  };
  const store = create<Data>()(
    persist(() => createSeed(), {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => storage),
      merge(persisted, current) {
        return validPersistedData(persisted)
          ? { ...persisted, failNext: false }
          : current;
      },
    }),
  );
  return Object.assign(store, {
    replaceStoredData() {
      try {
        const target = getStorage();
        if (!target) {
          setStorageWarning(unavailable);
          return false;
        }
        const state = normalizePersistedData(store.getState());
        if (!state) {
          setStorageWarning(
            "현재 실행 데이터의 형식을 확인할 수 없어 저장하지 않았습니다. 기존 저장 데이터는 보존합니다.",
          );
          return false;
        }
        target.setItem(STORAGE_KEY, JSON.stringify({ state, version: 1 }));
        preserveStoredData = false;
        setStorageWarning("");
        return true;
      } catch {
        setStorageWarning(
          "브라우저 저장을 복구하지 못했습니다. 이번 실행의 데이터는 유지됩니다. 저장소 설정이나 용량을 확인한 뒤 다시 시도해 주세요.",
        );
        return false;
      }
    },
  });
}
export const useAppStore = createAppStore();
