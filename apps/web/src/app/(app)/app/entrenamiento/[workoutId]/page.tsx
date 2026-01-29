import { cookies, headers } from "next/headers";
import type { Workout, WorkoutExercise } from "@/lib/types";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type WorkoutExerciseApi = WorkoutExercise & {
  muscleGroup?: string | null;
  primaryMuscleGroup?: string | null;
};

type WorkoutApiResponse = Workout & {
  focus?: string | null;
  exercises?: WorkoutExerciseApi[] | null;
};

async function getAppUrl() {
const headerList = await headers();
const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  if (!host) {
    return "http://localhost:3000";
  }
  return `${protocol}://${host}`;
}

function parseNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
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

function normalizeWorkout(data: WorkoutApiResponse): Workout {
const exercises = Array.isArray(data.exercises)
  ? data.exercises.map((exercise, index) => ({
      id: exercise.id ?? `${data.id}-${index}`,
      exerciseId: exercise.exerciseId ?? exercise.id ?? null,
      name: exercise.name ?? null,
      sets: exercise.sets ?? null,
      reps: exercise.reps ?? null,
      loadKg: exercise.loadKg ?? null,
      rpe: exercise.rpe ?? null,
      rir: exercise.rir ?? null,
      restSeconds: exercise.restSeconds ?? null,
      notes: exercise.notes ?? null,

      // 👇 Esto es lo que te falta para que TypeScript deje de quejarse
      muscleGroup: exercise.muscleGroup ?? exercise.primaryMuscle ?? exercise.primaryMuscle ?? null,

      primaryMuscle: exercise.primaryMuscle ?? null,
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
    const appUrl = await getAppUrl();
    const url = new URL(`/api/workouts/${workoutId}`, appUrl);
    const response = await fetch(url, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return { workout: null, error: "LOAD_ERROR" };
    }
    const data = (await response.json()) as WorkoutApiResponse;
    return { workout: normalizeWorkout(data), error: null };
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
        <section className="card centered-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Icon name="warning" />
            </div>
            <div>
              <h3 className="m-0">{t("workoutDetail.notFoundTitle")}</h3>
              <p className="muted">{t("workoutDetail.notFound")}</p>
            </div>
            <ButtonLink href="/app/entrenamientos" className="fit-content">
              {t("workoutDetail.backToWorkouts")}
            </ButtonLink>
          </div>
        </section>
      </div>
    );
  }

  const { workout, error } = await fetchWorkout(workoutId);
  if (error || !workout) {
    const message = error ? t("workoutDetail.loadError") : t("workoutDetail.notFound");
    return (
      <div className="page">
        <section className="card centered-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Icon name="warning" />
            </div>
            <div>
              <h3 className="m-0">{t("workoutDetail.loadErrorTitle")}</h3>
              <p className="muted">{message}</p>
            </div>
            <ButtonLink href="/app/entrenamientos" className="fit-content">
              {t("workoutDetail.backToWorkouts")}
            </ButtonLink>
          </div>
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
    (scheduledDate ? scheduledDate.toLocaleDateString(localeCode, { weekday: "long" }) : null);

  const badges = [
    dayLabel ? `${t("workoutDetail.dayLabel")}: ${dayLabel}` : null,
    workout.goal ? `${t("workoutDetail.goalLabel")}: ${workout.goal}` : null,
    workout.experienceLevel ? `${t("workoutDetail.levelLabel")}: ${workout.experienceLevel}` : null,
  ].filter(Boolean);

  return (
    <div className="page">
      <section className="card centered-card">
        <div className="page-header">
          <div className="page-header-body">
            <h1 className="section-title">{workout.name}</h1>
            <p className="section-subtitle">
              {workout.notes ?? t("workoutDetail.notesFallback")}
            </p>
          </div>
          <div className="page-header-actions">
            <ButtonLink variant="secondary" href="/app/entrenamientos">
              {t("workoutDetail.backToWorkouts")}
            </ButtonLink>
          </div>
        </div>

        {badges.length > 0 ? (
          <div className="badge-list mt-12">
            {badges.map((badge) => (
              <span key={badge} className="badge">
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        {workout.targetMuscles && workout.targetMuscles.length > 0 ? (
          <p className="muted mt-8">
            {t("workoutDetail.targetMuscles")}: {workout.targetMuscles.join(", ")}
          </p>
        ) : null}

        <div className="list-grid mt-16">
          <div className="feature-card">
            <h3>{t("workoutDetail.summaryTitle")}</h3>
            <p className="muted mt-8">
              {t("workoutDetail.exercisesLabel")}: {totalExercises}
            </p>
            <p className="muted">{t("workoutDetail.setsTotal")}: {totalSets || t("workoutDetail.setsFallback")}</p>
            <p className="muted">
              {t("workoutDetail.volumeEstimated")}: {hasVolume ? `${totalVolume} ${t("workoutDetail.reps")}` : t("workoutDetail.volumeMissing")}
            </p>
          </div>
          <div className="feature-card">
            <h3>{t("workoutDetail.goalTitle")}</h3>
            <p className="muted mt-8">
              {workout.goal ?? t("workoutDetail.goalMissing")}
            </p>
            <p className="muted">{t("workoutDetail.splitLabel")}: {workout.split ?? t("workoutDetail.splitFallback")}</p>
          </div>
          <div className="feature-card">
            <h3>{t("workoutDetail.durationTitle")}</h3>
            <p className="muted mt-8">
              {t("workoutDetail.durationEstimate")}: {workout.estimatedDurationMin ?? workout.durationMin ?? t("workoutDetail.volumeMissing")} {t("training.minutesLabel")}
            </p>
            <p className="muted">{t("workoutDetail.durationPrep")}</p>
          </div>
        </div>
      </section>

      <section className="card centered-card mt-16">
        <div className="section-head">
          <div>
            <h2 className="section-title section-title-sm">
              {t("workoutDetail.exerciseSectionTitle")}
            </h2>
            <p className="section-subtitle">
              {t("workoutDetail.exerciseSectionSubtitle")}
            </p>
          </div>
        </div>

        {exercises.length === 0 ? (
          <p className="muted mt-12">
            {t("workoutDetail.exerciseEmpty")}
          </p>
        ) : (
          <div className="list-grid mt-16">
            {exercises.map((exercise, index) => {
              const exerciseKey = exercise.exerciseId ?? exercise.id ?? `${exercise.name}-${index}`;
              const setsCount = parseNumber(exercise.sets) ?? 0;
              const repsText =
                exercise.reps ??
                parseRepsFromSets(exercise.sets) ??
                t("workoutDetail.repsFallback");
              const intensityLabel =
                exercise.rir !== null && exercise.rir !== undefined
                  ? `RIR ${exercise.rir}`
                  : exercise.rpe !== null && exercise.rpe !== undefined
                    ? `RPE ${exercise.rpe}`
                    : null;
              const restLabel = exercise.restSeconds ? `${t("workoutDetail.restLabel")} ${exercise.restSeconds} s` : null;
              const setLines = setsCount
                ? Array.from({ length: setsCount }).map((_, idx) => ({
                    label: `${t("workoutDetail.setLabel")} ${idx + 1}`,
                    reps: repsText,
                  }))
                : [];

              return (
                <div key={exerciseKey} className="feature-card workout-exercise-card">
                  <div className="workout-exercise-media">
                    <img src="/placeholders/exercise-demo.svg" alt={exercise.name ?? t("workoutDetail.exerciseFallback")} />
                  </div>
                  <div className="workout-exercise-content">
                    <div className="inline-actions-space">
                      <strong>{exercise.name ?? t("workoutDetail.exerciseFallback")}</strong>
                      <span className="muted">{t("workoutDetail.exerciseIndex")}{index + 1}</span>
                    </div>
                    {setLines.length ? (
                      <ul className="workout-set-list">
                        {setLines.map((setLine) => (
                          <li key={setLine.label}>
                            <span>{setLine.label}</span>
                            <span className="muted">{setLine.reps} {t("workoutDetail.reps")}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted mt-8">
                        {t("workoutDetail.setsLabel")}: {exercise.sets ?? t("workoutDetail.setsFallback")}
                      </p>
                    )}
                    <div className="badge-list mt-8">
                      <span className="badge">
                        {exercise.primaryMuscle ? `${t("workoutDetail.exerciseGroup")}: ${exercise.primaryMuscle}` : t("workoutDetail.exerciseGroupFallback")}
                      </span>
                      {intensityLabel ? <span className="badge">{intensityLabel}</span> : null}
                      {restLabel ? <span className="badge">{restLabel}</span> : null}
                    </div>
                    {exercise.notes ? <p className="muted">{exercise.notes}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="centered-card mt-16">
        <ButtonLink href="/app/entrenamientos">
          {t("workoutDetail.backToWorkouts")}
        </ButtonLink>
      </div>
    </div>
  );
}
