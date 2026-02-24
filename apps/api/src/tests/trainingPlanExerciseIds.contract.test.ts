import assert from "node:assert/strict";
import { resolveTrainingPlanExerciseIds } from "../ai/trainingPlanExerciseResolution.js";

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
  /Generated plan includes unresolved exercises: Día 2: Ejercicio fantasma, Día 2: Otro inventado/
);

console.log("training plan exercise ids contract test passed");
