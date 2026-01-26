"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { Workout, WorkoutExercise, WorkoutSession } from "@/lib/types";

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

export default function WorkoutSessionClient({ workoutId }: WorkoutSessionClientProps) {
  const { t } = useLanguage();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [entries, setEntries] = useState<WorkoutSession["entries"]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState<SessionEntryForm>({
    exercise: "",
    sets: 3,
    reps: 10,
    loadKg: undefined,
    rpe: undefined,
  });

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
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
      } catch {
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

  const handleEntryChange = (field: keyof SessionEntryForm, value: string) => {
    setEntryForm((prev) => ({
      ...prev,
      [field]: field === "exercise" ? value : value === "" ? undefined : Number(value),
    }));
  };

  const handleAddEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !entryForm.exercise.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/workout-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: [entryForm] }),
      });
      if (!response.ok) {
        setError(t("workoutDetail.sessionSaveError"));
        return;
      }
      const updated = (await response.json()) as WorkoutSession;
      setEntries(updated.entries ?? []);
      setEntryForm((prev) => ({ ...prev, exercise: "" }));
    } catch {
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
    } catch {
      setError(t("workoutDetail.sessionFinishError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <p className="muted">{t("ui.loading")}</p>
      </section>
    );
  }

  if (error || !workout) {
    return (
      <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <p className="muted">{error ?? t("workoutDetail.loadError")}</p>
        <Link className="btn secondary" href="/app/entrenamientos">
          {t("workoutDetail.backToWorkouts")}
        </Link>
      </section>
    );
  }

  return (
    <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="form-stack">
        <Link className="muted" href={`/app/entrenamientos/${workout.id}`}>
          {t("workoutDetail.backToWorkouts")}
        </Link>
        <h1 className="section-title">{workout.name}</h1>
        <p className="section-subtitle">{t("workoutDetail.sessionSubtitle")}</p>
      </div>

      <form onSubmit={handleAddEntry} className="form-stack" style={{ marginTop: 16 }}>
        <label className="form-stack">
          {t("workoutDetail.sessionExerciseLabel")}
          <select
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <label className="form-stack">
            {t("workoutDetail.sessionSetsLabel")}
            <input
              type="number"
              min={1}
              value={entryForm.sets}
              onChange={(event) => handleEntryChange("sets", event.target.value)}
            />
          </label>
          <label className="form-stack">
            {t("workoutDetail.sessionRepsLabel")}
            <input
              type="number"
              min={1}
              value={entryForm.reps}
              onChange={(event) => handleEntryChange("reps", event.target.value)}
            />
          </label>
          <label className="form-stack">
            {t("workoutDetail.sessionLoadLabel")}
            <input
              type="number"
              min={0}
              value={entryForm.loadKg ?? ""}
              onChange={(event) => handleEntryChange("loadKg", event.target.value)}
            />
          </label>
          <label className="form-stack">
            {t("workoutDetail.sessionRpeLabel")}
            <input
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

      <div style={{ marginTop: 16 }}>
        {entries && entries.length > 0 ? (
          <div className="form-stack">
            {entries.map((entry) => (
              <div key={entry.id} className="feature-card">
                <strong>{entry.exercise}</strong>
                <p className="muted">
                  {entry.sets}x{entry.reps} · {entry.loadKg ?? 0} kg · RPE {entry.rpe ?? "-"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">{t("workoutDetail.sessionEmpty")}</p>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button type="button" className="btn secondary" onClick={handleFinish} disabled={!session || saving}>
          {t("workoutDetail.sessionFinish")}
        </button>
      </div>
    </section>
  );
}
