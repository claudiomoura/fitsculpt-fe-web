import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";

type PlanListCardProps = {
  title: string;
  metadata: string;
  detailHref: string;
  detailLabel: string;
  statusLabel?: string;
  actionSlot?: ReactNode;
  badges?: ReactNode;
};

export function PlanListCard({
  title,
  metadata,
  detailHref,
  detailLabel,
  statusLabel,
  actionSlot,
  badges,
}: PlanListCardProps) {
  return (
    <article className="feature-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div>
          <h3 className="m-0">{title}</h3>
          <p className="muted mt-6">{metadata}</p>
        </div>
        {statusLabel ? <Badge variant="muted">{statusLabel}</Badge> : null}
      </div>

      {badges ? <div className="badge-list mt-12">{badges}</div> : null}

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {actionSlot}
        <Link href={detailHref} className="btn secondary">
          {detailLabel}
        </Link>
      </div>
    </article>
  );
}
