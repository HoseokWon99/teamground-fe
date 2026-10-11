import type { ReactNode } from "react";
import { AlertCircle, Layers3 } from "lucide-react";
import type { User } from "@/lib/types";
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action && <div className="header-action">{action}</div>}
    </header>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Layers3 size={32} />
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}
export function ErrorNotice({ message }: { message?: string }) {
  return message ? (
    <div className="error-notice" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function Avatar({ user, size = 34 }: { user?: User; size?: number }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: user?.color || "#dde9df",
        fontSize: size * 0.35,
      }}
      title={user?.name}
    >
      {user?.name.slice(-2) || "?"}
    </span>
  );
}
