"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  id?: string;
  exerciseId?: string;
  name?: string;
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

function parseRepsText(
  value: WorkoutExercise["reps"],
  setsValue: WorkoutExercise["sets"],
) {
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
  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
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

function isBodyweightExercise(
  exercise: WorkoutExercise | null | undefined,
  meta?: ExerciseMeta | null,
) {
  const equipment = meta?.equipment?.toLowerCase() ?? "";
  if (equipment.includes("bodyweight") || equipment.includes("peso corporal"))
    return true;
  return inferBodyweightByName(exercise?.name ?? "");
}

function buildDefaultDraft(
  exercise: WorkoutExercise | null | undefined,
  lastEntry?: { reps?: number | null; loadKg?: number | null } | null,
) {
  const defaultReps = lastEntry?.reps
    ? String(lastEntry.reps)
    : parseRepsText(exercise?.reps, exercise?.sets) || "";
  const defaultLoad =
    lastEntry?.loadKg !== null && lastEntry?.loadKg !== undefined
      ? String(lastEntry.loadKg)
      : exercise?.lastLog?.loadKg !== null &&
          exercise?.lastLog?.loadKg !== undefined
        ? String(exercise.lastLog.loadKg)
        : "";

  return {
    reps: defaultReps,
    loadKg: defaultLoad,
    done: false,
    saved: false,
  } satisfies DraftRow;
}

function buildDraftRows(
  exercise: WorkoutExercise | null | undefined,
  count: number,
  entries: WorkoutSession["entries"] = [],
) {
  const safeCount = Math.max(1, count);
  const matchingEntries = (entries ?? []).filter(
    (entry) => entry.exercise === (exercise?.name ?? ""),
  );
  return Array.from({ length: safeCount }, (_, index) => {
    const savedEntry = matchingEntries[index];
    if (savedEntry) {
      return {
        reps: String(savedEntry.reps ?? ""),
        loadKg:
          savedEntry.loadKg !== null && savedEntry.loadKg !== undefined
            ? String(savedEntry.loadKg)
            : "",
        done: true,
        saved: true,
      } satisfies DraftRow;
    }
    return buildDefaultDraft(
      exercise,
      matchingEntries[index - 1] ?? exercise?.lastLog ?? null,
    );
  });
}

function getExercisePreviewUrl(meta?: ExerciseMeta | null) {
  return meta?.imageUrl ?? meta?.posterUrl ?? meta?.mediaUrl ?? null;
}

export default function WorkoutSessionClient({
  workoutId,
}: WorkoutSessionClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { notify } = useToast();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [entries, setEntries] = useState<WorkoutSession["entries"]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [currentExercise, setCurrentExercise] = useState(0);
  const [rpe, setRpe] = useState(7);
  const [energia, setEnergia] = useState(3);
  const [restCountdown, setRestCountdown] = useState<number | null>(null);
  const [draftsByExercise, setDraftsByExercise] = useState<
    Record<number, DraftRow[]>
  >({});
  const [extraRowsByExercise, setExtraRowsByExercise] = useState<
    Record<number, number>
  >({});
  const [exerciseMetaById, setExerciseMetaById] = useState<
    Record<string, ExerciseMeta>
  >({});
  const loadInputRef = useRef<HTMLInputElement | null>(null);
  const repsInputRef = useRef<HTMLInputElement | null>(null);

  const loadWorkout = useCallback(
    async (signal?: AbortSignal) => {
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
    },
    [t, workoutId],
  );

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
        trackEvent("workout_started", {
          target: "training",
          origin: "session_start",
        });
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
  const exercises = useMemo(
    () => workout?.exercises ?? [],
    [workout?.exercises],
  );
  const activeExercise = exercises[currentExercise] ?? null;
  const activeExerciseName = activeExercise?.name ?? "";
  const activeExerciseId =
    activeExercise?.exerciseId ?? activeExercise?.id ?? null;

  useEffect(() => {
    if (!activeExerciseId || exerciseMetaById[activeExerciseId]) return;
    let active = true;
    const loadMeta = async () => {
      try {
        const response = await fetch(`/api/exercises/${activeExerciseId}`, {
          cache: "no-store",
        });
        if (!response.ok || !active) return;
        const payload = (await response.json()) as ExerciseMeta;
        if (!active) return;
        setExerciseMetaById((prev) => ({
          ...prev,
          [activeExerciseId]: payload,
        }));
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
    if (
      !activeExerciseName ||
      exerciseMetaById[fallbackMetaKey] ||
      (activeExerciseId && exerciseMetaById[activeExerciseId])
    )
      return;
    let active = true;
    const loadMetaByName = async () => {
      try {
        const params = new URLSearchParams({
          query: activeExerciseName,
          limit: "8",
          page: "1",
          offset: "0",
        });
        const response = await fetch(`/api/exercises?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok || !active) return;
        const payload = (await response.json()) as {
          items?: ExerciseMeta[];
          data?: ExerciseMeta[];
        };
        const candidates = Array.isArray(payload.items)
          ? payload.items
          : Array.isArray(payload.data)
            ? payload.data
            : [];
        const exact = candidates.find((item) => {
          const candidateName = (
            item as ExerciseMeta & { name?: string | null }
          ).name
            ?.trim()
            .toLowerCase();
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

  const activeExerciseMeta = activeExerciseId
    ? exerciseMetaById[activeExerciseId]
    : (exerciseMetaById[`name:${activeExerciseName.toLowerCase()}`] ?? null);
  const resolvedExerciseLibraryId =
    activeExerciseMeta?.id ??
    activeExerciseMeta?.exerciseId ??
    (typeof activeExercise?.exerciseId === "string"
      ? activeExercise.exerciseId
      : null);
  const activeExerciseDetailHref = useMemo(() => {
    if (!resolvedExerciseLibraryId) return null;
    const params = new URLSearchParams();
    params.set("from", "plan");
    const dayKey = searchParams.get("dayKey") ?? searchParams.get("day");
    if (dayKey) params.set("dayKey", dayKey);
    const currentParams = searchParams.toString();
    const returnTo = `${pathname}${currentParams ? `?${currentParams}` : ""}`;
    params.set("returnTo", returnTo);
    return `/app/biblioteca/${encodeURIComponent(resolvedExerciseLibraryId)}?${params.toString()}`;
  }, [pathname, resolvedExerciseLibraryId, searchParams]);
  const activeIsBodyweight = isBodyweightExercise(
    activeExercise,
    activeExerciseMeta,
  );
  const prescribedSetCount = Math.max(
    1,
    parseSetCount(activeExercise?.sets) ?? 3,
  );
  const extraRows = extraRowsByExercise[currentExercise] ?? 0;
  const targetSetCount = prescribedSetCount + extraRows;
  const hasExercises = exercises.length > 0;
  const totalExercises = Math.max(exercises.length, 1);
  const totalLoggedSets = (entries ?? []).length;
  const totalTargetSets = exercises.reduce(
    (sum, exercise) => sum + Math.max(1, parseSetCount(exercise.sets) ?? 3),
    0,
  );
  const exercisePreviewUrl = getExercisePreviewUrl(activeExerciseMeta);
  const recommendedRepsText =
    parseRepsText(activeExercise?.reps, activeExercise?.sets) || "10";

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

  const currentRows =
    draftsByExercise[currentExercise] ??
    buildDraftRows(activeExercise, targetSetCount, entries);
  const recommendedLoadText =
    currentRows.find((row) => row.loadKg)?.loadKg ||
    (activeExercise?.lastLog?.loadKg !== null &&
    activeExercise?.lastLog?.loadKg !== undefined
      ? String(activeExercise.lastLog.loadKg)
      : "");

  const updateRow = (
    rowIndex: number,
    updater: (current: DraftRow) => DraftRow,
  ) => {
    setDraftsByExercise((prev) => {
      const baseRows = prev[currentExercise] ?? currentRows;
      return {
        ...prev,
        [currentExercise]: baseRows.map((row, index) =>
          index === rowIndex ? updater(row) : row,
        ),
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

  const saveRows = async (
    rowsToPersist: Array<{ row: DraftRow }>,
    options?: { silent?: boolean },
  ) => {
    if (!session || !activeExerciseName) return;
    if (rowsToPersist.length === 0) {
      if (!options?.silent)
        setInlineError(
          "Marca al menos una serie para guardarla o pulsa Siguiente para saltar el ejercicio.",
        );
      return;
    }

    for (const { row } of rowsToPersist) {
      const reps = parsePositiveNumber(row.reps);
      if (!reps || reps < 1) {
        if (!options?.silent)
          setInlineError(
            "Introduce repeticiones válidas en las series marcadas.",
          );
        return;
      }
    }

    setSaving(true);
    setAutosaveState("saving");
    setInlineError(null);
    setError(null);
    try {
      const payload = rowsToPersist.map(({ row }) => ({
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
      const updatedExerciseEntries = updatedEntries.filter(
        (entry) => entry.exercise === activeExerciseName,
      );
      setEntries(updatedEntries);
      setSession(updated);
      setAutosaveState("saved");
      if (!options?.silent)
        notify({ title: "Set guardado", variant: "success" });
      setDraftsByExercise((prev) => {
        const rebuilt = buildDraftRows(
          activeExercise,
          targetSetCount,
          updatedEntries,
        );
        return { ...prev, [currentExercise]: rebuilt };
      });
      const restSeconds = parsePositiveNumber(activeExercise?.restSeconds);
      setRestCountdown(restSeconds && restSeconds > 0 ? restSeconds : null);
      if (
        !options?.silent &&
        updatedExerciseEntries.length >= targetSetCount &&
        currentExercise < exercises.length - 1
      ) {
        window.setTimeout(() => {
          goToExercise(Math.min(currentExercise + 1, exercises.length - 1));
        }, 120);
      } else if (!options?.silent) {
        window.setTimeout(() => focusPrimaryInput(), 40);
      }
    } catch (_err) {
      setAutosaveState("error");
      setError(t("workoutDetail.sessionSaveError"));
    } finally {
      setSaving(false);
      window.setTimeout(() => {
        setAutosaveState((current) => (current === "saved" ? "idle" : current));
      }, 1200);
    }
  };

  const savePendingRows = async () => {
    await saveRows(pendingRows);
  };

  const handleDoneToggle = async (rowIndex: number, checked: boolean) => {
    const baseRows = draftsByExercise[currentExercise] ?? currentRows;
    const targetRow = baseRows[rowIndex];
    if (!targetRow || targetRow.saved) return;

    const nextRow = { ...targetRow, done: checked };
    updateRow(rowIndex, () => nextRow);

    if (!checked) {
      setAutosaveState("idle");
      return;
    }

    const reps = parsePositiveNumber(nextRow.reps);
    if (!reps || reps < 1) {
      updateRow(rowIndex, (current) => ({ ...current, done: false }));
      setInlineError(
        "Introduce repeticiones válidas antes de marcar el set como hecho.",
      );
      setAutosaveState("error");
      return;
    }

    await saveRows([{ row: nextRow }], { silent: true });
  };

  const handleFinish = async () => {
    if (!session) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/workout-sessions/${session.id}/finish`,
        { method: "POST" },
      );
      if (!response.ok) {
        setError(t("workoutDetail.sessionFinishError"));
        return;
      }
      const updated = (await response.json()) as WorkoutSession;
      setSession(updated);
      notify({ title: "Sesión guardada", variant: "success" });
      trackEvent("workout_completed", {
        target: "training",
        origin: "session_finish",
      });
    } catch (_err) {
      setError(t("workoutDetail.sessionFinishError"));
    } finally {
      setSaving(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (pendingRows.length === 0) {
      if (currentExercise >= exercises.length - 1) {
        setInlineError(
          "Ya estás en el último ejercicio. Finaliza la sesión cuando termines.",
        );
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
      <section className="focus-session-page nutrition-page-shell">
        <div className="surface-loading-card mb-4 p-4">
          <div className="ui-skeleton ui-skeleton--line w-35 mb-3" />
          <div className="ui-skeleton ui-skeleton--line w-60 mb-2" />
          <div className="ui-skeleton ui-skeleton--line w-25" />
        </div>
        <div className="surface-loading-card p-4">
          <div className="ui-skeleton ui-skeleton--line w-45 mb-3" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="mb-3 grid grid-cols-[56px_1fr_1fr_64px] gap-2"
            >
              <div className="ui-skeleton ui-skeleton--line h-12 w-full" />
              <div className="ui-skeleton ui-skeleton--line h-12 w-full" />
              <div className="ui-skeleton ui-skeleton--line h-12 w-full" />
              <div className="ui-skeleton ui-skeleton--line h-12 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="surface-loading-card p-3">
              <div className="ui-skeleton ui-skeleton--line w-40 mb-2" />
              <div className="ui-skeleton ui-skeleton--line w-25" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || !workout) {
    return (
      <section className="focus-session-page nutrition-page-shell flex pt-8">
        <div className="card w-full p-5">
          <p className="m-0 text-sm font-semibold text-primary">
            No pudimos cargar la sesión
          </p>
          <p className="muted mt-2">{error ?? t("workoutDetail.loadError")}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn secondary"
              onClick={() => void retryAll()}
            >
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

  if (!hasExercises) {
    return (
      <section className="focus-session-page nutrition-page-shell pt-6">
        <div className="card premium-surface-card p-5">
          <p className="m-0 text-sm font-semibold text-primary">
            Esta sesión no tiene ejercicios
          </p>
          <p className="muted mt-2">
            Vuelve al entrenamiento para revisar o asignar ejercicios antes de
            empezar.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              className="btn secondary"
              href={`/app/entrenamiento/${workoutId}`}
            >
              Volver
            </Link>
            <button
              type="button"
              className="btn"
              onClick={() => void retryAll()}
            >
              Reintentar
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (Boolean(session?.finishedAt)) {
    return (
      <section className="focus-session-page nutrition-page-shell pt-4">
        <div className="focus-session-complete">
          <div className="focus-session-complete-icon">🏆</div>
          <div>
            <h1 className="focus-session-complete-title">
              ¡Sesión completada!
            </h1>
            <p className="focus-session-complete-subtitle">
              Buen trabajo. Aquí está tu resumen.
            </p>
          </div>

          <div className="w-full max-w-sm">
            <div className="grid grid-cols-3 gap-3">
              <article className="focus-session-summary-item">
                <p>Tiempo</p>
                <strong>{formatElapsed(elapsedSeconds)}</strong>
              </article>
              <article className="focus-session-summary-item">
                <p>Series</p>
                <strong>{totalLoggedSets}</strong>
              </article>
              <article className="focus-session-summary-item">
                <p>Kcal est.</p>
                <strong>{Math.round(totalLoggedSets * 18)}</strong>
              </article>
            </div>

            <div className="mt-5 text-left">
              <p className="m-0 text-sm font-bold text-primary">
                ¿Cómo te sentiste?
              </p>
              <p className="muted m-0 mt-1 text-xs">RPE (esfuerzo percibido)</p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setRpe(level)}
                    className={`h-10 rounded-xl text-sm font-bold transition-all ${
                      rpe === level
                        ? "bg-accent text-black scale-105"
                        : "bg-surface-muted text-text-muted hover:bg-surface-alt"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 text-left">
              <p className="muted m-0 text-xs font-bold uppercase tracking-wider">
                Energía
              </p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEnergia(level)}
                    className={`h-11 rounded-xl text-sm font-bold transition-all ${
                      energia === level
                        ? "bg-accent text-black scale-105"
                        : "bg-surface-muted text-text-muted hover:bg-surface-alt"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <Link
              href="/app/entrenamiento"
              className="btn mt-6 flex w-full justify-center h-12 text-base font-bold rounded-2xl"
            >
              Volver a entrenamientos →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="focus-session-page nutrition-page-shell pt-1">
      <header className="card premium-surface-card focus-session-head mb-4 p-4">
        <div className="flex items-start gap-3">
          <Link
            className="btn secondary h-10 px-3"
            href={`/app/entrenamiento/${workout.id}`}
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="muted m-0 text-[11px] uppercase tracking-[0.1em]">
              Sesión activa
            </p>
            <h1 className="m-0 mt-1 truncate text-base font-semibold text-primary md:text-lg">
              {workout.name}
            </h1>
            <p className="muted m-0 mt-1 text-xs">
              {t("workoutDetail.sessionSubtitle")}
            </p>
          </div>
          <div className="text-right">
            <p className="muted m-0 text-[11px] uppercase tracking-[0.1em]">
              Tiempo
            </p>
            <strong className="mt-1 block text-sm text-primary">
              {formatElapsed(elapsedSeconds)}
            </strong>
          </div>
        </div>
      </header>

      <section className="card premium-surface-card mb-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="muted m-0 text-[11px] uppercase tracking-[0.1em]">
              Resumen de sesión
            </p>
            <p className="m-0 mt-1 text-sm font-semibold text-primary">
              {workout.name}
            </p>
            <p className="muted m-0 mt-1 text-xs">Sesión activa</p>
          </div>
          <button
            type="button"
            className="btn secondary focus-session-finish-btn h-9 px-3 text-xs"
            onClick={() => void handleFinish()}
            disabled={saving || !session}
          >
            {t("workoutDetail.sessionFinish")}
          </button>
        </div>
        <div className="focus-session-summary-grid mt-3">
          <article className="focus-session-summary-item">
            <p className="muted m-0 text-xs">Tiempo</p>
            <strong className="mt-1 block">
              {formatElapsed(elapsedSeconds)}
            </strong>
          </article>
          <article className="focus-session-summary-item">
            <p className="muted m-0 text-xs">Sets</p>
            <strong className="mt-1 block">
              {totalLoggedSets}/{Math.max(totalTargetSets, totalLoggedSets)}
            </strong>
          </article>
          <article className="focus-session-summary-item">
            <p className="muted m-0 text-xs">Ejercicio</p>
            <strong className="mt-1 block">
              {currentExercise + 1}/{totalExercises}
            </strong>
          </article>
          <article className="focus-session-summary-item">
            <p className="muted m-0 text-xs">Descanso</p>
            <strong className="mt-1 block">
              {restCountdown !== null ? `${restCountdown}s` : "Listo"}
            </strong>
          </article>
        </div>
      </section>

      <section className="card premium-hero-card focus-session-current-card">
        <div className="focus-session-exercise-hero">
          <div className="focus-session-exercise-hero-img">
            {exercisePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={exercisePreviewUrl}
                alt={activeExerciseName || "Ejercicio"}
              />
            ) : (
              <div className="focus-session-thumb-fallback flex h-full w-full items-center justify-center text-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path d="m8 11 2.5 3 2-2 3.5 4" />
                  <circle cx="9" cy="9" r="1" />
                </svg>
              </div>
            )}
          </div>
          <div className="focus-session-exercise-hero-info">
            <p className="focus-session-exercise-hero-label">
              Ejercicio {currentExercise + 1} de {totalExercises}
            </p>
            <h2 className="focus-session-exercise-hero-name">
              {activeExerciseName || t("workoutDetail.sessionExerciseLabel")}
            </h2>
            <div className="focus-session-exercise-hero-meta">
              <span className="focus-session-exercise-hero-badge">
                {Math.max(prescribedSetCount, 1)} × {recommendedRepsText}
              </span>
              {activeExercise?.restSeconds ? (
                <span className="focus-session-exercise-hero-badge">
                  {activeExercise.restSeconds}s descanso
                </span>
              ) : null}
              {activeIsBodyweight ? (
                <span className="focus-session-exercise-hero-badge">
                  Peso corporal
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="focus-session-exercise-progress-bar">
          <div className="focus-session-exercise-progress-track">
            <div
              className="focus-session-exercise-progress-fill"
              style={{
                width: `${totalExercises > 0 ? ((currentExercise + 1) / totalExercises) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="card premium-surface-card mt-4 p-4">
        <p className="muted m-0 text-[11px] uppercase tracking-[0.1em]">
          Registro de sets
        </p>
        {autosaveState !== "idle" ? (
          <p
            className="m-0 mt-2 text-xs text-muted"
            role="status"
            aria-live="polite"
          >
            {autosaveState === "saving"
              ? "Guardando..."
              : autosaveState === "saved"
                ? "Guardado ✓"
                : "No se pudo guardar"}
          </p>
        ) : null}
        {inlineError ? (
          <p className="focus-session-inline-state mb-3 rounded-xl px-3 py-2 text-sm font-medium text-danger">
            {inlineError}
          </p>
        ) : null}
        {error ? (
          <p className="focus-session-inline-state mb-3 rounded-xl px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}

        {/* Rest timer */}
        {restCountdown !== null ? (
          <div className="focus-session-rest-timer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="focus-session-rest-timer-value">
              {restCountdown}
            </span>
            <span className="focus-session-rest-timer-label">seg descanso</span>
          </div>
        ) : null}

        <div className="focus-session-sets-shell mt-3 overflow-hidden border">
          <div className="focus-session-sets-head hidden grid-cols-[64px_1fr_1fr_90px] items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-muted md:grid">
            <span>Set</span>
            <span>Peso</span>
            <span>Reps</span>
            <span className="text-right">Estado</span>
          </div>

          <div className="focus-session-sets-list">
            {currentRows.map((row, index) => {
              const setLabel = index + 1;

              if (row.saved) {
                return (
                  <div
                    key={`${activeExerciseName}-saved-${setLabel}`}
                    className={`focus-session-set-row focus-session-set-row--done border-t`}
                  >
                    <div className="focus-session-set-top">
                      <div className="flex items-center gap-2">
                        <span
                          className={`focus-session-set-number focus-session-set-number--done`}
                        >
                          ✓
                        </span>
                        <span className="text-sm font-bold text-primary">
                          Set {setLabel}
                        </span>
                      </div>
                      <span className="focus-session-set-done text-success">
                        Completado
                      </span>
                    </div>
                    <div className="focus-session-set-values">
                      <div className="focus-session-set-value-box">
                        <span className="focus-session-set-label">Peso</span>
                        <p>
                          {activeIsBodyweight
                            ? row.loadKg
                              ? `BW + ${row.loadKg}`
                              : "BW"
                            : row.loadKg || "-"}{" "}
                          kg
                        </p>
                      </div>
                      <div className="focus-session-set-value-box">
                        <span className="focus-session-set-label">Reps</span>
                        <p>{row.reps || recommendedRepsText}</p>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={`${activeExerciseName}-draft-${setLabel}`}
                  className="focus-session-set-row border-t"
                >
                  <div className="focus-session-set-top">
                    <div className="flex items-center gap-2">
                      <span className="focus-session-set-number">
                        {setLabel}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        Set {setLabel}
                      </span>
                    </div>
                    <label className="focus-session-check-wrap flex items-center gap-2">
                      <span
                        className="focus-session-set-label"
                        style={{ marginBottom: 0 }}
                      >
                        Listo
                      </span>
                      <input
                        type="checkbox"
                        className="focus-session-check"
                        checked={row.done}
                        aria-label={`Completar set ${setLabel}`}
                        onChange={(event) => {
                          void handleDoneToggle(index, event.target.checked);
                        }}
                      />
                    </label>
                  </div>
                  <div className="focus-session-set-values">
                    <div>
                      <span className="focus-session-set-label">Peso (kg)</span>
                      {activeIsBodyweight ? (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="badge">BW</span>
                          <input
                            ref={index === 0 ? loadInputRef : null}
                            className="focus-session-input w-full"
                            inputMode="decimal"
                            placeholder="+kg"
                            value={row.loadKg}
                            onChange={(event) =>
                              updateRow(index, (current) => ({
                                ...current,
                                loadKg: event.target.value,
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <input
                          ref={index === 0 ? loadInputRef : null}
                          className="focus-session-input mt-1 w-full"
                          type="number"
                          min={0}
                          inputMode="decimal"
                          placeholder={recommendedLoadText || "0"}
                          value={row.loadKg}
                          onChange={(event) =>
                            updateRow(index, (current) => ({
                              ...current,
                              loadKg: event.target.value,
                            }))
                          }
                        />
                      )}
                    </div>
                    <div>
                      <span className="focus-session-set-label">Reps</span>
                      <input
                        ref={index === 0 ? repsInputRef : null}
                        className="focus-session-input mt-1 w-full"
                        type="text"
                        inputMode="numeric"
                        placeholder={recommendedRepsText}
                        value={row.reps}
                        onChange={(event) =>
                          updateRow(index, (current) => ({
                            ...current,
                            reps: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn secondary h-10"
            onClick={addExtraSet}
          >
            + Añadir set
          </button>
        </div>
      </section>

      <div className="focus-session-sticky-bar fixed inset-x-0 bottom-0 z-30 border-t">
        <div className="nutrition-page-shell flex gap-3 pt-3">
          <button
            type="button"
            className="btn secondary focus-session-sticky-btn flex-1"
            disabled={currentExercise === 0 || saving}
            onClick={() => goToExercise(Math.max(currentExercise - 1, 0))}
          >
            ← Anterior
          </button>
          <button
            type="button"
            className="btn focus-session-sticky-btn flex-1"
            onClick={() => void handlePrimaryAction()}
            disabled={
              saving ||
              !session ||
              (pendingRows.length === 0 &&
                currentExercise >= exercises.length - 1)
            }
          >
            {saving
              ? t("workoutDetail.sessionSaving")
              : pendingRows.length === 0
                ? currentExercise >= exercises.length - 1
                  ? "Último ejercicio"
                  : "Siguiente →"
                : "Guardar sets ✓"}
          </button>
        </div>
      </div>
    </section>
  );
}
