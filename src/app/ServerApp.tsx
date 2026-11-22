import { ConfirmActionProvider } from "@/features/server-workspace/ConfirmAction";
import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Link,
  useSearchParams,
} from "react-router-dom";
import { UnsavedChangesProvider } from "@/app/unsaved-changes";
import { SessionProvider } from "@/features/server-auth/session";
import { captureLinkToken } from "@/features/server-auth/token";
const token = captureLinkToken(window.location, window.history);
const LoginPage = lazy(() =>
  import("@/features/server-auth/pages").then((m) => ({
    default: m.LoginPage,
  })),
);
const RequestPage = lazy(() =>
  import("@/features/server-auth/pages").then((m) => ({
    default: m.RequestPage,
  })),
);
const TokenPage = lazy(() =>
  import("@/features/server-auth/pages").then((m) => ({
    default: m.TokenPage,
  })),
);
const ServerGuard = lazy(() =>
  import("@/features/server-auth/Workspace").then((m) => ({
    default: m.ServerGuard,
  })),
);
const ServerLayout = lazy(() =>
  import("@/features/server-auth/Workspace").then((m) => ({
    default: m.ServerLayout,
  })),
);
const ServerTeams = lazy(() =>
  import("@/features/server-auth/Workspace").then((m) => ({
    default: m.ServerTeams,
  })),
);
const UnavailablePage = lazy(() =>
  import("@/features/server-auth/Workspace").then((m) => ({
    default: m.UnavailablePage,
  })),
);
const TeamPage = lazy(() =>
  import("@/features/server-workspace/Teams").then((m) => ({
    default: m.TeamPage,
  })),
);
const InvitationPage = lazy(() =>
  import("@/features/server-workspace/Teams").then((m) => ({
    default: m.InvitationPage,
  })),
);
const CalendarPage = lazy(() =>
  import("@/features/server-workspace/Calendar").then((m) => ({
    default: m.CalendarPage,
  })),
);
const SchedulingPage = lazy(() =>
  import("@/features/server-workspace/Scheduling").then((m) => ({
    default: m.SchedulingPage,
  })),
);
const OccurrencePage = lazy(() =>
  import("@/features/server-workspace/Records").then((m) => ({
    default: m.OccurrencePage,
  })),
);
const VideoPage = lazy(() =>
  import("@/features/server-workspace/Records").then((m) => ({
    default: m.VideoPage,
  })),
);
function RootRedirect() {
  const [params] = useSearchParams();
  if (params.has("calendar") || params.has("calendarError"))
    return <Navigate to={`/calendar?${params.toString()}`} replace />;
  return (
    <Navigate
      to={
        params.has("authError")
          ? `/login?authError=${encodeURIComponent(params.get("authError") ?? "failed")}`
          : "/teams"
      }
      replace
    />
  );
}
const NewTeamPage = lazy(() =>
  import("@/features/server-auth/Workspace").then((m) => ({
    default: m.NewTeamPage,
  })),
);
const AccountPage = lazy(() =>
  import("@/features/server-workspace/Account").then((m) => ({
    default: m.AccountPage,
  })),
);
const LegalPage = lazy(() => import("@/features/legal/pages"));
const router = createBrowserRouter(
  [
    { path: "/privacy", element: <LegalPage kind="privacy" /> },
    { path: "/terms", element: <LegalPage kind="terms" /> },
    { path: "/invite", element: <InvitationPage token={token} /> },
    { path: "/login", element: <LoginPage /> },
    { path: "/signup", element: <RequestPage key="signup" signup /> },
    {
      path: "/forgot-password",
      element: <RequestPage key="reset" signup={false} />,
    },
    {
      path: "/verify-email",
      element: <TokenPage key="verify" signup token={token} />,
    },
    {
      path: "/reset-password",
      element: <TokenPage key="reset" signup={false} token={token} />,
    },
    {
      element: <UnsavedChangesProvider />,
      children: [
        {
          element: <ServerGuard />,
          children: [
            {
              element: <ServerLayout />,
              children: [
                { path: "/teams", element: <ServerTeams /> },
                { path: "/teams/new", element: <NewTeamPage /> },
                { path: "/account", element: <AccountPage /> },
                {
                  path: "/teams/:teamId/members",
                  element: <TeamPage membersView />,
                },
                { path: "/calendar", element: <CalendarPage /> },
                { path: "/teams/:teamId", element: <TeamPage /> },
                {
                  path: "/teams/:teamId/scheduling",
                  element: <SchedulingPage />,
                },
                {
                  path: "/teams/:teamId/scheduling/:requestId",
                  element: <SchedulingPage />,
                },
                {
                  path: "/teams/:teamId/occurrences/:occurrenceId",
                  element: <OccurrencePage />,
                },
                {
                  path: "/teams/:teamId/videos/:videoId",
                  element: <VideoPage />,
                },
              ],
            },
          ],
        },
      ],
    },
    { path: "/", element: <RootRedirect /> },
    {
      path: "*",
      element: (
        <main className="auth-container">
          <UnavailablePage />
        </main>
      ),
    },
  ].map((route) => ({
    ...route,
    errorElement: (
      <main className="auth-container stack">
        <h1>화면을 불러오지 못했습니다</h1>
        <p>
          연결을 확인하고 다시 시도해 주세요. 작성 중인 내용은 새로고침하면
          사라질 수 있습니다.
        </p>
        <button onClick={() => window.location.reload()}>다시 불러오기</button>
        <Link to="/teams">내 팀 목록으로</Link>
      </main>
    ),
  })),
);
export default function ServerApp() {
  return (
    <SessionProvider>
      <Suspense
        fallback={
          <p role="status" className="loading">
            화면을 준비하는 중…
          </p>
        }
      >
        <ConfirmActionProvider>
          <RouterProvider router={router} />
        </ConfirmActionProvider>
      </Suspense>
    </SessionProvider>
  );
}
