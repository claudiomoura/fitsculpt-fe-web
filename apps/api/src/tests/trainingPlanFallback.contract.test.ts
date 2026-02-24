import assert from "node:assert/strict";
import { buildDeterministicTrainingFallbackPlan } from "../ai/training-plan/fallbackBuilder.js";

const catalog = [
  { id: "ex_001", name: "Sentadilla", equipment: "Barra" },
  { id: "ex_002", name: "Press banca", equipment: "Barra" },
  { id: "ex_003", name: "Remo con barra", equipment: "Barra" },
  { id: "ex_004", name: "Plancha", equipment: "Bodyweight" },
  { id: "ex_005", name: "Hip thrust", equipment: "Barra" },
];

const plan = buildDeterministicTrainingFallbackPlan(
  {
    daysPerWeek: 4,
    level: "intermediate",
    goal: "maintain",
    startDate: new Date("2026-01-05T00:00:00.000Z"),
    equipment: "home",
  },
  catalog
);

const planRepeated = buildDeterministicTrainingFallbackPlan(
  {
    daysPerWeek: 4,
    level: "intermediate",
    goal: "maintain",
    startDate: new Date("2026-01-05T00:00:00.000Z"),
    equipment: "home",
  },
  catalog
);

assert.equal(plan.days.length, 4);
assert.equal(plan.days[0]?.date, "2026-01-05");
assert.equal(plan.days[1]?.date, "2026-01-07");

assert.deepEqual(plan, planRepeated, "fallback plan should be deterministic for same input");

for (const day of plan.days) {
  assert.equal(day.exercises.length, 4);
  for (const exercise of day.exercises) {
    assert.ok(exercise.exerciseId);
    const catalogExercise = catalog.find((item) => item.id === exercise.exerciseId);
    assert.ok(catalogExercise, `exerciseId does not exist in catalog: ${exercise.exerciseId}`);
    assert.equal(catalogExercise.equipment, "Bodyweight");
  }
}

console.log("training fallback contract test passed");
