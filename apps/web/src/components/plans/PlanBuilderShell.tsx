"use client";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageProvider";
import type { PlanDayItem } from "./types";

type PlanBuilderShellProps = {
  days: PlanDayItem[];
  selectedDayId?: string;
  loading?: boolean;
  error?: boolean;
  unavailable?: boolean;
  onRetry?: () => void;
  onSelectDay?: (dayId: string) => void;
};

export function PlanBuilderShell({
  days,
  selectedDayId,
  loading = false,
  error = false,
  unavailable = false,
  onRetry,
  onSelectDay,
}: PlanBuilderShellProps) {
  const { t } = useLanguage();
  const selectedDay = days.find((item) => item.id === selectedDayId) ?? null;

  if (loading) return <PlanBuilderSkeleton />;

  if (error) {
    return (
      <div className="ui-card form-stack" role="alert">
        <p>{t("plansUi.trainer.builder.error")}</p>
        {onRetry ? <Button variant="secondary" onClick={onRetry}>{t("ui.retry")}</Button> : null}
      </div>
    );
  }

  if (unavailable) {
    return <div className="ui-card"><p>{t("plansUi.trainer.builder.notAvailable")}</p></div>;
  }

  if (days.length === 0) {
    return <div className="ui-card"><p>{t("plansUi.trainer.builder.empty")}</p></div>;
  }

  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className="ui-card form-stack">
        <h3 style={{ margin: 0 }}>{t("plansUi.trainer.builder.daysTitle")}</h3>
        <div className="form-stack" role="list">
          {days.map((day) => (
            <Button
              key={day.id}
              variant={day.id === selectedDayId ? "primary" : "secondary"}
              onClick={() => onSelectDay?.(day.id)}
              disabled={day.isDisabled}
              style={{ justifyContent: "flex-start", textAlign: "left" }}
            >
              <span>
                {day.label}
                {day.detail ? <small style={{ display: "block", opacity: 0.8 }}>{day.detail}</small> : null}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div className="ui-card form-stack" aria-live="polite">
        <h3 style={{ margin: 0 }}>{t("plansUi.trainer.builder.panelTitle")}</h3>
        {selectedDay ? (
          <>
            <strong>{selectedDay.label}</strong>
            <p className="muted">{t("plansUi.trainer.builder.panelPlaceholder")}</p>
          </>
        ) : (
          <p className="muted">{t("plansUi.trainer.builder.noDaySelected")}</p>
        )}
      </div>
    </div>
  );
}

export function PlanBuilderSkeleton() {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1fr)" }} aria-hidden="true">
      <div className="ui-card form-stack">
        <Skeleton variant="line" style={{ width: "45%" }} />
        <Skeleton variant="block" style={{ height: 50 }} />
        <Skeleton variant="block" style={{ height: 50 }} />
        <Skeleton variant="block" style={{ height: 50 }} />
      </div>
      <div className="ui-card form-stack">
        <Skeleton variant="line" style={{ width: "35%" }} />
        <Skeleton variant="line" style={{ width: "55%" }} />
        <Skeleton variant="line" style={{ width: "75%" }} />
      </div>
    </div>
  );
}
