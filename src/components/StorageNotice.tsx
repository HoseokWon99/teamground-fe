import { useRef, useState } from "react";
import { useStorageWarning } from "@/stores/storage-warning";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function StorageNotice() {
  const message = useStorageWarning((state) => state.message);
  const [open, setOpen] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recovered, setRecovered] = useState(false);
  const status = useRef<HTMLDivElement>(null);
  return (
    <>
      <div
        ref={status}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={-1}
      >
        {message ? (
          <div className="error-notice">
            <p>{message}</p>
            <Button
              variant="outline"
              onClick={() => {
                setRecoveryError("");
                setOpen(true);
              }}
            >
              현재 데이터로 저장 복구
            </Button>
          </div>
        ) : recovered ? (
          <p className="success-notice">
            현재 데이터를 브라우저에 저장했습니다.
          </p>
        ) : null}
      </div>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="현재 데이터로 저장을 복구할까요?"
        description="이 브라우저의 기존 Teamground 저장 데이터를 앱에서 저장을 완료한 현재 실행 데이터로 바꿉니다. 입력 중인 미저장 내용은 포함되지 않습니다. 복원하지 못한 기존 데이터는 사라지며 되돌릴 수 없습니다."
      >
        {recoveryError ? (
          <p role="alert" className="error-notice">
            {recoveryError}
          </p>
        ) : null}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button
            onClick={() => {
              if (useAppStore.replaceStoredData()) {
                setRecovered(true);
                setOpen(false);
                // The old trigger disappears after recovery; retain a visible focus destination.
                requestAnimationFrame(() => status.current?.focus());
              } else {
                setRecoveryError(useStorageWarning.getState().message);
              }
            }}
          >
            기존 데이터를 바꾸고 저장
          </Button>
        </div>
      </Modal>
    </>
  );
}
