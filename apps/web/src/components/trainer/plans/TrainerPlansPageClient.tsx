"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import TrainerGymRequiredState from "@/components/trainer/TrainerGymRequiredState";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import type { TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";
import { createTrainerPlan, getTrainerPlanDetail, listCurrentGymTrainerPlans } from "@/services/trainer/plans";

type LoadState = "loading" | "ready";

type DetailState = {
  loading: boolean;
  error: boolean;
  item: TrainingPlanDetail | null;
};

function isEndpointUnavailable(status?: number): boolean {
  return status === 404 || status === 405;
}

export default function TrainerPlansPageClient() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const { isLoading: accessLoading, gymLoading, gymError, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  const [listState, setListState] = useState<LoadState>("loading");
  const [plans, setPlans] = useState<TrainingPlanListItem[]>([]);
  const [listError, setListError] = useState(false);
  const [listDisabled, setListDisabled] = useState(false);

  const [title, setTitle] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [createDisabled, setCreateDisabled] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState>({ loading: false, error: false, item: null });

  const loadPlans = useCallback(async () => {
    setListState("loading");
    setListError(false);

    const result = await listCurrentGymTrainerPlans({ limit: 100 });
    if (!result.ok) {
      setPlans([]);
      const unavailable = isEndpointUnavailable(result.status);
      setListDisabled(unavailable);
      if (unavailable) {
        setCreateDisabled(true);
      }
      setListError(true);
      setListState("ready");
      return;
    }

    setListDisabled(false);
    setPlans(result.data.items);
    setListState("ready");
  }, []);

  const loadPlanDetail = useCallback(async (planId: string) => {
    setSelectedPlanId(planId);
    setDetail({ loading: true, error: false, item: null });

    const result = await getTrainerPlanDetail(planId);
    if (!result.ok) {
      setDetail({ loading: false, error: true, item: null });
      return;
    }

    setDetail({ loading: false, error: false, item: result.data });
  }, []);

  useEffect(() => {
    if (!canAccessTrainerArea) return;
    const timer = window.setTimeout(() => {
      void loadPlans();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [canAccessTrainerArea, loadPlans]);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || creating) return;

    setCreating(true);
    setCreateError(false);
    setCreateErrorMessage(null);

    try {
      const result = await createTrainerPlan({
        title: title.trim(),
        daysPerWeek: Math.max(1, Math.min(14, daysPerWeek)),
      });

      if (!result.ok) {
        if (isEndpointUnavailable(result.status)) {
          setCreateDisabled(true);
        }
        setCreateError(true);
        setCreateErrorMessage(result.message ?? t("trainer.plans.createError"));
        return;
      }

      setTitle("");
      setDaysPerWeek(3);
      setCreateModalOpen(false);
      notify({
        title: t("trainer.plans.createSuccessTitle"),
        description: t("trainer.plans.createSuccessDescription"),
        variant: "success",
      });
      await loadPlans();
      await loadPlanDetail(result.data.id);
    } catch (_error) {
      setCreateError(true);
      setCreateErrorMessage(t("trainer.plans.createError"));
    } finally {
      setCreating(false);
    }
  };

  if (accessLoading || gymLoading) {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={3} />;
  }

  if (canAccessAdminNoGymPanel) {
    return <TrainerAdminNoGymPanel />;
  }

  if (!canAccessTrainerArea) {
    if (membership.state === "not_in_gym") {
      return <TrainerGymRequiredState />;
    }

    if (gymError) {
      return <ErrorState title={t("trainer.error")} retryLabel={t("ui.retry")} onRetry={() => window.location.reload()} wrapInCard />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <div className="form-stack">
      <section className="card form-stack" aria-live="polite">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.plans.createTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.createFlowDescription")}</p>
        {createDisabled ? <p className="muted">{t("trainer.plans.createDisabled")}</p> : null}
        <div>
          <button className="btn fit-content" type="button" onClick={() => setCreateModalOpen(true)} disabled={createDisabled}>
            {t("trainer.plans.create")}
          </button>
        </div>
        {createError ? <p className="muted" role="alert">{createErrorMessage ?? t("trainer.plans.createError")}</p> : null}
      </section>

      <section className="card form-stack" aria-live="polite">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.plans.listTitle")}</h2>

        {listState === "loading" ? <LoadingState ariaLabel={t("trainer.plans.loading")} lines={3} /> : null}
        {listState === "ready" && listError
          ? (listDisabled
            ? <EmptyState title={t("trainer.plans.listDisabledTitle")} description={t("trainer.plans.listDisabledDescription")} wrapInCard icon="info" />
            : <ErrorState title={t("trainer.plans.error")} retryLabel={t("ui.retry")} onRetry={() => void loadPlans()} wrapInCard />)
          : null}
        {listState === "ready" && !listError && plans.length === 0 ? <EmptyState title={t("trainer.plans.empty")} wrapInCard icon="info" /> : null}

        {listState === "ready" && !listError && plans.length > 0 ? (
          <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
            {plans.map((plan) => (
              <li key={plan.id}>
                <article className="feature-card" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <strong>{plan.title}</strong>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="btn secondary" onClick={() => void loadPlanDetail(plan.id)}>
                      {t("trainer.plans.selectPlan")}
                    </button>
                    <Link href={`/app/entrenamiento/editar?planId=${plan.id}&day=${encodeURIComponent(new Date().toISOString().slice(0, 10))}`} className="btn secondary">
                      {t("trainer.plans.editDay")}
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card form-stack" aria-live="polite">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.plans.dayBuilderTitle")}</h2>

        {!selectedPlanId ? <p className="muted">{t("trainer.plans.dayBuilderEmpty")}</p> : null}
        {selectedPlanId && detail.loading ? <LoadingState ariaLabel={t("trainer.plans.loading")} lines={2} /> : null}
        {selectedPlanId && detail.error ? (
          <ErrorState title={t("trainer.plans.error")} retryLabel={t("ui.retry")} onRetry={() => void loadPlanDetail(selectedPlanId)} wrapInCard />
        ) : null}
        {detail.item ? (
          <>
            <div className="feature-card form-stack">
              <strong>{detail.item.title}</strong>
              <p className="muted" style={{ margin: 0 }}>
                {t("training.daysPerWeek")}: {detail.item.daysPerWeek} · {t("trainer.plans.daysCount", { count: detail.item.days?.length ?? 0 })}
              </p>
              <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.dayEditorHint")}</p>
            </div>

            <div className="form-stack">
              {(detail.item.days ?? []).map((day) => (
                <article key={day.id} className="feature-card form-stack">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <strong>{day.label}</strong>
                    <Link className="btn secondary" href={`/app/entrenamiento/editar?planId=${detail.item.id}&day=${encodeURIComponent(day.date.slice(0, 10))}`}>
                      {t("trainer.plans.editDay")}
                    </Link>
                  </div>
                  {day.exercises.length === 0 ? <p className="muted">{t("trainer.plans.dayExercisesEmpty")}</p> : (
                    <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                      {day.exercises.map((exercise) => <li key={exercise.id}>{exercise.name}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <Modal
        open={createModalOpen}
        onClose={() => {
          if (!creating) setCreateModalOpen(false);
        }}
        title={t("trainer.plans.createDraftTitle")}
        description={t("trainer.plans.createFlowDescription")}
      >
        <form className="form-stack" onSubmit={(event) => void onCreate(event)}>
          {createError ? <p className="muted" role="alert">{createErrorMessage ?? t("trainer.plans.createError")}</p> : null}
          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("trainer.plans.titleLabel")}</span>
            <input required value={title} disabled={createDisabled || creating} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("trainer.plans.daysLabel")}</span>
            <input
              type="number"
              min={1}
              max={14}
              value={daysPerWeek}
              disabled={createDisabled || creating}
              onChange={(event) => setDaysPerWeek(Math.max(1, Math.min(14, Number(event.target.value) || 1)))}
            />
          </label>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="btn secondary" onClick={() => setCreateModalOpen(false)} disabled={creating}>
              {t("ui.cancel")}
            </button>
            <button className="btn" type="submit" disabled={createDisabled || creating || !title.trim()}>
              {creating ? t("trainer.plans.creating") : t("trainer.plans.create")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
