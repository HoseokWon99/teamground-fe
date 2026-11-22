import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
const ConfirmationContext = createContext<
  (message: string) => Promise<boolean>
>(() => Promise.resolve(false));
export function ConfirmActionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const pending = useRef<((value: boolean) => void) | null>(null);
  useEffect(
    () => () => {
      pending.current?.(false);
      pending.current = null;
    },
    [],
  );
  const confirm = useCallback(
    (text: string) =>
      new Promise<boolean>((resolve) => {
        pending.current?.(false);
        pending.current = resolve;
        setMessage(text);
      }),
    [],
  );
  const finish = (value: boolean) => {
    pending.current?.(value);
    pending.current = null;
    setMessage("");
  };
  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(message)}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
        title="변경 확인"
        description={message}
      >
        <div className="row">
          <Button variant="outline" onClick={() => finish(false)}>
            취소
          </Button>
          <Button onClick={() => finish(true)}>확인</Button>
        </div>
      </Modal>
    </ConfirmationContext.Provider>
  );
}
export const useConfirmAction = () => useContext(ConfirmationContext);
