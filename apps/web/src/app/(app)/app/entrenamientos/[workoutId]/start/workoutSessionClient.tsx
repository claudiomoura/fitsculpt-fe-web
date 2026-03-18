"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/design-system/components/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import { trackEvent } from "@/lib/analytics";
import type { Workout, WorkoutExercise, WorkoutSession } from "@/lib/types";

type WorkoutSessionClientProps = {
  workoutId: string;
};

type DraftRow = {
  reps: string;
  loadKg: string;
  done: boolean;
  saved?: boolean;
};

type ExerciseMeta = {
  equipment?: string | null;
  imageUrl?: string | null;
  posterUrl?: string | null;
  mediaUrl?: string | null;
};

const DEFAULT_DRAFT: DraftRow = {
  reps: "",
  loadKg: "",
  done: false,
  saved: false,
};

function parsePositiveNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim();
    const direct = Number(normalized);
    if (Number.isFinite(direct)) return direct;
    const match = normalized.match(/\d+(?:[\.,]\d+)?/);
    const parsed = match ? Number(match[0].replace(",", ".")) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseSetCount(value: WorkoutExercise["sets"]) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : null;
  }
  return null;
}

function parseRepsText(value: WorkoutExercise["reps"], setsValue: WorkoutExercise["sets"]) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof setsValue === "string") {
    const match = setsValue.match(/x\s*(.+)$/i);
    return match?.[1]?.trim() ?? "";
  }
  return "";
}

