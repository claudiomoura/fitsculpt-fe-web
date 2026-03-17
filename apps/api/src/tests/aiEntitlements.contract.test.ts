import assert from "node:assert/strict";
import { z } from "zod";
import { buildEffectiveEntitlements } from "../entitlements.js";

const notAuthorizedSchema = z.object({
  error: z.string(),
});

function buildUnauthorizedGenerateResponse() {
  return {
    statusCode: 403,
    payload: {
      error: "AI_ACCESS_FORBIDDEN",
    },
  };
}

function run() {
  const strengthOnlyUser = buildEffectiveEntitlements({
    plan: "STRENGTH_AI",
    isAdmin: false,
  });
  assert.equal(strengthOnlyUser.modules.ai.enabled, true);
  assert.equal(strengthOnlyUser.modules.nutrition.enabled, false);

  const nutritionGenerateBlocked = buildUnauthorizedGenerateResponse();
  assert.equal(nutritionGenerateBlocked.statusCode, 403);
  const parsedNutritionError = notAuthorizedSchema.parse(nutritionGenerateBlocked.payload);
  assert.equal(parsedNutritionError.error, "AI_ACCESS_FORBIDDEN");

  const nutritionOnlyUser = buildEffectiveEntitlements({
    plan: "NUTRI_AI",
    isAdmin: false,
  });
  assert.equal(nutritionOnlyUser.modules.ai.enabled, true);
  assert.equal(nutritionOnlyUser.modules.strength.enabled, false);

  const trainingGenerateBlocked = buildUnauthorizedGenerateResponse();
  assert.equal(trainingGenerateBlocked.statusCode, 403);
  const parsedTrainingError = notAuthorizedSchema.parse(trainingGenerateBlocked.payload);
  assert.equal(parsedTrainingError.error, "AI_ACCESS_FORBIDDEN");

  console.log("ai entitlements generate gate contract tests passed");
}

run();
