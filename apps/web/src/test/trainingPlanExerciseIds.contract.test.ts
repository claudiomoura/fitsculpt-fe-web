import { describe, expect, it } from "vitest";

type PlanExercise = {
  exerciseId?: string | null;
  name?: string | null;
};

type PlanDay = {
  exercises?: PlanExercise[] | null;
};

type PlanDetailPayload = {
  days?: PlanDay[] | null;
};

function collectPlanExerciseIds(plan: PlanDetailPayload): string[] {
  return (plan.days ?? []).flatMap((day) =>
    (day.exercises ?? [])
      .map((exercise) => exercise.exerciseId?.trim() ?? "")
      .filter((exerciseId) => exerciseId.length > 0),
  );
}

function assertAllExerciseIdsResolvable(plan: PlanDetailPayload, exerciseLibraryIds: Set<string>): void {
  const missingIds = collectPlanExerciseIds(plan).filter((exerciseId) => !exerciseLibraryIds.has(exerciseId));

  if (missingIds.length > 0) {
    throw new Error(`Training plan contains unknown exerciseId values: ${missingIds.join(", ")}`);
  }
}

function assertDemoExercisesAreResolvable(plan: PlanDetailPayload, exerciseLibraryIds: Set<string>): void {
  const unresolvedNamedExercises = (plan.days ?? []).flatMap((day) =>
    (day.exercises ?? []).filter((exercise) => {
      const hasVisibleName = typeof exercise.name === "string" && exercise.name.trim().length > 0;
      if (!hasVisibleName) return false;

      const exerciseId = exercise.exerciseId?.trim();
      return !exerciseId || !exerciseLibraryIds.has(exerciseId);
    }),
  );

  if (unresolvedNamedExercises.length > 0) {
    throw new Error("Demo dataset includes exercises with name but non-resolvable exerciseId");
  }
}

describe("training plan contract: exerciseId references", () => {
  it("accepts plans where each exercise.exerciseId resolves to a real exercise", () => {
    const exerciseLibraryIds = new Set(["ex_pushup", "ex_squat", "ex_row"]);
    const plan: PlanDetailPayload = {
      days: [
        {
          exercises: [
            { exerciseId: "ex_pushup", name: "Push-up" },
            { exerciseId: "ex_squat", name: "Back Squat" },
          ],
        },
        {
          exercises: [{ name: "Farmer Carry" }],
        },
      ],
    };

    expect(() => assertAllExerciseIdsResolvable(plan, exerciseLibraryIds)).not.toThrow();
  });

  it("fails with a clear error when a plan includes unknown exerciseId", () => {
    const exerciseLibraryIds = new Set(["ex_pushup", "ex_squat"]);
    const plan: PlanDetailPayload = {
      days: [{ exercises: [{ exerciseId: "ex_unknown", name: "Ghost Exercise" }] }],
    };

    expect(() => assertAllExerciseIdsResolvable(plan, exerciseLibraryIds)).toThrow(
      "Training plan contains unknown exerciseId values: ex_unknown",
    );
  });

  it("enforces demo-like named exercises are resolvable", () => {
    const exerciseLibraryIds = new Set(["ex_pushup", "ex_squat"]);
    const demoPlan: PlanDetailPayload = {
      days: [
        {
          exercises: [
            { exerciseId: "ex_pushup", name: "Push-up" },
            { exerciseId: "ex_squat", name: "Back Squat" },
          ],
        },
      ],
    };

    expect(() => assertDemoExercisesAreResolvable(demoPlan, exerciseLibraryIds)).not.toThrow();
  });
});
