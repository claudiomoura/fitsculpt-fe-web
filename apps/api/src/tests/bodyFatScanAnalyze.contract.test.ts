import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { registerBodyFatScanRoutes } from "../routes/bodyFatScanRoutes.js";

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

const PHOTO_DATA_URL =
  "data:image/jpeg;base64,aGVsbG8gd29ybGQgaGVsbG8gd29ybGQgaGVsbG8gd29ybGQgaGVsbG8gd29ybGQ=";

const requestPayload = {
  frontPhotoDataUrl: PHOTO_DATA_URL,
  sidePhotoDataUrl: PHOTO_DATA_URL,
  locale: "en",
};

type BuildAppOptions = {
  tier?: string;
  assertTokens?: () => void;
  callOpenAi?: () => Promise<{
    payload: Record<string, unknown>;
    model?: string;
    requestId?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  }>;
  onCharge?: () => void;
};

async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify();
  const user = {
    id: "user-body-scan",
    plan: "PRO",
    aiTokenBalance: 1500,
    aiTokenResetAt: new Date(Date.now() + 60_000),
    aiTokenRenewalAt: null,
  };

  const prisma = {
    userProfile: {
      findUnique: async () => ({ tracking: {} }),
      create: async () => ({}),
      update: async () => ({}),
    },
  };
  const callOpenAi = options.callOpenAi ??
    (async () => ({
      payload: {
        estimateBodyFatPercent: 18.4,
        range: { min: 16.8, max: 20.5 },
        confidence: "high",
        qualityScore: 82,
        issues: ["Lighting is acceptable but not ideal."],
        disclaimer: "Guidance only; not a clinical test.",
        summary: "Estimated body fat around 18.4% with moderate uncertainty.",
      },
      model: "gpt-4o-mini",
      requestId: "req_body_scan_123",
      usage: { prompt_tokens: 280, completion_tokens: 110, total_tokens: 390 },
    }));

  registerBodyFatScanRoutes(app, {
    requireUser: async () => user as never,
    getOrCreateProfile: async () => ({
      profile: {
        heightCm: 180,
        age: 31,
        sex: "male",
        weightKg: 80,
        measurements: { waistCm: 83, neckCm: 38 },
      },
      tracking: {},
    }),
    callOpenAi: callOpenAi as never,
    createHttpError: httpError,
    getUserEntitlements: () => ({
      legacy: { tier: options.tier ?? "PRO" },
      role: { adminOverride: false },
    }),
    getEffectiveTokenBalance: () => user.aiTokenBalance,
    assertSufficientAiTokenBalance: () => {
      options.assertTokens?.();
      return user.aiTokenBalance;
    },
    getEstimatedAiFeatureTokens: () => 900,
    enforceAiQuota: async () => {},
    chargeAiUsageForResult: (async (params: { feature: string }) => {
      assert.equal(params.feature, "body-fat-scan-analysis");
      options.onCharge?.();
      return {
        payload: {},
        balance: 1110,
        costCents: 3,
        usage: { promptTokens: 280, completionTokens: 110, totalTokens: 390 },
      };
    }) as never,
    prisma: prisma as never,
    aiPricing: {} as never,
  });

  await app.ready();
  return app;
}

async function run() {
  let app: FastifyInstance | null = null;
  let chargedCalls = 0;

  app = await buildApp({
    onCharge: () => {
      chargedCalls += 1;
    },
  });
  let response = await app.inject({
    method: "POST",
    url: "/tracking/body-fat-scan/analyze",
    payload: requestPayload,
  });
  assert.equal(response.statusCode, 200);
  let body = response.json();
  assert.equal(body.executionStatus, "completed");
  assert.equal(body.status, "ai_success");
  assert.equal(body.analysisMode, "ai_augmented");
  assert.equal(body.estimate.bodyFatPercent, 18.4);
  assert.equal(body.range.min, 16.8);
  assert.equal(body.range.max, 20.5);
  assert.equal(body.confidence, "high");
  assert.ok(Array.isArray(body.limitations));
  assert.equal(body.limitations[0], "Lighting is acceptable but not ideal.");
  assert.equal(body.disclaimer, "Guidance only; not a clinical test.");
  assert.equal(body.persistence.status, "persisted");
  assert.equal(body.persistence.adapter, "tracking_json");
  assert.equal(body.balanceBefore, 1500);
  assert.equal(body.balanceAfter, 1110);
  assert.equal(body.costCents, 3);
  assert.equal(body.usage.totalTokens, 390);
  assert.equal(chargedCalls, 1);
  await app.close();

  app = await buildApp({ tier: "FREE" });
  response = await app.inject({
    method: "POST",
    url: "/tracking/body-fat-scan/analyze",
    payload: requestPayload,
  });
  assert.equal(response.statusCode, 403);
  body = response.json();
  assert.equal(body.executionStatus, "blocked");
  assert.equal(body.status, "blocked");
  assert.equal(body.error, "AI_ACCESS_FORBIDDEN");
  assert.equal(body.reason, "pro_required");
  await app.close();

  app = await buildApp({
    assertTokens: () => {
      throw httpError(429, "AI_TOKENS_INSUFFICIENT");
    },
  });
  response = await app.inject({
    method: "POST",
    url: "/tracking/body-fat-scan/analyze",
    payload: requestPayload,
  });
  assert.equal(response.statusCode, 429);
  body = response.json();
  assert.equal(body.executionStatus, "blocked");
  assert.equal(body.status, "blocked");
  assert.equal(body.error, "AI_TOKENS_INSUFFICIENT");
  assert.equal(body.kind, "quota");
  await app.close();

  chargedCalls = 0;
  app = await buildApp({
    callOpenAi: async () => {
      throw httpError(502, "AI_REQUEST_FAILED", { kind: "upstream" });
    },
    onCharge: () => {
      chargedCalls += 1;
    },
  });
  response = await app.inject({
    method: "POST",
    url: "/tracking/body-fat-scan/analyze",
    payload: requestPayload,
  });
  assert.equal(response.statusCode, 200);
  body = response.json();
  assert.equal(body.executionStatus, "fallback");
  assert.equal(body.status, "deterministic_fallback");
  assert.equal(body.analysisMode, "deterministic_fallback");
  assert.equal(body.fallbackReason, "UPSTREAM_ERROR");
  assert.ok(Array.isArray(body.limitations));
  assert.equal(body.persistence.status, "persisted");
  assert.equal(chargedCalls, 0);
  await app.close();

  console.log("body fat scan analyze contracts passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
