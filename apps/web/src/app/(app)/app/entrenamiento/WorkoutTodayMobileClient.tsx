"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyBlock,
  ErrorBlock,
  ExerciseCardCompact,
  HeaderCompact,
  LoadingBlock,
  PageContainer,
  Stack,
  WeekGridCompact,
  WorkoutProgressBar,
} from "@/design-system";
import { useLanguage } from "@/context/LanguageProvider";
import type { Workout } from "@/lib/types";
import AppLayout from "@/components/layout/AppLayout";
import { HeroWorkout } from "@/components/workout/HeroWorkout";
import { Periodization } from "@/components/workout/Periodization";
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

function toIsoDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const base = new Date(date);
  const day = base.getDay();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - day);
  return base;
}

function buildWeekDays(reference: Date): WeekDay[] {
  const weekStart = startOfWeek(reference);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return {
      id: toIsoDay(day),
      label: WEEKDAY_LABELS[day.getDay()] ?? "",
      dateNumber: day.getDate(),
      iso: toIsoDay(day),
    };
  });
}


export default function WorkoutTodayMobileClient() {
  const { t } = useLanguage();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDay, setSelectedDay] = useState(() => toIsoDay(new Date()));

  const loadWorkouts = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const response = await fetch("/api/workouts", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("WORKOUTS_REQUEST_FAILED");
      }
      const data = (await response.json()) as Workout[];
      setWorkouts(Array.isArray(data) ? data : []);
      setState("success");
    } catch (_error) {
      setError(t("workouts.loadError"));
      setState("error");
    }
  }, [t]);

  useEffect(() => {
    void loadWorkouts();
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
      const key = toIsoDay(date);
      const prev = map.get(key) ?? [];
      map.set(key, [...prev, workout]);
    });
    return map;
  }, [parsedWorkouts]);

  const selectedWorkout = workoutsByDay.get(selectedDay)?.[0] ?? null;
  const todayIso = toIsoDay(new Date());
  const todayWorkout = workoutsByDay.get(todayIso)?.[0] ?? null;

  useEffect(() => {
    setSelectedDay((current) => {
      if (current === todayIso) return current;
      if (workoutsByDay.has(current)) return current;
      return todayIso;
    });
  }, [todayIso, workoutsByDay]);

  const nextWorkout = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return parsedWorkouts
      .filter(({ date }) => date.getTime() > today.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0]?.workout ?? null;
  }, [parsedWorkouts]);

  const activeWorkout = selectedWorkout ?? todayWorkout;

  const completed = useMemo(() => {
    if (!activeWorkout?.sessions?.length) return 0;
    const session = activeWorkout.sessions[0];
    if (!session?.entries?.length) return 0;
    return session.entries.length;
  }, [activeWorkout]);

  const total = Math.max(activeWorkout?.exercises?.length ?? 0, 1);
  const estimatedMinutes = activeWorkout?.estimatedDurationMin ?? activeWorkout?.durationMin ?? 45;

  const periodizationPhases = useMemo(
    () => [
      { id: "acc", label: "Acumulación", weeks: 3, intensity: "medium" as const, selected: true },
      { id: "int", label: "Intensificación", weeks: 2, intensity: "high" as const },
      { id: "deload", label: "Deload", weeks: 1, intensity: "deload" as const },
      { id: "peak", label: "Peak", weeks: 2, intensity: "high" as const },
    ],
    [],
  );

  const weekDays = useMemo(() => {
    const today = new Date();
    return buildWeekDays(today).map((day) => {
      const hasCompletedWorkout = (workoutsByDay.get(day.iso) ?? []).some((workout) => (workout.sessions?.[0]?.entries?.length ?? 0) > 0);
      const isToday = day.iso === todayIso;
      return {
        id: day.id,
        label: day.label,
        date: day.dateNumber,
        selected: day.iso === selectedDay,
        complete: hasCompletedWorkout,
        isToday,
      };
    });
  }, [selectedDay, todayIso, workoutsByDay]);

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

  const exercises = activeWorkout?.exercises ?? [];
  const showTodayEmpty = !todayWorkout;
  const showSelectedWorkout = !!selectedWorkout;

  const mainContent = (
    <PageContainer as="section" maxWidth="md" className="py-4 pb-24">
      <Stack gap="4">
        <HeaderCompact title="Entrenamiento de hoy" subtitle="Mobile Today" />

        <HeroWorkout
          title={activeWorkout?.name ?? "Planifica tu próxima sesión"}
          subtitle={
            activeWorkout?.notes ??
            (showTodayEmpty
              ? "Hoy no tienes sesión programada. Mantén el ritmo revisando la semana."
              : "Sesión enfocada en rendimiento y técnica.")
          }
          meta={`${estimatedMinutes} min`}
          badge={activeWorkout?.goal ?? (showTodayEmpty ? "Descanso" : "Hoy")}
          ctaLabel="Generar con IA"
          ctaHref="/app/workouts"
          secondaryCtaLabel={showTodayEmpty && nextWorkout ? "Ver próxima sesión" : undefined}
          secondaryCtaHref={showTodayEmpty && nextWorkout ? `/app/entrenamientos/${nextWorkout.id}` : undefined}
        />

        <section className="rounded-2xl border border-border bg-surface p-4">
          <WorkoutProgressBar label="Progreso" value={completed} max={total} valueLabel={`${completed} de ${total}`} />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-base font-semibold text-text">Semana</h2>
          <WeekGridCompact
            {...({ onSelect: (id: string) => setSelectedDay(id) } as any)}
            className="mt-3"
            days={weekDays.map((day) => ({
              id: day.id,
              label: day.isToday ? `${day.label} · Hoy` : day.label,
              date: day.date,
              selected: day.selected,
              complete: day.complete,
            }))}
          />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-base font-semibold text-text">{showSelectedWorkout ? "Ejercicios del día seleccionado" : "Ejercicios de hoy"}</h2>
          {showSelectedWorkout && exercises.length ? (
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
          ) : showTodayEmpty ? (
            <EmptyBlock
              centered={false}
              className="py-6"
              title="No tienes entrenamiento para hoy"
              description="Puedes crear uno nuevo o navegar a otro día desde la semana."
              action={<Link className="btn" href="/app/workouts">Crear entrenamiento</Link>}
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
              title="Esta sesión no tiene ejercicios cargados"
              description="Selecciona otro día en la semana o crea un nuevo entrenamiento."
              action={<Link className="btn" href="/app/workouts">Crear entrenamiento</Link>}
            />
          )}
        </section>

        <Periodization phases={periodizationPhases} />
      </Stack>
    </PageContainer>
  );

  const rightPanel = (
    <div className="desktop-side-stack">
      <WeeklyStats completedExercises={completed} totalExercises={total} estimatedMinutes={estimatedMinutes} />
      <Periodization phases={periodizationPhases} />
    </div>
  );

  return <AppLayout main={mainContent} rightPanel={rightPanel} />;
}
