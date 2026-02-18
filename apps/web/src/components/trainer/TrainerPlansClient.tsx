"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import type { Exercise } from "@/lib/types";
import { fetchExercisesList } from "@/services/exercises";
import {
  addExerciseToTrainerPlanDay,
  createTrainerPlan,
  getTrainerPlanDetail,
  listTrainerPlans,
  toTrainerPlanDayOptions,
} from "@/services/trainerPlans";
import TrainerAdminNoGymPanel from "./TrainerAdminNoGymPanel";
import { useTrainerAreaAccess } from "./useTrainerAreaAccess";

type Plan = {
  id: string;
  title: string;
  description?: string | null;
};

type ListState = "loading" | "ready";
type DetailState = "idle" | "loading" | "ready" | "error";
type SearchState = "idle" | "loading" | "ready" | "error";

function toPlanListRows(items: { id: string; title: string; notes?: string | null }[]): Plan[] {
  return items.map((item) => ({ id: item.id, title: item.title, description: item.notes ?? null }));
}

export default function TrainerPlansClient() {
  const { t } = useLanguage();
  const { isLoading: accessLoading, gymLoading, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  const [state, setState] = useState<ListState>("loading");
  const [error, setError] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [detailState, setDetailState] = useState<DetailState>("idle");
  const [detailError, setDetailError] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState("");

  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [saveState, setSaveState] = useState<{ savingExerciseId: string | null; error: boolean; success: boolean }>({
    savingExerciseId: null,
    error: false,
    success: false,
  });

  const [activePlan, setActivePlan] = useState<Awaited<ReturnType<typeof getTrainerPlanDetail>> | null>(null);

  const loadPlans = useCallback(async () => {
    setState("loading");
    setError(false);

    try {
      const payload = await listTrainerPlans();
      const nextPlans = toPlanListRows(payload.items);
      setPlans(nextPlans);
      setState("ready");

      if (nextPlans.length === 0) {
        setSelectedPlanId("");
        return;
      }

      setSelectedPlanId((previous) => {
        if (previous && nextPlans.some((plan) => plan.id === previous)) return previous;
        return nextPlans[0].id;
      });
    } catch {
      setError(true);
      setState("ready");
    }
  }, []);

  const loadPlanDetail = useCallback(async (planId: string) => {
    if (!planId) {
      setActivePlan(null);
      setDetailState("idle");
      setSelectedDayId("");
      return;
    }

    setDetailState("loading");
    setDetailError(false);

    try {
      const detail = await getTrainerPlanDetail(planId);
      setActivePlan(detail);
      setDetailState("ready");
      const firstDay = detail?.days[0]?.id ?? "";
      setSelectedDayId((previous) => (previous && detail?.days.some((day) => day.id === previous) ? previous : firstDay));
    } catch {
      setDetailError(true);
      setDetailState("error");
      setActivePlan(null);
      setSelectedDayId("");
    }
  }, []);

  useEffect(() => {
    if (!canAccessTrainerArea) return;
    const timer = window.setTimeout(() => {
      void loadPlans();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [canAccessTrainerArea, loadPlans]);

  useEffect(() => {
    if (!canAccessTrainerArea || !selectedPlanId) return;
    const timer = window.setTimeout(() => {
      void loadPlanDetail(selectedPlanId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [canAccessTrainerArea, selectedPlanId, loadPlanDetail]);

  useEffect(() => {
    if (!query.trim()) return;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetchExercisesList({ query: query.trim(), limit: 20 }, controller.signal);
        setSearchResults(response.items);
        setSearchState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchResults([]);
        setSearchState("error");
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || creating) return;

    setCreating(true);
    setCreateError(false);

    try {
      const created = await createTrainerPlan({ title, description });
      setTitle("");
      setDescription("");
      setCreating(false);
      await loadPlans();
      if (created?.id) {
        setSelectedPlanId(created.id);
      }
    } catch {
      setCreateError(true);
      setCreating(false);
    }
  };

  const onAddExercise = async (exerciseId: string) => {
    if (!selectedPlanId || !selectedDayId || !exerciseId || saveState.savingExerciseId) return;

    setSaveState({ savingExerciseId: exerciseId, error: false, success: false });

    try {
      await addExerciseToTrainerPlanDay(selectedPlanId, selectedDayId, { exerciseId });
      await loadPlanDetail(selectedPlanId);
      setSaveState({ savingExerciseId: null, error: false, success: true });
    } catch {
      setSaveState({ savingExerciseId: null, error: true, success: false });
    }
  };

  const dayOptions = useMemo(() => toTrainerPlanDayOptions(activePlan), [activePlan]);

  if (accessLoading || gymLoading) {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (canAccessAdminNoGymPanel) {
    return <TrainerAdminNoGymPanel />;
  }

  if (!canAccessTrainerArea) {
    if (membership.state === "not_in_gym") {
      return <EmptyState title={t("trainer.gymRequiredTitle")} description={t("trainer.gymRequiredDesc")} wrapInCard icon="info" />;
    }

    if (membership.state === "unknown") {
      return <EmptyState title={t("trainer.gymUnknownTitle")} description={t("trainer.gymUnknownDesc")} wrapInCard icon="info" />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <div className="form-stack">
      <section className="card form-stack">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.plans.createTitle")}</h2>
        <form className="form-stack" onSubmit={onCreate}>
          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("trainer.plans.titleLabel")}</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("trainer.plans.descriptionLabel")}</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </label>
          <button className="btn fit-content" type="submit" disabled={creating || !title.trim()}>
            {creating ? t("trainer.plans.creating") : t("trainer.plans.create")}
          </button>
          {createError ? <p className="muted">{t("trainer.plans.createError")}</p> : null}
        </form>
      </section>

      <section className="card form-stack">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.plans.listTitle")}</h2>
        {state === "loading" ? <LoadingState ariaLabel={t("trainer.plans.loading")} lines={3} /> : null}
        {state === "ready" && error ? (
          <ErrorState title={t("trainer.plans.error")} retryLabel={t("ui.retry")} onRetry={() => void loadPlans()} wrapInCard />
        ) : null}
        {state === "ready" && !error && plans.length === 0 ? <EmptyState title={t("trainer.plans.empty")} wrapInCard icon="info" /> : null}
        {state === "ready" && !error && plans.length > 0 ? (
          <>
            <label className="form-stack" style={{ gap: 8 }}>
              <span className="muted">{t("trainer.clientContext.training.assignment.planLabel")}</span>
              <select
                value={selectedPlanId}
                onChange={(event) => {
                  setSelectedPlanId(event.target.value);
                  setSaveState({ savingExerciseId: null, error: false, success: false });
                }}
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.title}</option>
                ))}
              </select>
            </label>

            <ul className="form-stack" aria-label={t("trainer.plans.listTitle")}>
              {plans.map((plan) => (
                <li key={plan.id} className="feature-card">
                  <strong>{plan.title}</strong>
                  {plan.description ? <p className="muted" style={{ margin: "4px 0 0" }}>{plan.description}</p> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {state === "ready" && !error && selectedPlanId ? (
        <section className="card form-stack">
          <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.clientContext.training.assignment.addExerciseCta")}</h2>

          {detailState === "loading" ? <LoadingState ariaLabel={t("trainer.clientContext.training.assignment.loading")} lines={2} /> : null}
          {detailState === "error" || detailError ? (
            <ErrorState
              title={t("trainer.clientContext.training.assignment.loadError")}
              retryLabel={t("ui.retry")}
              onRetry={() => void loadPlanDetail(selectedPlanId)}
              wrapInCard
            />
          ) : null}

          {detailState === "ready" && activePlan ? (
            <>
              <label className="form-stack" style={{ gap: 8 }}>
                <span className="muted">{t("training.dayLabel")}</span>
                <select value={selectedDayId} onChange={(event) => setSelectedDayId(event.target.value)}>
                  {dayOptions.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.label} ({day.exercisesCount})
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-stack" style={{ gap: 8 }}>
                <span className="muted">{t("library.searchLabel")}</span>
                <input
                  value={query}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setQuery(nextQuery);
                    if (!nextQuery.trim()) {
                      setSearchState("idle");
                      setSearchResults([]);
                    } else {
                      setSearchState("loading");
                    }
                  }}
                  placeholder={t("library.searchPlaceholder")}
                />
              </label>

              {searchState === "loading" ? <p className="muted">{t("ui.loading")}</p> : null}
              {searchState === "error" ? <p className="muted">{t("library.loadErrorList")}</p> : null}

              {searchState === "ready" && searchResults.length === 0 ? <p className="muted">{t("library.empty")}</p> : null}
              {searchState === "ready" && searchResults.length > 0 ? (
                <div className="form-stack">
                  {searchResults.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      className="btn secondary"
                      disabled={!selectedDayId || saveState.savingExerciseId === exercise.id}
                      onClick={() => void onAddExercise(exercise.id)}
                    >
                      {saveState.savingExerciseId === exercise.id ? t("trainer.clientContext.training.assignment.submitting") : exercise.name}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="form-stack">
                {(activePlan.days.find((day) => day.id === selectedDayId)?.exercises ?? []).map((exercise) => (
                  <div key={exercise.id} className="feature-card">
                    {exercise.name}
                  </div>
                ))}
              </div>

              {saveState.error ? <p className="muted">{t("trainer.plans.addExerciseError")}</p> : null}
              {saveState.success ? <p className="muted">{t("trainer.plans.addExerciseSuccess")}</p> : null}
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
