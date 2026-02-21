"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlanCard } from "./PlanCard";
import type { PlanListItem, PlanListState } from "./types";

type TrainerPlansListProps = {
  plans: PlanListItem[];
  state: PlanListState;
  unavailable?: boolean;
  selectedPlanId?: string;
  onRetry?: () => void;
  onSelectPlan?: (planId: string) => void;
  renderActions?: (plan: PlanListItem) => ReactNode;
};

export function TrainerPlansList({
  plans,
  state,
  unavailable = false,
  selectedPlanId,
  onRetry,
  onSelectPlan,
  renderActions,
}: TrainerPlansListProps) {
  const { t } = useLanguage();

  if (state === "loading") {
    return <PlansListSkeleton />;
  }

  if (state === "error") {
    return (
      <div className="ui-card form-stack" role="alert">
        <p>{t("plansUi.trainer.list.error")}</p>
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>{t("ui.retry")}</Button>
        ) : null}
      </div>
    );
  }

  if (state === "disabled" || unavailable) {
    return (
      <div className="ui-card form-stack">
        <p>{t("plansUi.trainer.list.notAvailable")}</p>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="ui-card form-stack">
        <p>{t("plansUi.trainer.list.empty")}</p>
      </div>
    );
  }

  return (
    <div className="form-stack" aria-label={t("plansUi.trainer.list.title")}>
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          name={plan.name}
          selected={selectedPlanId === plan.id}
          onClick={onSelectPlan ? () => onSelectPlan(plan.id) : undefined}
          selectLabel={t("plansUi.actions.select")}
          daysCountSlot={
            typeof plan.daysCount === "number" ? (
              <span className="muted">{t("plansUi.daysCount", { count: plan.daysCount })}</span>
            ) : null
          }
          updatedSlot={plan.updatedAtLabel ? <span className="muted">{plan.updatedAtLabel}</span> : null}
          actionsSlot={renderActions ? renderActions(plan) : null}
        />
      ))}
    </div>
  );
}

export function PlansListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="form-stack" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={`trainer-plan-skeleton-${index}`} className="ui-card" style={{ display: "grid", gap: 10 }}>
          <Skeleton variant="line" style={{ width: "55%" }} />
          <Skeleton variant="line" style={{ width: "35%" }} />
          <Skeleton variant="line" style={{ width: "70%" }} />
        </div>
      ))}
    </div>
  );
}
