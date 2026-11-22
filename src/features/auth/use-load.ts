import { useCallback, useEffect, useState } from "react";
export function useLoad() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadRequired, setReloadRequired] = useState(false);
  const retry = useCallback(async () => {
    setLoading(true);
    setError("");
    let serviceLoaded = false;
    try {
      const { service } = await import("@/mocks/service");
      serviceLoaded = true;
      await service.load();
    } catch (error) {
      setReloadRequired(!serviceLoaded);
      setError(
        !serviceLoaded ? "화면 기능을 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요." : error instanceof Error
          ? error.message
          : "불러오지 못했습니다. 다시 시도해주세요.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void retry();
  }, [retry]);
  return { loading, error, retry, reloadRequired };
}
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "요청을 완료하지 못했습니다. 다시 시도해주세요.";
