import assert from "node:assert/strict";
import {
  buildMealKcalGuidance,
  buildRetryFeedbackFromContext,
  buildTwoMealSplitRetryInstruction,
} from "../ai/nutritionRetry.js";

const guidance = buildMealKcalGuidance(2399, 2, 80);
assert.match(guidance, /targetKcal total=2399/);
assert.match(guidance, /expected por comida=1200/);
assert.match(guidance, /tolerancia por comida=±80/);

const genericFeedback = buildRetryFeedbackFromContext({
  reason: "TWO_MEAL_SPLIT_MISMATCH",
  dayLabel: "Lunes",
  diff: { expected: 1200, actual: 1305, tolerance: 80 },
});
assert.equal(
  genericFeedback,
  "TWO_MEAL_SPLIT_MISMATCH en Lunes: expected=1200, actual=1305, tolerance=±80"
);

const targetedRetry = buildTwoMealSplitRetryInstruction({
  reason: "TWO_MEAL_SPLIT_MISMATCH",
  dayLabel: "Lunes",
  mealTitle: "Cena",
  expected: 1200,
  actual: 1305,
  tolerance: 80,
});
assert.match(targetedRetry, /Ajusta SOLO esa comida/);
assert.match(targetedRetry, /dayLabel=Lunes/);
assert.match(targetedRetry, /mealTitle=Cena/);

const noTargetedRetry = buildTwoMealSplitRetryInstruction({
  reason: "DAY_TOTAL_CALORIES_MISMATCH",
  dayLabel: "Lunes",
});
assert.equal(noTargetedRetry, "");

console.log("nutrition retry tests passed");
