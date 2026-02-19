"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type PlanOption = {
  id: string;
  title: string;
  daysCount: number;
};

type Props = {
  open: boolean;
  exerciseName: string;
  plans: PlanOption[];
  loadingPlans: boolean;
  loadError: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  canSubmit: boolean;
  allowMultiSelect: boolean;
  emptyCtaHref: string;
  onClose: () => void;
  onConfirm: (planIds: string[]) => void;
  onRetryLoad: () => void;
};

export default function AddExerciseDayPickerModal({
  open,
  exerciseName,
  plans,
  loadingPlans,
  loadError,
  isSubmitting,
  submitError,
  canSubmit,
  allowMultiSelect,
  emptyCtaHref,
  onClose,
  onConfirm,
  onRetryLoad,
}: Props) {
  const { t } = useLanguage();
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);

  const hasPlans = plans.length > 0;
  const hasSelection = selectedPlanIds.length > 0;
  const selectedCountLabel = useMemo(() => {
    return t("library.addToPlansSelectedCount").replace("{count}", String(selectedPlanIds.length));
  }, [selectedPlanIds.length, t]);

  const togglePlan = (planId: string) => {
    setSelectedPlanIds((current) => {
      if (!allowMultiSelect) {
        return current[0] === planId ? [] : [planId];
      }

      if (current.includes(planId)) {
        return current.filter((item) => item !== planId);
      }
      return [...current, planId];
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("library.addToPlansModalTitle")}
      description={t("library.addToPlansModalDescription").replace("{exercise}", exerciseName)}
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={onClose}>
            {t("ui.cancel")}
          </Button>
          <Button onClick={() => onConfirm(selectedPlanIds)} disabled={!hasSelection || isSubmitting || !canSubmit} loading={isSubmitting}>
            {t("library.addToPlansConfirm")}
          </Button>
        </div>
      }
    >
      <div className="form-stack">
        {loadingPlans ? <p className="muted">{t("library.addToPlansLoading")}</p> : null}

        {!loadingPlans && loadError ? (
          <div className="form-stack">
            <p className="muted">{loadError}</p>
            <Button variant="secondary" onClick={onRetryLoad}>
              {t("ui.retry")}
            </Button>
          </div>
        ) : null}

        {!loadingPlans && !loadError && !hasPlans ? (
          <div className="feature-card form-stack">
            <p className="muted" style={{ margin: 0 }}>{t("library.addToPlansNoPlan")}</p>
            <Link className="btn secondary" href={emptyCtaHref} onClick={onClose}>
              {t("library.addToPlansNoPlanCta")}
            </Link>
          </div>
        ) : null}

        {!loadingPlans && !loadError && hasPlans ? (
          <fieldset className="form-stack" style={{ gap: 10 }}>
            <legend className="muted">{t("library.addToPlansLabel")}</legend>
            {plans.map((plan) => {
              const inputId = `plan-${plan.id}`;
              return (
                <label key={plan.id} htmlFor={inputId} className="feature-card" style={{ padding: "0.75rem" }}>
                  <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div className="form-stack" style={{ gap: 4 }}>
                      <strong>{plan.title}</strong>
                      <span className="muted">{t("library.addToPlansDaysCount").replace("{count}", String(plan.daysCount))}</span>
                    </div>
                    <input
                      id={inputId}
                      type={allowMultiSelect ? "checkbox" : "radio"}
                      checked={selectedPlanIds.includes(plan.id)}
                      onChange={() => togglePlan(plan.id)}
                    />
                  </div>
                </label>
              );
            })}
            <p className="muted" style={{ margin: 0 }}>{selectedCountLabel}</p>
          </fieldset>
        ) : null}

        {submitError ? <p className="muted">{submitError}</p> : null}
      </div>
    </Modal>
  );
}
