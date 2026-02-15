"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";

type TrainingPlanListItem = {
  id: string;
  title: string;
};

type TrainingPlansResponse = {
  items?: TrainingPlanListItem[];
};

type AssignedPlan = {
  id: string;
  title: string;
};

type AssignmentResponse = {
  assignedPlan?: AssignedPlan | null;
};

type Props = {
  memberId: string;
  memberName: string;
};

export default function TrainerMemberPlanAssignmentCard({ memberId, memberName }: Props) {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<TrainingPlanListItem[]>([]);
  const [assignedPlan, setAssignedPlan] = useState<AssignedPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedPlanTitle = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId)?.title ?? "",
    [plans, selectedPlanId],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [plansRes, assignmentRes] = await Promise.all([
          fetch("/api/training-plans", { cache: "no-store", credentials: "include" }),
          fetch(`/api/trainer/members/${memberId}/training-plan-assignment`, {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

        if (!plansRes.ok || !assignmentRes.ok) {
          if (active) {
            setError(t("trainer.clientContext.training.assignment.loadError"));
            setLoading(false);
          }
          return;
        }

        const plansPayload = (await plansRes.json()) as TrainingPlansResponse;
        const assignmentPayload = (await assignmentRes.json()) as AssignmentResponse;

        if (!active) return;

        setPlans(plansPayload.items ?? []);
        setAssignedPlan(assignmentPayload.assignedPlan ?? null);
        setLoading(false);
      } catch {
        if (!active) return;
        setError(t("trainer.clientContext.training.assignment.loadError"));
        setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [memberId, t]);

  const canAssign = Boolean(selectedPlanId && !submitting);

  const onAssign = async () => {
    if (!canAssign) return;

    setSubmitting(true);
    setSubmitError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/trainer/assign-training-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ clientId: memberId, sourceTrainingPlanId: selectedPlanId }),
      });

      setSubmitting(false);

      if (!response.ok) {
        setSubmitError(t("trainer.clientContext.training.assignment.submitError"));
        return;
      }

      setAssignedPlan({ id: selectedPlanId, title: selectedPlanTitle || t("trainer.clientContext.training.assignment.unknownPlan") });
      setSuccess(
        t("trainer.clientContext.training.assignment.success")
          .replace("{member}", memberName)
          .replace("{plan}", selectedPlanTitle || t("trainer.clientContext.training.assignment.unknownPlan")),
      );
      setSelectedPlanId("");
    } catch {
      setSubmitting(false);
      setSubmitError(t("trainer.clientContext.training.assignment.submitError"));
    }
  };

  return (
    <section className="card form-stack" aria-live="polite">
      <h4 style={{ margin: 0 }}>{t("trainer.clientContext.training.assignment.title")}</h4>
      <p className="muted" style={{ margin: 0 }}>
        {t("trainer.clientContext.training.assignment.description").replace("{member}", memberName)}
      </p>

      {loading ? <p className="muted">{t("trainer.clientContext.training.assignment.loading")}</p> : null}
      {!loading && error ? <p className="muted">{error}</p> : null}

      {!loading && !error ? (
        <>
          {assignedPlan ? (
            <div className="feature-card form-stack" role="status">
              <strong>{t("trainer.clientContext.training.assignment.currentLabel")}</strong>
              <p className="muted" style={{ margin: 0 }}>{assignedPlan.title}</p>
            </div>
          ) : (
            <p className="muted">{t("trainer.clientContext.training.assignment.noneAssigned")}</p>
          )}

          {plans.length === 0 ? (
            <div className="feature-card form-stack">
              <p className="muted" style={{ margin: 0 }}>{t("trainer.clientContext.training.assignment.emptyPlans")}</p>
              <Link className="btn secondary" href="/app/entrenamiento" style={{ width: "fit-content" }}>
                {t("trainer.clientContext.training.assignment.emptyPlansCta")}
              </Link>
            </div>
          ) : (
            <>
              <label className="form-stack" style={{ gap: 8 }}>
                <span className="muted">{t("trainer.clientContext.training.assignment.planLabel")}</span>
                <select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
                  <option value="">{t("trainer.clientContext.training.assignment.planPlaceholder")}</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" className="btn" disabled={!canAssign} onClick={() => void onAssign()}>
                {submitting
                  ? t("trainer.clientContext.training.assignment.submitting")
                  : t("trainer.clientContext.training.assignment.submit")}
              </button>
            </>
          )}

          {submitError ? <p className="muted">{submitError}</p> : null}
          {success ? <p className="muted">{success}</p> : null}
        </>
      ) : null}
    </section>
  );
}
