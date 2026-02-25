import assert from "node:assert/strict";
import { z } from "zod";

const catalogUnavailableSchema = z.object({
  error: z.literal("EXERCISE_CATALOG_EMPTY"),
  debug: z.object({
    cause: z.literal("CATALOG_EMPTY"),
    hint: z.literal("Run /dev/seed-exercises"),
  }),
});

const trainingPlanGenerateSuccessSchema = z.object({
  planId: z.string().min(1),
  summary: z.any(),
  plan: z.any(),
  aiRequestId: z.string().nullable(),
});

const parsedCatalogUnavailable = catalogUnavailableSchema.parse({
  error: "EXERCISE_CATALOG_EMPTY",
  debug: {
    cause: "CATALOG_EMPTY",
    hint: "Run /dev/seed-exercises",
  },
});

assert.equal(parsedCatalogUnavailable.debug.cause, "CATALOG_EMPTY");
assert.equal(parsedCatalogUnavailable.debug.hint, "Run /dev/seed-exercises");

const parsedSuccessPayload = trainingPlanGenerateSuccessSchema.parse({
  planId: "plan_123",
  summary: { days: 4 },
  plan: { days: [] },
  aiRequestId: null,
});

assert.equal(parsedSuccessPayload.planId, "plan_123");

console.log("training plan generate error contracts passed");