function formatElapsed(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function inferBodyweightByName(name: string) {
  const normalized = name.trim().toLowerCase();
  return [
    "dominada",
    "pull-up",
    "pull up",
    "push-up",
    "push up",
    "flexion",
    "flexión",
    "plancha",
    "plank",
    "burpee",
    "dip",
    "fondo",
    "mountain climber",
    "hollow",
    "l-sit",
    "handstand",
  ].some((keyword) => normalized.includes(keyword));
}

function isBodyweightExercise(exercise: WorkoutExercise | null | undefined, meta?: ExerciseMeta | null) {
  const equipment = meta?.equipment?.toLowerCase() ?? "";
  if (equipment.includes("bodyweight") || equipment.includes("peso corporal")) return true;
  return inferBodyweightByName(exercise?.name ?? "");
}

function buildDefaultDraft(exercise: WorkoutExercise | null | undefined, lastEntry?: { reps?: number | null; loadKg?: number | null } | null) {
  const defaultReps = lastEntry?.reps ? String(lastEntry.reps) : parseRepsText(exercise?.reps, exercise?.sets) || "";
  const defaultLoad = lastEntry?.loadKg !== null && lastEntry?.loadKg !== undefined
    ? String(lastEntry.loadKg)
    : exercise?.lastLog?.loadKg !== null && exercise?.lastLog?.loadKg !== undefined
      ? String(exercise.lastLog.loadKg)
      : "";

  return {
    reps: defaultReps,
    loadKg: defaultLoad,
    done: false,
    saved: false,
  } satisfies DraftRow;
}

function buildDraftRows(exercise: WorkoutExercise | null | undefined, count: number, entries: WorkoutSession["entries"] = []) {
  const safeCount = Math.max(1, count);
  const matchingEntries = (entries ?? []).filter((entry) => entry.exercise === (exercise?.name ?? ""));
  return Array.from({ length: safeCount }, (_, index) => {
    const savedEntry = matchingEntries[index];
    if (savedEntry) {
      return {
        reps: String(savedEntry.reps ?? ""),
        loadKg: savedEntry.loadKg !== null && savedEntry.loadKg !== undefined ? String(savedEntry.loadKg) : "",
        done: true,
        saved: true,
      } satisfies DraftRow;
    }
    return buildDefaultDraft(exercise, matchingEntries[index - 1] ?? exercise?.lastLog ?? null);
  });
}

function getExercisePreviewUrl(meta?: ExerciseMeta | null) {
  return meta?.imageUrl ?? meta?.posterUrl ?? meta?.mediaUrl ?? null;
}

export default function WorkoutSessionClient({ workoutId }: WorkoutSessionClientProps) {
  const { t } = useLanguage();
  const { notify } = useToast();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [entries, setEntries] = useState<WorkoutSession["entries"]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [rpe, setRpe] = useState(7);
  const [energia, setEnergia] = useState(3);
  const [restCountdown, setRestCountdown] = useState<number | null>(null);
  const [draftsByExercise, setDraftsByExercise] = useState<Record<number, DraftRow[]>>({});
  const [extraRowsByExercise, setExtraRowsByExercise] = useState<Record<number, number>>({});
  const [exerciseMetaById, setExerciseMetaById] = useState<Record<string, ExerciseMeta>>({});
  const loadInputRef = useRef<HTMLInputElement | null>(null);
  const repsInputRef = useRef<HTMLInputElement | null>(null);

  const loadWorkout = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/workouts/${workoutId}`, {
        cache: "no-store",
        signal,
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
  }, [t, workoutId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadWorkout(controller.signal);
    return () => controller.abort();
  }, [loadWorkout]);

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
        trackEvent("workout_started", { target: "training", origin: "session_start" });
      } catch (_err) {
        setError(t("workoutDetail.sessionStartError"));
      }
    };
    void startSession();
  }, [session, t, workout]);

  useEffect(() => {
    if (!session?.startedAt || session.finishedAt) return;
    const sync = () => {
      const startedAt = new Date(session.startedAt).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((now - startedAt) / 1000));
    };

    setElapsedSeconds(sync());
    const interval = window.setInterval(() => {
      setElapsedSeconds(sync());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [session?.finishedAt, session?.startedAt]);

  useEffect(() => {
    if (restCountdown === null || restCountdown <= 0) return;
    const interval = window.setInterval(() => {
      setRestCountdown((current) => {
        if (current === null || current <= 1) return null;
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [restCountdown]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const exercises = useMemo(() => workout?.exercises ?? [], [workout?.exercises]);
  const activeExercise = exercises[currentExercise] ?? null;
  const activeExerciseName = activeExercise?.name ?? "";
  const activeExerciseId = activeExercise?.exerciseId ?? activeExercise?.id ?? null;

  useEffect(() => {
    if (!activeExerciseId || exerciseMetaById[activeExerciseId]) return;
    let active = true;
    const loadMeta = async () => {
      try {
        const response = await fetch(`/api/exercises/${activeExerciseId}`, { cache: "no-store" });
        if (!response.ok || !active) return;
        const payload = (await response.json()) as ExerciseMeta;
        if (!active) return;
        setExerciseMetaById((prev) => ({ ...prev, [activeExerciseId]: payload }));
      } catch (_err) {
        if (!active) return;
      }
    };
    void loadMeta();
    return () => {
      active = false;
    };
  }, [activeExerciseId, exerciseMetaById]);

  useEffect(() => {
    const fallbackMetaKey = `name:${activeExerciseName.toLowerCase()}`;
    if (activeExerciseId || !activeExerciseName || exerciseMetaById[fallbackMetaKey]) return;
    let active = true;
    const loadMetaByName = async () => {
      try {
        const params = new URLSearchParams({ query: activeExerciseName, limit: "8", page: "1", offset: "0" });
        const response = await fetch(`/api/exercises?${params.toString()}`, { cache: "no-store" });
        if (!response.ok || !active) return;
        const payload = (await response.json()) as { items?: ExerciseMeta[]; data?: ExerciseMeta[] };
        const candidates = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : [];
        const exact = candidates.find((item) => {
          const candidateName = (item as ExerciseMeta & { name?: string | null }).name?.trim().toLowerCase();
          return candidateName === activeExerciseName.trim().toLowerCase();
        });
        const first = exact ?? candidates[0] ?? null;
        if (!first || !active) return;
        setExerciseMetaById((prev) => ({ ...prev, [fallbackMetaKey]: first }));
      } catch (_err) {
        if (!active) return;
      }
    };
    void loadMetaByName();
    return () => {
      active = false;
    };
  }, [activeExerciseId, activeExerciseName, exerciseMetaById]);

  const activeEntries = useMemo(() => (entries ?? []).filter((entry) => entry.exercise === activeExerciseName), [activeExerciseName, entries]);
  const activeExerciseMeta = activeExerciseId ? exerciseMetaById[activeExerciseId] : exerciseMetaById[`name:${activeExerciseName.toLowerCase()}`] ?? null;
  const activeIsBodyweight = isBodyweightExercise(activeExercise, activeExerciseMeta);
  const prescribedSetCount = Math.max(1, parseSetCount(activeExercise?.sets) ?? 3);
  const extraRows = extraRowsByExercise[currentExercise] ?? 0;
  const targetSetCount = prescribedSetCount + extraRows;
  const visibleRowCount = targetSetCount;
  const totalExercises = Math.max(exercises.length, 1);
  const totalLoggedSets = (entries ?? []).length;
  const totalTargetSets = exercises.reduce((sum, exercise) => sum + Math.max(1, parseSetCount(exercise.sets) ?? 3), 0);
  const exerciseComplete = activeEntries.length >= targetSetCount;
  const exercisePreviewUrl = getExercisePreviewUrl(activeExerciseMeta);
  const recommendedRepsText = parseRepsText(activeExercise?.reps, activeExercise?.sets) || "10";

  useEffect(() => {
    if (!activeExercise) return;
    setDraftsByExercise((prev) => {
      const nextRows = buildDraftRows(activeExercise, targetSetCount, entries);
      return {
        ...prev,
        [currentExercise]: nextRows,
      };
    });
  }, [activeExercise, currentExercise, entries, targetSetCount]);

  const currentRows = draftsByExercise[currentExercise] ?? buildDraftRows(activeExercise, targetSetCount, entries);
  const recommendedLoadText = currentRows.find((row) => row.loadKg)?.loadKg || (activeExercise?.lastLog?.loadKg !== null && activeExercise?.lastLog?.loadKg !== undefined ? String(activeExercise.lastLog.loadKg) : "");

  const updateRow = (rowIndex: number, updater: (current: DraftRow) => DraftRow) => {
    setDraftsByExercise((prev) => {
      const baseRows = prev[currentExercise] ?? currentRows;
      return {
        ...prev,
        [currentExercise]: baseRows.map((row, index) => (index === rowIndex ? updater(row) : row)),
      };
    });
  };

  const focusPrimaryInput = useCallback(() => {
    if (activeIsBodyweight) {
      repsInputRef.current?.focus();
      return;
    }
    loadInputRef.current?.focus();
  }, [activeIsBodyweight]);

  const goToExercise = (nextIndex: number) => {
    setInlineError(null);
    setCurrentExercise(nextIndex);
    window.setTimeout(() => focusPrimaryInput(), 40);
  };

  const addExtraSet = () => {
    setExtraRowsByExercise((prev) => ({
      ...prev,
      [currentExercise]: (prev[currentExercise] ?? 0) + 1,
    }));
    setInlineError(null);
  };

  const pendingRows = currentRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.done && !row.saved);

  const savePendingRows = async () => {
    if (!session || !activeExerciseName) return;
    if (pendingRows.length === 0) {
      setInlineError("Marca al menos una serie para guardarla o pulsa Siguiente para saltar el ejercicio.");
      return;
    }

    for (const { row } of pendingRows) {
      const reps = parsePositiveNumber(row.reps);
      if (!reps || reps < 1) {
        setInlineError("Introduce repeticiones válidas en las series marcadas.");
        return;
      }
    }

    setSaving(true);
    setInlineError(null);
    setError(null);
    try {
      const payload = pendingRows.map(({ row }) => ({
        exercise: activeExerciseName,
        sets: 1,
        reps: parsePositiveNumber(row.reps) ?? 1,
        loadKg: parsePositiveNumber(row.loadKg) ?? undefined,
      }));

      const response = await fetch(`/api/workout-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: payload }),
      });
      if (!response.ok) {
        setError(t("workoutDetail.sessionSaveError"));
        return;
      }

      const updated = (await response.json()) as WorkoutSession;
      const updatedEntries = updated.entries ?? [];
      const updatedExerciseEntries = updatedEntries.filter((entry) => entry.exercise === activeExerciseName);
      setEntries(updatedEntries);
      setSession(updated);
      notify({ title: "Set guardado", variant: "success" });
      setDraftsByExercise((prev) => {
        const rebuilt = buildDraftRows(activeExercise, targetSetCount, updatedEntries);
        return { ...prev, [currentExercise]: rebuilt };
      });
      const restSeconds = parsePositiveNumber(activeExercise?.restSeconds);
      setRestCountdown(restSeconds && restSeconds > 0 ? restSeconds : null);
      if (updatedExerciseEntries.length >= targetSetCount && currentExercise < exercises.length - 1) {
        window.setTimeout(() => {
          goToExercise(Math.min(currentExercise + 1, exercises.length - 1));
        }, 120);
      } else {
        window.setTimeout(() => focusPrimaryInput(), 40);
      }
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
      notify({ title: "Sesión guardada", variant: "success" });
      trackEvent("workout_completed", { target: "training", origin: "session_finish" });
    } catch (_err) {
      setError(t("workoutDetail.sessionFinishError"));
    } finally {
      setSaving(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (pendingRows.length === 0) {
      if (currentExercise >= exercises.length - 1) {
        await handleFinish();
        return;
      }
      goToExercise(Math.min(currentExercise + 1, exercises.length - 1));
      return;
    }
    await savePendingRows();
  };

  const retryAll = async () => {
    setSession(null);
    setEntries([]);
    setError(null);
    await loadWorkout();
  };

  if (loading) {
    return (
      <section className="focus-session-page mx-auto max-w-3xl px-4 pt-4 md:px-6">
        <div className="card mb-4 p-4">
          <div className="ui-skeleton ui-skeleton--line w-35 mb-3" />
          <div className="ui-skeleton ui-skeleton--line w-60 mb-2" />
          <div className="ui-skeleton ui-skeleton--line w-25" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card p-4">
              <div className="ui-skeleton ui-skeleton--line w-40 mb-2" />
              <div className="ui-skeleton ui-skeleton--line w-25" />
            </div>
          ))}
        </div>
        <div className="card mt-4 p-4">
          <div className="ui-skeleton ui-skeleton--line w-45 mb-4" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="mb-3 grid grid-cols-[56px_1fr_1fr_64px] gap-2">
              <div className="ui-skeleton ui-skeleton--line h-12 w-full" />
              <div className="ui-skeleton ui-skeleton--line h-12 w-full" />
              <div className="ui-skeleton ui-skeleton--line h-12 w-full" />
              <div className="ui-skeleton ui-skeleton--line h-12 w-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || !workout) {
    return (
      <section className="focus-session-page mx-auto flex max-w-2xl px-4 pt-8 md:px-6">
        <div className="card w-full p-5">
          <p className="m-0 text-sm font-semibold text-primary">No pudimos cargar la sesión</p>
          <p className="muted mt-2">{error ?? t("workoutDetail.loadError")}</p>
          <div className="mt-4 flex gap-3">
            <button type="button" className="btn secondary" onClick={() => void retryAll()}>
              Reintentar
            </button>
            <Link className="btn" href={`/app/entrenamiento/${workoutId}`}>
              Volver
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (Boolean(session?.finishedAt)) {
    return (
      <section className="focus-session-page mx-auto max-w-xl px-4 pt-8 md:px-6">
        <div className="card p-5 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-2xl">🏆</div>
          <h1 className="section-title section-title-sm">Sesión completada</h1>
          <p className="section-subtitle">Resumen rápido de tu entrenamiento.</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <article className="feature-card p-3 text-center">
              <p className="muted m-0 text-xs">Tiempo</p>
              <strong>{formatElapsed(elapsedSeconds)}</strong>
            </article>
            <article className="feature-card p-3 text-center">
              <p className="muted m-0 text-xs">Series</p>
              <strong>{totalLoggedSets}</strong>
            </article>
            <article className="feature-card p-3 text-center">
              <p className="muted m-0 text-xs">Kcal est.</p>
              <strong>{Math.round(totalLoggedSets * 18)}</strong>
            </article>
          </div>

          <div className="mt-4 text-left">
            <p className="m-0 text-sm font-semibold text-primary">RPE final</p>
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

          <div className="mt-4 text-left">
            <p className="m-0 text-sm font-semibold text-primary">Energía final</p>
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

          <Link href="/app/entrenamiento" className="btn mt-6 flex w-full justify-center">
            Volver a entrenamientos
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="focus-session-page mx-auto max-w-3xl px-4 pt-3 md:px-6">
      <header className="card premium-surface-card mb-4 p-4">
        <div className="flex items-start gap-3">
          <Link className="btn secondary h-11 px-4" href={`/app/entrenamiento/${workout.id}`}>
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="muted m-0 text-xs uppercase tracking-wider">Sesión activa</p>
            <h1 className="m-0 mt-1 truncate text-lg font-semibold text-primary md:text-xl">{workout.name}</h1>
            <p className="muted m-0 mt-1 text-sm">{t("workoutDetail.sessionSubtitle")}</p>
          </div>
          <div className="text-right">
            <p className="muted m-0 text-xs uppercase tracking-wider">Timer</p>
            <strong className="block mt-1 text-base text-primary">{formatElapsed(elapsedSeconds)}</strong>
            <button type="button" className="btn secondary mt-3 h-10 px-4" onClick={() => void handleFinish()} disabled={saving || !session}>
              {t("workoutDetail.sessionFinish")}
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <article className="feature-card p-3">
          <p className="muted m-0 text-xs">Tiempo</p>
          <strong className="mt-1 block">{formatElapsed(elapsedSeconds)}</strong>
        </article>
        <article className="feature-card p-3">
          <p className="muted m-0 text-xs">Sets</p>
          <strong className="mt-1 block">{totalLoggedSets}/{Math.max(totalTargetSets, totalLoggedSets)}</strong>
        </article>
        <article className="feature-card p-3">
          <p className="muted m-0 text-xs">Ejercicio</p>
          <strong className="mt-1 block">{currentExercise + 1}/{totalExercises}</strong>
        </article>
        <article className="feature-card p-3">
          <p className="muted m-0 text-xs">Descanso</p>
          <strong className="mt-1 block">{restCountdown !== null ? `${restCountdown}s` : "Listo"}</strong>
        </article>
      </section>

      <section className="card premium-surface-card mt-4 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-border bg-surface-muted shrink-0">
              {exercisePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={exercisePreviewUrl} alt={activeExerciseName || "Ejercicio"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">🏋️</div>
              )}
            </div>
            <div className="min-w-0">
            <p className="muted m-0 text-xs uppercase tracking-wider">Ejercicio actual</p>
            <h2 className="m-0 mt-1 text-lg font-semibold text-primary">{activeExerciseName || t("workoutDetail.sessionExerciseLabel")}</h2>
            <p className="muted m-0 mt-1 text-sm">
              {Math.max(prescribedSetCount, 1)} series objetivo
              {activeExercise?.restSeconds ? ` · Descanso ${activeExercise.restSeconds}s` : ""}
            </p>
            </div>
          </div>
          <span className="badge">{currentExercise + 1}/{totalExercises}</span>
        </div>

        {inlineError ? <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{inlineError}</p> : null}
        {error ? <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p> : null}

        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-[56px_1fr_1fr_72px] items-center gap-2 bg-surface-muted px-3 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <span>Set</span>
            <span>{activeIsBodyweight ? "BW / +kg" : "Kg"}</span>
            <span>Reps</span>
            <span className="text-right">Done</span>
          </div>

          <div className="bg-surface">
            {currentRows.map((row, index) => {
              const setLabel = index + 1;

              if (row.saved) {
                return (
                  <div key={`${activeExerciseName}-saved-${setLabel}`} className="grid grid-cols-[56px_1fr_1fr_72px] items-center gap-2 border-t border-border px-3 py-3">
                    <span className="text-sm font-semibold text-primary">{setLabel}</span>
                    <div className="text-sm text-text-muted">
                      {activeIsBodyweight ? (row.loadKg ? `BW + ${row.loadKg}` : "BW") : (row.loadKg || "-")}
                    </div>
                    <div className="text-sm text-text-muted">{row.reps || recommendedRepsText}</div>
                    <div className="text-right text-success">✓</div>
                  </div>
                );
              }
              return (
                <div key={`${activeExerciseName}-draft-${setLabel}`} className="grid grid-cols-[56px_1fr_1fr_72px] items-center gap-2 border-t border-border px-3 py-3">
                  <span className="text-sm font-semibold text-primary">{setLabel}</span>
                  <div>
                    {activeIsBodyweight ? (
                      <div className="flex items-center gap-2">
                        <span className="badge">BW</span>
                        <input
                          ref={index === 0 ? loadInputRef : null}
                          className="w-full"
                          inputMode="decimal"
                          placeholder="+kg"
                          value={row.loadKg}
                          onChange={(event) => updateRow(index, (current) => ({ ...current, loadKg: event.target.value }))}
                        />
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={index === 0 ? loadInputRef : null}
                          className="w-full"
                          type="number"
                          min={0}
                          inputMode="decimal"
                          placeholder={recommendedLoadText || "0"}
                          value={row.loadKg}
                          onChange={(event) => updateRow(index, (current) => ({ ...current, loadKg: event.target.value }))}
                        />
                        <span className="muted mt-1 block text-[11px]">kg</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={index === 0 ? repsInputRef : null}
                    className="w-full"
                    type="text"
                    inputMode="numeric"
                    placeholder={recommendedRepsText}
                    value={row.reps}
                    onChange={(event) => updateRow(index, (current) => ({ ...current, reps: event.target.value }))}
                  />
                  <label className="flex items-center justify-end">
                    <input
                      type="checkbox"
                      checked={row.done}
                      onChange={(event) => updateRow(index, (current) => ({ ...current, done: event.target.checked }))}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn secondary h-11" onClick={addExtraSet}>
            Añadir set
          </button>
          {activeIsBodyweight ? <span className="badge">Ejercicio con peso corporal</span> : null}
        </div>
      </section>

      <div className="focus-session-sticky-bar fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl gap-3 px-4 pt-3 md:px-6">
          <button
            type="button"
            className="btn secondary flex-1 h-12"
            disabled={currentExercise === 0 || saving}
            onClick={() => goToExercise(Math.max(currentExercise - 1, 0))}
          >
            ← Anterior
          </button>
          <button
            type="button"
            className="btn flex-1 h-12"
            onClick={() => void handlePrimaryAction()}
            disabled={saving || !session}
          >
            {saving
              ? t("workoutDetail.sessionSaving")
              : pendingRows.length === 0
                ? currentExercise >= exercises.length - 1
                  ? t("workoutDetail.sessionFinish")
                  : "Siguiente →"
                : "Guardar set"}
          </button>
        </div>
      </div>
    </section>
  );
}
