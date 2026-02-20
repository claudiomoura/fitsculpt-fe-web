"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import TrainerGymRequiredState from "@/components/trainer/TrainerGymRequiredState";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";
import { useLanguage } from "@/context/LanguageProvider";
import type { Exercise, TrainingPlanDay } from "@/lib/types";
import { addExerciseToPlanDay, getTrainerPlanDetail, getTrainerPlanEditCapabilities } from "@/services/trainer/plans";
import { fetchExercisesList } from "@/services/exercises";

type Props = {
  planId: string;
  day: string;
};

export default function TrainerDayEditorClient({ planId, day }: Props) {
  const { t } = useLanguage();
  const { isLoading: accessLoading, gymLoading, gymError, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDay, setSelectedDay] = useState<TrainingPlanDay | null>(null);

  const [query, setQuery] = useState("");
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState(false);
  const [results, setResults] = useState<Exercise[]>([]);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [addError, setAddError] = useState(false);
  const [canDeleteExercise, setCanDeleteExercise] = useState(false);
  const [canUpdateExercise, setCanUpdateExercise] = useState(false);

  const normalizedDay = useMemo(() => day.trim(), [day]);

  const loadDay = useCallback(async () => {
    setLoading(true);
    setError(false);

    const result = await getTrainerPlanDetail(planId);
    if (!result.ok) {
      setError(true);
      setSelectedDay(null);
      setLoading(false);
      return;
    }

    const match = (result.data.days ?? []).find((dayItem) => dayItem.date.startsWith(normalizedDay));
    setSelectedDay(match ?? null);
    setLoading(false);
  }, [normalizedDay, planId]);

  useEffect(() => {
    if (!canAccessTrainerArea) return;
    const timer = window.setTimeout(() => {
      void loadDay();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canAccessTrainerArea, loadDay]);

  useEffect(() => {
    if (!canAccessTrainerArea) return;

    const controller = new AbortController();

    async function loadExercises() {
      setSearching(true);
      setSearchError(false);
      try {
        const result = await fetchExercisesList({ page: 1, limit: 200 }, controller.signal);
        setAvailableExercises(result.items);
      } catch {
        if (!controller.signal.aborted) {
          setSearchError(true);
          setAvailableExercises([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }

    void loadExercises();

    return () => {
      controller.abort();
    };
  }, [canAccessTrainerArea]);

  useEffect(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      setResults([]);
      return;
    }

    const filtered = availableExercises
      .filter((exercise) => exercise.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
    setResults(filtered);
  }, [availableExercises, query]);


  useEffect(() => {
    if (!canAccessTrainerArea || !selectedDay) return;

    const firstExerciseId = selectedDay.exercises?.[0]?.id;
    let cancelled = false;

    async function loadCapabilities() {
      const caps = await getTrainerPlanEditCapabilities(planId, selectedDay.id, firstExerciseId);
      if (cancelled) return;
      setCanDeleteExercise(caps.canDeleteDayExercise);
      setCanUpdateExercise(caps.canUpdateDayExercise);
    }

    void loadCapabilities();

    return () => {
      cancelled = true;
    };
  }, [canAccessTrainerArea, planId, selectedDay]);

  const onAddExercise = useCallback(async (exerciseId: string) => {
    if (!selectedDay || isAddingExercise) return;

    setIsAddingExercise(true);
    setAddError(false);
    const result = await addExerciseToPlanDay({
      planId,
      dayId: selectedDay.id,
      exerciseId,
    });

    if (!result.ok) {
      setAddError(true);
      setIsAddingExercise(false);
      return;
    }

    setQuery("");
    setResults([]);
    setIsAddingExercise(false);
    await loadDay();
  }, [isAddingExercise, loadDay, planId, selectedDay]);

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

  if (loading) {
    return <LoadingState ariaLabel={t("trainer.plans.loading")} lines={4} />;
  }

  if (error) {
    return <ErrorState title={t("trainer.plans.error")} retryLabel={t("ui.retry")} onRetry={() => void loadDay()} wrapInCard />;
  }

  if (!selectedDay) {
    return <EmptyState title={t("trainer.plans.dayNotFound")} description={normalizedDay} wrapInCard icon="info" />;
  }

  return (
    <section className="card form-stack" aria-live="polite">
      <header className="form-stack" style={{ gap: 8 }}>
        <h2 className="section-title" style={{ fontSize: 20 }}>{selectedDay.label}</h2>
        <p className="muted" style={{ margin: 0 }}>{selectedDay.date}</p>
      </header>

      <div className="form-stack" style={{ gap: 8 }}>
        <label className="muted" htmlFor="exercise-search-input">{t("trainer.plans.searchExercises")}</label>
        <input
          id="exercise-search-input"
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            if (!nextValue.trim()) {
              setResults([]);
            }
          }}
          placeholder={t("trainer.plans.searchExercisesPlaceholder")}
          disabled={isAddingExercise}
        />

        {searching ? <p className="muted">{t("trainer.plans.searchingExercises")}</p> : null}
        {!searching && searchError ? <p className="muted">{t("trainer.plans.searchExercisesError")}</p> : null}
        {!searching && !searchError && query.trim() && results.length === 0 ? (
          <p className="muted">{t("trainer.plans.searchExercisesEmpty")}</p>
        ) : null}

        {results.length > 0 ? (
          <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
            {results.map((exercise) => (
              <li key={exercise.id}>
                <button type="button" className="btn secondary" disabled={isAddingExercise} onClick={() => void onAddExercise(exercise.id)}>
                  {exercise.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {addError ? <p className="muted">{t("trainer.plans.addExerciseError")}</p> : null}
      </div>

      <div className="form-stack">
        <h3 style={{ margin: 0 }}>{t("trainer.plans.dayExercisesTitle")}</h3>
        {selectedDay.exercises.length === 0 ? <p className="muted">{t("trainer.plans.dayExercisesEmpty")}</p> : (
          <ul style={{ margin: 0, paddingInlineStart: 20 }}>
            {selectedDay.exercises.map((exercise) => <li key={exercise.id}>{exercise.name}</li>)}
          </ul>
        )}
        {!canUpdateExercise || !canDeleteExercise ? <p className="muted">{t("trainer.planDetail.notAvailableInEnvironment")}</p> : null}
      </div>

      <Link href="/app/trainer/plans" className="btn secondary fit-content">{t("trainer.back")}</Link>
    </section>
  );
}
