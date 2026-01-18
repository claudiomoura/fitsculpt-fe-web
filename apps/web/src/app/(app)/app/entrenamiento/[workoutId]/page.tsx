import Link from "next/link";
import { cookies } from "next/headers";

type WorkoutExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  rir?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  primaryMuscle?: string | null;
};

type Workout = {
  id: string;
  name: string;
  goal?: string | null;
  split?: string | null;
  dayLabel?: string | null;
  experienceLevel?: string | null;
  targetMuscles?: string[] | null;
  durationMin?: number | null;
  estimatedDurationMin?: number | null;
  totalSets?: number | null;
  notes?: string | null;
  exercises?: WorkoutExercise[] | null;
};

type WorkoutApiResponse = Workout & {
  focus?: string | null;
  scheduledAt?: string | null;
  exercises?: Array<
    WorkoutExercise & {
      name?: string | null;
      exerciseId?: string | null;
      muscleGroup?: string | null;
      primaryMuscleGroup?: string | null;
    }
  > | null;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function parseNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return null;
}

function estimateDuration(workout: Workout, exercises: WorkoutExercise[]) {
  if (workout.estimatedDurationMin) return workout.estimatedDurationMin;
  if (workout.durationMin) return workout.durationMin;
  if (exercises.length === 0) return null;
  return exercises.length * 8;
}

function normalizeWorkout(data: WorkoutApiResponse): Workout {
  const exercises = Array.isArray(data.exercises)
    ? data.exercises.map((exercise, index) => ({
        id: exercise.id ?? `${data.id}-${index}`,
        exerciseId: exercise.exerciseId ?? exercise.id ?? "",
        exerciseName: exercise.exerciseName ?? exercise.name ?? "Ejercicio",
        sets: parseNumber(exercise.sets) ?? 0,
        reps: parseNumber(exercise.reps) ?? 0,
        rir: parseNumber(exercise.rir) ?? null,
        restSeconds: parseNumber(exercise.restSeconds) ?? null,
        notes: exercise.notes ?? null,
        primaryMuscle:
          exercise.primaryMuscle ?? exercise.primaryMuscleGroup ?? exercise.muscleGroup ?? null,
      }))
    : [];

  return {
    id: data.id,
    name: data.name,
    goal: data.goal ?? data.focus ?? null,
    split: data.split ?? null,
    dayLabel: data.dayLabel ?? null,
    experienceLevel: data.experienceLevel ?? null,
    targetMuscles: data.targetMuscles ?? null,
    durationMin: data.durationMin ?? null,
    estimatedDurationMin: data.estimatedDurationMin ?? null,
    totalSets: data.totalSets ?? null,
    notes: data.notes ?? null,
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
            Volver a entrenamientos
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
          <p className="muted">No se encontró este entreno.</p>
          <Link className="btn" style={{ width: "fit-content", marginTop: 12 }} href="/app/entrenamientos">
            Volver a entrenamientos
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
      const sets = Number.isFinite(exercise.sets) ? exercise.sets : 0;
      return acc + sets;
    }, 0);
  const estimatedDuration = estimateDuration(workout, exercises);

  const badges = [
    workout.goal ? `Objetivo: ${workout.goal}` : null,
    workout.experienceLevel ? `Nivel: ${workout.experienceLevel}` : null,
    workout.dayLabel ?? workout.split ? `Día: ${workout.dayLabel ?? workout.split}` : null,
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
            <p className="muted">Volumen total: {totalSets || "Sin calcular"} series</p>
            <p className="muted">
              Duración estimada: {estimatedDuration ?? "Sin estimar"} min
            </p>
          </div>
          <div className="feature-card">
            <h3>Split del día</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              {workout.dayLabel ?? workout.split ?? "Planificación libre"}
            </p>
            <p className="muted">Objetivo: {workout.goal ?? "Sin definir"}</p>
          </div>
          <div className="feature-card">
            <h3>Preparación</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              Revisa tu calentamiento y elige cargas progresivas.
            </p>
            <p className="muted">Mantén la técnica antes de subir intensidad.</p>
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
              const details = [
                `${exercise.sets || "—"} x ${exercise.reps || "—"} reps`,
                exercise.rir !== null && exercise.rir !== undefined ? `RIR ${exercise.rir}` : null,
                exercise.restSeconds ? `descanso ${exercise.restSeconds} s` : null,
              ].filter(Boolean);

              return (
                <div key={`${exercise.exerciseId}-${index}`} className="feature-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{exercise.exerciseName}</strong>
                    <span className="muted">#{index + 1}</span>
                  </div>
                  <p className="muted" style={{ marginTop: 8 }}>
                    {exercise.primaryMuscle ? `Grupo: ${exercise.primaryMuscle}` : "Grupo muscular por definir"}
                  </p>
                  <p className="muted">{details.join(" · ")}</p>
                  {exercise.notes ? <p className="muted">{exercise.notes}</p> : null}
                  <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" disabled aria-label="Completar serie" />
                    <span className="muted">Marcar como completado (próximamente)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div style={{ maxWidth: 960, margin: "16px auto 0" }}>
        <Link className="btn" href="/app/entrenamientos">
          Volver a entrenamientos
        </Link>
      </div>
    </div>
  );
}
