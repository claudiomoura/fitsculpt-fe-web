import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";
import type { TrainingPlanDetail, Workout, WorkoutExercise } from "@/lib/types";
import { dayKey } from "@/lib/date/dayKey";

type ActiveTrainingPlanResponse = {
  source?: "assigned" | "own";
  plan?: TrainingPlanDetail | null;
};

function mapPlanExerciseToWorkoutExercise(exercise: TrainingPlanDetail["days"][number]["exercises"][number]): WorkoutExercise {
  return {
    id: exercise.id,
    exerciseId: exercise.id,
    muscleGroup: null,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps ?? null,
    notes: exercise.notes ?? null,
  };
}

function mapPlanToWorkouts(plan: TrainingPlanDetail): Workout[] {
  return (plan.days ?? []).map((day, index) => {
    const normalizedDay = dayKey(day.date) ?? day.date;
    return {
      id: day.id || `${plan.id}-${index}`,
      name: day.label || plan.title,
      notes: day.focus || plan.notes || null,
      scheduledAt: normalizedDay,
      durationMin: day.duration,
      goal: plan.goal,
      dayLabel: day.label,
      focus: day.focus,
      exercises: (day.exercises ?? []).map(mapPlanExerciseToWorkoutExercise),
      sessions: [],
    } satisfies Workout;
  });
}

async function listLegacyWorkouts(): Promise<ServiceResult<Workout[]>> {
  return requestJson<Workout[]>("/api/workouts");
}

export async function listWorkoutDays(): Promise<ServiceResult<Workout[]>> {
  const activePlan = await requestJson<ActiveTrainingPlanResponse>("/api/training-plans/active?includeDays=1");

  if (activePlan.ok && activePlan.data.plan) {
    return {
      ok: true,
      data: mapPlanToWorkouts(activePlan.data.plan),
    };
  }

  const legacyWorkouts = await listLegacyWorkouts();
  if (legacyWorkouts.ok) return legacyWorkouts;

  return activePlan.ok
    ? legacyWorkouts
    : activePlan.status && activePlan.status !== 404 && activePlan.status !== 405
      ? activePlan
      : legacyWorkouts;
}
