import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
export function Modal({
  open,
  id,
  closeDisabled = false,
  onOpenChange,
  onOpenAutoFocus,
  title,
  description,
  children,
}: {
  open: boolean;
  id?: string;
  closeDisabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAutoFocus?: (event: Event) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const descriptionId = useId();
  const previousFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }
  wasOpen.current = open;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          id={id}
          className="modal-content"
          aria-describedby={description ? descriptionId : undefined}
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={(event) => {
            if (previousFocus.current?.isConnected) {
              event.preventDefault();
              previousFocus.current.focus();
            }
          }}
        >
          <Dialog.Title className="modal-title">{title}</Dialog.Title>
          {description && (
            <Dialog.Description id={descriptionId} className="muted">
              {description}
            </Dialog.Description>
          )}
          <Dialog.Close
            className="modal-close"
            aria-label="닫기"
            disabled={closeDisabled}
          >
            <X size={20} />
          </Dialog.Close>
          <div className="modal-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
