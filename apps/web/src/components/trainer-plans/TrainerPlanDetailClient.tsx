"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { Exercise, TrainingPlanDetail } from "@/lib/types";
import { fetchExercisesList } from "@/services/exercises";
import { addExerciseToPlanDay, getTrainerPlanDetail, saveTrainerPlan } from "@/services/trainer/plans";

type Props = {
  planId: string;
};

export default function TrainerPlanDetailClient({ planId }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [plan, setPlan] = useState<TrainingPlanDetail | null>(null);
  const [draft, setDraft] = useState<TrainingPlanDetail | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>([]);
  const [exerciseLibraryError, setExerciseLibraryError] = useState(false);
  const [addingExerciseForDay, setAddingExerciseForDay] = useState<string | null>(null);
  const [selectedExerciseByDay, setSelectedExerciseByDay] = useState<Record<string, string>>({});

  const canAddExercise = true;
  const canAddDay = false;
  const canDeleteDay = false;

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(false);
    const result = await getTrainerPlanDetail(planId);
    if (!result.ok) {
      setError(true);
      setPlan(null);
      setDraft(null);
      setLoading(false);
      return;
    }

    setPlan(result.data);
    setDraft(result.data);
    setLoading(false);
  }, [planId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPlan();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPlan]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLibrary() {
      try {
        const result = await fetchExercisesList({ page: 1, limit: 200 }, controller.signal);
        setExerciseLibrary(result.items);
        setExerciseLibraryError(false);
      } catch {
        if (!controller.signal.aborted) {
          setExerciseLibraryError(true);
          setExerciseLibrary([]);
        }
      }
    }

    if (canAddExercise) {
      void loadLibrary();
    }

    return () => controller.abort();
  }, [canAddExercise]);

  const days = useMemo(() => draft?.days ?? [], [draft]);

  function updateDayLabel(dayId: string, label: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => (day.id === dayId ? { ...day, label } : day)),
      };
    });
  }

  function updateDayDuration(dayId: string, durationRaw: string) {
    const duration = Number(durationRaw);
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => (day.id === dayId ? { ...day, duration: Number.isFinite(duration) ? duration : 0 } : day)),
      };
    });
  }

  function updateExerciseName(dayId: string, exerciseId: string, name: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.id !== dayId) return day;
          return {
            ...day,
            exercises: day.exercises.map((exercise) => (exercise.id === exerciseId ? { ...exercise, name } : exercise)),
          };
        }),
      };
    });
  }

  function updateExerciseSets(dayId: string, exerciseId: string, setsRaw: string) {
    const sets = Number(setsRaw);
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.id !== dayId) return day;
          return {
            ...day,
            exercises: day.exercises.map((exercise) => (exercise.id === exerciseId
              ? { ...exercise, sets: Number.isFinite(sets) ? sets : 0 }
              : exercise)),
          };
        }),
      };
    });
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setSaveError(false);

    const result = await saveTrainerPlan(planId, { days: draft.days });

    if (!result.ok) {
      setSaveError(true);
      setSaving(false);
      return;
    }

    setPlan(result.data);
    setDraft(result.data);
    setIsEditMode(false);
    setSaving(false);
  }

  function handleCancel() {
    setDraft(plan);
    setSaveError(false);
    setIsEditMode(false);
  }

  async function handleAddExercise(dayId: string) {
    const exerciseId = selectedExerciseByDay[dayId];
    if (!exerciseId) return;

    setAddingExerciseForDay(dayId);
    const result = await addExerciseToPlanDay({ planId, dayId, exerciseId });
    setAddingExerciseForDay(null);

    if (!result.ok) return;

    await loadPlan();
  }

  if (loading) {
    return <p className="muted">{t("trainer.plans.loading")}</p>;
  }

  if (error || !draft) {
    return <p className="muted">{t("trainer.plans.error")}</p>;
  }

  return (
    <section className="section-stack">
      <header className="form-stack">
        <h1 className="section-title">{t("trainer.plans.title")}</h1>
        <Link className="btn secondary fit-content" href="/app/trainer/plans">{t("trainer.back")}</Link>
      </header>

      <section className="card form-stack">
        <h2 style={{ margin: 0 }}>{draft.title}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("training.daysPerWeek")}: {draft.daysPerWeek}</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!isEditMode ? (
            <button className="btn secondary" type="button" onClick={() => setIsEditMode(true)}>{t("trainer.planDetail.edit")}</button>
          ) : (
            <>
              <button className="btn" type="button" onClick={() => void handleSave()} disabled={saving}>
                {t("trainer.planDetail.save")}
              </button>
              <button className="btn secondary" type="button" onClick={handleCancel} disabled={saving}>
                {t("trainer.planDetail.cancel")}
              </button>
            </>
          )}
          <button className="btn secondary" type="button" disabled>{t("trainer.planDetail.addDay")}</button>
          <span className="muted">{!canAddDay ? t("trainer.planDetail.requiresImplementation") : null}</span>
        </div>

        {saveError ? <p className="muted">{t("trainer.plans.error")}</p> : null}

        {days.length === 0 ? (
          <section className="feature-card form-stack">
            <p className="muted">{t("trainer.plans.dayExercisesEmpty")}</p>
            <button className="btn secondary fit-content" type="button" disabled>
              {t("trainer.planDetail.addDay")}
            </button>
            <p className="muted">{t("trainer.planDetail.requiresImplementation")}</p>
          </section>
        ) : (
          <div className="form-stack">
            {days.map((day) => (
              <article key={day.id} className="feature-card form-stack">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {isEditMode && typeof day.label === "string" ? (
                    <input value={day.label} onChange={(event) => updateDayLabel(day.id, event.target.value)} />
                  ) : (
                    <strong>{day.label}</strong>
                  )}
                  {isEditMode && typeof day.duration === "number" ? (
                    <input
                      type="number"
                      min={0}
                      value={day.duration}
                      onChange={(event) => updateDayDuration(day.id, event.target.value)}
                      aria-label={`${day.label}-duration`}
                    />
                  ) : (
                    <span className="muted">{day.duration}</span>
                  )}
                  <button className="btn secondary" type="button" disabled={!canDeleteDay}>{t("trainer.planDetail.deleteDay")}</button>
                  {!canDeleteDay ? <span className="muted">{t("trainer.planDetail.requiresImplementation")}</span> : null}
                </div>

                {day.exercises.length === 0 ? (
                  <section className="form-stack">
                    <p className="muted">{t("trainer.plans.dayExercisesEmpty")}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <select
                        value={selectedExerciseByDay[day.id] ?? ""}
                        disabled={!canAddExercise || exerciseLibraryError || exerciseLibrary.length === 0}
                        onChange={(event) => {
                          const value = event.target.value;
                          setSelectedExerciseByDay((prev) => ({ ...prev, [day.id]: value }));
                        }}
                      >
                        <option value="">{t("trainer.plans.searchExercises")}</option>
                        {exerciseLibrary.map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                        ))}
                      </select>
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => void handleAddExercise(day.id)}
                        disabled={!canAddExercise || !selectedExerciseByDay[day.id] || addingExerciseForDay === day.id}
                      >
                        {t("trainer.plans.addExercise")}
                      </button>
                    </div>
                  </section>
                ) : (
                  <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                    {day.exercises.map((exercise) => (
                      <li key={exercise.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {isEditMode ? (
                            <input value={exercise.name} onChange={(event) => updateExerciseName(day.id, exercise.id, event.target.value)} />
                          ) : (
                            <span>{exercise.name}</span>
                          )}
                          {isEditMode ? (
                            <input
                              type="number"
                              min={0}
                              value={exercise.sets}
                              onChange={(event) => updateExerciseSets(day.id, exercise.id, event.target.value)}
                              style={{ width: 90 }}
                            />
                          ) : (
                            <span className="muted">{t("trainer.plans.loadSets")}: {exercise.sets}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
