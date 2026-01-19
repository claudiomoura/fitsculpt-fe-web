import Link from "next/link";
import { cookies, headers } from "next/headers";
import type { Workout, WorkoutExercise } from "@/lib/types";

async function getAppUrl() {
  const headerList = headers();
  const host = (await headerList).get("x-forwarded-host") ?? (await headerList).get("host");
  const protocol = (await headerList).get("x-forwarded-proto") ?? "http";
  if (!host) {
    return "http://localhost:3000";
  }
  return `${protocol}://${host}`;
}

function parseSets(value: WorkoutExercise["sets"]) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : null;
  }
  return null;
}

function formatLoad(value: WorkoutExercise["loadKg"]) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "number" ? `${value} kg` : `${value} kg`;
}

async function fetchWorkout(workoutId: string) {
  try {
    const token = (await cookies()).get("fs_token")?.value;
    const authCookie = token ? `fs_token=${token}` : "";
    const response = await fetch(`${getAppUrl()}/api/workouts/${workoutId}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) {
      return { workout: null, error: "No se pudo cargar el entrenamiento." };
    }
    const data = (await response.json()) as Workout;
    return { workout: data, error: null };
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
          <p className="muted">No se pudo cargar el entrenamiento.</p>
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
          <p className="muted">{error ?? "No se pudo cargar el entrenamiento."}</p>
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
    exercises.reduce((acc, item) => {
      const sets = parseSets(item.sets);
      return acc + (sets ?? 0);
    }, 0);
  const focusText = workout.focus ?? workout.goal ?? null;
  const summaryParts = [
    focusText ? `Hoy toca ${focusText}` : "Hoy toca trabajo planificado",
    totalExercises > 0 ? `${totalExercises} ejercicios` : null,
    totalSets ? `volumen total aproximado ${totalSets} series` : null,
  ].filter(Boolean);

  const scheduledDate = workout.scheduledAt ? new Date(workout.scheduledAt) : null;
  const dayLabel = scheduledDate
    ? scheduledDate.toLocaleDateString("es-ES", { weekday: "long" })
    : workout.dayLabel ?? null;

  return (
    <div className="page">
      <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="form-stack">
          <h1 className="section-title">{workout.name}</h1>
          <p className="section-subtitle">{summaryParts.join(", ")}.</p>
        </div>

        <div className="list-grid" style={{ marginTop: 16 }}>
          <div className="feature-card">
            <h3>Meta</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              Objetivo: {workout.goal ?? workout.focus ?? "Sin definir"}
            </p>
            <p className="muted">
              Día: {dayLabel ?? "Sin asignar"}
            </p>
          </div>
          <div className="feature-card">
            <h3>Volumen</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              Ejercicios: {totalExercises || "0"}
            </p>
            <p className="muted">Series: {totalSets || "Sin calcular"}</p>
          </div>
          <div className="feature-card">
            <h3>Duración</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              Estimada: {workout.estimatedDurationMin ?? workout.durationMin ?? "Sin estimar"} min
            </p>
            <p className="muted">Notas: {workout.notes ?? "Sin notas adicionales."}</p>
          </div>
        </div>
      </section>

      <section className="card" style={{ maxWidth: 960, margin: "16px auto 0" }}>
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>Ejercicios</h2>
            <p className="section-subtitle">
              Orden y parámetros del entreno con foco en rendimiento.
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
              const exerciseId = exercise.exerciseId ?? exercise.id ?? null;
              const reps = exercise.reps ?? "Sin rango";
              const sets = exercise.sets ?? "Sin series";
              const load = formatLoad(exercise.loadKg);
              return (
                <div key={`${exercise.name}-${index}`} className="feature-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{exercise.name}</strong>
                    <span className="muted">#{index + 1}</span>
                  </div>
                  <p className="muted" style={{ marginTop: 8 }}>
                    {sets} x {reps}
                    {load ? ` · ${load}` : ""}
                  </p>
                  <p className="muted">
                    RPE objetivo: {exercise.rpe ?? "Sin dato"} · Descanso:{" "}
                    {exercise.restSeconds ? `${exercise.restSeconds} s` : "Sin dato"}
                  </p>
                  {exercise.lastLog ? (
                    <p className="muted">
                      Último registro: {exercise.lastLog.loadKg ?? "—"} kg ·{" "}
                      {exercise.lastLog.reps ?? "—"} reps
                    </p>
                  ) : null}
                  {exercise.notes ? <p className="muted">{exercise.notes}</p> : null}
                  {exerciseId ? (
                    <Link className="btn secondary" style={{ marginTop: 10 }} href={`/app/biblioteca/${exerciseId}`}>
                      Ver detalles del ejercicio
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
