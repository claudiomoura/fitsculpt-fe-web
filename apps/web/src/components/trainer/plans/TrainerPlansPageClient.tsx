"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";
import { useLanguage } from "@/context/LanguageProvider";

type PlanListItem = {
  id: string;
  title: string;
  description?: string | null;
};

type PlanDay = {
  id: string;
  label: string;
  exercises: PlanExercise[];
};

type PlanExercise = {
  id: string;
  name: string;
};

type ExerciseOption = {
  id: string;
  name: string;
  mainMuscleGroup?: string | null;
  equipment?: string | null;
};

type PlansCapabilityState = "checking" | "supported" | "unsupported";

type RouteState = "loading" | "ready";

function parsePlanList(payload: unknown): PlanListItem[] {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const rows = Array.isArray(source.items) ? source.items : Array.isArray(source.data) ? source.data : Array.isArray(payload) ? payload : [];

  return rows
    .map((row) => {
      const item = typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {};
      const id = typeof item.id === "string" ? item.id : "";
      const title = typeof item.title === "string" ? item.title : "";

      if (!id || !title) return null;

      return {
        id,
        title,
        description: typeof item.description === "string" ? item.description : null,
      } satisfies PlanListItem;
    })
    .filter((row): row is PlanListItem => Boolean(row));
}

function parseExerciseList(payload: unknown): ExerciseOption[] {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const rows = Array.isArray(source.items) ? source.items : Array.isArray(source.data) ? source.data : [];

  return rows
    .map((row) => {
      const item = typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {};
      const id = typeof item.id === "string" ? item.id : "";
      const name = typeof item.name === "string" ? item.name : "";
      if (!id || !name) return null;

      return {
        id,
        name,
        mainMuscleGroup: typeof item.mainMuscleGroup === "string" ? item.mainMuscleGroup : null,
        equipment: typeof item.equipment === "string" ? item.equipment : null,
      } satisfies ExerciseOption;
    })
    .filter((row): row is ExerciseOption => Boolean(row));
}

function createDraftDays(days: number): PlanDay[] {
  return Array.from({ length: days }, (_, index) => ({
    id: `draft-day-${index + 1}`,
    label: `Day ${index + 1}`,
    exercises: [],
  }));
}

function isUnsupportedStatus(status: number) {
  return status === 404 || status === 405 || status === 501;
}

