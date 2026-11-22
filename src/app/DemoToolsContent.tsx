import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { service } from "@/mocks/service";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/common";
import { useUnsavedActions } from "./unsaved-changes";
export default function DemoToolsContent() {
  const { runAfterDiscard } = useUnsavedActions();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function run(fn: () => unknown) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="row">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            if (
              confirm(
                "팀, 일정, 댓글을 발표 기본 상태로 초기화합니다. 계속할까요?",
              )
            )
              void run(() => runAfterDiscard(() => service.reset(), "/login"));
          }}
        >
          <RotateCcw size={13} />
          데모 초기화
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`)
          }
        >
          계정 전환
        </Button>
        {(["missing", "none", "changed"] as const).map((s, i) => (
          <Button
            key={s}
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (
                confirm("추천에 사용하는 일정 데이터가 변경됩니다. 계속할까요?")
              )
                void run(() => service.setScenario(s));
            }}
          >
            {["일정 미확인", "후보 없음", "확정 전 변경"][i]}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void run(() => service.failNext())}
        >
          다음 요청 실패
        </Button>
      </div>
      <ErrorNotice message={error} />
      <p style={{ marginTop: 10 }}>
        시나리오를 변경한 뒤 기본 시연으로 돌아가려면 데모를 초기화하세요.
      </p>
    </>
  );
}
