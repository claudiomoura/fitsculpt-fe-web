"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";

type Member = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
};

type MembersResponse = {
  users?: Member[];
};

type TrainingPlanListItem = {
  id: string;
  title: string;
};

type TrainingPlansResponse = {
  items?: TrainingPlanListItem[];
};

type PlanPreview = {
  title: string;
  daysCount: number;
  exercisesCount: number;
};

type PlanDetailResponse = {
  title?: string;
  name?: string;
  daysCount?: number;
  days?: Array<{
    exercises?: unknown[];
    workouts?: unknown[];
  }>;
};

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getPlanPreview(payload: PlanDetailResponse): PlanPreview {
  const title = payload.title?.trim() || payload.name?.trim() || "-";
  const days = asArray(payload.days);

  const daysCount = typeof payload.daysCount === "number" ? payload.daysCount : days.length;
  const exercisesCount = days.reduce<number>((total, day) => {
    if (!day || typeof day !== "object") return total;
    const typedDay = day as { exercises?: unknown[]; workouts?: unknown[] };
    const exercises = asArray(typedDay.exercises);
    if (exercises.length > 0) return total + exercises.length;
    return total + asArray(typedDay.workouts).length;
  }, 0);

  return { title, daysCount, exercisesCount };
}

export default function TrainerPlanAssignmentPanel() {
  const { t } = useLanguage();

  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<TrainingPlanListItem[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [membersRes, plansRes] = await Promise.all([
          fetch("/api/admin/users?page=1", { cache: "no-store", credentials: "include" }),
          fetch("/api/training-plans", { cache: "no-store", credentials: "include" }),
        ]);

        if (!membersRes.ok || !plansRes.ok) {
          if (active) {
            setError(t("trainer.assignPlan.loadError"));
            setLoading(false);
          }
          return;
        }

        const membersPayload = (await membersRes.json()) as MembersResponse;
        const plansPayload = (await plansRes.json()) as TrainingPlansResponse;
        if (!active) return;

        const nextMembers = (membersPayload.users ?? []).filter((user) => user.role !== "ADMIN");
        setMembers(nextMembers);
        setPlans(plansPayload.items ?? []);
        setLoading(false);
      } catch {
        if (!active) return;
        setError(t("trainer.assignPlan.loadError"));
        setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (!selectedPlanId) return;

    let active = true;

    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const response = await fetch(`/api/training-plans/${selectedPlanId}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          if (active) {
            setPreview(null);
            setPreviewError(t("trainer.assignPlan.previewError"));
            setPreviewLoading(false);
          }
          return;
        }

        const payload = (await response.json()) as PlanDetailResponse;

        if (active) {
          setPreview(getPlanPreview(payload));
          setPreviewLoading(false);
        }
      } catch {
        if (!active) return;
        setPreview(null);
        setPreviewError(t("trainer.assignPlan.previewError"));
        setPreviewLoading(false);
      }
    };

    void loadPreview();
    return () => {
      active = false;
    };
  }, [selectedPlanId, t]);

  const selectedMemberName = useMemo(() => {
    const selectedMember = members.find((member) => member.id === selectedMemberId);
    if (!selectedMember) return "";
    return selectedMember.name?.trim() || selectedMember.email;
  }, [members, selectedMemberId]);

  const canSubmit = Boolean(selectedMemberId && selectedPlanId && !submitting);

  const assignPlan = async () => {
    if (!canSubmit) return;

    setSubmitError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedMemberId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templatePlanId: selectedPlanId }),
      });

      setSubmitting(false);

      if (!response.ok) {
        setSubmitError(t("trainer.assignPlan.submitError"));
        return;
      }

      setSuccess(
        t("trainer.assignPlan.success").replace("{member}", selectedMemberName || t("trainer.clientContext.unknownClient")),
      );
      setSelectedPlanId("");
    } catch {
      setSubmitting(false);
      setSubmitError(t("trainer.assignPlan.submitError"));
    }
  };

  return (
    <section className="card form-stack" aria-labelledby="trainer-assign-plan-title">
      <h3 id="trainer-assign-plan-title" style={{ margin: 0 }}>
        {t("trainer.assignPlan.title")}
      </h3>
      <p className="muted" style={{ margin: 0 }}>
        {t("trainer.assignPlan.subtitle")}
      </p>

      {loading ? <p className="muted">{t("trainer.assignPlan.loading")}</p> : null}
      {!loading && error ? <p className="muted">{error}</p> : null}

      {!loading && !error ? (
        <>
          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("trainer.assignPlan.memberLabel")}</span>
            <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
              <option value="">{t("trainer.assignPlan.memberPlaceholder")}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name?.trim() || member.email}
                </option>
              ))}
            </select>
          </label>

          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("trainer.assignPlan.planLabel")}</span>
            <select value={selectedPlanId} onChange={(event) => {
              const nextPlanId = event.target.value;
              setSelectedPlanId(nextPlanId);
              setPreview(null);
              setPreviewError(null);
            }}>
              <option value="">{t("trainer.assignPlan.planPlaceholder")}</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title}
                </option>
              ))}
            </select>
          </label>

          {previewLoading ? <p className="muted">{t("trainer.assignPlan.previewLoading")}</p> : null}
          {previewError ? <p className="muted">{previewError}</p> : null}

          {preview ? (
            <div className="feature-card form-stack" role="status" aria-live="polite">
              <strong>{preview.title}</strong>
              <p className="muted" style={{ margin: 0 }}>
                {t("trainer.assignPlan.previewDays").replace("{count}", String(preview.daysCount))}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                {t("trainer.assignPlan.previewExercises").replace("{count}", String(preview.exercisesCount))}
              </p>
            </div>
          ) : null}

          <button className="btn" type="button" disabled={!canSubmit} onClick={() => void assignPlan()}>
            {submitting ? t("trainer.assignPlan.submitting") : t("trainer.assignPlan.submit")}
          </button>

          {submitError ? <p className="muted">{submitError}</p> : null}
          {success ? <p className="muted">{success}</p> : null}
        </>
      ) : null}
    </section>
  );
}
