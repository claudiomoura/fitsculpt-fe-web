import { normalizeExerciseName as normalizeExerciseNameBase } from "../utils/normalizeExerciseName.js";

export type TrainingPlanExercise = {
  exerciseId?: string | null;
  imageUrl?: string | null;
  name: string;
  [key: string]: unknown;
};

export type TrainingPlanDay<TExercise extends TrainingPlanExercise = TrainingPlanExercise> = {
  label: string;
  exercises?: TExercise[] | null;
  [key: string]: unknown;
};

export type TrainingPlanLike<TDay extends TrainingPlanDay = TrainingPlanDay> = {
  days: TDay[];
  [key: string]: unknown;
};

export type ExerciseCatalogItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
  equipment?: string | null;
  mainMuscleGroup?: string | null;
};

export type InvalidExerciseIdIssue = {
  day: string;
  exercise: string;
  exerciseId: string | null;
  reason: "MISSING_EXERCISE_ID" | "UNKNOWN_EXERCISE_ID";
};

function normalizeExerciseName(name: string) {
  return normalizeExerciseNameBase(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


export function resolveTrainingPlanExerciseIds<TPlan extends TrainingPlanLike>(plan: TPlan, catalog: ExerciseCatalogItem[]) {
  const byId = new Map(catalog.map((item) => [item.id, item]));

  const unresolved: Array<{ day: string; exercise: string }> = [];

  const days = plan.days.map((day) => ({
    ...day,
    exercises: (Array.isArray(day.exercises) ? day.exercises : []).map((exercise) => {
      const normalizedName = normalizeExerciseName(exercise.name);
      const idCandidate = exercise.exerciseId?.trim() ?? "";
      const byProvidedId = idCandidate ? byId.get(idCandidate) : null;
      const resolved = byProvidedId;

      if (!resolved) {
        unresolved.push({ day: day.label, exercise: normalizedName });
        return {
          ...exercise,
          name: normalizedName,
          exerciseId: null,
          imageUrl: null,
        };
      }

      return {
        ...exercise,
        name: resolved.name,
        exerciseId: resolved.id,
        imageUrl: resolved.imageUrl ?? null,
      };
    }),
  }));

  return {
    plan: {
      ...plan,
      days,
    } as TPlan,
    unresolved,
  };
}

export function findInvalidTrainingPlanExerciseIds<TPlan extends TrainingPlanLike>(
  plan: TPlan,
  catalog: ExerciseCatalogItem[]
): InvalidExerciseIdIssue[] {
  const validIds = new Set(catalog.map((item) => item.id));
  const issues: InvalidExerciseIdIssue[] = [];

  for (const day of plan.days) {
    for (const exercise of Array.isArray(day.exercises) ? day.exercises : []) {
      const normalizedName = normalizeExerciseName(exercise.name);
      const candidate = exercise.exerciseId?.trim() ?? "";

      if (!candidate) {
        issues.push({
          day: day.label,
          exercise: normalizedName,
          exerciseId: null,
          reason: "MISSING_EXERCISE_ID",
        });
        continue;
      }

      if (!validIds.has(candidate)) {
        issues.push({
          day: day.label,
          exercise: normalizedName,
          exerciseId: candidate,
          reason: "UNKNOWN_EXERCISE_ID",
        });
      }
    }
  }

  return issues;
}
