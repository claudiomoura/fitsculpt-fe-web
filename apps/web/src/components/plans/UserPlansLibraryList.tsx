"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageProvider";
import { PlanCard } from "./PlanCard";
import type { PlanListItem, PlanListState } from "./types";

type UserPlansLibraryListProps = {
  plans: PlanListItem[];
  state: PlanListState;
  unavailable?: boolean;
  onRetry?: () => void;
  renderActions?: (plan: PlanListItem) => ReactNode;
};

export function UserPlansLibraryList({ plans, state, unavailable = false, onRetry, renderActions }: UserPlansLibraryListProps) {
  const { t } = useLanguage();

  if (state === "loading") return <PlansLibrarySkeleton />;

  if (state === "error") {
    return (
      <div className="ui-card form-stack" role="alert">
        <p>{t("plansUi.user.library.error")}</p>
        {onRetry ? <Button variant="secondary" onClick={onRetry}>{t("ui.retry")}</Button> : null}
      </div>
    );
  }

  if (state === "disabled" || unavailable) {
    return <div className="ui-card"><p>{t("plansUi.user.library.notAvailable")}</p></div>;
  }

  if (plans.length === 0) {
    return <div className="ui-card"><p>{t("plansUi.user.library.empty")}</p></div>;
  }

  return (
    <div className="form-stack" aria-label={t("plansUi.user.library.title")}>
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          name={plan.name}
          daysCountSlot={typeof plan.daysCount === "number" ? <span className="muted">{t("plansUi.daysCount", { count: plan.daysCount })}</span> : null}
          updatedSlot={plan.updatedAtLabel ? <span className="muted">{plan.updatedAtLabel}</span> : null}
          actionsSlot={
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {plan.isActive ? <ActivePlanBadge /> : null}
              {renderActions ? renderActions(plan) : null}
            </div>
          }
        />
      ))}
    </div>
  );
}

export function ActivePlanBadge() {
  const { t } = useLanguage();
  return <Badge variant="success">{t("plansUi.user.activeBadge")}</Badge>;
}

function PlansLibrarySkeleton() {
  return (
    <div className="form-stack" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`user-plan-skeleton-${index}`} className="ui-card" style={{ display: "grid", gap: 10 }}>
          <Skeleton variant="line" style={{ width: "52%" }} />
          <Skeleton variant="line" style={{ width: "34%" }} />
          <Skeleton variant="line" style={{ width: "68%" }} />
        </div>
      ))}
    </div>
  );
}
