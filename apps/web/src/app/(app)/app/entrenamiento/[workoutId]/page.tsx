import Link from "next/link";
import { cookies } from "next/headers";
import type { Workout, WorkoutExercise } from "@/lib/types";

type WorkoutExerciseApi = WorkoutExercise & {
  exerciseName?: string | null;
  muscleGroup?: string | null;
  primaryMuscleGroup?: string | null;
};

type WorkoutApiResponse = Workout & {
  focus?: string | null;
  exercises?: WorkoutExerciseApi[] | null;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function parseNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : null;
  }
  return null;
}

function normalizeWorkout(data: WorkoutApiResponse): Workout {
  const exercises = Array.isArray(data.exercises)
    ? data.exercises.map((exercise, index) => ({
        id: exercise.id ?? `${data.id}-${index}`,
        exerciseId: exercise.exerciseId ?? exercise.id ?? null,
        name: exercise.name ?? exercise.exerciseName ?? "Ejercicio",
        sets: exercise.sets ?? null,
        reps: exercise.reps ?? null,
        loadKg: exercise.loadKg ?? null,
        rpe: exercise.rpe ?? null,
        rir: exercise.rir ?? null,
        restSeconds: exercise.restSeconds ?? null,
        notes: exercise.notes ?? null,
        primaryMuscle:
          exercise.primaryMuscle ?? exercise.primaryMuscleGroup ?? exercise.muscleGroup ?? null,
        lastLog: exercise.lastLog ?? null,
      }))
    : [];

  return {
    ...data,
    goal: data.goal ?? data.focus ?? null,
    exercises,
  };
}

async function fetchWorkout(workoutId: string) {
  try {
    const token = (await cookies()).get("fs_token")?.value;
    const authCookie = token ? `fs_token=${token}` : "";
    const response = await fetch(`${APP_URL}/api/workouts/${workoutId}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) {
      return { workout: null, error: "No se pudo cargar el entrenamiento." };
    }
    const data = (await response.json()) as WorkoutApiResponse;
    return { workout: normalizeWorkout(data), error: null };
  } catch {
    return { workout: null, error: "No se pudo cargar el entrenamiento." };
  }
}

export default async function WorkoutDetailPage(props: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await props.params;
  if (!workoutId) {
    return (
      <div className="page">
        <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="muted">No se encontró este entreno.</p>
          <Link className="btn" style={{ width: "fit-content", marginTop: 12 }} href="/app/entrenamientos">
            Volver a los entrenos
          </Link>
        </section>
      </div>
    );
  }

  const { workout, error } = await fetchWorkout(workoutId);
  if (error || !workout) {
    return (
      <div className="page">
        <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="muted">{error ?? "No se encontró este entreno."}</p>
          <Link className="btn" style={{ width: "fit-content", marginTop: 12 }} href="/app/entrenamientos">
            Volver a los entrenos
          </Link>
        </section>
      </div>
    );
  }

  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
  const totalExercises = exercises.length;
  const totalSets =
    workout.totalSets ??
    exercises.reduce((acc, exercise) => {
      const sets = parseNumber(exercise.sets);
      return acc + (sets ?? 0);
    }, 0);
  const totalVolume = exercises.reduce((acc, exercise) => {
    const sets = parseNumber(exercise.sets);
    const reps = parseNumber(exercise.reps);
    if (!sets || !reps) return acc;
    return acc + sets * reps;
  }, 0);
  const hasVolume = totalVolume > 0;

  const scheduledDate = workout.scheduledAt ? new Date(workout.scheduledAt) : null;
  const dayLabel =
    workout.dayLabel ??
    workout.split ??
    (scheduledDate ? scheduledDate.toLocaleDateString("es-ES", { weekday: "long" }) : null);

  const badges = [
    dayLabel ? `Día: ${dayLabel}` : null,
    workout.goal ? `Objetivo: ${workout.goal}` : null,
    workout.experienceLevel ? `Nivel: ${workout.experienceLevel}` : null,
  ].filter(Boolean);

  return (
    <div className="page">
      <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="form-stack">
          <h1 className="section-title">{workout.name}</h1>
          <p className="section-subtitle">
            {workout.notes ?? "Resumen del entreno con foco en ejecución y progresión."}
          </p>
        </div>

        {badges.length > 0 ? (
          <div className="badge-list" style={{ marginTop: 12 }}>
            {badges.map((badge) => (
              <span key={badge} className="badge">
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        {workout.targetMuscles && workout.targetMuscles.length > 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>
            Músculos objetivo: {workout.targetMuscles.join(", ")}
          </p>
        ) : null}

        <div className="list-grid" style={{ marginTop: 16 }}>
          <div className="feature-card">
            <h3>Resumen</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              Ejercicios: {totalExercises}
            </p>
            <p className="muted">Series totales: {totalSets || "Sin calcular"}</p>
            <p className="muted">
              Volumen estimado: {hasVolume ? `${totalVolume} reps` : "Sin estimar"}
            </p>
          </div>
          <div className="feature-card">
            <h3>Objetivo</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              {workout.goal ?? "Sin definir"}
            </p>
            <p className="muted">Split: {workout.split ?? "Planificación libre"}</p>
          </div>
          <div className="feature-card">
            <h3>Duración</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              Estimada: {workout.estimatedDurationMin ?? workout.durationMin ?? "Sin estimar"} min
            </p>
            <p className="muted">Preparación: movilidad, cargas progresivas.</p>
          </div>
        </div>
      </section>

      <section className="card" style={{ maxWidth: 960, margin: "16px auto 0" }}>
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>
              Ejercicios
            </h2>
            <p className="section-subtitle">
              Orden y parámetros al estilo FitnessAI para ejecutar cada bloque.
            </p>
          </div>
        </div>

        {exercises.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>
            Este entreno aún no tiene ejercicios asociados.
          </p>
        ) : (
          <div className="list-grid" style={{ marginTop: 16 }}>
            {exercises.map((exercise, index) => {
              const exerciseKey = exercise.exerciseId ?? exercise.id ?? `${exercise.name}-${index}`;
              const setsLabel = exercise.sets ?? "—";
              const repsLabel = exercise.reps ?? "—";
              const intensityLabel =
                exercise.rir !== null && exercise.rir !== undefined
                  ? `RIR ${exercise.rir}`
                  : exercise.rpe !== null && exercise.rpe !== undefined
                    ? `RPE ${exercise.rpe}`
                    : null;
              const restLabel = exercise.restSeconds ? `Descanso ${exercise.restSeconds} s` : null;

              return (
                <div key={exerciseKey} className="feature-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{exercise.name}</strong>
                    <span className="muted">#{index + 1}</span>
                  </div>
                  <p className="muted" style={{ marginTop: 8 }}>
                    {setsLabel} x {repsLabel}
                  </p>
                  <div className="badge-list" style={{ marginTop: 8 }}>
                    <span className="badge">
                      {exercise.primaryMuscle ? `Grupo: ${exercise.primaryMuscle}` : "Grupo por definir"}
                    </span>
                    {intensityLabel ? <span className="badge">{intensityLabel}</span> : null}
                    {restLabel ? <span className="badge">{restLabel}</span> : null}
                  </div>
                  {exercise.notes ? <p className="muted">{exercise.notes}</p> : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div style={{ maxWidth: 960, margin: "16px auto 0" }}>
        <Link className="btn" href="/app/entrenamientos">
          Volver a los entrenos
        </Link>
      </div>
    </div>
  );
}
