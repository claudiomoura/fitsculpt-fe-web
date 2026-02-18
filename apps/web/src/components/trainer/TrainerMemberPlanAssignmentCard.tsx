"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type CapabilityState = "checking" | "supported" | "unsupported";

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
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [capabilityState, setCapabilityState] = useState<CapabilityState>("checking");
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const selectedPlanTitle = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId)?.title ?? "",
    [plans, selectedPlanId],
  );

  const loadAssignmentData = useCallback(async () => {
    const [plansRes, assignmentRes] = await Promise.all([
      fetch("/api/training-plans", { cache: "no-store", credentials: "include" }),
      fetch(`/api/trainer/members/${memberId}/training-plan-assignment`, {
        cache: "no-store",
        credentials: "include",
      }),
    ]);

    if (plansRes.status === 403 || assignmentRes.status === 403) {
      setForbiddenMessage(t("trainer.clientContext.training.assignment.forbidden"));
      throw new Error("ASSIGNMENT_FORBIDDEN");
    }

    if (assignmentRes.status === 404 || assignmentRes.status === 405) {
      setCapabilityState("unsupported");
      return;
    }

    if (!plansRes.ok || !assignmentRes.ok) {
      throw new Error("ASSIGNMENT_LOAD_ERROR");
    }

    const plansPayload = (await plansRes.json()) as TrainingPlansResponse;
    const assignmentPayload = (await assignmentRes.json()) as AssignmentResponse;

    setCapabilityState("supported");
    setPlans(plansPayload.items ?? []);
    setAssignedPlan(assignmentPayload.assignedPlan ?? null);
  }, [memberId, t]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setForbiddenMessage(null);

      try {
        await loadAssignmentData();
        if (!active) return;
        setLoading(false);
      } catch (loadError) {
        if (!active) return;
        if (loadError instanceof Error && loadError.message === "ASSIGNMENT_FORBIDDEN") {
          setError(null);
        } else {
          setError(t("trainer.clientContext.training.assignment.loadError"));
        }
        setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [loadAssignmentData, t]);

  const canAssign = Boolean(selectedPlanId && !submitting && capabilityState === "supported");

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

      if (response.status === 403) {
        setSubmitError(t("trainer.clientContext.training.assignment.forbidden"));
        return;
      }

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


  const onUnassign = async () => {
    if (!assignedPlan || submitting || capabilityState !== "supported") return;

    setSubmitting(true);
    setSubmitError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/trainer/members/${memberId}/training-plan-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ trainingPlanId: null }),
      });

      setSubmitting(false);

      if (response.status === 404 || response.status === 405) {
        setCapabilityState("unsupported");
        return;
      }

      if (response.status === 403) {
        setSubmitError(t("trainer.clientContext.training.assignment.forbidden"));
        return;
      }

      if (!response.ok) {
        setSubmitError(t("trainer.clientContext.training.assignment.unassignError"));
        return;
      }

      setAssignedPlan(null);
      setSuccess(t("trainer.clientContext.training.assignment.unassignSuccess").replace("{member}", memberName));
    } catch {
      setSubmitting(false);
      setSubmitError(t("trainer.clientContext.training.assignment.unassignError"));
    }
  };

  const onRemoveClient = async () => {
    if (submitting || capabilityState !== "supported") return;

    setSubmitting(true);
    setSubmitError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/trainer/clients/${memberId}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });

      setSubmitting(false);
      setShowRemoveConfirm(false);

      if (response.status === 404 || response.status === 405) {
        setCapabilityState("unsupported");
        return;
      }

      if (response.status === 403) {
        setSubmitError(t("trainer.clientContext.training.assignment.forbidden"));
        return;
      }

      if (!response.ok) {
        setSubmitError(t("trainer.clientContext.training.assignment.removeError"));
        return;
      }

      setSuccess(t("trainer.clientContext.training.assignment.removeSuccess").replace("{member}", memberName));
    } catch {
      setSubmitting(false);
      setSubmitError(t("trainer.clientContext.training.assignment.removeError"));
    }
  };

  const onCreateMinimalPlan = async () => {
    if (creatingPlan || submitting) return;

    setCreatingPlan(true);
    setSubmitError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/training-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ title: t("trainer.clientContext.training.assignment.defaultPlanTitle") }),
      });

      if (!response.ok) {
        setSubmitError(t("trainer.clientContext.training.assignment.createError"));
        setCreatingPlan(false);
        return;
      }

      await loadAssignmentData();
      setSuccess(t("trainer.clientContext.training.assignment.createSuccess"));
      setCreatingPlan(false);
    } catch {
      setSubmitError(t("trainer.clientContext.training.assignment.createError"));
      setCreatingPlan(false);
    }
  };

  return (
    <section className="card form-stack" aria-live="polite">
      <h4 style={{ margin: 0 }}>{t("trainer.clientContext.training.assignment.title")}</h4>
      <p className="muted" style={{ margin: 0 }}>
        {t("trainer.clientContext.training.assignment.description").replace("{member}", memberName)}
      </p>

      {loading ? <p className="muted">{t("trainer.clientContext.training.assignment.loading")}</p> : null}
      {!loading && forbiddenMessage ? <p className="muted">{forbiddenMessage}</p> : null}
      {!loading && error ? <p className="muted">{error}</p> : null}
      {!loading && capabilityState === "unsupported" ? (
        <p className="muted">{t("trainer.clientContext.training.assignment.unsupported")}</p>
      ) : null}

      {!loading && !error && !forbiddenMessage && capabilityState === "supported" ? (
        <>
          {assignedPlan ? (
            <div className="feature-card form-stack" role="status">
              <strong>{t("trainer.clientContext.training.assignment.currentLabel")}</strong>
              <p className="muted" style={{ margin: 0 }}>{assignedPlan.title}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn secondary" href={`/app/biblioteca?athleteUserId=${memberId}`} style={{ width: "fit-content" }}>
                  {t("trainer.clientContext.training.assignment.addExerciseCta")}
                </Link>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={submitting}
                  onClick={() => void onUnassign()}
                  style={{ width: "fit-content" }}
                >
                  {submitting
                    ? t("trainer.clientContext.training.assignment.submitting")
                    : t("trainer.clientContext.training.assignment.unassignCta")}
                </button>
              </div>
            </div>
          ) : (
            <p className="muted">{t("trainer.clientContext.training.assignment.noneAssigned")}</p>
          )}

          {plans.length === 0 ? (
            <div className="feature-card form-stack">
              <p className="muted" style={{ margin: 0 }}>{t("trainer.clientContext.training.assignment.emptyPlans")}</p>
              <button
                type="button"
                className="btn"
                disabled={creatingPlan || submitting}
                onClick={() => void onCreateMinimalPlan()}
                style={{ width: "fit-content" }}
              >
                {creatingPlan
                  ? t("trainer.clientContext.training.assignment.creating")
                  : t("trainer.clientContext.training.assignment.createCta")}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn secondary"
                disabled={creatingPlan || submitting}
                onClick={() => void onCreateMinimalPlan()}
                style={{ width: "fit-content" }}
              >
                {creatingPlan
                  ? t("trainer.clientContext.training.assignment.creating")
                  : t("trainer.clientContext.training.assignment.createCta")}
              </button>
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

          <div className="feature-card form-stack">
            <button
              type="button"
              className="btn secondary"
              disabled={submitting}
              onClick={() => setShowRemoveConfirm((prev) => !prev)}
              style={{ width: "fit-content" }}
            >
              {t("trainer.clientContext.training.assignment.removeClientCta")}
            </button>
            {showRemoveConfirm ? (
              <div className="form-stack">
                <p className="muted" style={{ margin: 0 }}>
                  {t("trainer.clientContext.training.assignment.removeClientConfirm").replace("{member}", memberName)}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn" disabled={submitting} onClick={() => void onRemoveClient()}>
                    {t("trainer.clientContext.training.assignment.removeClientConfirmCta")}
                  </button>
                  <button type="button" className="btn secondary" disabled={submitting} onClick={() => setShowRemoveConfirm(false)}>
                    {t("ui.cancel")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {submitError ? <p className="muted">{submitError}</p> : null}
          {success ? <p className="muted">{success}</p> : null}
        </>
      ) : null}
    </section>
  );
}
