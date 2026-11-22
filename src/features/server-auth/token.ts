// Capture once before React StrictMode renders; never persist secrets in browser storage.
export function captureLinkToken(
  location: Pick<Location, "pathname" | "hash" | "search">,
  history: Pick<History, "replaceState" | "state">,
): string {
  if (
    !["/verify-email", "/reset-password", "/invite"].includes(location.pathname)
  )
    return "";
  const token = new URLSearchParams(location.hash.slice(1)).get("token") ?? "";
  history.replaceState(history.state, "", location.pathname);
  return token;
}
