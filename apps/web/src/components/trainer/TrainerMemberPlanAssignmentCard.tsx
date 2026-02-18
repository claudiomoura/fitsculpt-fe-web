"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";
import { Modal } from "@/components/ui/Modal";

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
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [supportsUnassign, setSupportsUnassign] = useState<boolean | null>(null);

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

    if (!plansRes.ok || !assignmentRes.ok) {
      throw new Error("ASSIGNMENT_LOAD_ERROR");
    }

    const plansPayload = (await plansRes.json()) as TrainingPlansResponse;
    const assignmentPayload = (await assignmentRes.json()) as AssignmentResponse;

    setPlans(plansPayload.items ?? []);
    setAssignedPlan(assignmentPayload.assignedPlan ?? null);
  }, [memberId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        await loadAssignmentData();
        if (!active) return;
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
  }, [loadAssignmentData, t]);

  useEffect(() => {
    let active = true;

    const probeUnassignCapability = async () => {
      setSupportsUnassign(null);
      try {
        const response = await fetch(`/api/trainer/members/${memberId}/training-plan-assignment`, {
          method: "OPTIONS",
          cache: "no-store",
          credentials: "include",
        });
        const allowHeader = response.headers.get("allow") ?? response.headers.get("Allow") ?? "";
        if (!active) return;
        setSupportsUnassign(response.ok && allowHeader.toUpperCase().includes("DELETE"));
      } catch {
        if (!active) return;
        setSupportsUnassign(false);
      }
    };

    void probeUnassignCapability();
    return () => {
      active = false;
    };
  }, [memberId]);

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
      setPlanPickerOpen(false);
      setSelectedPlanId("");
    } catch {
      setSubmitting(false);
      setSubmitError(t("trainer.clientContext.training.assignment.submitError"));
    }
  };

  const onUnassign = async () => {
    if (!assignedPlan || !supportsUnassign || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/trainer/members/${memberId}/training-plan-assignment`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        setSubmitError(t("trainer.clientContext.training.assignment.unassignError"));
        setSubmitting(false);
        return;
      }

      setAssignedPlan(null);
      setSuccess(
        t("trainer.clientContext.training.assignment.unassignSuccess")
          .replace("{member}", memberName)
          .replace("{plan}", assignedPlan.title),
      );
      setSubmitting(false);
    } catch {
      setSubmitError(t("trainer.clientContext.training.assignment.unassignError"));
      setSubmitting(false);
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
      {!loading && error ? <p className="muted">{error}</p> : null}

      {!loading && !error ? (
        <>
          {assignedPlan ? (
            <div className="feature-card form-stack" role="status">
              <strong>{t("trainer.clientContext.training.assignment.currentLabel")}</strong>
              <p className="muted" style={{ margin: 0 }}>{assignedPlan.title}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn secondary" href={`/app/biblioteca?athleteUserId=${memberId}`} style={{ width: "fit-content" }}>
                  {t("trainer.clientContext.training.assignment.addExerciseCta")}
                </Link>
                {supportsUnassign ? (
                  <button type="button" className="btn danger" onClick={() => void onUnassign()} disabled={submitting}>
                    {submitting
                      ? t("trainer.clientContext.training.assignment.unassignSubmitting")
                      : t("trainer.clientContext.training.assignment.unassignCta")}
                  </button>
                ) : null}
              </div>
              {supportsUnassign === false ? (
                <p className="muted" style={{ margin: 0 }}>
                  {t("trainer.clientContext.training.assignment.unassignUnsupported")}
                </p>
              ) : null}
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn"
                disabled={creatingPlan || submitting}
                onClick={() => setPlanPickerOpen(true)}
              >
                {t("trainer.clientContext.training.assignment.openPlanPicker")}
              </button>
              <button
                type="button"
                className="btn secondary"
                disabled={creatingPlan || submitting}
                onClick={() => void onCreateMinimalPlan()}
              >
                {creatingPlan
                  ? t("trainer.clientContext.training.assignment.creating")
                  : t("trainer.clientContext.training.assignment.createCta")}
              </button>
            </div>
          )}

          {submitError ? <p className="muted">{submitError}</p> : null}
          {success ? <p className="muted">{success}</p> : null}
        </>
      ) : null}

      <Modal
        open={planPickerOpen}
        onClose={() => setPlanPickerOpen(false)}
        title={t("trainer.clientContext.training.assignment.planPickerTitle")}
        description={t("trainer.clientContext.training.assignment.planPickerDescription")}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="btn secondary" onClick={() => setPlanPickerOpen(false)}>
              {t("ui.cancel")}
            </button>
            <button type="button" className="btn" onClick={() => void onAssign()} disabled={!canAssign}>
              {submitting
                ? t("trainer.clientContext.training.assignment.submitting")
                : t("trainer.clientContext.training.assignment.submit")}
            </button>
          </div>
        }
      >
        <div className="form-stack" style={{ paddingTop: 8 }}>
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
        </div>
      </Modal>
    </section>
  );
}
