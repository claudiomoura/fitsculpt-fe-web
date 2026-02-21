"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import TrainerGymRequiredState from "@/components/trainer/TrainerGymRequiredState";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import type { Exercise, TrainingPlanExercise, TrainingPlanDay } from "@/lib/types";
import {
  addExerciseToPlanDay,
  deleteTrainerPlanDay,
  deleteTrainerPlanDayExercise,
  getTrainerPlanDetail,
  markTrainerPlanEditCapabilityUnsupported,
  updatePlanDayExercise,
} from "@/services/trainer/plans";
import { fetchExercisesList } from "@/services/exercises";
import { Modal } from "@/components/ui/Modal";

type Props = {
  planId: string;
  day: string;
};

type ExerciseDraft = {
  sets?: number;
  reps?: string;
  rest?: number;
  notes?: string;
  tempo?: string;
};

const NOT_SUPPORTED_STATUSES = new Set([404, 405, 501]);

function toExerciseDraft(exercise: TrainingPlanExercise): ExerciseDraft {
  return {
    ...(typeof exercise.sets === "number" ? { sets: exercise.sets } : {}),
    ...(typeof exercise.reps === "string" ? { reps: exercise.reps } : {}),
    ...(typeof exercise.rest === "number" ? { rest: exercise.rest } : {}),
    ...(typeof exercise.notes === "string" ? { notes: exercise.notes } : {}),
    ...(typeof exercise.tempo === "string" ? { tempo: exercise.tempo } : {}),
  };
}

function hasAnyEditableFields(exercise: TrainingPlanExercise): boolean {
  return typeof exercise.sets === "number"
    || typeof exercise.reps === "string"
    || typeof exercise.rest === "number"
    || typeof exercise.notes === "string"
    || typeof exercise.tempo === "string";
}

function hasDraftChanges(base: ExerciseDraft, next: ExerciseDraft): boolean {
  return base.sets !== next.sets
    || base.reps !== next.reps
    || base.rest !== next.rest
    || base.notes !== next.notes
    || base.tempo !== next.tempo;
}

