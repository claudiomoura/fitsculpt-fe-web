import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { registerAiRoutes } from "../domains/ai/registerAiRoutes.js";
import {
  contextualChatRequestSchema,
  contextualChatResponseSchema,
} from "../ai/chat/contextualChatSchemas.js";

function httpError(statusCode: number, code: string, debug?: Record<string, unknown>) {
  const error = new Error(code) as Error & {
    statusCode?: number;
    code?: string;
    debug?: Record<string, unknown>;
  };
  error.statusCode = statusCode;
  error.code = code;
  error.debug = debug;
  return error;
}

const user = {
  id: "user_test",
  plan: "FREE",
  aiTokenBalance: 1000,
  aiTokenResetAt: null,
  aiTokenRenewalAt: null,
};

const entitlements = {
  modules: { ai: { enabled: true } },
  legacy: { tier: "FREE" },
  role: { adminOverride: false },
};

function baseDeps() {
  const aiTrainingSchema = z.object({
    age: z.number().default(30),
    sex: z.enum(["male", "female"]).default("male"),
    level: z.string().default("beginner"),
    goal: z.string(),
    equipment: z.string().default("gym"),
    daysPerWeek: z.number().int().min(1).max(7),
    daysCount: z.number().int().min(1).max(14).optional(),
    sessionTime: z.string().default("medium"),
    focus: z.string().default("full"),
    timeAvailableMinutes: z.number().default(45),
    restrictions: z.array(z.string()).optional(),
    startDate: z.string().optional(),
  });

  const aiNutritionSchema = z.object({
    mealsPerDay: z.number().int().min(1).max(6),
    daysCount: z.number().int().min(1).max(14).optional(),
    startDate: z.string().optional(),
    name: z.string().optional(),
    preferredFoods: z.string().optional(),
  });

  const aiGenerateTrainingSchema = z.object({
    goal: z.string(),
    daysPerWeek: z.number().int().min(1).max(7),
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
    constraints: z.array(z.string()).default([]),
    userId: z.string().optional(),
  });

  const aiTipSchema = z.object({
    name: z.string().optional(),
    objective: z.string().optional(),
  });

  return {
    aiAccessGuard: async () => {},
    aiStrengthDomainGuard: async () => {},
    aiNutritionDomainGuard: async () => {},
    requireUser: async () => user,
    getUserEntitlements: () => entitlements,
    toDateKey: () => "2026-01-01",
    env: { AI_DAILY_LIMIT_PRO: 20, AI_DAILY_LIMIT_FREE: 5 },
    prisma: {
      aiUsage: { findUnique: async () => ({ count: 1 }) },
      aiPromptCache: { deleteMany: async () => ({ count: 0 }) },
      recipe: { findMany: async () => [] },
      userProfile: { findUnique: async () => ({ profile: { goal: "strength" } }) },
      trainingPlan: { findFirst: async () => ({ title: "Plan fuerza", goal: "strength", daysPerWeek: 3 }) },
      nutritionPlan: { findFirst: async () => ({ title: "Plan base", dailyCalories: 2200 }) },
      $transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    },
    getAiTokenPayload: () => ({ aiTokenBalance: 800, aiTokenRenewalAt: null }),
    getSecondsUntilNextUtcDay: () => 100,
    handleRequestError: (reply: any, error: unknown) => {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: "INVALID_INPUT" });
      }
      const typed = error as { statusCode?: number; code?: string; debug?: Record<string, unknown> };
      if (typed.statusCode) {
        return reply.status(typed.statusCode).send({ error: typed.code ?? "REQUEST_ERROR", ...(typed.debug ? { debug: typed.debug } : {}) });
      }
      return reply.status(500).send({ error: "INTERNAL_ERROR" });
    },
    logAuthCookieDebug: () => {},
    requireCompleteProfile: async () => {},
    aiTrainingSchema,
    loadExerciseCatalogForAi: async () => [{ name: "Press banca" }],
    parseDateInput: () => new Date("2026-01-01T00:00:00.000Z"),
    buildCacheKey: () => "cache-key",
    buildTrainingTemplate: () => ({ days: [] }),
    getEffectiveTokenBalance: () => 1000,
    assertSufficientAiTokenBalance: () => {},
    getEstimatedAiFeatureTokens: () => 10,
    normalizeTrainingPlanDays: (plan: unknown) => plan,
    applyPersonalization: (value: unknown) => value,
    assertTrainingMatchesRequest: () => {},
    resolveTrainingPlanExerciseIds: (plan: unknown) => plan,
    saveTrainingPlan: async () => ({ id: "saved-plan", persistedPlan: { id: "saved-plan" } }),
    storeAiContent: async () => {},
    getCachedAiPayload: async () => null,
    parseTrainingPlanPayload: () => ({ days: [{ date: "2026-01-01", workouts: [] }] }),
    saveCachedAiPayload: async () => {},
    enforceAiQuota: async () => {},
    buildTrainingPrompt: () => "prompt",
    formatExerciseCatalogForPrompt: () => "catalog",
    extractTopLevelJson: (value: unknown) => value,
    chargeAiUsage: async ({ execute }: { execute: () => Promise<{ payload: unknown }> }) => {
      const result = await execute();
      return {
        payload: result.payload,
        balance: 900,
        costCents: 1,
        totalTokens: 30,
        model: "gpt",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      };
    },
    aiPricing: {},
    callOpenAi: async () => ({ payload: { reply: { message: "contextual reply" }, days: [{ date: "2026-01-01", workouts: [] }] }, requestId: "req_1", usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }, model: "gpt" }),
    getUserTokenExpiryAt: () => null,
    extractExactProviderUsage: () => ({ promptTokens: 10, completionTokens: 20, totalTokens: 30 }),
    aiNutritionSchema,
    getSafeValidationIssues: () => [{ field: "mealsPerDay", code: "invalid_type" }],
    normalizeNutritionPlanDays: (plan: unknown) => plan,
    logNutritionMealsPerDay: () => {},
    normalizeNutritionMealsPerDay: (plan: unknown) => plan,
    applyNutritionCatalogResolution: (plan: unknown) => plan,
    assertNutritionMatchesRequest: () => {},
    saveNutritionPlan: async () => ({ id: "nutrition_plan_1" }),
    parseNutritionPlanPayload: () => ({ days: [{ meals: [] }] }),
    applyRecipeScalingToPlan: (plan: unknown) => plan,
    buildNutritionTemplate: () => ({ days: [{ meals: [] }] }),
    buildNutritionPrompt: () => "nutrition prompt",
    chargeAiUsageForResult: async () => ({ balance: 900, costCents: 1, totalTokens: 30, model: "gpt", usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 } }),
    createHttpError: httpError,
    aiGenerateTrainingSchema,
    buildDeterministicTrainingFallbackPlan: () => ({ days: [{ date: "2026-01-01", workouts: [] }] }),
    createOpenAiClient: () => ({}),
    trainingPlanJsonSchema: { type: "object" },
    mapExperienceLevelToTrainingPlanLevel: (value: string) => value,
    buildRetryFeedbackFromContext: () => "",
    buildTwoMealSplitRetryInstruction: () => "",
    nutritionPlanJsonSchema: { type: "object" },
    buildMealKcalGuidance: () => "",
    NUTRITION_MATH_TOLERANCES: {},
    validateNutritionMath: () => ({ ok: true }),
    parseJsonFromText: () => ({}),
    parseLargestJsonFromText: () => ({}),
    parseTopLevelJsonFromText: () => ({}),
    AiParseError: class AiParseError extends Error {},
    aiTrainingPlanResponseSchema: z.object({ days: z.array(z.any()) }),
    aiNutritionPlanResponseSchema: z.object({ days: z.array(z.any()) }),
    resolveTrainingPlanWithDeterministicFallback: (plan: unknown) => plan,
    assertTrainingLevelConsistency: () => {},
    upsertExercisesFromPlan: async () => {},
    classifyAiGenerateError: (error: any) => {
      if (error instanceof z.ZodError) {
        return { statusCode: 400, error: "INVALID_INPUT", errorKind: "validation_error" };
      }
      if (error?.statusCode === 429) {
        return { statusCode: 429, error: error.code ?? "AI_QUOTA_EXCEEDED", errorKind: "quota_error" };
      }
      return { statusCode: error.statusCode ?? 500, error: error.code ?? "INTERNAL_ERROR", errorKind: "upstream_error" };
    },
    findInvalidTrainingPlanExerciseIds: () => [],
    resolveTrainingPlanExerciseIdsWithCatalog: (plan: unknown) => plan,
    summarizeTrainingPlan: () => ({ days: 1 }),
    persistAiUsageLog: async () => {},
    buildUsageTotals: () => ({ promptTokens: 0, completionTokens: 0, totalTokens: 0 }),
    aiTipSchema,
    buildTipTemplate: () => ({ title: "Tip" }),
    safeStoreAiContent: async () => {},
    buildTipPrompt: () => "tip",
    resolveNutritionPlanRecipeReferences: (plan: unknown) => plan,
    normalizeNutritionPlanDaysWithLabels: (plan: unknown) => plan,
    applyNutritionPlanVarietyGuard: (plan: unknown) => plan,
    resolveNutritionPlanRecipeIds: (plan: unknown) => plan,
    contextualChatRequestSchema,
    contextualChatResponseSchema,
    buildContextualChatPrompt: () => "contextual prompt",
  };
}

