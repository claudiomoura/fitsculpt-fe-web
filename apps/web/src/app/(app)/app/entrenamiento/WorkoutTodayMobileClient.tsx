"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyBlock, ErrorBlock, ExerciseCardCompact, LoadingBlock } from "@/design-system";
import { useLanguage } from "@/context/LanguageProvider";
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [planDays, setPlanDays] = useState<TrainingPlanDay[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [manualSelectedDay, setManualSelectedDay] = useState<string | null>(null);

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

  const total = Math.max(selectedDay?.exercises?.length ?? 0, 1);
  const selectedDayCompleted = Boolean(activeDayKey && completedDayKeys.has(activeDayKey));
  const completed = selectedDayCompleted ? total : 0;
  const estimatedMinutes = selectedDay?.duration ?? 45;

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
  const exercises = selectedDay?.exercises ?? [];

  return (
    <section className="mx-auto max-w-3xl px-4 pb-28 pt-8 md:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-text">Entreno</h1>
        <p className="text-sm text-text-muted">Tu semana de entrenamiento</p>
      </header>

      <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">{selectedDay?.label ?? "Hoy"}</p>
            <h2 className="text-lg font-semibold text-text">{selectedDay?.label ?? "Plan activo"}</h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-xs text-text">
            ⏱ {estimatedMinutes} min
          </span>
        </div>
        <p className="mt-2 text-sm text-text-muted">{selectedDay?.focus ?? "Mantén constancia y completa tu sesión de hoy."}</p>
        <div className="mt-4 flex gap-2">
          <Link className="btn" href="/app/entrenamiento">
            ✨ Generar con IA
          </Link>
          <Link className="btn secondary" href="/app/entrenamiento">
            📅 Ver calendario
          </Link>
        </div>
      </div>

      <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-text">Semana</h3>
        <div className="grid grid-cols-7 gap-2">
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
              className={`rounded-xl border p-2 text-center transition ${d.selected ? "border-accent bg-accent/10" : "border-border bg-surface-muted"}`}
            >
              <p className="text-[11px] text-text-muted">{d.label}</p>
              <p className="text-sm font-semibold text-text">{d.date}</p>
              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/5">
                {d.complete ? "✓" : "−"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 pb-28">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Ejercicios del día</h3>
          <span className="text-xs text-text-muted">{completed}/{total}</span>
        </div>

        {!hasAnyExercises ? (
          <EmptyBlock
            centered={false}
            className="py-6"
            title="Tu plan aún no tiene ejercicios"
            description="Cuando tu entrenador cargue ejercicios, aparecerán aquí automáticamente."
          />
        ) : exercises.length ? (
          <div className="space-y-3">
            {exercises.map((exercise, index) => {
              const fallbackExerciseId = (exercise as { exerciseId?: unknown }).exerciseId;
              const exerciseId =
                typeof exercise.id === "string"
                  ? exercise.id
                  : typeof fallbackExerciseId === "string"
                    ? fallbackExerciseId
                    : null;
              return (
                <ExerciseCardCompact
                  key={`${exercise.id ?? exercise.name}-${index}`}
                  name={exercise.name}
                  detail={`${exercise.sets ?? "3"} series · ${exercise.reps ?? "10"} reps · Ver técnica`}
                  imageSrc={getExerciseThumbUrl(exercise)}
                  imageAlt={exercise.name}
                  progress={completed > index ? 100 : 0}
                  onClick={() => {
                    if (!exerciseId) return;
                    router.push(buildExerciseDetailHref(exerciseId));
                  }}
                  aria-label={`Ver técnica de ${exercise.name}`}
                />
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
      </section>

      <div className="fixed inset-x-0 bottom-[calc(var(--mobile-tab-bar-height)+12px)] z-20 px-4 md:hidden">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
            <span>{selectedDay?.label ?? "Hoy"}</span>
            <span>{exercises.length ? `${exercises.length} ejercicios` : "Día de descanso"}</span>
          </div>
          {exercises.length ? (
            <Link className="btn flex w-full items-center justify-center" href={selectedDay?.id ? `/app/entrenamiento?day=${encodeURIComponent(selectedDay.id)}` : "/app/entrenamiento"}>
              Empezar entrenamiento
            </Link>
          ) : (
            <Link className="btn secondary flex w-full items-center justify-center" href="/app/entrenamiento">
              Ver semana completa
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