export default function TrainerDayEditorClient({ planId, day }: Props) {
  const { t } = useLanguage();
  const { notify } = useToast();
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
  const [deleteExerciseNotSupported, setDeleteExerciseNotSupported] = useState(false);
  const [updateNotSupported, setUpdateNotSupported] = useState(false);
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseDraft>>({});
  const [savingExerciseId, setSavingExerciseId] = useState<string | null>(null);
  const [deleteDayNotSupported, setDeleteDayNotSupported] = useState(false);
  const [deleteDayConfirmOpen, setDeleteDayConfirmOpen] = useState(false);
  const [isDeletingDay, setIsDeletingDay] = useState(false);
  const [deleteExerciseId, setDeleteExerciseId] = useState<string | null>(null);
  const [isDeletingExerciseId, setIsDeletingExerciseId] = useState<string | null>(null);
  const normalizedDay = useMemo(() => day.trim(), [day]);

  const loadDay = useCallback(async () => {
    setLoading(true);
    setError(false);

    const result = await getTrainerPlanDetail(planId);
    if (!result.ok) {
      setError(true);
      setSelectedDay(null);
      setExerciseDrafts({});
      setLoading(false);
      return;
    }

    const match = (result.data.days ?? []).find((dayItem) => dayItem.date.startsWith(normalizedDay));
    setSelectedDay(match ?? null);
    setExerciseDrafts((match?.exercises ?? []).reduce<Record<string, ExerciseDraft>>((acc, exercise) => {
      acc[exercise.id] = toExerciseDraft(exercise);
      return acc;
    }, {}));
    setDeleteDayNotSupported(false);
    setDeleteExerciseNotSupported(false);
    setUpdateNotSupported(false);
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

  const onSaveExercise = useCallback(async (exercise: TrainingPlanExercise) => {
    if (!selectedDay || savingExerciseId) return;

    const draft = exerciseDrafts[exercise.id] ?? toExerciseDraft(exercise);
    const payload = {
      ...(typeof draft.sets === "number" ? { sets: draft.sets } : {}),
      ...(typeof draft.reps === "string" ? { reps: draft.reps } : {}),
      ...(typeof draft.rest === "number" ? { rest: draft.rest } : {}),
      ...(typeof draft.notes === "string" ? { notes: draft.notes } : {}),
      ...(typeof draft.tempo === "string" ? { tempo: draft.tempo } : {}),
    };

    setSavingExerciseId(exercise.id);
    const result = await updatePlanDayExercise({
      planId,
      dayId: selectedDay.id,
      exerciseId: exercise.id,
      ...payload,
    });

    if (!result.ok) {
      if (NOT_SUPPORTED_STATUSES.has(result.status ?? 0) || result.reason === "notSupported") {
        setUpdateNotSupported(true);
        markTrainerPlanEditCapabilityUnsupported(planId, "canUpdateDayExercise", { dayId: selectedDay.id, exerciseId: exercise.id });
      }

      notify({
        title: t("common.error"),
        description: result.message ?? t("trainer.plans.updateExerciseError"),
        variant: "error",
      });
      setSavingExerciseId(null);
      return;
    }

    notify({
      title: t("common.success"),
      description: t("trainer.plans.updateExerciseSuccess"),
      variant: "success",
    });
    setSavingExerciseId(null);
    await loadDay();
  }, [exerciseDrafts, loadDay, notify, planId, savingExerciseId, selectedDay, t]);

  const onDeleteDay = useCallback(async () => {
    if (!selectedDay || isDeletingDay) return;

    setIsDeletingDay(true);
    const result = await deleteTrainerPlanDay(planId, selectedDay.id);

    if (!result.ok) {
      if (NOT_SUPPORTED_STATUSES.has(result.status ?? 0) || result.reason === "notSupported") {
        setDeleteDayNotSupported(true);
        markTrainerPlanEditCapabilityUnsupported(planId, "canDeleteDay", { dayId: selectedDay.id });
      }

      notify({
        title: t("common.error"),
        description: result.message ?? t("trainer.plans.deleteDayError"),
        variant: "error",
      });
      setIsDeletingDay(false);
      return;
    }

    notify({
      title: t("common.success"),
      description: t("trainer.plans.deleteDaySuccess"),
      variant: "success",
    });
    setDeleteDayConfirmOpen(false);
    await loadDay();
    setIsDeletingDay(false);
  }, [isDeletingDay, loadDay, notify, planId, selectedDay, t]);

  const onDeleteExercise = useCallback(async (exerciseId: string) => {
    if (!selectedDay || isDeletingExerciseId || !exerciseId.trim()) return;

    setIsDeletingExerciseId(exerciseId);
    const result = await deleteTrainerPlanDayExercise(planId, selectedDay.id, exerciseId);

    if (!result.ok) {
      if (NOT_SUPPORTED_STATUSES.has(result.status ?? 0) || result.reason === "notSupported") {
        setDeleteExerciseNotSupported(true);
        markTrainerPlanEditCapabilityUnsupported(planId, "canDeleteDayExercise", { dayId: selectedDay.id, exerciseId });
      }

      notify({
        title: t("common.error"),
        description: result.message ?? t("trainer.plans.deleteExerciseError"),
        variant: "error",
      });
      setIsDeletingExerciseId(null);
      return;
    }

    notify({
      title: t("common.success"),
      description: t("trainer.plans.deleteExerciseSuccess"),
      variant: "success",
    });
    setDeleteExerciseId(null);
    await loadDay();
    setIsDeletingExerciseId(null);
  }, [isDeletingExerciseId, loadDay, notify, planId, selectedDay, t]);

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
        <div>
          <Button variant="danger" size="sm" onClick={() => setDeleteDayConfirmOpen(true)} disabled={deleteDayNotSupported || isDeletingDay}>
            {t("trainer.plans.deleteDay")}
          </Button>
        </div>
        {deleteDayNotSupported ? <p className="muted" style={{ margin: 0 }}>{t("trainer.planDetail.notAvailableInEnvironment")}</p> : null}
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
          <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 0, listStyle: "none", gap: 12 }}>
            {selectedDay.exercises.map((exercise) => {
              const baseDraft = toExerciseDraft(exercise);
              const draft = exerciseDrafts[exercise.id] ?? baseDraft;
              const canEditThisExercise = !updateNotSupported && hasAnyEditableFields(exercise);
              const changed = hasDraftChanges(baseDraft, draft);
              const isSaving = savingExerciseId === exercise.id;

              return (
                <li key={exercise.id} className="card form-stack" style={{ gap: 10 }}>
                  <strong>{exercise.name}</strong>

                  {typeof exercise.sets === "number" ? (
                    <label className="form-stack" style={{ gap: 6 }}>
                      <span className="muted">{t("trainer.plans.editExercise.sets")}</span>
                      <input
                        type="number"
                        min={1}
                        value={typeof draft.sets === "number" ? draft.sets : ""}
                        onChange={(event) => setExerciseDrafts((prev) => ({
                          ...prev,
                          [exercise.id]: {
                            ...draft,
                            sets: Math.max(1, Number(event.target.value) || 1),
                          },
                        }))}
                        disabled={!canEditThisExercise || isSaving}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={!canEditThisExercise || isSaving}
                          onClick={() => setExerciseDrafts((prev) => {
                            const currentDraft = prev[exercise.id] ?? baseDraft;
                            const currentSets = typeof currentDraft.sets === "number" ? currentDraft.sets : 1;

                            return {
                              ...prev,
                              [exercise.id]: {
                                ...currentDraft,
                                sets: currentSets + 1,
                              },
                            };
                          })}
                        >
                          {t("trainer.plans.editExercise.addSet")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={!canEditThisExercise || isSaving || (typeof draft.sets === "number" ? draft.sets : 1) <= 1}
                          onClick={() => setExerciseDrafts((prev) => {
                            const currentDraft = prev[exercise.id] ?? baseDraft;
                            const currentSets = typeof currentDraft.sets === "number" ? currentDraft.sets : 1;

                            return {
                              ...prev,
                              [exercise.id]: {
                                ...currentDraft,
                                sets: Math.max(1, currentSets - 1),
                              },
                            };
                          })}
                        >
                          {t("trainer.plans.editExercise.removeSet")}
                        </Button>
                      </div>
                    </label>
                  ) : null}

                  {typeof exercise.reps === "string" ? (
                    <label className="form-stack" style={{ gap: 6 }}>
                      <span className="muted">{t("trainer.plans.editExercise.reps")}</span>
                      <input
                        value={draft.reps ?? ""}
                        onChange={(event) => setExerciseDrafts((prev) => ({
                          ...prev,
                          [exercise.id]: {
                            ...draft,
                            reps: event.target.value,
                          },
                        }))}
                        disabled={!canEditThisExercise || isSaving}
                      />
                    </label>
                  ) : null}

                  {typeof exercise.rest === "number" ? (
                    <label className="form-stack" style={{ gap: 6 }}>
                      <span className="muted">{t("trainer.plans.editExercise.rest")}</span>
                      <input
                        type="number"
                        min={0}
                        value={typeof draft.rest === "number" ? draft.rest : ""}
                        onChange={(event) => setExerciseDrafts((prev) => ({
                          ...prev,
                          [exercise.id]: {
                            ...draft,
                            rest: Math.max(0, Number(event.target.value) || 0),
                          },
                        }))}
                        disabled={!canEditThisExercise || isSaving}
                      />
                    </label>
                  ) : null}

                  {typeof exercise.tempo === "string" ? (
                    <label className="form-stack" style={{ gap: 6 }}>
                      <span className="muted">{t("trainer.plans.editExercise.tempo")}</span>
                      <input
                        value={draft.tempo ?? ""}
                        onChange={(event) => setExerciseDrafts((prev) => ({
                          ...prev,
                          [exercise.id]: {
                            ...draft,
                            tempo: event.target.value,
                          },
                        }))}
                        disabled={!canEditThisExercise || isSaving}
                      />
                    </label>
                  ) : null}

                  {typeof exercise.notes === "string" ? (
                    <label className="form-stack" style={{ gap: 6 }}>
                      <span className="muted">{t("trainer.plans.editExercise.notes")}</span>
                      <textarea
                        value={draft.notes ?? ""}
                        onChange={(event) => setExerciseDrafts((prev) => ({
                          ...prev,
                          [exercise.id]: {
                            ...draft,
                            notes: event.target.value,
                          },
                        }))}
                        disabled={!canEditThisExercise || isSaving}
                      />
                    </label>
                  ) : null}

                  {!hasAnyEditableFields(exercise) ? <p className="muted">{t("trainer.plans.editExercise.noEditableFields")}</p> : null}

                  {canEditThisExercise ? (
                    <button type="button" className="btn" disabled={!changed || isSaving} onClick={() => void onSaveExercise(exercise)}>
                      {t("trainer.plans.save")}
                    </button>
                  ) : null}

                  {!deleteExerciseNotSupported ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteExerciseId(exercise.id)}
                      disabled={Boolean(isDeletingExerciseId)}
                    >
                      {t("trainer.plans.actions.delete")}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {updateNotSupported || deleteExerciseNotSupported ? <p className="muted">{t("trainer.planDetail.notAvailableInEnvironment")}</p> : null}
        {updateNotSupported ? <p className="muted">{t("trainer.plans.editExercise.notSupported")}</p> : null}
      </div>

      <Link href="/app/trainer/plans" className="btn secondary fit-content">{t("trainer.back")}</Link>

      <Modal
        open={deleteDayConfirmOpen}
        onClose={() => !isDeletingDay && setDeleteDayConfirmOpen(false)}
        title={t("trainer.plans.deleteDayConfirmTitle")}
        description={t("trainer.plans.deleteDayConfirmDescription")}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteDayConfirmOpen(false)} disabled={isDeletingDay}>{t("ui.cancel")}</Button>
          <Button variant="danger" onClick={() => void onDeleteDay()} loading={isDeletingDay} disabled={isDeletingDay}>{t("trainer.plans.actions.delete")}</Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteExerciseId)}
        onClose={() => !isDeletingExerciseId && setDeleteExerciseId(null)}
        title={t("trainer.plans.deleteExerciseConfirmTitle")}
        description={t("trainer.plans.deleteExerciseConfirmDescription")}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteExerciseId(null)} disabled={Boolean(isDeletingExerciseId)}>{t("ui.cancel")}</Button>
          <Button
            variant="danger"
            onClick={() => deleteExerciseId && void onDeleteExercise(deleteExerciseId)}
            loading={Boolean(isDeletingExerciseId)}
            disabled={!deleteExerciseId || Boolean(isDeletingExerciseId)}
          >
            {t("trainer.plans.actions.delete")}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
