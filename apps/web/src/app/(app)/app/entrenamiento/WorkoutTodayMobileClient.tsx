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
import type { TrainingPlanDay } from "@/lib/types";
import { getActiveWorkoutPlanDays } from "@/services/workout.service";
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

const PLACEHOLDER_IMAGE = "/placeholders/exercise-cover.jpg";
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
  const [manualSelectedDay, setManualSelectedDay] = useState<string | null>(null);

  const loadWorkouts = useCallback(async () => {
    setState("loading");
    setError(null);
    const result = await getActiveWorkoutPlanDays();
    if (!result.ok) {
      setError(t("workouts.loadError"));
      setState("error");
      return;
    }

    setPlanDays(result.data.plan?.days ?? []);
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
        .filter((item): item is { day: TrainingPlanDay; date: Date } => item.date instanceof Date),
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
  const shouldFallback = !manualSelectedDay && (!candidatePlanDay || (candidatePlanDay.exercises?.length ?? 0) === 0);
  const activeDayKey = shouldFallback ? firstDayWithExercises?.iso ?? dayKeyCandidate : dayKeyCandidate;
  const selectedDay = daysByIso.get(activeDayKey) ?? null;

  const completed = 0;
  const total = Math.max(selectedDay?.exercises?.length ?? 0, 1);
  const estimatedMinutes = selectedDay?.duration ?? 45;

  const weekDays = useMemo(() => {
    return workoutDays.map((day) => {
      const planDay = daysByIso.get(day.iso);
      const hasExercises = (planDay?.exercises?.length ?? 0) > 0;
      return {
        id: day.id,
        label: day.iso === todayIso ? `${day.label} · Hoy` : day.label,
        date: day.dateNumber,
        selected: day.iso === activeDayKey,
        complete: hasExercises,
      };
    });
  }, [activeDayKey, todayIso, workoutDays, daysByIso]);

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

  const hasAnyExercises = workoutDays.some((day) => (daysByIso.get(day.iso)?.exercises?.length ?? 0) > 0);
  const exercises = selectedDay?.exercises ?? [];

  const mainContent = (
    <PageContainer as="section" maxWidth="md" className="py-4 pb-24">
      <Stack gap="4">
        <HeaderCompact title="Entrenamiento de hoy" subtitle="Tu planificación semanal" />

        <HeroWorkout
          title={selectedDay?.label ?? "Planifica tu próxima sesión"}
          subtitle={selectedDay?.focus ?? "Mantén el ritmo revisando tu planificación semanal."}
          meta={`${estimatedMinutes} min`}
          badge="Plan activo"
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
