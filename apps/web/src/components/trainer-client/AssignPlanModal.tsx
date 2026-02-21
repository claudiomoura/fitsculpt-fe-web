"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/context/LanguageProvider";

export type AssignPlanOption = {
  id: string;
  label: string;
  description?: string;
};

type AssignPlanModalProps = {
  open: boolean;
  plans: AssignPlanOption[];
  selectedPlanId?: string;
  loading?: boolean;
  onSelectPlan: (planId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AssignPlanModal({
  open,
  plans,
  selectedPlanId,
  loading = false,
  onSelectPlan,
  onConfirm,
  onCancel,
}: AssignPlanModalProps) {
  const { t } = useLanguage();

  const hasPlans = plans.length > 0;
  const isConfirmDisabled = useMemo(() => !selectedPlanId || !hasPlans || loading, [hasPlans, loading, selectedPlanId]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t("trainerClient360.assignPlan.title")}
      description={t("trainerClient360.assignPlan.description")}
      footer={(
        <>
          <Button variant="ghost" onClick={onCancel}>{t("ui.cancel")}</Button>
          <Button onClick={onConfirm} disabled={isConfirmDisabled} loading={loading}>
            {t("trainerClient360.assignPlan.confirm")}
          </Button>
        </>
      )}
    >
      <div className="form-stack">
        {hasPlans ? (
          <ul className="form-stack" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {plans.map((plan) => {
              const checked = selectedPlanId === plan.id;

              return (
                <li key={plan.id}>
                  <label className="card" style={{ display: "block", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="assign-plan"
                      value={plan.id}
                      checked={checked}
                      onChange={() => onSelectPlan(plan.id)}
                    />
                    <div style={{ marginTop: "0.35rem" }}>
                      <strong>{plan.label}</strong>
                      {plan.description ? <p className="muted" style={{ margin: "0.25rem 0 0" }}>{plan.description}</p> : null}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">{t("trainerClient360.assignPlan.empty")}</p>
        )}
      </div>
    </Modal>
  );
}
