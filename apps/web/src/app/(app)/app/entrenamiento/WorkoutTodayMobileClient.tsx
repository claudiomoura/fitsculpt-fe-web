"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyBlock, ErrorBlock, ExerciseCardCompact, LoadingBlock } from "@/design-system";
import { Modal } from "@/design-system/components/Modal";
import { useLanguage } from "@/context/LanguageProvider";
import { useToast } from "@/design-system/components/Toast";
import { dayKey, todayLocalDayKey } from "@/lib/date/dayKey";
import { getExerciseThumbUrl } from "@/lib/exerciseMedia";
import type { TrainingPlanDay, Workout } from "@/lib/types";
import { getActiveWorkoutPlanDays } from "@/services/workout.service";

type LoadState = "loading" | "error" | "success";

type WeekDay = {
  id: string;
  label: string;
  dateNumber: number;
  iso: string;
};

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toWeekDay(date: Date): WeekDay {
  return {
    id: dayKey(date) ?? "",
    label: WEEKDAY_LABELS[date.getDay()] ?? "",
    dateNumber: date.getDate(),
    iso: dayKey(date) ?? "",
  };
}

export default function WorkoutTodayMobileClient() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [planDays, setPlanDays] = useState<TrainingPlanDay[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [manualSelectedDay, setManualSelectedDay] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [confirmCompleteAll, setConfirmCompleteAll] = useState(false);
  const [completingAll, setCompletingAll] = useState(false);

  const loadWorkouts = useCallback(async () => {
    setState("loading");
    setError(null);
    const [result, workoutsResponse] = await Promise.all([
      getActiveWorkoutPlanDays(),
      fetch("/api/workouts", { cache: "no-store", credentials: "include" }),
    ]);
    if (!result.ok) {
      setError(t("workouts.loadError"));
      setState("error");
      return;
    }

    setPlanDays(result.data.plan?.days ?? []);
    if (workoutsResponse.ok) {
      const workoutsPayload = await workoutsResponse.json();
      setWorkouts(Array.isArray(workoutsPayload) ? workoutsPayload : []);
    } else {
      setWorkouts([]);
    }
    setState("success");
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkouts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkouts]);

  const parsedDays = useMemo(
    () =>
      planDays
        .map((day) => ({ day, date: parseDate(day.date) }))
        .filter(
          (item): item is { day: TrainingPlanDay; date: Date } =>
            item.date instanceof Date,
        ),
    [planDays],
  );

  const daysByIso = useMemo(() => {
    const map = new Map<string, TrainingPlanDay>();
    parsedDays.forEach(({ day, date }) => {
      const key = dayKey(date);
      if (!key || map.has(key)) return;
      map.set(key, day);
    });
    return map;
  }, [parsedDays]);

  const workoutDays = useMemo(() => {
    return parsedDays
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ date }) => toWeekDay(date));
  }, [parsedDays]);

  const todayIso = todayLocalDayKey();

  const completedDayKeys = useMemo(() => {
    const keys = new Set<string>();
    workouts.forEach((workout) => {
      (workout.sessions ?? []).forEach((session) => {
        if (!session.finishedAt) return;
        const parsed = parseDate(session.finishedAt);
        const key = parsed ? dayKey(parsed) : null;
        if (key) keys.add(key);
      });
    });
    return keys;
  }, [workouts]);

  const queryDay = searchParams.get("day");
  const dayKeyCandidate = manualSelectedDay ?? queryDay ?? todayIso;

  const firstDayWithExercises = useMemo(
    () =>
      workoutDays.find((day) => {
        const planDay = daysByIso.get(day.iso);
        return (planDay?.exercises?.length ?? 0) > 0;
      }),
    [daysByIso, workoutDays],
  );

  const candidatePlanDay = daysByIso.get(dayKeyCandidate) ?? null;
  const shouldFallback =
    !manualSelectedDay &&
    (!candidatePlanDay || (candidatePlanDay.exercises?.length ?? 0) === 0);
  const activeDayKey = shouldFallback
    ? (firstDayWithExercises?.iso ?? dayKeyCandidate)
    : dayKeyCandidate;
  const selectedDay = daysByIso.get(activeDayKey) ?? null;

  const exercises = selectedDay?.exercises ?? [];
  const totalExercises = exercises.length;
  const selectedDayCompleted = Boolean(activeDayKey && completedDayKeys.has(activeDayKey));
  const completedCount = selectedDayCompleted ? totalExercises : completedExercises.size;
  const progressPercent = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;
  const estimatedMinutes = selectedDay?.duration ?? 45;
  const allDone = selectedDayCompleted || completedCount >= totalExercises;

  const weekDays = useMemo(() => {
    return workoutDays.map((day) => {
      const planDay = daysByIso.get(day.iso);
      const hasExercises = (planDay?.exercises?.length ?? 0) > 0;
      return {
        id: day.id,
        label: day.label,
        date: day.dateNumber,
        selected: day.iso === activeDayKey,
        complete: hasExercises && completedDayKeys.has(day.iso),
      };
    });
  }, [activeDayKey, completedDayKeys, workoutDays, daysByIso]);

  const toggleExercise = useCallback((index: number) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleCompleteAll = useCallback(async () => {
    if (totalExercises === 0 || allDone) return;
    setConfirmCompleteAll(true);
  }, [totalExercises, allDone]);

  const executeCompleteAll = useCallback(async () => {
    setCompletingAll(true);
    try {
      const startResponse = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: selectedDay?.label ?? "Entrenamiento",
          scheduledAt: new Date().toISOString(),
          durationMin: estimatedMinutes,
          notes: `Completado desde vista móvil - ${selectedDay?.focus ?? ""}`,
        }),
      });

      if (!startResponse.ok) {
        notify({ title: "Error", description: "No se pudo registrar el entrenamiento.", variant: "error" });
        setCompletingAll(false);
        setConfirmCompleteAll(false);
        return;
      }

      const workout = await startResponse.json();

      const startSession = await fetch(`/api/workouts/${workout.id}/start`, {
        method: "POST",
        credentials: "include",
      });

      if (!startSession.ok) {
        notify({ title: "Error", description: "No se pudo iniciar la sesión.", variant: "error" });
        setCompletingAll(false);
        setConfirmCompleteAll(false);
        return;
      }

      const session = await startSession.json();

      const entries = exercises.map((ex) => ({
        exercise: ex.name,
        sets: typeof ex.sets === "number" ? ex.sets : 3,
        reps: typeof ex.reps === "string" ? parseInt(ex.reps, 10) || 10 : 10,
      }));

      await fetch(`/api/workout-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ entries }),
      });

      await fetch(`/api/workout-sessions/${session.id}/finish`, {
        method: "POST",
        credentials: "include",
      });

      setCompletedExercises(new Set(exercises.map((_, i) => i)));
      notify({ title: "¡Entrenamiento completado!", description: `${totalExercises} ejercicios marcados como hechos.`, variant: "success" });
      await loadWorkouts();
    } catch {
      notify({ title: "Error", description: "Ocurrió un error al completar el entrenamiento.", variant: "error" });
    }
    setCompletingAll(false);
    setConfirmCompleteAll(false);
  }, [exercises, estimatedMinutes, selectedDay, totalExercises, loadWorkouts, notify]);

  const buildExerciseDetailHref = (exerciseId: string) => {
    const params = new URLSearchParams();
    params.set("from", "plan");
    const currentParams = new URLSearchParams(searchParams.toString());
    const dayParam = manualSelectedDay ?? activeDayKey ?? currentParams.get("day");
    if (dayParam) {
      params.set("dayKey", dayParam);
      currentParams.set("day", dayParam);
    }
    const returnTo = `${pathname}${currentParams.toString() ? `?${currentParams.toString()}` : ""}`;
    params.set("returnTo", returnTo);
    return `/app/biblioteca/${exerciseId}?${params.toString()}`;
  };

  if (state === "loading") {
    return (
      <LoadingBlock
        title="Cargando entrenamiento"
        description="Estamos preparando tu sesión de hoy."
      />
    );
  }

  if (state === "error") {
    return (
      <ErrorBlock
        title="No pudimos cargar tu entrenamiento"
        description={error ?? t("workouts.loadError")}
        retryAction={
          <button type="button" className="btn secondary" onClick={() => void loadWorkouts()}>
            Reintentar
          </button>
        }
      />
    );
  }

  if (!workoutDays.length) {
    return (
      <EmptyBlock
        title="No hay entrenamientos disponibles"
        description="Todavía no tienes días programados en tu plan activo."
        action={
          <Link className="btn" href="/app/entrenamiento">
            Crear entrenamiento
          </Link>
        }
      />
    );
  }

  const hasAnyExercises = workoutDays.some((day) => (daysByIso.get(day.iso)?.exercises?.length ?? 0) > 0);

  return (
    <section className="mx-auto max-w-lg px-4 pb-32 pt-6">
      <div
        className="mb-5 overflow-hidden rounded-2xl border border-border"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--surface) 92%) 0%, var(--surface) 60%)",
        }}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                {selectedDay?.label ?? "Hoy"}
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-text">
                {selectedDay?.focus ?? "Entrenamiento del día"}
              </h1>
            </div>
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
            >
              <span className="text-lg font-bold text-primary">{progressPercent}%</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--primary)" }}
              />
              {totalExercises} ejercicios
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--accent-secondary, var(--secondary))" }}
              />
              ~{estimatedMinutes} min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: allDone ? "var(--success, #10B981)" : "var(--text-muted)" }}
              />
              {completedCount}/{totalExercises} hechos
            </span>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPercent}%`,
                background: allDone
                  ? "var(--success, #10B981)"
                  : "var(--primary)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-border bg-surface p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                const normalizedDay = typeof d.id === "string" ? d.id : null;
                if (!normalizedDay) return;
                setManualSelectedDay(normalizedDay);
                const params = new URLSearchParams(searchParams.toString());
                params.set("day", normalizedDay);
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
              }}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-center transition-all duration-200 ${
                d.selected
                  ? "border border-primary/30 bg-primary/10 shadow-sm"
                  : "border border-transparent hover:bg-surface-muted"
              }`}
            >
              <span className={`text-[10px] font-medium uppercase tracking-wide ${d.selected ? "text-primary" : "text-text-muted"}`}>
                {d.label}
              </span>
              <span className={`text-sm font-bold ${d.selected ? "text-text" : "text-text-muted"}`}>
                {d.date}
              </span>
              <span
                className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  d.complete
                    ? "bg-emerald-500/20 text-emerald-400"
                    : d.selected
                      ? "bg-primary/20 text-primary"
                      : "bg-surface-muted text-text-muted"
                }`}
              >
                {d.complete ? "✓" : ""}
              </span>
            </button>
          ))}
        </div>
      </div>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Ejercicios</h2>
          {hasAnyExercises && totalExercises > 0 && !allDone ? (
            <button
              type="button"
              onClick={() => void handleCompleteAll()}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
              }}
            >
              Completar todo
            </button>
          ) : null}
          {allDone ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
              ✓ Completado
            </span>
          ) : null}
        </div>

        {!hasAnyExercises ? (
          <EmptyBlock
            centered={false}
            className="py-6"
            title="Tu plan aún no tiene ejercicios"
            description="Cuando tu entrenador cargue ejercicios, aparecerán aquí automáticamente."
          />
        ) : exercises.length ? (
          <div className="space-y-2">
            {exercises.map((exercise, index) => {
              const fallbackExerciseId = (exercise as { exerciseId?: unknown }).exerciseId;
              const exerciseId =
                typeof exercise.id === "string"
                  ? exercise.id
                  : typeof fallbackExerciseId === "string"
                    ? fallbackExerciseId
                    : null;
              const isDone = selectedDayCompleted || completedExercises.has(index);

              return (
                <div key={`${exercise.id ?? exercise.name}-${index}`} className="relative">
                  <ExerciseCardCompact
                    name={
                      <span className="flex items-center gap-2">
                        {isDone ? (
                          <span
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{ background: "var(--success, #10B981)", color: "#fff" }}
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)" }}
                          >
                            {index + 1}
                          </span>
                        )}
                        <span className={isDone ? "line-through opacity-60" : ""}>{exercise.name}</span>
                      </span>
                    }
                    detail={`${exercise.sets ?? "3"} series · ${exercise.reps ?? "10"} reps`}
                    imageSrc={getExerciseThumbUrl(exercise)}
                    imageAlt={exercise.name}
                    progress={isDone ? 100 : 0}
                    onClick={() => {
                      if (!exerciseId) return;
                      router.push(buildExerciseDetailHref(exerciseId));
                    }}
                    onDoubleClick={() => toggleExercise(index)}
                    aria-label={`${isDone ? "Desmarcar" : "Marcar"} ${exercise.name}`}
                  />
                  {!isDone && !selectedDayCompleted ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExercise(index);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors"
                      style={{
                        background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      Hecho
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyBlock
            centered={false}
            className="py-6"
            title="Este día no tiene ejercicios"
            description="Selecciona otro día de la semana para continuar tu rutina."
          />
        )}

        {hasAnyExercises && totalExercises > 0 && !allDone ? (
          <button
            type="button"
            onClick={() => void handleCompleteAll()}
            className="mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: "var(--primary)",
              color: "var(--bg-primary, #0B0E13)",
            }}
          >
            Marcar todo como completado
          </button>
        ) : null}
      </section>

      <div className="fixed inset-x-0 bottom-[calc(var(--mobile-tab-bar-height)+12px)] z-20 px-4 md:hidden">
        <div
          className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-border shadow-lg backdrop-blur"
          style={{
            background: "color-mix(in srgb, var(--surface) 95%, transparent)",
          }}
        >
          <div className="p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{selectedDay?.label ?? "Hoy"}</p>
                <p className="text-sm font-semibold text-text">{exercises.length ? `${exercises.length} ejercicios` : "Día de descanso"}</p>
              </div>
              {exercises.length > 0 ? (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: allDone
                      ? "var(--success, #10B981)"
                      : "color-mix(in srgb, var(--primary) 20%, transparent)",
                    color: allDone ? "#fff" : "var(--primary)",
                  }}
                >
                  {progressPercent}%
                </div>
              ) : null}
            </div>
            {exercises.length ? (
              <Link
                className="btn flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold no-underline"
                href={selectedDay?.id ? `/app/entrenamiento?day=${encodeURIComponent(selectedDay.id)}` : "/app/entrenamiento"}
                style={{ background: "var(--primary)", color: "var(--bg-primary, #0B0E13)" }}
              >
                {allDone ? "Ver resumen" : "Empezar entrenamiento"}
              </Link>
            ) : (
              <Link className="btn secondary flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold no-underline" href="/app/entrenamiento">
                Ver semana completa
              </Link>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={confirmCompleteAll}
        onClose={() => setConfirmCompleteAll(false)}
        title="Completar todo"
        description={`¿Marcar los ${totalExercises} ejercicios como completados?`}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setConfirmCompleteAll(false)}
              disabled={completingAll}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void executeCompleteAll()}
              disabled={completingAll}
              style={{ background: "var(--primary)", color: "var(--bg-primary, #0B0E13)" }}
            >
              {completingAll ? "Completando..." : "Confirmar"}
            </button>
          </div>
        }
      >
        <div style={{ paddingTop: 8 }}>
          <p className="muted" style={{ margin: 0 }}>
            Se registrará un entrenamiento con todos los ejercicios del día y se marcará como finalizado.
          </p>
        </div>
      </Modal>
    </section>
  );
}
