"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  EmptyBlock,
  ErrorBlock,
  ExerciseCardCompact,
  HeaderCompact,
  LoadingBlock,
  PageContainer,
  Stack,
  TrainingWeekGridCompact,
  WorkoutProgressBar,
} from "@/design-system";
import { useLanguage } from "@/context/LanguageProvider";
import { dayKey, todayLocalDayKey } from "@/lib/date/dayKey";
import type { Workout } from "@/lib/types";
import { listWorkoutDays } from "@/services/workout.service";
import AppLayout from "@/components/layout/AppLayout";
import { HeroWorkout } from "@/components/workout/HeroWorkout";
import WeeklyStats from "@/components/workout/WeeklyStats";

type LoadState = "loading" | "error" | "success";

type WeekDay = {
  id: string;
  label: string;
  dateNumber: number;
  iso: string;
};

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=300&q=80";
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
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [manualSelectedDay, setManualSelectedDay] = useState<string | null>(null);

  const loadWorkouts = useCallback(async () => {
    setState("loading");
    setError(null);
    const result = await listWorkoutDays();
    if (!result.ok) {
      setError(t("workouts.loadError"));
      setState("error");
      return;
    }
    setWorkouts(Array.isArray(result.data) ? result.data : []);
    setState("success");
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkouts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkouts]);

  const parsedWorkouts = useMemo(
    () =>
      workouts
        .map((workout) => ({ workout, date: parseDate(workout.scheduledAt) }))
        .filter((item): item is { workout: Workout; date: Date } => item.date instanceof Date),
    [workouts],
  );

  const workoutsByDay = useMemo(() => {
    const map = new Map<string, Workout[]>();
    parsedWorkouts.forEach(({ workout, date }) => {
      const key = dayKey(date);
      if (!key) return;
      map.set(key, [...(map.get(key) ?? []), workout]);
    });
    return map;
  }, [parsedWorkouts]);

  const workoutDays = useMemo(() => {
    const seen = new Set<string>();
    return parsedWorkouts
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .filter(({ date }) => {
        const key = dayKey(date);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ date }) => toWeekDay(date));
  }, [parsedWorkouts]);

  const todayIso = todayLocalDayKey();
  const queryDay = dayKey(searchParams.get("day"));
  const dayKeyCandidate = manualSelectedDay ?? queryDay ?? todayIso;
  const firstDayWithExercises = useMemo(
    () =>
      workoutDays.find((day) => {
        const workout = workoutsByDay.get(day.iso)?.[0] ?? null;
        return (workout?.exercises?.length ?? 0) > 0;
      }),
    [workoutDays, workoutsByDay],
  );

  const candidateWorkout = workoutsByDay.get(dayKeyCandidate)?.[0] ?? null;
  const shouldFallback = !manualSelectedDay && (!candidateWorkout || (candidateWorkout.exercises?.length ?? 0) === 0);
  const activeDayKey = shouldFallback ? firstDayWithExercises?.iso ?? dayKeyCandidate : dayKeyCandidate;
  const activeWorkout = workoutsByDay.get(activeDayKey)?.[0] ?? null;

  const completed = useMemo(() => {
    if (!activeWorkout?.sessions?.length) return 0;
    const session = activeWorkout.sessions[0];
    if (!session?.entries?.length) return 0;
    return session.entries.length;
  }, [activeWorkout]);

  const total = Math.max(activeWorkout?.exercises?.length ?? 0, 1);
  const estimatedMinutes = activeWorkout?.estimatedDurationMin ?? activeWorkout?.durationMin ?? 45;

  const weekDays = useMemo(() => {
    return workoutDays.map((day) => {
      const workout = workoutsByDay.get(day.iso)?.[0] ?? null;
      const hasExercises = (workout?.exercises?.length ?? 0) > 0;
      return {
        id: day.id,
        label: day.iso === todayIso ? `${day.label} · Hoy` : day.label,
        date: day.dateNumber,
        selected: day.iso === activeDayKey,
        complete: hasExercises,
      };
    });
  }, [activeDayKey, todayIso, workoutDays, workoutsByDay]);

  if (state === "loading") {
    return <LoadingBlock title="Cargando entrenamiento" description="Estamos preparando tu sesión de hoy." />;
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
        action={<Link className="btn" href="/app/workouts">Crear entrenamiento</Link>}
      />
    );
  }

  const hasAnyExercises = workoutDays.some((day) => (workoutsByDay.get(day.iso)?.[0]?.exercises?.length ?? 0) > 0);
  const exercises = activeWorkout?.exercises ?? [];

  const mainContent = (
    <PageContainer as="section" maxWidth="md" className="py-4 pb-24">
      <Stack gap="4">
        <HeaderCompact title="Entrenamiento de hoy" subtitle="Tu planificación semanal" />

        <HeroWorkout
          title={activeWorkout?.name ?? "Planifica tu próxima sesión"}
          subtitle={activeWorkout?.notes ?? "Mantén el ritmo revisando tu planificación semanal."}
          meta={`${estimatedMinutes} min`}
          badge={activeWorkout?.goal ?? "Plan activo"}
          ctaLabel="Generar con IA"
          ctaHref="/app/workouts"
        />

        <section className="rounded-2xl border border-border bg-surface p-4">
          <WorkoutProgressBar label="Progreso" value={completed} max={total} valueLabel={`${completed} de ${total}`} />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-base font-semibold text-text">Semana</h2>
          <TrainingWeekGridCompact
            onSelect={(id) => {
              if (typeof id !== "string") return;
              const normalizedDay = dayKey(id);
              if (!normalizedDay) return;
              setManualSelectedDay(normalizedDay);
              const params = new URLSearchParams(searchParams.toString());
              params.set("day", normalizedDay);
              router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            }}
            className="mt-3"
            days={weekDays}
          />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <HeaderCompact title="Ejercicios" />
          {!hasAnyExercises ? (
            <EmptyBlock
              centered={false}
              className="py-6"
              title="Tu plan aún no tiene ejercicios"
              description="Cuando tu entrenador cargue ejercicios, aparecerán aquí automáticamente."
            />
          ) : exercises.length ? (
            <Stack gap="3" className="mt-3">
              {exercises.map((exercise, index) => (
                <ExerciseCardCompact
                  key={`${exercise.id ?? exercise.name}-${index}`}
                  name={exercise.name}
                  detail={`${exercise.sets ?? "3"} series · ${exercise.reps ?? "10"} reps`}
                  volume={exercise.rpe ? `RPE ${exercise.rpe}` : undefined}
                  imageSrc={PLACEHOLDER_IMAGE}
                  imageAlt={exercise.name}
                  progress={completed > index ? 100 : 0}
                />
              ))}
            </Stack>
          ) : (
            <EmptyBlock
              centered={false}
              className="py-6"
              title="Este día no tiene ejercicios"
              description="Selecciona otro día de la semana para continuar tu rutina."
            />
          )}
        </section>
      </Stack>
    </PageContainer>
  );

  const rightPanel = (
    <div className="desktop-side-stack">
      <WeeklyStats completedExercises={completed} totalExercises={total} estimatedMinutes={estimatedMinutes} />
    </div>
  );

  return <AppLayout main={mainContent} rightPanel={rightPanel} />;
}
