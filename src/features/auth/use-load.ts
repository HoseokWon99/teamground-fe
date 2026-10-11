import { useCallback, useEffect, useState } from "react";
import { service } from "@/mocks/service";
export function useLoad() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const retry = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await service.load();
    } catch (error) {
      setError(
        error instanceof Error
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
  return { loading, error, retry };
}
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "요청을 완료하지 못했습니다. 다시 시도해주세요.";
