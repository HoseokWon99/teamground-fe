import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
// Only explicit demo entry can activate the legacy local-data application.
let demo = false;
try {
  if (["/signup", "/verify-email", "/forgot-password", "/reset-password"].includes(location.pathname)) sessionStorage.removeItem("teamground.mode");
  demo = sessionStorage.getItem("teamground.mode") === "demo";
} catch { /* Storage unavailable: the server app still works. */ }
const App = demo ? lazy(() => import("./app/App").then((m) => ({ default: m.App }))) : lazy(() => import("./app/ServerApp"));
createRoot(document.getElementById("root")!).render(
  <StrictMode><Suspense fallback={<p role="status">화면을 준비하는 중…</p>}>
    {demo && <div className="row" style={{ padding: 12, background: "#f1f6ed", justifyContent: "center" }}><span>데모 모드 · 실제 계정과 분리됩니다</span><button onClick={() => { sessionStorage.removeItem("teamground.mode"); location.assign("/login"); }}>실제 계정으로 돌아가기</button></div>}
    <App />
  </Suspense></StrictMode>,
);
