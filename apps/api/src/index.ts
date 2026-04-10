import "dotenv/config";
// Override with .env.local for local development (higher priority)
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: process.env.NODE_ENV !== "test" });
import crypto from "node:crypto";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  Prisma,
  PrismaClient,
  GymMembershipStatus,
  GymRole,
  type SubscriptionPlan,
  type User,
} from "@prisma/client";
import { getEnv } from "./config.js";
import { sendEmail } from "./email.js";
import { hashToken, isPromoCodeValid } from "./authUtils.js";
import {
  AiParseError,
  parseJsonFromText,
  parseLargestJsonFromText,
  parseTopLevelJsonFromText,
} from "./aiParsing.js";
import {
  buildUsageTotals,
  chargeAiUsage,
  chargeAiUsageForResult,
  extractExactProviderUsage,
  persistAiUsageLog,
} from "./ai/chargeAiUsage.js";
import {
  createOpenAiClient,
  type OpenAiResponse,
} from "./ai/provider/openaiClient.js";
import { classifyAiGenerateError } from "./ai/errorClassification.js";
import { type EffectiveEntitlements } from "./entitlements.js";
import { buildAuthMeResponse } from "./auth/schemas.js";
import { loadAiPricing } from "./ai/pricing.js";
import {
  NUTRITION_MATH_TOLERANCES,
  validateNutritionMath,
} from "./ai/nutritionMathValidation.js";
import { getSafeValidationIssues } from "./ai/validationIssues.js";
import {
  buildMealKcalGuidance,
  buildRetryFeedbackFromContext,
  buildTwoMealSplitRetryInstruction,
} from "./ai/nutritionRetry.js";
import {
  findInvalidTrainingPlanExerciseIds,
  type ExerciseCatalogItem,
  resolveTrainingPlanExerciseIds as resolveTrainingPlanExerciseIdsWithCatalog,
} from "./ai/trainingPlanExerciseResolution.js";
import { buildDeterministicTrainingFallbackPlan } from "./ai/training-plan/fallbackBuilder.js";
import { mapExperienceLevelToTrainingPlanLevel } from "./ai/training-plan/experienceLevelMapping.js";
import {
  applyNutritionPlanVarietyGuard,
  resolveNutritionPlanRecipeIds,
  type NutritionRecipeCatalogItem,
} from "./ai/nutrition-plan/recipeCatalogResolution.js";
import {
  normalizeExercisePayload,
  type ExerciseApiDto,
  type ExerciseRow,
} from "./exercises/normalizeExercisePayload.js";
import { fetchExerciseCatalog } from "./exercises/fetchExerciseCatalog.js";
import { normalizeExerciseName } from "./utils/normalizeExerciseName.js";
import { nutritionPlanJsonSchema } from "./lib/ai/schemas/nutritionPlanJsonSchema.js";
import { resolveNutritionPlanRecipeReferences } from "./ai/nutrition-plan/recipeCatalog.js";
import { trainingPlanJsonSchema } from "./lib/ai/schemas/trainingPlanJsonSchema.js";
import {
  createPrismaClientWithRetry,
  resolveDatabaseUrl,
} from "./prismaClient.js";
import { runDatabasePreflight } from "./dbPreflight.js";
import { isStripePriceNotFoundError } from "./billing/stripeErrors.js";
import { getStripeSubscriptionPeriodEnd } from "./billing/stripeSubscriptionPeriods.js";
import {
  shouldGrantTokensForBillingCycle,
  tokenGrantForPlan,
} from "./billing/tokenPolicy.js";
import { resolveAiTokens, resolveBillingStatusReason } from "./billing/resolveAiTokens.js";
import { resetDemoState } from "./dev/demoSeed.js";
import { registerWeeklyReviewRoute } from "./routes/weeklyReview.js";
import { registerPassiveHealthRoutes } from "./routes/passiveHealth.js";
import { registerFutureProjectionRoutes } from "./routes/futureProjection.js";
import { registerRctSummaryRoute } from "./routes/rctSummary.js";
import { registerRctStatisticalReportRoute } from "./routes/rctStatisticalReport.js";
import { registerAdminAssignGymRoleRoutes } from "./routes/admin/assignGymRole.js";
import { registerMealRoutes } from "./routes/mealRoutes.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { authRateLimitMiddleware } from "./middleware/authRateLimit.js";
import { registerProfileRoutes } from "./routes/profile.js";
import { registerFeedRoutes } from "./routes/feed.js";
import { registerTrackingRoutes } from "./routes/tracking.js";
import { registerNutritionRoutes } from "./routes/nutrition.js";
import { registerGymRoutes } from "./routes/gym.js";
import { registerTrainerRoutes } from "./routes/trainer.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAiRoutes } from "./domains/ai/registerAiRoutes.js";
import { registerBillingRoutes } from "./domains/billing/registerBillingRoutes.js";
import { registerWorkoutRoutes } from "./domains/training/registerWorkoutRoutes.js";
import { registerTrainingRoutes } from "./domains/training/registerTrainingRoutes.js";
import {
  buildEntitlementGuard,
  resolveUserEntitlements,
  type AuthenticatedEntitlementsRequest,
} from "./middleware/entitlements.js";
import {
  normalizeNutritionPlanDays as normalizeNutritionPlanDaysWithLabels,
  toIsoDateString,
} from "./ai/nutrition-plan/normalizeNutritionPlanDays.js";
import { buildContextualChatPrompt } from "./ai/chat/buildContextualChatPrompt.js";
import {
  contextualChatRequestSchema,
  contextualChatResponseSchema,
} from "./ai/chat/contextualChatSchemas.js";
import { rateLimitMiddleware, logAiCall, logAiError, getRecentAiErrors } from "./ai/monitoring/rateLimiter.js";
import { getAiQueue } from "./ai/queue/aiQueue.js";
// NEW: AI Prompts (segregated constants for easy editing)
import * as trainingPrompts from "./ai/prompts/training-prompts.js";
import * as nutritionPrompts from "./ai/prompts/nutrition-prompts.js";
// NEW: AI Templates (deterministic/fallback plans)
import * as aiTemplates from "./ai/templates/ai-templates.js";

// NEW: Lib utilities (refactored from inline)
import { handleRequestError, mapTrainingPlanCreateError } from "./lib/http-utils.js";
import * as stripeUtils from "./lib/stripe-utils.js";
import type { 
  StripePrice, 
  StripeProduct, 
  StripeSubscription,
  StripeSubscriptionList,
  StripeInterval,
  StripeInvoice,
  StripeCustomer,
  StripePortalSession,
  StripeCheckoutSession,
} from "./lib/stripe-utils.js";
import * as authUtils from "./lib/auth-utils.js";
import * as dateUtils from "./lib/date-utils.js";

const env = getEnv();
const app = Fastify({ logger: true });
const prisma = await createPrismaClientWithRetry(app.log);

// Register auth routes that are missing from this file:
// resend-verification, verify-email, forgot-password, reset-password
registerAuthRoutes(app, { prisma, app, appBaseUrl: env.APP_BASE_URL });

const shouldRunDbPreflight =
  process.env.NODE_ENV !== "production" ||
  process.env.DB_PREFLIGHT_ON_BOOT === "true";
if (shouldRunDbPreflight) {
  const { source, host, database } = resolveDatabaseUrl();
  await runDatabasePreflight(prisma, app.log, { source, host, database });
}

const aiPricing = loadAiPricing(env);

const aiQueue = getAiQueue(app.log);

app.addHook("preHandler", async (request, reply) => {
  if (request.url.startsWith("/ai/")) {
    await rateLimitMiddleware(request, reply);
  }
});

app.get("/ai/errors", { preHandler: [requireAdmin] }, async (request, reply) => {
  const errors = getRecentAiErrors();
  return reply.send({ errors });
});

await app.register(cookie, {
  secret: env.COOKIE_SECRET,
});

await app.register(jwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: "fs_token",
    signed: false,
  },
});

// Register CORS with support for multiple origins (comma-separated in CORS_ORIGIN env var)
await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

app.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  (request, body, done) => {
    if (request.url?.startsWith("/billing/stripe/webhook")) {
      done(null, body);
      return;
    }
    if (body.length === 0) {
      done(null, null);
      return;
    }
    try {
      const parsed = JSON.parse(body.toString("utf8"));
      done(null, parsed);
    } catch (error) {
      done(error as Error, undefined);
    }
  },
);

const VERIFICATION_TTL_MS = env.VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = env.VERIFICATION_RESEND_COOLDOWN_MINUTES * 60 * 1000;

app.get("/health", async () => ({ status: "ok" }));

function resolveCorrelationId(request: FastifyRequest) {
  const headerValue = request.headers["x-correlation-id"];
  if (Array.isArray(headerValue)) {
    return headerValue[0] ?? request.id;
  }
  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim();
  }
  return request.id;
}

function getPayloadSize(value: unknown) {
  if (value == null) return 0;
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return 0;
  }
}

app.addHook("onRequest", async (request, reply) => {
  const correlationId = resolveCorrelationId(request);
  (request as FastifyRequest & { startTimeMs?: number }).startTimeMs = Date.now();
  reply.header("x-correlation-id", correlationId);
});

app.addHook("onResponse", async (request, reply) => {
  const typedRequest = request as FastifyRequest & { startTimeMs?: number };
  const durationMs = typedRequest.startTimeMs ? Date.now() - typedRequest.startTimeMs : undefined;
  app.log.info(
    {
      route: request.routeOptions?.url ?? request.url,
      method: request.method,
      status: reply.statusCode,
      durationMs,
      correlationId: resolveCorrelationId(request),
    },
    "request completed",
  );
});

function createHttpError(
  statusCode: number,
  code: string,
  debug?: Record<string, unknown>,
) {
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

// Removed: handleRequestError - now in lib/http-utils.ts

async function loadExerciseCatalogForAi() {
  try {
    const exerciseCatalog = await fetchExerciseCatalog(prisma);
    if (exerciseCatalog.length === 0) {
      throw createHttpError(422, "EXERCISE_CATALOG_EMPTY", {
        cause: "CATALOG_EMPTY",
        hint: "Run /dev/seed-exercises",
      });
    }
    return exerciseCatalog;
  } catch (error) {
    const typed = error as { code?: string; statusCode?: number };
    if (typed.code === "EXERCISE_CATALOG_EMPTY" && typed.statusCode === 422) {
      throw error;
    }
    throw createHttpError(503, "EXERCISE_CATALOG_UNAVAILABLE", {
      cause: "CATALOG_INACCESSIBLE",
      hint: "Check Exercise catalog availability in DB",
    });
  }
}

function requireStripeSecret() {
  if (!env.STRIPE_SECRET_KEY) {
    throw createHttpError(500, "STRIPE_NOT_CONFIGURED");
  }
  return env.STRIPE_SECRET_KEY;
}

function getStripePricePlanMap(): Map<string, SubscriptionPlan> {
  const prices = [
    { priceId: env.STRIPE_PRO_PRICE_ID, plan: "PRO" as const },
    {
      priceId: env.STRIPE_PRICE_STRENGTH_AI_MONTHLY,
      plan: "STRENGTH_AI" as const,
    },
    { priceId: env.STRIPE_PRICE_NUTRI_AI_MONTHLY, plan: "NUTRI_AI" as const },
  ];
  const missing = prices
    .filter((entry) => !entry.priceId)
    .map((entry) => entry.plan);
  if (missing.length > 0) {
    throw createHttpError(500, "STRIPE_PRICE_NOT_CONFIGURED", {
      missingPlans: missing,
    });
  }
  return new Map(prices.map((entry) => [entry.priceId!, entry.plan]));
}

function resolvePlanByPriceId(priceId: string): SubscriptionPlan | null {
  return getStripePricePlanMap().get(priceId) ?? null;
}

function resolvePriceIdByPlanKey(planKey: string): string | null {
  const normalizedPlanKey = planKey.trim().toUpperCase();
  const normalizedToPlan = new Map<string, SubscriptionPlan>([
    ["PRO", "PRO"],
    ["STRENGTH", "STRENGTH_AI"],
    ["STRENGTH_AI", "STRENGTH_AI"],
    ["NUTRI", "NUTRI_AI"],
    ["NUTRI_AI", "NUTRI_AI"],
  ]);
  const plan = normalizedToPlan.get(normalizedPlanKey);
  if (!plan) return null;
  const planEntry = getAvailableBillingPlans().find(
    (entry) => entry.plan === plan,
  );
  return planEntry?.priceId ?? null;
}

function getAvailableBillingPlans() {
  const plans = [
    { plan: "PRO" as const, priceId: env.STRIPE_PRO_PRICE_ID },
    {
      plan: "STRENGTH_AI" as const,
      priceId: env.STRIPE_PRICE_STRENGTH_AI_MONTHLY,
    },
    { plan: "NUTRI_AI" as const, priceId: env.STRIPE_PRICE_NUTRI_AI_MONTHLY },
  ];

  return plans.filter(
    (entry): entry is (typeof plans)[number] & { priceId: string } =>
      typeof entry.priceId === "string",
  );
}

function parseStripeAmount(price: StripePrice): number | null {
  if (typeof price.unit_amount !== "number") return null;
  return price.unit_amount / 100;
}

async function resolveStripePlanTitle(
  price: StripePrice,
  fallbackPlan: SubscriptionPlan,
): Promise<string> {
  if (
    price.product &&
    typeof price.product === "object" &&
    typeof price.product.name === "string" &&
    price.product.name.trim()
  ) {
    return price.product.name;
  }

  if (typeof price.product === "string") {
    try {
      const stripeProduct = await stripeRequest<StripeProduct>(
        `products/${price.product}`,
        {},
        { method: "GET" },
      );
      if (typeof stripeProduct.name === "string" && stripeProduct.name.trim()) {
        return stripeProduct.name;
      }
    } catch {
      return fallbackPlan;
    }
  }

  return fallbackPlan;
}

function normalizeStripeInterval(price: StripePrice): StripeInterval {
  const interval = price.recurring?.interval;
  if (
    interval === "day" ||
    interval === "week" ||
    interval === "month" ||
    interval === "year"
  ) {
    return interval;
  }
  return "unknown";
}

function isStripeCredentialError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const anyError = error as Error & {
    code?: string;
    debug?: { status?: number };
  };
  return (
    anyError.code === "STRIPE_REQUEST_FAILED" &&
    (anyError.debug?.status === 401 || anyError.debug?.status === 403)
  );
}

function requireStripeWebhookSecret() {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw createHttpError(500, "STRIPE_WEBHOOK_NOT_CONFIGURED");
  }
  return env.STRIPE_WEBHOOK_SECRET;
}

async function stripeRequest<T>(
  path: string,
  params: Record<string, string | number | null | undefined>,
  options?: { method?: "POST" | "GET"; idempotencyKey?: string },
): Promise<T> {
  const secret = requireStripeSecret();
  const method = options?.method ?? "POST";
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
  const url = `https://api.stripe.com/v1/${path}`;
  const queryString = query.toString();
  const response = await fetch(
    method === "GET" && queryString ? `${url}?${queryString}` : url,
    {
      method,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(options?.idempotencyKey
          ? { "Idempotency-Key": options.idempotencyKey }
          : {}),
      },
      body: method === "GET" ? undefined : queryString,
    },
  );
  if (!response.ok) {
    const errorBody = await response.text();
    throw createHttpError(502, "STRIPE_REQUEST_FAILED", {
      status: response.status,
      body: errorBody,
    });
  }
  return (await response.json()) as T;
}

function verifyStripeSignature(
  rawBody: Buffer,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSec = 300,
) {
  const parts = signatureHeader.split(",").map((p) => p.trim());

  const tPart = parts.find((p) => p.startsWith("t="));
  const tValue = tPart?.slice(2);
  if (!tValue)
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE", {
      reason: "missing_t",
    });

  const timestamp = Number(tValue);
  if (!Number.isFinite(timestamp)) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE", {
      reason: "invalid_t",
    });
  }

  // Stripe puede mandar VARIOS v1=...
  const v1Signatures = parts
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3))
    .filter(Boolean);

  if (v1Signatures.length === 0) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE", {
      reason: "missing_v1",
    });
  }

  // (Opcional pero recomendado) tolerancia de tiempo
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > toleranceSec) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE", {
      reason: "timestamp_out_of_tolerance",
      nowSec,
      timestamp,
      toleranceSec,
    });
  }

  const signedPayload = `${tValue}.${rawBody.toString("utf8")}`;
  const expectedHex = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");

  const matchesAny = v1Signatures.some((sig) => {
    // si viene algo raro, evita crash
    if (!/^[0-9a-f]+$/i.test(sig)) return false;
    const sigBuf = Buffer.from(sig, "hex");
    return (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf)
    );
  });

  if (!matchesAny) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE");
  }
}

function getPlanTokenAllowance(plan: SubscriptionPlan): number {
  return tokenGrantForPlan(plan);
}

const AI_FEATURE_ESTIMATED_TOKENS: Record<string, number> = {
  training: 800,
  nutrition: 800,
  "meal-photo-analysis": 700,
  "training-generate": 1200,
  "nutrition-generate": 1200,
  tip: 300,
};

function getEstimatedAiFeatureTokens(feature: string): number {
  return AI_FEATURE_ESTIMATED_TOKENS[feature] ?? 1;
}

function getTokenExpiry(days = 30) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next;
}

function getUserTokenExpiryAt(user: {
  aiTokenResetAt?: Date | null;
  aiTokenRenewalAt?: Date | null;
}) {
  return user.aiTokenResetAt ?? user.aiTokenRenewalAt ?? null;
}

function getUserTokenBalance(user: { aiTokenBalance?: number | null }) {
  return typeof user.aiTokenBalance === "number" ? user.aiTokenBalance : 0;
}

async function applyBillingStateForCustomer(
  stripeCustomerId: string,
  data: {
    plan?: SubscriptionPlan;
    aiTokenBalance?: number;
    aiTokenResetAt?: Date | null;
    aiTokenRenewalAt?: Date | null;
    aiTokenMonthlyAllowance?: number;
    subscriptionStatus?: string | null;
    stripeSubscriptionId?: string | null;
    currentPeriodEnd?: Date | null;
  },
) {
  const result = await prisma.$transaction(async (tx) =>
    tx.user.updateMany({
      where: { stripeCustomerId },
      data: {
        plan: data.plan,
        subscriptionStatus:
          data.subscriptionStatus === undefined
            ? undefined
            : data.subscriptionStatus,
        stripeSubscriptionId:
          data.stripeSubscriptionId === undefined
            ? undefined
            : data.stripeSubscriptionId,
        currentPeriodEnd:
          data.currentPeriodEnd === undefined
            ? undefined
            : data.currentPeriodEnd,
        aiTokenBalance:
          data.aiTokenBalance === undefined ? undefined : data.aiTokenBalance,
        aiTokenMonthlyAllowance:
          data.aiTokenMonthlyAllowance === undefined
            ? undefined
            : data.aiTokenMonthlyAllowance,
        aiTokenResetAt:
          data.aiTokenResetAt === undefined ? undefined : data.aiTokenResetAt,
        aiTokenRenewalAt:
          data.aiTokenRenewalAt === undefined
            ? undefined
            : data.aiTokenRenewalAt,
      },
    }),
  );
  if (result.count === 0) {
    app.log.warn({ stripeCustomerId }, "user not found for billing update");
  }
}

function isActiveSubscriptionStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

function getPlanFromSubscription(
  subscription?: StripeSubscription | null,
): SubscriptionPlan | null {
  if (!subscription) return null;
  const items = subscription.items?.data ?? [];
  for (const item of items) {
    const priceId = item.price?.id;
    if (!priceId) continue;
    const plan = resolvePlanByPriceId(priceId);
    if (plan) return plan;
  }
  return null;
}

async function getLatestActiveSubscription(customerId: string) {
  const activeSubscriptions = await getActivePlanSubscriptions(customerId);
  if (activeSubscriptions.length === 0) {
    return null;
  }
  const activeProSubscriptions = activeSubscriptions.filter(
    (subscription) => getPlanFromSubscription(subscription) === "PRO",
  );
  const prioritizedSubscriptions =
    activeProSubscriptions.length > 0
      ? activeProSubscriptions
      : activeSubscriptions;
  return (
    prioritizedSubscriptions.sort(
      (a, b) =>
        (getStripeSubscriptionPeriodEnd(b)?.getTime() ?? 0) -
        (getStripeSubscriptionPeriodEnd(a)?.getTime() ?? 0),
    )[0] ?? null
  );
}

async function getActivePlanSubscriptions(customerId: string) {
  const subscriptions = await stripeRequest<StripeSubscriptionList>(
    "subscriptions",
    {
      customer: customerId,
      status: "all",
      limit: 100,
      "expand[0]": "data.items.data.price",
    },
    { method: "GET" },
  );

  return subscriptions.data.filter((subscription) => {
    if (!isActiveSubscriptionStatus(subscription.status)) return false;
    return getPlanFromSubscription(subscription) !== null;
  });
}

async function getOrCreateCustomerId(user: User) {
  let customerId = user.stripeCustomerId ?? null;

  if (customerId) {
    // Verify the customer still exists in Stripe
    try {
      await stripeRequest<{ id: string }>(
        `customers/${customerId}`,
        {},
        { method: "GET" },
      );
      return customerId;
    } catch {
      app.log.warn(
        { userId: user.id, stripeCustomerId: customerId },
        "stripe customer not found in getOrCreateCustomerId, recreating",
      );
      customerId = null;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: null },
      });
    }
  }

  const customer = await stripeRequest<{ id: string }>("customers", {
    email: user.email,
    name: user.name ?? undefined,
    "metadata[userId]": user.id,
  });
  customerId = customer.id;
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customerId },
  });

  return customerId;
}

function getSubscriptionPeriodEnd(subscription?: StripeSubscription | null) {
  return getStripeSubscriptionPeriodEnd(subscription);
}

function getPlanFromInvoice(
  invoice?: StripeInvoice | null,
): SubscriptionPlan | null {
  if (!invoice) return null;
  const lines = invoice.lines?.data ?? [];
  for (const line of lines) {
    const priceId = line.price?.id;
    if (!priceId) continue;
    const plan = resolvePlanByPriceId(priceId);
    if (plan) return plan;
  }
  return null;
}

async function getOrCreateStripeCustomer(user: User) {
  if (user.stripeCustomerId) {
    // Verify the customer still exists in Stripe before reusing
    try {
      await stripeRequest<StripeCustomer>(
        `customers/${user.stripeCustomerId}`,
        {},
        { method: "GET" },
      );
      return user.stripeCustomerId;
    } catch {
      app.log.warn(
        { userId: user.id, stripeCustomerId: user.stripeCustomerId },
        "stripe customer not found, will recreate",
      );
      // Customer doesn't exist in Stripe — clear the stale ID and create a new one
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: null },
      });
    }
  }

  const customer = await stripeRequest<StripeCustomer>("customers", {
    email: user.email,
    name: user.name ?? undefined,
    "metadata[app_user_id]": user.id,
    "metadata[env]": process.env.NODE_ENV ?? "development",
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

async function getExistingStripeCustomerId(userId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  return existing?.stripeCustomerId ?? null;
}

// In-memory cache for billing state to avoid hitting Stripe on every /auth/me call.
// TTL: 5 minutes per user. Billing state rarely changes within this window.
type BillingCacheEntry = {
  user: User;
  expiresAt: number;
};
const billingStateCache = new Map<string, BillingCacheEntry>();
const BILLING_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function syncUserBillingFromStripeWithCache(
  user: User,
  options?: {
    createCustomerIfMissing?: boolean;
  },
) {
  const shouldBypassCache = options?.createCustomerIfMissing === true;
  if (!shouldBypassCache) {
    const cached = billingStateCache.get(user.id);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.user;
    }
  }

  const syncedUser = await syncUserBillingFromStripe(user, options);
  if (syncedUser) {
    billingStateCache.set(user.id, {
      user: syncedUser,
      expiresAt: Date.now() + BILLING_CACHE_TTL_MS,
    });
  }
  return syncedUser;
}

async function syncUserBillingFromStripe(
  user: User,
  options?: {
    createCustomerIfMissing?: boolean;
  },
) {
  const shouldCreateCustomer = options?.createCustomerIfMissing ?? true;
  const stripeCustomerId = shouldCreateCustomer
    ? await getOrCreateStripeCustomer(user)
    : (user.stripeCustomerId ?? (await getExistingStripeCustomerId(user.id)));

  if (!stripeCustomerId) {
    return await prisma.user.findUnique({ where: { id: user.id } });
  }

  const activeSubscription =
    await getLatestActiveSubscription(stripeCustomerId);
  if (!activeSubscription) {
    return await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: "FREE",
        subscriptionStatus: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        aiTokenBalance: 0,
        aiTokenResetAt: null,
        aiTokenRenewalAt: null,
      },
    });
  }

  const currentPeriodEnd = getSubscriptionPeriodEnd(activeSubscription);
  const plan = getPlanFromSubscription(activeSubscription) ?? "FREE";
  const planAllowance = getPlanTokenAllowance(plan);
  const shouldGrantTokens = shouldGrantTokensForBillingCycle({
    plan,
    currentPeriodEnd,
    aiTokenRenewalAt: user.aiTokenRenewalAt,
  });

  return await prisma.user.update({
    where: { id: user.id },
    data: {
      plan,
      subscriptionStatus: activeSubscription.status,
      stripeSubscriptionId: activeSubscription.id,
      currentPeriodEnd: currentPeriodEnd ?? null,
      aiTokenMonthlyAllowance: planAllowance,
      ...(shouldGrantTokens
        ? {
            aiTokenBalance: planAllowance,
            aiTokenResetAt: currentPeriodEnd ?? null,
            aiTokenRenewalAt: currentPeriodEnd ?? null,
          }
        : {}),
    },
  });
}

function logAuthCookieDebug(request: FastifyRequest, route: string) {
  if (process.env.NODE_ENV === "production") return;
  const cookieHeader = request.headers.cookie;
  const hasCookie = typeof cookieHeader === "string" && cookieHeader.length > 0;
  const hasToken = hasCookie && cookieHeader.includes("fs_token=");
  const hasSignature = hasCookie && cookieHeader.includes("fs_token.sig=");
  app.log.info(
    { route, hasCookie, hasToken, hasSignature },
    "auth cookie debug",
  );
}

function getRequestIp(request: FastifyRequest) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim();
  return request.ip;
}

function buildCookieOptions() {
  const secure = env.APP_BASE_URL.startsWith("https://");
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  };
}

function parseBearerToken(header?: string) {
  if (!header) return null;
  const [scheme, ...rest] = header.trim().split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer") return null;
  const token = rest.join(" ").trim();
  return token.length > 0 ? token : null;
}

function normalizeToken(rawToken: string) {
  let token = rawToken.trim();
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  if (token.startsWith("fs_token=")) {
    token = token.slice("fs_token=".length).trim();
  }
  const hadPercent = token.includes("%");
  if (hadPercent) {
    try {
      token = decodeURIComponent(token);
    } catch {
      return { token, hadPercent, decodeFailed: true };
    }
  }
  const parts = token.split(".");
  if (parts.length > 3) {
    token = parts.slice(0, 3).join(".");
  }
  const segments = token.split(".").length;
  return { token, hadPercent, decodeFailed: false, segments };
}

function parseCookieHeader(cookieHeader?: string) {
  if (!cookieHeader) return new Map<string, string>();
  const entries = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf("=");
      if (index === -1) return null;
      const name = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (!name) return null;
      return [name, value] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));
  return new Map(entries);
}

function getJwtTokenFromRequest(request: FastifyRequest) {
  const authHeader = request.headers.authorization;
  const bearerToken = parseBearerToken(authHeader);
  const hasBearerPrefix =
    authHeader?.trim().toLowerCase().startsWith("bearer ") ?? false;
  if (authHeader) {
    const rawToken = bearerToken ?? authHeader;
    const normalized = normalizeToken(rawToken);
    return {
      token: normalized.token,
      source: "authorization" as const,
      hasBearerPrefix,
      normalized,
    };
  }
  const cookieHeader = request.headers.cookie;
  const cookieToken = parseCookieHeader(cookieHeader).get("fs_token") ?? null;
  if (cookieToken) {
    const normalized = normalizeToken(cookieToken);
    return {
      token: normalized.token,
      source: "cookie" as const,
      hasBearerPrefix,
      normalized,
    };
  }
  return {
    token: null,
    source: "none" as const,
    hasBearerPrefix,
    normalized: null,
  };
}

async function requireUser(
  request: FastifyRequest,
  options?: {
    logContext?: string;
  },
) {
  const route = options?.logContext ?? request.routeOptions?.url ?? "unknown";
  const hasAuthHeader = typeof request.headers.authorization === "string";
  const hasCookieHeader = typeof request.headers.cookie === "string";
  if (options?.logContext && process.env.NODE_ENV !== "production") {
    app.log.info({ route, hasAuthHeader, hasCookieHeader }, "ai auth precheck");
  }

  const { token, source, hasBearerPrefix, normalized } =
    getJwtTokenFromRequest(request);
  if (!token) {
    if (options?.logContext && process.env.NODE_ENV !== "production") {
      app.log.warn(
        { route, reason: "MISSING_TOKEN", source, hasBearerPrefix },
        "ai auth failed",
      );
    }
    throw createHttpError(401, "UNAUTHORIZED");
  }
  const segments = normalized?.segments ?? token.split(".").length;
  const hasPercent = normalized?.hadPercent ?? false;
  if (segments !== 3) {
    if (options?.logContext && process.env.NODE_ENV !== "production") {
      app.log.warn(
        { route, source, hasBearerPrefix, segments, hasPercent },
        "ai auth invalid token format",
      );
    }
    throw createHttpError(401, "INVALID_TOKEN_FORMAT", {
      segments,
      hasPercent,
    });
  }

  if (options?.logContext && process.env.NODE_ENV !== "production") {
    app.log.info(
      {
        route,
        source,
        hasBearerPrefix,
        segments,
        hasPercent,
        tokenDecodeFailed: normalized?.decodeFailed ?? false,
        tokenHasSpace: token.includes(" "),
        tokenHasCookieLabel: token.includes("fs_token="),
      },
      "ai auth token debug",
    );
  }
  if (process.env.NODE_ENV !== "production") {
    app.log.info(
      {
        route,
        source,
        tokenSegmentsCount: token.split(".").length,
      },
      "auth token segments count",
    );
  }

  let payload: { sub: string };
  try {
    payload = app.jwt.verify<{ sub: string }>(token);
  } catch (error) {
    if (options?.logContext && process.env.NODE_ENV !== "production") {
      const typed = error as { message?: string; code?: string; name?: string };
      app.log.warn(
        {
          route,
          reason:
            typed.message ?? typed.code ?? typed.name ?? "JWT_VERIFY_FAILED",
          source,
          hasBearerPrefix,
          segments,
          hasPercent,
          tokenDecodeFailed: normalized?.decodeFailed ?? false,
          tokenHasSpace: token.includes(" "),
          tokenHasCookieLabel: token.includes("fs_token="),
        },
        "ai auth failed",
      );
    }
    throw createHttpError(401, "UNAUTHORIZED");
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.deletedAt) {
    throw createHttpError(404, "NOT_FOUND");
  }
  if (user.isBlocked) {
    throw createHttpError(403, "USER_BLOCKED");
  }
  if (options?.logContext && process.env.NODE_ENV !== "production") {
    app.log.info({ route, userId: user.id, role: user.role }, "ai auth ok");
  }
  return user;
}

async function requireAdmin(request: FastifyRequest) {
  const user = await requireUser(request);
  if (!isGlobalAdminUser(user)) {
    throw createHttpError(403, "FORBIDDEN");
  }
  return user;
}

async function requireResearchAccess(request: FastifyRequest) {
  const user = await requireUser(request, { logContext: "/research/rct/summary" });
  if (isGlobalAdminUser(user)) {
    return user;
  }

  await requireActiveGymManagerMembership(user.id);
  return user;
}

function isGlobalAdminUser(user: { role: string; email: string }) {
  return user.role === "ADMIN" || isBootstrapAdmin(user.email);
}

function resolveEffectiveAuthRole(user: { role: string; email: string }) {
  return isGlobalAdminUser(user) ? "ADMIN" : user.role;
}

function getBootstrapAdminEmails() {
  if (!env.BOOTSTRAP_ADMIN_EMAILS) return new Set<string>();
  return new Set(
    env.BOOTSTRAP_ADMIN_EMAILS.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

const bootstrapAdminEmails = getBootstrapAdminEmails();

function isBootstrapAdmin(email: string): boolean {
  return bootstrapAdminEmails.has(email.trim().toLowerCase());
}

async function requireGymManagerForGym(
  user: { id: string; role: string; email: string },
  gymId: string,
) {
  if (isGlobalAdminUser(user)) {
    return true;
  }

  const managerMembership = await prisma.gymMembership.findUnique({
    where: { gymId_userId: { gymId, userId: user.id } },
    select: {
      id: true,
      gymId: true,
      userId: true,
      status: true,
      role: true,
    },
  });
  if (
    !managerMembership ||
    managerMembership.status !== "ACTIVE" ||
    (managerMembership.role !== "ADMIN" && managerMembership.role !== "TRAINER")
  ) {
    throw createHttpError(403, "FORBIDDEN");
  }
  return managerMembership;
}

async function requireGymManagerAccess(
  user: { id: string; role: string; email: string },
  gymId: string,
) {
  if (isGlobalAdminUser(user)) {
    return;
  }

  await requireGymManagerForGym(user, gymId);
}

async function requireActiveGymManagerMembership(userId: string) {
  const membership = await prisma.gymMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      role: { in: ["ADMIN", "TRAINER"] },
    },
    select: {
      id: true,
      gymId: true,
      userId: true,
      status: true,
      role: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    throw createHttpError(403, "FORBIDDEN");
  }

  return membership;
}

async function requireGymAdminForGym(userId: string, gymId: string) {
  const adminMembership = await prisma.gymMembership.findUnique({
    where: { gymId_userId: { gymId, userId } },
    select: {
      id: true,
      gymId: true,
      userId: true,
      status: true,
      role: true,
    },
  });

  if (
    !adminMembership ||
    adminMembership.status !== "ACTIVE" ||
    adminMembership.role !== "ADMIN"
  ) {
    throw createHttpError(403, "FORBIDDEN");
  }

  return adminMembership;
}

async function getOrCreateProfile(userId: string) {
  try {
    return await prisma.userProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        profile: Prisma.DbNull,
        tracking: {},
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.userProfile.findUnique({
        where: { userId },
      });
      if (existing) return existing;
    }
    throw error;
  }
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).optional(),
  promoCode: z.string().optional(),
  profileDraft: z.unknown().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

const trainingPreferencesSchema = z.object({
  level: z.enum(["beginner", "intermediate", "advanced"]),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionTime: z.enum(["short", "medium", "long"]),
  focus: z.enum(["full", "upperLower", "ppl"]),
  equipment: z.enum(["gym", "home"]),
  includeCardio: z.boolean(),
  includeMobilityWarmups: z.boolean(),
  workoutLength: z.enum(["30m", "45m", "60m", "flexible"]),
  timerSound: z.enum(["ding", "repsToDo"]).or(z.literal("")).transform((v) => v || "ding"),
});

const goalTagSchema = z.enum([
  "buildStrength",
  "loseFat",
  "betterHealth",
  "moreEnergy",
  "tonedMuscles",
]);

const mealDistributionSchema = z.union([
  z.enum(["balanced", "lightDinner", "bigBreakfast", "bigLunch"]),
  z.object({
    preset: z.enum([
      "balanced",
      "lightDinner",
      "bigBreakfast",
      "bigLunch",
      "custom",
    ]),
    percentages: z.array(z.number()).optional(),
  }),
]);

const nutritionPreferencesSchema = z.object({
  mealsPerDay: z.number().int().min(1).max(6),
  dietType: z.enum([
    "balanced",
    "mediterranean",
    "keto",
    "vegetarian",
    "vegan",
    "pescatarian",
    "paleo",
    "flexible",
  ]),
  allergies: z.array(z.string()),
  preferredFoods: z.string(),
  dislikedFoods: z.string(),
  dietaryPrefs: z.string(),
  cookingTime: z.enum(["quick", "medium", "long"]),
  mealDistribution: mealDistributionSchema,
});

const macroPreferencesSchema = z.object({
  formula: z.enum(["mifflin", "katch"]),
  proteinGPerKg: z.number(),
  fatGPerKg: z.number(),
  cutPercent: z.number(),
  bulkPercent: z.number(),
});

const profileSchema = z.object({
  name: z.string(),
  sex: z.enum(["male", "female"]),
  age: z.number().positive(),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  goalWeightKg: z.number().positive(),
  goal: z.enum(["cut", "maintain", "bulk"]),
  goals: z.array(goalTagSchema),
  activity: z.enum(["sedentary", "light", "moderate", "very", "extra"]),
  profilePhotoUrl: z.string().nullable(),
  avatarDataUrl: z.string().nullable().optional(),
  trainingPlan: z.any().nullable().optional(),
  nutritionPlan: z.any().nullable().optional(),
  injuries: z.string(),
  trainingPreferences: trainingPreferencesSchema,
  nutritionPreferences: nutritionPreferencesSchema,
  macroPreferences: macroPreferencesSchema,
  notes: z.string(),
  measurements: z.object({
    chestCm: z.number().nullable(),
    waistCm: z.number().nullable(),
    hipsCm: z.number().nullable(),
    bicepsCm: z.number().nullable(),
    thighCm: z.number().nullable(),
    calfCm: z.number().nullable(),
    neckCm: z.number().nullable(),
    bodyFatPercent: z.number().nullable(),
  }),
});

const profileUpdateSchema = profileSchema.partial().extend({
  trainingPreferences: trainingPreferencesSchema.partial().optional(),
  nutritionPreferences: nutritionPreferencesSchema.partial().optional(),
  macroPreferences: macroPreferencesSchema.partial().optional(),
  measurements: profileSchema.shape.measurements.partial().optional(),
});

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function flattenProfileDraftEnvelope(value: unknown): Record<string, unknown> {
  if (!isPlainRecord(value)) {
    return {};
  }

  const flattened: Record<string, unknown> = { ...value };
  const nestedProfile = flattened.profile;
  delete flattened.profile;

  if (!isPlainRecord(nestedProfile)) {
    return flattened;
  }

  return {
    ...flattened,
    ...flattenProfileDraftEnvelope(nestedProfile),
  };
}

function normalizeSignupProfileDraft(value: unknown): Prisma.InputJsonObject | null {
  const flattenedDraft = flattenProfileDraftEnvelope(value);
  if (Object.keys(flattenedDraft).length === 0) {
    return null;
  }

  const parsedDraft = profileUpdateSchema.safeParse(flattenedDraft);
  if (!parsedDraft.success) {
    return null;
  }

  return parsedDraft.data as Prisma.InputJsonObject;
}

function normalizeInvalidPositiveMetric(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function isProfileComplete(profile: Record<string, unknown> | null) {
  if (!profile) return false;
  return profileSchema.safeParse(profile).success;
}

async function requireCompleteProfile(userId: string) {
  const profile = await getOrCreateProfile(userId);
  const data =
    typeof profile.profile === "object" && profile.profile
      ? (profile.profile as Record<string, unknown>)
      : null;
  if (!isProfileComplete(data)) {
    throw createHttpError(409, "PROFILE_INCOMPLETE");
  }
}

function getUserEntitlements(user: User) {
  return resolveUserEntitlements(user, isBootstrapAdmin);
}

function getAiTokenPayload(user: User, entitlements: EffectiveEntitlements) {
  if (entitlements.role.adminOverride) {
    return { aiTokenBalance: null, aiTokenRenewalAt: null };
  }

  return {
    aiTokenBalance: getEffectiveTokenBalance(user),
    aiTokenRenewalAt: getUserTokenExpiryAt(user),
  };
}

const aiAccessGuard = buildEntitlementGuard({
  requireAi: true,
  forbiddenStatus: 402,
  forbiddenBody: { code: "UPGRADE_REQUIRED" },
  requireUser,
  isBootstrapAdmin,
});

const aiNutritionDomainGuard = buildEntitlementGuard({
  requireAi: true,
  requireDomain: "nutrition",
  forbiddenStatus: 403,
  forbiddenBody: { error: "AI_ACCESS_FORBIDDEN" },
  requireUser,
  isBootstrapAdmin,
});

const aiStrengthDomainGuard = buildEntitlementGuard({
  requireAi: true,
  requireDomain: "strength",
  forbiddenStatus: 403,
  forbiddenBody: { error: "AI_ACCESS_FORBIDDEN" },
  requireUser,
  isBootstrapAdmin,
});

const userFoodSchema = z.object({
  name: z.string().min(1),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  unit: z.enum(["100g", "serving", "unit"]),
  brand: z.string().optional().nullable(),
});

const defaultTrainingPreferences = {
  level: "beginner",
  daysPerWeek: 3,
  sessionTime: "medium",
  focus: "full",
  equipment: "gym",
  includeCardio: true,
  includeMobilityWarmups: true,
  workoutLength: "45m",
  timerSound: "ding",
};

const defaultNutritionPreferences = {
  mealsPerDay: 4,
  dietType: "balanced",
  allergies: [],
  preferredFoods: "",
  dislikedFoods: "",
  dietaryPrefs: "",
  cookingTime: "medium",
  mealDistribution: { preset: "balanced" },
};

const defaultGoals = ["betterHealth"];

function normalizeMealDistribution(value: unknown) {
  if (!value) return { preset: "balanced" };
  if (typeof value === "string") return { preset: value };
  if (typeof value === "object") {
    const payload = value as { preset?: string; percentages?: unknown };
    const preset =
      payload.preset === "balanced" ||
      payload.preset === "lightDinner" ||
      payload.preset === "bigBreakfast" ||
      payload.preset === "bigLunch" ||
      payload.preset === "custom"
        ? payload.preset
        : "balanced";
    const percentages = Array.isArray(payload.percentages)
      ? payload.percentages
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item))
      : undefined;
    return { preset, percentages };
  }
  return { preset: "balanced" };
}

const aiTrainingSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.number().int().min(10).max(100),
  sex: z.enum(["male", "female"]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  goal: z.enum(["cut", "maintain", "bulk"]),
  goals: z.array(goalTagSchema).optional(),
  equipment: z.enum(["gym", "home"]),
  daysPerWeek: z.number().int().min(1).max(7),
  startDate: z.string().min(1).optional(),
  daysCount: z.number().int().min(1).max(14).optional(),
  sessionTime: z.enum(["short", "medium", "long"]),
  focus: z.enum(["full", "upperLower", "ppl"]),
  timeAvailableMinutes: z.number().int().min(20).max(120),
  includeCardio: z.boolean().optional(),
  includeMobilityWarmups: z.boolean().optional(),
  workoutLength: z.enum(["30m", "45m", "60m", "flexible"]).optional(),
  timerSound: z.enum(["ding", "repsToDo"]).optional(),
  injuries: z.string().optional(),
  restrictions: z.string().optional(),
});

const aiNutritionSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.number().int().min(10).max(100),
  sex: z.enum(["male", "female"]),
  goal: z.enum(["cut", "maintain", "bulk"]),
  mealsPerDay: z.number().int().min(2).max(6),
  calories: z.number().int().min(1200).max(4000),
  startDate: z.string().min(1).optional(),
  daysCount: z.number().int().min(1).max(14).optional(),
  dietaryRestrictions: z.string().optional(),
  dietType: z
    .enum([
      "balanced",
      "mediterranean",
      "keto",
      "vegetarian",
      "vegan",
      "pescatarian",
      "paleo",
      "flexible",
    ])
    .optional(),
  allergies: z.array(z.string()).optional(),
  preferredFoods: z.string().optional(),
  dislikedFoods: z.string().optional(),
  mealDistribution: mealDistributionSchema.optional(),
});

const aiGenerateTrainingSchema = z.object({
  userId: z.string().min(1).optional(),
  daysPerWeek: z.number().int().min(1).max(7),
  goal: z.enum(["cut", "maintain", "bulk"]),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  constraints: z.union([z.string(), z.array(z.string())]).optional(),
  aiRequestId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  age: z.number().int().min(10).max(100).optional(),
  sex: z.enum(["male", "female"]).optional(),
  focus: z.enum(["full", "upperLower", "ppl"]).optional(),
  equipment: z.enum(["gym", "home"]).optional(),
  sessionTime: z.enum(["short", "medium", "long"]).optional(),
  timeAvailableMinutes: z.number().int().min(20).max(120).optional(),
  startDate: z.string().min(1).optional(),
  daysCount: z.number().int().min(1).max(14).optional(),
  includeCardio: z.boolean().optional(),
  includeMobilityWarmups: z.boolean().optional(),
  workoutLength: z.enum(["30m", "45m", "60m", "flexible"]).optional(),
  timerSound: z.enum(["ding", "repsToDo"]).optional(),
  injuries: z.string().optional(),
  restrictions: z.string().optional(),
  goals: z.array(goalTagSchema).optional(),
});

const aiGenerateNutritionSchema = z.object({
  userId: z.string().min(1).optional(),
  mealsPerDay: z.number().int().min(2).max(6),
  targetKcal: z.number().int().min(600).max(4000),
  startDate: z.string().min(1).optional(),
  daysCount: z.number().int().min(1).max(14).optional(),
  macroTargets: z.object({
    proteinG: z.number().min(0),
    carbsG: z.number().min(0),
    fatsG: z.number().min(0),
  }),
  dietType: z
    .enum([
      "balanced",
      "mediterranean",
      "keto",
      "vegetarian",
      "vegan",
      "pescatarian",
      "paleo",
      "flexible",
    ])
    .optional(),
  dietaryPrefs: z
    .enum([
      "balanced",
      "mediterranean",
      "keto",
      "vegetarian",
      "vegan",
      "pescatarian",
      "paleo",
      "flexible",
    ])
    .optional(),
});

const aiTipSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.enum(["cut", "maintain", "bulk"]).optional(),
});

type AiRequestType = "training" | "nutrition" | "tip";

const aiTrainingSeriesSchema = z.preprocess((value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return value;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}, z.number().int().min(1));

const aiTrainingRepsSchema = z.preprocess((value) => {
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value.trim();
  return value;
}, z.string().min(1));

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const aiTrainingExerciseSchema = z
  .object({
    exerciseId: z.string().min(1),
    name: z.string().min(1),
    sets: aiTrainingSeriesSchema,
    reps: aiTrainingRepsSchema.nullable(),
    tempo: z
      .string()
      .nullable()
      .transform((v) => v ?? ""),
    notes: z
      .string()
      .nullable()
      .transform((v) => v ?? ""),
    rest: z
      .number()
      .nullable()
      .transform((v) => v ?? 60),
  })
  .passthrough();

const aiTrainingDaySchema = z
  .object({
    date: isoDateSchema.nullable(),
    label: z.string().min(1),
    focus: z.string().min(1),
    duration: z.number().int().min(20).max(120),
    exercises: z.array(aiTrainingExerciseSchema).min(3).max(5),
  })
  .passthrough();

const aiTrainingPlanResponseSchema = z
  .object({
    title: z.string().min(1),
    notes: z.string().min(1).nullable(),
    startDate: isoDateSchema.nullable(),
    days: z.array(aiTrainingDaySchema).min(1).max(7),
  })
  .passthrough();

const aiNutritionMealSchema = z
  .object({
    type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    recipeId: z.string().min(1).nullable().optional(),
    title: z.string().min(1),
    description: z.string().min(1).nullable(),
    macros: z.object({
      calories: z.coerce.number().min(50).max(1500),
      protein: z.coerce.number().min(0).max(200),
      carbs: z.coerce.number().min(0).max(250),
      fats: z.coerce.number().min(0).max(150),
    }),
    ingredients: z
      .array(
        z.object({
          name: z.string().min(1),
          grams: z.coerce.number().min(5).max(1000),
        }),
      )
      .min(0)
      .max(6)
      .nullable(),
  })
  .passthrough();

const aiNutritionDaySchema = z
  .object({
    date: isoDateSchema.optional(),
    dayLabel: z.string().min(1),
    meals: z.array(aiNutritionMealSchema).min(2).max(6),
  })
  .passthrough();

const aiNutritionPlanResponseSchema = z
  .object({
    title: z.string().min(1),
    startDate: isoDateSchema.nullable(),
    dailyCalories: z.coerce.number().min(600).max(4000),
    proteinG: z.coerce.number().min(50).max(300),
    fatG: z.coerce.number().min(30).max(200),
    carbsG: z.coerce.number().min(50).max(600),
    days: z.array(aiNutritionDaySchema).min(1).max(14),
    shoppingList: z
      .array(
        z.object({
          name: z.string().min(1),
          grams: z.coerce.number().min(0).max(5000),
        }),
      )
      .nullable(),
  })
  .passthrough();

function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildDateRange(startDate: Date, daysCount: number) {
  const dates: string[] = [];
  for (let i = 0; i < daysCount; i += 1) {
    const next = new Date(startDate);
    next.setUTCDate(startDate.getUTCDate() + i);
    dates.push(toIsoDateString(next));
  }
  return dates;
}

function getSecondsUntilNextUtcDay(date = new Date()) {
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  );
  const diffMs = next.getTime() - date.getTime();
  return Math.max(1, Math.ceil(diffMs / 1000));
}

function getEffectiveTokenBalance(user: {
  aiTokenBalance?: number | null;
  aiTokenResetAt?: Date | null;
  aiTokenRenewalAt?: Date | null;
}) {
  const tokenExpiryAt = getUserTokenExpiryAt(user);
  if (!tokenExpiryAt) {
    return 0;
  }
  if (tokenExpiryAt.getTime() < Date.now()) {
    return 0;
  }
  return Math.max(0, getUserTokenBalance(user));
}

function assertSufficientAiTokenBalance(
  user: {
    aiTokenBalance?: number | null;
    aiTokenResetAt?: Date | null;
    aiTokenRenewalAt?: Date | null;
  },
  minimumRequiredTokens = 1,
) {
  const effectiveTokens = getEffectiveTokenBalance(user);
  if (effectiveTokens < 1) {
    throw createHttpError(403, "AI_TOKENS_EXHAUSTED", {
      message: "No tienes tokens IA",
    });
  }
  if (effectiveTokens < minimumRequiredTokens) {
    throw createHttpError(403, "AI_TOKENS_INSUFFICIENT", {
      message: "No tienes tokens IA",
      requiredTokens: minimumRequiredTokens,
      availableTokens: effectiveTokens,
    });
  }
  return effectiveTokens;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${(value as unknown[])
      .map((item) => stableStringify(item))
      .join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  return `{${entries
    .map(([key, val]) => `"${key}":${stableStringify(val)}`)
    .join(",")}}`;
}

function buildCacheKey(type: string, params: Record<string, unknown>) {
  return `${type}:${stableStringify(params)}`;
}

function replaceTemplateVars(
  text: string,
  vars: Record<string, string | undefined>,
) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => (value ? acc.replaceAll(`{${key}}`, value) : acc),
    text,
  );
}

function applyPersonalization<T>(
  payload: T,
  vars: Record<string, string | undefined>,
) {
  const clone = JSON.parse(JSON.stringify(payload)) as T;
  if (!clone || typeof clone !== "object") return clone;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach((child) => walk(child));
      return;
    }
    if (node && typeof node === "object") {
      Object.entries(node as Record<string, unknown>).forEach(
        ([key, value]) => {
          if (typeof value === "string") {
            (node as Record<string, unknown>)[key] = replaceTemplateVars(
              value,
              vars,
            );
          } else if (value && typeof value === "object") {
            walk(value);
          }
        },
      );
    }
  };
  walk(clone);
  return clone;
}

async function enforceAiQuota(user: { id: string; plan: string }) {
  const dateKey = toDateKey();
  const limit =
    user.plan !== "FREE" ? env.AI_DAILY_LIMIT_PRO : env.AI_DAILY_LIMIT_FREE;
  const usage = await prisma.aiUsage.findUnique({
    where: { userId_date: { userId: user.id, date: dateKey } },
  });
  if (limit > 0 && usage && usage.count >= limit) {
    const retryAfterSec = getSecondsUntilNextUtcDay();
    throw createHttpError(429, "AI_LIMIT_REACHED", { retryAfterSec });
  }
  await prisma.aiUsage.upsert({
    where: { userId_date: { userId: user.id, date: dateKey } },
    create: { userId: user.id, date: dateKey, count: 1 },
    update: { count: { increment: 1 } },
  });
}

async function storeAiContent(
  userId: string,
  type: AiRequestType,
  source: "template" | "cache" | "ai",
  payload: Record<string, unknown>,
) {
  await prisma.aiContent.create({
    data: { userId, type, source, payload: payload as Prisma.InputJsonValue },
  });
}

async function safeStoreAiContent(
  userId: string,
  type: AiRequestType,
  source: "template" | "cache" | "ai",
  payload: Record<string, unknown>,
) {
  try {
    await storeAiContent(userId, type, source, payload);
  } catch (error) {
    app.log.warn(
      { err: error, userId, type, source },
      "ai content store failed",
    );
  }
}

async function getCachedAiPayload(key: string) {
  const cached = await prisma.aiPromptCache.findUnique({ where: { key } });
  if (!cached) return null;
  await prisma.aiPromptCache.update({
    where: { id: cached.id },
    data: { lastUsedAt: new Date() },
  });
  return cached.payload as Record<string, unknown>;
}

async function saveCachedAiPayload(
  key: string,
  type: AiRequestType,
  payload: Record<string, unknown>,
) {
  await prisma.aiPromptCache.upsert({
    where: { key },
    create: { key, type, payload: payload as Prisma.InputJsonValue },
    update: {
      payload: payload as Prisma.InputJsonValue,
      lastUsedAt: new Date(),
    },
  });
}

function resolveTemplateExerciseId(
  name: string,
  catalogByName: Map<string, string>,
) {
  const normalized = normalizeExerciseName(name);
  return catalogByName.get(normalized) ?? null;
}

function buildTrainingTemplate(
  params: z.infer<typeof aiTrainingSchema>,
  exerciseCatalog: ExerciseCatalogItem[],
): z.infer<typeof aiTrainingPlanResponseSchema> | null {
  if (
    params.focus !== "ppl" ||
    params.level !== "intermediate" ||
    params.daysPerWeek < 3
  ) {
    return null;
  }

  const daysPerWeek = Math.min(params.daysPerWeek, 7);
  const catalogByName = new Map(
    exerciseCatalog.map((exercise) => [
      normalizeExerciseName(exercise.name),
      exercise.id,
    ]),
  );
  const missingTemplateExercises = new Set<string>();
  const ex = (
    name: string,
    sets: number,
    reps: string,
    tempo = "2-0-1",
    rest = 90,
    notes = "Técnica limpia, controla la bajada.",
  ) => {
    const exerciseId = resolveTemplateExerciseId(name, catalogByName);
    if (!exerciseId) {
      missingTemplateExercises.add(name);
    }
    return {
      exerciseId: exerciseId ?? "",
      name,
      sets,
      reps,
      tempo,
      rest,
      notes,
    };
  };

  const pushDay = {
    date: null,
    label: "Día 1",
    focus: "Push",
    duration: params.timeAvailableMinutes,
    exercises: [
      ex(
        "Press banca",
        4,
        "6-10",
        "2-0-1",
        120,
        "Escápulas atrás, pausa suave abajo.",
      ),
      ex(
        "Press militar",
        3,
        "8-10",
        "2-0-1",
        90,
        "Glúteos y core firmes, no hiperextender.",
      ),
      ex("Fondos", 3, "8-12", "2-0-1", 90, "Rango controlado, sin balanceo."),
      ex(
        "Elevaciones laterales",
        3,
        "12-15",
        "2-0-2",
        60,
        "Codos suaves, sin impulso.",
      ),
      ex(
        "Extensión tríceps",
        3,
        "10-12",
        "2-0-2",
        60,
        "Bloquea sin dolor de codo.",
      ),
    ],
  };
  const pullDay = {
    date: null,
    label: "Día 2",
    focus: "Pull",
    duration: params.timeAvailableMinutes,
    exercises: [
      ex(
        "Remo con barra",
        4,
        "6-10",
        "2-0-1",
        120,
        "Espalda neutra, tira con codos.",
      ),
      ex(
        "Dominadas",
        3,
        "6-10",
        "2-1-1",
        120,
        "Controla la bajada, no balancees.",
      ),
      ex(
        "Remo en polea",
        3,
        "10-12",
        "2-1-1",
        90,
        "Pecho arriba, pausa al final.",
      ),
      ex("Curl bíceps", 3, "10-12", "2-0-2", 75, "Sin balanceo, codos fijos."),
      ex(
        "Face pull",
        3,
        "12-15",
        "2-1-2",
        60,
        "Tira a la cara, hombros atrás.",
      ),
    ],
  };

  const legsDay = {
    date: null,
    label: "Día 3",
    focus: "Legs",
    duration: params.timeAvailableMinutes,
    exercises: [
      ex(
        "Sentadilla",
        4,
        "6-10",
        "3-0-1",
        150,
        "Profundidad segura, core firme.",
      ),
      ex(
        "Peso muerto rumano",
        3,
        "8-10",
        "3-1-1",
        120,
        "Cadera atrás, barra pegada.",
      ),
      ex(
        "Hip thrust",
        3,
        "10-12",
        "2-1-1",
        120,
        "Pausa arriba, evita hiperextender.",
      ),
      ex(
        "Prensa",
        3,
        "10-12",
        "2-0-2",
        120,
        "Controla recorrido, no bloquees rodillas.",
      ),
      ex(
        "Elevaciones de gemelo",
        3,
        "12-15",
        "2-1-2",
        60,
        "Pausa arriba y estira abajo.",
      ),
    ],
  };

  const pushDayVariation = {
    date: null,
    label: "Día 4",
    focus: "Push (variación)",
    duration: params.timeAvailableMinutes,
    exercises: [
      ex(
        "Press inclinado con mancuernas",
        4,
        "8-10",
        "2-0-1",
        120,
        "Recorrido completo, control.",
      ),
      ex(
        "Press Arnold",
        3,
        "8-10",
        "2-0-1",
        90,
        "No arquees la espalda, core firme.",
      ),
      ex(
        "Aperturas con mancuernas",
        3,
        "12-15",
        "2-1-2",
        75,
        "Estira sin dolor, codos suaves.",
      ),
      ex(
        "Elevaciones frontales",
        3,
        "12-15",
        "2-0-2",
        60,
        "Sin impulso, sube hasta ojos.",
      ),
      ex(
        "Jalón de tríceps con cuerda",
        3,
        "10-12",
        "2-0-2",
        60,
        "Separa cuerda al final, control.",
      ),
    ],
  };

  const pullDayVariation = {
    date: null,
    label: "Día 5",
    focus: "Pull (variación)",
    duration: params.timeAvailableMinutes,
    exercises: [
      ex(
        "Remo con mancuerna a una mano",
        4,
        "8-10",
        "2-1-1",
        120,
        "Cadera estable, tira con codo.",
      ),
      ex(
        "Jalón al pecho en polea",
        3,
        "8-12",
        "2-1-1",
        90,
        "Pecho arriba, baja al pecho.",
      ),
      ex(
        "Remo en máquina",
        3,
        "10-12",
        "2-1-1",
        90,
        "Pausa al final, sin encoger hombros.",
      ),
      ex("Curl martillo", 3, "10-12", "2-0-2", 75, "Control, muñeca neutra."),
      ex(
        "Encogimientos de trapecio",
        3,
        "12-15",
        "2-1-2",
        60,
        "Sube recto, pausa arriba.",
      ),
    ],
  };

  const legsDayVariation = {
    date: null,
    label: "Día 6",
    focus: "Legs (variación)",
    duration: params.timeAvailableMinutes,
    exercises: [
      ex(
        "Sentadilla frontal",
        4,
        "6-10",
        "3-0-1",
        150,
        "Codos altos, torso erguido.",
      ),
      ex(
        "Peso muerto sumo",
        3,
        "6-10",
        "2-0-1",
        150,
        "Rodillas afuera, espalda neutra.",
      ),
      ex(
        "Zancada búlgara",
        3,
        "10-12",
        "2-0-2",
        120,
        "Rodilla estable, baja controlado.",
      ),
      ex(
        "Curl femoral",
        3,
        "10-12",
        "2-1-2",
        90,
        "Pausa contracción, controla bajada.",
      ),
      ex(
        "Elevaciones de gemelo sentado",
        3,
        "12-15",
        "2-1-2",
        60,
        "Rango completo, pausa arriba.",
      ),
    ],
  };

  const recoveryDay = {
    date: null,
    label: "Día 7",
    focus: "Cardio + movilidad",
    duration: Math.min(params.timeAvailableMinutes, 40),
    exercises: [
      ex(
        "Caminata inclinada en cinta",
        1,
        "20 min",
        "1-0-1",
        0,
        "Ritmo moderado, respiración controlada.",
      ),
      ex(
        "Plancha frontal",
        3,
        "30-45s",
        "1-0-1",
        45,
        "Cuerpo alineado, abdomen activo.",
      ),
      ex(
        "Movilidad de cadera y hombro",
        1,
        "10 min",
        "1-0-1",
        0,
        "Movimientos suaves, sin dolor.",
      ),
    ],
  };

  if (missingTemplateExercises.size > 0) {
    throw createHttpError(503, "EXERCISE_CATALOG_UNAVAILABLE", {
      cause: "TEMPLATE_EXERCISE_NOT_FOUND",
      missingExercises: Array.from(missingTemplateExercises.values()),
    });
  }

  const baseDays = [pushDay, pullDay, legsDay];
  if (daysPerWeek === 3) {
    return {
      title: "Rutina Push/Pull/Legs intermedio",
      days: baseDays,
      notes: "Plan base PPL. Ajusta cargas y descanso según progreso.",
      startDate: null,
    };
  }
  if (daysPerWeek === 4) {
    return {
      title: "Rutina Push/Pull/Legs intermedio",
      days: [...baseDays, pushDayVariation],
      notes: "Plan PPL con variación extra de empuje.",
      startDate: null,
    };
  }
  if (daysPerWeek === 5) {
    return {
      title: "Rutina Push/Pull/Legs intermedio",
      days: [...baseDays, pushDayVariation, pullDayVariation],
      notes: "Plan PPL con variaciones extra de push y pull.",
      startDate: null,
    };
  }
  if (daysPerWeek === 6) {
    return {
      title: "Rutina Push/Pull/Legs intermedio",
      days: [...baseDays, pushDayVariation, pullDayVariation, legsDayVariation],
      notes: "Plan PPL completo con dobles estímulos semanales.",
      startDate: null,
    };
  }
  return {
    title: "Rutina Push/Pull/Legs intermedio",
    days: [
      ...baseDays,
      pushDayVariation,
      pullDayVariation,
      legsDayVariation,
      recoveryDay,
    ],
    notes: "Plan PPL completo con día extra de recuperación activa.",
    startDate: null,
  };
}

function buildNutritionTemplate(
  params: z.infer<typeof aiNutritionSchema>,
): z.infer<typeof aiNutritionPlanResponseSchema> | null {
  if (params.mealsPerDay !== 3 || params.goal !== "cut") {
    return null;
  }
  const template = {
    title: "Plan semanal de nutrición",
    startDate: null,
    dailyCalories: params.calories,
    proteinG: Math.round((params.calories * 0.3) / 4),
    fatG: Math.round((params.calories * 0.25) / 9),
    carbsG: Math.round((params.calories * 0.45) / 4),
    days: [
      {
        dayLabel: "Lunes",
        meals: [
          {
            type: "breakfast",
            title: "Yogur griego con avena y fruta",
            description:
              "Desayuno mediterráneo sencillo con proteína moderada.",
            macros: { calories: 420, protein: 25, carbs: 45, fats: 12 },
            ingredients: [
              { name: "Yogur griego", grams: 200 },
              { name: "Avena", grams: 50 },
              { name: "Fruta fresca", grams: 150 },
              { name: "Nueces", grams: 20 },
            ],
          },
          {
            type: "lunch",
            title: "Pollo a la plancha con arroz y ensalada",
            description: "Plato principal equilibrado y saciante.",
            macros: {
              calories: 680,
              protein: 45,
              carbs: 70,
              fats: 18,
            },
            ingredients: [
              { name: "Pechuga de pollo", grams: 160 },
              { name: "Arroz integral cocido", grams: 180 },
              { name: "Verduras mixtas", grams: 200 },
              { name: "Aceite de oliva", grams: 10 },
            ],
          },
          {
            type: "dinner",
            title: "Salmón con patata y verduras",
            description: "Cena ligera rica en omega 3.",
            macros: {
              calories: 620,
              protein: 38,
              carbs: 55,
              fats: 22,
            },
            ingredients: [
              { name: "Salmón", grams: 140 },
              { name: "Patata cocida", grams: 180 },
              { name: "Verduras salteadas", grams: 200 },
              { name: "Aceite de oliva", grams: 8 },
            ],
          },
        ],
      },
    ],
    shoppingList: null,
  } satisfies z.infer<typeof aiNutritionPlanResponseSchema>;
  return template;
}

function buildTipTemplate() {
  return {
    title: "Consejo diario",
    message:
      "Hola {name}, recuerda que la constancia gana a la intensidad. ¡Haz algo hoy!",
  };
}

function buildTrainingPrompt(
  data: z.infer<typeof aiTrainingSchema>,
  strict = false,
  exerciseCatalogPrompt = "",
) {
  const secondaryGoals = data.goals?.length
    ? data.goals.join(", ")
    : "no especificados";
  const cardio =
    typeof data.includeCardio === "boolean"
      ? data.includeCardio
        ? "sí"
        : "no"
      : "no especificado";
  const mobility =
    typeof data.includeMobilityWarmups === "boolean"
      ? data.includeMobilityWarmups
        ? "sí"
        : "no"
      : "no especificado";
  const workoutLength = data.workoutLength ?? "flexible";
  const timerSound = data.timerSound ?? "no especificado";
  const injuries = data.injuries?.trim() || "ninguna";
  const daysCount = Math.min(data.daysCount ?? data.daysPerWeek, 14);
  const catalogInstruction = exerciseCatalogPrompt
    ? `Usa SOLO exerciseId existentes en catálogo (id:nombre): ${exerciseCatalogPrompt}`
    : "";
  return [
    "Eres entrenador personal senior. Responde SOLO JSON valido, sin markdown.",
    "Formato exacto: {title,startDate,notes,days:[{date,label,focus,duration,exercises:[{exerciseId,name,sets,reps,tempo,rest,notes}]}]}.",
    "days.length debe ser EXACTAMENTE diasPerWeek (max 7). Cada dia: 3-5 ejercicios.",
    "No inventes exerciseId ni entidades; todos los exerciseId deben existir en el catalogo.",
    catalogInstruction,
    strict
      ? "REINTENTO: corrige dias exactos y volumen por nivel o se rechaza."
      : "",
    "Nivel: beginner (3-4 ejercicios, 30-50 min), intermedio/avanzado (4-5 ejercicios, 40-60 min).",
    "Evita volumen excesivo y descansos incoherentes.",
    `Perfil: edad ${data.age}, sexo ${data.sex}, nivel ${data.level}, objetivo ${data.goal}.`,
    `Secundarios: ${secondaryGoals}. Cardio: ${cardio}. Movilidad: ${mobility}.`,
    `Sesion preferida: ${workoutLength}. Timer: ${timerSound}.`,
    `Dias/semana ${data.daysPerWeek}, enfoque ${data.focus}, equipo ${data.equipment}.`,
    `Tiempo disponible por sesión ${data.timeAvailableMinutes} min. Restricciones/lesiones: ${
      data.restrictions ?? injuries
    }.`,
    "Estructura por enfoque: full=full body; upperLower=alterna upper/lower; ppl=push-pull-legs.",
    `Asigna date (YYYY-MM-DD) desde ${data.startDate ?? "fecha indicada"} y distribuye sesiones en ${daysCount} dias.`,
    'Labels en espanol consistentes (ej: "Dia 1", "Dia 2").',
    "En cada ejercicio incluye exerciseId, name, sets y reps; tempo/rest/notes breves solo si aportan.",
  ]
    .filter(Boolean)
    .join(" ");
}

type RecipePromptItem = {
  id: string;
  name: string;
  description?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Array<{ name: string; grams: number }>;
  steps: string[];
};

function formatRecipeLibrary(recipes: RecipePromptItem[]) {
  if (!recipes.length) return "";

  // Categorize recipes by meal type based on name
  const categories = {
    breakfast: [] as string[],
    snack: [] as string[],
    lunch_dinner: [] as string[],
    fish: [] as string[],
    other: [] as string[],
  };

  for (const recipe of recipes) {
    const lower = recipe.name.toLowerCase();
    const line = `- [${recipe.id}] ${recipe.name} (${Math.round(recipe.calories)} kcal, P${Math.round(recipe.protein)} C${Math.round(recipe.carbs)} G${Math.round(recipe.fat)})`;

    if (lower.includes("yogur") || lower.includes("skyr") || lower.includes("avena") || lower.includes("overnight") || lower.includes("tostadas") || lower.includes("tortitas") || lower.includes("omelette") || lower.includes("tortilla de claras") || lower.includes("porridge") || lower.includes("pudín") || lower.includes("pan de plátano") || lower.includes("crepes") || lower.includes("arroz con leche")) {
      categories.breakfast.push(line);
    } else if (lower.includes("barritas") || lower.includes("edamame") || lower.includes("hummus") || lower.includes("guacamole") || lower.includes("batido") || lower.includes("smoothie") || lower.includes("yogur helado")) {
      categories.snack.push(line);
    } else if (lower.includes("salmón") || lower.includes("merluza") || lower.includes("atún") || lower.includes("bacalao") || lower.includes("lubina") || lower.includes("pescado") || lower.includes("ceviche") || lower.includes("pulpo") || lower.includes("calamares") || lower.includes("pez espada")) {
      categories.fish.push(line);
    } else {
      categories.lunch_dinner.push(line);
      categories.other.push(line);
    }
  }

  const sections = [];
  if (categories.breakfast.length > 0) {
    sections.push(`DESAUNO (usa solo para meals type="breakfast"): ${categories.breakfast.join(" ")}`);
  }
  if (categories.snack.length > 0) {
    sections.push(`SNACK (usa solo para meals type="snack"): ${categories.snack.join(" ")}`);
  }
  if (categories.lunch_dinner.length > 0) {
    sections.push(`ALMUERZO/CENA (usa para meals type="lunch" o "dinner"): ${categories.lunch_dinner.join(" ")}`);
  }

  return sections.join("\n");
}

function roundToNearest5(value: number) {
  return Math.round(value / 5) * 5;
}

type RecipeDbItem = {
  id: string;
  name: string;
  displayName?: string | null;
  tagline?: string | null;
  description: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  steps: string[];
  ingredients: Array<{ name: string; grams: number; isMainIngredient?: boolean; category?: string }>;
  imageUrl?: string | null;
  slug?: string | null;
  category?: string | null;
  // new fields
  mealType?: string | null;
  dietType?: string | null;
  goalFit?: string | null;
  mainIngredient?: string | null;
  cuisine?: string | null;
  difficulty?: string | null;
  tags?: string[];
  keywords?: string[];
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  servingSize?: string | null;
  servings?: number;
  photoUrl?: string | null;
  imageUrls?: string[];
  source?: string | null;
};

type RecipeSeedItem = Omit<RecipeDbItem, "id">;

function toNutritionRecipeCatalog(
  recipes: RecipeDbItem[],
): NutritionRecipeCatalogItem[] {
  return recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    imageUrl: recipe.imageUrl ?? null,
    ingredients: recipe.ingredients.map(
      (ingredient: { name: string; grams: number }) => ({
        name: ingredient.name,
        grams: ingredient.grams,
      }),
    ),
  }));
}

function applyNutritionCatalogResolution(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  recipes: RecipeDbItem[],
): z.infer<typeof aiNutritionPlanResponseSchema> {
  const recipeCatalog = toNutritionRecipeCatalog(recipes);
  const resolved = resolveNutritionPlanRecipeIds(plan, recipeCatalog);
  if (!resolved.catalogAvailable) return plan;
  if (resolved.invalidMeals.length > 0) {
    app.log.warn(
      {
        invalidMeals: resolved.invalidMeals.slice(0, 10),
        invalidCount: resolved.invalidMeals.length,
      },
      "nutrition plan contains invalid recipe IDs; fallback applied",
    );
  }
  const varietyGuard = applyNutritionPlanVarietyGuard(
    resolved.plan,
    recipeCatalog,
    ["breakfast", "snack", "lunch", "dinner"],
  );
  app.log.info(
    {
      uniqueRecipeIdsWeek: varietyGuard.uniqueRecipeIdsWeek,
      replacementsApplied: varietyGuard.replacements,
      hadEnoughUniqueRecipes: varietyGuard.hadEnoughUniqueRecipes,
      catalogSize: recipeCatalog.length,
    },
    "variety_guard_summary",
  );
  return varietyGuard.plan as z.infer<typeof aiNutritionPlanResponseSchema>;
}

function applyRecipeScalingToPlan(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  recipes: RecipeDbItem[],
) {
  if (!recipes.length) return plan;
  const recipeMap = new Map(
    recipes.map((recipe) => [recipe.name.toLowerCase(), recipe]),
  );
  const recipeMapById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  plan.days.forEach((day) => {
    day.meals.forEach((meal) => {
      const recipe =
        (meal.recipeId ? recipeMapById.get(meal.recipeId) : undefined) ??
        recipeMap.get(meal.title.toLowerCase());
      if (!recipe) return;
      const baseCalories = recipe.calories;
      const targetCalories = meal.macros?.calories ?? baseCalories;
      if (!baseCalories || !targetCalories || !Number.isFinite(targetCalories))
        return;
      const scale = targetCalories / baseCalories;
      const scaledIngredients = recipe.ingredients.map(
        (ingredient: { name: string; grams: number }) => ({
          name: ingredient.name,
          grams: roundToNearest5(ingredient.grams * scale),
        }),
      );
      meal.ingredients = scaledIngredients;
      meal.macros = {
        calories: Math.round(recipe.calories * scale),
        protein: Math.round(recipe.protein * scale),
        carbs: Math.round(recipe.carbs * scale),
        fats: Math.round(recipe.fat * scale),
      };
    });
  });
  return plan;
}

async function saveNutritionPlan(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  startDate: Date,
  daysCount: number,
) {
  const persistNutritionPlan = async (
    tx: Prisma.TransactionClient,
    preferUpdate: boolean,
  ) => {
        const planData = {
          userId,
          title: plan.title,
          dailyCalories: plan.dailyCalories,
          proteinG: plan.proteinG,
          fatG: plan.fatG,
          carbsG: plan.carbsG,
          startDate,
          daysCount,
        };
        let planRecord: { id: string } | null = null;
        let persistenceMode: "create" | "update" = "create";

        const existingPlan = await tx.nutritionPlan.findFirst({
          where: {
            userId,
            startDate,
            daysCount,
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });

        if (existingPlan) {
          planRecord = await tx.nutritionPlan.update({
            where: { id: existingPlan.id },
            data: {
              title: plan.title,
              dailyCalories: plan.dailyCalories,
              proteinG: plan.proteinG,
              fatG: plan.fatG,
              carbsG: plan.carbsG,
            },
            select: { id: true },
          });
          persistenceMode = "update";
        } else {
          if (preferUpdate) {
            app.log.info(
              {
                userId,
                startDate: toIsoDateString(startDate),
                daysCount,
              },
              "nutrition plan persistence retry without existing record, attempting create",
            );
          }
          planRecord = await tx.nutritionPlan.create({
            data: planData,
            select: { id: true },
          });
        }

        if (!planRecord) {
          throw createHttpError(500, "NUTRITION_PLAN_PERSIST_FAILED");
        }

        app.log.info(
          {
            userId,
            planId: planRecord.id,
            startDate: toIsoDateString(startDate),
            daysCount,
            persistenceMode,
          },
          "nutrition plan persistence mode",
        );

        await tx.nutritionDay.deleteMany({ where: { planId: planRecord.id } });

        const dayPayloads = plan.days.map((day, index) => {
          const dayId = crypto.randomUUID();
          const meals = day.meals.map((meal) => {
            const mealId = crypto.randomUUID();
            return {
              id: mealId,
              dayId,
              type: meal.type,
              title: meal.title,
              description: meal.description ?? null,
              calories: meal.macros.calories,
              protein: meal.macros.protein,
              carbs: meal.macros.carbs,
              fats: meal.macros.fats,
              imageUrl: (meal as any).imageUrl ?? null,
              ingredients: (meal.ingredients ?? []).map((ingredient) => ({
                id: crypto.randomUUID(),
                mealId,
                name: ingredient.name,
                grams: ingredient.grams,
              })),
            };
          });

          return {
            id: dayId,
            planId: planRecord.id,
            date: parseDateInput(day.date) ?? startDate,
            dayLabel: day.dayLabel,
            order: index,
            meals,
          };
        });

        if (dayPayloads.length > 0) {
          await tx.nutritionDay.createMany({
            data: dayPayloads.map(({ id, planId, date, dayLabel, order }) => ({
              id,
              planId,
              date,
              dayLabel,
              order,
            })),
          });
        }

        const mealPayloads = dayPayloads.flatMap((day) =>
          day.meals.map(({ ingredients, ...meal }) => meal),
        );
        if (mealPayloads.length > 0) {
          await tx.nutritionMeal.createMany({
            data: mealPayloads.map((meal) => ({
              id: meal.id,
              dayId: meal.dayId,
              type: meal.type,
              title: meal.title,
              description: meal.description,
              calories: meal.calories,
              protein: meal.protein,
              carbs: meal.carbs,
              fats: meal.fats,
              imageUrl: meal.imageUrl,
            })),
          });
        }

        const ingredientPayloads = dayPayloads.flatMap((day) =>
          day.meals.flatMap((meal) => meal.ingredients),
        );
        if (ingredientPayloads.length > 0) {
          await tx.nutritionIngredient.createMany({
            data: ingredientPayloads.map((ingredient) => ({
              id: ingredient.id,
              mealId: ingredient.mealId,
              name: ingredient.name,
              grams: ingredient.grams,
            })),
          });
        }
        return planRecord;
      };

  const runPersist = async (preferUpdate: boolean) => {
    if ("$transaction" in db && typeof db.$transaction === "function") {
      return db.$transaction(
        (tx) => persistNutritionPlan(tx, preferUpdate),
        { maxWait: 30000, timeout: 30000 },
      );
    }
    return persistNutritionPlan(db as Prisma.TransactionClient, preferUpdate);
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await runPersist(attempt > 0);
    } catch (error) {
      const typed = error as Prisma.PrismaClientKnownRequestError;
      if (typed.code === "P2002" && attempt === 0) {
        app.log.info(
          {
            userId,
            prismaCode: typed.code,
            target: Array.isArray(
              (typed.meta as { target?: unknown } | undefined)?.target,
            )
              ? (typed.meta as { target?: string[] }).target
              : (typed.meta as { target?: unknown } | undefined)?.target,
            startDate: toIsoDateString(startDate),
            daysCount,
            attempt,
          },
          "nutrition plan unique conflict detected, retrying persistence with a fresh transaction",
        );
        continue;
      }
      if (typed.code === "P2002") {
        throw createHttpError(409, "NUTRITION_PLAN_CONFLICT");
      }
      throw error;
    }
  }

  throw createHttpError(500, "NUTRITION_PLAN_PERSIST_FAILED");
}

async function persistTrainingPlanWithClient(
  tx: Prisma.TransactionClient,
  userId: string,
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  startDate: Date,
  daysCount: number,
  request: {
    goal: z.infer<typeof aiTrainingSchema>["goal"];
    daysPerWeek: number;
    level?: z.infer<typeof aiTrainingSchema>["level"];
    experienceLevel?: z.infer<typeof aiGenerateTrainingSchema>["experienceLevel"];
    focus?: z.infer<typeof aiTrainingSchema>["focus"];
    equipment?: z.infer<typeof aiTrainingSchema>["equipment"];
  },
) {
  const resolvedLevel =
    request.level ??
    (request.experienceLevel
      ? mapExperienceLevelToTrainingPlanLevel(request.experienceLevel)
      : undefined) ??
    "beginner";

  const basePlanData = {
    userId,
    title: plan.title,
    goal: request.goal,
    level: resolvedLevel,
    daysPerWeek: request.daysPerWeek,
    focus: request.focus ?? "full",
    equipment: request.equipment ?? "gym",
    startDate,
    daysCount,
  };

  const planData = {
    ...basePlanData,
    ...(typeof plan.notes === "string" ? { notes: plan.notes } : {}),
  };

  const existingPlan = await tx.trainingPlan.findFirst({
    where: {
      userId,
      startDate,
      daysCount,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const persistenceMode: "create" | "update" = existingPlan
    ? "update"
    : "create";
  const planRecord = existingPlan
    ? await tx.trainingPlan.update({
        where: { id: existingPlan.id },
        data: planData,
        select: { id: true },
      })
    : await tx.trainingPlan.create({ data: planData, select: { id: true } });

  app.log.info(
    {
      userId,
      planId: planRecord.id,
      startDate: toIsoDateString(startDate),
      daysCount,
      persistenceMode,
    },
    "training plan persistence mode",
  );

  await tx.trainingDay.deleteMany({ where: { planId: planRecord.id } });

  for (const [index, day] of plan.days.entries()) {
    await tx.trainingDay.create({
      data: {
        planId: planRecord.id,
        date: parseDateInput(day.date) ?? startDate,
        label: day.label,
        focus: day.focus,
        duration: day.duration,
        order: index,
        exercises: {
          create: day.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId ?? null,
            imageUrl:
              typeof exercise.imageUrl === "string" ? exercise.imageUrl : null,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            tempo: exercise.tempo,
            rest: exercise.rest,
            notes: exercise.notes,
          })),
        },
      },
    });
  }

  return planRecord;
}

async function saveTrainingPlan(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  startDate: Date,
  daysCount: number,
  request: {
    goal: z.infer<typeof aiTrainingSchema>["goal"];
    daysPerWeek: number;
    level?: z.infer<typeof aiTrainingSchema>["level"];
    experienceLevel?: z.infer<typeof aiGenerateTrainingSchema>["experienceLevel"];
    focus?: z.infer<typeof aiTrainingSchema>["focus"];
    equipment?: z.infer<typeof aiTrainingSchema>["equipment"];
  },
) {
  const persistPlan = async () => {
    if ("$transaction" in db && typeof db.$transaction === "function") {
      return db.$transaction((tx) =>
        persistTrainingPlanWithClient(
          tx,
          userId,
          plan,
          startDate,
          daysCount,
          request,
        ),
      );
    }
    return persistTrainingPlanWithClient(
      db as Prisma.TransactionClient,
      userId,
      plan,
      startDate,
      daysCount,
      request,
    );
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await persistPlan();
    } catch (error) {
      const typed = error as Prisma.PrismaClientKnownRequestError;
      if (typed.code === "P2002" && attempt === 0) {
        app.log.info(
          {
            userId,
            prismaCode: typed.code,
            target: Array.isArray(
              (typed.meta as { target?: unknown } | undefined)?.target,
            )
              ? (typed.meta as { target?: string[] }).target
              : (typed.meta as { target?: unknown } | undefined)?.target,
            startDate: toIsoDateString(startDate),
            daysCount,
            attempt,
          },
          "training plan unique conflict detected, retrying persistence with a fresh transaction",
        );
        continue;
      }
      if (typed.code === "P2002") {
        throw createHttpError(409, "TRAINING_PLAN_CONFLICT");
      }
      throw error;
    }
  }

  throw createHttpError(500, "TRAINING_PLAN_PERSIST_FAILED");
}

function buildNutritionPrompt(
  data: z.infer<typeof aiNutritionSchema>,
  recipes: RecipePromptItem[] = [],
  strict = false,
  retryFeedback?: string,
) {
  const distribution =
    typeof data.mealDistribution === "string"
      ? data.mealDistribution
      : (data.mealDistribution?.preset ?? "balanced");
  const distributionPercentages =
    typeof data.mealDistribution === "object" &&
    data.mealDistribution?.percentages?.length
      ? `(${data.mealDistribution.percentages.join("%, ")}%)`
      : "";
  const recipeLibrary = formatRecipeLibrary(recipes);
  const mealsPerDay = Math.min(data.mealsPerDay, 6);
  const daysCount = Math.min(data.daysCount ?? 7, 14);
  const mealStructure =
    mealsPerDay === 2
      ? "2 meals: lunch + dinner (o breakfast + dinner)."
      : mealsPerDay === 3
        ? "3 meals: breakfast + lunch + dinner."
        : mealsPerDay === 4
          ? "4 meals: breakfast + lunch + snack + dinner."
          : mealsPerDay === 5
            ? "5 meals: breakfast + snack + lunch + snack + dinner."
            : "6 meals: breakfast + snack + lunch + snack + dinner + snack.";
  return [
    "Eres un nutricionista deportivo senior. Genera un plan semanal compacto en JSON válido.",
    "Devuelve únicamente un objeto JSON válido. Sin texto adicional, sin markdown, sin comentarios.",
    "El JSON debe respetar exactamente este esquema:",
    '{"title":string,"startDate":string|null,"dailyCalories":number,"proteinG":number,"fatG":number,"carbsG":number,"days":[{"date":string,"dayLabel":string,"meals":[{"type":string,"recipeId":string|null,"title":string,"description":string|null,"macros":{"calories":number,"protein":number,"carbs":number,"fats":number},"ingredients":array|null}]}],"shoppingList":array|null}',
    "OBLIGATORIO: cada día debe tener EXACTAMENTE el número de meals solicitado (si >6 usa 6).",
    `Estructura de meals: ${mealStructure}`,
    `Genera EXACTAMENTE ${daysCount} días con date (YYYY-MM-DD) desde ${data.startDate ?? "la fecha indicada"}.`,
    "Descripción opcional. Ingredients opcional; si hay receta base, omite ingredients o déjalo vacío.",
    recipeLibrary
      ? "OBLIGATORIO: cada meal debe incluir recipeId existente del catálogo y title debe coincidir con esa receta."
      : "REQUER IMPLEMENTAÇÃO: sin catálogo de foods, usa recipeId null y limita referencias a recipes existentes cuando aplique.",
    "Base mediterránea: verduras, frutas, legumbres, cereales integrales, aceite de oliva, pescado, carne magra y frutos secos.",
    "Evita cantidades absurdas. Porciones realistas y fáciles de cocinar.",
    "Distribuye proteína, carbohidratos y grasas a lo largo del día.",
    strict
      ? "REINTENTO: si los meals por día no coinciden exactamente, la respuesta será rechazada."
      : "",
    recipeLibrary
      ? `OBLIGATORIO: usa solo recipes del catálogo con recipeId válido. No inventes recetas. Usa recipeId y title exactamente como en la biblioteca. Lista:\n${recipeLibrary}`
      : "CATÁLOGO NO DISPONIBLE: responde con comidas simples sin recipeId inventados; se aplicará fallback controlado.",
    "REGLA CATEGORÍA OBLIGATORIA: Usa cada receta SOLO para su categoría indicada. DESAYUNO solo para breakfast. SNACK solo para snack. ALMUERZO/CENA solo para lunch/dinner. NUNCA uses bacalao/pescado para desayuno o snack. NUNCA uses yogur/avena para almuerzo/cena principal.",
    `Perfil: Edad ${data.age}, sexo ${data.sex}, objetivo ${data.goal}.`,
    `Calorías objetivo diarias: ${data.calories}. Comidas/día: ${data.mealsPerDay}.`,
    buildMealKcalGuidance(
      data.calories,
      data.mealsPerDay,
      NUTRITION_MATH_TOLERANCES.twoMealSplitKcalAbsolute,
    ),
    `Restricciones o preferencias: ${data.dietaryRestrictions ?? "ninguna"}.`,
    `Tipo de dieta: ${data.dietType ?? "equilibrada"}.`,
    `Alergias: ${data.allergies?.join(", ") ?? "ninguna"}.`,
    `Preferencias (favoritos): ${data.preferredFoods ?? "ninguna"}.`,
    `Alimentos a evitar: ${data.dislikedFoods ?? "ninguno"}.`,
    `Distribución de comidas: ${distribution} ${distributionPercentages}.`,
    "Cada día debe incluir dayLabel en español (por ejemplo Lunes, Martes, Miércoles).",
    "Usa siempre type y macros en cada comida.",
    "REGLA MATEMÁTICA OBLIGATORIA POR COMIDA: macros.calories = round(4*protein + 4*carbs + 9*fats).",
    "REGLA MATEMÁTICA OBLIGATORIA POR DÍA: la suma de meal.macros.calories de ese día debe ser igual (con desvío mínimo) a dailyCalories.",
    `REGLA MATEMÁTICA OBLIGATORIA GLOBAL: dailyCalories debe ser exactamente ${data.calories}.`,
    "REGLA DE CONSISTENCIA: no dejes comidas con calories incompatibles con sus macros; si ajustas macros, recalcula calories de esa comida.",
    "REGLA DE CIERRE DIARIO: valida proteína, carbohidratos y grasas por día y corrige expected vs actual antes de responder.",
    "REGLA DE VARIEDAD OBLIGATORIA: CADA DÍA debe tener DIFERENTES recetas. Usa una rotación de recetas del catálogo. El mismo recipeId NO puede aparecer en más de un día. Si hay suficientes recetas en el catálogo, NO repitas ninguna. Variar colores, tipos de proteína y vegetales entre días.",
    "REGLA DE VARIACIÓN POR TIPO: breakfast debe variar cada día (diferentes recetas de desayuno). snack debe variar cada día. lunch y dinner deben variar cada día. No usar la misma receta para diferentes tipos de comida (ej: no usar receta de breakfast para snack o dinner).",
    strict
      ? "REINTENTO OBLIGATORIO: corrige explícitamente incoherencias por comida y por día."
      : "",
    strict && retryFeedback
      ? `ERRORES DETECTADOS EN INTENTO PREVIO: ${retryFeedback}`
      : "",
    "Antes de responder, revalida internamente todas las sumas y corrige cualquier desvío numérico.",
    "Los macros diarios (proteinG, fatG, carbsG) deben ser coherentes con dailyCalories.",
    "Incluye title, dailyCalories, proteinG, fatG y carbsG siempre.",
    "Ejemplo EXACTO de JSON (solo ejemplo, respeta tipos y campos):",
    '{"title":"Plan mediterráneo compacto","startDate":"2024-01-01","dailyCalories":2200,"proteinG":140,"fatG":70,"carbsG":250,"days":[{"date":"2024-01-01","dayLabel":"Lunes","meals":[{"type":"breakfast","recipeId":"rec_001","title":"Avena con yogur","macros":{"calories":450,"protein":25,"carbs":45,"fats":18},"ingredients":[{"name":"Avena","grams":60},{"name":"Yogur griego","grams":180}]},{"type":"lunch","recipeId":"rec_002","title":"Pollo con arroz","macros":{"calories":700,"protein":45,"carbs":70,"fats":25},"ingredients":[{"name":"Pollo","grams":160},{"name":"Arroz integral","grams":180}]},{"type":"dinner","recipeId":"rec_003","title":"Salmón con verduras","macros":{"calories":800,"protein":50,"carbs":60,"fats":28},"ingredients":[{"name":"Salmón","grams":160},{"name":"Verduras mixtas","grams":200}]}]}]}',
  ]
    .filter(Boolean)
    .join(" ");
}

function buildTipPrompt(data: z.infer<typeof aiTipSchema>) {
  return [
    "Eres un coach motivacional.",
    `Objetivo: ${data.goal ?? "general"}.`,
    'Salida JSON: {"title":string,"message":string}. Máx 250 tokens.',
  ].join(" ");
}

function extractJson(text: string) {
  try {
    return parseJsonFromText(text) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AiParseError) {
      app.log.warn(
        { raw: error.raw, reason: error.message },
        "ai response parse failed",
      );
    } else {
      app.log.warn({ err: error }, "ai response parse failed");
    }
    throw createHttpError(502, "AI_PARSE_ERROR", {
      message: "La respuesta de IA no es un JSON válido. Intenta nuevamente.",
    });
  }
}

function extractLargestJson(text: string) {
  try {
    return parseLargestJsonFromText(text) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AiParseError) {
      const rawPreview = error.raw.slice(0, 500);
      app.log.warn(
        { rawPreview, reason: error.message },
        "ai response parse failed (largest json)",
      );
    } else {
      app.log.warn({ err: error }, "ai response parse failed (largest json)");
    }
    throw createHttpError(502, "AI_PARSE_ERROR", {
      message: "La respuesta de IA no es un JSON válido. Intenta nuevamente.",
    });
  }
}

function extractTopLevelJson(text: string) {
  try {
    return parseTopLevelJsonFromText(text) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AiParseError) {
      const rawPreview = error.raw.slice(0, 500);
      app.log.warn(
        { rawPreview, reason: error.message },
        "ai response parse failed (top-level json)",
      );
    } else {
      app.log.warn({ err: error }, "ai response parse failed (top-level json)");
    }
    throw createHttpError(502, "AI_PARSE_ERROR", {
      message: "La respuesta de IA no es un JSON válido. Intenta nuevamente.",
    });
  }
}

function buildTrainingDayIndices(totalDays: number, workoutDays: number) {
  if (workoutDays <= 1) return [0];
  const normalizedTotal = Math.max(totalDays, workoutDays);
  const lastIndex = normalizedTotal - 1;
  const step = lastIndex / (workoutDays - 1);
  const indices = Array.from({ length: workoutDays }, (_, index) =>
    Math.round(index * step),
  );
  for (let i = 1; i < indices.length; i += 1) {
    if (indices[i] <= indices[i - 1]) {
      indices[i] = indices[i - 1] + 1;
    }
  }
  return indices;
}

function normalizeTrainingPlanDays(
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  startDate: Date,
  daysCount: number,
  daysPerWeek: number,
) {
  const indices = buildTrainingDayIndices(
    daysCount,
    plan.days.length || daysPerWeek,
  );
  const neededDays = Math.max(daysCount, indices[indices.length - 1] + 1);
  const dates = buildDateRange(startDate, neededDays);
  const daysWithDates = plan.days.map((day, index) => ({
    ...day,
    date: dates[indices[index] ?? 0],
  }));
  return {
    ...plan,
    startDate: toIsoDateString(startDate),
    days: daysWithDates,
  };
}

function parseTrainingPlanPayload(
  payload: Record<string, unknown>,
  startDate: Date,
  daysCount: number,
  daysPerWeek: number,
) {
  try {
    const maybeSchema = payload["schema"];
    const unwrapped =
      maybeSchema && typeof maybeSchema === "object"
        ? (maybeSchema as Record<string, unknown>)
        : payload;

    const parsed = aiTrainingPlanResponseSchema.parse(unwrapped);

    return normalizeTrainingPlanDays(parsed, startDate, daysCount, daysPerWeek);
  } catch (error) {
    app.log.warn({ err: error, payload }, "ai training response invalid");
    throw createHttpError(502, "AI_PARSE_ERROR");
  }
}

function assertTrainingMatchesRequest(
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  expectedDays: number,
) {
  if (plan.days.length !== expectedDays) {
    if (process.env.NODE_ENV !== "production") {
      app.log.warn(
        { expectedDays, actualDays: plan.days.length, title: plan.title },
        "training plan days mismatch",
      );
    }
    throw createHttpError(502, "AI_PARSE_ERROR", {
      expectedDays,
      actualDays: plan.days.length,
    });
  }
}

function normalizeNutritionPlanDays(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  startDate: Date,
  daysCount: number,
): z.infer<typeof aiNutritionPlanResponseSchema> {
  const normalized = normalizeNutritionPlanDaysWithLabels(
    plan,
    startDate,
    daysCount,
  );

  if (normalized.alignmentIssues.length > 0) {
    app.log.info(
      {
        mismatchedOrMissingDates: normalized.alignmentIssues.slice(0, 7),
        totalIssues: normalized.alignmentIssues.length,
      },
      "nutrition day/date alignment normalized",
    );
  }

  return normalized.plan;
}

function normalizeNutritionMealsPerDay(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  expectedMealsPerDay: number,
): z.infer<typeof aiNutritionPlanResponseSchema> {
  if (expectedMealsPerDay <= 0) return plan;
  const days = plan.days.map((day) => {
    const baseMeals = day.meals.map((meal) => ({
      ...meal,
      macros: { ...meal.macros },
      ingredients: meal.ingredients
        ? meal.ingredients.map((ingredient) => ({ ...ingredient }))
        : null,
    }));
    if (baseMeals.length === expectedMealsPerDay) {
      return { ...day, meals: baseMeals };
    }
    if (baseMeals.length > expectedMealsPerDay) {
      return { ...day, meals: baseMeals.slice(0, expectedMealsPerDay) };
    }
    const meals = [...baseMeals];
    let index = 0;
    while (meals.length < expectedMealsPerDay && baseMeals.length > 0) {
      const source = baseMeals[index % baseMeals.length];
      meals.push({
        ...source,
        macros: { ...source.macros },
        ingredients: source.ingredients
          ? source.ingredients.map((ingredient) => ({ ...ingredient }))
          : null,
      });
      index += 1;
    }
    return { ...day, meals };
  });
  return { ...plan, days };
}

function logNutritionMealsPerDay(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  expectedMealsPerDay: number,
  stage: "before_normalize" | "after_normalize",
) {
  app.log.info(
    {
      expectedMealsPerDay,
      mealsPerDay: plan.days.map((day) => day.meals.length),
      title: plan.title,
      stage,
    },
    "nutrition plan meals per day",
  );
}

function roundNutritionGrams(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeNutritionCaloriesPerDay(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  targetKcal: number,
): z.infer<typeof aiNutritionPlanResponseSchema> {
  const days = plan.days.map((day) => {
    const meals = day.meals.map((meal) => ({
      ...meal,
      macros: { ...meal.macros },
      ingredients: meal.ingredients
        ? meal.ingredients.map((ingredient) => ({ ...ingredient }))
        : null,
    }));

    if (meals.length === 0) {
      return { ...day, meals };
    }

    const totalCalories = meals.reduce(
      (acc, meal) => acc + Math.max(0, meal.macros.calories),
      0,
    );
    const fallbackShare = 1 / meals.length;
    let assignedCalories = 0;

    const normalizedMeals = meals.map((meal, index) => {
      if (index === meals.length - 1) {
        const calories = targetKcal - assignedCalories;
        return {
          ...meal,
          macros: {
            ...meal.macros,
            calories,
          },
        };
      }

      const share =
        totalCalories > 0
          ? Math.max(0, meal.macros.calories) / totalCalories
          : fallbackShare;
      const calories = Math.round(targetKcal * share);
      assignedCalories += calories;
      return {
        ...meal,
        macros: {
          ...meal.macros,
          calories,
        },
      };
    });

    return { ...day, meals: normalizedMeals };
  });

  return {
    ...plan,
    dailyCalories: targetKcal,
    days,
  };
}

function normalizeNutritionMacrosPerDay(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  macroTargets?:
    | z.infer<typeof aiGenerateNutritionSchema>["macroTargets"]
    | null,
): z.infer<typeof aiNutritionPlanResponseSchema> {
  if (!macroTargets) return plan;

  const days = plan.days.map((day) => {
    const meals = day.meals.map((meal) => ({
      ...meal,
      macros: { ...meal.macros },
      ingredients: meal.ingredients
        ? meal.ingredients.map((ingredient) => ({ ...ingredient }))
        : null,
    }));

    if (meals.length === 0) {
      return { ...day, meals };
    }

    const totalCalories = meals.reduce(
      (acc, meal) => acc + Math.max(0, meal.macros.calories),
      0,
    );
    const fallbackShare = 1 / meals.length;
    let assignedProtein = 0;
    let assignedCarbs = 0;
    let assignedFats = 0;

    const normalizedMeals = meals.map((meal, index) => {
      if (index === meals.length - 1) {
        const protein = roundNutritionGrams(
          macroTargets.proteinG - assignedProtein,
        );
        const carbs = roundNutritionGrams(macroTargets.carbsG - assignedCarbs);
        const fats = roundNutritionGrams(macroTargets.fatsG - assignedFats);

        return {
          ...meal,
          macros: {
            calories: Math.round(protein * 4 + carbs * 4 + fats * 9),
            protein,
            carbs,
            fats,
          },
        };
      }

      const share =
        totalCalories > 0
          ? Math.max(0, meal.macros.calories) / totalCalories
          : fallbackShare;
      const protein = roundNutritionGrams(macroTargets.proteinG * share);
      const carbs = roundNutritionGrams(macroTargets.carbsG * share);
      const fats = roundNutritionGrams(macroTargets.fatsG * share);

      assignedProtein += protein;
      assignedCarbs += carbs;
      assignedFats += fats;

      return {
        ...meal,
        macros: {
          calories: Math.round(protein * 4 + carbs * 4 + fats * 9),
          protein,
          carbs,
          fats,
        },
      };
    });

    return { ...day, meals: normalizedMeals };
  });

  return {
    ...plan,
    proteinG: macroTargets.proteinG,
    carbsG: macroTargets.carbsG,
    fatG: macroTargets.fatsG,
    days,
  };
}

function parseNutritionPlanPayload(
  payload: Record<string, unknown>,
  startDate: Date,
  daysCount: number,
) {
  try {
    return normalizeNutritionPlanDays(
      aiNutritionPlanResponseSchema.parse(payload),
      startDate,
      daysCount,
    );
  } catch (error) {
    app.log.warn({ err: error, payload }, "ai nutrition response invalid");
    throw createHttpError(400, "INVALID_AI_OUTPUT", {
      reasonCode: "SCHEMA_PARSE",
      details: {
        parserError:
          error instanceof z.ZodError ? error.flatten() : String(error),
      },
    });
  }
}

function assertNutritionMatchesRequest(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  expectedMealsPerDay: number,
  expectedDays: number,
) {
  if (plan.days.length !== expectedDays) {
    if (process.env.NODE_ENV !== "production") {
      app.log.warn(
        { expectedDays, actualDays: plan.days.length, title: plan.title },
        "nutrition plan days mismatch",
      );
    }
    throw createHttpError(400, "INVALID_AI_OUTPUT", {
      reasonCode: "MISSING_FIELDS",
      details: { expectedDays, actualDays: plan.days.length },
    });
  }
  const invalid = plan.days.find(
    (day) => day.meals.length !== expectedMealsPerDay,
  );
  if (invalid) {
    if (process.env.NODE_ENV !== "production") {
      app.log.warn(
        {
          expectedMealsPerDay,
          actualMealsPerDay: invalid.meals.length,
          dayLabel: invalid.dayLabel,
        },
        "nutrition plan meals mismatch",
      );
    }
    throw createHttpError(400, "INVALID_AI_OUTPUT", {
      reasonCode: "MISSING_FIELDS",
      details: {
        expectedMealsPerDay,
        actualMealsPerDay: invalid.meals.length,
        dayLabel: invalid.dayLabel,
      },
    });
  }
}

function getNutritionInvalidOutputDebug(error: unknown) {
  const typed = error as {
    debug?: Record<string, unknown>;
    code?: string;
    message?: string;
  };
  const reason = typed.debug?.reason;
  if (typed.debug?.reasonCode && typed.debug?.details) {
    return {
      cause: "INVALID_AI_OUTPUT",
      reasonCode: typed.debug.reasonCode,
      details: typed.debug.details,
    };
  }
  if (reason === "MEALS_PER_DAY_MISMATCH" || reason === "DAY_COUNT_MISMATCH") {
    return {
      cause: "INVALID_AI_OUTPUT",
      reasonCode: "MISSING_FIELDS",
      details: typed.debug ?? {},
    };
  }
  if (typeof reason === "string" && reason.includes("MISMATCH")) {
    return {
      cause: "INVALID_AI_OUTPUT",
      reasonCode: "MATH_MISMATCH",
      details: {
        ...(typed.debug ?? {}),
        persisted: false,
      },
    };
  }
  if (typed.code === "AI_PARSE_ERROR") {
    return {
      cause: "INVALID_AI_OUTPUT",
      reasonCode: "SCHEMA_PARSE",
      details: { message: typed.message ?? "AI_PARSE_ERROR" },
    };
  }
  return {
    cause: "INVALID_AI_OUTPUT",
    reasonCode: "REQUEST_MISMATCH",
    details: typed.debug ?? {
      message: typed.message ?? "Unknown validation error",
    },
  };
}

function summarizeNutritionMath(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
) {
  return {
    dailyCalories: plan.dailyCalories,
    totalDays: plan.days.length,
    days: plan.days.map((day) => {
      const totals = day.meals.reduce(
        (acc, meal) => {
          acc.calories += meal.macros.calories;
          acc.protein += meal.macros.protein;
          acc.carbs += meal.macros.carbs;
          acc.fats += meal.macros.fats;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0 },
      );
      return {
        dayLabel: day.dayLabel,
        meals: day.meals.length,
        totals,
      };
    }),
  };
}

function buildRetryFeedback(error: unknown) {
  const typed = error as { debug?: Record<string, unknown> };
  const debug = typed?.debug;
  if (!debug || typeof debug !== "object") return "";

  const targetedInstruction = buildTwoMealSplitRetryInstruction(debug);
  const genericFeedback = buildRetryFeedbackFromContext(debug);
  return [targetedInstruction, genericFeedback]
    .filter((item) => item.length > 0)
    .join(" ");
}

function assertNutritionRequestMapping(
  payload: z.infer<typeof aiGenerateNutritionSchema>,
  nutritionInput: z.infer<typeof aiNutritionSchema>,
  expectedDaysCount: number,
) {
  const mismatches: Record<string, unknown> = {};
  if (payload.startDate && nutritionInput.startDate !== payload.startDate) {
    mismatches.startDate = {
      expected: payload.startDate,
      actual: nutritionInput.startDate,
    };
  }
  if (nutritionInput.daysCount !== expectedDaysCount) {
    mismatches.daysCount = {
      expected: expectedDaysCount,
      actual: nutritionInput.daysCount,
    };
  }
  if (payload.dietType && nutritionInput.dietType !== payload.dietType) {
    mismatches.dietType = {
      expected: payload.dietType,
      actual: nutritionInput.dietType,
    };
  }
  if (Object.keys(mismatches).length > 0) {
    throw createHttpError(400, "INVALID_AI_OUTPUT", {
      reasonCode: "REQUEST_MISMATCH",
      details: mismatches,
    });
  }
}

function assertTrainingLevelConsistency(
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  experienceLevel: z.infer<typeof aiGenerateTrainingSchema>["experienceLevel"],
) {
  const minExercises = experienceLevel === "advanced" ? 4 : 3;
  const maxExercises = experienceLevel === "beginner" ? 4 : 5;
  for (const day of plan.days) {
    if (
      day.exercises.length < minExercises ||
      day.exercises.length > maxExercises
    ) {
      throw createHttpError(400, "INVALID_AI_OUTPUT", {
        reason: "TRAINING_LEVEL_VOLUME_MISMATCH",
        experienceLevel,
        minExercises,
        maxExercises,
        dayLabel: day.label,
        actualExercises: day.exercises.length,
      });
    }
  }
}

const animalKeywords = {
  meat: ["pollo", "res", "ternera", "cerdo", "pavo", "jamon", "jamón", "carne"],
  seafood: [
    "atun",
    "atún",
    "salmón",
    "salmon",
    "merluza",
    "bacalao",
    "camar",
    "gamba",
    "langost",
  ],
  dairyOrEgg: ["huevo", "huevos", "queso", "leche", "yogur", "yogurt"],
};

function assertDietaryPreferenceCompliance(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  dietaryPref: z.infer<typeof aiGenerateNutritionSchema>["dietaryPrefs"],
) {
  if (!dietaryPref) return;
  for (const day of plan.days) {
    for (const meal of day.meals) {
      const ingredientsText = (meal.ingredients ?? [])
        .map((ingredient) => ingredient.name)
        .join(" ");
      const haystack =
        `${meal.title} ${meal.description ?? ""} ${ingredientsText}`.toLowerCase();
      const hasMeat = animalKeywords.meat.some((keyword) =>
        haystack.includes(keyword),
      );
      const hasSeafood = animalKeywords.seafood.some((keyword) =>
        haystack.includes(keyword),
      );
      const hasDairyOrEgg = animalKeywords.dairyOrEgg.some((keyword) =>
        haystack.includes(keyword),
      );

      if (dietaryPref === "vegetarian" && (hasMeat || hasSeafood)) {
        throw createHttpError(400, "INVALID_AI_OUTPUT", {
          reason: "DIETARY_PREF_VIOLATION",
          dietaryPref,
          dayLabel: day.dayLabel,
          mealTitle: meal.title,
        });
      }
      if (dietaryPref === "vegan" && (hasMeat || hasSeafood || hasDairyOrEgg)) {
        throw createHttpError(400, "INVALID_AI_OUTPUT", {
          reason: "DIETARY_PREF_VIOLATION",
          dietaryPref,
          dayLabel: day.dayLabel,
          mealTitle: meal.title,
        });
      }
      if (dietaryPref === "pescatarian" && hasMeat) {
        throw createHttpError(400, "INVALID_AI_OUTPUT", {
          reason: "DIETARY_PREF_VIOLATION",
          dietaryPref,
          dayLabel: day.dayLabel,
          mealTitle: meal.title,
        });
      }
    }
  }
}

function assertNutritionMath(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  constraints: z.infer<typeof aiGenerateNutritionSchema>,
) {
  const mathIssue = validateNutritionMath(plan, constraints);
  if (mathIssue) {
    throw createHttpError(400, "INVALID_AI_OUTPUT", {
      reason: mathIssue.reason,
      dayLabel: mathIssue.dayLabel,
      mealTitle: mathIssue.mealTitle,
      diff: mathIssue.diff,
      expected: mathIssue.diff.expected,
      actual: mathIssue.diff.actual,
      tolerance: mathIssue.diff.tolerance,
    });
  }

  assertDietaryPreferenceCompliance(plan, constraints.dietaryPrefs);
}

function summarizeTrainingPlan(
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
) {
  return {
    title: plan.title,
    totalDays: plan.days.length,
    totalExercises: plan.days.reduce(
      (acc, day) => acc + day.exercises.length,
      0,
    ),
    dailyFocus: plan.days.map((day) => ({
      label: day.label,
      focus: day.focus,
      exercises: day.exercises.length,
    })),
  };
}

function summarizeNutritionPlan(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
) {
  return {
    title: plan.title,
    totalDays: plan.days.length,
    mealsPerDay: plan.days[0]?.meals.length ?? 0,
    dailyCalories: plan.dailyCalories,
    macros: { proteinG: plan.proteinG, carbsG: plan.carbsG, fatsG: plan.fatG },
  };
}

const exerciseMetadataByName: Record<
  string,
  {
    equipment?: string;
    primaryMuscles: string[];
    secondaryMuscles: string[];
    description?: string;
  }
> = {
  sentadilla: {
    equipment: "Barra",
    primaryMuscles: ["Piernas"],
    secondaryMuscles: ["Glúteos"],
    description: "Mantén la espalda neutra y controla la profundidad.",
  },
  "press banca": {
    equipment: "Barra",
    primaryMuscles: ["Pecho"],
    secondaryMuscles: ["Tríceps"],
    description: "Alinea los hombros y baja con control.",
  },
  "peso muerto rumano": {
    equipment: "Barra",
    primaryMuscles: ["Femoral"],
    secondaryMuscles: ["Glúteos"],
    description: "Cadera atrás y rodillas levemente flexionadas.",
  },
  "remo con barra": {
    equipment: "Barra",
    primaryMuscles: ["Espalda"],
    secondaryMuscles: ["Bíceps"],
    description: "Tronco inclinado y abdomen activo.",
  },
  "press militar": {
    equipment: "Barra o mancuernas",
    primaryMuscles: ["Hombros"],
    secondaryMuscles: ["Tríceps"],
    description: "Contrae el core para evitar arqueo.",
  },
  "hip thrust": {
    equipment: "Banco",
    primaryMuscles: ["Glúteos"],
    secondaryMuscles: [],
    description: "Extiende cadera y pausa arriba.",
  },
  dominadas: {
    equipment: "Barra fija",
    primaryMuscles: ["Espalda"],
    secondaryMuscles: ["Bíceps"],
    description: "Controla el descenso y evita balanceos.",
  },
  fondos: {
    equipment: "Paralelas",
    primaryMuscles: ["Pecho"],
    secondaryMuscles: ["Tríceps"],
    description: "Inclina el torso para enfatizar el pecho.",
  },
};

function formatExerciseCatalogForPrompt(
  catalog: ExerciseCatalogItem[],
  limit = 80,
) {
  if (!catalog.length) return "";
  return catalog
    .slice(0, limit)
    .map((item) => `${item.id}: ${item.name}`)
    .join(" | ");
}

function ensureTrainingPlanUsesCatalogExerciseIds(
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  catalog: ExerciseCatalogItem[],
) {
  const invalidExerciseIds = findInvalidTrainingPlanExerciseIds(plan, catalog);

  if (invalidExerciseIds.length > 0) {
    throw createHttpError(400, "INVALID_AI_OUTPUT", {
      message: "Generated plan includes missing or unknown exerciseId values.",
      invalidExerciseIds,
    });
  }
}

function resolveTrainingPlanExerciseIds(
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  catalog: ExerciseCatalogItem[],
) {
  ensureTrainingPlanUsesCatalogExerciseIds(plan, catalog);
  const { plan: resolvedPlan, unresolved } =
    resolveTrainingPlanExerciseIdsWithCatalog(plan, catalog);

  if (unresolved.length > 0) {
    throw createHttpError(400, "INVALID_AI_OUTPUT", {
      message:
        "Generated plan includes exercises that do not exist in the library.",
      unresolvedExercises: unresolved,
    });
  }

  return resolvedPlan;
}

function resolveTrainingPlanWithDeterministicFallback(
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  catalog: ExerciseCatalogItem[],
  input: Pick<
    z.infer<typeof aiTrainingSchema>,
    "daysPerWeek" | "level" | "goal" | "equipment"
  >,
  startDate: Date,
  logContext: { userId: string; route: string },
) {
  try {
    return resolveTrainingPlanExerciseIds(plan, catalog);
  } catch (error) {
    const typed = error as { code?: string };
    if (typed.code !== "INVALID_AI_OUTPUT") {
      throw error;
    }

    app.log.warn(
      {
        userId: logContext.userId,
        route: logContext.route,
        cause: "invalid_catalog_exercise_id",
      },
      "training plan has invalid exercise ids, using deterministic fallback",
    );

    const fallbackPlan = buildDeterministicTrainingFallbackPlan(
      {
        daysPerWeek: input.daysPerWeek,
        level: input.level,
        goal: input.goal,
        startDate,
        equipment: input.equipment,
      },
      catalog,
    );

    return resolveTrainingPlanExerciseIds(fallbackPlan, catalog);
  }
}

function normalizePlanForExerciseResolution(plan: Record<string, unknown>) {
  const rawDays = Array.isArray((plan as { days?: unknown }).days)
    ? ((plan as { days: unknown[] }).days ?? [])
    : [];

  return {
    ...plan,
    days: rawDays.map((day, dayIndex) => {
      const typedDay = (day ?? {}) as {
        label?: unknown;
        exercises?: unknown;
      };
      const rawExercises = Array.isArray(typedDay.exercises)
        ? typedDay.exercises
        : [];

      return {
        ...(typedDay as Record<string, unknown>),
        label:
          typeof typedDay.label === "string"
            ? typedDay.label
            : `Day ${dayIndex + 1}`,
        exercises: rawExercises.map((exercise) => {
          const typedExercise = (exercise ?? {}) as {
            name?: unknown;
            exerciseId?: unknown;
            imageUrl?: unknown;
            exercise?: { name?: unknown; imageUrl?: unknown } | null;
          };
          const fallbackName =
            typeof typedExercise.exercise?.name === "string"
              ? typedExercise.exercise.name
              : typeof typedExercise.name === "string"
                ? typedExercise.name
                : "Unknown exercise";

          return {
            ...(typedExercise as Record<string, unknown>),
            name: fallbackName,
            exerciseId:
              typeof typedExercise.exerciseId === "string"
                ? typedExercise.exerciseId
                : null,
            imageUrl:
              typeof typedExercise.imageUrl === "string"
                ? typedExercise.imageUrl
                : typeof typedExercise.exercise?.imageUrl === "string"
                  ? typedExercise.exercise.imageUrl
                  : null,
          };
        }),
      };
    }),
  };
}

function serializeTrainingPlanDaysWithNullableExerciseId(
  plan: Record<string, unknown>,
) {
  const rawDays = Array.isArray((plan as { days?: unknown }).days)
    ? ((plan as { days: unknown[] }).days ?? [])
    : null;

  if (!rawDays) {
    return plan;
  }

  return {
    ...plan,
    days: rawDays.map((day) => {
      const typedDay = (day ?? {}) as {
        exercises?: unknown;
      };
      const rawExercises = Array.isArray(typedDay.exercises)
        ? typedDay.exercises
        : [];

      return {
        ...(typedDay as Record<string, unknown>),
        exercises: rawExercises.map((exercise) => {
          const typedExercise = (exercise ?? {}) as {
            exerciseId?: unknown;
          };

          return {
            ...(typedExercise as Record<string, unknown>),
            exerciseId:
              typeof typedExercise.exerciseId === "string"
                ? typedExercise.exerciseId
                : null,
          };
        }),
      };
    }),
  };
}

async function enrichTrainingPlanWithExerciseLibraryData(
  plan: Record<string, unknown>,
) {
  if (!plan || !Array.isArray((plan as { days?: unknown }).days)) {
    return plan;
  }

  const catalog = await fetchExerciseCatalog(prisma);
  const normalizedPlan = normalizePlanForExerciseResolution(plan);
  const { plan: resolvedPlan } = resolveTrainingPlanExerciseIdsWithCatalog(
    normalizedPlan,
    catalog,
  );

  return serializeTrainingPlanDaysWithNullableExerciseId(resolvedPlan);
}

function logTrainingPlanUnexpectedError(
  request: FastifyRequest,
  error: unknown,
  context: string,
) {
  request.log.error(
    {
      reqId: request.id,
      err: error,
    },
    context,
  );
}

type ExerciseMetadata = {
  equipment?: string;
  description?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  mainMuscleGroup?: string;
  secondaryMuscleGroups?: string[];
};

function getExerciseMetadata(name: string) {
  return exerciseMetadataByName[name.toLowerCase()];
}

function hasExerciseClient() {
  return (
    typeof (prisma as PrismaClient & { exercise?: unknown }).exercise !==
    "undefined"
  );
}

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function upsertExerciseRecord(
  name: string,
  metadata?: ExerciseMetadata,
  options?: { source?: string; sourceId?: string; imageUrls?: string[] },
) {
  const now = new Date();
  const slug = slugifyName(name);

  const mainMuscleGroup =
    metadata?.mainMuscleGroup?.trim() ||
    (metadata?.primaryMuscles && metadata.primaryMuscles.length > 0
      ? metadata.primaryMuscles[0]
      : "General");

  const secondaryMuscleGroups =
    metadata?.secondaryMuscleGroups ?? metadata?.secondaryMuscles ?? [];

  if (hasExerciseClient()) {
    await prisma.exercise.upsert({
      where: { slug }, // ahora usamos el slug como clave única
      create: {
        slug,
        name,
        source: options?.source?.trim() || null,
        sourceId: options?.sourceId?.trim() || null,
        mainMuscleGroup,
        secondaryMuscleGroups,
        equipment: metadata?.equipment ?? null,
        imageUrls: options?.imageUrls ?? [],
        description: metadata?.description ?? null,
        technique: null,
        tips: null,
        isUserCreated: false,
      },
      update: {
        name,
        source: options?.source?.trim() || undefined,
        sourceId: options?.sourceId?.trim() || undefined,
        mainMuscleGroup,
        secondaryMuscleGroups,
        equipment: metadata?.equipment ?? undefined,
        imageUrls: options?.imageUrls ?? undefined,
        description: metadata?.description ?? undefined,
      },
    });
    return;
  }

  // rama fallback con SQL crudo (prácticamente no se usará ya que prisma.exercise existe)
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "Exercise" (
      "id",
      "slug",
      "name",
      "source",
      "sourceId",
      "mainMuscleGroup",
      "secondaryMuscleGroups",
      "equipment",
      "imageUrls",
      "description",
      "technique",
      "tips",
      "isUserCreated",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${slug},
      ${name},
      ${options?.source?.trim() || null},
      ${options?.sourceId?.trim() || null},
      ${mainMuscleGroup},
      ${secondaryMuscleGroups},
      ${metadata?.equipment ?? null},
      ${options?.imageUrls ?? []},
      ${metadata?.description ?? null},
      ${null},
      ${null},
      ${false},
      ${now},
      ${now}
    )
    ON CONFLICT ("slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "source" = COALESCE(EXCLUDED."source", "Exercise"."source"),
      "sourceId" = COALESCE(EXCLUDED."sourceId", "Exercise"."sourceId"),
      "mainMuscleGroup" = EXCLUDED."mainMuscleGroup",
      "secondaryMuscleGroups" = EXCLUDED."secondaryMuscleGroups",
      "equipment" = EXCLUDED."equipment",
      "imageUrls" = EXCLUDED."imageUrls",
      "description" = EXCLUDED."description",
      "updatedAt" = EXCLUDED."updatedAt"
  `);
}

function buildExerciseFilters(params: {
  q?: string;
  primaryMuscle?: string;
  equipment?: string;
}): Prisma.Sql {
  const filters: Prisma.Sql[] = [];

  if (params.q) {
    filters.push(Prisma.sql`name ILIKE ${`%${params.q}%`}`);
  }

  if (params.equipment && params.equipment !== "all") {
    filters.push(Prisma.sql`equipment = ${params.equipment}`);
  }

  if (params.primaryMuscle && params.primaryMuscle !== "all") {
    filters.push(
      Prisma.sql`("mainMuscleGroup" = ${params.primaryMuscle} OR "secondaryMuscleGroups" @> ARRAY[${params.primaryMuscle}]::text[])`,
    );
  }

  const whereClause =
    filters.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`
      : Prisma.sql``;

  return whereClause;
}

async function listExercises(params: {
  q?: string;
  primaryMuscle?: string;
  equipment?: string;
  limit: number;
  offset: number;
  cursor?: string;
  take?: number;
}) {
  if (hasExerciseClient()) {
    const where: Prisma.ExerciseWhereInput = {};
    if (params.q) {
      where.name = { contains: params.q, mode: "insensitive" };
    }
    if (params.equipment && params.equipment !== "all") {
      where.equipment = params.equipment;
    }
    if (params.primaryMuscle && params.primaryMuscle !== "all") {
      where.OR = [
        { mainMuscleGroup: params.primaryMuscle },
        { secondaryMuscleGroups: { has: params.primaryMuscle } },
      ];
    }

    const take = params.take ?? params.limit;
    const findManyArgs: Prisma.ExerciseFindManyArgs = {
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        source: true,
        equipment: true,
        imageUrls: true,
        description: true,
        technique: true,
        tips: true,
        mainMuscleGroup: true,
        secondaryMuscleGroups: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
      take,
    };

    if (params.cursor) {
      findManyArgs.cursor = { id: params.cursor };
      findManyArgs.skip = 1;
    } else {
      findManyArgs.skip = params.offset;
    }

    const [items, total] = await prisma.$transaction([
      prisma.exercise.findMany({
        where,
        select: {
          id: true,
          sourceId: true,
          slug: true,
          name: true,
          equipment: true,
          imageUrls: true,
          description: true,
          imageUrl: true,
          mediaUrl: true,
          technique: true,
          tips: true,
          mainMuscleGroup: true,
          secondaryMuscleGroups: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: "asc" },
        skip: params.offset,
        take: params.limit,
      }),
      prisma.exercise.count({ where }),
    ]);

    return {
      items: items.map((item) =>
        normalizeExercisePayload({
          ...item,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }),
      ),
      total,
    };
  }

  const whereSql = buildExerciseFilters(params);
  const take = params.take ?? params.limit;
  const hasFilters = Boolean(
    params.q ||
    (params.equipment && params.equipment !== "all") ||
    (params.primaryMuscle && params.primaryMuscle !== "all"),
  );

  const items = await prisma.$queryRaw<ExerciseRow[]>(Prisma.sql`
    SELECT "id", "sourceId", "slug", "name", "equipment", "mainMuscleGroup", "secondaryMuscleGroups", "description", "imageUrls", "imageUrl", "mediaUrl", "technique", "tips", "createdAt", "updatedAt"
    FROM "Exercise"
    ${whereSql}
    ${
      params.cursor
        ? hasFilters
          ? Prisma.sql`AND "id" > ${params.cursor}`
          : Prisma.sql`WHERE "id" > ${params.cursor}`
        : Prisma.sql``
    }
    ORDER BY "id" ASC
    LIMIT ${take}
    OFFSET ${params.cursor ? 0 : params.offset}
  `);
  const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint as count
    FROM "Exercise"
    ${whereSql}
  `);
  const rawCount = totalRows[0]?.count ?? 0n;
  const total =
    typeof rawCount === "bigint" ? Number(rawCount) : Number(rawCount);
  return { items: items.map(normalizeExercisePayload), total };
}

async function getExerciseById(id: string) {
  if (hasExerciseClient()) {
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      select: {
        id: true,
        sourceId: true,
        slug: true,
        name: true,
        source: true,
        equipment: true,
        imageUrls: true,
        description: true,
        imageUrl: true,
        mediaUrl: true,
        technique: true,
        tips: true,
        mainMuscleGroup: true,
        secondaryMuscleGroups: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return exercise
      ? normalizeExercisePayload({
          ...exercise,
          createdAt: exercise.createdAt,
          updatedAt: exercise.updatedAt,
        })
      : null;
  }

  const rows = await prisma.$queryRaw<ExerciseRow[]>(Prisma.sql`
    SELECT "id", "sourceId", "slug", "name", "equipment", "mainMuscleGroup", "secondaryMuscleGroups", "description", "imageUrls", "imageUrl", "mediaUrl", "technique", "tips", "createdAt", "updatedAt"
    FROM "Exercise"
    WHERE "id" = ${id}
    LIMIT 1
  `);
  return rows[0] ? normalizeExercisePayload(rows[0]) : null;
}

async function createExercise(input: z.infer<typeof createExerciseSchema>) {
  const normalizedName = normalizeExerciseName(input.name);
  const slugBase = slugifyName(normalizedName) || `exercise-${Date.now()}`;
  const mainMuscleGroup = input.mainMuscleGroup?.trim() || "General";
  const secondaryMuscleGroups = Array.from(
    new Set(
      (input.secondaryMuscleGroups ?? [])
        .map((muscle) => muscle.trim())
        .filter((muscle) => muscle.length > 0),
    ),
  );

  if (!hasExerciseClient()) {
    throw new Error("EXERCISE_CREATE_NOT_SUPPORTED");
  }

  const created = await prisma.exercise.create({
    data: {
      name: normalizedName,
      slug: `${slugBase}-${Math.random().toString(36).slice(2, 8)}`,
      description: input.description?.trim() || null,
      equipment: input.equipment?.trim() || null,
      mainMuscleGroup,
      secondaryMuscleGroups,
      technique: input.technique?.trim() || null,
      tips: input.tips?.trim() || null,
      isUserCreated: true,
    },
    select: {
      id: true,
      sourceId: true,
      slug: true,
      name: true,
      equipment: true,
      imageUrls: true,
      description: true,
      imageUrl: true,
      mediaUrl: true,
      technique: true,
      tips: true,
      mainMuscleGroup: true,
      secondaryMuscleGroups: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return normalizeExercisePayload({
    ...created,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  });
}

async function upsertExercisesFromPlan(
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
) {
  if (!hasExerciseClient()) {
    app.log.warn("prisma.exercise is unavailable, using raw upsert fallback");
  }
  const names = new Map<string, string>();
  plan.days.forEach((day) => {
    day.exercises.forEach((exercise) => {
      try {
        if (!exercise?.name) {
          app.log.warn(
            { day: day.label, exercise },
            "skipping exercise upsert because name is missing",
          );
          return;
        }
        const normalized = normalizeExerciseName(exercise.name);
        if (!normalized) {
          app.log.warn(
            { day: day.label, name: exercise.name },
            "skipping exercise upsert because normalized name is empty",
          );
          return;
        }
        if (!names.has(normalized)) {
          names.set(normalized, normalized);
        }
      } catch (error) {
        app.log.warn(
          { err: error, day: day.label, exercise },
          "failed to normalize exercise for upsert",
        );
      }
    });
  });
  const uniqueNames = Array.from(names.values());
  if (uniqueNames.length === 0) return;
  await Promise.all(
    uniqueNames.map(async (name) => {
      const metadata = getExerciseMetadata(name);
      try {
        await upsertExerciseRecord(name, metadata);
      } catch (error) {
        app.log.warn({ err: error, name }, "exercise upsert failed");
      }
    }),
  );
}

const EXERCISES_100 = [
  "Sentadilla trasera con barra",
  "Sentadilla frontal con barra",
  "Sentadilla goblet",
  "Zancadas caminando",
  "Zancada búlgara",
  "Prensa de piernas",
  "Extensión de cuádriceps",
  "Curl femoral tumbado",
  "Curl femoral sentado",
  "Peso muerto rumano con barra",
  "Peso muerto rumano con mancuernas",
  "Peso muerto convencional",
  "Peso muerto sumo",
  "Hip thrust con barra",
  "Puente de glúteos",
  "Abducción de cadera en máquina",
  "Aducción de cadera en máquina",
  "Elevación de gemelos de pie",
  "Elevación de gemelos sentado",
  "Step-up al banco",
  "Saltos al cajón",
  "Sprint en cinta",
  "Caminata inclinada en cinta",
  "Bicicleta estática",
  "Remo ergómetro",
  "Elíptica",
  "Burpees",
  "Jumping jacks",
  "Plancha frontal",
  "Plancha lateral",
  "Dead bug",
  "Bird dog",
  "Crunch en polea",
  "Elevaciones de piernas colgado",
  "Rueda abdominal",
  "Hollow hold",
  "Press banca con barra",
  "Press banca con mancuernas",
  "Press inclinado con mancuernas",
  "Press declinado",
  "Fondos en paralelas",
  "Flexiones",
  "Flexiones con pies elevados",
  "Aperturas con mancuernas",
  "Cruce de poleas",
  "Pullover con mancuerna",
  "Press militar con barra",
  "Press militar con mancuernas",
  "Press Arnold",
  "Elevaciones laterales",
  "Elevaciones frontales",
  "Pájaros (rear delt fly)",
  "Face pull",
  "Remo al mentón con barra EZ",
  "Encogimientos de trapecio",
  "Dominadas pronas",
  "Dominadas supinas",
  "Jalón al pecho en polea",
  "Jalón con agarre neutro",
  "Remo con barra",
  "Remo con mancuerna a una mano",
  "Remo en polea baja",
  "Remo en máquina",
  "Pull-over en polea",
  "Rack pull",
  "Hiperextensiones lumbares",
  "Buenos días con barra",
  "Curl bíceps con barra",
  "Curl bíceps con barra EZ",
  "Curl alterno con mancuernas",
  "Curl martillo",
  "Curl concentrado",
  "Curl en banco inclinado",
  "Curl en polea",
  "Extensión de tríceps en polea",
  "Jalón de tríceps con cuerda",
  "Press francés con barra EZ",
  "Extensión de tríceps por encima de la cabeza",
  "Fondos en banco",
  "Patada de tríceps",
  "Farmer walk",
  "Kettlebell swing",
  "Sentadilla con salto",
  "Peso muerto con kettlebell",
  "Clean and press con kettlebell",
  "Remo invertido",
  "Press de hombro en máquina",
  "Peck deck",
  "Press de pecho en máquina",
  "Jalón de dorsales en máquina",
  "Remo T-bar",
  "Curl femoral con fitball",
  "Sentadilla hack",
  "Extensión de espalda en banco romano",
  "Elevación de talones unilateral",
  "Ab wheel desde rodillas",
  "Pallof press",
  "Rotación de tronco en polea",
  "Estiramiento de flexor de cadera",
];

function inferExerciseMetadataFromName(name: string): ExerciseMetadata {
  const lower = name.toLowerCase();
  const pick = (value: string) => value;
  const equipment = (() => {
    if (lower.includes("barra ez")) return pick("Barra EZ");
    if (lower.includes("barra")) return pick("Barra");
    if (lower.includes("mancuerna")) return pick("Mancuernas");
    if (lower.includes("máquina") || lower.includes("maquina"))
      return pick("Máquina");
    if (lower.includes("polea")) return pick("Polea");
    if (lower.includes("kettlebell")) return pick("Kettlebell");
    if (lower.includes("cinta")) return pick("Cinta");
    if (lower.includes("bicicleta")) return pick("Bicicleta");
    if (lower.includes("ergómetro") || lower.includes("ergometro"))
      return pick("Remo ergómetro");
    if (lower.includes("elíptica") || lower.includes("eliptica"))
      return pick("Elíptica");
    if (lower.includes("fitball")) return pick("Fitball");
    if (lower.includes("banco")) return pick("Banco");
    if (lower.includes("paralelas")) return pick("Paralelas");
    if (lower.includes("cajón") || lower.includes("cajon"))
      return pick("Cajón");
    return pick("Peso corporal");
  })();

  const mainMuscleGroup = (() => {
    if (
      lower.includes("sentadilla") ||
      lower.includes("prensa") ||
      lower.includes("zancada") ||
      lower.includes("peso muerto") ||
      lower.includes("hip thrust") ||
      lower.includes("glúteos") ||
      lower.includes("gluteos") ||
      lower.includes("gemelos") ||
      lower.includes("hack")
    ) {
      return "Piernas";
    }
    if (
      lower.includes("press banca") ||
      lower.includes("peck deck") ||
      lower.includes("pecho") ||
      lower.includes("fondos") ||
      lower.includes("flexiones")
    ) {
      return "Pecho";
    }
    if (
      lower.includes("press militar") ||
      lower.includes("hombro") ||
      lower.includes("arnold") ||
      lower.includes("elevaciones") ||
      lower.includes("rear delt") ||
      lower.includes("pájaros") ||
      lower.includes("face pull")
    ) {
      return "Hombros";
    }
    if (
      lower.includes("remo") ||
      lower.includes("jalón") ||
      lower.includes("dominadas") ||
      lower.includes("pull-over") ||
      lower.includes("rack pull")
    ) {
      return "Espalda";
    }
    if (
      lower.includes("bíceps") ||
      lower.includes("biceps") ||
      lower.includes("curl")
    ) {
      return "Bíceps";
    }
    if (
      lower.includes("tríceps") ||
      lower.includes("triceps") ||
      lower.includes("press francés") ||
      lower.includes("jalón de tríceps") ||
      lower.includes("patada")
    ) {
      return "Tríceps";
    }
    if (
      lower.includes("plancha") ||
      lower.includes("dead bug") ||
      lower.includes("bird dog") ||
      lower.includes("crunch") ||
      lower.includes("ab wheel") ||
      lower.includes("rueda abdominal") ||
      lower.includes("hollow") ||
      lower.includes("pallof") ||
      lower.includes("rotación") ||
      lower.includes("rotacion")
    ) {
      return "Core";
    }
    if (
      lower.includes("sprint") ||
      lower.includes("caminata") ||
      lower.includes("bicicleta") ||
      lower.includes("ergómetro") ||
      lower.includes("elíptica") ||
      lower.includes("burpees") ||
      lower.includes("jumping jacks")
    ) {
      return "Cardio";
    }
    return "General";
  })();

  const secondaryMuscleGroups = (() => {
    if (mainMuscleGroup === "Piernas") {
      return ["Glúteos", "Core"];
    }
    if (mainMuscleGroup === "Pecho") {
      return ["Tríceps", "Hombros"];
    }
    if (mainMuscleGroup === "Espalda") {
      return ["Bíceps", "Core"];
    }
    if (mainMuscleGroup === "Hombros") {
      return ["Trapecio", "Tríceps"];
    }
    if (mainMuscleGroup === "Bíceps") {
      return ["Antebrazos"];
    }
    if (mainMuscleGroup === "Tríceps") {
      return ["Hombros"];
    }
    if (mainMuscleGroup === "Cardio") {
      return ["Resistencia"];
    }
    if (mainMuscleGroup === "Core") {
      return ["Espalda baja"];
    }
    return [];
  })();

  return {
    equipment,
    mainMuscleGroup,
    secondaryMuscleGroups,
    description: "Mantén técnica controlada y rango de movimiento completo.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECIPE SEED DATA (con metadata completa para filtrado y UI)
// ─────────────────────────────────────────────────────────────────────────────
type SeedRecipe = {
  name: string;
  displayName: string;
  tagline: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "pre-workout" | "post-workout";
  dietType: "omnivore" | "pescatarian" | "mediterranean" | "vegetarian" | "vegan" | "dairyFree" | "glutenFree";
  goalFit: "bulk" | "cut" | "maintain" | "all";
  mainIngredient: string;
  cuisine: "mediterranean" | "asian" | "mexican" | "american" | "spanish" | "indian" | "middleEastern" | "italian" | "all";
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  keywords: string[];
  ingredients: Array<{ name: string; grams: number; isMainIngredient: boolean; category: string }>;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servingSize: string;
  servings: number;
  steps?: string[];
  photoUrl?: string;
  imageUrls?: string[];
  source?: string;
};

const RECIPES_100: SeedRecipe[] = [
  // ── BREAKFAST ──────────────────────────────────────────────────────────────
  {
    name: "Salmón con patata y verduras al horno",
    displayName: "Salmón al horno con patata y verduras",
    tagline: "Pescado graso omega-3, carb complejo y verduras en un solo plato.",
    mealType: "lunch", dietType: "pescatarian", goalFit: "all", mainIngredient: "salmon",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "omega-3", "meal-prep", "gluten-free"],
    keywords: ["sin gluten", "sin lactosa", "rico en omega-3"],
    ingredients: [
      { name: "Salmón fresco", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Patata", grams: 200, isMainIngredient: false, category: "carb" },
      { name: "Brócoli", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Pimiento rojo", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Aceite de oliva", grams: 10, isMainIngredient: false, category: "fat" },
    ],
    calories: 620, protein: 42, carbs: 48, fat: 22, prepTimeMinutes: 10, cookTimeMinutes: 30,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Tortilla de claras con espinacas y queso fresco",
    displayName: "Tortilla de claras con espinacas",
    tagline: "Alta en proteína, baja en grasa. Ideal para empezar el día.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "cut", mainIngredient: "eggs",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "low-fat", "quick", "gluten-free"],
    keywords: ["sin gluten", "bajo en grasa", "desayuno proteico"],
    ingredients: [
      { name: "Claras de huevo", grams: 250, isMainIngredient: true, category: "protein" },
      { name: "Espinacas frescas", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Queso fresco 0%", grams: 60, isMainIngredient: false, category: "protein" },
      { name: "Cebolla", grams: 40, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 280, protein: 36, carbs: 8, fat: 10, prepTimeMinutes: 5, cookTimeMinutes: 10,
    servingSize: "2 tortillas", servings: 1,
  },
  {
    name: "Yogur griego con avena, frutos rojos y nueces",
    displayName: "Yogur griego con avena y frutos rojos",
    tagline: "Desayuno rápido con proteína, fibra y antioxidantes.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "all", mainIngredient: "yogurt",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "fiber", "quick", "meal-prep"],
    keywords: ["sin gluten opcional", "desayuno rápido", "con frutos rojos"],
    ingredients: [
      { name: "Yogur griego natural", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "Avena", grams: 40, isMainIngredient: false, category: "carb" },
      { name: "Frutos rojos mixtos", grams: 80, isMainIngredient: false, category: "carb" },
      { name: "Nueces picadas", grams: 15, isMainIngredient: false, category: "fat" },
    ],
    calories: 420, protein: 25, carbs: 48, fat: 14, prepTimeMinutes: 3, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Overnight oats de cacao y plátano",
    displayName: "Overnight oats de cacao y plátano",
    tagline: "Preparado la noche anterior. Desayuno sin esfuerzo y nutritivo.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "all", mainIngredient: "oats",
    cuisine: "american", difficulty: "easy",
    tags: ["high-protein", "fiber", "meal-prep", "no-cook"],
    keywords: ["preparar la noche anterior", "desayuno sin cocinar", "cacao"],
    ingredients: [
      { name: "Avena", grams: 60, isMainIngredient: true, category: "carb" },
      { name: "Leche semidesnatada", grams: 200, isMainIngredient: false, category: "protein" },
      { name: "Cacao puro", grams: 10, isMainIngredient: false, category: "other" },
      { name: "Plátano", grams: 90, isMainIngredient: false, category: "carb" },
      { name: "Proteína en polvo", grams: 25, isMainIngredient: false, category: "protein" },
    ],
    calories: 460, protein: 30, carbs: 62, fat: 10, prepTimeMinutes: 5, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Tostadas integrales con aguacate y huevo poché",
    displayName: "Tostadas con aguacate y huevo poché",
    tagline: "Grasas saludables, proteína y fibra en un clásico del brunch.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "maintain", mainIngredient: "avocado",
    cuisine: "american", difficulty: "medium",
    tags: ["healthy-fats", "high-protein", "quick"],
    keywords: ["grasas saludables", "brunch", "aguacate"],
    ingredients: [
      { name: "Pan integral", grams: 60, isMainIngredient: false, category: "carb" },
      { name: "Aguacate maduro", grams: 100, isMainIngredient: true, category: "fat" },
      { name: "Huevo", grams: 50, isMainIngredient: false, category: "protein" },
      { name: "Limón", grams: 10, isMainIngredient: false, category: "other" },
    ],
    calories: 480, protein: 22, carbs: 38, fat: 28, prepTimeMinutes: 5, cookTimeMinutes: 10,
    servingSize: "2 tostadas", servings: 1,
  },
  {
    name: "Shakshuka ligera con huevos y verduras",
    displayName: "Shakshuka con verduras",
    tagline: "Huevos escalfados en salsa de tomate especiada. Intenso y saciante.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "all", mainIngredient: "eggs",
    cuisine: "middleEastern", difficulty: "easy",
    tags: ["high-protein", "vegetarian", "one-pan"],
    keywords: ["uno o dos platos", "salsa de tomate", "especias"],
    ingredients: [
      { name: "Huevos", grams: 100, isMainIngredient: true, category: "protein" },
      { name: "Tomate triturado", grams: 200, isMainIngredient: false, category: "vegetable" },
      { name: "Pimiento rojo", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Cebolla", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Especias shakshuka", grams: 5, isMainIngredient: false, category: "other" },
    ],
    calories: 350, protein: 24, carbs: 22, fat: 18, prepTimeMinutes: 5, cookTimeMinutes: 20,
    servingSize: "2 huevos", servings: 1,
  },
  {
    name: "Porridge de avena con canela y manzana",
    displayName: "Porridge de avena con canela",
    tagline: "Avena cremosa con canela y manzana. Energía sostenible para la mañana.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "bulk", mainIngredient: "oats",
    cuisine: "american", difficulty: "easy",
    tags: ["high-carb", "fiber", "vegetarian"],
    keywords: ["avena", "canela", "manzana", "energía lenta"],
    ingredients: [
      { name: "Avena", grams: 80, isMainIngredient: true, category: "carb" },
      { name: "Leche semidesnatada", grams: 250, isMainIngredient: false, category: "protein" },
      { name: "Manzana", grams: 100, isMainIngredient: false, category: "carb" },
      { name: "Canela", grams: 2, isMainIngredient: false, category: "other" },
    ],
    calories: 540, protein: 22, carbs: 88, fat: 8, prepTimeMinutes: 2, cookTimeMinutes: 8,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Pudín de chía con yogur y frutas",
    displayName: "Pudín de chía con yogur y frutas",
    tagline: "Omega-3 de chía + proteína del yogur. Listo en 5 minutos.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "all", mainIngredient: "chia",
    cuisine: "all", difficulty: "easy",
    tags: ["omega-3", "fiber", "vegan", "meal-prep", "no-cook"],
    keywords: ["semillas de chía", "sin cocinar", "prep noche anterior"],
    ingredients: [
      { name: "Semillas de chía", grams: 30, isMainIngredient: true, category: "fat" },
      { name: "Yogur natural", grams: 180, isMainIngredient: false, category: "protein" },
      { name: "Fruta fresca variada", grams: 100, isMainIngredient: false, category: "carb" },
      { name: "Miel", grams: 10, isMainIngredient: false, category: "carb" },
    ],
    calories: 380, protein: 18, carbs: 42, fat: 16, prepTimeMinutes: 5, cookTimeMinutes: 0,
    servingSize: "1 vaso/bowl", servings: 1,
  },
  {
    name: "Batido proteico de café y cacao",
    displayName: "Batido proteico de café y cacao",
    tagline: "Pre-workout o post-workout con cafeína natural y 30g de proteína.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "all", mainIngredient: "protein",
    cuisine: "all", difficulty: "easy",
    tags: ["high-protein", "quick", "pre-workout", "post-workout"],
    keywords: ["batido", "café", "cacao", "post-entreno"],
    ingredients: [
      { name: "Café espresso", grams: 30, isMainIngredient: false, category: "other" },
      { name: "Leche semidesnatada", grams: 250, isMainIngredient: false, category: "protein" },
      { name: "Cacao puro", grams: 15, isMainIngredient: false, category: "other" },
      { name: "Proteína whey", grams: 30, isMainIngredient: true, category: "protein" },
    ],
    calories: 340, protein: 42, carbs: 20, fat: 8, prepTimeMinutes: 3, cookTimeMinutes: 0,
    servingSize: "1 batido (400ml)", servings: 1,
  },
  {
    name: "Smoothie bowl de frutos rojos y proteína",
    displayName: "Smoothie bowl de frutos rojos",
    tagline: "Denso, cremoso y cargado de antioxidantes. Para empezar el día con fuerza.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "all", mainIngredient: "berries",
    cuisine: "all", difficulty: "easy",
    tags: ["antioxidants", "fiber", "high-protein", "quick"],
    keywords: ["frutos rojos", "smoothie bowl", "post-workout"],
    ingredients: [
      { name: "Frutos rojos congelados", grams: 150, isMainIngredient: true, category: "carb" },
      { name: "Plátano congelado", grams: 80, isMainIngredient: false, category: "carb" },
      { name: "Proteína whey", grams: 25, isMainIngredient: false, category: "protein" },
      { name: "Leche de avena", grams: 100, isMainIngredient: false, category: "protein" },
      { name: "Granola", grams: 30, isMainIngredient: false, category: "carb" },
    ],
    calories: 490, protein: 32, carbs: 68, fat: 10, prepTimeMinutes: 5, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  // ── SNACKS ─────────────────────────────────────────────────────────────────
  {
    name: "Edamame con sal y limón",
    displayName: "Edamame con sal y limón",
    tagline: "17g de proteína vegetal en 100g. Snack japonés rico en fibra.",
    mealType: "snack", dietType: "vegan", goalFit: "all", mainIngredient: "edamame",
    cuisine: "asian", difficulty: "easy",
    tags: ["vegan", "high-protein", "fiber", "gluten-free", "quick"],
    keywords: ["sin gluten", "soja", "snack japonés", "bajo en calorías"],
    ingredients: [
      { name: "Edamame en vaina", grams: 150, isMainIngredient: true, category: "protein" },
      { name: "Sal marina", grams: 2, isMainIngredient: false, category: "other" },
      { name: "Limón", grams: 10, isMainIngredient: false, category: "other" },
    ],
    calories: 190, protein: 17, carbs: 14, fat: 7, prepTimeMinutes: 1, cookTimeMinutes: 5,
    servingSize: "150g", servings: 1,
  },
  {
    name: "Hummus casero con palitos de zanahoria",
    displayName: "Hummus casero con verduras",
    tagline: "Garbanzos, tahini y ajo. Un dip proteico y rico en fibra.",
    mealType: "snack", dietType: "vegan", goalFit: "all", mainIngredient: "chickpeas",
    cuisine: "middleEastern", difficulty: "easy",
    tags: ["vegan", "fiber", "healthy-fats", "meal-prep", "gluten-free"],
    keywords: ["garbanzos", "tahini", "snack saludable", "dip"],
    ingredients: [
      { name: "Garbanzos cocidos", grams: 150, isMainIngredient: true, category: "protein" },
      { name: "Tahini", grams: 20, isMainIngredient: false, category: "fat" },
      { name: "Ajo", grams: 5, isMainIngredient: false, category: "other" },
      { name: "Zanahoria baby", grams: 100, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 310, protein: 12, carbs: 34, fat: 14, prepTimeMinutes: 5, cookTimeMinutes: 0,
    servingSize: "1 bowl con verduras", servings: 1,
  },
  {
    name: "Guacamole con crudités y tortilla integral",
    displayName: "Guacamole casero con crudités",
    tagline: "Grasas monoinsaturadas del aguacate. Snack fresco y saciante.",
    mealType: "snack", dietType: "vegan", goalFit: "all", mainIngredient: "avocado",
    cuisine: "mexican", difficulty: "easy",
    tags: ["vegan", "healthy-fats", "quick", "gluten-free"],
    keywords: ["aguacate", "crudités", "snack fresco"],
    ingredients: [
      { name: "Aguacate maduro", grams: 120, isMainIngredient: true, category: "fat" },
      { name: "Tomate", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Cebolla morada", grams: 30, isMainIngredient: false, category: "vegetable" },
      { name: "Tortilla integral", grams: 30, isMainIngredient: false, category: "carb" },
    ],
    calories: 340, protein: 6, carbs: 28, fat: 24, prepTimeMinutes: 8, cookTimeMinutes: 0,
    servingSize: "1 porción", servings: 1,
  },
  {
    name: "Skyr con miel y almendras",
    displayName: "Skyr con miel y almendras",
    tagline: "26g de proteína por 200g. Post-entreno ideal con dulzor natural.",
    mealType: "snack", dietType: "vegetarian", goalFit: "all", mainIngredient: "skyr",
    cuisine: "all", difficulty: "easy",
    tags: ["high-protein", "quick", "post-workout"],
    keywords: ["post-entreno", "islandés", "miel"],
    ingredients: [
      { name: "Skyr natural", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "Almendras", grams: 15, isMainIngredient: false, category: "fat" },
      { name: "Miel", grams: 10, isMainIngredient: false, category: "carb" },
    ],
    calories: 320, protein: 28, carbs: 22, fat: 14, prepTimeMinutes: 2, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Barritas caseras de avena y proteína",
    displayName: "Barritas de avena y proteína",
    tagline: "Snack portable con 20g de proteína. Sin azúcar añadido. Meal prep friendly.",
    mealType: "snack", dietType: "vegetarian", goalFit: "all", mainIngredient: "oats",
    cuisine: "all", difficulty: "easy",
    tags: ["high-protein", "meal-prep", "portable", "snack"],
    keywords: ["barrita", "avena", "snack para llevar", "meal prep"],
    ingredients: [
      { name: "Avena", grams: 80, isMainIngredient: true, category: "carb" },
      { name: "Proteína whey vainilla", grams: 30, isMainIngredient: false, category: "protein" },
      { name: "Dátiles", grams: 40, isMainIngredient: false, category: "carb" },
      { name: "Mantequilla de cacahuete", grams: 20, isMainIngredient: false, category: "fat" },
    ],
    calories: 410, protein: 22, carbs: 52, fat: 12, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "4 barritas", servings: 4,
  },
  {
    name: "Tortitas de avena y claras con arándanos",
    displayName: "Tortitas de avena y arándanos",
    tagline: "Finas, esponjosas y ricas en proteína. Acompañamiento perfecto.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "all", mainIngredient: "oats",
    cuisine: "american", difficulty: "easy",
    tags: ["high-protein", "low-fat", "meal-prep"],
    keywords: ["tortitas", "arándanos", "desayuno dulce"],
    ingredients: [
      { name: "Avena", grams: 60, isMainIngredient: true, category: "carb" },
      { name: "Claras", grams: 180, isMainIngredient: false, category: "protein" },
      { name: "Arándanos", grams: 60, isMainIngredient: false, category: "carb" },
      { name: "Levadura", grams: 3, isMainIngredient: false, category: "other" },
    ],
    calories: 340, protein: 28, carbs: 48, fat: 4, prepTimeMinutes: 5, cookTimeMinutes: 15,
    servingSize: "3 tortitas", servings: 1,
  },
  // ── FISH / PESCADO ──────────────────────────────────────────────────────────
  {
    name: "Merluza en papillote con calabacín y limón",
    displayName: "Merluza al horno en papillote",
    tagline: "Pescado blanco magro cocido al vapor en su propio jugo. Limpio y ligero.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "cut", mainIngredient: "hake",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["low-fat", "high-protein", "gluten-free", "low-carb", "omega-3"],
    keywords: ["sin gluten", "bajo en grasa", "cocción suave"],
    ingredients: [
      { name: "Merluza", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Calabacín", grams: 150, isMainIngredient: false, category: "vegetable" },
      { name: "Limón", grams: 30, isMainIngredient: false, category: "other" },
      { name: "Hierbas provenzales", grams: 3, isMainIngredient: false, category: "other" },
    ],
    calories: 320, protein: 40, carbs: 8, fat: 12, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 filete con verduras", servings: 1,
  },
  {
    name: "Atún a la plancha con boniato y brócoli",
    displayName: "Atún a la plancha con boniato",
    tagline: "Proteína completa con carotenos del boniato y fibra del brócoli.",
    mealType: "lunch", dietType: "pescatarian", goalFit: "all", mainIngredient: "tuna",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "gluten-free", "omega-3", "meal-prep"],
    keywords: ["sin gluten", "atún fresco", "boniato"],
    ingredients: [
      { name: "Atún fresco", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Boniato", grams: 180, isMainIngredient: false, category: "carb" },
      { name: "Brócoli", grams: 120, isMainIngredient: false, category: "vegetable" },
      { name: "Aceite de oliva", grams: 8, isMainIngredient: false, category: "fat" },
    ],
    calories: 560, protein: 48, carbs: 48, fat: 14, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Bacalao a la vizcaína ligero con patata cocida",
    displayName: "Bacalao a la vizcaína",
    tagline: "Tradición vasca: bacalao desalado en salsa de chípotle y pimientos.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "cod",
    cuisine: "spanish", difficulty: "medium",
    tags: ["high-protein", "gluten-free", "traditional"],
    keywords: ["bacalao", "vizcaína", "pimientos chípotle", "cocina vasca"],
    ingredients: [
      { name: "Bacalao desalado", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Patata", grams: 200, isMainIngredient: false, category: "carb" },
      { name: "Pimientos rojos", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Chípotle en adobo", grams: 10, isMainIngredient: false, category: "other" },
      { name: "Cebolla", grams: 60, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 540, protein: 42, carbs: 52, fat: 16, prepTimeMinutes: 15, cookTimeMinutes: 30,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Lubina al horno con verduras y aceite de oliva",
    displayName: "Lubina al horno con verduras",
    tagline: "Pescado entero o en filete horneado con verduras de temporada.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "sea-bass",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "gluten-free", "omega-3", "one-pan"],
    keywords: ["lubina", "horno", "un solo plato"],
    ingredients: [
      { name: "Lubina", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Calabacín", grams: 120, isMainIngredient: false, category: "vegetable" },
      { name: "Tomate", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Aceite de oliva", grams: 15, isMainIngredient: false, category: "fat" },
      { name: "Limón", grams: 20, isMainIngredient: false, category: "other" },
    ],
    calories: 480, protein: 44, carbs: 12, fat: 28, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 lubina con verduras", servings: 1,
  },
  {
    name: "Ceviche de pescado blanco con boniato",
    displayName: "Ceviche de pescado blanco",
    tagline: "Pescado curado en lima. Sin calor, máxima frescura y vitamina C.",
    mealType: "lunch", dietType: "pescatarian", goalFit: "cut", mainIngredient: "fish",
    cuisine: "american", difficulty: "medium",
    tags: ["high-protein", "gluten-free", "no-cook", "fresh"],
    keywords: ["sin cocinar", "cítricos", "fresco", "vivo"],
    ingredients: [
      { name: "Pescado blanco fresco", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Boniato cocido", grams: 120, isMainIngredient: false, category: "carb" },
      { name: "Lima", grams: 40, isMainIngredient: false, category: "other" },
      { name: "Cilantro fresco", grams: 10, isMainIngredient: false, category: "other" },
      { name: "Cebolla morada", grams: 40, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 380, protein: 36, carbs: 36, fat: 8, prepTimeMinutes: 20, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Calamares a la plancha con ensalada",
    displayName: "Calamares a la plancha",
    tagline: "Marisco magro y rápido. En 10 minutos tienes plato completo.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "squid",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "low-fat", "gluten-free", "quick"],
    keywords: ["calamares", "plancha", "ligero"],
    ingredients: [
      { name: "Calamares", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "Ensalada verde", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Limón", grams: 20, isMainIngredient: false, category: "other" },
      { name: "Ajo", grams: 3, isMainIngredient: false, category: "other" },
    ],
    calories: 340, protein: 44, carbs: 6, fat: 14, prepTimeMinutes: 5, cookTimeMinutes: 8,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Pulpo a la gallega light con patata y pimentón",
    displayName: "Pulpo a la gallega",
    tagline: "Clásico español con pulpo市場 cocido, patata y pimentón. Sin майонез.",
    mealType: "lunch", dietType: "pescatarian", goalFit: "all", mainIngredient: "octopus",
    cuisine: "spanish", difficulty: "medium",
    tags: ["high-protein", "gluten-free", "traditional"],
    keywords: ["pulpo", "gallego", "pimentón", "patata"],
    ingredients: [
      { name: "Pulpo limpio", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "Patata cocida", grams: 150, isMainIngredient: false, category: "carb" },
      { name: "Pimentón dulce", grams: 3, isMainIngredient: false, category: "other" },
      { name: "Aceite de oliva", grams: 15, isMainIngredient: false, category: "fat" },
    ],
    calories: 460, protein: 48, carbs: 32, fat: 14, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Pez espada a la plancha con ensalada griega",
    displayName: "Pez espada con ensalada griega",
    tagline: "Pescado denso en omega-3 con feta, aceitunas y pepino. Mediterránea pura.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "swordfish",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "gluten-free", "omega-3", "mediterranean-diet"],
    keywords: ["ensalada griega", "feta", "aceitunas"],
    ingredients: [
      { name: "Pez espada", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Feta", grams: 50, isMainIngredient: false, category: "protein" },
      { name: "Pepino", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Aceitunas negras", grams: 30, isMainIngredient: false, category: "fat" },
      { name: "Tomate", grams: 80, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 580, protein: 52, carbs: 10, fat: 36, prepTimeMinutes: 10, cookTimeMinutes: 12,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Salmón teriyaki con arroz y edamame",
    displayName: "Salmón teriyaki con arroz y edamame",
    tagline: "Umami del teriyaki con omega-3 del salmón y proteína vegetal del edamame.",
    mealType: "lunch", dietType: "pescatarian", goalFit: "all", mainIngredient: "salmon",
    cuisine: "asian", difficulty: "medium",
    tags: ["high-protein", "omega-3", "umami"],
    keywords: ["teriyaki", "japonés", "salmón"],
    ingredients: [
      { name: "Salmón fresco", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Arroz jazmín", grams: 120, isMainIngredient: false, category: "carb" },
      { name: "Edamame", grams: 80, isMainIngredient: false, category: "protein" },
      { name: "Salsa teriyaki light", grams: 30, isMainIngredient: false, category: "other" },
    ],
    calories: 640, protein: 46, carbs: 60, fat: 18, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 plato", servings: 1,
  },
  // ── POLLO / POULTRY ─────────────────────────────────────────────────────────
  {
    name: "Pollo a la plancha con arroz integral y ensalada",
    displayName: "Pollo a la plancha con arroz integral",
    tagline: "El clásicofit: proteína magra, carbihidratos complejos y verduras frescas.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "meal-prep", "classic"],
    keywords: ["pollo a la plancha", "arroz integral", "clásico fit"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Arroz integral cocido", grams: 150, isMainIngredient: false, category: "carb" },
      { name: "Ensalada verde", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Limón", grams: 15, isMainIngredient: false, category: "other" },
    ],
    calories: 540, protein: 48, carbs: 52, fat: 12, prepTimeMinutes: 5, cookTimeMinutes: 20,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Pechuga de pavo al curry con arroz basmati integral",
    displayName: "Pechuga de pavo al curry",
    tagline: "Curry suave con pavo, leche de coco ligera y especias. Exótico y proteico.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "turkey",
    cuisine: "indian", difficulty: "medium",
    tags: ["high-protein", "anti-inflammatory", "meal-prep"],
    keywords: ["curry", "pavo", "leche de coco", "arroz basmati"],
    ingredients: [
      { name: "Pechuga de pavo", grams: 170, isMainIngredient: true, category: "protein" },
      { name: "Arroz basmati", grams: 120, isMainIngredient: false, category: "carb" },
      { name: "Leche de coco light", grams: 80, isMainIngredient: false, category: "fat" },
      { name: "Curry en polvo", grams: 5, isMainIngredient: false, category: "other" },
      { name: "Cebolla", grams: 60, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 580, protein: 46, carbs: 56, fat: 14, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Albóndigas de pavo en salsa de tomate con espagueti de calabacín",
    displayName: "Albóndigas de pavo con calabacín",
    tagline: "Protein balls en salsa de tomate con espagueti de calabacín como alternativa baja en carbs.",
    mealType: "lunch", dietType: "omnivore", goalFit: "cut", mainIngredient: "turkey",
    cuisine: "mediterranean", difficulty: "medium",
    tags: ["high-protein", "low-carb", "comfort-food"],
    keywords: ["albóndigas", "pavo", "calabacín", "bajo en carbs"],
    ingredients: [
      { name: "Carne de pavo molida", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "Calabacín (en espiral)", grams: 200, isMainIngredient: false, category: "vegetable" },
      { name: "Tomate triturado", grams: 150, isMainIngredient: false, category: "vegetable" },
      { name: "Cebolla", grams: 50, isMainIngredient: false, category: "vegetable" },
      { name: "Ajo", grams: 4, isMainIngredient: false, category: "other" },
    ],
    calories: 420, protein: 44, carbs: 18, fat: 18, prepTimeMinutes: 15, cookTimeMinutes: 25,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Burrito bowl de pollo con frijoles y pico de gallo",
    displayName: "Burrito bowl de pollo",
    tagline: "Todos los sabores del burrito sin la tortilla. Más volumen, menos carbs.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "mexican", difficulty: "easy",
    tags: ["high-protein", "fiber", "gluten-free", "meal-prep"],
    keywords: ["mexicano", "frijoles", "pico de gallo", "bowl"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Frijoles negros", grams: 120, isMainIngredient: false, category: "protein" },
      { name: "Arroz integral", grams: 100, isMainIngredient: false, category: "carb" },
      { name: "Tomate", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Aguacate", grams: 50, isMainIngredient: false, category: "fat" },
    ],
    calories: 600, protein: 50, carbs: 58, fat: 16, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 bowl grande", servings: 1,
  },
  {
    name: "Tacos de pescado con col y salsa de yogur",
    displayName: "Tacos de pescado con col",
    tagline: "Tacos de pescado con col crujiente y tzatziki. Ligeros y sabrosos.",
    mealType: "lunch", dietType: "pescatarian", goalFit: "all", mainIngredient: "fish",
    cuisine: "mexican", difficulty: "easy",
    tags: ["high-protein", "low-fat", "fresh"],
    keywords: ["tacos", "pescado", "col", "tzatziki"],
    ingredients: [
      { name: "Filete de pescado blanco", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Col blanca rallada", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Yogur natural", grams: 60, isMainIngredient: false, category: "protein" },
      { name: "Limón", grams: 15, isMainIngredient: false, category: "other" },
    ],
    calories: 380, protein: 38, carbs: 20, fat: 14, prepTimeMinutes: 10, cookTimeMinutes: 10,
    servingSize: "3 tacos", servings: 1,
  },
  {
    name: "Wrap integral de pollo, hummus y verduras",
    displayName: "Wrap de pollo con hummus",
    tagline: "Wrap relleno de hummus, pollo y verduras variadas. Listo en 10 minutos.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "middleEastern", difficulty: "easy",
    tags: ["high-protein", "portable", "meal-prep"],
    keywords: ["wrap", "hummus", "sándwich"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 120, isMainIngredient: true, category: "protein" },
      { name: "Tortilla integral", grams: 60, isMainIngredient: false, category: "carb" },
      { name: "Hummus", grams: 50, isMainIngredient: false, category: "protein" },
      { name: "Lechuga", grams: 40, isMainIngredient: false, category: "vegetable" },
      { name: "Tomate", grams: 40, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 480, protein: 40, carbs: 44, fat: 16, prepTimeMinutes: 8, cookTimeMinutes: 10,
    servingSize: "1 wrap", servings: 1,
  },
  {
    name: "Ensalada César ligera con pollo y yogur",
    displayName: "Ensalada César con pollo",
    tagline: "La clásica César sin майонез, con yogur y queso parmesano.",
    mealType: "lunch", dietType: "omnivore", goalFit: "cut", mainIngredient: "chicken",
    cuisine: "american", difficulty: "easy",
    tags: ["high-protein", "low-fat", "classic", "gluten-free-option"],
    keywords: [" César", "pollo", "ión", "light"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 150, isMainIngredient: true, category: "protein" },
      { name: "Lechuga romana", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Yogur natural 0%", grams: 60, isMainIngredient: false, category: "protein" },
      { name: "Parmesano", grams: 15, isMainIngredient: false, category: "protein" },
    ],
    calories: 380, protein: 46, carbs: 10, fat: 16, prepTimeMinutes: 5, cookTimeMinutes: 15,
    servingSize: "1 bowl grande", servings: 1,
  },
  {
    name: "Pollo tikka masala light con arroz integral",
    displayName: "Pollo tikka masala",
    tagline: "Curry indio clásico con pechuga y tomate. Especias antiinflamatorias.",
    mealType: "dinner", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "indian", difficulty: "medium",
    tags: ["high-protein", "anti-inflammatory", "aromatic", "meal-prep"],
    keywords: ["indio", "curry", "tikka masala", "arroz integral"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 170, isMainIngredient: true, category: "protein" },
      { name: "Arroz integral", grams: 120, isMainIngredient: false, category: "carb" },
      { name: "Tomate triturado", grams: 150, isMainIngredient: false, category: "vegetable" },
      { name: "Yogur natural", grams: 60, isMainIngredient: false, category: "protein" },
      { name: "Especias tikka masala", grams: 8, isMainIngredient: false, category: "other" },
    ],
    calories: 580, protein: 48, carbs: 56, fat: 14, prepTimeMinutes: 15, cookTimeMinutes: 30,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Ensalada de espinacas con fresas, pollo y nueces",
    displayName: "Ensalada de espinacas con pollo y fresas",
    tagline: "Hierro de espinacas + antioxidantes de fresas + proteína de pollo.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "iron", "low-fat", "fresh"],
    keywords: ["espinacas", "fresas", "nueces", "light"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 130, isMainIngredient: true, category: "protein" },
      { name: "Espinacas baby", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Fresas", grams: 80, isMainIngredient: false, category: "carb" },
      { name: "Nueces", grams: 15, isMainIngredient: false, category: "fat" },
    ],
    calories: 400, protein: 42, carbs: 18, fat: 18, prepTimeMinutes: 10, cookTimeMinutes: 15,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Pollo estilo shawarma con ensalada y tzatziki",
    displayName: "Shawarma de pollo con ensalada",
    tagline: "Sabores de Medio Oriente: pollo marinado, ensalada fresca y tzatziki.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "middleEastern", difficulty: "easy",
    tags: ["high-protein", "mediterranean-diet", "fresh"],
    keywords: ["shawarma", "medio oriente", "tzatziki"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 170, isMainIngredient: true, category: "protein" },
      { name: "Ensalada mediterránea", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Yogur griego", grams: 60, isMainIngredient: false, category: "protein" },
      { name: "Especias shawarma", grams: 5, isMainIngredient: false, category: "other" },
    ],
    calories: 480, protein: 48, carbs: 14, fat: 24, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Crepes integrales rellenos de pollo y espinacas",
    displayName: "Crepes rellenos de pollo y espinacas",
    tagline: "Rellenos cremosos de pollo y espinacas. Un brunch o cena diferente.",
    mealType: "dinner", dietType: "omnivore", goalFit: "maintain", mainIngredient: "chicken",
    cuisine: "mediterranean", difficulty: "medium",
    tags: ["high-protein", "comfort-food"],
    keywords: ["crepes", "rellenos", "espinacas", "brunch"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 130, isMainIngredient: true, category: "protein" },
      { name: "Espinacas", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Harina integral", grams: 60, isMainIngredient: false, category: "carb" },
      { name: "Queso ricotta", grams: 50, isMainIngredient: false, category: "protein" },
    ],
    calories: 520, protein: 42, carbs: 44, fat: 18, prepTimeMinutes: 15, cookTimeMinutes: 20,
    servingSize: "2 crepes", servings: 1,
  },
  // ── BEEF / TERNERA ─────────────────────────────────────────────────────────
  {
    name: "Ternera magra salteada con pimientos y quinoa",
    displayName: "Ternera salteada con quinoa",
    tagline: "Ternera magra con pimientos crujientes y quinoa completa.",
    mealType: "dinner", dietType: "omnivore", goalFit: "all", mainIngredient: "beef",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "iron", "meal-prep"],
    keywords: ["ternera", "salteado", "quinoa"],
    ingredients: [
      { name: "Ternera magra", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Quinoa cocida", grams: 150, isMainIngredient: false, category: "carb" },
      { name: "Pimiento rojo", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Pimiento verde", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Salsa soja light", grams: 15, isMainIngredient: false, category: "other" },
    ],
    calories: 620, protein: 48, carbs: 52, fat: 20, prepTimeMinutes: 10, cookTimeMinutes: 15,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Estofado de ternera magra con verduras",
    displayName: "Estofado de ternera con verduras",
    tagline: "Cocción lenta que ablanda la ternera y concentra los sabores.",
    mealType: "dinner", dietType: "omnivore", goalFit: "bulk", mainIngredient: "beef",
    cuisine: "mediterranean", difficulty: "medium",
    tags: ["high-protein", "iron", "meal-prep", "comfort-food"],
    keywords: ["estofado", "cocción lenta", "caliente"],
    ingredients: [
      { name: "Ternera para estofado", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "Patata", grams: 150, isMainIngredient: false, category: "carb" },
      { name: "Zanahoria", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Cebolla", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Caldo de carne", grams: 200, isMainIngredient: false, category: "other" },
    ],
    calories: 680, protein: 52, carbs: 48, fat: 28, prepTimeMinutes: 15, cookTimeMinutes: 90,
    servingSize: "1 plato hondo", servings: 1,
  },
  {
    name: "Hamburguesa de ternera magra con ensalada y patata al aire",
    displayName: "Hamburguesa fit de ternera",
    tagline: "Hamburguesa casera sin freír. Ternera magra con toppings frescos.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "beef",
    cuisine: "american", difficulty: "easy",
    tags: ["high-protein", "comfort-food", "grilled"],
    keywords: ["hamburguesa", "ternera magra", "sin freír"],
    ingredients: [
      { name: "Carne de ternera 5% grasa", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Pan integral", grams: 50, isMainIngredient: false, category: "carb" },
      { name: "Lechuga y tomate", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Patata al horno", grams: 120, isMainIngredient: false, category: "carb" },
    ],
    calories: 580, protein: 46, carbs: 50, fat: 18, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 hamburguesa", servings: 1,
  },
  // ── VEGETARIAN / VEGAN ──────────────────────────────────────────────────────
  {
    name: "Bowl de lentejas con verduras asadas y feta",
    displayName: "Bowl de lentejas con verduras",
    tagline: "Proteína vegetal completa con hierro y fibra. Llena para rato.",
    mealType: "lunch", dietType: "vegetarian", goalFit: "all", mainIngredient: "lentils",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["vegan", "high-protein", "fiber", "iron", "meal-prep"],
    keywords: ["lentejas", "verduras asadas", "sin carne"],
    ingredients: [
      { name: "Lentejas cocidas", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Calabacín asado", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Pimiento asado", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Queso feta light", grams: 40, isMainIngredient: false, category: "protein" },
      { name: "Aceite de oliva", grams: 10, isMainIngredient: false, category: "fat" },
    ],
    calories: 520, protein: 28, carbs: 64, fat: 16, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Tofu crujiente al horno con teriyaki y arroz",
    displayName: "Tofu crujiente teriyaki",
    tagline: "Tofu horneado hasta crujir, bañado en teriyaki. Vegano y denso.",
    mealType: "dinner", dietType: "vegan", goalFit: "all", mainIngredient: "tofu",
    cuisine: "asian", difficulty: "easy",
    tags: ["vegan", "high-protein", "crispy", "dairy-free"],
    keywords: ["tofu", "vegan", "teriyaki", "crujiente"],
    ingredients: [
      { name: "Tofu firme", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "Arroz jazmín", grams: 120, isMainIngredient: false, category: "carb" },
      { name: "Salsa teriyaki light", grams: 30, isMainIngredient: false, category: "other" },
      { name: "Sésamo", grams: 5, isMainIngredient: false, category: "fat" },
    ],
    calories: 540, protein: 32, carbs: 62, fat: 16, prepTimeMinutes: 10, cookTimeMinutes: 30,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Tempeh salteado con brócoli y sésamo",
    displayName: "Tempeh salteado con brócoli",
    tagline: "Tempeh fermentado con textura única, brócoli crujiente y sésamo.",
    mealType: "dinner", dietType: "vegan", goalFit: "all", mainIngredient: "tempeh",
    cuisine: "asian", difficulty: "easy",
    tags: ["vegan", "probiotic", "high-protein", "dairy-free"],
    keywords: ["tempeh", "fermentado", "brócoli", "sésamo"],
    ingredients: [
      { name: "Tempeh", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Brócoli", grams: 120, isMainIngredient: false, category: "vegetable" },
      { name: "Salsa soja", grams: 15, isMainIngredient: false, category: "other" },
      { name: "Sésamo tostado", grams: 5, isMainIngredient: false, category: "fat" },
    ],
    calories: 480, protein: 34, carbs: 32, fat: 24, prepTimeMinutes: 8, cookTimeMinutes: 15,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Bowl de quinoa con huevo, aguacate y verduras",
    displayName: "Bowl de quinoa con huevo y aguacate",
    tagline: "Quinoa completa + huevo + aguacate. Vegetal, denso y completo.",
    mealType: "lunch", dietType: "vegetarian", goalFit: "all", mainIngredient: "quinoa",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["vegan", "high-protein", "fiber", "gluten-free", "meal-prep"],
    keywords: ["quinoa", "vegetariano", "bowl completo"],
    ingredients: [
      { name: "Quinoa cocida", grams: 150, isMainIngredient: true, category: "carb" },
      { name: "Aguacate", grams: 80, isMainIngredient: false, category: "fat" },
      { name: "Huevo cocido", grams: 50, isMainIngredient: false, category: "protein" },
      { name: "Tomate cherry", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Espinacas", grams: 40, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 560, protein: 22, carbs: 52, fat: 30, prepTimeMinutes: 10, cookTimeMinutes: 15,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Quinoa con salmón y salsa de yogur al eneldo",
    displayName: "Quinoa con salmón y yogur al eneldo",
    tagline: "Omega-3 del salmón con quinoa y una salsa fresca de yogur y eneldo.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "salmon",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "omega-3", "gluten-free", "fresh"],
    keywords: ["salmón", "quinoa", "eneldo", "yogur"],
    ingredients: [
      { name: "Salmón fresco", grams: 150, isMainIngredient: true, category: "protein" },
      { name: "Quinoa cocida", grams: 120, isMainIngredient: false, category: "carb" },
      { name: "Yogur natural", grams: 60, isMainIngredient: false, category: "protein" },
      { name: "Eneldo fresco", grams: 5, isMainIngredient: false, category: "other" },
    ],
    calories: 620, protein: 46, carbs: 42, fat: 26, prepTimeMinutes: 10, cookTimeMinutes: 18,
    servingSize: "1 plato", servings: 1,
  },
  // ── SALADS ─────────────────────────────────────────────────────────────────
  {
    name: "Ensalada mediterránea de garbanzos con atún",
    displayName: "Ensalada mediterránea de garbanzos",
    tagline: "Garbanzos + atún + verduras. Proteína, fibra y omega-3.",
    mealType: "lunch", dietType: "pescatarian", goalFit: "all", mainIngredient: "tuna",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "fiber", "omega-3", "gluten-free", "meal-prep"],
    keywords: ["garbanzos", "atún", "mediterránea", "sin cocinar"],
    ingredients: [
      { name: "Garbanzos cocidos", grams: 120, isMainIngredient: false, category: "protein" },
      { name: "Atún en conserva", grams: 80, isMainIngredient: true, category: "protein" },
      { name: "Tomate", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Pepino", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Aceitunas", grams: 30, isMainIngredient: false, category: "fat" },
    ],
    calories: 480, protein: 38, carbs: 36, fat: 20, prepTimeMinutes: 10, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Ensalada de quinoa con pepino, tomate y pollo",
    displayName: "Ensalada de quinoa con pollo",
    tagline: "Quinoa fría con pollo, pepino y tomate. Meal prep ideal.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "fiber", "meal-prep", "gluten-free"],
    keywords: ["quinoa", "ensalada fría", "meal prep"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 130, isMainIngredient: true, category: "protein" },
      { name: "Quinoa cocida", grams: 120, isMainIngredient: false, category: "carb" },
      { name: "Pepino", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Tomate", grams: 80, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 480, protein: 44, carbs: 42, fat: 14, prepTimeMinutes: 10, cookTimeMinutes: 15,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Ensalada templada de espárragos y huevo",
    displayName: "Ensalada templada de espárragos",
    tagline: "Espárragos calientes sobre huevos y rúcula. Simple y elegante.",
    mealType: "lunch", dietType: "vegetarian", goalFit: "all", mainIngredient: "asparagus",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "low-carb", "vegetarian", "quick"],
    keywords: ["espárragos", "rúcula", "sin cocinar"],
    ingredients: [
      { name: "Espárragos verdes", grams: 150, isMainIngredient: true, category: "vegetable" },
      { name: "Huevos", grams: 100, isMainIngredient: false, category: "protein" },
      { name: "Rúcula", grams: 50, isMainIngredient: false, category: "vegetable" },
      { name: "Parmesano", grams: 15, isMainIngredient: false, category: "protein" },
    ],
    calories: 360, protein: 28, carbs: 10, fat: 24, prepTimeMinutes: 5, cookTimeMinutes: 10,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Ensalada caprese con pollo y pesto ligero",
    displayName: "Ensalada caprese con pollo",
    tagline: "Tomate mozzarella y albahaca con pollo. Clásico italiano elevado.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "italian", difficulty: "easy",
    tags: ["high-protein", "fresh", "classic"],
    keywords: ["caprese", "mozzarella", "pesto", "pollo"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 130, isMainIngredient: true, category: "protein" },
      { name: "Tomate", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Mozzarella fresca", grams: 80, isMainIngredient: false, category: "protein" },
      { name: "Albahaca fresca", grams: 10, isMainIngredient: false, category: "other" },
    ],
    calories: 480, protein: 46, carbs: 12, fat: 28, prepTimeMinutes: 10, cookTimeMinutes: 15,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Ensalada de rúcula con pera, jamón magro y parmesano",
    displayName: "Ensalada con jamón y parmesano",
    tagline: "Dulzor de pera + salado del jamón + umami del parmesano.",
    mealType: "lunch", dietType: "omnivore", goalFit: "maintain", mainIngredient: "ham",
    cuisine: "italian", difficulty: "easy",
    tags: ["high-protein", "low-carb", "classic"],
    keywords: ["rúcula", "per", "jamón serrano", "parmesano"],
    ingredients: [
      { name: "Jamón serrano magro", grams: 60, isMainIngredient: true, category: "protein" },
      { name: "Rúcula", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Pera", grams: 80, isMainIngredient: false, category: "carb" },
      { name: "Parmesano en lascas", grams: 20, isMainIngredient: false, category: "protein" },
    ],
    calories: 360, protein: 30, carbs: 18, fat: 20, prepTimeMinutes: 5, cookTimeMinutes: 0,
    servingSize: "1 plato", servings: 1,
  },
  // ── SOUPS ─────────────────────────────────────────────────────────────────
  {
    name: "Crema de calabaza con jengibre y semillas",
    displayName: "Crema de calabaza con jengibre",
    tagline: "Sopa dulce y cremosa con jengibre antiinflamatorio y semillas crujientes.",
    mealType: "lunch", dietType: "vegetarian", goalFit: "all", mainIngredient: "pumpkin",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["vegan", "fiber", "antioxidants", "meal-prep"],
    keywords: ["crema", "calabaza", "jengibre", "sopa"],
    ingredients: [
      { name: "Calabaza", grams: 300, isMainIngredient: true, category: "vegetable" },
      { name: "Cebolla", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Jengibre fresco", grams: 5, isMainIngredient: false, category: "other" },
      { name: "Semillas de calabaza", grams: 10, isMainIngredient: false, category: "fat" },
    ],
    calories: 320, protein: 8, carbs: 48, fat: 12, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 bowl grande", servings: 1,
  },
  {
    name: "Sopa miso con tofu, setas y espinacas",
    displayName: "Sopa miso con tofu y setas",
    tagline: "Probióticos del miso + proteína del tofu. Caldo umami en 15 minutos.",
    mealType: "lunch", dietType: "vegan", goalFit: "all", mainIngredient: "tofu",
    cuisine: "asian", difficulty: "easy",
    tags: ["vegan", "probiotic", "low-calorie", "quick", "dairy-free"],
    keywords: ["miso", "japonés", "caldo", "probióticos"],
    ingredients: [
      { name: "Tofu sedoso", grams: 100, isMainIngredient: true, category: "protein" },
      { name: "Setas shiitake", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Espinacas", grams: 40, isMainIngredient: false, category: "vegetable" },
      { name: "Pasta de miso", grams: 15, isMainIngredient: false, category: "other" },
    ],
    calories: 240, protein: 18, carbs: 16, fat: 12, prepTimeMinutes: 5, cookTimeMinutes: 10,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Gazpacho con huevo duro",
    displayName: "Gazpacho con huevo duro",
    tagline: "Andalusian gazpacho with hard-boiled egg. Refrescante y proteico.",
    mealType: "lunch", dietType: "vegetarian", goalFit: "all", mainIngredient: "tomato",
    cuisine: "spanish", difficulty: "easy",
    tags: ["vegan", "low-calorie", "refreshing", "no-cook"],
    keywords: ["gazpacho", "andaluz", "verano", "frío"],
    ingredients: [
      { name: "Tomate maduro", grams: 300, isMainIngredient: true, category: "vegetable" },
      { name: "Pepino", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Pimiento verde", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Huevo duro", grams: 50, isMainIngredient: false, category: "protein" },
    ],
    calories: 280, protein: 12, carbs: 32, fat: 12, prepTimeMinutes: 15, cookTimeMinutes: 0,
    servingSize: "1 vaso/bowl grande", servings: 1,
  },
  {
    name: "Salmorejo ligero con jamón serrano",
    displayName: "Salmorejo con jamón",
    tagline: "Gazpacho espeso con jamón serrano. Concentrado y saciante.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "tomato",
    cuisine: "spanish", difficulty: "easy",
    tags: ["high-protein", "refreshing", "classic"],
    keywords: ["salmorejo", "andaluz", "jamón"],
    ingredients: [
      { name: "Tomate maduro", grams: 350, isMainIngredient: true, category: "vegetable" },
      { name: "Pan integral", grams: 30, isMainIngredient: false, category: "carb" },
      { name: "Jamón serrano", grams: 40, isMainIngredient: false, category: "protein" },
      { name: "Huevo duro", grams: 30, isMainIngredient: false, category: "protein" },
    ],
    calories: 360, protein: 18, carbs: 36, fat: 16, prepTimeMinutes: 10, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Lentejas estofadas con verduras y pavo",
    displayName: "Lentejas con verduras y pavo",
    tagline: "Legumbres con proteína de pavo. Plato único completo.",
    mealType: "dinner", dietType: "omnivore", goalFit: "all", mainIngredient: "lentils",
    cuisine: "spanish", difficulty: "easy",
    tags: ["high-protein", "fiber", "iron", "meal-prep", "gluten-free"],
    keywords: ["lentejas", "estofado", "español"],
    ingredients: [
      { name: "Lentejas cocidas", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "Pavo molido", grams: 100, isMainIngredient: false, category: "protein" },
      { name: "Zanahoria", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Cebolla", grams: 60, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 520, protein: 40, carbs: 56, fat: 12, prepTimeMinutes: 10, cookTimeMinutes: 30,
    servingSize: "1 plato hondo", servings: 1,
  },
  // ── PASTA / RICE ────────────────────────────────────────────────────────────
  {
    name: "Pasta integral con boloñesa de pavo",
    displayName: "Pasta integral con boloñesa de pavo",
    tagline: "Carbos complejos de la pasta integral + proteína magra del pavo.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "turkey",
    cuisine: "italian", difficulty: "easy",
    tags: ["high-protein", "comfort-food", "meal-prep"],
    keywords: ["pasta", "boloñesa", "pavo"],
    ingredients: [
      { name: "Pasta integral", grams: 90, isMainIngredient: false, category: "carb" },
      { name: "Pavo molido", grams: 150, isMainIngredient: true, category: "protein" },
      { name: "Tomate triturado", grams: 120, isMainIngredient: false, category: "vegetable" },
      { name: "Cebolla", grams: 50, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 620, protein: 46, carbs: 68, fat: 14, prepTimeMinutes: 5, cookTimeMinutes: 25,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Poke bowl de atún, quinoa y mango",
    displayName: "Poke bowl de atún y mango",
    tagline: "Hawaiano fusion: atún fresco, quinoa y mango. Fresco y proteico.",
    mealType: "lunch", dietType: "pescatarian", goalFit: "all", mainIngredient: "tuna",
    cuisine: "american", difficulty: "easy",
    tags: ["high-protein", "omega-3", "gluten-free", "fresh"],
    keywords: ["poke", "hawaiano", "atún fresco", "mango"],
    ingredients: [
      { name: "Atún sashimi", grams: 140, isMainIngredient: true, category: "protein" },
      { name: "Quinoa cocida", grams: 120, isMainIngredient: false, category: "carb" },
      { name: "Mango", grams: 60, isMainIngredient: false, category: "carb" },
      { name: "Edamame", grams: 40, isMainIngredient: false, category: "protein" },
    ],
    calories: 520, protein: 44, carbs: 48, fat: 14, prepTimeMinutes: 15, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Wok de gambas con verduras y arroz jazmín",
    displayName: "Wok de gambas con verduras",
    tagline: "Gambas + verduras crujientes + arroz en 20 minutos. Marisco denso.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "shrimp",
    cuisine: "asian", difficulty: "easy",
    tags: ["high-protein", "omega-3", "quick", "gluten-free"],
    keywords: ["wok", "gambas", "marisco", "rápido"],
    ingredients: [
      { name: "Gambas", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Arroz jazmín", grams: 120, isMainIngredient: false, category: "carb" },
      { name: "Brócoli", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Pimiento rojo", grams: 60, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 540, protein: 44, carbs: 56, fat: 12, prepTimeMinutes: 5, cookTimeMinutes: 15,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Poke bowl de salmón, arroz y edamame",
    displayName: "Poke bowl de salmón con edamame",
    tagline: "Salmón fresco en dados sobre arroz con edamame y salsa poke.",
    mealType: "lunch", dietType: "pescatarian", goalFit: "all", mainIngredient: "salmon",
    cuisine: "american", difficulty: "easy",
    tags: ["high-protein", "omega-3", "gluten-free", "fresh"],
    keywords: ["poke", "salmón", "hawaiano", "edamame"],
    ingredients: [
      { name: "Salmón fresco", grams: 130, isMainIngredient: true, category: "protein" },
      { name: "Arroz blanco cocido", grams: 130, isMainIngredient: false, category: "carb" },
      { name: "Edamame", grams: 60, isMainIngredient: false, category: "protein" },
      { name: "Pepino", grams: 50, isMainIngredient: false, category: "vegetable" },
      { name: "Salsa poke", grams: 20, isMainIngredient: false, category: "other" },
    ],
    calories: 560, protein: 42, carbs: 52, fat: 18, prepTimeMinutes: 15, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Arroz con pollo al limón",
    displayName: "Arroz con pollo al limón",
    tagline: "Arroz amarillo con pollo y limón. Mediterráneo fresco y saciante.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "comfort-food", "meal-prep"],
    keywords: ["arroz", "pollo", "limón", "mediterráneo"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Arroz blanco", grams: 150, isMainIngredient: false, category: "carb" },
      { name: "Limón", grams: 30, isMainIngredient: false, category: "other" },
      { name: "Guisantes", grams: 40, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 600, protein: 44, carbs: 72, fat: 10, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Paella fitness de marisco con arroz",
    displayName: "Paella fitness de marisco",
    tagline: "Arroz con azafrán y marisco variado. Tradición sin exceso de aceite.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "seafood",
    cuisine: "spanish", difficulty: "medium",
    tags: ["high-protein", "omega-3", "traditional", "gluten-free"],
    keywords: ["paella", "marisco", "arroz azafrán", "español"],
    ingredients: [
      { name: "Mezcla de marisco", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "ArrozSOS", grams: 100, isMainIngredient: false, category: "carb" },
      { name: "Caldo de marisco", grams: 300, isMainIngredient: false, category: "other" },
      { name: "Azafrán", grams: 1, isMainIngredient: false, category: "other" },
    ],
    calories: 580, protein: 46, carbs: 58, fat: 14, prepTimeMinutes: 15, cookTimeMinutes: 35,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Pollo al ajillo con patata y judías verdes",
    displayName: "Pollo al ajillo con verduras",
    tagline: "ajo, pollo y limón. Guiso español rápido y aromático.",
    mealType: "dinner", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "spanish", difficulty: "easy",
    tags: ["high-protein", "aromatic", "meal-prep", "classic"],
    keywords: ["ajo", "pollo", "judías verdes", "español"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 170, isMainIngredient: true, category: "protein" },
      { name: "Patata", grams: 150, isMainIngredient: false, category: "carb" },
      { name: "Judías verdes", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Ajo", grams: 10, isMainIngredient: false, category: "other" },
      { name: "Limón", grams: 20, isMainIngredient: false, category: "other" },
    ],
    calories: 580, protein: 46, carbs: 52, fat: 16, prepTimeMinutes: 10, cookTimeMinutes: 30,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Conejo al horno con romero y patata",
    displayName: "Conejo al horno con romero",
    tagline: "Carnes magras de conejo horneadas con romero. Protein density alta.",
    mealType: "dinner", dietType: "omnivore", goalFit: "cut", mainIngredient: "rabbit",
    cuisine: "spanish", difficulty: "medium",
    tags: ["high-protein", "low-fat", "omega-3", "traditional"],
    keywords: ["conejo", "romero", "horno", "magro"],
    ingredients: [
      { name: "Conejo troceado", grams: 250, isMainIngredient: true, category: "protein" },
      { name: "Patata", grams: 150, isMainIngredient: false, category: "carb" },
      { name: "Romero fresco", grams: 5, isMainIngredient: false, category: "other" },
      { name: "Ajo", grams: 8, isMainIngredient: false, category: "other" },
      { name: "Aceite de oliva", grams: 10, isMainIngredient: false, category: "fat" },
    ],
    calories: 540, protein: 54, carbs: 42, fat: 18, prepTimeMinutes: 15, cookTimeMinutes: 50,
    servingSize: "1 plato", servings: 1,
  },
  // ── DESSERTS / SWEETS ──────────────────────────────────────────────────────
  {
    name: "Macedonia de frutas con yogur y proteína",
    displayName: "Macedonia con yogur y proteína",
    tagline: "Frutas variadas con yogur proteico. Post-entreno dulce y ligero.",
    mealType: "snack", dietType: "vegetarian", goalFit: "all", mainIngredient: "fruit",
    cuisine: "all", difficulty: "easy",
    tags: ["high-protein", "antioxidants", "quick", "post-workout"],
    keywords: ["macedonia", "frutas", "post-entreno"],
    ingredients: [
      { name: "Frutas variadas", grams: 200, isMainIngredient: true, category: "carb" },
      { name: "Yogur griego natural", grams: 120, isMainIngredient: false, category: "protein" },
      { name: "Proteína whey", grams: 20, isMainIngredient: false, category: "protein" },
    ],
    calories: 340, protein: 32, carbs: 44, fat: 4, prepTimeMinutes: 5, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Arroz con leche proteico (skyr y canela)",
    displayName: "Arroz con leche proteico",
    tagline: "Postre tradicional con proteína extra. Rico en calcio y proteína.",
    mealType: "snack", dietType: "vegetarian", goalFit: "all", mainIngredient: "rice",
    cuisine: "spanish", difficulty: "medium",
    tags: ["high-protein", "calcium", "comfort-food", "classic"],
    keywords: ["arroz con leche", "canela", "postre tradicional"],
    ingredients: [
      { name: "ArrozSOS", grams: 50, isMainIngredient: true, category: "carb" },
      { name: "Skyr", grams: 120, isMainIngredient: false, category: "protein" },
      { name: "Leche semidesnatada", grams: 200, isMainIngredient: false, category: "protein" },
      { name: "Canela", grams: 2, isMainIngredient: false, category: "other" },
    ],
    calories: 380, protein: 24, carbs: 58, fat: 6, prepTimeMinutes: 5, cookTimeMinutes: 30,
    servingSize: "1 porción", servings: 1,
  },
  {
    name: "Tortitas de plátano y huevo",
    displayName: "Tortitas de plátano y huevo",
    tagline: "Solo 2 ingredientes. Sin harina, sin azúcar. En 5 minutos.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "all", mainIngredient: "banana",
    cuisine: "all", difficulty: "easy",
    tags: ["gluten-free", "quick", "no-flour"],
    keywords: ["tortitas", "plátano", "sin harina", "sin azúcar"],
    ingredients: [
      { name: "Plátano maduro", grams: 120, isMainIngredient: true, category: "carb" },
      { name: "Huevos", grams: 100, isMainIngredient: false, category: "protein" },
    ],
    calories: 320, protein: 18, carbs: 42, fat: 10, prepTimeMinutes: 3, cookTimeMinutes: 8,
    servingSize: "3 tortitas", servings: 1,
  },
  {
    name: "Pan de plátano proteico (sin azúcar añadido)",
    displayName: "Pan de plátano proteico",
    tagline: "Húmedo, denso y con 18g de proteína por slice. Snack o desayuno.",
    mealType: "snack", dietType: "vegetarian", goalFit: "all", mainIngredient: "banana",
    cuisine: "all", difficulty: "easy",
    tags: ["high-protein", "meal-prep", "snack"],
    keywords: ["pan de plátano", "sin azúcar", "snack denso"],
    ingredients: [
      { name: "Plátano maduro", grams: 200, isMainIngredient: true, category: "carb" },
      { name: "Harina de avena", grams: 80, isMainIngredient: false, category: "carb" },
      { name: "Proteína whey vainilla", grams: 40, isMainIngredient: false, category: "protein" },
      { name: "Huevos", grams: 100, isMainIngredient: false, category: "protein" },
    ],
    calories: 420, protein: 22, carbs: 54, fat: 12, prepTimeMinutes: 10, cookTimeMinutes: 40,
    servingSize: "8 slices", servings: 8,
  },
  {
    name: "Crepes de avena rellenos de queso fresco y frutos rojos",
    displayName: "Crepes de avena con frutos rojos",
    tagline: "Delgados y flexibles. Rellenos de queso fresco y frutos rojos.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "all", mainIngredient: "oats",
    cuisine: "all", difficulty: "easy",
    tags: ["high-protein", "fiber", "flexible"],
    keywords: ["crepes", "avena", "frutos rojos"],
    ingredients: [
      { name: "Avena", grams: 60, isMainIngredient: true, category: "carb" },
      { name: "Queso fresco 0%", grams: 100, isMainIngredient: false, category: "protein" },
      { name: "Frutos rojos", grams: 80, isMainIngredient: false, category: "carb" },
      { name: "Huevos", grams: 60, isMainIngredient: false, category: "protein" },
    ],
    calories: 460, protein: 28, carbs: 54, fat: 14, prepTimeMinutes: 8, cookTimeMinutes: 12,
    servingSize: "2 crepes", servings: 1,
  },
  // ── ADDITIONAL RECIPES (fill to 100) ──────────────────────────────────────
  {
    name: "Fajitas de pollo con pimientos y tortillas integrales",
    displayName: "Fajitas de pollo con pimientos",
    tagline: "Fajitas con pollo, pimientos y cebolla. Mexican night sin excesos.",
    mealType: "dinner", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "mexican", difficulty: "easy",
    tags: ["high-protein", "meal-prep"],
    keywords: ["fajitas", "mexicano", "pimientos"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Tortillas integrales", grams: 60, isMainIngredient: false, category: "carb" },
      { name: "Pimientos mixtos", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Cebolla", grams: 50, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 560, protein: 46, carbs: 50, fat: 14, prepTimeMinutes: 10, cookTimeMinutes: 18,
    servingSize: "2 fajitas", servings: 1,
  },
  {
    name: "Nuggets de pollo al horno con salsa de yogur",
    displayName: "Nuggets de pollo al horno",
    tagline: "Nuggets caseros sin freír. Crujientes por fuera, jugosos por dentro.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "american", difficulty: "easy",
    tags: ["high-protein", "comfort-food", "kid-friendly"],
    keywords: ["nuggets", "pollo", "horno", "sin freír"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Pan rallado integral", grams: 40, isMainIngredient: false, category: "carb" },
      { name: "Yogur natural", grams: 60, isMainIngredient: false, category: "protein" },
    ],
    calories: 480, protein: 44, carbs: 36, fat: 16, prepTimeMinutes: 15, cookTimeMinutes: 20,
    servingSize: "6 nuggets", servings: 1,
  },
  {
    name: "Curry rojo de gambas con coco y verduras",
    displayName: "Curry rojo de gambas con coco",
    tagline: "Thai rojo con gambas, leche de coco y verduras. Aromático y graso (saludable).",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "shrimp",
    cuisine: "asian", difficulty: "medium",
    tags: ["high-protein", "anti-inflammatory", "aromatic", "dairy-free"],
    keywords: ["curry rojo", "tailandés", "coco", "gambas"],
    ingredients: [
      { name: "Gambas", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Leche de coco light", grams: 120, isMainIngredient: false, category: "fat" },
      { name: "Pasta de curry rojo", grams: 20, isMainIngredient: false, category: "other" },
      { name: "Calabacín", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Arroz jazmín", grams: 100, isMainIngredient: false, category: "carb" },
    ],
    calories: 620, protein: 42, carbs: 56, fat: 24, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Pechuga de pollo rellena de espinacas y ricotta",
    displayName: "Pollo rellena de espinacas y ricotta",
    tagline: "Pechuga deshilachada y rellena. Impresionante sin complicarse.",
    mealType: "dinner", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "italian", difficulty: "medium",
    tags: ["high-protein", "impressive", "gluten-free"],
    keywords: ["pollo relleno", "ricotta", "espinacas", "impresionar"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Espinacas", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Ricotta", grams: 60, isMainIngredient: false, category: "protein" },
      { name: "Queso parmesano", grams: 15, isMainIngredient: false, category: "protein" },
    ],
    calories: 520, protein: 52, carbs: 8, fat: 30, prepTimeMinutes: 15, cookTimeMinutes: 30,
    servingSize: "1 pechuga rellena", servings: 1,
  },
  {
    name: "Sopa de pollo con verduras y fideos integrales",
    displayName: "Sopa de pollo con fideos",
    tagline: "Caldo reconfortante con pollo y fideos. Líquido, cálido y proteico.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "low-calorie", "comfort-food", "meal-prep"],
    keywords: ["sopa", "pollo", "caldo", "fideos"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 120, isMainIngredient: true, category: "protein" },
      { name: "Fideos integrales", grams: 50, isMainIngredient: false, category: "carb" },
      { name: "Zanahoria", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Apio", grams: 40, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 380, protein: 36, carbs: 42, fat: 6, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 bowl grande", servings: 1,
  },
  {
    name: "Pavo al horno con especias y verduras",
    displayName: "Pavo al horno con especias",
    tagline: "Pechuga de pavo horneada con hierbas provenzales y verduras.",
    mealType: "dinner", dietType: "omnivore", goalFit: "cut", mainIngredient: "turkey",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "low-fat", "meal-prep", "gluten-free"],
    keywords: ["pavo", "horno", "hierbas"],
    ingredients: [
      { name: "Pechuga de pavo", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Calabacín", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Tomate", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Hierbas provenzales", grams: 5, isMainIngredient: false, category: "other" },
    ],
    calories: 380, protein: 50, carbs: 14, fat: 14, prepTimeMinutes: 10, cookTimeMinutes: 35,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Bowl de pollo, verduras y salsa de cacahuete",
    displayName: "Bowl de pollo con salsa de cacahuete",
    tagline: "Tailandés-inspired: pollo con verduras y salsa cremosa de cacahuete.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "asian", difficulty: "easy",
    tags: ["high-protein", "dairy-free", "meal-prep"],
    keywords: ["tailandés", "cacahuete", "salsa cremosa"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Arroz jazmín", grams: 120, isMainIngredient: false, category: "carb" },
      { name: "Edamame", grams: 60, isMainIngredient: false, category: "protein" },
      { name: "Mantequilla de cacahuete", grams: 20, isMainIngredient: false, category: "fat" },
      { name: "Salsa soja", grams: 15, isMainIngredient: false, category: "other" },
    ],
    calories: 640, protein: 48, carbs: 58, fat: 22, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Hamburguesa de salmón con ensalada de col",
    displayName: "Hamburguesa de salmón con ensalada",
    tagline: "Medallones de salmón en lugar de carne. Omega-3 en formato burger.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "salmon",
    cuisine: "american", difficulty: "easy",
    tags: ["high-protein", "omega-3", "gluten-free-option"],
    keywords: ["salmón", "hamburguesa", "col"],
    ingredients: [
      { name: "Salmón fresco", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Pan integral", grams: 60, isMainIngredient: false, category: "carb" },
      { name: "Col rallada", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Ensalada verde", grams: 40, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 560, protein: 44, carbs: 40, fat: 24, prepTimeMinutes: 10, cookTimeMinutes: 15,
    servingSize: "1 hamburguesa", servings: 1,
  },
  {
    name: "Bowl de yogur con granola proteica casera",
    displayName: "Bowl de yogur con granola",
    tagline: "Granola casera crujiente sobre skyr. Dulce natural y alto en proteína.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "all", mainIngredient: "yogurt",
    cuisine: "all", difficulty: "easy",
    tags: ["high-protein", "fiber", "meal-prep", "portable"],
    keywords: ["granola", "yogur", "desayuno dulce"],
    ingredients: [
      { name: "Skyr natural", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Granola casera", grams: 40, isMainIngredient: false, category: "carb" },
      { name: "Frutos rojos", grams: 60, isMainIngredient: false, category: "carb" },
    ],
    calories: 440, protein: 30, carbs: 52, fat: 12, prepTimeMinutes: 5, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Omelette de champiñones y jamón serrano magro",
    displayName: "Omelette con champiñones y jamón",
    tagline: "Huevos con champiñones y jamón serrano. Riquísimo en 10 minutos.",
    mealType: "breakfast", dietType: "omnivore", goalFit: "all", mainIngredient: "eggs",
    cuisine: "spanish", difficulty: "easy",
    tags: ["high-protein", "low-carb", "quick"],
    keywords: ["omelette", "champiñones", "jamón serrano"],
    ingredients: [
      { name: "Huevos", grams: 150, isMainIngredient: true, category: "protein" },
      { name: "Champiñones", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Jamón serrano magro", grams: 40, isMainIngredient: false, category: "protein" },
    ],
    calories: 380, protein: 34, carbs: 6, fat: 24, prepTimeMinutes: 5, cookTimeMinutes: 10,
    servingSize: "1 omelette grande", servings: 1,
  },
  {
    name: "Revuelto de huevo con salmón ahumado y espárragos",
    displayName: "Revuelto de salmón y espárragos",
    tagline: "Huevos cremosos con salmón ahumado y espárragos trigueros.",
    mealType: "breakfast", dietType: "pescatarian", goalFit: "all", mainIngredient: "salmon",
    cuisine: "spanish", difficulty: "easy",
    tags: ["high-protein", "omega-3", "quick"],
    keywords: ["revuelto", "salmón ahumado", "espárragos"],
    ingredients: [
      { name: "Huevos", grams: 120, isMainIngredient: false, category: "protein" },
      { name: "Salmón ahumado", grams: 60, isMainIngredient: true, category: "protein" },
      { name: "Espárragos trigueros", grams: 80, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 420, protein: 38, carbs: 6, fat: 28, prepTimeMinutes: 5, cookTimeMinutes: 10,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Pizza de base de coliflor con pollo y verduras",
    displayName: "Pizza de coliflor con pollo",
    tagline: "Pizza con base de coliflor. Menos carbs, más volumen. Pizza sin culpa.",
    mealType: "dinner", dietType: "omnivore", goalFit: "cut", mainIngredient: "chicken",
    cuisine: "italian", difficulty: "medium",
    tags: ["low-carb", "high-protein", "gluten-free", "comfort-food"],
    keywords: ["pizza", "coliflor", "sin harina"],
    ingredients: [
      { name: "Coliflor rallada", grams: 250, isMainIngredient: true, category: "vegetable" },
      { name: "Pechuga de pollo", grams: 120, isMainIngredient: false, category: "protein" },
      { name: "Tomate triturado", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Mozzarella light", grams: 60, isMainIngredient: false, category: "protein" },
    ],
    calories: 420, protein: 42, carbs: 22, fat: 18, prepTimeMinutes: 15, cookTimeMinutes: 25,
    servingSize: "1 pizza mediana", servings: 1,
  },
  {
    name: "Ensalada de pasta integral con atún y maíz",
    displayName: "Ensalada de pasta con atún",
    tagline: "Pasta fría con atún, maíz y verduras. Meal prep winner.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "tuna",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "meal-prep", "portable", "gluten-free-option"],
    keywords: ["pasta fría", "atún", "meal prep", "verano"],
    ingredients: [
      { name: "Pasta integral", grams: 80, isMainIngredient: false, category: "carb" },
      { name: "Atún en conserva", grams: 80, isMainIngredient: true, category: "protein" },
      { name: "Maíz dulce", grams: 60, isMainIngredient: false, category: "carb" },
      { name: "Tomate", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Olivas", grams: 30, isMainIngredient: false, category: "fat" },
    ],
    calories: 520, protein: 38, carbs: 58, fat: 14, prepTimeMinutes: 10, cookTimeMinutes: 15,
    servingSize: "1 bowl grande", servings: 1,
  },
  {
    name: "Ensalada de arroz integral con pollo y verduras",
    displayName: "Ensalada de arroz con pollo",
    tagline: "Arroz integral frío con pollo y verduras variadas. Meal prep perfecto.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "fiber", "meal-prep", "gluten-free"],
    keywords: ["arroz frío", "meal prep", "ensalada templada"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 130, isMainIngredient: true, category: "protein" },
      { name: "Arroz integral cocido", grams: 140, isMainIngredient: false, category: "carb" },
      { name: "Maíz dulce", grams: 60, isMainIngredient: false, category: "carb" },
      { name: "Tomate", grams: 60, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 540, protein: 44, carbs: 58, fat: 12, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Salpicón de marisco con aguacate",
    displayName: "Salpicón de marisco",
    tagline: "Mezcla de mariscos con aguacate. Fresco, denso y nutritivo.",
    mealType: "lunch", dietType: "pescatarian", goalFit: "all", mainIngredient: "seafood",
    cuisine: "spanish", difficulty: "easy",
    tags: ["high-protein", "omega-3", "gluten-free", "fresh", "no-cook"],
    keywords: ["salpicón", "marisco", "aguacate", "español"],
    ingredients: [
      { name: "Mezcla de marisco cocido", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Aguacate", grams: 80, isMainIngredient: false, category: "fat" },
      { name: "Tomate", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Cebolla", grams: 40, isMainIngredient: false, category: "vegetable" },
      { name: "Limón", grams: 15, isMainIngredient: false, category: "other" },
    ],
    calories: 480, protein: 42, carbs: 14, fat: 30, prepTimeMinutes: 10, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Bacalao al horno con garbanzos y espinacas",
    displayName: "Bacalao con garbanzos y espinacas",
    tagline: "One-pan: bacalao, garbanzos y espinacas. Mediterránea en un plato.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "cod",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "gluten-free", "omega-3", "one-pan", "fiber"],
    keywords: ["bacalao", "garbanzos", "espinacas", "un plato"],
    ingredients: [
      { name: "Bacalao desalado", grams: 170, isMainIngredient: true, category: "protein" },
      { name: "Garbanzos cocidos", grams: 120, isMainIngredient: false, category: "protein" },
      { name: "Espinacas", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Tomate cherry", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Aceite de oliva", grams: 10, isMainIngredient: false, category: "fat" },
    ],
    calories: 520, protein: 50, carbs: 30, fat: 22, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Tortilla española ligera",
    displayName: "Tortilla española light",
    tagline: "Tortilla con menos aceite. Tradición española más ligera.",
    mealType: "lunch", dietType: "vegetarian", goalFit: "all", mainIngredient: "eggs",
    cuisine: "spanish", difficulty: "easy",
    tags: ["high-protein", "vegetarian", "classic", "gluten-free"],
    keywords: ["tortilla", "patata", "español", "huevos"],
    ingredients: [
      { name: "Huevos", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "Patata", grams: 200, isMainIngredient: false, category: "carb" },
      { name: "Cebolla", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Aceite de oliva", grams: 10, isMainIngredient: false, category: "fat" },
    ],
    calories: 460, protein: 26, carbs: 42, fat: 22, prepTimeMinutes: 5, cookTimeMinutes: 20,
    servingSize: "2-3 porciones", servings: 2,
  },
  {
    name: "Estofado de garbanzos con espinacas y bacalao",
    displayName: "Estofado de garbanzos con espinacas y bacalao",
    tagline: "Garbanzos + espinacas + bacalao desalado. Proteína dual completa.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "chickpeas",
    cuisine: "spanish", difficulty: "easy",
    tags: ["high-protein", "gluten-free", "fiber", "meal-prep", "omega-3"],
    keywords: ["garbanzos", "espinacas", "bacalao", "español"],
    ingredients: [
      { name: "Garbanzos cocidos", grams: 180, isMainIngredient: false, category: "protein" },
      { name: "Bacalao desalado", grams: 120, isMainIngredient: false, category: "protein" },
      { name: "Espinacas", grams: 100, isMainIngredient: true, category: "vegetable" },
      { name: "Cebolla", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Ajo", grams: 5, isMainIngredient: false, category: "other" },
    ],
    calories: 520, protein: 46, carbs: 48, fat: 14, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 plato hondo", servings: 1,
  },
  {
    name: "Potaje de alubias con verduras y atún",
    displayName: "Potaje de alubias con atún",
    tagline: "Legumbres con verduras y atún. Plato único rico y saciante.",
    mealType: "dinner", dietType: "pescatarian", goalFit: "all", mainIngredient: "beans",
    cuisine: "spanish", difficulty: "easy",
    tags: ["high-protein", "fiber", "gluten-free", "meal-prep"],
    keywords: ["alubias", "potaje", "español", "atún"],
    ingredients: [
      { name: "Alubias blancas cocidas", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "Atún en conserva", grams: 80, isMainIngredient: false, category: "protein" },
      { name: "Verduras variadas", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Patata", grams: 80, isMainIngredient: false, category: "carb" },
    ],
    calories: 540, protein: 42, carbs: 60, fat: 12, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 plato hondo", servings: 1,
  },
  {
    name: "Bowl de quinoa con huevo, aguacate y verduras",
    displayName: "Quinoa bowl con huevo y aguacate",
    tagline: "Quinoa completa con huevo, aguacate y verduras. Vegano-friendly con huevo opcional.",
    mealType: "lunch", dietType: "vegetarian", goalFit: "all", mainIngredient: "quinoa",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["vegan", "high-protein", "fiber", "gluten-free", "meal-prep"],
    keywords: ["quinoa", "vegetariano", "bowl completo"],
    ingredients: [
      { name: "Quinoa cocida", grams: 150, isMainIngredient: true, category: "carb" },
      { name: "Aguacate", grams: 80, isMainIngredient: false, category: "fat" },
      { name: "Huevo cocido", grams: 50, isMainIngredient: false, category: "protein" },
      { name: "Tomate cherry", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Espinacas", grams: 40, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 560, protein: 22, carbs: 52, fat: 30, prepTimeMinutes: 10, cookTimeMinutes: 15,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Bowl de pollo, verduras y salsa de cacahuete light",
    displayName: "Bowl de pollo con salsa de cacahuete",
    tagline: "Tailandés fusion: pollo, verduras ycacahuete. Creamy y proteico.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "chicken",
    cuisine: "asian", difficulty: "easy",
    tags: ["high-protein", "dairy-free", "meal-prep", "umami"],
    keywords: ["tailandés", "cacahuete", "salsa cremosa"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Arroz jazmín", grams: 120, isMainIngredient: false, category: "carb" },
      { name: "Edamame", grams: 60, isMainIngredient: false, category: "protein" },
      { name: "Mantequilla de cacahuete", grams: 20, isMainIngredient: false, category: "fat" },
      { name: "Salsa soja", grams: 15, isMainIngredient: false, category: "other" },
    ],
    calories: 640, protein: 48, carbs: 58, fat: 22, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Crema de verduras verde con topping proteico",
    displayName: "Crema verde con topping proteico",
    tagline: "Verduras verdes en crema con topping de frango y semillas.",
    mealType: "lunch", dietType: "omnivore", goalFit: "all", mainIngredient: "vegetables",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["vegan", "fiber", "low-calorie", "antioxidants", "meal-prep"],
    keywords: ["crema verde", "verduras", "sopa"],
    ingredients: [
      { name: "Espinacas y calabacín", grams: 300, isMainIngredient: true, category: "vegetable" },
      { name: "Cebolla", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Caldo de verduras", grams: 200, isMainIngredient: false, category: "other" },
      { name: "Queso fresco 0%", grams: 40, isMainIngredient: false, category: "protein" },
      { name: "Semillas de girasol", grams: 10, isMainIngredient: false, category: "fat" },
    ],
    calories: 260, protein: 14, carbs: 28, fat: 12, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 bowl grande", servings: 1,
  },
  {
    name: "Batido de proteína con avena y frutas",
    displayName: "Batido proteico de avena y frutas",
    tagline: "Batido post-entreno rápido con proteína y carbohidratos.",
    mealType: "post-workout", dietType: "omnivore", goalFit: "bulk", mainIngredient: "whey",
    cuisine: "american", difficulty: "easy",
    tags: ["high-protein", "quick", "post-workout", "no-cook"],
    keywords: ["batido", "proteína", "post-entreno", "recuperación"],
    ingredients: [
      { name: "Proteína en polvo", grams: 30, isMainIngredient: true, category: "protein" },
      { name: "Avena", grams: 40, isMainIngredient: false, category: "carb" },
      { name: "Plátano", grams: 100, isMainIngredient: false, category: "carb" },
      { name: "Leche semidesnatada", grams: 250, isMainIngredient: false, category: "protein" },
    ],
    calories: 380, protein: 35, carbs: 45, fat: 8, prepTimeMinutes: 3, cookTimeMinutes: 0,
    servingSize: "1 vaso", servings: 1,
  },
  {
    name: "Ensalada de quinoa con garbanzos y verduras",
    displayName: "Ensalada de quinoa y garbanzos",
    tagline: "Ensalada vegetariana alta en proteína y fibra.",
    mealType: "lunch", dietType: "vegetarian", goalFit: "all", mainIngredient: "quinoa",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["vegan", "high-fiber", "high-protein", "meal-prep"],
    keywords: ["vegetariano", "quinoa", "garbanzos", "ensalada"],
    ingredients: [
      { name: "Quinoa", grams: 120, isMainIngredient: true, category: "carb" },
      { name: "Garbanzos", grams: 100, isMainIngredient: false, category: "protein" },
      { name: "Pepino", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Tomate cherry", grams: 80, isMainIngredient: false, category: "vegetable" },
      { name: "Aceite de oliva", grams: 15, isMainIngredient: false, category: "fat" },
    ],
    calories: 420, protein: 18, carbs: 52, fat: 16, prepTimeMinutes: 10, cookTimeMinutes: 15,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Sándwich de pavo con aguacate",
    displayName: "Sándwich de pavo y aguacate",
    tagline: "Sándwich rápido con proteína magra y grasas saludables.",
    mealType: "lunch", dietType: "omnivore", goalFit: "maintain", mainIngredient: "turkey",
    cuisine: "american", difficulty: "easy",
    tags: ["high-protein", "quick", "no-cook", "lunch"],
    keywords: ["sándwich", "pavo", "aguacate", "almuerzo"],
    ingredients: [
      { name: "Pechuga de pavo", grams: 120, isMainIngredient: true, category: "protein" },
      { name: "Pan integral", grams: 80, isMainIngredient: false, category: "carb" },
      { name: "Aguacate", grams: 60, isMainIngredient: false, category: "fat" },
      { name: "Lechuga", grams: 30, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 440, protein: 32, carbs: 38, fat: 18, prepTimeMinutes: 5, cookTimeMinutes: 0,
    servingSize: "1 sándwich", servings: 1,
  },
  {
    name: "Pasta integral con salsa de tomate y albóndigas",
    displayName: "Pasta con albóndigas",
    tagline: "Clásico italiano con proteína y carbohidratos complejos.",
    mealType: "dinner", dietType: "omnivore", goalFit: "bulk", mainIngredient: "beef",
    cuisine: "italian", difficulty: "medium",
    tags: ["high-protein", "comfort-food", "italian"],
    keywords: ["pasta", "albóndigas", "italiano", "cena"],
    ingredients: [
      { name: "Pasta integral", grams: 100, isMainIngredient: true, category: "carb" },
      { name: "Carne molida", grams: 150, isMainIngredient: false, category: "protein" },
      { name: "Salsa de tomate", grams: 100, isMainIngredient: false, category: "other" },
      { name: "Queso parmesano", grams: 20, isMainIngredient: false, category: "fat" },
    ],
    calories: 580, protein: 35, carbs: 60, fat: 18, prepTimeMinutes: 15, cookTimeMinutes: 25,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Tostada de aguacate con huevo y semillas",
    displayName: "Tostada de aguacate con huevo",
    tagline: "Desayuno saludable con grasas y proteína.",
    mealType: "breakfast", dietType: "vegetarian", goalFit: "all", mainIngredient: "avocado",
    cuisine: "american", difficulty: "easy",
    tags: ["vegetarian", "healthy-fats", "quick", "brunch"],
    keywords: ["aguacate", "huevo", "desayuno", "tostada"],
    ingredients: [
      { name: "Pan integral", grams: 60, isMainIngredient: false, category: "carb" },
      { name: "Aguacate", grams: 80, isMainIngredient: true, category: "fat" },
      { name: "Huevo", grams: 100, isMainIngredient: false, category: "protein" },
      { name: "Semillas de chía", grams: 10, isMainIngredient: false, category: "fat" },
    ],
    calories: 460, protein: 18, carbs: 35, fat: 28, prepTimeMinutes: 5, cookTimeMinutes: 5,
    servingSize: "1 toast", servings: 1,
  },
  {
    name: "Bowl de arroz con pollo y verduras",
    displayName: "Bowl de pollo con arroz",
    tagline: "Bowl nutritivo con proteína y carbs.",
    mealType: "lunch", dietType: "omnivore", goalFit: "maintain", mainIngredient: "chicken",
    cuisine: "asian", difficulty: "easy",
    tags: ["high-protein", "meal-prep", "asian", "bowl"],
    keywords: ["pollo", "arroz", "verduras", "bowl"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 160, isMainIngredient: true, category: "protein" },
      { name: "Arroz jazmín", grams: 150, isMainIngredient: false, category: "carb" },
      { name: "Brócoli", grams: 100, isMainIngredient: false, category: "vegetable" },
      { name: "Zanahoria", grams: 60, isMainIngredient: false, category: "vegetable" },
      { name: "Salsa soja", grams: 15, isMainIngredient: false, category: "other" },
    ],
    calories: 520, protein: 42, carbs: 55, fat: 12, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Smoothie verde con espinacas y frutas",
    displayName: "Smoothie verde detox",
    tagline: "Smoothie depurativo rico en antioxidantes.",
    mealType: "breakfast", dietType: "vegan", goalFit: "cut", mainIngredient: "spinach",
    cuisine: "american", difficulty: "easy",
    tags: ["vegan", "detox", "low-calorie", "no-cook"],
    keywords: ["verde", "espinacas", "detox", "smoothie"],
    ingredients: [
      { name: "Espinacas", grams: 100, isMainIngredient: true, category: "vegetable" },
      { name: "Plátano", grams: 80, isMainIngredient: false, category: "carb" },
      { name: "Manzana", grams: 100, isMainIngredient: false, category: "carb" },
      { name: "Leche de almendra", grams: 200, isMainIngredient: false, category: "other" },
    ],
    calories: 180, protein: 4, carbs: 40, fat: 3, prepTimeMinutes: 5, cookTimeMinutes: 0,
    servingSize: "1 vaso", servings: 1,
  },
  {
    name: "Filete de ternera con patatas",
    displayName: "Filete de ternera con patatas",
    tagline: "Plato principal proteico para ganar masa.",
    mealType: "dinner", dietType: "omnivore", goalFit: "bulk", mainIngredient: "beef",
    cuisine: "spanish", difficulty: "medium",
    tags: ["high-protein", "comfort-food", "spanish"],
    keywords: ["ternera", "filete", "patatas", "cena"],
    ingredients: [
      { name: "Filete de ternera", grams: 200, isMainIngredient: true, category: "protein" },
      { name: "Patata", grams: 200, isMainIngredient: false, category: "carb" },
      { name: "Ajo", grams: 10, isMainIngredient: false, category: "seasoning" },
      { name: "Aceite de oliva", grams: 15, isMainIngredient: false, category: "fat" },
    ],
    calories: 620, protein: 48, carbs: 40, fat: 28, prepTimeMinutes: 10, cookTimeMinutes: 25,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Yogur con nueces y miel",
    displayName: "Yogur con nueces y miel",
    tagline: "Snack rápido con proteína y grasas saludables.",
    mealType: "snack", dietType: "vegetarian", goalFit: "all", mainIngredient: "yogurt",
    cuisine: "mediterranean", difficulty: "easy",
    tags: ["high-protein", "quick", "snack", "no-cook"],
    keywords: ["yogur", "nueces", "miel", "snack"],
    ingredients: [
      { name: "Yogur griego", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Nueces", grams: 20, isMainIngredient: false, category: "fat" },
      { name: "Miel", grams: 15, isMainIngredient: false, category: "carb" },
    ],
    calories: 280, protein: 18, carbs: 24, fat: 14, prepTimeMinutes: 2, cookTimeMinutes: 0,
    servingSize: "1 bowl", servings: 1,
  },
  {
    name: "Huevos revueltos con bacon",
    displayName: "Huevos revueltos con bacon",
    tagline: "Desayuno americano clásico alto en proteína.",
    mealType: "breakfast", dietType: "omnivore", goalFit: "bulk", mainIngredient: "eggs",
    cuisine: "american", difficulty: "easy",
    tags: ["high-protein", "keto", "quick", "american"],
    keywords: ["huevos", "bacon", "desayuno", "americano"],
    ingredients: [
      { name: "Huevos", grams: 180, isMainIngredient: true, category: "protein" },
      { name: "Bacon", grams: 60, isMainIngredient: false, category: "protein" },
      { name: "Mantequilla", grams: 15, isMainIngredient: false, category: "fat" },
    ],
    calories: 420, protein: 28, carbs: 2, fat: 34, prepTimeMinutes: 3, cookTimeMinutes: 8,
    servingSize: "1 plato", servings: 1,
  },
  {
    name: "Sopa de pollo con fideos",
    displayName: "Sopa de pollo con fideos",
    tagline: "Sopa reconfortante perfecta para пост-тренировка.",
    mealType: "dinner", dietType: "omnivore", goalFit: "maintain", mainIngredient: "chicken",
    cuisine: "asian", difficulty: "easy",
    tags: ["comfort-food", "hydrating", "post-workout"],
    keywords: ["sopa", "pollo", "fideos", "cena"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 120, isMainIngredient: true, category: "protein" },
      { name: "Fideos", grams: 60, isMainIngredient: false, category: "carb" },
      { name: "Caldo de pollo", grams: 300, isMainIngredient: false, category: "other" },
      { name: "Cebolla", grams: 40, isMainIngredient: false, category: "vegetable" },
      { name: "Zanahoria", grams: 40, isMainIngredient: false, category: "vegetable" },
    ],
    calories: 340, protein: 30, carbs: 35, fat: 8, prepTimeMinutes: 10, cookTimeMinutes: 20,
    servingSize: "1 bowl", servings: 1,
  },
];

const recipeMacroTemplates: Record<
  string,
  { calories: number; protein: number; carbs: number; fat: number }
> = {
  breakfast: { calories: 420, protein: 25, carbs: 48, fat: 12 },
  snack: { calories: 260, protein: 16, carbs: 28, fat: 8 },
  fish: { calories: 560, protein: 40, carbs: 45, fat: 18 },
  seafood: { calories: 580, protein: 38, carbs: 55, fat: 16 },
  poultry: { calories: 600, protein: 45, carbs: 55, fat: 16 },
  beef: { calories: 650, protein: 45, carbs: 50, fat: 20 },
  vegetarian: { calories: 520, protein: 26, carbs: 68, fat: 14 },
  salad: { calories: 450, protein: 30, carbs: 40, fat: 18 },
  soup: { calories: 360, protein: 20, carbs: 40, fat: 10 },
  pasta: { calories: 620, protein: 35, carbs: 80, fat: 14 },
  rice: { calories: 620, protein: 38, carbs: 78, fat: 14 },
  wrap: { calories: 520, protein: 34, carbs: 55, fat: 16 },
  dessert: { calories: 320, protein: 18, carbs: 40, fat: 8 },
  other: { calories: 500, protein: 30, carbs: 55, fat: 15 },
};

const recipeIngredientTemplates: Record<
  string,
  Array<{ name: string; grams: number }>
> = {
  breakfast: [
    { name: "Avena", grams: 60 },
    { name: "Yogur griego", grams: 180 },
    { name: "Fruta fresca", grams: 120 },
    { name: "Frutos secos", grams: 20 },
  ],
  snack: [
    { name: "Yogur skyr", grams: 170 },
    { name: "Fruta fresca", grams: 120 },
    { name: "Miel", grams: 10 },
    { name: "Almendras", grams: 15 },
  ],
  fish: [
    { name: "Pescado", grams: 160 },
    { name: "Patata o boniato", grams: 200 },
    { name: "Verduras mixtas", grams: 200 },
    { name: "Aceite de oliva", grams: 10 },
  ],
  seafood: [
    { name: "Marisco", grams: 170 },
    { name: "Arroz integral", grams: 180 },
    { name: "Verduras mixtas", grams: 180 },
    { name: "Aceite de oliva", grams: 10 },
  ],
  poultry: [
    { name: "Pechuga de pollo/pavo", grams: 170 },
    { name: "Arroz integral", grams: 180 },
    { name: "Verduras mixtas", grams: 200 },
    { name: "Aceite de oliva", grams: 10 },
  ],
  beef: [
    { name: "Ternera magra", grams: 170 },
    { name: "Quinoa o arroz", grams: 180 },
    { name: "Verduras", grams: 180 },
    { name: "Aceite de oliva", grams: 10 },
  ],
  vegetarian: [
    { name: "Legumbres cocidas", grams: 180 },
    { name: "Verduras variadas", grams: 200 },
    { name: "Queso fresco o tofu", grams: 120 },
    { name: "Aceite de oliva", grams: 10 },
  ],
  salad: [
    { name: "Hojas verdes", grams: 120 },
    { name: "Proteína magra", grams: 140 },
    { name: "Verduras", grams: 150 },
    { name: "Aceite de oliva", grams: 10 },
  ],
  soup: [
    { name: "Verduras", grams: 250 },
    { name: "Proteína magra", grams: 120 },
    { name: "Caldo", grams: 300 },
    { name: "Aceite de oliva", grams: 8 },
  ],
  pasta: [
    { name: "Pasta integral", grams: 90 },
    { name: "Proteína magra", grams: 140 },
    { name: "Tomate o pesto", grams: 80 },
    { name: "Verduras", grams: 150 },
  ],
  rice: [
    { name: "Arroz integral", grams: 180 },
    { name: "Proteína magra", grams: 160 },
    { name: "Verduras", grams: 180 },
    { name: "Aceite de oliva", grams: 10 },
  ],
  wrap: [
    { name: "Tortilla integral", grams: 70 },
    { name: "Proteína magra", grams: 140 },
    { name: "Verduras", grams: 150 },
    { name: "Salsa ligera", grams: 30 },
  ],
  dessert: [
    { name: "Skyr o yogur", grams: 180 },
    { name: "Fruta", grams: 120 },
    { name: "Canela o cacao", grams: 5 },
    { name: "Frutos secos", grams: 15 },
  ],
  other: [
    { name: "Proteína magra", grams: 150 },
    { name: "Carbohidrato complejo", grams: 180 },
    { name: "Verduras", grams: 180 },
    { name: "Aceite de oliva", grams: 10 },
  ],
};

function categorizeRecipe(name: string) {
  const lower = name.toLowerCase();
  if (
    lower.includes("yogur") ||
    lower.includes("skyr") ||
    lower.includes("avena") ||
    lower.includes("overnight") ||
    lower.includes("tostadas") ||
    lower.includes("tortitas") ||
    lower.includes("omelette") ||
    lower.includes("tortilla de claras") ||
    lower.includes("porridge") ||
    lower.includes("pudín") ||
    lower.includes("pan de plátano") ||
    lower.includes("crepes") ||
    lower.includes("arroz con leche")
  ) {
    return "breakfast";
  }
  if (
    lower.includes("barritas") ||
    lower.includes("edamame") ||
    lower.includes("hummus") ||
    lower.includes("guacamole") ||
    lower.includes("fruta") ||
    lower.includes("snack") ||
    lower.includes("batido") ||
    lower.includes("smoothie") ||
    lower.includes("yogur helado") ||
    lower.includes("macedonia")
  ) {
    return "snack";
  }
  if (
    lower.includes("salmón") ||
    lower.includes("merluza") ||
    lower.includes("atún") ||
    lower.includes("bacalao") ||
    lower.includes("lubina") ||
    lower.includes("pescado") ||
    lower.includes("ceviche") ||
    lower.includes("pulpo") ||
    lower.includes("calamares") ||
    lower.includes("pez espada")
  ) {
    return "fish";
  }
  if (
    lower.includes("gambas") ||
    lower.includes("marisco") ||
    lower.includes("paella")
  ) {
    return "seafood";
  }
  if (
    lower.includes("pollo") ||
    lower.includes("pavo") ||
    lower.includes("shawarma") ||
    lower.includes("kebab")
  ) {
    return "poultry";
  }
  if (lower.includes("ternera") || lower.includes("conejo")) {
    return "beef";
  }
  if (
    lower.includes("tofu") ||
    lower.includes("tempeh") ||
    lower.includes("lentejas") ||
    lower.includes("garbanzos") ||
    lower.includes("alubias") ||
    lower.includes("quinoa")
  ) {
    return "vegetarian";
  }
  if (lower.includes("ensalada")) {
    return "salad";
  }
  if (
    lower.includes("sopa") ||
    lower.includes("crema") ||
    lower.includes("gazpacho") ||
    lower.includes("salmorejo")
  ) {
    return "soup";
  }
  if (
    lower.includes("pasta") ||
    lower.includes("noodles") ||
    lower.includes("espagueti")
  ) {
    return "pasta";
  }
  if (
    lower.includes("arroz") ||
    lower.includes("poke") ||
    lower.includes("bowl")
  ) {
    return "rice";
  }
  if (
    lower.includes("wrap") ||
    lower.includes("tacos") ||
    lower.includes("fajitas") ||
    lower.includes("sandwich") ||
    lower.includes("sándwich")
  ) {
    return "wrap";
  }
  return "other";
}

function getCategoryFallbackImage(category: string): string {
  const categoryImages: Record<string, string> = {
    breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80",
    snack: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80",
    fish: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80",
    seafood: "https://images.unsplash.com/photo-1565680018093-ebb15f005a4e?w=800&q=80",
    poultry: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=80",
    beef: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800&q=80",
    vegetarian: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80",
    pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80",
    rice: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800&q=80",
    wrap: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80",
    other: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
  };
  return categoryImages[category] ?? categoryImages.other;
}

function buildRecipeSeedItem(seed: SeedRecipe, index: number): RecipeSeedItem {
  const slug = seed.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return {
    name: seed.name,
    displayName: seed.displayName,
    tagline: seed.tagline,
    description: seed.tagline,
    calories: seed.calories,
    protein: seed.protein,
    carbs: seed.carbs,
    fat: seed.fat,
    steps: [
      "Preparar y pesar los ingredientes.",
      "Cocinar la proteína con especias suaves.",
      "Preparar el acompañamiento o verduras.",
      "Emplatar y ajustar sal y aceite de oliva.",
    ],
    slug,
    category: seed.mainIngredient as "chicken" | "beef" | "fish" | "egg" | "vegetarian" | "pasta" | "other" || "other",
    mealType: seed.mealType as "breakfast" | "lunch" | "dinner" | "snack" | "pre-workout" | "post-workout" || "lunch",
    dietType: seed.dietType as "omnivore" | "pescatarian" | "mediterranean" | "vegetarian" | "vegan" | "dairyFree" | "glutenFree" || "omnivore",
    goalFit: seed.goalFit as "bulk" | "cut" | "maintain" | "all" || "all",
    mainIngredient: seed.mainIngredient,
    cuisine: seed.cuisine as "mediterranean" | "asian" | "mexican" | "american" | "spanish" | "indian" | "middleEastern" | "all" || "mediterranean",
    difficulty: seed.difficulty as "easy" | "medium" | "hard" || "easy",
    tags: seed.tags,
    keywords: seed.keywords,
    prepTimeMinutes: seed.prepTimeMinutes,
    cookTimeMinutes: seed.cookTimeMinutes,
    servingSize: seed.servingSize ? String(seed.servingSize) : "350",
    servings: seed.servings,
    photoUrl: getCategoryFallbackImage(seed.mainIngredient),
    imageUrls: [getCategoryFallbackImage(seed.mainIngredient)],
    source: "unsplash",
    ingredients: seed.ingredients.map((ing) => ({
      name: ing.name,
      grams: ing.grams,
      isMainIngredient: ing.isMainIngredient,
      category: ing.category,
    })),
  };
}

const { callOpenAi } = createOpenAiClient({
  apiKey: env.OPENAI_API_KEY,
  fallbackApiKey: env.OPENAI_KEY,
  baseUrl: env.OPENAI_BASE_URL,
  isProduction: process.env.NODE_ENV === "production",
  logger: app.log,
  createHttpError,
});

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type FeedTrackingSnapshot = {
  checkins?: Array<{ id?: string; date?: string; weightKg?: number }>;
  foodLog?: Array<{ id?: string; date?: string }>;
  workoutLog?: Array<{ id?: string; date?: string }>;
};

function toDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getRecentEntries<T extends { date?: string }>(
  entries: T[],
  days: number,
) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);
  return entries.filter((entry) => {
    const date = toDate(entry.date);
    return date ? date >= cutoff : false;
  });
}

function buildFeedSummary(
  profile: Record<string, unknown> | null,
  tracking: FeedTrackingSnapshot | null,
) {
  const name = typeof profile?.name === "string" ? profile.name : "tu";
  const normalizedTracking: FeedTrackingSnapshot = tracking ?? {};
  const checkins = Array.isArray(normalizedTracking.checkins)
    ? normalizedTracking.checkins
    : [];
  const foodLog = Array.isArray(normalizedTracking.foodLog)
    ? normalizedTracking.foodLog
    : [];
  const workoutLog = Array.isArray(normalizedTracking.workoutLog)
    ? normalizedTracking.workoutLog
    : [];

  const recentCheckins = getRecentEntries(checkins, 7);
  const recentWorkouts = getRecentEntries(workoutLog, 7);
  const recentMeals = getRecentEntries(foodLog, 7);

  const sortedCheckins = recentCheckins
    .map((entry) => ({ ...entry, parsed: toDate(entry.date) }))
    .filter((entry) => entry.parsed)
    .sort((a, b) => (a.parsed!.getTime() > b.parsed!.getTime() ? 1 : -1));

  let trendLine = "Aún no registraste suficientes check-ins esta semana.";
  if (sortedCheckins.length >= 2) {
    const first = sortedCheckins[0];
    const last = sortedCheckins[sortedCheckins.length - 1];
    const delta = Number((last.weightKg ?? 0) - (first.weightKg ?? 0));
    const sign = delta > 0 ? "subiste" : delta < 0 ? "bajaste" : "mantuviste";
    const formatted = Math.abs(delta).toFixed(1);
    trendLine = `En los últimos 7 días ${sign} ${formatted} kg.`;
  } else if (sortedCheckins.length === 1) {
    trendLine = "Registraste 1 check-in esta semana. ¡Sigue así!";
  }

  const lines = [
    `Hola ${name}, aquí va tu resumen semanal.`,
    `Check-ins: ${recentCheckins.length}, entrenamientos: ${recentWorkouts.length}, comidas registradas: ${recentMeals.length}.`,
    trendLine,
  ];

  return {
    title: "Resumen semanal",
    summary: lines.join(" "),
    metadata: {
      checkins: recentCheckins.length,
      workouts: recentWorkouts.length,
      meals: recentMeals.length,
    },
  };
}

async function createVerificationToken(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
  });
  return token;
}

function buildVerifyEmail(params: { name?: string | null; verifyUrl: string }) {
  const brand = "FitSculpt";
  const subject = "Confirma tu email en FitSculpt";

  const safeName = (params.name ?? "").trim();
  const greeting = safeName ? `Hola ${safeName},` : "Hola,";

  const text = [
    greeting,
    "",
    `Gracias por registrarte en ${brand}.`,
    "Para activar tu cuenta, confirma tu email en este enlace:",
    params.verifyUrl,
    "",
    `Si no has solicitado una cuenta en ${brand}, ignora este mensaje.`,
  ].join("\n");

  const year = new Date().getFullYear();

  const html = `
  <!doctype html>
<html lang="es" data-scroll-behavior="smooth">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${subject}</title>
    </head>
    <body style="margin:0;background:#0b0f19;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
        Confirma tu email para activar tu cuenta de FitSculpt.
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
              style="max-width:560px;background:#111827;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
              <tr>
                <td style="padding:22px 22px 10px 22px">
                  <div style="color:#fff;font-size:18px;font-weight:700">${brand}</div>
                  <div style="color:#9ca3af;font-size:13px;margin-top:6px">Verificación de cuenta</div>
                </td>
              </tr>

              <tr>
                <td style="padding:8px 22px 22px 22px">
                  <h1 style="margin:0 0 10px 0;color:#fff;font-size:22px;line-height:1.25">
                    Confirma tu email
                  </h1>

                  <p style="margin:0 0 14px 0;color:#e5e7eb;font-size:14px;line-height:1.6">
                    ${greeting}<br/>
                    Gracias por registrarte en ${brand}. Pulsa el botón para verificar tu email y empezar.
                  </p>

                  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:16px 0 14px 0">
                    <tr>
                      <td style="border-radius:10px;background:#f59e0b">
                        <a href="${params.verifyUrl}"
                          style="display:inline-block;padding:12px 16px;color:#111827;font-size:14px;font-weight:700;text-decoration:none">
                          Verificar email
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 10px 0;color:#9ca3af;font-size:12px;line-height:1.6">
                    Si el botón no funciona, copia y pega este enlace en tu navegador:
                  </p>

                  <p style="margin:0 0 18px 0;font-size:12px;line-height:1.6">
                    <a href="${params.verifyUrl}" style="color:#93c5fd;text-decoration:underline;word-break:break-all">
                      ${params.verifyUrl}
                    </a>
                  </p>

                  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:18px 0" />

                  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6">
                    Si no has solicitado esta cuenta, ignora este mensaje.
                  </p>
                </td>
              </tr>
            </table>

            <div style="color:#6b7280;font-size:11px;margin-top:14px">
              © ${year} ${brand}
            </div>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `.trim();

  return { subject, text, html };
}

async function sendVerificationEmail(
  email: string,
  token: string,
  name?: string | null,
) {
  const verifyUrl = new URL("/verify-email", env.APP_BASE_URL);
  verifyUrl.searchParams.set("token", token);

  const { subject, text, html } = buildVerifyEmail({
    name: name ?? null,
    verifyUrl: verifyUrl.toString(),
  });

  await sendEmail({ to: email, subject, text, html });
}

async function logSignupAttempt(data: {
  email?: string;
  ipAddress?: string;
  success: boolean;
}) {
  await prisma.signupAttempt.create({
    data: {
      email: data.email,
      ipAddress: data.ipAddress,
      success: data.success,
    },
  });
}

async function seedAdmin() {
  if (!env.ADMIN_EMAIL_SEED) return;
  const user = await prisma.user.findUnique({
    where: { email: env.ADMIN_EMAIL_SEED },
  });
  if (!user) return;
  if (user.role === "ADMIN") return;
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });
  app.log.info(`Admin promoted: ${user.email}`);
}

async function handleSignup(request: FastifyRequest, reply: FastifyReply) {
  const data = registerSchema.parse(request.body);
  const ipAddress = getRequestIp(request);
  const profileDraft = normalizeSignupProfileDraft(data.profileDraft);

  // Promo code is now optional for beta launch — still validated if provided for tracking
  if (data.promoCode && !isPromoCodeValid(data.promoCode)) {
    await logSignupAttempt({ email: data.email, ipAddress, success: false });
    return reply.status(403).send({ error: "INVALID_PROMO_CODE" });
  }

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    return reply.status(409).send({ error: "EMAIL_IN_USE" });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name?.trim() ? data.name : null,
        provider: "email",
      },
    });

    await tx.userProfile.upsert({
      where: { userId: createdUser.id },
      update: {
        tracking: {},
        ...(profileDraft ? { profile: profileDraft } : {}),
      },
      create: {
        userId: createdUser.id,
        profile: profileDraft ?? Prisma.DbNull,
        tracking: {},
      },
    });

    return createdUser;
  });

  await logSignupAttempt({ email: data.email, ipAddress, success: true });

  const token = await createVerificationToken(user.id);
  await sendVerificationEmail(user.email, token);

  return reply
    .status(201)
    .send({ id: user.id, email: user.email, name: user.name });
}

// Auth routes now in routes/auth.ts - via registerAuthRoutes()
// Duplicate handlers removed to avoid conflicts
app.post("/auth/register", { preHandler: [authRateLimitMiddleware] }, handleSignup);
app.post("/auth/signup", { preHandler: [authRateLimitMiddleware] }, handleSignup);

const billingCheckoutHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  /**
   * Billing checkout contract:
   * - Auth required.
   * - Body must include exactly one selector: { priceId } or { planKey }.
   * - Success: 200 { url: string }.
   * - Errors: 400/401/500 with { error: string }.
   */
  try {
    const user = await requireUser(request);
    const checkoutSchema = z
      .object({
        priceId: z.string().min(1).optional(),
        planKey: z.string().min(1).optional(),
        returnTo: z.string().trim().optional().nullable(),
      })
      .superRefine((payload, context) => {
        const hasPriceId = Boolean(payload.priceId);
        const hasPlanKey = Boolean(payload.planKey);
        if (!hasPriceId && !hasPlanKey) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "priceId_or_planKey_required",
          });
        }
        if (hasPriceId && hasPlanKey) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "priceId_or_planKey_exclusive",
          });
        }
      });
    const payload = checkoutSchema.parse(request.body);
    const resolvedPriceId =
      payload.priceId ?? resolvePriceIdByPlanKey(payload.planKey ?? "");
    const normalizedReturnTo = typeof payload.returnTo === "string" && payload.returnTo.startsWith("/app/") ? payload.returnTo : "/app/settings/billing";
    if (!resolvedPriceId) {
      return reply.status(400).send({ error: "INVALID_INPUT" });
    }
    const targetPlan = resolvePlanByPriceId(resolvedPriceId);
    if (!targetPlan) {
      return reply.status(400).send({ error: "INVALID_INPUT" });
    }

    const idempotencyKey = `checkout-${user.id}-${Date.now()}`;
    const customerId = await getOrCreateStripeCustomer(user);
    const hasSamePlanLocally =
      isActiveSubscriptionStatus(user.subscriptionStatus) &&
      user.plan === targetPlan;

    const activeSubscriptions = await getActivePlanSubscriptions(customerId);
    const hasSamePlanInStripe = activeSubscriptions.some(
      (subscription) => getPlanFromSubscription(subscription) === targetPlan,
    );
    if (hasSamePlanInStripe) {
      let portalUrl: string | null = null;
      try {
        const session = await stripeRequest<StripePortalSession>(
          "billing_portal/sessions",
          {
            customer: customerId,
            return_url: `${env.APP_BASE_URL}/app/settings/billing`,
          },
        );
        portalUrl = session.url ?? null;
      } catch (error) {
        request.log.warn(
          { err: error, userId: user.id },
          "billing portal session failed",
        );
      }
      return reply
        .status(200)
        .send({ alreadySubscribed: true, url: portalUrl });
    }

    if (hasSamePlanLocally) {
      request.log.info(
        { userId: user.id, targetPlan },
        "billing checkout blocked due to active local plan",
      );
      return reply.status(200).send({ alreadySubscribed: true });
    }

    const successUrl = new URL(`${env.APP_BASE_URL}/app/settings/billing`);
    successUrl.searchParams.set("checkout", "success");
    successUrl.searchParams.set("returnTo", normalizedReturnTo);
    const cancelUrl = new URL(`${env.APP_BASE_URL}/app/settings/billing`);
    cancelUrl.searchParams.set("checkout", "cancel");
    cancelUrl.searchParams.set("returnTo", normalizedReturnTo);

    const session = await stripeRequest<StripeCheckoutSession>(
      "checkout/sessions",
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: user.id,
        "metadata[userId]": user.id,
        "line_items[0][price]": resolvedPriceId,
        "line_items[0][quantity]": 1,
        "subscription_data[metadata][userId]": user.id,
        "subscription_data[metadata][plan]": targetPlan,
        success_url: successUrl.toString(),
        cancel_url: cancelUrl.toString(),
      },
      { idempotencyKey },
    );

    if (!session.url) {
      throw createHttpError(502, "STRIPE_CHECKOUT_URL_MISSING");
    }
    return reply.status(200).send({ url: session.url });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ error: "INVALID_INPUT" });
    }

    const typed = err as {
      statusCode?: number;
      code?: string;
      message?: string;
    };
    if (typed.statusCode === 401) {
      return reply.status(401).send({ error: typed.code ?? "UNAUTHORIZED" });
    }

    if (typed.statusCode === 400) {
      return reply.status(400).send({ error: typed.code ?? "INVALID_INPUT" });
    }

    request.log.error(
      {
        message: typed.message,
        code: typed.code,
        statusCode: typed.statusCode,
      },
      "billing checkout failed",
    );
    return reply.status(500).send({ error: "CHECKOUT_SESSION_FAILED" });
  }
};

const billingPlansHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await requireUser(request);
    const availablePlans = getAvailableBillingPlans();

    const plans: Array<{
      planKey: SubscriptionPlan;
      title: string;
      price: { amount: number; currency: string; interval: StripeInterval };
      priceId: string;
    }> = [];
    const warnings: Array<{ key: SubscriptionPlan; reason: string }> = [];

    for (const { plan, priceId } of availablePlans) {
      try {
        const stripePrice = await stripeRequest<StripePrice>(
          `prices/${priceId}`,
          {},
          { method: "GET" },
        );

        const amount = parseStripeAmount(stripePrice);
        if (amount === null) {
          warnings.push({ key: plan, reason: "invalid_unit_amount" });
          request.log.warn(
            { plan, priceId },
            "billing plan skipped (invalid unit amount)",
          );
          continue;
        }

        plans.push({
          planKey: plan,
          title: await resolveStripePlanTitle(stripePrice, plan),
          price: {
            amount,
            currency: (stripePrice.currency ?? "usd").toUpperCase(),
            interval: normalizeStripeInterval(stripePrice),
          },
          priceId: stripePrice.id,
        });
        request.log.info({ plan, priceId }, "billing plan mapped ok");
      } catch (error) {
        if (isStripeCredentialError(error)) {
          throw createHttpError(500, "STRIPE_NOT_CONFIGURED");
        }
        if (isStripePriceNotFoundError(error)) {
          warnings.push({ key: plan, reason: "price_not_found" });
          request.log.warn(
            { plan, priceId },
            "billing plan skipped (price not found)",
          );
          continue;
        }
        warnings.push({ key: plan, reason: "price_lookup_failed" });
        request.log.warn(
          { plan, priceId },
          "billing plan skipped due to Stripe price lookup failure",
        );
      }
    }

    if (plans.length > 0) {
      return reply
        .status(200)
        .send({ plans, ...(warnings.length > 0 ? { warnings } : {}) });
    }
    return reply.status(500).send({
      error: "NO_VALID_PRICES",
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
};

const billingPortalHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = await requireUser(request);
    const customerId = await getOrCreateStripeCustomer(user);
    const session = await stripeRequest<StripePortalSession>(
      "billing_portal/sessions",
      {
        customer: customerId,
        return_url: `${env.APP_BASE_URL}/app/settings/billing`,
      },
    );
    return { url: session.url };
  } catch (error) {
    return handleRequestError(reply, error);
  }
};

const billingAdminResetCustomerLinkHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const schema = z
    .object({
      userId: z.string().min(1).optional(),
      email: z.string().email().optional(),
    })
    .refine((value) => value.userId || value.email, {
      message: "userId_or_email_required",
    });

  try {
    await requireAdmin(request);
    const { userId, email } = schema.parse(request.body);
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        })
      : await prisma.user.findFirst({
          where: { email: email! },
          select: { id: true },
        });

    if (!user) {
      return reply.status(404).send({ error: "USER_NOT_FOUND" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: null },
    });

    return reply.status(200).send({ ok: true, userId: user.id });
  } catch (error) {
    return handleRequestError(reply, error);
  }
};

const billingStripeWebhookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
    try {
      const signature = request.headers["stripe-signature"];
      if (typeof signature !== "string") {
        return reply.status(400).send({ error: "MISSING_SIGNATURE" });
      }
      const rawBody = request.body;
      if (!Buffer.isBuffer(rawBody)) {
        return reply.status(400).send({ error: "INVALID_BODY" });
      }

      verifyStripeSignature(rawBody, signature, requireStripeWebhookSecret());
      const event = JSON.parse(rawBody.toString("utf8")) as {
        id?: string;
        type: string;
        data?: { object?: unknown };
      };
      const eventType = event.type;
      const eventId = event.id ?? "unknown";
      const payload = event.data?.object;
      let resolvedUserId: string | null = null;

      const eventInserted = await prisma.$executeRaw`
        INSERT INTO "StripeWebhookEvent" ("id", "type")
        VALUES (${eventId}, ${eventType})
        ON CONFLICT ("id") DO NOTHING
      `;
      if (Number(eventInserted) === 0) {
        app.log.info(
          { eventType, eventId },
          "stripe webhook already processed",
        );
        return reply.status(200).send({ received: true, duplicate: true });
      }

      if (eventType === "checkout.session.completed") {
        const session = payload as {
          metadata?: Record<string, string> | null;
          client_reference_id?: string | null;
        };
        resolvedUserId =
          session?.metadata?.userId ?? session?.client_reference_id ?? null;
      }

      app.log.info(
        resolvedUserId
          ? { eventType, eventId, userId: resolvedUserId }
          : { eventType, eventId },
        "stripe webhook received",
      );

      if (eventType === "checkout.session.completed") {
        const session = payload as {
          customer?: string | null;
          subscription?: string | null;
          metadata?: Record<string, string> | null;
          client_reference_id?: string | null;
        };
        const userId =
          session?.metadata?.userId ?? session?.client_reference_id ?? null;
        const customerId = session?.customer ?? null;
        const subscriptionId = session?.subscription ?? null;
        if (!userId) {
          app.log.warn({ eventType }, "stripe checkout missing userId");
          return reply.status(200).send({ received: true });
        }
        const updateData: Prisma.UserUpdateInput = {};
        if (customerId) updateData.stripeCustomerId = customerId;
        if (subscriptionId) updateData.stripeSubscriptionId = subscriptionId;
        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({ where: { id: userId }, data: updateData });
          app.log.info(
            {
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            },
            "checkout linked",
          );
        }
      }

      if (
        eventType === "customer.subscription.created" ||
        eventType === "customer.subscription.updated" ||
        eventType === "customer.subscription.deleted"
      ) {
        const subscription = payload as StripeSubscription;
        const customerId = subscription?.customer ?? null;
        if (customerId) {
          const activeSubscription =
            await getLatestActiveSubscription(customerId);
          const cancellationStatuses = new Set([
            "canceled",
            "unpaid",
            "incomplete_expired",
          ]);
          if (activeSubscription) {
            const activePlan =
              getPlanFromSubscription(activeSubscription) ?? "FREE";
            const currentPeriodEnd =
              getSubscriptionPeriodEnd(activeSubscription);
            await applyBillingStateForCustomer(customerId, {
              plan: activePlan,
              aiTokenMonthlyAllowance: getPlanTokenAllowance(activePlan),
              subscriptionStatus: activeSubscription.status,
              stripeSubscriptionId: activeSubscription.id,
              currentPeriodEnd,
            });
            app.log.info(
              {
                stripeCustomerId: customerId,
                plan: activePlan,
                subscriptionStatus: activeSubscription.status,
                aiTokenBalance: "unchanged_until_invoice_paid",
                currentPeriodEnd: currentPeriodEnd?.toISOString() ?? null,
              },
              "subscription updated",
            );
          } else if (
            eventType === "customer.subscription.deleted" ||
            cancellationStatuses.has(subscription.status) ||
            !isActiveSubscriptionStatus(subscription.status)
          ) {
            await applyBillingStateForCustomer(customerId, {
              plan: "FREE",
              aiTokenBalance: 0,
              aiTokenResetAt: null,
              aiTokenRenewalAt: null,
              subscriptionStatus: subscription.status,
              stripeSubscriptionId: null,
              currentPeriodEnd: null,
            });
            app.log.info(
              {
                stripeCustomerId: customerId,
                plan: "FREE",
                aiTokenBalance: 0,
                aiTokenResetAt: null,
                stripeSubscriptionId: null,
                currentPeriodEnd: null,
              },
              "subscription canceled",
            );
          }
        }
      }

      if (eventType === "invoice.paid") {
        const invoice = payload as StripeInvoice;
        let fullInvoice = invoice;
        if (!invoice?.lines?.data?.length) {
          fullInvoice = await stripeRequest<StripeInvoice>(
            `invoices/${invoice.id}`,
            {
              "expand[0]": "lines.data.price",
              "expand[1]": "subscription",
            },
            { method: "GET" },
          );
        }
        const invoicePlan = getPlanFromInvoice(fullInvoice);
        if (invoicePlan) {
          const customerId = fullInvoice.customer ?? null;
          if (customerId) {
            const effectiveSubscription =
              await getLatestActiveSubscription(customerId);
            const effectivePlan =
              getPlanFromSubscription(effectiveSubscription) ?? invoicePlan;
            const resolvedSubscriptionStatus = effectiveSubscription?.status ?? null;
            const planAllowance = getPlanTokenAllowance(effectivePlan);
            const resolvedTokens = resolveAiTokens({
              subscriptionStatus: resolvedSubscriptionStatus,
              planMonthlyAllowance: planAllowance,
            });
            const effectivePeriodEnd =
              resolvedTokens > 0
                ? (getSubscriptionPeriodEnd(effectiveSubscription) ?? getTokenExpiry(30))
                : null;
            await applyBillingStateForCustomer(customerId, {
              plan: resolvedTokens > 0 ? effectivePlan : "FREE",
              aiTokenBalance: resolvedTokens,
              aiTokenMonthlyAllowance: planAllowance,
              aiTokenResetAt: effectivePeriodEnd,
              aiTokenRenewalAt: effectivePeriodEnd,
              subscriptionStatus: resolvedSubscriptionStatus,
              stripeSubscriptionId: effectiveSubscription?.id ?? null,
              currentPeriodEnd: getSubscriptionPeriodEnd(effectiveSubscription),
            });
            app.log.info(
              {
                stripeCustomerId: customerId,
                invoicePlan,
                effectivePlan,
                aiTokenBalance: resolvedTokens,
                aiTokenResetAt: effectivePeriodEnd?.toISOString() ?? null,
                billingStatus: resolveBillingStatusReason(resolvedSubscriptionStatus),
              },
              "invoice paid",
            );
          }
        }
      }

      if (eventType === "invoice.payment_failed") {
        const invoice = payload as StripeInvoice;
        let fullInvoice = invoice;
        if (!invoice?.lines?.data?.length) {
          fullInvoice = await stripeRequest<StripeInvoice>(
            `invoices/${invoice.id}`,
            {
              "expand[0]": "lines.data.price",
              "expand[1]": "subscription",
            },
            { method: "GET" },
          );
        }
        const customerId = fullInvoice.customer ?? null;
        if (customerId) {
          await applyBillingStateForCustomer(customerId, {
            plan: "FREE",
            aiTokenBalance: 0,
            aiTokenResetAt: null,
            aiTokenRenewalAt: null,
            subscriptionStatus: "payment_failed",
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
          });
          app.log.info(
            {
              stripeCustomerId: customerId,
              plan: "FREE",
              aiTokenBalance: 0,
              aiTokenResetAt: null,
              subscriptionStatus: "payment_failed",
            },
            "invoice payment failed",
          );
        }
      }

      return reply.status(200).send({ received: true });
    } catch (error) {
      return handleRequestError(reply, error);
    }
};

// POST /auth/login
app.post("/auth/login", { preHandler: [authRateLimitMiddleware] }, async (request, reply) => {
  try {
    const data = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || user.deletedAt || !user.passwordHash) {
      return reply.status(401).send({ error: "INVALID_CREDENTIALS" });
    }

    if (user.isBlocked) {
      return reply.status(403).send({ error: "USER_BLOCKED" });
    }

    if (!user.emailVerifiedAt) {
      return reply.status(403).send({ error: "EMAIL_NOT_VERIFIED" });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "INVALID_CREDENTIALS" });
    }

    const token = await reply.jwtSign({
      sub: user.id,
      email: user.email,
      role: resolveEffectiveAuthRole(user),
    });

    reply.setCookie("fs_token", token, buildCookieOptions());
    // Token is only sent via httpOnly cookie — never expose in response body
    return reply.status(200).send({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/auth/me", async (request, reply) => {
  try {
    reply.header("Cache-Control", "no-store");
    const user = await requireUser(request);
    let effectiveUser = user;
    try {
      const syncedUser = await syncUserBillingFromStripeWithCache(user, {
        createCustomerIfMissing: false,
      });
      if (syncedUser) {
        effectiveUser = syncedUser;
      }
    } catch (error) {
      app.log.warn(
        { err: error, userId: user.id },
        "auth/me billing sync failed",
      );
    }
    const effectiveAuthRole = resolveEffectiveAuthRole(effectiveUser);
    const membershipRecord = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "ACTIVE"] },
      },
      select: {
        status: true,
        role: true,
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    const membership = membershipRecord ?? null;
    const entitlements = getUserEntitlements(effectiveUser);
    const aiTokenPayload = getAiTokenPayload(effectiveUser, entitlements);
    return buildAuthMeResponse({
      user: effectiveUser,
      role: effectiveAuthRole === "ADMIN" ? "ADMIN" : "USER",
      aiTokenBalance: aiTokenPayload.aiTokenBalance,
      aiTokenRenewalAt: aiTokenPayload.aiTokenRenewalAt,
      entitlements,
      membership,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/auth/change-password", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const data = changePasswordSchema.parse(request.body);
    if (!user.passwordHash) {
      return reply.status(400).send({ error: "PASSWORD_NOT_SET" });
    }
    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "INVALID_CREDENTIALS" });
    }
    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return reply.status(200).send({ ok: true });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

// POST /auth/logout
app.post("/auth/logout", async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    reply.clearCookie("fs_token", buildCookieOptions());
    return reply.status(200).send({ ok: true });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/auth/google/start", async (_request, reply) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    return reply.status(501).send({ error: "GOOGLE_OAUTH_NOT_CONFIGURED" });
  }

  const state = crypto.randomBytes(32).toString("base64url");
  await prisma.oAuthState.create({
    data: {
      provider: "google",
      stateHash: hashToken(state),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state,
  });

  return reply
    .status(200)
    .send({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

app.get("/auth/google/callback", async (request, reply) => {
  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_REDIRECT_URI
  ) {
    return reply.status(501).send({ error: "GOOGLE_OAUTH_NOT_CONFIGURED" });
  }

  const querySchema = z.object({
    code: z.string().min(1),
    state: z.string().min(1),
    mode: z.enum(["bff"]).optional(),
  });
  const { code, state, mode } = querySchema.parse(request.query);

  const stateHash = hashToken(state);
  const storedState = await prisma.oAuthState.findUnique({
    where: { stateHash },
  });
  if (!storedState || storedState.expiresAt.getTime() < Date.now()) {
    if (storedState) {
      await prisma.oAuthState.delete({ where: { id: storedState.id } });
    }
    return reply.status(400).send({ error: "INVALID_OAUTH_STATE" });
  }
  await prisma.oAuthState.delete({ where: { id: storedState.id } });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!tokenResponse.ok) {
    return reply.status(400).send({ error: "GOOGLE_TOKEN_EXCHANGE_FAILED" });
  }

  const tokenJson = (await tokenResponse.json()) as {
    id_token?: string;
    access_token?: string;
  };
  const idToken = tokenJson.id_token;
  if (!idToken) {
    return reply.status(400).send({ error: "GOOGLE_ID_TOKEN_MISSING" });
  }

  const infoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
  );
  if (!infoResponse.ok) {
    return reply.status(400).send({ error: "GOOGLE_PROFILE_FETCH_FAILED" });
  }

  const info = (await infoResponse.json()) as {
    sub: string;
    email?: string;
    email_verified?: string;
    name?: string;
  };

  if (!info.email || info.email_verified !== "true") {
    return reply.status(403).send({ error: "GOOGLE_EMAIL_NOT_VERIFIED" });
  }

  let user = await prisma.user.findUnique({ where: { email: info.email } });
  if (user?.deletedAt) {
    return reply.status(403).send({ error: "ACCOUNT_DELETED" });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: info.email,
        name: info.name,
        provider: "google",
        emailVerifiedAt: new Date(),
      },
    });
  } else if (user.passwordHash && !user.emailVerifiedAt) {
    return reply.status(403).send({ error: "EMAIL_NOT_VERIFIED" });
  }

  if (user.isBlocked) {
    return reply.status(403).send({ error: "USER_BLOCKED" });
  }

  const providerMatch = await prisma.authProvider.findFirst({
    where: { provider: "google", providerUserId: info.sub },
  });

  if (providerMatch && providerMatch.userId !== user.id) {
    return reply.status(403).send({ error: "GOOGLE_ACCOUNT_LINKED" });
  }

  const existingProvider = providerMatch;

  if (!existingProvider) {
    await prisma.authProvider.create({
      data: {
        userId: user.id,
        provider: "google",
        providerUserId: info.sub,
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await reply.jwtSign({
    sub: user.id,
    email: user.email,
    role: resolveEffectiveAuthRole(user),
  });

  if (mode === "bff") {
    // Token is only sent via httpOnly cookie — never expose in response body
    reply.setCookie("fs_token", token, buildCookieOptions());
    return reply.status(200).send({ id: user.id, email: user.email, name: user.name });
  }

  reply.setCookie("fs_token", token, buildCookieOptions());
  return reply.redirect(`${env.APP_BASE_URL}/app`, 302);
});

const billingStatusHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Short TTL (60s) to reduce Stripe API load while keeping data reasonably fresh
    // Use ?sync=1 query param to force a fresh sync when needed
    reply.header("Cache-Control", "public, max-age=60, s-maxage=60");
    const user = await requireUser(request);
    const query = request.query as { sync?: string };
    const shouldCreateCustomer = query?.sync === "1";
    let syncError: unknown = null;
    let refreshedUser = user;

    try {
      const syncedUser = await syncUserBillingFromStripeWithCache(user, {
        createCustomerIfMissing: shouldCreateCustomer,
      });
      if (syncedUser) {
        refreshedUser = syncedUser;
      }
    } catch (error) {
      syncError = error;
      app.log.warn(
        {
          err: error,
          userId: user.id,
          createCustomerIfMissing: shouldCreateCustomer,
        },
        "billing sync failed",
      );
    }

    if (!refreshedUser) {
      return reply.status(404).send({ error: "USER_NOT_FOUND" });
    }
    const rawPlan = refreshedUser.plan ?? "FREE";
    const subscriptionStatus = syncError
      ? null
      : (refreshedUser.subscriptionStatus ?? null);
    const billingStatus = resolveBillingStatusReason(subscriptionStatus);
    const isActive = !syncError && billingStatus === "active";
    const tokenExpiryAt = getUserTokenExpiryAt(refreshedUser);
    const tokensExpired = tokenExpiryAt
      ? tokenExpiryAt.getTime() < Date.now()
      : false;
    const effectiveTokenBalance = tokensExpired ? 0 : getEffectiveTokenBalance(refreshedUser);
    const planAllowance = typeof refreshedUser.aiTokenMonthlyAllowance === "number" ? refreshedUser.aiTokenMonthlyAllowance : 0;
    const tokens = resolveAiTokens({
      subscriptionStatus,
      planMonthlyAllowance: Math.min(planAllowance, effectiveTokenBalance),
    });
    const plan: SubscriptionPlan = syncError || !isActive ? "FREE" : rawPlan;
    const isPaid = plan !== "FREE";
    const isPro = plan === "PRO";
    const availablePlans = getAvailableBillingPlans();
    const response = {
      plan,
      isPaid,
      isPro,
      tokens,
      tokensExpiresAt: tokenExpiryAt ? tokenExpiryAt.toISOString() : null,
      subscriptionStatus,
      billingStatus,
      availablePlans,
    };
    app.log.info(
      {
        userId: refreshedUser.id,
        plan: response.plan,
        tokens: response.tokens,
      },
      "billing status",
    );
    return reply.status(200).send(response);
  } catch (error) {
    return handleRequestError(reply, error);
  }
};

// TODO(BETA-13, follow-up): keep migrating remaining inline routes into
// register*Routes modules without changing behavior in this PR.
// Remaining inline domains include: auth/profile, feed/recipes,
// admin user management and dev-only endpoints.
registerBillingRoutes(app, {
  billingCheckoutHandler,
  billingPlansHandler,
  billingPortalHandler,
  billingAdminResetCustomerLinkHandler,
  billingStripeWebhookHandler,
  billingStatusHandler,
});

registerWeeklyReviewRoute(app, {
  prisma,
  requireUser,
  getOrCreateProfile,
  handleRequestError,
});

registerPassiveHealthRoutes(app, {
  prisma,
  dbNull: Prisma.DbNull,
  requireUser,
  getOrCreateProfile,
  handleRequestError,
});

registerFutureProjectionRoutes(app, {
  prisma,
  requireUser,
  getOrCreateProfile,
  handleRequestError,
});

registerRctSummaryRoute(app, {
  prisma,
  requireResearchAccess,
  handleRequestError,
});

registerRctStatisticalReportRoute(app, {
  prisma,
  requireResearchAccess,
  handleRequestError,
});

registerAdminAssignGymRoleRoutes(app, {
  prisma,
  requireAdmin,
  handleRequestError,
});

registerMealRoutes(app, {
  requireUser,
  callOpenAi,
  createHttpError,
  aiNutritionDomainGuard,
  getUserEntitlements,
  getEffectiveTokenBalance,
  assertSufficientAiTokenBalance,
  getEstimatedAiFeatureTokens,
  enforceAiQuota,
  chargeAiUsageForResult,
  prisma,
  aiPricing,
});

registerProfileRoutes(app, {
  prisma,
  requireUser,
});

registerFeedRoutes(app, {
  prisma,
  requireUser,
});

registerTrackingRoutes(app, {
  prisma,
  requireUser,
  getOrCreateProfile,
  handleRequestError,
});

// Nutrition, Gym, Trainer, Admin routes are registered directly in index.ts

registerAiRoutes(app, {
  aiAccessGuard,
  aiStrengthDomainGuard,
  aiNutritionDomainGuard,
  requireUser,
  getUserEntitlements,
  toDateKey,
  env,
  prisma,
  getAiTokenPayload,
  getSecondsUntilNextUtcDay,
  handleRequestError,
  logAuthCookieDebug,
  requireCompleteProfile,
  aiTrainingSchema,
  loadExerciseCatalogForAi,
  parseDateInput,
  buildCacheKey,
  buildTrainingTemplate,
  getEffectiveTokenBalance,
  assertSufficientAiTokenBalance,
  getEstimatedAiFeatureTokens,
  normalizeTrainingPlanDays,
  applyPersonalization,
  assertTrainingMatchesRequest,
  resolveTrainingPlanExerciseIds,
  saveTrainingPlan,
  storeAiContent,
  getCachedAiPayload,
  parseTrainingPlanPayload,
  saveCachedAiPayload,
  enforceAiQuota,
  buildTrainingPrompt,
  formatExerciseCatalogForPrompt,
  extractTopLevelJson,
  chargeAiUsage,
  aiPricing,
  callOpenAi,
  getUserTokenExpiryAt,
  extractExactProviderUsage,
  aiNutritionSchema,
  getSafeValidationIssues,
  normalizeNutritionPlanDays,
  logNutritionMealsPerDay,
  normalizeNutritionMealsPerDay,
  applyNutritionCatalogResolution,
  assertNutritionMatchesRequest,
  saveNutritionPlan,
  parseNutritionPlanPayload,
  applyRecipeScalingToPlan,
  buildNutritionTemplate,
  buildNutritionPrompt,
  chargeAiUsageForResult,
  createHttpError,
  aiGenerateTrainingSchema,
  buildDeterministicTrainingFallbackPlan,
  createOpenAiClient,
  trainingPlanJsonSchema,
  mapExperienceLevelToTrainingPlanLevel,
  buildRetryFeedbackFromContext,
  buildTwoMealSplitRetryInstruction,
  nutritionPlanJsonSchema,
  buildMealKcalGuidance,
  NUTRITION_MATH_TOLERANCES,
  validateNutritionMath,
  parseJsonFromText,
  parseLargestJsonFromText,
  parseTopLevelJsonFromText,
  AiParseError,
  aiTrainingPlanResponseSchema,
  aiNutritionPlanResponseSchema,
  resolveTrainingPlanWithDeterministicFallback,
  assertTrainingLevelConsistency,
  upsertExercisesFromPlan,
  classifyAiGenerateError,
  findInvalidTrainingPlanExerciseIds,
  resolveTrainingPlanExerciseIdsWithCatalog,
  summarizeTrainingPlan,
  persistAiUsageLog,
  buildUsageTotals,
  aiTipSchema,
  buildTipTemplate,
  safeStoreAiContent,
  buildTipPrompt,
  resolveNutritionPlanRecipeReferences,
  normalizeNutritionPlanDaysWithLabels,
  applyNutritionPlanVarietyGuard,
  resolveNutritionPlanRecipeIds,
  contextualChatRequestSchema,
  contextualChatResponseSchema,
  buildContextualChatPrompt,
  logAiCall,
  logAiError,
});

const workoutExerciseSchema = z.object({
  exerciseId: z.string().min(1).optional(),
  name: z.string().min(1),
  sets: z.string().min(1).optional(),
  reps: z.string().min(1).optional(),
  restSeconds: z.coerce.number().int().min(0).optional(),
  notes: z.string().min(1).optional(),
  order: z.coerce.number().int().min(0).optional(),
});

const workoutCreateSchema = z.object({
  name: z.string().min(2),
  notes: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMin: z.coerce.number().int().min(0).optional(),
  exercises: z.array(workoutExerciseSchema).optional(),
});

const workoutUpdateSchema = workoutCreateSchema.partial();

const workoutSessionEntrySchema = z.object({
  exercise: z.string().min(1),
  sets: z.coerce.number().int().min(1),
  reps: z.coerce.number().int().min(1),
  loadKg: z.coerce.number().min(0).optional(),
  rpe: z.coerce.number().int().min(1).max(10).optional(),
});

const workoutSessionUpdateSchema = z.object({
  entries: z.array(workoutSessionEntrySchema).min(1),
});

const exerciseListSchema = z.object({
  q: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  primaryMuscle: z.string().min(1).optional(),
  muscle: z.string().min(1).optional(),
  equipment: z.string().min(1).optional(),
  cursor: z.string().min(1).optional(),
  take: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(1).max(200).optional()),
  page: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(1).optional()),
  limit: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(1).max(200).default(50)),
  offset: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(0).optional()),
});

const exerciseParamsSchema = z.object({ id: z.string().min(1) });
const createExerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  equipment: z.string().trim().max(80).optional(),
  mainMuscleGroup: z.string().trim().max(80).optional(),
  secondaryMuscleGroups: z
    .array(z.string().trim().min(1).max(80))
    .max(8)
    .optional(),
  technique: z.string().trim().max(3000).optional(),
  tips: z.string().trim().max(3000).optional(),
  mediaUrl: z.string().trim().url().optional(),
  imageUrl: z.string().trim().url().optional(),
  videoUrl: z.string().trim().url().optional(),
});
const recipeListSchema = z.object({
  query: z.string().min(1).optional(),
  ingredient: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  limit: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(1).max(200).default(50)),
  offset: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(0).default(0)),
});

const recipeParamsSchema = z.object({ id: z.string().min(1) });
const trainingPlanListSchema = z.object({
  query: z.string().min(1).optional(),
  limit: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(1).max(200).default(50)),
  offset: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(0).default(0)),
});

const trainingPlanCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  notes: z.string().trim().min(1).max(600).optional(),
  goal: z.string().trim().min(1).max(80).default("general_fitness"),
  level: z.string().trim().min(1).max(80).default("beginner"),
  focus: z.string().trim().min(1).max(120).default("full_body"),
  equipment: z.string().trim().min(1).max(120).default("bodyweight"),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  startDate: z.string().trim().min(1),
  daysCount: z.coerce.number().int().min(1).max(14),
});

const trainingPlanParamsSchema = z.object({ id: z.string().min(1) });
const trainingPlanActiveQuerySchema = z.object({
  includeDays: z
    .preprocess((value) => {
      if (typeof value !== "string") return false;
      return value === "1" || value.toLowerCase() === "true";
    }, z.boolean())
    .default(false),
});
const trainingDayParamsSchema = z.object({
  planId: z.string().min(1),
  dayId: z.string().min(1),
});
const addTrainingExerciseBodySchema = z.object({
  exerciseId: z.string().min(1),
  athleteUserId: z.string().min(1).optional(),
});
const assignTrainingPlanParamsSchema = z.object({
  gymId: z.string().min(1),
  userId: z.string().min(1),
});
const assignTrainingPlanBodySchema = z
  .object({
    trainingPlanId: z.string().min(1).optional(),
    templatePlanId: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const hasTrainingPlanId = Boolean(value.trainingPlanId);
    const hasTemplatePlanId = Boolean(value.templatePlanId);

    if (!hasTrainingPlanId && !hasTemplatePlanId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "trainingPlanId or templatePlanId is required",
      });
      return;
    }

    if (hasTrainingPlanId && hasTemplatePlanId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide only one of trainingPlanId or templatePlanId",
      });
    }
  });
const trainerMemberParamsSchema = z.object({
  userId: z.string().min(1),
});
const assignedTrainingPlanSummarySelect = {
  id: true,
  title: true,
  goal: true,
  level: true,
  daysPerWeek: true,
  focus: true,
  equipment: true,
  startDate: true,
  daysCount: true,
} as const;
const trainerMemberIdParamsSchema = z.object({
  id: z.string().min(1),
});
const trainerPlanExerciseCreateSchema = z.object({
  exerciseId: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  sets: z.coerce.number().int().min(1).max(30).optional(),
  reps: z.string().trim().min(1).max(80).optional(),
  rest: z.coerce.number().int().min(0).max(3600).optional(),
});

const trainerPlanDayCreateSchema = z.object({
  dayIndex: z.coerce.number().int().min(0).max(365),
  label: z.string().trim().min(1).max(80).optional(),
  focus: z.string().trim().min(1).max(120).optional(),
  duration: z.coerce.number().int().min(1).max(240).optional(),
  exercises: z.array(trainerPlanExerciseCreateSchema).max(40).default([]),
});

const trainerPlanCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    daysCount: z.coerce.number().int().min(1).max(84).optional(),
    description: z.string().trim().min(1).max(600).optional(),
    notes: z.string().trim().min(1).max(600).optional(),
    goal: z.string().trim().min(1).max(80).default("general_fitness"),
    level: z.string().trim().min(1).max(80).default("beginner"),
    focus: z.string().trim().min(1).max(120).default("full_body"),
    equipment: z.string().trim().min(1).max(120).default("bodyweight"),
    daysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
    startDate: z.string().trim().min(1).optional(),
    days: z.array(trainerPlanDayCreateSchema).max(84).optional(),
  })
  .refine(
    (value) => value.daysCount !== undefined || value.daysPerWeek !== undefined,
    {
      message: "daysCount or daysPerWeek is required",
      path: ["daysCount"],
    },
  );
const trainerPlanUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    daysCount: z.coerce.number().int().min(1).max(84).optional(),
    notes: z.string().trim().min(1).max(600).nullable().optional(),
    goal: z.string().trim().min(1).max(80).optional(),
    level: z.string().trim().min(1).max(80).optional(),
    focus: z.string().trim().min(1).max(120).optional(),
    equipment: z.string().trim().min(1).max(120).optional(),
    daysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
    startDate: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
const trainerPlanParamsSchema = z.object({
  planId: z.string().min(1),
});
const trainerPlanDayParamsSchema = z.object({
  planId: z.string().min(1),
  dayId: z.string().min(1),
});
const trainerPlanExerciseParamsSchema = z.object({
  planId: z.string().min(1),
  dayId: z.string().min(1),
  exerciseId: z.string().min(1),
});
const trainerPlanExerciseUpdateSchema = z
  .object({
    sets: z.coerce.number().int().min(1).max(30).optional(),
    reps: z.string().trim().min(1).max(80).nullable().optional(),
    rest: z.coerce.number().int().min(0).max(3600).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
const trainerAssignPlanBodySchema = z.object({
  trainingPlanId: z.string().min(1),
});
const trainerAssignNutritionPlanBodySchema = z.object({
  nutritionPlanId: z.string().min(1),
});
const trainerAssignPlanResultSchema = {
  id: true,
  title: true,
  goal: true,
  level: true,
  daysPerWeek: true,
  focus: true,
  equipment: true,
  startDate: true,
  daysCount: true,
} as const;
const assignedNutritionPlanSummarySelect = {
  id: true,
  title: true,
  startDate: true,
  daysCount: true,
  createdAt: true,
  days: {
    orderBy: { order: "asc" as const },
    select: {
      id: true,
      dayLabel: true,
      order: true,
    },
  },
} as const;
const assignedNutritionPlanDetailSelect = {
  id: true,
  title: true,
  startDate: true,
  daysCount: true,
  dailyCalories: true,
  proteinG: true,
  fatG: true,
  carbsG: true,
  createdAt: true,
  days: {
    orderBy: { order: "asc" as const },
    select: {
      id: true,
      date: true,
      dayLabel: true,
      order: true,
      meals: {
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          calories: true,
          protein: true,
          carbs: true,
          fats: true,
          imageUrl: true,
          ingredients: {
            select: {
              id: true,
              name: true,
              grams: true,
            },
          },
        },
      },
    },
  },
} as const;
const trainerAssignNutritionPlanResultSchema = {
  id: true,
  title: true,
  startDate: true,
  daysCount: true,
  createdAt: true,
  days: {
    orderBy: { order: "asc" as const },
    select: {
      id: true,
      dayLabel: true,
      order: true,
    },
  },
} as const;

const trainingExerciseLegacySafeSelect = {
  id: true,
  dayId: true,
  name: true,
  sets: true,
  reps: true,
  tempo: true,
  rest: true,
  notes: true,
} as const;

const trainingDayIncludeWithLegacySafeExercises = {
  orderBy: { order: "asc" },
  include: {
    exercises: {
      orderBy: { id: "asc" },
      select: trainingExerciseLegacySafeSelect,
    },
  },
} as const;

const nutritionPlanListSchema = z.object({
  query: z.string().min(1).optional(),
  limit: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(1).max(200).default(50)),
  offset: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(0).default(0)),
});

const nutritionPlanParamsSchema = z.object({ id: z.string().min(1) });

app.get("/nutrition-plans", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { query, limit, offset } = nutritionPlanListSchema.parse(
      request.query,
    );
    const where: Prisma.NutritionPlanWhereInput = {
      userId: user.id,
      ...(query
        ? { title: { contains: query, mode: Prisma.QueryMode.insensitive } }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.nutritionPlan.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          dailyCalories: true,
          proteinG: true,
          fatG: true,
          carbsG: true,
          startDate: true,
          daysCount: true,
          createdAt: true,
        },
      }),
      prisma.nutritionPlan.count({ where }),
    ]);
    return { items, total, limit, offset };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/nutrition-plans/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { id } = nutritionPlanParamsSchema.parse(request.params);
    const plan = await prisma.nutritionPlan.findFirst({
      where: { id, userId: user.id },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: {
            meals: {
              include: { ingredients: true },
            },
          },
        },
      },
    });
    if (!plan) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return plan;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/members/me/assigned-nutrition-plan", async (request, reply) => {
  try {
    const user = await requireUser(request);

    const membership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        role: "MEMBER",
      },
      select: {
        gym: { select: { id: true, name: true } },
        assignedNutritionPlan: {
          select: assignedNutritionPlanDetailSelect,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!membership) {
      return reply.status(404).send({ error: "MEMBER_NOT_FOUND" });
    }

    return reply.status(200).send({
      memberId: user.id,
      gym: membership.gym,
      assignedPlan: membership.assignedNutritionPlan,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

const trainerNutritionPlanMealSchema = z.object({
  type: z.string().trim().min(1).max(40),
  recipeId: z.string().min(1),
});

const trainerNutritionPlanDaySchema = z.object({
  dayIndex: z.coerce.number().int().min(0).max(365),
  dayLabel: z.string().trim().min(1).max(80).optional(),
  meals: z.array(trainerNutritionPlanMealSchema).max(7).default([]),
});

const trainerNutritionPlanCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  weeks: z.coerce.number().int().min(1).max(12).optional(),
  daysCount: z.coerce.number().int().min(1).max(84).optional(),
  startDate: z.string().trim().min(1).optional(),
  dailyCalories: z.coerce.number().positive().max(20000).optional(),
  proteinG: z.coerce.number().min(0).max(2000).optional(),
  fatG: z.coerce.number().min(0).max(1000).optional(),
  carbsG: z.coerce.number().min(0).max(3000).optional(),
  days: z.array(trainerNutritionPlanDaySchema).max(84).optional(),
});

const trainerNutritionPlanUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  weeks: z.coerce.number().int().min(1).max(12).optional(),
  daysCount: z.coerce.number().int().min(1).max(84).optional(),
  startDate: z.string().trim().min(1).optional(),
  dailyCalories: z.coerce.number().positive().max(20000).optional(),
  proteinG: z.coerce.number().min(0).max(2000).optional(),
  fatG: z.coerce.number().min(0).max(1000).optional(),
  carbsG: z.coerce.number().min(0).max(3000).optional(),
  days: z.array(trainerNutritionPlanDaySchema).max(84).optional(),
});
const trainerNutritionPlanParamsSchema = z.object({
  id: z.string().min(1),
});

const trainerRecipeIngredientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  grams: z.coerce.number().positive().max(10000),
});

const trainerRecipeCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  calories: z.coerce.number().positive().max(10000),
  protein: z.coerce.number().min(0).max(1000),
  carbs: z.coerce.number().min(0).max(1000),
  fat: z.coerce.number().min(0).max(1000),
  photoUrl: z.string().trim().url().optional().nullable(),
  imageUrls: z.array(z.string().trim().url()).max(10).default([]),
  source: z.string().trim().max(200).optional().nullable(),
  sourceId: z.string().trim().max(200).optional().nullable(),
  slug: z.string().trim().max(200).optional().nullable(),
  category: z.string().trim().max(200).optional().nullable(),
  steps: z.array(z.string().trim().min(1)).max(50).default([]),
  ingredients: z.array(trainerRecipeIngredientSchema).max(50).default([]),
  tiempoPreparacion: z.coerce.number().int().positive().max(1440).optional().nullable(),
  porciones: z.coerce.number().int().positive().max(100).optional().nullable(),
});

const trainerRecipeUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  calories: z.coerce.number().positive().max(10000).optional(),
  protein: z.coerce.number().min(0).max(1000).optional(),
  carbs: z.coerce.number().min(0).max(1000).optional(),
  fat: z.coerce.number().min(0).max(1000).optional(),
  photoUrl: z.string().trim().url().optional().nullable(),
  imageUrls: z.array(z.string().trim().url()).max(10).optional(),
  source: z.string().trim().max(200).optional().nullable(),
  sourceId: z.string().trim().max(200).optional().nullable(),
  slug: z.string().trim().max(200).optional().nullable(),
  category: z.string().trim().max(200).optional().nullable(),
  steps: z.array(z.string().trim().min(1)).max(50).optional(),
  ingredients: z.array(trainerRecipeIngredientSchema).max(50).optional(),
  tiempoPreparacion: z.coerce.number().int().positive().max(1440).optional().nullable(),
  porciones: z.coerce.number().int().positive().max(100).optional().nullable(),
});

const trainerRecipeParamsSchema = z.object({
  id: z.string().min(1),
});

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function parseClientMetrics(profile: unknown, tracking: unknown) {
  const profileRecord = isRecord(profile) ? profile : null;
  const trackingRecord = isRecord(tracking) ? tracking : null;

  const numberOrNull = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const stringOrNull = (value: unknown) =>
    typeof value === "string" && value.trim().length > 0 ? value : null;

  const measurementsRaw =
    profileRecord && isRecord(profileRecord.measurements)
      ? profileRecord.measurements
      : null;
  const measurements = measurementsRaw
    ? {
        chestCm: numberOrNull(measurementsRaw.chestCm),
        waistCm: numberOrNull(measurementsRaw.waistCm),
        hipsCm: numberOrNull(measurementsRaw.hipsCm),
        bicepsCm: numberOrNull(measurementsRaw.bicepsCm),
        thighCm: numberOrNull(measurementsRaw.thighCm),
        calfCm: numberOrNull(measurementsRaw.calfCm),
        neckCm: numberOrNull(measurementsRaw.neckCm),
        bodyFatPercent: numberOrNull(measurementsRaw.bodyFatPercent),
      }
    : null;

  const checkins =
    trackingRecord && Array.isArray(trackingRecord.checkins)
      ? trackingRecord.checkins
      : [];
  const latestCheckin = [...checkins]
    .filter((entry) => isRecord(entry) && typeof entry.date === "string")
    .sort((left, right) => {
      const leftDate = Date.parse(String(left.date));
      const rightDate = Date.parse(String(right.date));
      return Number.isFinite(rightDate) && Number.isFinite(leftDate)
        ? rightDate - leftDate
        : 0;
    })[0];

  const progress =
    latestCheckin && isRecord(latestCheckin)
      ? {
          date: stringOrNull(latestCheckin.date),
          weightKg: numberOrNull(latestCheckin.weightKg),
          bodyFatPercent: numberOrNull(latestCheckin.bodyFatPercent),
          notes: stringOrNull(latestCheckin.notes),
        }
      : null;

  return {
    heightCm: numberOrNull(profileRecord?.heightCm),
    weightKg: numberOrNull(profileRecord?.weightKg),
    goalWeightKg: numberOrNull(profileRecord?.goalWeightKg),
    activity: stringOrNull(profileRecord?.activity),
    measurements,
    progress,
  };
}

app.get("/recipes", async (request, reply) => {
  try {
    await requireUser(request);
    const { query, ingredient, category, limit, offset } = recipeListSchema.parse(request.query);

    const where: Prisma.RecipeWhereInput = {};

    // Search by recipe name
    if (query) {
      where.name = { contains: query, mode: Prisma.QueryMode.insensitive };
    }

    // Search by ingredient name (matches any ingredient in the recipe)
    if (ingredient) {
      where.ingredients = {
        some: {
          name: { contains: ingredient, mode: Prisma.QueryMode.insensitive },
        },
      };
    }

    // Filter by category
    if (category) {
      where.category = category;
    }

    const [items, total] = await prisma.$transaction([
      prisma.recipe.findMany({
        where,
        include: { ingredients: true },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.recipe.count({ where }),
    ]);
    return { items, total, limit, offset };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/recipes/:id", async (request, reply) => {
  try {
    await requireUser(request);
    const { id } = recipeParamsSchema.parse(request.params);
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: true },
    });
    if (!recipe) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return recipe;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

registerTrainingRoutes(app, {
  requireUser,
  exerciseListSchema,
  listExercises,
  handleRequestError,
  exerciseParamsSchema,
  getExerciseById,
  createExerciseSchema,
  createExercise,
  trainingPlanListSchema,
  prisma,
  resolveCorrelationId,
  getPayloadSize,
  trainingPlanCreateSchema,
  parseDateInput,
  buildDateRange,
  mapTrainingPlanCreateError,
  trainingPlanParamsSchema,
  trainingDayIncludeWithLegacySafeExercises,
  enrichTrainingPlanWithExerciseLibraryData,
  trainingPlanActiveQuerySchema,
  trainingDayParamsSchema,
  addTrainingExerciseBodySchema,
});

registerWorkoutRoutes(app, {
  prisma,
  requireUser,
  handleRequestError,
  workoutCreateSchema,
  workoutUpdateSchema,
  workoutSessionUpdateSchema,
});

const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["USER", "ADMIN"]).optional(),
  subscriptionPlan: z
    .enum(["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"])
    .optional(),
  aiTokenBalance: z.number().int().min(0).optional(),
  aiTokenMonthlyAllowance: z.number().int().min(0).optional(),
});

const adminUserIdParamsSchema = z.object({
  id: z.string().min(1),
});

const adminUserPlanUpdateSchema = z.object({
  subscriptionPlan: z.enum(["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"]),
});

const adminUserTokensUpdateSchema = z
  .object({
    aiTokenBalance: z.number().int().min(0).optional(),
    aiTokenMonthlyAllowance: z.number().int().min(0).optional(),
  })
  .refine(
    (payload) =>
      payload.aiTokenBalance !== undefined ||
      payload.aiTokenMonthlyAllowance !== undefined,
    {
      message: "At least one token field must be provided.",
    },
  );

const adminUserTokenAllowanceUpdateSchema = z.object({
  aiTokenMonthlyAllowance: z.number().int().min(0),
});

const adminUserTokenAddSchema = z.object({
  amount: z.number().int().positive(),
});

const adminUserTokenBalanceUpdateSchema = z.object({
  aiTokenBalance: z.number().int().min(0),
});

const gymsListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
});

const joinGymSchema = z.object({
  gymId: z.string().min(1),
});

const joinGymByCodeSchema = z.object({
  code: z.string().trim().min(1),
});

const gymJoinRequestParamsSchema = z.object({
  membershipId: z.string().min(1),
});

const gymMembersParamsSchema = z.object({
  gymId: z.string().min(1),
});

const trainerClientParamsSchema = z.object({
  userId: z.string().min(1),
});

const adminUpdateGymMemberRoleParamsSchema = z.object({
  gymId: z.string().min(1),
  userId: z.string().min(1),
});

const adminUpdateGymMemberRoleSchema = z.object({
  role: z.enum(["MEMBER", "TRAINER", "ADMIN"]),
  status: z.enum(["ACTIVE", "PENDING", "REJECTED"]).optional(),
});

const gymAdminUpdateMemberRoleParamsSchema = z.object({
  userId: z.string().min(1),
});

const gymAdminUpdateMemberRoleSchema = z.object({
  role: z.enum(["MEMBER", "TRAINER"]),
});

const trainerGymProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field must be provided.",
  });

const adminCreateGymSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z
    .string()
    .trim()
    .min(4)
    .max(24)
    .regex(/^[A-Za-z0-9_-]+$/, "Gym code can only contain letters, numbers, hyphens and underscores")
    .transform((value) => value.toUpperCase()),
});

const adminDeleteGymParamsSchema = z.object({
  gymId: z.string().min(1),
});

type StableGymMembershipState = "NONE" | "PENDING" | "ACTIVE";

function toStableGymMembershipState(status: "PENDING" | "ACTIVE" | "REJECTED" | null | undefined): StableGymMembershipState {
  if (status === "PENDING") return "PENDING";
  if (status === "ACTIVE") return "ACTIVE";
  return "NONE";
}

function toLegacyGymMembershipState(state: StableGymMembershipState): "none" | "pending" | "active" {
  if (state === "PENDING") return "pending";
  if (state === "ACTIVE") return "active";
  return "none";
}

function serializeGymMembership(
  membership: {
    gym: { id: string; name: string }
    status: GymMembershipStatus
    role: GymRole
  } | null
)
 {
  const status = toStableGymMembershipState(membership?.status);
  const gym = status === "NONE" ? null : membership?.gym ?? null;
  const role = status === "NONE" ? null : membership?.role ?? null;

  return {
    status,
    state: toLegacyGymMembershipState(status),
    gymId: gym?.id ?? null,
    gymName: gym?.name ?? null,
    gym,
    role,
  };
}

async function findBlockingGymMembership(userId: string) {
  return prisma.gymMembership.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "ACTIVE"] },
    },
    select: {
      id: true,
      gymId: true,
      status: true,
      role: true,
      gym: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function getTrainerManagedGymMembership(userId: string) {
  return prisma.gymMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      role: { in: ["ADMIN", "TRAINER"] },
    },
    select: {
      gymId: true,
      role: true,
      gym: {
        select: {
          id: true,
          name: true,
          code: true,
          activationCode: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: [
      { role: "asc" },
      { updatedAt: "desc" },
    ],
  });
}

app.get("/trainer/gym", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const membership = await getTrainerManagedGymMembership(user.id);

    if (!membership) {
      return reply
        .status(403)
        .send({ error: "FORBIDDEN", message: "Only active gym trainers/admins can access this resource." });
    }

    return reply.status(200).send({
      gym: membership.gym,
      membership: {
        role: membership.role,
      },
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/trainer/gym", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const payload = trainerGymProfileUpdateSchema.parse(request.body);
    const membership = await getTrainerManagedGymMembership(user.id);

    if (!membership) {
      return reply
        .status(403)
        .send({ error: "FORBIDDEN", message: "Only active gym trainers/admins can access this resource." });
    }

    const updatedGym = await prisma.gym.update({
      where: { id: membership.gymId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        activationCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.status(200).send({
      gym: updatedGym,
      membership: {
        role: membership.role,
      },
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/gyms", async (request, reply) => {
  try {
    await requireUser(request);
    const { q } = gymsListQuerySchema.parse(request.query);
    const gyms = await prisma.gym.findMany({
      where: q
        ? {
            name: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : undefined,
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });
    return { gyms, items: gyms };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

const createGymJoinRequest = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = await requireUser(request);
    const { gymId } = joinGymSchema.parse(request.body);
    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true } });
    if (!gym) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Gym not found." });
    }
    const blockingMembership = await findBlockingGymMembership(user.id);
    if (blockingMembership) {
      return reply.status(409).send({
        error: "GYM_MEMBERSHIP_CONFLICT",
        message: "User already has an active or pending gym membership.",
        membership: serializeGymMembership({
          status: blockingMembership.status,
          role: blockingMembership.role,
          gym: blockingMembership.gym,
        }),
      });
    }

    const existing = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId, userId: user.id } },
    });

    const membership = existing
      ? await prisma.gymMembership.update({
          where: { id: existing.id },
          data: {
            status: existing.status === "REJECTED" ? "PENDING" : existing.status,
          },
          include: { gym: { select: { id: true, name: true } } },
        })
      : await prisma.gymMembership.create({
          data: {
            gymId,
            userId: user.id,
            status: "PENDING",
            role: "MEMBER",
          },
          include: { gym: { select: { id: true, name: true } } },
        });

    return reply.status(200).send(serializeGymMembership(membership));
  } catch (error) {
    return handleRequestError(reply, error);
  }
};

app.post("/gyms/join", createGymJoinRequest);
app.post("/gym/join-request", createGymJoinRequest);

app.post("/gyms/join-by-code", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { code } = joinGymByCodeSchema.parse(request.body);
    const normalizedCode = code.toUpperCase();
    const gym = await prisma.gym.findUnique({ where: { code: normalizedCode } });
    if (!gym) {
      return reply.status(400).send({ error: "INVALID_GYM_CODE", message: "Gym code is invalid." });
    }

    const blockingMembership = await findBlockingGymMembership(user.id);
    if (blockingMembership) {
      return reply.status(409).send({
        error: "GYM_MEMBERSHIP_CONFLICT",
        message: "User already has an active or pending gym membership.",
        membership: serializeGymMembership({
          status: blockingMembership.status,
          role: blockingMembership.role,
          gym: blockingMembership.gym,
        }),
      });
    }

    const existing = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId: gym.id, userId: user.id } },
    });
    const membership = existing
      ? await prisma.gymMembership.update({
          where: { id: existing.id },
          data: {
            status: existing.status === "REJECTED" ? "PENDING" : existing.status,
            role: "MEMBER",
          },
        })
      : await prisma.gymMembership.create({
          data: {
            gymId: gym.id,
            userId: user.id,
            status: "PENDING",
            role: "MEMBER",
          },
        });

    return reply.status(200).send(
      serializeGymMembership({
        status: membership.status as any,
        role: membership.role,
        gym: { id: gym.id, name: gym.name },
      }),
    );
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

const getGymMembership = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = await requireUser(request);
    const membership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "ACTIVE"] },
      },
      select: {
        status: true,
        role: true,
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return reply.status(200).send(serializeGymMembership(membership));
  } catch (error) {
    return handleRequestError(reply, error);
  }
};

app.get("/gyms/membership", getGymMembership);
app.get("/gym/me", getGymMembership);

app.post("/gym/join-code", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { code } = joinGymByCodeSchema.parse(request.body);
    const normalizedCode = code.toUpperCase();
    const gym = await prisma.gym.findUnique({ where: { code: normalizedCode } });

    if (!gym) {
      return reply.status(400).send({ error: "INVALID_GYM_CODE", message: "Gym code is invalid." });
    }

    const blockingMembership = await findBlockingGymMembership(user.id);
    if (blockingMembership) {
      return reply.status(409).send({
        error: "GYM_MEMBERSHIP_CONFLICT",
        message: "User already has an active or pending gym membership.",
        membership: serializeGymMembership({
          status: blockingMembership.status,
          role: blockingMembership.role,
          gym: blockingMembership.gym,
        }),
      });
    }

    const existing = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId: gym.id, userId: user.id } },
    });

    const membership = existing
      ? await prisma.gymMembership.update({
          where: { id: existing.id },
          data: {
            status: existing.status === "REJECTED" ? "PENDING" : existing.status,
            role: "MEMBER",
          },
        })
      : await prisma.gymMembership.create({
          data: {
            gymId: gym.id,
            userId: user.id,
            status: "PENDING",
            role: "MEMBER",
          },
        });

    return reply.status(200).send(
      serializeGymMembership({
        status: membership.status as any,
        role: membership.role,
        gym: { id: gym.id, name: gym.name },
      }),
    );
  } catch (error) {
    return handleRequestError(reply, error);
  }
});


const leaveGymMembership = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = await requireUser(request);
    const activeMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "ACTIVE"] },
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!activeMembership) {
      return reply.status(200).send({
        left: false,
        membership: serializeGymMembership(null),
      });
    }

    await prisma.gymMembership.delete({ where: { id: activeMembership.id } });

    return reply.status(200).send({
      left: true,
      membership: serializeGymMembership(null),
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
};

app.delete("/gyms/membership", leaveGymMembership);
app.delete("/gym/me", leaveGymMembership);

app.get("/admin/gym-join-requests", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const isGlobalAdmin = user.role === "ADMIN" || isBootstrapAdmin(user.email);

    if (!isGlobalAdmin) {
      const managerMembership = await prisma.gymMembership.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
          role: { in: ["ADMIN", "TRAINER"] },
        },
        select: { id: true },
      });

      if (!managerMembership) {
        return reply
          .status(403)
          .send({ error: "FORBIDDEN", message: "Only gym admins or trainers can list join requests." });
      }
    }

    const requests = await prisma.gymMembership.findMany({
      where: {
        status: "PENDING",
        ...(isGlobalAdmin
          ? {}
          : {
              gym: {
                memberships: {
                  some: {
                    userId: user.id,
                    status: "ACTIVE",
                    role: { in: ["ADMIN", "TRAINER"] },
                  },
                },
              },
            }
          ),
      },
      select: {
        id: true,
        createdAt: true,
        gym: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const items = requests.map((membership) => ({
      id: membership.id,
      membershipId: membership.id,
      status: "PENDING" as const,
      gym: membership.gym,
      user: membership.user,
      createdAt: membership.createdAt,
    }));

    return { items, requests: items };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/gym-join-requests/:membershipId/accept", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const isGlobalAdmin = user.role === "ADMIN" || isBootstrapAdmin(user.email);
    const { membershipId } = gymJoinRequestParamsSchema.parse(request.params);
    const membership = await prisma.gymMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, gymId: true, userId: true, status: true, role: true },
    });
    if (!membership) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Membership request not found." });
    }
    if (membership.status !== "PENDING") {
      return reply.status(400).send({ error: "INVALID_MEMBERSHIP_STATUS", message: "Only pending requests can be accepted." });
    }
    if (!isGlobalAdmin) {
      await requireGymManagerForGym(user, membership.gymId);
    }

    const activeMembershipElsewhere = await prisma.gymMembership.findFirst({
      where: {
        userId: membership.userId,
        status: "ACTIVE",
        gymId: { not: membership.gymId },
      },
      select: {
        id: true,
        gym: {
          select: { id: true, name: true },
        },
      },
    });

    if (activeMembershipElsewhere) {
      return reply.status(409).send({
        error: "GYM_MEMBERSHIP_CONFLICT",
        message: "User already belongs to another active gym.",
        activeMembership: {
          id: activeMembershipElsewhere.id,
          gym: activeMembershipElsewhere.gym,
        },
      });
    }

    await prisma.gymMembership.updateMany({
      where: {
        userId: membership.userId,
        status: "PENDING",
        id: { not: membership.id },
      },
      data: { status: "REJECTED" },
    });

    const updateResult = await prisma.gymMembership.updateMany({
      where: { id: membership.id, status: "PENDING" },
      data: { status: "ACTIVE", role: membership.role },
    });

    if (updateResult.count === 0) {
      return reply
        .status(400)
        .send({ error: "INVALID_MEMBERSHIP_STATUS", message: "Only pending requests can be accepted." });
    }

    return { membershipId: membership.id, status: "ACTIVE" };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/gym-join-requests/:membershipId/reject", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const isGlobalAdmin = user.role === "ADMIN" || isBootstrapAdmin(user.email);
    const { membershipId } = gymJoinRequestParamsSchema.parse(request.params);
    const membership = await prisma.gymMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, gymId: true, status: true },
    });
    if (!membership) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Membership request not found." });
    }
    if (membership.status !== "PENDING") {
      return reply.status(400).send({ error: "INVALID_MEMBERSHIP_STATUS", message: "Only pending requests can be rejected." });
    }
    if (!isGlobalAdmin) {
      await requireGymManagerForGym(user, membership.gymId);
    }
    const updateResult = await prisma.gymMembership.updateMany({
      where: { id: membership.id, status: "PENDING" },
      data: { status: "REJECTED" },
    });

    if (updateResult.count === 0) {
      return reply
        .status(400)
        .send({ error: "INVALID_MEMBERSHIP_STATUS", message: "Only pending requests can be rejected." });
    }

    return { membershipId: membership.id, status: "REJECTED" };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/admin/gyms/:gymId/members", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { gymId } = gymMembersParamsSchema.parse(request.params);
    await requireGymManagerForGym(user, gymId);

    const members = await prisma.gymMembership.findMany({
      where: {
        gymId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        status: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      user: member.user,
      status: member.status,
      role: member.role,
    }));
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/nutrition-plans", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { query, limit, offset } = nutritionPlanListSchema.parse(request.query);

    const managerMembership = await requireActiveGymManagerMembership(requester.id);

    const plans = await prisma.nutritionPlan.findMany({
      where: {
        OR: [
          { userId: requester.id },
          {
            gymAssignments: {
              some: {
                gymId: managerMembership.gymId,
                status: GymMembershipStatus.ACTIVE,
                role: GymRole.MEMBER,
              },
            },
          },
        ],
        ...(query
          ? { title: { contains: query, mode: Prisma.QueryMode.insensitive } }
          : {}),
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        daysCount: true,
        dailyCalories: true,
        proteinG: true,
        fatG: true,
        carbsG: true,
        createdAt: true,
        days: {
          orderBy: { order: "asc" },
          select: { id: true, dayLabel: true, order: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: offset,
      take: limit,
    });

    return reply.status(200).send({ items: plans, limit, offset });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/trainer/nutrition-plans", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    await requireActiveGymManagerMembership(requester.id);
    const payload = trainerNutritionPlanCreateSchema.parse(request.body);

    const startDate = payload.startDate ? parseDateInput(payload.startDate) : new Date();
    if (!startDate) {
      return reply.status(400).send({ error: "INVALID_START_DATE" });
    }

    const daysCount = payload.daysCount ?? ((payload.weeks ?? 1) * 7);
    const dates = buildDateRange(startDate, daysCount);

    const selectedRecipeIds = Array.from(
      new Set(
        (payload.days ?? [])
          .flatMap((day: any) => day.meals ?? [])
          .map((meal: any) => String(meal.recipeId))
          .filter((value: string) => value.length > 0),
      ),
    );

    const recipesById = new Map<
      string,
      {
        id: string;
        name: string;
        description: string | null;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        photoUrl: string | null;
        ingredients: { name: string; grams: number }[];
      }
    >();

    if (selectedRecipeIds.length > 0) {
      const recipes = await prisma.recipe.findMany({
        where: { id: { in: selectedRecipeIds } },
        include: {
          ingredients: {
            select: { name: true, grams: true },
          },
        },
      });
      recipes.forEach((recipe: any) => {
        recipesById.set(recipe.id, recipe);
      });
    }

    const dayPlansByIndex = new Map<
      number,
      {
        dayLabel?: string;
        meals: Array<{ type: string; recipeId: string }>;
      }
    >();

    (payload.days ?? []).forEach((day: any) => {
      dayPlansByIndex.set(day.dayIndex, {
        dayLabel: day.dayLabel,
        meals: day.meals ?? [],
      });
    });

    const createdPlan = await prisma.nutritionPlan.create({
      data: {
        userId: requester.id,
        title: payload.title,
        dailyCalories: payload.dailyCalories ?? 2000,
        proteinG: payload.proteinG ?? 120,
        fatG: payload.fatG ?? 60,
        carbsG: payload.carbsG ?? 220,
        startDate,
        daysCount,
        days: {
          create: dates.map((date, index) => {
            const plannedDay = dayPlansByIndex.get(index);
            const meals = (plannedDay?.meals ?? [])
              .map((meal) => {
                const recipe = recipesById.get(meal.recipeId);
                if (!recipe) return null;
                return {
                  type: meal.type,
                  title: recipe.name,
                  description: recipe.description,
                  calories: recipe.calories,
                  protein: recipe.protein,
                  carbs: recipe.carbs,
                  fats: recipe.fat,
                  imageUrl: recipe.photoUrl,
                  ingredients: {
                    create: recipe.ingredients.map((ingredient) => ({
                      name: ingredient.name,
                      grams: ingredient.grams,
                    })),
                  },
                };
              })
              .filter((meal): meal is NonNullable<typeof meal> => Boolean(meal));

            return {
              date: new Date(`${date}T00:00:00.000Z`),
              dayLabel: plannedDay?.dayLabel ?? `Día ${index + 1}`,
              order: index + 1,
              ...(meals.length > 0
                ? {
                    meals: {
                      create: meals,
                    },
                  }
                : {}),
            };
          }),
        },
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        daysCount: true,
        createdAt: true,
        days: {
          orderBy: { order: "asc" },
          select: { id: true, dayLabel: true, order: true },
        },
      },
    });

    return reply.status(201).send(createdPlan);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/nutrition-plans/:id", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(requester.id);
    const { id } = trainerNutritionPlanParamsSchema.parse(request.params);

    const plan = await prisma.nutritionPlan.findFirst({
      where: {
        id,
        OR: [
          { userId: requester.id },
          {
            gymAssignments: {
              some: {
                gymId: managerMembership.gymId,
                status: GymMembershipStatus.ACTIVE,
                role: GymRole.MEMBER,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        daysCount: true,
        createdAt: true,
        days: {
          orderBy: { order: "asc" },
          include: {
            meals: {
              include: { ingredients: true },
            },
          },
        },
      },
    });

    if (!plan) {
      return reply.status(404).send({ error: "NUTRITION_PLAN_NOT_FOUND" });
    }

    return reply.status(200).send(plan);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

const handleTrainerNutritionPlanUpdate = async (request: any, reply: any) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(requester.id);
    const { id } = trainerNutritionPlanParamsSchema.parse(request.params);
    const payload = trainerNutritionPlanUpdateSchema.parse(request.body);

    const existingPlan = await prisma.nutritionPlan.findFirst({
      where: {
        id,
        OR: [
          { userId: requester.id },
          {
            gymAssignments: {
              some: {
                gymId: managerMembership.gymId,
                status: GymMembershipStatus.ACTIVE,
                role: GymRole.MEMBER,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        daysCount: true,
        dailyCalories: true,
        proteinG: true,
        fatG: true,
        carbsG: true,
      },
    });

    if (!existingPlan) {
      return reply.status(404).send({ error: "NUTRITION_PLAN_NOT_FOUND" });
    }

    const parsedStartDate = payload.startDate ? parseDateInput(payload.startDate) : null;
    if (payload.startDate && !parsedStartDate) {
      return reply.status(400).send({ error: "INVALID_START_DATE" });
    }
    const nextStartDate = parsedStartDate ?? existingPlan.startDate;

    const nextDaysCount = payload.daysCount ?? (payload.weeks ? payload.weeks * 7 : existingPlan.daysCount);
    const dates = buildDateRange(nextStartDate, nextDaysCount);

    const selectedRecipeIds = Array.from(
      new Set(
        (payload.days ?? [])
          .flatMap((day: any) => day.meals ?? [])
          .map((meal: any) => String(meal.recipeId))
          .filter((value: string) => value.length > 0),
      ),
    );

    const recipesById = new Map<
      string,
      {
        id: string;
        name: string;
        description: string | null;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        photoUrl: string | null;
        ingredients: { name: string; grams: number }[];
      }
    >();

    if (selectedRecipeIds.length > 0) {
      const recipes = await prisma.recipe.findMany({
        where: { id: { in: selectedRecipeIds } },
        include: {
          ingredients: {
            select: { name: true, grams: true },
          },
        },
      });
      recipes.forEach((recipe: any) => {
        recipesById.set(recipe.id, recipe);
      });
    }

    const dayPlansByIndex = new Map<
      number,
      {
        dayLabel?: string;
        meals: Array<{ type: string; recipeId: string }>;
      }
    >();

    (payload.days ?? []).forEach((day: any) => {
      dayPlansByIndex.set(day.dayIndex, {
        dayLabel: day.dayLabel,
        meals: day.meals ?? [],
      });
    });

    const updatedPlan = await prisma.nutritionPlan.update({
      where: { id: existingPlan.id },
      data: {
        title: payload.title,
        startDate: nextStartDate,
        daysCount: nextDaysCount,
        dailyCalories: payload.dailyCalories ?? existingPlan.dailyCalories,
        proteinG: payload.proteinG ?? existingPlan.proteinG,
        fatG: payload.fatG ?? existingPlan.fatG,
        carbsG: payload.carbsG ?? existingPlan.carbsG,
        days: {
          deleteMany: {},
          create: dates.map((date, index) => {
            const plannedDay = dayPlansByIndex.get(index);
            const meals = (plannedDay?.meals ?? [])
              .map((meal) => {
                const recipe = recipesById.get(meal.recipeId);
                if (!recipe) return null;
                return {
                  type: meal.type,
                  title: recipe.name,
                  description: recipe.description,
                  calories: recipe.calories,
                  protein: recipe.protein,
                  carbs: recipe.carbs,
                  fats: recipe.fat,
                  imageUrl: recipe.photoUrl,
                  ingredients: {
                    create: recipe.ingredients.map((ingredient) => ({
                      name: ingredient.name,
                      grams: ingredient.grams,
                    })),
                  },
                };
              })
              .filter((meal): meal is NonNullable<typeof meal> => Boolean(meal));

            return {
              date: new Date(`${date}T00:00:00.000Z`),
              dayLabel: plannedDay?.dayLabel ?? `Día ${index + 1}`,
              order: index + 1,
              ...(meals.length > 0
                ? {
                    meals: {
                      create: meals,
                    },
                  }
                : {}),
            };
          }),
        },
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        daysCount: true,
        dailyCalories: true,
        proteinG: true,
        fatG: true,
        carbsG: true,
        createdAt: true,
        days: {
          orderBy: { order: "asc" },
          select: { id: true, dayLabel: true, order: true },
        },
      },
    });

    return reply.status(200).send(updatedPlan);
  } catch (error) {
    return handleRequestError(reply, error);
  }
};

app.patch("/trainer/nutrition-plans/:id", handleTrainerNutritionPlanUpdate);
app.put("/trainer/nutrition-plans/:id", handleTrainerNutritionPlanUpdate);

app.get("/trainer/plans", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { query, limit, offset } = trainingPlanListSchema.parse(request.query);

    const managerMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: requester.id,
        status: "ACTIVE",
        role: { in: ["ADMIN", "TRAINER"] },
      },
      select: { gymId: true },
    });

    const memberMembership = managerMembership
      ? null
      : await prisma.gymMembership.findFirst({
          where: {
            userId: requester.id,
            status: "ACTIVE",
            role: "MEMBER",
          },
          select: { gymId: true },
          orderBy: { updatedAt: "desc" },
        });

    const visibleGymId = managerMembership?.gymId ?? memberMembership?.gymId;

const plans = await prisma.trainingPlan.findMany({
  where: {
    OR: [
      { userId: requester.id },
      ...(visibleGymId
        ? [
            {
              gymAssignments: {
                some: {
                  gymId: visibleGymId,
                  status: GymMembershipStatus.ACTIVE,
                  role: GymRole.MEMBER,
                },
              },
            },
          ]
        : []),
    ],
    ...(query ? { title: { contains: query, mode: Prisma.QueryMode.insensitive } } : {}),
  },
      select: {
        id: true,
        userId: true,
        title: true,
        notes: true,
        goal: true,
        level: true,
        daysPerWeek: true,
        focus: true,
        equipment: true,
        startDate: true,
        daysCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: offset,
      take: limit,
    });

    return { items: plans, limit, offset };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/trainer/plans", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    await requireActiveGymManagerMembership(requester.id);
    const payload = trainerPlanCreateSchema.parse(request.body);

    const startDate = payload.startDate ? parseDateInput(payload.startDate) : new Date();
    if (!startDate) {
      return reply.status(400).send({ error: "INVALID_START_DATE" });
    }

    const daysCount = payload.daysCount ?? payload.daysPerWeek ?? 7;
    const daysPerWeek = payload.daysPerWeek ?? Math.min(daysCount, 7);
    const dates = buildDateRange(startDate, daysCount);

    const dayPlansByIndex = new Map<number, z.infer<typeof trainerPlanDayCreateSchema>>();
    for (const dayPlan of payload.days ?? []) {
      dayPlansByIndex.set(dayPlan.dayIndex, dayPlan);
    }

    const referencedExerciseIds = Array.from(
      new Set(
        (payload.days ?? [])
          .flatMap((dayPlan) => dayPlan.exercises ?? [])
          .map((exercise) => exercise.exerciseId)
          .filter((exerciseId) => typeof exerciseId === "string" && exerciseId.trim().length > 0),
      ),
    );

    const referencedExercises = referencedExerciseIds.length > 0
      ? await prisma.exercise.findMany({
          where: { id: { in: referencedExerciseIds } },
          select: { id: true, name: true, imageUrl: true },
        })
      : [];

    const exerciseById = new Map(
      referencedExercises.map((exercise) => [exercise.id, exercise]),
    );

    const createdPlan = await prisma.trainingPlan.create({
      data: {
        userId: requester.id,
        title: payload.title,
        notes: payload.notes ?? payload.description ?? null,
        goal: payload.goal,
        level: payload.level,
        daysPerWeek,
        focus: payload.focus,
        equipment: payload.equipment,
        startDate,
        daysCount,
        days: {
          create: dates.map((date, index) => {
            const dayPlan = dayPlansByIndex.get(index);
            const dayExercises = (dayPlan?.exercises ?? [])
              .map((exerciseInput) => {
                const exerciseMeta = exerciseById.get(exerciseInput.exerciseId);
                if (!exerciseMeta) return null;

                return {
                  exerciseId: exerciseMeta.id,
                  name: exerciseInput.name ?? exerciseMeta.name,
                  imageUrl: exerciseMeta.imageUrl,
                  sets: exerciseInput.sets ?? 3,
                  reps: exerciseInput.reps ?? "8-12",
                  rest: exerciseInput.rest ?? 60,
                };
              })
              .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise));

            return {
              date: new Date(`${date}T00:00:00.000Z`),
              label: dayPlan?.label ?? `Día ${index + 1}`,
              focus: dayPlan?.focus ?? payload.focus,
              duration: dayPlan?.duration ?? 45,
              order: index + 1,
              ...(dayExercises.length > 0
                ? {
                    exercises: {
                      create: dayExercises,
                    },
                  }
                : {}),
            };
          }),
        },
      },
      include: {
        days: trainingDayIncludeWithLegacySafeExercises,
      },
    });

    return reply.status(201).send(createdPlan);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/plans/:planId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(requester.id);
    const { planId } = trainerPlanParamsSchema.parse(request.params);

    const plan = await prisma.trainingPlan.findFirst({
      where: {
        id: planId,
        OR: [
          { userId: requester.id },
          {
            gymAssignments: {
              some: {
                gymId: managerMembership.gymId,
                status: "ACTIVE",
                role: "MEMBER",
              },
            },
          },
        ],
      },
      include: {
        days: trainingDayIncludeWithLegacySafeExercises,
      },
    });

    if (!plan) {
      return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
    }

    return plan;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/trainer/plans/:planId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    await requireActiveGymManagerMembership(requester.id);
    const { planId } = trainerPlanParamsSchema.parse(request.params);
    const payload = trainerPlanUpdateSchema.parse(request.body);

    const existing = await prisma.trainingPlan.findFirst({
      where: { id: planId, userId: requester.id },
      select: { id: true, focus: true, daysCount: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
    }

    const nextDaysCount = payload.daysCount ?? existing.daysCount;
    const nextFocus = payload.focus ?? existing.focus;
    const nextStartDate = payload.startDate ? parseDateInput(payload.startDate) : null;

    if (payload.startDate && !nextStartDate) {
      return reply.status(400).send({ error: "INVALID_START_DATE" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const plan = await tx.trainingPlan.update({
        where: { id: existing.id },
        data: {
          title: payload.title,
          notes: payload.notes === undefined ? undefined : payload.notes,
          goal: payload.goal,
          level: payload.level,
          focus: payload.focus,
          equipment: payload.equipment,
          daysPerWeek: payload.daysPerWeek,
          daysCount: payload.daysCount,
          startDate: nextStartDate ?? undefined,
        },
      });

      if (payload.daysCount !== undefined || payload.focus !== undefined || payload.startDate !== undefined) {
        const dates = buildDateRange(nextStartDate ?? plan.startDate, nextDaysCount);
        await tx.trainingDay.deleteMany({ where: { planId: existing.id } });
        await tx.trainingDay.createMany({
          data: dates.map((date, index) => ({
            planId: existing.id,
            date: new Date(`${date}T00:00:00.000Z`),
            label: `Día ${index + 1}`,
            focus: nextFocus,
            duration: 45,
            order: index + 1,
          })),
        });
      }

      return tx.trainingPlan.findUnique({
        where: { id: existing.id },
        include: {
          days: trainingDayIncludeWithLegacySafeExercises,
        },
      });
    });

    return updated;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

async function getTrainerManagedPlan(
  requesterId: string,
  planId: string
): Promise<{ plan: { id: string; userId: string }; managerMembership: { gymId: string } }> {
  const managerMembership = await requireActiveGymManagerMembership(requesterId);
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      userId: true,
      gymAssignments: {
        where: {
          gymId: managerMembership.gymId,
          status: "ACTIVE",
          role: "MEMBER",
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!plan) {
    throw createHttpError(404, "TRAINING_PLAN_NOT_FOUND", { planId });
  }

  const canManage = plan.userId === requesterId || plan.gymAssignments.length > 0;

  if (!canManage) {
    throw createHttpError(403, "FORBIDDEN", { planId, requesterId });
  }

  return { plan: { id: plan.id, userId: plan.userId }, managerMembership: { gymId: managerMembership.gymId } };
}

app.delete("/trainer/plans/:planId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { planId } = trainerPlanParamsSchema.parse(request.params);

    const { plan, managerMembership } = await getTrainerManagedPlan(requester.id, planId);

    await prisma.$transaction(async (tx) => {
      await tx.gymMembership.updateMany({
        where: { assignedTrainingPlanId: plan.id },
        data: { assignedTrainingPlanId: null },
      });
      await tx.trainingPlan.delete({
        where: { id: plan.id },
      });
    });

    request.log.info(
      { planId: plan.id, requesterId: requester.id, gymId: managerMembership.gymId },
      "trainer deleted training plan"
    );

    return reply.status(204).send();
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.delete("/trainer/plans/:planId/days/:dayId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { planId, dayId } = trainerPlanDayParamsSchema.parse(request.params);

    const { plan, managerMembership } = await getTrainerManagedPlan(requester.id, planId);

    const deleted = await prisma.$transaction(async (tx) => {
      const day = await tx.trainingDay.findFirst({
        where: {
          id: dayId,
          planId: plan.id,
        },
        select: { id: true },
      });

      if (!day) {
        return false;
      }

      await tx.trainingExercise.deleteMany({ where: { dayId: day.id } });
      await tx.trainingDay.delete({ where: { id: day.id } });
      return true;
    });

    if (!deleted) {
      return reply.status(404).send({ error: "TRAINING_DAY_NOT_FOUND" });
    }

    request.log.info(
      { planId: plan.id, dayId, requesterId: requester.id, gymId: managerMembership.gymId },
      "trainer deleted training day"
    );

    return reply.status(204).send();
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/trainer/plans/:planId/days/:dayId/exercises", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { planId, dayId } = trainerPlanDayParamsSchema.parse(request.params);
    const { exerciseId } = addTrainingExerciseBodySchema.parse(request.body);

    const { plan, managerMembership } = await getTrainerManagedPlan(requester.id, planId);

    const [day, exercise] = await Promise.all([
      prisma.trainingDay.findFirst({
        where: { id: dayId, planId: plan.id },
        select: { id: true },
      }),
      prisma.exercise.findUnique({
        where: { id: exerciseId },
        select: { id: true, name: true, imageUrl: true },
      }),
    ]);

    if (!day) {
      return reply.status(404).send({ error: "TRAINING_DAY_NOT_FOUND" });
    }

    if (!exercise) {
      return reply.status(404).send({ error: "EXERCISE_NOT_FOUND" });
    }

    const created = await prisma.trainingExercise.create({
      data: {
        dayId: day.id,
        exerciseId: exercise.id,
        imageUrl: exercise.imageUrl,
        name: exercise.name,
        sets: 3,
        reps: "10-12",
      },
    });

    request.log.info(
      { planId: plan.id, dayId, exerciseId, requesterId: requester.id, gymId: managerMembership.gymId },
      "trainer added exercise to training day"
    );

    return reply.status(201).send({
      exercise: created,
      sourceExercise: exercise,
      planId: plan.id,
      dayId: day.id,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/trainer/plans/:planId/days/:dayId/exercises/:exerciseId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { planId, dayId, exerciseId } = trainerPlanExerciseParamsSchema.parse(request.params);
    const payload = trainerPlanExerciseUpdateSchema.parse(request.body);

    const { plan, managerMembership } = await getTrainerManagedPlan(requester.id, planId);

    const day = await prisma.trainingDay.findFirst({
      where: { id: dayId, planId: plan.id },
      select: { id: true },
    });

    if (!day) {
      return reply.status(404).send({ error: "TRAINING_DAY_NOT_FOUND" });
    }

    const updated = await prisma.trainingExercise.updateMany({
      where: {
        id: exerciseId,
        dayId: day.id,
      },
      data: {
        sets: payload.sets,
        reps: payload.reps,
        rest: payload.rest,
      },
    });

    if (updated.count === 0) {
      return reply.status(404).send({ error: "TRAINING_EXERCISE_NOT_FOUND" });
    }

    const exercise = await prisma.trainingExercise.findUnique({
      where: { id: exerciseId },
    });

    request.log.info(
      { planId: plan.id, dayId, exerciseId, requesterId: requester.id, gymId: managerMembership.gymId },
      "trainer updated training exercise"
    );

    return reply.status(200).send({ exercise });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.delete("/trainer/plans/:planId/days/:dayId/exercises/:exerciseId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { planId, dayId, exerciseId } = trainerPlanExerciseParamsSchema.parse(request.params);

    const { plan, managerMembership } = await getTrainerManagedPlan(requester.id, planId);

    const day = await prisma.trainingDay.findFirst({
      where: { id: dayId, planId: plan.id },
      select: { id: true },
    });

    if (!day) {
      return reply.status(404).send({ error: "TRAINING_DAY_NOT_FOUND" });
    }

    const deleted = await prisma.trainingExercise.deleteMany({
      where: {
        id: exerciseId,
        dayId: day.id,
      },
    });

    if (deleted.count === 0) {
      return reply.status(404).send({ error: "TRAINING_EXERCISE_NOT_FOUND" });
    }

    request.log.info(
      { planId: plan.id, dayId, exerciseId, requesterId: requester.id, gymId: managerMembership.gymId },
      "trainer deleted training exercise"
    );

    return reply.status(204).send();
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

async function getTrainerMemberAssignment(
  requesterId: string,
  memberUserId: string
): Promise<{
  managerMembership: { gymId: string };
  targetMembership: {
    id: string;
    status: string;
    role: string;
    assignedTrainingPlanId: string | null;
    assignedTrainingPlan: {
      id: string;
      title: string;
      goal: string;
      level: string;
      daysPerWeek: number;
      focus: string;
      equipment: string;
      startDate: Date;
      daysCount: number;
    } | null;
  };
}> {
  const managerMembership = await requireActiveGymManagerMembership(requesterId);
  const targetMembership = await prisma.gymMembership.findUnique({
    where: { gymId_userId: { gymId: managerMembership.gymId, userId: memberUserId } },
    select: {
      id: true,
      role: true,
      status: true,
      assignedTrainingPlanId: true,
      assignedTrainingPlan: {
        select: trainerAssignPlanResultSchema,
      },
    },
  });

  if (!targetMembership || targetMembership.status !== "ACTIVE" || targetMembership.role !== "MEMBER") {
    throw createHttpError(404, "MEMBER_NOT_FOUND", { memberUserId, gymId: managerMembership.gymId });
  }

  return { managerMembership: { gymId: managerMembership.gymId }, targetMembership };
}

app.post("/trainer/clients/:userId/assigned-plan", async (request, reply) => {
  try {
    const { userId } = trainerClientParamsSchema.parse(request.params);
    const { trainingPlanId } = trainerAssignPlanBodySchema.parse(request.body);
    const requester = await requireUser(request);

    const { managerMembership, targetMembership } = await getTrainerMemberAssignment(requester.id, userId);

    const selectedPlan = await prisma.trainingPlan.findFirst({
      where: {
        id: trainingPlanId,
        OR: [
          { userId: requester.id },
          {
            gymAssignments: {
              some: {
                gymId: managerMembership.gymId,
                status: "ACTIVE",
                role: "MEMBER",
              },
            },
          },
        ],
      },
      select: trainerAssignPlanResultSchema,
    });

    if (!selectedPlan) {
      return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
    }

    await prisma.gymMembership.update({
      where: { id: targetMembership.id },
      data: { assignedTrainingPlanId: selectedPlan.id },
    });

    return reply.status(200).send({
      ok: true,
      memberId: userId,
      gymId: managerMembership.gymId,
      assignedPlan: selectedPlan,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/clients/:userId/assigned-plan", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { userId } = trainerClientParamsSchema.parse(request.params);
    const { managerMembership, targetMembership } = await getTrainerMemberAssignment(requester.id, userId);

    return reply.status(200).send({
      memberId: userId,
      gymId: managerMembership.gymId,
      assignedPlan: targetMembership.assignedTrainingPlan,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.delete("/trainer/clients/:userId/assigned-plan", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { userId } = trainerClientParamsSchema.parse(request.params);
    const { managerMembership, targetMembership } = await getTrainerMemberAssignment(requester.id, userId);

    await prisma.gymMembership.update({
      where: { id: targetMembership.id },
      data: { assignedTrainingPlanId: null },
    });

    return reply.status(200).send({ ok: true, memberId: userId, gymId: managerMembership.gymId, assignedPlan: null });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/trainer/clients/:userId/assigned-nutrition-plan", async (request, reply) => {
  try {
    const { userId } = trainerClientParamsSchema.parse(request.params);
    const { nutritionPlanId } = trainerAssignNutritionPlanBodySchema.parse(request.body);
    const requester = await requireUser(request);

    const { managerMembership, targetMembership } = await getTrainerMemberAssignment(requester.id, userId);

    const selectedPlan = await prisma.nutritionPlan.findFirst({
      where: {
        id: nutritionPlanId,
        OR: [
          { userId: requester.id },
          {
            gymAssignments: {
              some: {
                gymId: managerMembership.gymId,
                status: "ACTIVE",
                role: "MEMBER",
              },
            },
          },
        ],
      },
      select: trainerAssignNutritionPlanResultSchema,
    });

    if (!selectedPlan) {
      return reply.status(404).send({ error: "NUTRITION_PLAN_NOT_FOUND" });
    }

    await prisma.gymMembership.update({
      where: { id: targetMembership.id },
      data: { assignedNutritionPlanId: selectedPlan.id },
    });

    return reply.status(200).send({
      ok: true,
      memberId: userId,
      gymId: managerMembership.gymId,
      assignedPlan: selectedPlan,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/trainer/members/:id/training-plan-assignment", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { id } = trainerMemberIdParamsSchema.parse(request.params);
    const { trainingPlanId } = trainerAssignPlanBodySchema.parse(request.body);

    const { managerMembership, targetMembership } = await getTrainerMemberAssignment(requester.id, id);

    const selectedPlan = await prisma.trainingPlan.findFirst({
      where: {
        id: trainingPlanId,
        OR: [
          { userId: requester.id },
          {
            gymAssignments: {
              some: {
                gymId: managerMembership.gymId,
                status: "ACTIVE",
                role: "MEMBER",
              },
            },
          },
        ],
      },
      select: trainerAssignPlanResultSchema,
    });

    if (!selectedPlan) {
      return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
    }

    await prisma.gymMembership.update({
      where: { id: targetMembership.id },
      data: { assignedTrainingPlanId: selectedPlan.id },
    });

    return reply.status(200).send({
      ok: true,
      memberId: id,
      gymId: managerMembership.gymId,
      assignedPlan: selectedPlan,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.delete("/trainer/members/:id/training-plan-assignment", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { id } = trainerMemberIdParamsSchema.parse(request.params);
    const { managerMembership, targetMembership } = await getTrainerMemberAssignment(requester.id, id);

    await prisma.gymMembership.update({
      where: { id: targetMembership.id },
      data: { assignedTrainingPlanId: null },
    });

    return reply.status(200).send({ ok: true, memberId: id, gymId: managerMembership.gymId, assignedPlan: null });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/clients", async (request, reply) => {
  try {
    const user = await requireUser(request);

    const managerMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["ADMIN", "TRAINER"] },
      },
      select: { gymId: true },
    });

    if (!managerMembership) {
      return reply.status(403).send({ error: "FORBIDDEN" });
    }

    const clients = await prisma.gymMembership.findMany({
      where: {
        gymId: managerMembership.gymId,
        status: "ACTIVE",
        role: "MEMBER",
      },
      select: {
        role: true,
        assignedTrainingPlan: {
          select: {
            id: true,
            title: true,
            daysCount: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isBlocked: true,
            subscriptionStatus: true,
            lastLoginAt: true,
            profile: {
              select: {
                profile: true,
                tracking: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      clients: clients.map((membership) => ({
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        isBlocked: membership.user.isBlocked,
        subscriptionStatus: membership.user.subscriptionStatus,
        lastLoginAt: membership.user.lastLoginAt,
        assignedPlan: membership.assignedTrainingPlan,
        metrics: parseClientMetrics(membership.user.profile?.profile ?? null, membership.user.profile?.tracking ?? null),
      })),
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/clients/:userId", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { userId } = trainerClientParamsSchema.parse(request.params);

    const managerMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["ADMIN", "TRAINER"] },
      },
      select: { gymId: true },
    });

    if (!managerMembership) {
      return reply.status(403).send({ error: "FORBIDDEN" });
    }

    const membership = await prisma.gymMembership.findFirst({
      where: {
        gymId: managerMembership.gymId,
        userId,
        status: "ACTIVE",
        role: "MEMBER",
      },
      select: {
        role: true,
        assignedTrainingPlan: {
          select: {
            id: true,
            title: true,
            daysCount: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isBlocked: true,
            subscriptionStatus: true,
            lastLoginAt: true,
            profile: {
              select: {
                profile: true,
                tracking: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    const trackingRaw = membership.user.profile?.tracking ?? null;
    const trackingRecord = isRecord(trackingRaw) ? (trackingRaw as Record<string, unknown>) : null;
    const rawCheckins = trackingRecord && Array.isArray(trackingRecord.checkins) ? trackingRecord.checkins : [];

    return {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      isBlocked: membership.user.isBlocked,
      subscriptionStatus: membership.user.subscriptionStatus,
      lastLoginAt: membership.user.lastLoginAt,
      assignedPlan: membership.assignedTrainingPlan,
      metrics: parseClientMetrics(membership.user.profile?.profile ?? null, trackingRaw),
      tracking: {
        checkins: rawCheckins.filter((entry) => isRecord(entry) && typeof (entry as Record<string, unknown>).date === "string"),
      },
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.delete("/trainer/clients/:userId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(requester.id);
    const { userId } = trainerClientParamsSchema.parse(request.params);

    const targetMembership = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId: managerMembership.gymId, userId } },
      select: { id: true, role: true, status: true },
    });

    if (!targetMembership || targetMembership.status !== "ACTIVE" || targetMembership.role !== "MEMBER") {
      return reply.status(404).send({ error: "MEMBER_NOT_FOUND" });
    }

    await prisma.gymMembership.delete({ where: { id: targetMembership.id } });

    return reply.status(200).send({ memberId: userId, gymId: managerMembership.gymId, removed: true });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

// Trainer recipes CRUD
app.get("/trainer/recipes", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(requester.id);
    const recipes = await prisma.recipe.findMany({
      where: {
        trainerId: requester.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        ingredients: true,
      },
    });
    return recipes;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/trainer/recipes", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(requester.id);
    const data = trainerRecipeCreateSchema.parse(request.body);
    const { ingredients, ...recipeData } = data;
    const recipe = await prisma.recipe.create({
      data: {
        ...recipeData,
        trainerId: requester.id,
        ingredients: {
          create: ingredients,
        },
      },
      include: {
        ingredients: true,
      },
    });
    return reply.status(201).send(recipe);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/recipes/:id", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(requester.id);
    const { id } = trainerRecipeParamsSchema.parse(request.params);
    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        trainerId: requester.id,
      },
      include: {
        ingredients: true,
      },
    });
    if (!recipe) {
      return reply.status(404).send({ error: "RECIPE_NOT_FOUND" });
    }
    return recipe;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.put("/trainer/recipes/:id", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(requester.id);
    const { id } = trainerRecipeParamsSchema.parse(request.params);
    const data = trainerRecipeUpdateSchema.parse(request.body);
    const { ingredients, ...recipeData } = data;
    const existing = await prisma.recipe.findFirst({
      where: { id, trainerId: requester.id },
    });
    if (!existing) {
      return reply.status(404).send({ error: "RECIPE_NOT_FOUND" });
    }
    // Update recipe and replace ingredients if provided
    const updated = await prisma.$transaction(async (tx) => {
      const updatedRecipe = await tx.recipe.update({
        where: { id },
        data: recipeData,
      });
      if (ingredients) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
        await tx.recipeIngredient.createMany({
          data: ingredients.map((ing) => ({ ...ing, recipeId: id })),
        });
      }
      return tx.recipe.findUnique({
        where: { id },
        include: { ingredients: true },
      });
    });
    return updated;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.delete("/trainer/recipes/:id", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(requester.id);
    const { id } = trainerRecipeParamsSchema.parse(request.params);
    const existing = await prisma.recipe.findFirst({
      where: { id, trainerId: requester.id },
    });
    if (!existing) {
      return reply.status(404).send({ error: "RECIPE_NOT_FOUND" });
    }
    await prisma.recipe.delete({ where: { id } });
    return reply.status(204).send();
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/gyms", async (request, reply) => {
  try {
    const user = await requireAdmin(request);
    const { name, code } = adminCreateGymSchema.parse(request.body);
    const created = await prisma.$transaction(async (tx) => {
      const gym = await tx.gym.create({
        data: {
          name,
          code,
          activationCode: code,
        },
      });
      await tx.gymMembership.create({
        data: {
          gymId: gym.id,
          userId: user.id,
          status: "ACTIVE",
          role: "ADMIN",
        },
      });
      return gym;
    });
    return reply.status(201).send({
      id: created.id,
      name: created.name,
      code: created.code,
      activationCode: created.activationCode,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return reply
        .status(409)
        .send({ code: "GYM_CODE_ALREADY_EXISTS", error: "GYM_CODE_ALREADY_EXISTS", message: "Gym code already exists." });
    }
    return handleRequestError(reply, error);
  }
});

app.get("/admin/gyms", async (request, reply) => {
  try {
    await requireAdmin(request);

    const gyms = await prisma.gym.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        activationCode: true,
        _count: {
          select: {
            memberships: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return gyms.map((gym) => ({
      id: gym.id,
      name: gym.name,
      code: gym.code,
      activationCode: gym.activationCode,
      membersCount: gym._count.memberships,
    }));
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.delete("/admin/gyms/:gymId", async (request, reply) => {
  try {
    await requireAdmin(request);
    const { gymId } = adminDeleteGymParamsSchema.parse(request.params);

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: {
        id: true,
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    });

    if (!gym) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Gym not found." });
    }

    await prisma.gym.delete({ where: { id: gymId } });

    return reply.status(200).send({ ok: true, gymId, deletedMemberships: gym._count.memberships });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return reply.status(404).send({ code: "GYM_NOT_FOUND", error: "GYM_NOT_FOUND", message: "Gym not found." });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return reply
        .status(409)
        .send({ code: "GYM_DELETE_CONFLICT", error: "GYM_DELETE_CONFLICT", message: "Gym cannot be deleted due to related records." });
    }
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/gyms/:gymId/members/:userId/role", async (request, reply) => {
  try {
    await requireAdmin(request);
    const { gymId, userId } = adminUpdateGymMemberRoleParamsSchema.parse(request.params);
    const { role, status } = adminUpdateGymMemberRoleSchema.parse(request.body);

    const membership = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId, userId } },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    const updated = await prisma.gymMembership.update({
      where: { id: membership.id },
      data: {
        role,
        ...(status ? { status } : {}),
      },
      select: {
        userId: true,
        status: true,
        role: true,
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      userId: updated.userId,
      gym: updated.gym,
      status: updated.status,
      role: updated.role,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/gym/admin/members/:userId/role", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { userId } = gymAdminUpdateMemberRoleParamsSchema.parse(request.params);
    const { role } = gymAdminUpdateMemberRoleSchema.parse(request.body);

    const adminMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: requester.id,
        status: "ACTIVE",
        role: "ADMIN",
      },
      select: {
        gymId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!adminMembership) {
      return reply.status(403).send({ error: "FORBIDDEN" });
    }

    const targetMembership = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId: adminMembership.gymId, userId } },
      select: {
        id: true,
      },
    });

    if (!targetMembership) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    const updated = await prisma.gymMembership.update({
      where: { id: targetMembership.id },
      data: { role },
      select: {
        gymId: true,
        userId: true,
        role: true,
      },
    });

    return {
      ok: true,
      userId: updated.userId,
      gymId: updated.gymId,
      role: updated.role,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/admin/users", async (request, reply) => {
  try {
    await requireAdmin(request);

    const querySchema = z.object({
      query: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
    });

    const { query, page } = querySchema.parse(request.query);

    const pageSize = 20;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              {
                email: {
                  contains: query,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                name: {
                  contains: query,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { authProviders: true },
      }),
    ]);

    const payload = users.map((user) => {
      const method = user.passwordHash
        ? "local"
        : user.authProviders &&
            user.authProviders.some(
              (provider) => provider.provider === "google",
            )
          ? "google"
          : user.provider;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isBlocked: user.isBlocked,
        emailVerified: Boolean(user.emailVerifiedAt),
        method,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      };
    });

    return { total, page, pageSize, users: payload };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/users", async (request, reply) => {
  try {
    await requireAdmin(request);
    const data = adminCreateUserSchema.parse(request.body);
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return reply.status(409).send({ error: "EMAIL_IN_USE" });
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role ?? "USER",
        plan: data.subscriptionPlan ?? "FREE",
        aiTokenBalance: data.aiTokenBalance ?? 0,
        aiTokenResetAt:
          data.subscriptionPlan !== "FREE" && (data.aiTokenBalance ?? 0) > 0
            ? getTokenExpiry(30)
            : null,
        aiTokenRenewalAt:
          data.subscriptionPlan !== "FREE" && (data.aiTokenBalance ?? 0) > 0
            ? getTokenExpiry(30)
            : null,
        aiTokenMonthlyAllowance: data.aiTokenMonthlyAllowance ?? 0,
        provider: "email",
      },
    });
    return reply.status(201).send({
      id: user.id,
      email: user.email,
      role: user.role,
      subscriptionPlan: user.plan,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/users/:id/verify-email", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const user = await prisma.user.update({
      where: { id },
      data: { emailVerifiedAt: new Date() },
    });
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
      emailVerifiedAt: user.emailVerifiedAt,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/users/:id/reset-password", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const bodySchema = z.object({ newPassword: z.string().min(8) });
    const { id } = paramsSchema.parse(request.params);
    const { newPassword } = bodySchema.parse(request.body);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    return { id: user.id, ok: true };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/users/:id/block", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const user = await prisma.user.update({
      where: { id },
      data: { isBlocked: true },
    });
    return { id: user.id, isBlocked: user.isBlocked };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/users/:id/unblock", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const user = await prisma.user.update({
      where: { id },
      data: { isBlocked: false },
    });
    return { id: user.id, isBlocked: user.isBlocked };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/users/:id/plan", async (request, reply) => {
  try {
    await requireAdmin(request);
    const { id } = adminUserIdParamsSchema.parse(request.params);
    const { subscriptionPlan } = adminUserPlanUpdateSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id },
      data: { plan: subscriptionPlan },
      select: {
        id: true,
        plan: true,
      },
    });

    return {
      id: user.id,
      subscriptionPlan: user.plan,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/users/:id/tokens", async (request, reply) => {
  try {
    await requireAdmin(request);
    const { id } = adminUserIdParamsSchema.parse(request.params);
    const { aiTokenBalance, aiTokenMonthlyAllowance } =
      adminUserTokensUpdateSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(aiTokenBalance !== undefined ? { aiTokenBalance } : {}),
        ...(aiTokenMonthlyAllowance !== undefined
          ? { aiTokenMonthlyAllowance }
          : {}),
      },
      select: {
        id: true,
        aiTokenBalance: true,
        aiTokenMonthlyAllowance: true,
      },
    });

    return {
      id: user.id,
      aiTokenBalance: user.aiTokenBalance,
      aiTokenMonthlyAllowance: user.aiTokenMonthlyAllowance,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/users/:id/tokens-allowance", async (request, reply) => {
  try {
    await requireAdmin(request);
    const { id } = adminUserIdParamsSchema.parse(request.params);
    const { aiTokenMonthlyAllowance } =
      adminUserTokenAllowanceUpdateSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id },
      data: { aiTokenMonthlyAllowance },
      select: {
        id: true,
        aiTokenMonthlyAllowance: true,
      },
    });

    return {
      id: user.id,
      aiTokenMonthlyAllowance: user.aiTokenMonthlyAllowance,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/users/:id/tokens/add", async (request, reply) => {
  try {
    await requireAdmin(request);
    const { id } = adminUserIdParamsSchema.parse(request.params);
    const { amount } = adminUserTokenAddSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id },
      data: {
        aiTokenBalance: {
          increment: amount,
        },
      },
      select: {
        id: true,
        aiTokenBalance: true,
      },
    });

    return {
      id: user.id,
      aiTokenBalance: user.aiTokenBalance,
      amountAdded: amount,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/users/:id/tokens/balance", async (request, reply) => {
  try {
    await requireAdmin(request);
    const { id } = adminUserIdParamsSchema.parse(request.params);
    const { aiTokenBalance } = adminUserTokenBalanceUpdateSchema.parse(
      request.body,
    );

    const user = await prisma.user.update({
      where: { id },
      data: { aiTokenBalance },
      select: {
        id: true,
        aiTokenBalance: true,
      },
    });

    return {
      id: user.id,
      aiTokenBalance: user.aiTokenBalance,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.delete("/admin/users/:id", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: `deleted_${id}@fitsculpt.local`,
        name: null,
        passwordHash: null,
        isBlocked: true,
      },
    });

    return { ok: true };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

// Ruta solo para desarrollo, mete algunos ejercicios en la tabla Exercise
app.post("/dev/seed-exercises", async (_request, reply) => {
  try {
    // Solo permitir en desarrollo por seguridad
    if (process.env.NODE_ENV === "production") {
      return reply.status(403).send({ error: "FORBIDDEN" });
    }

    let seeded = 0;
    for (const name of EXERCISES_100) {
      await upsertExerciseRecord(name, inferExerciseMetadataFromName(name));
      seeded += 1;
    }

    return reply.status(200).send({ ok: true, seeded });
  } catch (err) {
    app.log.error({ err }, "seed exercises failed");
    return reply.status(500).send({ error: "INTERNAL_ERROR" });
  }
});

app.post("/dev/seed-recipes", async (_request, reply) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return reply.status(403).send({ error: "FORBIDDEN" });
    }

    let seeded = 0;

    for (const [index, seedData] of RECIPES_100.entries()) {
      const seed = buildRecipeSeedItem(seedData, index);
      await prisma.recipe.upsert({
        where: { name: seed.name },
        create: {
          name: seed.name,
          displayName: seed.displayName,
          tagline: seed.tagline,
          description: seed.description,
          calories: seed.calories,
          protein: seed.protein,
          carbs: seed.carbs,
          fat: seed.fat,
          steps: seed.steps,
          slug: seed.slug,
          category: seed.category,
          mealType: seed.mealType,
          dietType: seed.dietType,
          goalFit: seed.goalFit,
          mainIngredient: seed.mainIngredient,
          cuisine: seed.cuisine,
          difficulty: seed.difficulty,
          tags: seed.tags,
          keywords: seed.keywords,
          prepTimeMinutes: seed.prepTimeMinutes,
          cookTimeMinutes: seed.cookTimeMinutes,
          servingSize: seed.servingSize,
          servings: seed.servings,
          photoUrl: seed.photoUrl,
          imageUrls: seed.imageUrls,
          source: seed.source,
          ingredients: {
            create: seed.ingredients.map((ingredient) => ({
              name: ingredient.name,
              grams: ingredient.grams,
              isMainIngredient: ingredient.isMainIngredient,
              category: ingredient.category,
            })),
          },
        },
        update: {
          displayName: seed.displayName,
          tagline: seed.tagline,
          description: seed.description,
          calories: seed.calories,
          protein: seed.protein,
          carbs: seed.carbs,
          fat: seed.fat,
          steps: seed.steps,
          slug: seed.slug,
          category: seed.category,
          mealType: seed.mealType,
          dietType: seed.dietType,
          goalFit: seed.goalFit,
          mainIngredient: seed.mainIngredient,
          cuisine: seed.cuisine,
          difficulty: seed.difficulty,
          tags: seed.tags,
          keywords: seed.keywords,
          prepTimeMinutes: seed.prepTimeMinutes,
          cookTimeMinutes: seed.cookTimeMinutes,
          servingSize: seed.servingSize,
          servings: seed.servings,
          photoUrl: seed.photoUrl,
          imageUrls: seed.imageUrls,
          source: seed.source,
          ingredients: {
            deleteMany: {},
            create: seed.ingredients.map((ingredient) => ({
              name: ingredient.name,
              grams: ingredient.grams,
              isMainIngredient: ingredient.isMainIngredient,
              category: ingredient.category,
            })),
          },
        },
      });
      seeded += 1;
    }

    return reply.status(200).send({ ok: true, seeded });
  } catch (err) {
    app.log.error({ err }, "seed recipes failed");
    return reply.status(500).send({ error: "INTERNAL_ERROR" });
  }
});

app.post("/dev/reset-demo", async (request, reply) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return reply.status(403).send({ error: "FORBIDDEN" });
    }

    const tokenState =
      request.query &&
      typeof (request.query as { tokenState?: unknown }).tokenState ===
        "string" &&
      ["empty", "paid"].includes(
        (request.query as { tokenState?: string }).tokenState ?? "",
      )
        ? ((request.query as { tokenState?: "empty" | "paid" }).tokenState ??
          "empty")
        : "empty";

    const result = await resetDemoState(prisma, { tokenState });
    return reply.status(200).send({ ok: true, ...result });
  } catch (err) {
    app.log.error({ err }, "reset demo failed");
    return reply.status(500).send({ error: "INTERNAL_ERROR" });
  }
});

await seedAdmin();

if (process.env.NODE_ENV !== "production") {
  app.log.info(
    { routes: ["/ai/nutrition-plan/generate", "/ai/nutrition-plan"] },
    "Registered nutrition AI routes",
  );
  app.log.info("Registered routes\n%s", app.printRoutes());
}

await app.listen({ port: env.PORT, host: env.HOST });
