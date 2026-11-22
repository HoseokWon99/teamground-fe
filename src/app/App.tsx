import {
  Component,
  Suspense,
  lazy,
  type ReactNode,
} from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams,
  Link,
} from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { StorageNotice } from "@/components/StorageNotice";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common";
import { UnsavedChangesProvider } from "./unsaved-changes";
const Layout = lazy(() => import("./WorkspaceLayout"));
const LoginPage = lazy(() =>
  import("@/features/auth/pages").then((m) => ({ default: m.LoginPage })),
);
const InvitePage = lazy(() =>
  import("@/features/auth/pages").then((m) => ({ default: m.InvitePage })),
);
const TeamListPage = lazy(() =>
  import("@/features/teams/pages").then((m) => ({ default: m.TeamListPage })),
);
const CreateTeamPage = lazy(() =>
  import("@/features/teams/pages").then((m) => ({ default: m.CreateTeamPage })),
);
const MembersPage = lazy(() =>
  import("@/features/teams/pages").then((m) => ({ default: m.MembersPage })),
);
const TeamHomePage = lazy(() =>
  import("@/features/teams/TeamHome").then((m) => ({
    default: m.TeamHomePage,
  })),
);
const CalendarPage = lazy(() =>
  import("@/features/calendar/pages").then((m) => ({
    default: m.CalendarPage,
  })),
);
const SchedulingPage = lazy(() =>
  import("@/features/scheduling/pages").then((m) => ({
    default: m.SchedulingPage,
  })),
);
const ResultsPage = lazy(() =>
  import("@/features/scheduling/pages").then((m) => ({
    default: m.ResultsPage,
  })),
);
const OccurrencePage = lazy(() =>
  import("@/features/videos/pages").then((m) => ({
    default: m.OccurrencePage,
  })),
);
const VideoPage = lazy(() =>
  import("@/features/videos/pages").then((m) => ({ default: m.VideoPage })),
);
function AuthGuard() {
  const userId = useAppStore((s) => s.sessionUserId);
  const location = useLocation();
  return userId ? (
    <Outlet />
  ) : (
    <Navigate
      to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
      replace
    />
  );
}
function TeamGuard() {
  const { teamId } = useParams();
  const allowed = useAppStore((s) =>
    s.memberships.some(
      (m) => m.userId === s.sessionUserId && m.teamId === teamId,
    ),
  );
  return allowed ? (
    <Outlet />
  ) : (
    <EmptyState
      title="이 팀에 접근할 수 없습니다"
      description="참여 중인 팀을 선택해 주세요."
      action={
        <Button asChild>
          <Link to="/teams">내 팀 목록</Link>
        </Button>
      }
    />
  );
}
function PublicLayout() {
  return (
    <main>
      <StorageNotice />
      <Outlet />
    </main>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="auth-container">
        <EmptyState
          title="화면을 불러오지 못했습니다"
          description="저장된 데이터는 유지됩니다. 새로고침 후 다시 시도해 주세요."
          action={
            <Button onClick={() => window.location.reload()}>새로고침</Button>
          }
        />
      </div>
    ) : (
      this.props.children
    );
  }
}
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<UnsavedChangesProvider />}>
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
      </Route>
      <Route element={<AuthGuard />}>
        <Route element={<Layout />}>
          <Route path="/teams" element={<TeamListPage />} />
          <Route path="/teams/new" element={<CreateTeamPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/teams/:teamId" element={<TeamGuard />}>
            <Route index element={<TeamHomePage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="scheduling" element={<SchedulingPage />} />
            <Route path="scheduling/results" element={<ResultsPage />} />
            <Route
              path="occurrences/:occurrenceId"
              element={<OccurrencePage />}
            />
            <Route
              path="occurrences/:occurrenceId/videos/:videoId"
              element={<VideoPage />}
            />
          </Route>
          <Route
            path="*"
            element={
              <EmptyState
                title="페이지를 찾을 수 없습니다"
                action={
                  <Button asChild>
                    <Link to="/teams">
                      팀으로 돌아가기
                      <ArrowUpRight size={16} />
                    </Link>
                  </Button>
                }
              />
            }
          />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/teams" replace />} />
    </Route>,
  ),
);
export function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="loading">화면을 준비하는 중…</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  );
}
