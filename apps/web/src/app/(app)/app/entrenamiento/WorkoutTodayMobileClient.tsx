"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/design-system";
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

function ProgressRing({ progress, size = 56, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const isComplete = progress >= 100;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            stroke: isComplete ? "#10B981" : "var(--primary)",
            transition: "stroke-dashoffset 0.6s ease-out, stroke 0.3s ease",
          }}
        />
      </svg>
      <span
        className="absolute text-xs font-bold"
        style={{ color: isComplete ? "#10B981" : "var(--text)" }}
      >
        {isComplete ? "✓" : `${progress}%`}
      </span>
    </div>
  );
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
  const [showCompleteAllCTA, setShowCompleteAllCTA] = useState(true);

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
      if (key) map.set(key, day);
    });
    return map;
  }, [parsedDays]);

  const activeDayKey = useMemo(() => {
    const urlDay = searchParams.get("day");
    if (urlDay && daysByIso.has(urlDay)) return urlDay;
    const today = todayLocalDayKey();
    if (today && daysByIso.has(today)) return today;
    return parsedDays.length ? dayKey(parsedDays[0].date) ?? null : null;
  }, [searchParams, daysByIso, parsedDays]);

  const selectedDay = useMemo(() => {
    const key = manualSelectedDay ?? activeDayKey;
    if (!key) return null;
    return { id: key, day: daysByIso.get(key) ?? null };
  }, [manualSelectedDay, activeDayKey, daysByIso]);

  const weekDays = useMemo(() => {
    if (!parsedDays.length) return [];
    const firstDay = parsedDays[0].date;
    const weekStart = new Date(firstDay);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dayIso = dayKey(d);
      const hasWorkout = dayIso ? daysByIso.has(dayIso) : false;
      const isActive = dayIso === (manualSelectedDay ?? activeDayKey);
      return {
        id: dayIso ?? `day-${i}`,
        label: WEEKDAY_LABELS[d.getDay()] ?? "",
        date: d.getDate(),
        iso: dayIso ?? `day-${i}`,
        isWorkout: hasWorkout,
        selected: isActive,
      };
    });
  }, [parsedDays, daysByIso, manualSelectedDay, activeDayKey]);

  const exercises = useMemo(() => selectedDay?.day?.exercises ?? [], [selectedDay]);

  const totalExercises = exercises.length;

  const selectedDayCompleted = useMemo(() => {
    if (!selectedDay?.day?.date) return false;
    const dayDate = parseDate(selectedDay.day.date);
    if (!dayDate) return false;
    const dayIso = dayKey(dayDate);
    return workouts.some((w) => {
      const wDate = parseDate(w.scheduledAt ?? null);
      if (!wDate) return false;
      const sessions = w.sessions ?? [];
      const hasFinishedSession = sessions.some((s) => Boolean(s.finishedAt));
      return dayKey(wDate) === dayIso && hasFinishedSession;
    });
  }, [selectedDay, workouts]);

  const completedCount = selectedDayCompleted
    ? totalExercises
    : completedExercises.size;
  const allDone = selectedDayCompleted || completedCount >= totalExercises;
  const progressPercent = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  const estimatedMinutes = useMemo(
    () => exercises.reduce((sum, ex) => sum + ((ex.sets ?? 3) * 1.5 + 2), 0),
    [exercises],
  );

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
    if (!exercises.length || allDone) return;
    setConfirmCompleteAll(true);
  }, [exercises, allDone]);

  const executeCompleteAll = useCallback(async () => {
    setCompletingAll(true);
    try {
      const startResponse = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: selectedDay?.day?.focus ?? "Entrenamiento",
          scheduledAt: selectedDay?.day?.date,
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
      setShowCompleteAllCTA(false);
      notify({ title: "¡Entrenamiento completado!", description: `${totalExercises} ejercicios marcados como hechos.`, variant: "success" });
      await loadWorkouts();
    } catch {
      notify({ title: "Error", description: "Ocurrió un error al completar el entrenamiento.", variant: "error" });
    }
    setCompletingAll(false);
    setConfirmCompleteAll(false);
  }, [exercises, selectedDay, totalExercises, loadWorkouts, notify]);

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

  const workoutDays = parsedDays.map(({ day, date }) => ({
    id: dayKey(date) ?? "",
    label: day.focus ?? "Entrenamiento",
    date: dayKey(date) ?? "",
    iso: dayKey(date) ?? "",
    complete: false,
  }));

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
      {/* Hero Card */}
      <div
        className="relative mb-5 overflow-hidden rounded-3xl"
        style={{
          background: allDone
            ? "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)"
            : "linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, var(--surface) 88%) 0%, var(--surface) 100%)",
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background: allDone ? "#10B981" : "var(--primary)",
                    boxShadow: allDone ? "0 0 8px rgba(16,185,129,0.5)" : "none",
                  }}
                />
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  {selectedDay?.day?.date ? new Date(selectedDay.day.date).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" }) : "Hoy"}
                </p>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-text">
                {selectedDay?.day?.focus ?? "Entrenamiento"}
              </h1>
              {allDone && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Sesión completada
                </div>
              )}
            </div>
            <ProgressRing progress={progressPercent} size={64} strokeWidth={5} />
          </div>

          <div className="mt-5 flex items-center gap-6 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              <span>{totalExercises} ejercicios</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>~{estimatedMinutes} min</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={allDone ? "#10B981" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span style={{ color: allDone ? "#10B981" : undefined }}>{completedCount}/{totalExercises}</span>
            </div>
          </div>
        </div>

        {/* Progress bar bottom */}
        <div className="h-1 w-full bg-black/5 dark:bg-white/5">
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: allDone ? "#10B981" : "var(--primary)",
              borderRadius: progressPercent > 0 ? "0 4px 4px 0" : "0",
            }}
          />
        </div>
      </div>

      {/* Week Strip */}
      <div className="mb-6 flex items-center justify-center gap-2">
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
            className="flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200 active:scale-95"
            style={{
              background: d.selected
                ? "var(--primary)"
                : "transparent",
              color: d.selected
                ? "var(--bg-primary, #0B0E13)"
                : d.isWorkout
                  ? "var(--text)"
                  : "var(--text-muted)",
              opacity: d.isWorkout || d.selected ? 1 : 0.5,
              minWidth: 44,
            }}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide">
              {d.label}
            </span>
            <span className="text-sm font-bold">{d.date}</span>
            {d.isWorkout && !d.selected && (
              <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--primary)" }} />
            )}
            {d.selected && (
              <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: d.isWorkout ? "var(--bg-primary, #0B0E13)" : "transparent" }} />
            )}
          </button>
        ))}
      </div>

      {/* Exercise List */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">
            {totalExercises} ejercicios
          </h2>
          {hasAnyExercises && totalExercises > 0 && !allDone && showCompleteAllCTA ? (
            <button
              type="button"
              onClick={() => void handleCompleteAll()}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all active:scale-95"
              style={{
                background: "var(--primary)",
                color: "var(--bg-primary, #0B0E13)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Completar todo
            </button>
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
                <button
                  key={`${exercise.id ?? exercise.name}-${index}`}
                  type="button"
                  onClick={() => toggleExercise(index)}
                  className="group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 active:scale-[0.98]"
                  style={{
                    borderColor: isDone ? "rgba(16,185,129,0.3)" : "var(--border)",
                    background: isDone
                      ? "rgba(16,185,129,0.08)"
                      : "var(--surface)",
                  }}
                >
                  {/* Number / Check */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300"
                    style={{
                      background: isDone
                        ? "#10B981"
                        : "color-mix(in srgb, var(--primary) 12%, transparent)",
                      color: isDone ? "#fff" : "var(--primary)",
                    }}
                  >
                    {isDone ? "✓" : index + 1}
                  </div>

                  {/* Exercise Info */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium transition-all duration-200 ${isDone ? "line-through opacity-50" : ""}`}
                      style={{ color: "var(--text)" }}
                    >
                      {exercise.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {exercise.sets ?? "3"} × {exercise.reps ?? "10"} · descanso {exercise.rest ?? "60"}s
                    </p>
                  </div>

                  {/* Thumbnail */}
                  {getExerciseThumbUrl(exercise) ? (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                      <img
                        src={getExerciseThumbUrl(exercise) ?? ""}
                        alt={exercise.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-[10px] text-text-muted">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  )}
                </button>
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

        {/* Complete All CTA at bottom for easy access */}
        {hasAnyExercises && totalExercises > 0 && !allDone && showCompleteAllCTA && totalExercises > 1 ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => void handleCompleteAll()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: "color-mix(in srgb, var(--primary) 8%, var(--surface) 92%)",
                color: "var(--primary)",
                border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Marcar todos como hechos
              <span className="text-[10px] opacity-60">(olvidé el móvil)</span>
            </button>
          </div>
        ) : null}

        {allDone && totalExercises > 0 ? (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 py-3 text-sm font-semibold text-emerald-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Todos los ejercicios completados
          </div>
        ) : null}
      </section>

      {/* Bottom Sticky CTA */}
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
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{selectedDay?.day?.focus ?? "Hoy"}</p>
                <p className="text-sm font-semibold text-text">
                  {completedCount}/{totalExercises} ejercicios
                </p>
              </div>
              <ProgressRing progress={progressPercent} size={44} strokeWidth={3} />
            </div>
            {!allDone && exercises.length > 0 ? (
              <button
                type="button"
                onClick={() => void handleCompleteAll()}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.98]"
                style={{
                  background: "var(--primary)",
                  color: "var(--bg-primary, #0B0E13)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Completar todo ahora
              </button>
            ) : exercises.length > 0 ? (
              <Link
                className="flex w-full items-center justify-center rounded-xl bg-emerald-500/15 py-3 text-sm font-semibold text-emerald-400 no-underline"
                href="/app/entrenamiento"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polyline points="20 6 9 17 4 12"/></svg>
                Ver resumen
              </Link>
            ) : (
              <Link className="btn secondary flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold no-underline" href="/app/entrenamiento">
                Ver semana completa
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
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
              onClick={() => void executeCompleteAll()}
              disabled={completingAll}
              style={{
                background: "var(--primary)",
                color: "var(--bg-primary, #0B0E13)",
                border: "none",
                borderRadius: 12,
                padding: "8px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: completingAll ? "not-allowed" : "pointer",
                opacity: completingAll ? 0.7 : 1,
              }}
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
