"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyBlock, ErrorBlock, LoadingBlock, PageContainer, Stack } from "@/design-system";
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
    [workout?.exercises]
  );

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

  if (loading) {
    return <LoadingBlock title={t("ui.loading")} />;
  }

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

  return (
    <PageContainer as="section" maxWidth="lg" className="pb-32 pt-4 md:pt-8">
      <Stack gap="6">
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-4 md:p-6">
          <Stack gap="3">
            <Link className="text-sm text-text-muted hover:text-text" href={`/app/entrenamientos/${workout.id}`}>
              {t("workoutDetail.backToWorkouts")}
            </Link>
            <h1 className="m-0 text-2xl font-semibold text-text md:text-3xl">{workout.name}</h1>
            <p className="m-0 text-sm text-text-muted">{t("workoutDetail.sessionSubtitle")}</p>
            <div className="grid grid-cols-2 gap-3 text-xs md:max-w-md md:text-sm">
              <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-muted)] p-3">
                <p className="m-0 text-text-muted">{t("workoutDetail.setsLabel")}</p>
                <p className="m-0 mt-1 text-lg font-semibold text-text">{completedSets}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-muted)] p-3">
                <p className="m-0 text-text-muted">{t("workoutDetail.exercisesLabel")}</p>
                <p className="m-0 mt-1 text-lg font-semibold text-text">{entries?.length ?? 0}</p>
              </div>
            </div>
          </Stack>
        </div>

        <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-4 md:p-6">
          <form onSubmit={handleAddEntry} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text">{t("workoutDetail.sessionExerciseLabel")}</span>
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

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-text">{t("workoutDetail.sessionSetsLabel")}</span>
                <input
                  className="w-full"
                  type="number"
                  min={1}
                  value={entryForm.sets}
                  onChange={(event) => handleEntryChange("sets", event.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-text">{t("workoutDetail.sessionRepsLabel")}</span>
                <input
                  className="w-full"
                  type="number"
                  min={1}
                  value={entryForm.reps}
                  onChange={(event) => handleEntryChange("reps", event.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-text">{t("workoutDetail.sessionLoadLabel")}</span>
                <input
                  className="w-full"
                  type="number"
                  min={0}
                  value={entryForm.loadKg ?? ""}
                  onChange={(event) => handleEntryChange("loadKg", event.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-text">{t("workoutDetail.sessionRpeLabel")}</span>
                <input
                  className="w-full"
                  type="number"
                  min={1}
                  max={10}
                  value={entryForm.rpe ?? ""}
                  onChange={(event) => handleEntryChange("rpe", event.target.value)}
                />
              </label>
            </div>

            <button type="submit" className="btn" disabled={saving || !session}>
              {saving ? t("workoutDetail.sessionSaving") : t("workoutDetail.sessionAdd")}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-4 md:p-6">
          <h2 className="m-0 text-lg font-semibold text-text">{t("workoutDetail.setsLabel")}</h2>
          {entries && entries.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-text-muted">
                    <th className="border-b border-[var(--color-border-default)] py-2 pr-3 font-medium">{t("workoutDetail.sessionExerciseLabel")}</th>
                    <th className="border-b border-[var(--color-border-default)] py-2 pr-3 font-medium">{t("workoutDetail.sessionSetsLabel")}</th>
                    <th className="border-b border-[var(--color-border-default)] py-2 pr-3 font-medium">{t("workoutDetail.sessionRepsLabel")}</th>
                    <th className="border-b border-[var(--color-border-default)] py-2 pr-3 font-medium">Kg</th>
                    <th className="border-b border-[var(--color-border-default)] py-2 font-medium">{t("workoutDetail.sessionRpeLabel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="text-text">
                      <td className="border-b border-[var(--color-border-default)] py-3 pr-3">{entry.exercise}</td>
                      <td className="border-b border-[var(--color-border-default)] py-3 pr-3">{entry.sets}</td>
                      <td className="border-b border-[var(--color-border-default)] py-3 pr-3">{entry.reps}</td>
                      <td className="border-b border-[var(--color-border-default)] py-3 pr-3">{entry.loadKg ?? "—"}</td>
                      <td className="border-b border-[var(--color-border-default)] py-3">{entry.rpe ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyBlock
              centered={false}
              className="px-0 py-6"
              title={t("workoutDetail.sessionEmpty")}
              description={t("workoutDetail.sessionExercisePlaceholder")}
            />
          )}
        </div>
      </Stack>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]/95 backdrop-blur-sm">
        <PageContainer maxWidth="lg" as="div" className="py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 text-sm text-text-muted">
              {entries?.length ?? 0} logs · {completedSets} {t("workoutDetail.setsLabel").toLowerCase()}
            </p>
            <button type="button" className="btn secondary" onClick={handleFinish} disabled={!session || saving}>
              {t("workoutDetail.sessionFinish")}
            </button>
          </div>
        </PageContainer>
      </div>
    </PageContainer>
  );
}
