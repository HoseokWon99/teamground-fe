import { create } from "zustand";

// Retained for existing non-React callers. UI must subscribe to useStorageWarning.
export let storageWarning = "";
export const useStorageWarning = create<{ message: string }>(() => ({
  message: "",
}));
export function setStorageWarning(message: string) {
  storageWarning = message;
  useStorageWarning.setState({ message });
}
