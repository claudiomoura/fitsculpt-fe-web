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

function buildDeps(overrides: Record<string, unknown> = {}) {
  const aiTrainingSchema = z.object({ goal: z.string(), daysPerWeek: z.number() });
  const aiNutritionSchema = z.object({ mealsPerDay: z.number() });
  const aiGenerateTrainingSchema = z.object({ goal: z.string(), experienceLevel: z.string() });
  const aiTipSchema = z.object({ name: z.string().optional() });

  const user = {
    id: "user_contextual",
    plan: "FREE",
    name: "Paula",
    aiTokenBalance: 100,
    aiTokenResetAt: null,
    aiTokenRenewalAt: null,
  };

  const base = {
    aiAccessGuard: async () => {},
    aiStrengthDomainGuard: async () => {},
    aiNutritionDomainGuard: async () => {},
    requireUser: async () => user,
    getUserEntitlements: () => ({ modules: { ai: { enabled: true } }, legacy: { tier: "FREE" }, role: { adminOverride: false } }),
    toDateKey: () => "2026-01-01",
    env: { AI_DAILY_LIMIT_PRO: 20, AI_DAILY_LIMIT_FREE: 5 },
    prisma: {
      aiUsage: { findUnique: async () => ({ count: 1 }) },
      aiPromptCache: { deleteMany: async () => ({ count: 0 }) },
      recipe: { findMany: async () => [] },
      userProfile: { findUnique: async () => ({ profile: { goal: "lose weight", activity: "moderate" } }) },
      trainingPlan: { findFirst: async () => ({ title: "Fuerza 3x", goal: "strength", daysPerWeek: 3 }) },
      nutritionPlan: { findFirst: async () => ({ title: "Plan base", dailyCalories: 2100 }) },
      $transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    },
    getAiTokenPayload: () => ({ aiTokenBalance: 100, aiTokenRenewalAt: null }),
    getSecondsUntilNextUtcDay: () => 100,
    logAuthCookieDebug: () => {},
    requireCompleteProfile: async () => {},
    aiTrainingSchema,
    loadExerciseCatalogForAi: async () => [],
    parseDateInput: () => new Date(),
    buildCacheKey: () => "cache-key",
    buildTrainingTemplate: () => ({ days: [] }),
    getEffectiveTokenBalance: () => 100,
    assertSufficientAiTokenBalance: () => {},
    getEstimatedAiFeatureTokens: () => 10,
    normalizeTrainingPlanDays: (plan: unknown) => plan,
    applyPersonalization: (value: unknown) => value,
    assertTrainingMatchesRequest: () => {},
    resolveTrainingPlanExerciseIds: (plan: unknown) => plan,
    saveTrainingPlan: async () => ({ id: "training_plan_1" }),
    storeAiContent: async () => {},
    getCachedAiPayload: async () => null,
    parseTrainingPlanPayload: () => ({ days: [] }),
    saveCachedAiPayload: async () => {},
    enforceAiQuota: async () => {},
    buildTrainingPrompt: () => "prompt",
    formatExerciseCatalogForPrompt: () => "catalog",
    extractTopLevelJson: (value: unknown) => value,
    chargeAiUsage: async () => ({}),
    aiPricing: {},
    callOpenAi: async () => ({
      payload: { reply: { message: "Puedes cambiar cardio por caminata suave." } },
      requestId: "req_contextual_1",
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      model: "gpt-4o-mini",
    }),
    getUserTokenExpiryAt: () => null,
    extractExactProviderUsage: () => ({ promptTokens: 10, completionTokens: 20, totalTokens: 30 }),
    aiNutritionSchema,
    getSafeValidationIssues: () => [],
    normalizeNutritionPlanDays: (plan: unknown) => plan,
    logNutritionMealsPerDay: () => {},
    normalizeNutritionMealsPerDay: (plan: unknown) => plan,
    applyNutritionCatalogResolution: (plan: unknown) => plan,
    assertNutritionMatchesRequest: () => {},
    saveNutritionPlan: async () => ({ id: "nutrition_plan_1" }),
    parseNutritionPlanPayload: () => ({ days: [] }),
    applyRecipeScalingToPlan: (plan: unknown) => plan,
    buildNutritionTemplate: () => ({ days: [] }),
    buildNutritionPrompt: () => "prompt",
    chargeAiUsageForResult: async () => ({ balance: 90, totalTokens: 30, costCents: 1, model: "gpt-4o-mini", usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 } }),
    createHttpError: httpError,
    aiGenerateTrainingSchema,
    buildDeterministicTrainingFallbackPlan: () => ({ days: [] }),
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
    classifyAiGenerateError: () => ({ statusCode: 500, error: "INTERNAL_ERROR", errorKind: "upstream_error" }),
    findInvalidTrainingPlanExerciseIds: () => [],
    resolveTrainingPlanExerciseIdsWithCatalog: (plan: unknown) => plan,
    summarizeTrainingPlan: () => ({ days: 1 }),
    persistAiUsageLog: async () => {},
    buildUsageTotals: () => ({ promptTokens: 0, completionTokens: 0, totalTokens: 0 }),
    aiTipSchema,
    buildTipTemplate: () => ({ title: "tip" }),
    safeStoreAiContent: async () => {},
    buildTipPrompt: () => "prompt",
    resolveNutritionPlanRecipeReferences: (plan: unknown) => plan,
    normalizeNutritionPlanDaysWithLabels: (plan: unknown) => plan,
    applyNutritionPlanVarietyGuard: (plan: unknown) => plan,
    resolveNutritionPlanRecipeIds: (plan: unknown) => plan,
    contextualChatRequestSchema,
    contextualChatResponseSchema,
    buildContextualChatPrompt: () => "contextual prompt",
  };

  return { ...base, ...overrides };
}

