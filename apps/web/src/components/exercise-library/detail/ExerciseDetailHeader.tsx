import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";

export type ExerciseDetailBadge = {
  label: string;
  value?: string | null;
  variant?: "default" | "success" | "warning" | "danger" | "muted";
};

type ExerciseDetailHeaderProps = {
  title: string;
  subtitle?: string;
  badges?: ExerciseDetailBadge[];
  actions?: ReactNode;
};

export function ExerciseDetailHeader({ title, subtitle, badges = [], actions }: ExerciseDetailHeaderProps) {
  const visibleBadges = badges.filter((badge) => Boolean(badge.value));

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div className="page-header-body">
          <h1 className="section-title">{title}</h1>
          {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
      {visibleBadges.length > 0 ? (
        <div className="badge-list">
          {visibleBadges.map((badge, index) => (
            <Badge key={`${badge.label}-${index}`} variant={badge.variant}>
              {badge.label}: {badge.value}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
