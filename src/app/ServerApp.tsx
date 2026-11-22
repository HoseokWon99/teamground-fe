import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Navigate, useSearchParams } from "react-router-dom";
import { SessionProvider } from "@/features/server-auth/session";
import { captureLinkToken } from "@/features/server-auth/token";
const token = captureLinkToken(window.location, window.history);
const LoginPage = lazy(() => import("@/features/server-auth/pages").then((m) => ({ default: m.LoginPage })));
const RequestPage = lazy(() => import("@/features/server-auth/pages").then((m) => ({ default: m.RequestPage })));
const TokenPage = lazy(() => import("@/features/server-auth/pages").then((m) => ({ default: m.TokenPage })));
const ServerGuard = lazy(() => import("@/features/server-auth/Workspace").then((m) => ({ default: m.ServerGuard })));
const ServerLayout = lazy(() => import("@/features/server-auth/Workspace").then((m) => ({ default: m.ServerLayout })));
const ServerTeams = lazy(() => import("@/features/server-auth/Workspace").then((m) => ({ default: m.ServerTeams })));
const UnavailablePage = lazy(() => import("@/features/server-auth/Workspace").then((m) => ({ default: m.UnavailablePage })));
function RootRedirect() {
  const [params] = useSearchParams();
  return <Navigate to={params.has("authError") ? `/login?authError=${encodeURIComponent(params.get("authError") ?? "failed")}` : "/teams"} replace />;
}
const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <RequestPage key="signup" signup /> },
  { path: "/forgot-password", element: <RequestPage key="reset" signup={false} /> },
  { path: "/verify-email", element: <TokenPage key="verify" signup token={token} /> },
  { path: "/reset-password", element: <TokenPage key="reset" signup={false} token={token} /> },
  { element: <ServerGuard />, children: [{ element: <ServerLayout />, children: [
    { path: "/teams", element: <ServerTeams /> },
    { path: "*", element: <UnavailablePage /> },
  ] }] },
  { path: "/", element: <RootRedirect /> },
]);
export default function ServerApp() {
  return <SessionProvider><Suspense fallback={<p role="status" className="loading">화면을 준비하는 중…</p>}><RouterProvider router={router} /></Suspense></SessionProvider>;
}