async function buildApp(overrides: Record<string, unknown> = {}) {
  const app = Fastify();
  registerAiRoutes(app, buildDeps(overrides));
  await app.ready();
  return app;
}

async function run() {
  let app: FastifyInstance | null = null;

  let chargeCalls = 0;
  let capturedInput: Record<string, unknown> | null = null;
  app = await buildApp({
    buildContextualChatPrompt: (input: Record<string, unknown>) => {
      capturedInput = input;
      return "contextual prompt";
    },
    callOpenAi: async () => {
      return {
        payload: { reply: { message: "Puedes cambiar cardio por caminata suave." } },
        requestId: "req_contextual_1",
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        model: "gpt-4o-mini",
      };
    },
    chargeAiUsageForResult: async () => {
      chargeCalls += 1;
      return {
        balance: 90,
        totalTokens: 30,
        costCents: 1,
        model: "gpt-4o-mini",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      };
    },
  });
  let response = await app.inject({
    method: "POST",
    url: "/ai/chat/contextual",
    payload: { message: "Que hago hoy?", surface: "coach" },
  });
  assert.equal(response.statusCode, 200);
  let body = response.json();
  assert.equal(typeof body.reply?.message, "string");
  assert.equal(typeof body.aiTokenBalance, "number");
  assert.deepEqual(body.usage, { promptTokens: 10, completionTokens: 20, totalTokens: 30 });
  assert.equal(body.costCents, 1);
  assert.equal(body.costEur, 0.01);
  assert.equal(body.balanceBefore, 100);
  assert.equal(body.balanceAfter, 90);
  assert.equal(chargeCalls, 1);
  assert.equal(capturedInput?.surface, "coach");
  await app.close();

  app = await buildApp({ requireUser: async () => { throw httpError(401, "UNAUTHORIZED"); } });
  response = await app.inject({
    method: "POST",
    url: "/ai/chat/contextual",
    payload: { message: "Hola" },
  });
  assert.equal(response.statusCode, 401);
  body = response.json();
  assert.equal(body.error, "UNAUTHORIZED");
  assert.equal(body.kind, "auth");
  await app.close();

  app = await buildApp();
  response = await app.inject({ method: "POST", url: "/ai/chat/contextual", payload: { surface: "feed" } });
  assert.equal(response.statusCode, 400);
  body = response.json();
  assert.equal(body.error, "INVALID_INPUT");
  assert.equal(body.kind, "validation");
  await app.close();

  app = await buildApp();
  response = await app.inject({
    method: "POST",
    url: "/ai/chat/contextual",
    payload: { message: "x".repeat(1201), surface: "feed" },
  });
  assert.equal(response.statusCode, 400);
  body = response.json();
  assert.equal(body.error, "INVALID_INPUT");
  assert.equal(body.kind, "validation");
  await app.close();

  app = await buildApp({
    assertSufficientAiTokenBalance: () => {
      throw httpError(429, "AI_TOKENS_EXHAUSTED", { kind: "quota" });
    },
  });
  response = await app.inject({
    method: "POST",
    url: "/ai/chat/contextual",
    payload: { message: "Hola" },
  });
  assert.equal(response.statusCode, 429);
  body = response.json();
  assert.equal(body.error, "AI_TOKENS_EXHAUSTED");
  assert.equal(body.kind, "quota");
  await app.close();

  let fallbackInput: Record<string, unknown> | null = null;
  let fallbackContext: Record<string, unknown> | null = null;
  app = await buildApp({
    buildContextualChatPrompt: (
      input: Record<string, unknown>,
      context: Record<string, unknown>,
    ) => {
      fallbackInput = input;
      fallbackContext = context;
      return "contextual prompt";
    },
    requireUser: async () => ({
      id: "user_contextual",
      plan: null,
      name: null,
      aiTokenBalance: 100,
      aiTokenResetAt: null,
      aiTokenRenewalAt: null,
    }),
    prisma: {
      aiUsage: { findUnique: async () => ({ count: 1 }) },
      aiPromptCache: { deleteMany: async () => ({ count: 0 }) },
      recipe: { findMany: async () => [] },
      userProfile: { findUnique: async () => ({ profile: null }) },
      trainingPlan: { findFirst: async () => null },
      nutritionPlan: { findFirst: async () => null },
      $transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    },
    callOpenAi: async () => {
      return {
        payload: { reply: { message: "Respuesta" } },
        requestId: "req_contextual_fallback",
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        model: "gpt-4o-mini",
      };
    },
  });
  response = await app.inject({
    method: "POST",
    url: "/ai/chat/contextual",
    payload: { message: "Necesito ayuda" },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(fallbackInput?.surface, undefined);
  assert.equal(fallbackContext?.activeTrainingPlan, null);
  assert.equal(fallbackContext?.activeNutritionPlan, null);
  await app.close();

  console.log("ai contextual chat contracts passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
