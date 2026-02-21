import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";

type ClientBadgeTone = "default" | "success" | "warning" | "error" | "danger" | "info" | "muted";

type ClientBadge = {
  label: ReactNode;
  tone?: ClientBadgeTone;
};

type ClientRowProps = {
  name: ReactNode;
  lastActivity: ReactNode;
  planBadge?: ClientBadge;
  statusBadge?: ClientBadge;
  action?: ReactNode;
  className?: string;
};

export function ClientRow({ name, lastActivity, planBadge, statusBadge, action, className }: ClientRowProps) {
  return (
    <li
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: "0.75rem",
        listStyle: "none",
        padding: "0.875rem 1rem",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "grid", gap: "0.25rem" }}>
        <strong style={{ fontSize: "0.95rem" }}>{name}</strong>
        <span className="muted" style={{ fontSize: "0.875rem" }}>
          {lastActivity}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
        {planBadge ? <Badge variant={planBadge.tone}>{planBadge.label}</Badge> : null}
        {statusBadge ? <Badge variant={statusBadge.tone}>{statusBadge.label}</Badge> : null}
      </div>

      {action ? <div>{action}</div> : null}
    </li>
  );
}

export type { ClientBadge, ClientRowProps };
