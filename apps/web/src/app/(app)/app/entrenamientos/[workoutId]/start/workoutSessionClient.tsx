"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/design-system";
import { useLanguage } from "@/context/LanguageProvider";
import type { Workout, WorkoutSession } from "@/lib/types";

type SessionEntryForm = {
  exercise: string;
  sets: number;
  reps: number;
  loadKg?: number;
  rpe?: number;
};

type WorkoutSessionClientProps = {
  workoutId: string;
};

const DEFAULT_ENTRY_FORM: SessionEntryForm = {
  exercise: "",
  sets: 3,
  reps: 10,
  loadKg: undefined,
  rpe: undefined,
};

export default function WorkoutSessionClient({ workoutId }: WorkoutSessionClientProps) {
  const { t } = useLanguage();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [entries, setEntries] = useState<WorkoutSession["entries"]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState<SessionEntryForm>(DEFAULT_ENTRY_FORM);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [rpe, setRpe] = useState(7);
  const [energia, setEnergia] = useState(3);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/workouts/${workoutId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setError(t("workoutDetail.loadError"));
          return;
        }
        const data = (await response.json()) as Workout;
        setWorkout(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(t("workoutDetail.loadError"));
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [workoutId, t]);

  useEffect(() => {
    if (!workout || session) return;
    const startSession = async () => {
      try {
        const response = await fetch(`/api/workouts/${workout.id}/start`, {
          method: "POST",
        });
        if (!response.ok) {
          setError(t("workoutDetail.sessionStartError"));
          return;
        }
        const data = (await response.json()) as WorkoutSession;
        setSession(data);
        setEntries(data.entries ?? []);
      } catch (_err) {
        setError(t("workoutDetail.sessionStartError"));
      }
    };
    void startSession();
  }, [workout, session, t]);

  const exerciseOptions = useMemo(
    () =>
      (workout?.exercises ?? [])
        .map((exercise) => exercise.name ?? "")
        .filter((name): name is string => Boolean(name)),
    [workout?.exercises],
  );

  const activeExerciseName = exerciseOptions[currentExercise] ?? exerciseOptions[0] ?? "";

  useEffect(() => {
    if (!activeExerciseName) return;
    setEntryForm((prev) => ({ ...prev, exercise: prev.exercise || activeExerciseName }));
  }, [activeExerciseName]);

  const completedSets = entries?.reduce((acc, entry) => acc + (entry.sets ?? 0), 0) ?? 0;

  const handleEntryChange = (field: keyof SessionEntryForm, value: string) => {
    setEntryForm((prev) => ({
      ...prev,
      [field]: field === "exercise" ? value : value === "" ? undefined : Number(value),
    }));
  };

  const handleAddEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !entryForm.exercise.trim()) return;

    const payload = {
      ...entryForm,
      sets: Number(entryForm.sets) || 1,
      reps: Number(entryForm.reps) || 1,
      loadKg: entryForm.loadKg === undefined ? undefined : Number(entryForm.loadKg),
      rpe: entryForm.rpe === undefined ? undefined : Number(entryForm.rpe),
    };

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/workout-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: [payload] }),
      });
      if (!response.ok) {
        setError(t("workoutDetail.sessionSaveError"));
        return;
      }
      const updated = (await response.json()) as WorkoutSession;
      setEntries(updated.entries ?? []);
      setEntryForm((prev) => ({ ...DEFAULT_ENTRY_FORM, exercise: prev.exercise }));
    } catch (_err) {
      setError(t("workoutDetail.sessionSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!session) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/workout-sessions/${session.id}/finish`, { method: "POST" });
      if (!response.ok) {
        setError(t("workoutDetail.sessionFinishError"));
        return;
      }
      const updated = (await response.json()) as WorkoutSession;
      setSession(updated);
    } catch (_err) {
      setError(t("workoutDetail.sessionFinishError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock title={t("ui.loading")} />;

  if (error || !workout) {
    return (
      <ErrorBlock
        title={t("workoutDetail.loadError")}
        description={error ?? t("workoutDetail.loadError")}
        retryAction={
          <Link className="btn secondary" href="/app/entrenamientos">
            {t("workoutDetail.backToWorkouts")}
          </Link>
        }
      />
    );
  }

  if (Boolean(session?.finishedAt)) {
    return (
      <section className="mx-auto max-w-xl px-4 pb-20 pt-10">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15">
            🏆
          </div>
        </div>

        <h1 className="text-center text-2xl font-bold text-text">Sesion completada</h1>
        <p className="mb-6 text-center text-sm text-text-muted">Resumen de tu entrenamiento</p>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <article className="rounded-2xl border border-border bg-surface p-3 text-center">
            <p className="mb-1 text-sm">⏱</p>
            <p className="text-lg font-semibold text-text">{Math.max(1, Math.round(completedSets * 2.5))}</p>
            <p className="text-xs text-text-muted">minutos</p>
          </article>
          <article className="rounded-2xl border border-border bg-surface p-3 text-center">
            <p className="mb-1 text-sm">🏋️</p>
            <p className="text-lg font-semibold text-text">{completedSets}</p>
            <p className="text-xs text-text-muted">series</p>
          </article>
          <article className="rounded-2xl border border-border bg-surface p-3 text-center">
            <p className="mb-1 text-sm">🔥</p>
            <p className="text-lg font-semibold text-text">{Math.round(completedSets * 18)}</p>
            <p className="text-xs text-text-muted">kcal est.</p>
          </article>
        </div>

        <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-text">Esfuerzo percibido (RPE)</p>
          <div className="mt-3 grid grid-cols-10 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setRpe(level)}
                className={`h-9 rounded-lg text-xs ${rpe === level ? "bg-accent text-black" : "bg-surface-muted text-text-muted"}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-text">Energia despues</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setEnergia(level)}
                className={`h-10 rounded-xl text-xs ${energia === level ? "bg-accent text-black" : "bg-surface-muted text-text-muted"}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <Link href="/app/entrenamientos" className="btn w-full">
          Volver a entrenamientos
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 pb-28 pt-6 md:px-6">
      <header className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <Link className="text-xs text-text-muted hover:text-text" href={`/app/entrenamientos/${workout.id}`}>
          {t("workoutDetail.backToWorkouts")}
        </Link>
        <h1 className="mt-1 text-xl font-bold text-text md:text-2xl">{workout.name}</h1>
        <p className="text-sm text-text-muted">{t("workoutDetail.sessionSubtitle")}</p>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <article className="rounded-2xl border border-border bg-surface p-3 text-center">
          <p className="mb-1 text-sm">⏱</p>
          <p className="text-base font-semibold text-text">{Math.max(1, Math.round(completedSets * 2.5))}</p>
          <p className="text-xs text-text-muted">min</p>
        </article>
        <article className="rounded-2xl border border-border bg-surface p-3 text-center">
          <p className="mb-1 text-sm">🏋️</p>
          <p className="text-base font-semibold text-text">{entries?.length ?? 0}</p>
          <p className="text-xs text-text-muted">logs</p>
        </article>
        <article className="rounded-2xl border border-border bg-surface p-3 text-center">
          <p className="mb-1 text-sm">🔥</p>
          <p className="text-base font-semibold text-text">{completedSets}</p>
          <p className="text-xs text-text-muted">sets</p>
        </article>
      </div>

      <form onSubmit={handleAddEntry} className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-text">{activeExerciseName || t("workoutDetail.sessionExerciseLabel")}</p>
          <p className="text-xs text-text-muted">{currentExercise + 1}/{Math.max(exerciseOptions.length, 1)}</p>
        </div>

        <label className="mb-3 block space-y-1">
          <span className="text-xs text-text-muted">{t("workoutDetail.sessionExerciseLabel")}</span>
          <select
            className="w-full"
            value={entryForm.exercise}
            onChange={(event) => handleEntryChange("exercise", event.target.value)}
            required
          >
            <option value="">{t("workoutDetail.sessionExercisePlaceholder")}</option>
            {exerciseOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-text-muted">{t("workoutDetail.sessionSetsLabel")}</span>
            <input className="w-full" type="number" min={1} value={entryForm.sets} onChange={(event) => handleEntryChange("sets", event.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-text-muted">{t("workoutDetail.sessionRepsLabel")}</span>
            <input className="w-full" type="number" min={1} value={entryForm.reps} onChange={(event) => handleEntryChange("reps", event.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-text-muted">{t("workoutDetail.sessionLoadLabel")}</span>
            <input className="w-full" type="number" min={0} value={entryForm.loadKg ?? ""} onChange={(event) => handleEntryChange("loadKg", event.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-text-muted">{t("workoutDetail.sessionRpeLabel")}</span>
            <input className="w-full" type="number" min={1} max={10} value={entryForm.rpe ?? ""} onChange={(event) => handleEntryChange("rpe", event.target.value)} />
          </label>
        </div>

        <button type="submit" className="btn mt-4 w-full" disabled={saving || !session}>
          {saving ? t("workoutDetail.sessionSaving") : t("workoutDetail.sessionAdd")}
        </button>
      </form>

      <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-text">{t("workoutDetail.setsLabel")}</h2>
        {entries && entries.length > 0 ? (
          <div className="mt-3 space-y-2">
            {entries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-border bg-surface-muted p-3 text-sm">
                <p className="font-medium text-text">{entry.exercise}</p>
                <p className="text-xs text-text-muted">
                  {entry.sets} sets · {entry.reps} reps · {entry.loadKg ?? "—"} kg · RPE {entry.rpe ?? "—"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyBlock
            centered={false}
            className="px-0 py-6"
            title={t("workoutDetail.sessionEmpty")}
            description={t("workoutDetail.sessionExercisePlaceholder")}
          />
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl gap-3 px-4 py-3 md:px-6">
          <button
            type="button"
            className="btn secondary flex-1"
            disabled={currentExercise === 0}
            onClick={() => setCurrentExercise((prev) => Math.max(prev - 1, 0))}
          >
            ← Anterior
          </button>
          <button
            type="button"
            className="btn flex-1"
            onClick={() => {
              if (currentExercise >= exerciseOptions.length - 1) {
                void handleFinish();
                return;
              }
              setCurrentExercise((prev) => Math.min(prev + 1, exerciseOptions.length - 1));
              const next = exerciseOptions[Math.min(currentExercise + 1, exerciseOptions.length - 1)] ?? "";
              setEntryForm((prev) => ({ ...prev, exercise: next }));
            }}
            disabled={saving || !session}
          >
            {currentExercise >= exerciseOptions.length - 1 ? t("workoutDetail.sessionFinish") : "Siguiente"}
            {currentExercise < exerciseOptions.length - 1 ? " →" : null}
          </button>
        </div>
      </div>
    </section>
  );
}
