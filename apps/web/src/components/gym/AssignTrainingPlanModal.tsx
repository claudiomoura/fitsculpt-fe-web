"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type TrainingPlanItem = {
  id: string;
  title: string;
};

type TrainingPlansResponse = {
  items?: TrainingPlanItem[];
};

type AssignTrainingPlanModalProps = {
  open: boolean;
  gymId: string;
  userId: string;
  userLabel: string;
  onClose: () => void;
  onAssigned: () => void;
};

export function AssignTrainingPlanModal({ open, gymId, userId, userLabel, onClose, onAssigned }: AssignTrainingPlanModalProps) {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<TrainingPlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [assignUnsupported, setAssignUnsupported] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const loadPlans = async () => {
      setLoadingPlans(true);
      setPlansError(null);
      setAssignUnsupported(false);
      setSelectedPlanId("");
      const response = await fetch("/api/training-plans", {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) {
        if (active) {
          setPlans([]);
          setPlansError(t("gym.admin.assignPlan.loadPlansError"));
          setLoadingPlans(false);
        }
        return;
      }
      const payload = (await response.json()) as TrainingPlansResponse;
      if (active) {
        setPlans(payload.items ?? []);
        setLoadingPlans(false);
      }
    };
    void loadPlans();
    return () => {
      active = false;
    };
  }, [open, t]);

  async function submitAssign() {
    if (!selectedPlanId) return;
    setSubmitError(null);
    setSubmitting(true);
    const response = await fetch(`/api/admin/gyms/${gymId}/members/${userId}/assign-training-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ templatePlanId: selectedPlanId }),
    });
    setSubmitting(false);
    if (response.status === 404 || response.status === 405) {
      setAssignUnsupported(true);
      setSubmitError(t("gym.admin.assignPlan.unavailable"));
      return;
    }
    if (!response.ok) {
      setSubmitError(t("gym.admin.assignPlan.submitError"));
      return;
    }
    setAssignUnsupported(false);
    onAssigned();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("gym.admin.assignPlan.title")}
      description={t("gym.admin.assignPlan.description").replace("{member}", userLabel)}
      footer={(
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>{t("gym.admin.assignPlan.cancel")}</Button>
          <Button onClick={() => void submitAssign()} loading={submitting} disabled={!selectedPlanId || loadingPlans || assignUnsupported}>
            {t("gym.admin.assignPlan.submit")}
          </Button>
        </div>
      )}
    >
      <div className="form-stack">
        {loadingPlans ? <p className="muted">{t("gym.admin.assignPlan.loadingPlans")}</p> : null}
        {!loadingPlans && plansError ? <p className="muted">{plansError}</p> : null}
        {!loadingPlans && !plansError && plans.length === 0 ? <p className="muted">{t("gym.admin.assignPlan.emptyPlans")}</p> : null}
        {!loadingPlans && !plansError && plans.length > 0 ? (
          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("gym.admin.assignPlan.planLabel")}</span>
            <select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
              <option value="">{t("gym.admin.assignPlan.selectPlaceholder")}</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.title}</option>
              ))}
            </select>
          </label>
        ) : null}
        {submitError ? <p className="muted">{submitError}</p> : null}
        {assignUnsupported ? <p className="muted">{t("gym.admin.assignPlan.unavailable")}</p> : null}
      </div>
    </Modal>
  );
}