function ExerciseSearchPicker({
  onAddExercise,
  disabled,
}: {
  onAddExercise: (exercise: ExerciseOption) => void;
  disabled: boolean;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExerciseOption[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [notSupported, setNotSupported] = useState(false);

  const onSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || !query.trim()) return;

    setSearchState("loading");

    try {
      const params = new URLSearchParams({ query: query.trim(), limit: "12", page: "1" });
      const response = await fetch(`/api/exercises?${params.toString()}`, { cache: "no-store", credentials: "include" });

      if (!response.ok) {
        if (isUnsupportedStatus(response.status)) {
          setNotSupported(true);
          setResults([]);
          setSearchState("idle");
          return;
        }

        setSearchState("error");
        return;
      }

      setResults(parseExerciseList((await response.json()) as unknown));
      setSearchState("idle");
    } catch {
      setSearchState("error");
    }
  };

  return (
    <section className="feature-card form-stack" aria-live="polite">
      <h4 style={{ margin: 0 }}>{t("trainer.plans.exerciseSearch.title")}</h4>
      <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.exerciseSearch.description")}</p>

      {disabled ? <p className="muted">{t("trainer.plans.exerciseSearch.disabled")}</p> : null}
      {notSupported ? <p className="muted">{t("trainer.notAvailableInEnvironment")}</p> : null}

      {!disabled && !notSupported ? (
        <>
          <form className="form-stack" onSubmit={(event) => void onSearch(event)}>
            <label className="form-stack" style={{ gap: 8 }}>
              <span className="muted">{t("library.searchLabel")}</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <button type="submit" className="btn secondary" disabled={!query.trim() || searchState === "loading"}>
              {searchState === "loading" ? t("ui.loading") : t("library.searchAction")}
            </button>
          </form>

          {searchState === "error" ? <p className="muted">{t("library.loadErrorList")}</p> : null}
          {searchState === "idle" && query.trim() && results.length === 0 ? <p className="muted">{t("library.empty")}</p> : null}

          {results.length > 0 ? (
            <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
              {results.map((exercise) => (
                <li key={exercise.id}>
                  <div className="feature-card" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
                    <div>
                      <strong>{exercise.name}</strong>
                      <p className="muted" style={{ margin: "4px 0 0" }}>
                        {[exercise.mainMuscleGroup, exercise.equipment].filter(Boolean).join(" · ") || t("trainer.clientContext.empty")}
                      </p>
                    </div>
                    <button type="button" className="btn secondary" onClick={() => onAddExercise(exercise)}>
                      {t("trainer.plans.exerciseSearch.select")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default function TrainerPlansPageClient() {
  const { t } = useLanguage();
  const { isLoading: accessLoading, gymLoading, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  const [routeState, setRouteState] = useState<RouteState>("loading");
  const [loadError, setLoadError] = useState(false);
  const [capabilityState, setCapabilityState] = useState<PlansCapabilityState>("checking");
  const [plans, setPlans] = useState<PlanListItem[]>([]);

  const [wizardName, setWizardName] = useState("");
  const [wizardDays, setWizardDays] = useState(3);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);

  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [draftDays, setDraftDays] = useState<PlanDay[]>([]);

  const activePlanName = useMemo(() => {
    const selectedTitle = plans.find((plan) => plan.id === activePlanId)?.title;
    if (selectedTitle) return selectedTitle;

    const draftTitle = wizardName.trim();
    return draftTitle || t("trainer.plans.createDraftTitle");
  }, [activePlanId, plans, t, wizardName]);

  const loadPlans = useCallback(async () => {
    setRouteState("loading");
    setLoadError(false);

    try {
      const response = await fetch("/api/training-plans", { cache: "no-store", credentials: "include" });

      if (!response.ok) {
        if (isUnsupportedStatus(response.status)) {
          setCapabilityState("unsupported");
          setPlans([]);
          setRouteState("ready");
          return;
        }

        setLoadError(true);
        setRouteState("ready");
        return;
      }

      setCapabilityState("supported");
      setPlans(parsePlanList((await response.json()) as unknown));
      setRouteState("ready");
    } catch {
      setLoadError(true);
      setRouteState("ready");
    }
  }, []);

  useEffect(() => {
    if (!canAccessTrainerArea) return;
    const timer = window.setTimeout(() => {
      void loadPlans();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [canAccessTrainerArea, loadPlans]);

  const onCreateTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!wizardName.trim() || creating || capabilityState !== "supported") return;

    setCreating(true);
    setCreateError(false);

    try {
      const response = await fetch("/api/training-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: wizardName.trim() }),
      });

      if (!response.ok) {
        if (isUnsupportedStatus(response.status)) {
          setCapabilityState("unsupported");
        } else {
          setCreateError(true);
        }
        setCreating(false);
        return;
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const createdId = typeof payload.id === "string" ? payload.id : null;

      setDraftDays(createDraftDays(Math.max(1, Math.min(14, wizardDays))));
      if (createdId) setActivePlanId(createdId);
      setWizardName("");
      setWizardDays(3);
      setCreating(false);
      await loadPlans();
    } catch {
      setCreateError(true);
      setCreating(false);
    }
  };

  const addExerciseToDay = (dayId: string, exercise: ExerciseOption) => {
    setDraftDays((previous) =>
      previous.map((day) => {
        if (day.id !== dayId) return day;
        if (day.exercises.some((item) => item.id === exercise.id)) return day;

        return {
          ...day,
          exercises: [...day.exercises, { id: exercise.id, name: exercise.name }],
        };
      }),
    );
  };

  const removeExerciseFromDay = (dayId: string, exerciseId: string) => {
    setDraftDays((previous) =>
      previous.map((day) =>
        day.id === dayId
          ? { ...day, exercises: day.exercises.filter((exercise) => exercise.id !== exerciseId) }
          : day,
      ),
    );
  };

  if (accessLoading || gymLoading || capabilityState === "checking") {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={3} />;
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

  if (capabilityState === "unsupported") {
    return <EmptyState title={t("trainer.plans.notSupportedTitle")} description={t("trainer.plans.notSupportedDescription")} wrapInCard icon="info" />;
  }

  return (
    <div className="form-stack">
      <section className="card form-stack" aria-live="polite">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.plans.createTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.createFlowDescription")}</p>

        <form className="form-stack" onSubmit={(event) => void onCreateTemplate(event)}>
          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("trainer.plans.titleLabel")}</span>
            <input value={wizardName} onChange={(event) => setWizardName(event.target.value)} required />
          </label>

          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("trainer.plans.daysLabel")}</span>
            <input
              type="number"
              min={1}
              max={14}
              value={wizardDays}
              onChange={(event) => setWizardDays(Math.max(1, Math.min(14, Number(event.target.value) || 1)))}
            />
          </label>

          <button className="btn fit-content" type="submit" disabled={creating || !wizardName.trim()}>
            {creating ? t("trainer.plans.creating") : t("trainer.plans.create")}
          </button>

          {createError ? <p className="muted">{t("trainer.plans.createError")}</p> : null}
        </form>
      </section>

      <section className="card form-stack">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.plans.listTitle")}</h2>

        {routeState === "loading" ? <LoadingState ariaLabel={t("trainer.plans.loading")} lines={3} /> : null}
        {routeState === "ready" && loadError ? (
          <ErrorState title={t("trainer.plans.error")} retryLabel={t("ui.retry")} onRetry={() => void loadPlans()} wrapInCard />
        ) : null}
        {routeState === "ready" && !loadError && plans.length === 0 ? <EmptyState title={t("trainer.plans.empty")} wrapInCard icon="info" /> : null}

        {routeState === "ready" && !loadError && plans.length > 0 ? (
          <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
            {plans.map((plan) => (
              <li key={plan.id}>
                <article className="feature-card form-stack">
                  <div>
                    <strong>{plan.title}</strong>
                    {plan.description ? <p className="muted" style={{ margin: "4px 0 0" }}>{plan.description}</p> : null}
                  </div>
                  <button type="button" className="btn secondary" onClick={() => setActivePlanId(plan.id)}>
                    {t("trainer.plans.selectPlan")}
                  </button>
                </article>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card form-stack">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.plans.dayBuilderTitle")}</h2>
        {draftDays.length === 0 ? <p className="muted">{t("trainer.plans.dayBuilderEmpty")}</p> : null}
        {draftDays.length > 0 ? (
          <>
            <p className="muted" style={{ margin: 0 }}>
              {t("trainer.plans.dayBuilderFor").replace("{plan}", activePlanName)}
            </p>
            <div className="form-stack">
              {draftDays.map((day) => (
                <article key={day.id} className="feature-card form-stack">
                  <h3 style={{ margin: 0 }}>{day.label}</h3>

                  <ExerciseSearchPicker disabled={!activePlanId} onAddExercise={(exercise) => addExerciseToDay(day.id, exercise)} />

                  {day.exercises.length === 0 ? <p className="muted">{t("trainer.plans.dayExercisesEmpty")}</p> : null}
                  {day.exercises.length > 0 ? (
                    <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
                      {day.exercises.map((exercise) => (
                        <li key={`${day.id}-${exercise.id}`}>
                          <div className="feature-card" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
                            <span>{exercise.name}</span>
                            <button type="button" className="btn secondary" onClick={() => removeExerciseFromDay(day.id, exercise.id)}>
                              {t("trainer.plans.exerciseSearch.remove")}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