async function buildApp(overrides: Record<string, unknown> = {}) {
  const app = Fastify();
  registerAiRoutes(app, { ...baseDeps(), ...overrides });
  await app.ready();
  return app;
}

async function run() {
  let app: FastifyInstance | null = null;

  app = await buildApp();
  let response = await app.inject({ method: "POST", url: "/ai/training-plan/generate", payload: { goal: "strength", daysPerWeek: 4, experienceLevel: "beginner", constraints: [] } });
  assert.equal(response.statusCode, 200);
  let body = response.json();
  assert.equal(body.planId, "saved-plan");
  assert.ok(body.plan);
  assert.ok(body.summary);
  assert.equal(body.mode, "AI");
  assert.equal(typeof body.aiRequestId, "string");
  assert.equal(body.aiTokenBalance, 900);
  assert.equal(body.balanceAfter, 900);
  assert.deepEqual(body.usage, { promptTokens: 10, completionTokens: 20, totalTokens: 30 });

  response = await app.inject({ method: "POST", url: "/ai/training-plan/generate", payload: { goal: "strength" } });
  assert.equal(response.statusCode, 400);
  body = response.json();
  assert.equal(body.error, "INVALID_INPUT");
  assert.equal(body.kind, "validation");
  await app.close();

  app = await buildApp({ assertSufficientAiTokenBalance: () => { throw httpError(429, "AI_QUOTA_EXCEEDED", { kind: "quota" }); } });
  response = await app.inject({ method: "POST", url: "/ai/training-plan/generate", payload: { goal: "strength", daysPerWeek: 4, experienceLevel: "beginner", constraints: [] } });
  assert.equal(response.statusCode, 429);
  body = response.json();
  assert.equal(body.error, "AI_QUOTA_EXCEEDED");
  assert.equal(body.kind, "internal");
  await app.close();

  app = await buildApp({
    callOpenAi: async () => { throw httpError(502, "AI_REQUEST_FAILED", { kind: "upstream" }); },
    extractExactProviderUsage: () => undefined,
  });
  response = await app.inject({ method: "POST", url: "/ai/training-plan/generate", payload: { goal: "strength", daysPerWeek: 4, experienceLevel: "beginner", constraints: [] } });
  assert.equal(response.statusCode, 200);
  body = response.json();
  assert.equal(body.planId, "saved-plan");
  assert.ok(body.plan);
  assert.equal(body.mode, "FALLBACK");
  assert.equal(body.aiTokenBalance, 800);
  assert.deepEqual(body.usage, { promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  await app.close();

  app = await buildApp();
  response = await app.inject({ method: "POST", url: "/ai/nutrition-plan/generate", payload: { mealsPerDay: 4, daysCount: 3, name: "Ana" } });
  assert.equal(response.statusCode, 200);
  body = response.json();
  assert.equal(body.planId, "nutrition_plan_1");
  assert.ok(body.plan);

  response = await app.inject({ method: "POST", url: "/ai/nutrition-plan/generate", payload: { mealsPerDay: "4" } });
  assert.equal(response.statusCode, 400);
  body = response.json();
  assert.equal(body.error, "INVALID_INPUT");
  assert.equal(body.kind, "validation");
  await app.close();

  app = await buildApp({ buildNutritionTemplate: () => null, enforceAiQuota: async () => { throw httpError(429, "AI_QUOTA_EXCEEDED", { kind: "quota" }); } });
  response = await app.inject({ method: "POST", url: "/ai/nutrition-plan/generate", payload: { mealsPerDay: 3 } });
  assert.equal(response.statusCode, 429);
  body = response.json();
  assert.equal(body.error, "AI_QUOTA_EXCEEDED");
  assert.equal(body.kind, "quota");
  await app.close();

  app = await buildApp({ buildNutritionTemplate: () => null, callOpenAi: async () => { throw httpError(502, "AI_REQUEST_FAILED", { kind: "upstream" }); } });
  response = await app.inject({ method: "POST", url: "/ai/nutrition-plan/generate", payload: { mealsPerDay: 3 } });
  assert.equal(response.statusCode, 502);
  body = response.json();
  assert.equal(body.error, "AI_REQUEST_FAILED");
  assert.equal(body.kind, "upstream");
  await app.close();

  app = await buildApp();
  response = await app.inject({ method: "GET", url: "/ai/quota" });
  assert.equal(response.statusCode, 200);
  body = response.json();
  assert.equal(body.dailyLimit, 20);
  assert.equal(typeof body.remainingToday, "number");
  assert.ok(body.entitlements);
  await app.close();

  app = await buildApp();
  response = await app.inject({ method: "POST", url: "/ai/daily-tip", payload: { name: "Pepe" } });
  assert.equal(response.statusCode, 200);
  body = response.json();
  assert.ok(body.tip);

  response = await app.inject({ method: "POST", url: "/ai/daily-tip", payload: { name: 123 } });
  assert.equal(response.statusCode, 400);
  body = response.json();
  assert.equal(body.error, "INVALID_INPUT");
  assert.equal(body.kind, "validation");
  await app.close();

  app = await buildApp({ buildTipTemplate: () => null, enforceAiQuota: async () => { throw httpError(429, "AI_QUOTA_EXCEEDED", { kind: "quota" }); } });
  response = await app.inject({ method: "POST", url: "/ai/daily-tip", payload: {} });
  assert.equal(response.statusCode, 429);
  body = response.json();
  assert.equal(body.error, "AI_QUOTA_EXCEEDED");
  assert.equal(body.kind, "quota");
  await app.close();

  app = await buildApp({ buildTipTemplate: () => null, callOpenAi: async () => { throw httpError(502, "AI_REQUEST_FAILED", { kind: "upstream" }); } });
  response = await app.inject({ method: "POST", url: "/ai/daily-tip", payload: {} });
  assert.equal(response.statusCode, 502);
  body = response.json();
  assert.equal(body.error, "AI_REQUEST_FAILED");
  assert.equal(body.kind, "upstream");
  await app.close();

  app = await buildApp();
  response = await app.inject({ method: "POST", url: "/ai/chat/contextual", payload: { message: "Can I swap cardio for walking?", surface: "feed" } });
  assert.equal(response.statusCode, 200);
  body = response.json();
  assert.equal(body.aiRequestId, "req_1");
  assert.equal(typeof body.reply?.message, "string");

  response = await app.inject({ method: "POST", url: "/ai/chat/contextual", payload: { surface: "feed" } });
  assert.equal(response.statusCode, 400);
  body = response.json();
  assert.equal(body.error, "INVALID_INPUT");
  assert.equal(body.kind, "validation");
  await app.close();

  console.log("ai per-endpoint contracts passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
