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
  WorkoutProgressBar,
} from "@/design-system";
import { useLanguage } from "@/context/LanguageProvider";
import type { Workout } from "@/lib/types";
import AppLayout from "@/components/layout/AppLayout";
import { HeroWorkout } from "@/components/workout/HeroWorkout";
import { Periodization } from "@/components/workout/Periodization";
import WeeklyStats from "@/components/workout/WeeklyStats";

type LoadState = "loading" | "error" | "success";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=300&q=80";

function sameDate(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

export default function WorkoutTodayMobileClient() {
  const { t } = useLanguage();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

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

  const todayWorkout = useMemo(() => workouts.find((item) => sameDate(item.scheduledAt)) ?? null, [workouts]);

  const completed = useMemo(() => {
    if (!todayWorkout?.sessions?.length) return 0;
    const session = todayWorkout.sessions[0];
    if (!session?.entries?.length) return 0;
    return session.entries.length;
  }, [todayWorkout]);

  const total = Math.max(todayWorkout?.exercises?.length ?? 0, 1);
  const estimatedMinutes = todayWorkout?.estimatedDurationMin ?? todayWorkout?.durationMin ?? 45;

  const periodizationPhases = useMemo(
    () => [
      { id: "acc", label: "Acumulación", weeks: 3, intensity: "medium" as const, selected: true },
      { id: "int", label: "Intensificación", weeks: 2, intensity: "high" as const },
      { id: "deload", label: "Deload", weeks: 1, intensity: "deload" as const },
      { id: "peak", label: "Peak", weeks: 2, intensity: "high" as const },
    ],
    [],
  );

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

  if (!todayWorkout) {
    return (
      <EmptyBlock
        title="No tienes entrenamiento para hoy"
        description="Cuando programes una sesión, la verás aquí con su progreso y ejercicios."
        action={<Link className="btn" href="/app/workouts">Crear entrenamiento</Link>}
      />
    );
  }

  const mainContent = (
    <PageContainer as="section" maxWidth="md" className="py-4 pb-24">
      <Stack gap="4">
        <HeaderCompact title="Entrenamiento de hoy" subtitle="Mobile Today" />

        <HeroWorkout
          title={todayWorkout.name}
          subtitle={todayWorkout.notes ?? "Sesión enfocada en rendimiento y técnica."}
          meta={`${estimatedMinutes} min`}
          badge={todayWorkout.goal ?? "Hoy"}
          ctaLabel="Iniciar entrenamiento"
          ctaHref={`/app/entrenamientos/${todayWorkout.id}/start`}
        />

        <section className="rounded-2xl border border-border bg-surface p-4">
          <WorkoutProgressBar label="Progreso" value={completed} max={total} valueLabel={`${completed} de ${total}`} />
        </section>

        <Stack gap="3">
          {(todayWorkout.exercises ?? []).map((exercise, index) => (
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
