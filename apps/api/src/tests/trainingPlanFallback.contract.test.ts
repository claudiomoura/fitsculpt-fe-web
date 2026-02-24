import assert from "node:assert/strict";
import { buildDeterministicTrainingFallbackPlan } from "../ai/training-plan/fallbackBuilder.js";

const catalog = [
  { id: "ex_001", name: "Sentadilla" },
  { id: "ex_002", name: "Press banca" },
  { id: "ex_003", name: "Remo con barra" },
  { id: "ex_004", name: "Plancha" },
  { id: "ex_005", name: "Hip thrust" },
];

const plan = buildDeterministicTrainingFallbackPlan(
  {
    daysPerWeek: 4,
    level: "intermediate",
    goal: "maintain",
    startDate: new Date("2026-01-05T00:00:00.000Z"),
  },
  catalog
);

assert.equal(plan.days.length, 4);
assert.equal(plan.days[0]?.date, "2026-01-05");
assert.equal(plan.days[1]?.date, "2026-01-07");

for (const day of plan.days) {
  assert.equal(day.exercises.length, 4);
  for (const exercise of day.exercises) {
    assert.ok(exercise.exerciseId);
    const exists = catalog.some((item) => item.id === exercise.exerciseId);
    assert.ok(exists, `exerciseId does not exist in catalog: ${exercise.exerciseId}`);
  }
}

assert.throws(
  () =>
    buildDeterministicTrainingFallbackPlan(
      {
        daysPerWeek: 3,
        level: "beginner",
        goal: "cut",
        startDate: new Date("2026-01-05T00:00:00.000Z"),
      },
      []
    ),
  /EXERCISE_CATALOG_EMPTY/
);

console.log("training fallback contract test passed");
