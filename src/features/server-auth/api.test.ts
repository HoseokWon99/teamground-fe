import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, explainError, safeReturnTo } from "./api";
import { captureLinkToken } from "./token";
afterEach(() => vi.unstubAllGlobals());
describe("server authentication", () => {
  it("rejects external, encoded and secret-bearing return paths", () => {
    for (const path of ["//evil.test", "https://evil.test", "/\\evil", "/teams?token=secret", "/reset-password#token=secret", "/teams/%2e%2e/login", "/login", "/teams\n"]) expect(safeReturnTo(path)).toBe("/teams");
    expect(safeReturnTo("/teams/abc")).toBe("/teams/abc");
    expect(safeReturnTo("/invite/abc_123")).toBe("/teams");
  });
  it("gets fresh CSRF before each mutation and uses cookie credentials", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: { token: "csrf" } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await api("/auth/email/verify", { token: "secret", password: "password with spaces" });
    expect(fetch.mock.calls[0][0]).toBe("/api/v1/auth/csrf");
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: "POST", credentials: "include", headers: { "X-CSRF-TOKEN": "csrf" }, body: JSON.stringify({ token: "secret", password: "password with spaces" }) });
  });
  it("does not attempt mutation when CSRF endpoint fails", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503 })); vi.stubGlobal("fetch", fetch);
    await expect(api("/auth/email/signup", {})).rejects.toBeInstanceOf(ApiError); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("handles rate limit and missing mail configuration without claiming success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { code: "RATE_LIMITED" } }, { status: 429, headers: { "Retry-After": "60" } })));
    try { await api("/me"); } catch (e) { expect(explainError(e)).toContain("60초"); }
    expect(explainError(new ApiError(503, "AUTH_MAIL_UNAVAILABLE"))).toContain("보낼 수 없습니다");
  });
  it("captures fragment token and clears the URL without consuming it", () => {
    const history = { state: { key: "route" }, replaceState: vi.fn() };
    expect(captureLinkToken({ pathname: "/verify-email", hash: "#token=secret", search: "?unsafe=x" }, history)).toBe("secret");
    expect(history.replaceState).toHaveBeenCalledWith(history.state, "", "/verify-email");
    expect(captureLinkToken({ pathname: "/verify-email", hash: "", search: "" }, history)).toBe("");
  });
});
