import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

type PlanCardAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  testId?: string;
};

type PlanCardProps = {
  title: string;
  metadata: string;
  statusLabel?: string;
  badges?: ReactNode;
  actions?: PlanCardAction[];
  testId?: string;
};

function PlanCard({ title, metadata, statusLabel, badges, actions = [], testId }: PlanCardProps) {
  return (
    <article className="feature-card" data-testid={testId}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div>
          <h3 className="m-0">{title}</h3>
          <p className="muted mt-6">{metadata}</p>
        </div>
        {statusLabel ? <Badge variant="success">{statusLabel}</Badge> : null}
      </div>

      {badges ? <div className="badge-list mt-12">{badges}</div> : null}

      {actions.length > 0 ? (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {actions.map((action) => {
            if (action.href) {
              return (
                <Link
                  key={`${action.label}-${action.href}`}
                  href={action.href}
                  className={`btn ${action.variant === "secondary" ? "secondary" : ""}`.trim()}
                  data-testid={action.testId}
                  aria-disabled={action.disabled}
                >
                  {action.label}
                </Link>
              );
            }

            return (
              <button
                key={action.label}
                type="button"
                className={`btn ${action.variant === "secondary" ? "secondary" : ""}`.trim()}
                onClick={action.onClick}
                disabled={action.disabled}
                data-testid={action.testId}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

type ActivePlanSectionProps = {
  title: string;
  emptyTitle: string;
  children?: ReactNode;
};

export function ActivePlanSection({ title, emptyTitle, children }: ActivePlanSectionProps) {
  return (
    <section className="card">
      <h2 className="section-title section-title-sm">{title}</h2>
      {children ?? <p className="muted mt-12">{emptyTitle}</p>}
    </section>
  );
}

type PlanHistoryListProps = {
  title: string;
  emptyTitle: string;
  children?: ReactNode;
};

export function PlanHistoryList({ title, emptyTitle, children }: PlanHistoryListProps) {
  return (
    <section className="card">
      <h2 className="section-title section-title-sm">{title}</h2>
      {children ?? <p className="muted mt-12">{emptyTitle}</p>}
    </section>
  );
}

export { PlanCard };
