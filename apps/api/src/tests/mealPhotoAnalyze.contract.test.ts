import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { registerMealRoutes } from "../routes/mealRoutes.js";

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

async function buildApp(callOpenAi: (...args: unknown[]) => Promise<unknown>) {
  const app = Fastify();
  const chargeAiUsageForResult = async (params: { result: { payload: unknown } }) => ({ payload: params.result.payload as Record<string, unknown> });
  registerMealRoutes(app, {
    requireUser: async () => ({ id: "user_test" } as never),
    callOpenAi: callOpenAi as never,
    createHttpError: httpError,
    aiNutritionDomainGuard: async (request) => {
      const typed = request as typeof request & {
        currentUser?: unknown;
        currentEntitlements?: unknown;
      };
      typed.currentUser = {
        id: "user_test",
        plan: "NUTRI_AI",
        aiTokenBalance: 900,
        aiTokenResetAt: new Date(Date.now() + 60_000),
        aiTokenRenewalAt: null,
      };
      typed.currentEntitlements = {
        legacy: { tier: "NUTRI_AI" },
        role: { adminOverride: false },
      };
    },
    getEffectiveTokenBalance: () => 900,
    assertSufficientAiTokenBalance: () => 900,
    getEstimatedAiFeatureTokens: () => 700,
    enforceAiQuota: async () => {},
    chargeAiUsageForResult: chargeAiUsageForResult as never,
    prisma: {},
    aiPricing: {},
  });
  await app.ready();
  return app;
}

const payload = {
  photoDataUrl: "data:image/jpeg;base64,aGVsbG8gd29ybGQgaGVsbG8gd29ybGQgaGVsbG8=",
  locale: "es",
};

async function run() {
  let app: FastifyInstance | null = null;

  app = await buildApp(async () => ({
    payload: {
      title: "Arroz con pollo",
      items: [
        { name: "Arroz", calories: 220, protein: 4, carbs: 46, fats: 1 },
        { name: "Pollo", calories: 180, protein: 31, carbs: 0, fats: 6 },
      ],
      totals: { calories: 999, protein: 999, carbs: 999, fats: 999 },
      confidence: 0.84,
      confidenceLabel: "high",
      notes: "Plato principal visible.",
    },
  }));
  let response = await app.inject({ method: "POST", url: "/meals/analyze-photo", payload });
  assert.equal(response.statusCode, 200);
  let body = response.json();
  assert.equal(body.analysisSource, "ai");
  assert.equal(body.degraded, false);
  assert.equal(body.foodName, "Arroz");
  assert.equal(body.kcal, 400);
  assert.equal(body.protein, 35);
  assert.equal(body.carbs, 46);
  assert.equal(body.fat, 7);
  await app.close();

  app = await buildApp(async () => ({
    payload: {
      title: "Pasta",
      items: [{ name: "Pasta", calories: 430, protein: 12, carbs: 70, fats: 10 }],
      totals: { calories: 430, protein: 12, carbs: 70, fats: 10 },
      confidence: 0.31,
      confidenceLabel: "low",
    },
  }));
  response = await app.inject({ method: "POST", url: "/meals/analyze-photo", payload });
  assert.equal(response.statusCode, 200);
  body = response.json();
  assert.equal(body.analysisSource, "fallback");
  assert.equal(body.degraded, true);
  assert.equal(body.items[0].name, "Pasta");
  assert.match(body.notes, /revisa|ajusta/i);
  await app.close();

  app = await buildApp(async () => {
    throw httpError(502, "AI_REQUEST_FAILED", { kind: "upstream" });
  });
  response = await app.inject({ method: "POST", url: "/meals/analyze-photo", payload });
  assert.equal(response.statusCode, 200);
  body = response.json();
  assert.equal(body.analysisSource, "fallback");
  assert.equal(body.degraded, true);
  assert.equal(body.kcal, 0);
  assert.equal(body.items[0].name, "Comida no identificada");
  await app.close();

  app = await buildApp(async () => ({
    payload: { title: "???", confidence: 0.8, confidenceLabel: "high" },
  }));
  response = await app.inject({ method: "POST", url: "/meals/analyze-photo", payload });
  assert.equal(response.statusCode, 200);
  body = response.json();
  assert.equal(body.analysisSource, "fallback");
  assert.equal(body.degraded, true);
  assert.match(body.notes, /formato incompleto|estimacion editable/i);
  await app.close();

  app = Fastify();
  registerMealRoutes(app, {
    requireUser: async () => ({ id: "user_test" } as never),
    callOpenAi: async () => ({ payload: {} }) as never,
    createHttpError: httpError,
    aiNutritionDomainGuard: async (_request, reply) => {
      return reply.status(403).send({ error: "AI_ACCESS_FORBIDDEN", kind: "auth" });
    },
  });
  await app.ready();
  response = await app.inject({ method: "POST", url: "/meals/analyze-photo", payload });
  assert.equal(response.statusCode, 403);
  body = response.json();
  assert.equal(body.error, "AI_ACCESS_FORBIDDEN");
  assert.equal(body.kind, "auth");
  await app.close();

  app = Fastify();
  registerMealRoutes(app, {
    requireUser: async () => ({ id: "user_test" } as never),
    callOpenAi: async () => ({ payload: {} }) as never,
    createHttpError: httpError,
    aiNutritionDomainGuard: async (_request, reply) => {
      return reply.status(429).send({ error: "AI_TOKENS_INSUFFICIENT", kind: "quota" });
    },
  });
  await app.ready();
  response = await app.inject({ method: "POST", url: "/meals/analyze-photo", payload });
  assert.equal(response.statusCode, 429);
  body = response.json();
  assert.equal(body.error, "AI_TOKENS_INSUFFICIENT");
  assert.equal(body.kind, "quota");
  await app.close();

  console.log("meal photo analyze contracts passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
