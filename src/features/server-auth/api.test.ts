import { afterEach, describe, expect, it, vi } from "vitest";
import {
  api,
  ApiError,
  explainError,
  safeReturnTo,
  resolveApiBase,
} from "./api";
import { captureLinkToken } from "./token";
afterEach(() => vi.unstubAllGlobals());
describe("server authentication", () => {
  it("rejects external, encoded and secret-bearing return paths", () => {
    for (const path of [
      "//evil.test",
      "https://evil.test",
      "/\\evil",
      "/teams?token=secret",
      "/reset-password#token=secret",
      "/teams/%2e%2e/login",
      "/login",
      "/teams\n",
    ])
      expect(safeReturnTo(path)).toBe("/teams");
    expect(safeReturnTo("/teams/abc")).toBe("/teams/abc");
    expect(safeReturnTo("/invite/abc_123")).toBe("/teams");
  });
  it("gets fresh CSRF before each mutation and uses cookie credentials", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: { token: "csrf" } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await api("/auth/email/verify", {
      token: "secret",
      password: "password with spaces",
    });
    expect(fetch.mock.calls[0][0]).toBe("/api/v1/auth/csrf");
    expect(fetch.mock.calls[1][1]).toMatchObject({
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-TOKEN": "csrf" },
      body: JSON.stringify({
        token: "secret",
        password: "password with spaces",
      }),
    });
  });
  it("does not attempt mutation when CSRF endpoint fails", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: { code: "SERVICE_UNAVAILABLE" } },
          { status: 503 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(api("/auth/email/signup", {})).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("handles rate limit and missing mail configuration without claiming success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: "RATE_LIMITED" } },
            { status: 429, headers: { "Retry-After": "60" } },
          ),
        ),
    );
    try {
      await api("/me");
    } catch (e) {
      expect(explainError(e)).toContain("60초");
    }
    expect(explainError(new ApiError(503, "AUTH_MAIL_UNAVAILABLE"))).toContain(
      "보낼 수 없습니다",
    );
  });
  it("captures fragment token and clears the URL without consuming it", () => {
    const history = { state: { key: "route" }, replaceState: vi.fn() };
    expect(
      captureLinkToken(
        {
          pathname: "/verify-email",
          hash: "#token=secret",
          search: "?unsafe=x",
        },
        history,
      ),
    ).toBe("secret");
    expect(history.replaceState).toHaveBeenCalledWith(
      history.state,
      "",
      "/verify-email",
    );
    expect(
      captureLinkToken(
        { pathname: "/verify-email", hash: "", search: "" },
        history,
      ),
    ).toBe("");
  });
});

describe("versioned server transport", () => {
  it.each(["PATCH", "PUT", "DELETE"] as const)(
    "sends fresh CSRF and quoted If-Match for %s including bodyless delete",
    async (method) => {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(Response.json({ data: { token: "csrf-2" } }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }));
      vi.stubGlobal("fetch", fetch);
      await api(
        "/teamspaces/space/videos/video",
        method === "DELETE" ? undefined : { title: "수정" },
        { method, version: 0 },
      );
      expect(fetch.mock.calls[1][1]).toMatchObject({
        method,
        credentials: "include",
        headers: { "If-Match": '"0"', "X-CSRF-TOKEN": "csrf-2" },
      });
      expect(fetch.mock.calls[1][1].body).toBe(
        method === "DELETE" ? undefined : JSON.stringify({ title: "수정" }),
      );
    },
  );
  it("surfaces version conflict without retrying or falling back", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: { token: "csrf" } }))
      .mockResolvedValueOnce(
        Response.json({ error: { code: "VERSION_MISMATCH" } }, { status: 412 }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(
      api(
        "/me/personal-events/event",
        { title: "unsaved" },
        { method: "PATCH", version: 1 },
      ),
    ).rejects.toMatchObject({ status: 412 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(explainError(new ApiError(412, "VERSION_MISMATCH"))).toContain(
      "최신 정보",
    );
  });
  it("rejects malformed successful responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ notData: [] })),
    );
    await expect(api("/teamspaces")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
  it("strips invitation fragments before rendering without storing them", () => {
    const history = { state: null, replaceState: vi.fn() };
    expect(
      captureLinkToken(
        { pathname: "/invite", hash: "#token=private", search: "" },
        history,
      ),
    ).toBe("private");
    expect(history.replaceState).toHaveBeenCalledWith(null, "", "/invite");
  });
});

describe("API deployment configuration", () => {
  it("uses local proxy by default and accepts same-site HTTPS backend", () => {
    expect(resolveApiBase(undefined)).toBe("/api/v1");
    expect(resolveApiBase("https://jointeamground.com/api/v1/")).toBe(
      "https://jointeamground.com/api/v1",
    );
  });
  it.each([
    "//evil.test",
    "http://jointeamground.com/api/v1",
    "https://user:secret@example.com/api/v1",
    "https://example.com/api/v1?secret=1",
    "https://example.com/#fragment",
    "not-a-url",
  ])("rejects invalid base without silent fallback: %s", (base) => {
    expect(() => resolveApiBase(base)).toThrow();
  });
});
