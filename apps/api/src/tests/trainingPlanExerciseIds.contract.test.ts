import assert from "node:assert/strict";
import {
  findInvalidTrainingPlanExerciseIds,
  resolveTrainingPlanExerciseIds,
} from "../ai/trainingPlanExerciseResolution.js";

type Plan = {
  title: string;
  days: Array<{
    label: string;
    exercises: Array<{
      exerciseId?: string | null;
      imageUrl?: string | null;
      name: string;
      sets: number;
      reps: string;
    }>;
  }>;
};

function assertAllPlanExercisesExist(plan: Plan, catalog: Array<{ id: string; name: string; imageUrl?: string | null }>) {
  const result = resolveTrainingPlanExerciseIds(plan, catalog);

  if (result.unresolved.length > 0) {
    const unresolvedList = result.unresolved.map((item) => `${item.day}: ${item.exercise}`).join(", ");
    throw new Error(`Generated plan includes unresolved exercises: ${unresolvedList}`);
  }

  return result.plan;
}

const catalog = [
  { id: "ex_001", name: "Sentadilla" },
  { id: "ex_002", name: "Press banca", imageUrl: "https://cdn.example/press.jpg" },
  { id: "ex_003", name: "Remo con barra" },
];

const validPlan: Plan = {
  title: "Plan válido",
  days: [
    {
      label: "Día 1",
      exercises: [
        { exerciseId: "ex_001", name: "Sentadilla", sets: 3, reps: "8-10" },
        { exerciseId: null, name: "Press banca", sets: 3, reps: "8-10" },
        { name: " Remo  con barra!!! ", sets: 3, reps: "8-10" },
      ],
    },
  ],
};

const resolvedValidPlan = assertAllPlanExercisesExist(validPlan, catalog);
assert.equal(resolvedValidPlan.days[0]?.exercises[0]?.exerciseId, "ex_001");
assert.equal(resolvedValidPlan.days[0]?.exercises[1]?.exerciseId, "ex_002");
assert.equal(resolvedValidPlan.days[0]?.exercises[1]?.imageUrl, "https://cdn.example/press.jpg");
assert.equal(resolvedValidPlan.days[0]?.exercises[2]?.exerciseId, "ex_003");

const englishCatalog = [
  {
    id: "all-fours-quad-stretch-id",
    name: "All Fours Quad Stretch",
    imageUrl: "https://cdn.example/all-fours-quad-stretch.jpg",
  },
];

const englishPlan: Plan = {
  title: "English resolution",
  days: [
    {
      label: "Day 1",
      exercises: [{ name: "All Fours Quad Stretch", sets: 2, reps: "30s" }],
    },
  ],
};

const resolvedEnglishPlan = assertAllPlanExercisesExist(englishPlan, englishCatalog);
assert.equal(resolvedEnglishPlan.days[0]?.exercises[0]?.exerciseId, "all-fours-quad-stretch-id");
assert.equal(
  resolvedEnglishPlan.days[0]?.exercises[0]?.imageUrl,
  "https://cdn.example/all-fours-quad-stretch.jpg"
);

const invalidPlan: Plan = {
  title: "Plan inválido",
  days: [
    {
      label: "Día 2",
      exercises: [
        { exerciseId: null, name: "Ejercicio fantasma", sets: 3, reps: "10" },
        { exerciseId: "does-not-exist", name: "Otro inventado", sets: 4, reps: "6-8" },
      ],
    },
  ],
};

assert.throws(
  () => assertAllPlanExercisesExist(invalidPlan, catalog),
  /Generated plan includes unresolved exercises: Día 2: ejercicio fantasma, Día 2: otro inventado/
);


const exerciseIdsMissingOrUnknownPlan: Plan = {
  title: "Plan con IDs inválidos",
  days: [
    {
      label: "Día 3",
      exercises: [
        { exerciseId: null, name: "Sentadilla", sets: 3, reps: "8-10" },
        { exerciseId: "unknown-id", name: "Press banca", sets: 3, reps: "8-10" },
      ],
    },
  ],
};

const invalidExerciseIds = findInvalidTrainingPlanExerciseIds(exerciseIdsMissingOrUnknownPlan, catalog);
assert.deepEqual(invalidExerciseIds, [
  {
    day: "Día 3",
    exercise: "sentadilla",
    exerciseId: null,
    reason: "MISSING_EXERCISE_ID",
  },
  {
    day: "Día 3",
    exercise: "press banca",
    exerciseId: "unknown-id",
    reason: "UNKNOWN_EXERCISE_ID",
  },
]);


const sparsePlan = {
  title: "Plan sparse",
  days: [
    {
      label: "Día 4",
      exercises: null,
    },
  ],
} as unknown as Plan;

const resolvedSparsePlan = resolveTrainingPlanExerciseIds(sparsePlan, catalog);
assert.deepEqual(resolvedSparsePlan.unresolved, []);
assert.deepEqual(resolvedSparsePlan.plan.days[0]?.exercises, []);

const sparseIssues = findInvalidTrainingPlanExerciseIds(sparsePlan, catalog);
assert.deepEqual(sparseIssues, []);

console.log("training plan exercise ids contract test passed");
