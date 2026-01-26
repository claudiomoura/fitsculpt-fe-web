import Link from "next/link";
import { cookies, headers } from "next/headers";
import type { Workout, WorkoutExercise } from "@/lib/types";
import { getServerT } from "@/lib/serverI18n";

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

function parseSetCount(value: WorkoutExercise["sets"]) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : null;
  }
  return null;
}

function parseRepsFromSets(value: WorkoutExercise["sets"]) {
  if (typeof value !== "string") return null;
  const match = value.match(/x\s*(.+)$/i);
  return match ? match[1]?.trim() : null;
}

async function fetchWorkout(workoutId: string) {
  try {
    const token = (await cookies()).get("fs_token")?.value;
    const authCookie = token ? `fs_token=${token}` : "";
    const appUrl = await getAppUrl();
    const response = await fetch(`${appUrl}/api/workouts/${workoutId}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) {
      return { workout: null, error: "LOAD_ERROR" };
    }
    const data = (await response.json()) as Workout;
    return { workout: data, error: null };
  } catch {
    return { workout: null, error: "LOAD_ERROR" };
  }
}

export default async function WorkoutDetailPage(props: { params: Promise<{ workoutId: string }> }) {
  const { t, localeCode } = await getServerT();
  const { workoutId } = await props.params;
  if (!workoutId) {
    return (
      <div className="page">
        <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="muted">{t("workoutDetail.loadError")}</p>
          <Link className="btn" style={{ width: "fit-content", marginTop: 12 }} href="/app/entrenamientos">
            {t("workoutDetail.backToWorkouts")}
          </Link>
        </section>
      </div>
    );
  }

  const { workout, error } = await fetchWorkout(workoutId);
  if (error || !workout) {
    const message = error ? t("workoutDetail.loadError") : t("workoutDetail.notFound");
    return (
      <div className="page">
        <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="muted">{message}</p>
          <Link className="btn" style={{ width: "fit-content", marginTop: 12 }} href="/app/entrenamientos">
            {t("workoutDetail.backToWorkouts")}
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
    focusText ? `${t("workoutDetail.todayFocus")} ${focusText}` : t("workoutDetail.todayPlanned"),
    totalExercises > 0 ? `${totalExercises} ${t("workoutDetail.exercisesLabel").toLowerCase()}` : null,
    totalSets ? `${t("workoutDetail.volumeTotal")} ${totalSets} ${t("workoutDetail.setsLabel")}` : null,
  ].filter(Boolean);

  const scheduledDate = workout.scheduledAt ? new Date(workout.scheduledAt) : null;
  const dayLabel = scheduledDate
    ? scheduledDate.toLocaleDateString(localeCode, { weekday: "long" })
    : workout.dayLabel ?? null;

  return (
    <div className="page">
      <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="form-stack">
          <span className="badge">{dayLabel ?? t("workoutDetail.dayFallback")}</span>
          <h1 className="section-title">{workout.name}</h1>
          <p className="section-subtitle">{summaryParts.join(", ")}.</p>
        </div>

        <div className="badge-list" style={{ marginTop: 12 }}>
          <span className="badge">
            {t("workoutDetail.exercisesLabel")}: {totalExercises || 0}
          </span>
          <span className="badge">
            {t("workoutDetail.durationEstimate")}: {workout.estimatedDurationMin ?? workout.durationMin ?? t("workoutDetail.volumeMissing")} {t("training.minutesLabel")}
          </span>
          <span className="badge">
            {t("workoutDetail.goalLabel")}: {workout.goal ?? workout.focus ?? t("workoutDetail.goalMissing")}
          </span>
        </div>
        <div style={{ marginTop: 16 }}>
          <Link className="btn" href={`/app/entrenamientos/${workout.id}/start`}>
            {t("workoutDetail.startWorkout")}
          </Link>
        </div>
      </section>

      <section className="card" style={{ maxWidth: 960, margin: "16px auto 0" }}>
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("workoutDetail.exerciseSectionTitle")}</h2>
            <p className="section-subtitle">
              {t("workoutDetail.exerciseSectionSubtitleAlt")}
            </p>
          </div>
        </div>

        {exercises.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>
            {t("workoutDetail.exerciseEmpty")}
          </p>
        ) : (
          <div className="list-grid" style={{ marginTop: 16 }}>
            {exercises.map((exercise, index) => {
              const exerciseId = exercise.exerciseId ?? exercise.id ?? null;
              const repsText =
                exercise.reps ??
                parseRepsFromSets(exercise.sets) ??
                t("workoutDetail.repsFallback");
              const setsCount = parseSetCount(exercise.sets) ?? 0;
              const load = formatLoad(exercise.loadKg);
              const setLines = setsCount
                ? Array.from({ length: setsCount }).map((_, idx) => ({
                    label: `${t("workoutDetail.setLabel")} ${idx + 1}`,
                    reps: repsText,
                  }))
                : [];
              return (
                <div key={`${exercise.name}-${index}`} className="feature-card workout-exercise-card">
                  <div className="workout-exercise-media">
                    <img src="/placeholders/exercise-demo.svg" alt={exercise.name ?? t("workoutDetail.exerciseFallback")} />
                  </div>
                  <div className="workout-exercise-content">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div>
                        <strong>{exercise.name ?? t("workoutDetail.exerciseFallback")}</strong>
                        <p className="muted" style={{ margin: "4px 0 0" }}>
                          {load ? `${load} · ` : ""}{t("workoutDetail.exerciseIndex")}{index + 1}
                        </p>
                      </div>
                      {exerciseId ? (
                        <Link className="btn secondary" href={`/app/biblioteca/${exerciseId}`}>
                          {t("workoutDetail.exerciseLink")}
                        </Link>
                      ) : null}
                    </div>
                    {setLines.length > 0 ? (
                      <ul className="workout-set-list">
                        {setLines.map((setLine) => (
                          <li key={setLine.label}>
                            <span>{setLine.label}</span>
                            <span className="muted">{setLine.reps} {t("workoutDetail.reps")}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">{t("workoutDetail.setsLabel")}: {exercise.sets ?? t("workoutDetail.setsFallback")}</p>
                    )}
                    <p className="muted">
                      {t("workoutDetail.rpeTarget")}: {exercise.rpe ?? t("workoutDetail.metricFallback")} · {t("workoutDetail.restLabel")}:{" "}
                      {exercise.restSeconds ? `${exercise.restSeconds} s` : t("workoutDetail.metricFallback")}
                    </p>
                  {exercise.lastLog ? (
                    <p className="muted">
                      {t("workoutDetail.lastLog")}: {exercise.lastLog.loadKg ?? "—"} kg ·{" "}
                      {exercise.lastLog.reps ?? "—"} {t("workoutDetail.reps")}
                    </p>
                  ) : null}
                    {exercise.notes ? <p className="muted">{exercise.notes}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
