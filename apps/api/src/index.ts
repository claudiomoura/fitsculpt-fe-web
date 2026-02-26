import "dotenv/config";
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
import { AiParseError, parseJsonFromText, parseLargestJsonFromText, parseTopLevelJsonFromText } from "./aiParsing.js";
import {
  buildUsageTotals,
  chargeAiUsage,
  chargeAiUsageForResult,
  extractExactProviderUsage,
  persistAiUsageLog,
} from "./ai/chargeAiUsage.js";
import { createOpenAiClient, type OpenAiResponse } from "./ai/provider/openaiClient.js";
import { classifyAiGenerateError } from "./ai/errorClassification.js";
import { buildEffectiveEntitlements, type EffectiveEntitlements } from "./entitlements.js";
import { buildAuthMeResponse } from "./auth/schemas.js";
import { loadAiPricing } from "./ai/pricing.js";
import { NUTRITION_MATH_TOLERANCES, validateNutritionMath } from "./ai/nutritionMathValidation.js";
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
import {
  applyNutritionPlanVarietyGuard,
  resolveNutritionPlanRecipeIds,
  type NutritionRecipeCatalogItem,
} from "./ai/nutrition-plan/recipeCatalogResolution.js";
import { normalizeExercisePayload, type ExerciseApiDto, type ExerciseRow } from "./exercises/normalizeExercisePayload.js";
import { fetchExerciseCatalog } from "./exercises/fetchExerciseCatalog.js";
import { normalizeExerciseName } from "./utils/normalizeExerciseName.js";
import { nutritionPlanJsonSchema } from "./lib/ai/schemas/nutritionPlanJsonSchema.js";
import { resolveNutritionPlanRecipeReferences } from "./ai/nutrition-plan/recipeCatalog.js";
import { trainingPlanJsonSchema } from "./lib/ai/schemas/trainingPlanJsonSchema.js";
import { createPrismaClientWithRetry } from "./prismaClient.js";
import { isStripePriceNotFoundError } from "./billing/stripeErrors.js";
import {
  defaultTracking,
  trackingDeleteSchema,
  trackingEntryCreateSchema,
  trackingSchema,
} from "./tracking/schemas.js";
import { normalizeTrackingSnapshot, upsertTrackingEntry } from "./tracking/service.js";
import { resetDemoState } from "./dev/demoSeed.js";
import { registerWeeklyReviewRoute } from "./routes/weeklyReview.js";
import { registerAdminAssignGymRoleRoutes } from "./routes/admin/assignGymRole.js";
import {
  normalizeNutritionPlanDays as normalizeNutritionPlanDaysWithLabels,
  toIsoDateString,
} from "./ai/nutrition-plan/normalizeNutritionPlanDays.js";


const env = getEnv();
const prisma = await createPrismaClientWithRetry();
const aiPricing = loadAiPricing(env);

const app = Fastify({ logger: true });

type StripeCheckoutSession = {
  id: string;
  url: string | null;
  customer?: string | null;
  subscription?: string | null;
};

type StripePortalSession = {
  id: string;
  url: string;
};

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end: number | null;
  items?: { data?: StripeSubscriptionItem[] };
};

type StripeSubscriptionItem = {
  price?: {
    id?: string | null;
  } | null;
};

type StripeInvoiceLineItem = {
  price?: {
    id?: string | null;
  } | null;
};

type StripeInvoice = {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  lines?: { data?: StripeInvoiceLineItem[] };
};

type StripeSubscriptionList = {
  data: StripeSubscription[];
};

type StripeCustomer = {
  id: string;
};

type StripeProduct = {
  id: string;
  name?: string | null;
};

type StripePrice = {
  id: string;
  currency: string;
  unit_amount: number | null;
  recurring?: {
    interval?: string | null;
  } | null;
  product?: string | StripeProduct | null;
};

type StripeInterval = "day" | "week" | "month" | "year" | "unknown";

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
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

app.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
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
});

const VERIFICATION_TTL_MS = env.VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = env.VERIFICATION_RESEND_COOLDOWN_MINUTES * 60 * 1000;

app.get("/health", async () => ({ status: "ok" }));

function createHttpError(statusCode: number, code: string, debug?: Record<string, unknown>) {
  const error = new Error(code) as Error & { statusCode?: number; code?: string; debug?: Record<string, unknown> };
  error.statusCode = statusCode;
  error.code = code;
  error.debug = debug;
  return error;
}

function handleRequestError(reply: FastifyReply, error: unknown) {
  if (error instanceof z.ZodError) {
    return reply.status(400).send({ error: "INVALID_INPUT", details: error.flatten() });
  }
  const typed = error as { statusCode?: number; code?: string; debug?: Record<string, unknown> };
  if (typed.statusCode === 429 && typed.code === "AI_LIMIT_REACHED") {
    const retryAfterSec = typeof typed.debug?.retryAfterSec === "number" ? typed.debug.retryAfterSec : undefined;
    if (retryAfterSec) {
      reply.header("Retry-After", retryAfterSec.toString());
    }
    return reply.status(429).send({
      error: "AI_LIMIT_REACHED",
      message: "Has alcanzado el límite diario de IA. Suscríbete a PRO para más usos o intenta mañana.",
      ...(retryAfterSec ? { retryAfterSec } : {}),
    });
  }
  if (typed.statusCode === 402 && typed.code === "UPGRADE_REQUIRED") {
    return reply.status(402).send({ code: "UPGRADE_REQUIRED" });
  }
  if (typed.statusCode === 409 && typed.code === "PROFILE_INCOMPLETE") {
    return reply.status(409).send({ code: "PROFILE_INCOMPLETE" });
  }
  if (typed.statusCode) {
    return reply.status(typed.statusCode).send({
      error: typed.code ?? "REQUEST_ERROR",
      ...(typed.debug ? { debug: typed.debug } : {}),
    });
  }
  app.log.error({ err: error }, "unhandled error");
  return reply.status(500).send({ error: "INTERNAL_ERROR" });
}

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
    { priceId: env.STRIPE_PRICE_STRENGTH_AI_MONTHLY, plan: "STRENGTH_AI" as const },
    { priceId: env.STRIPE_PRICE_NUTRI_AI_MONTHLY, plan: "NUTRI_AI" as const },
  ];
  const missing = prices.filter((entry) => !entry.priceId).map((entry) => entry.plan);
  if (missing.length > 0) {
    throw createHttpError(500, "STRIPE_PRICE_NOT_CONFIGURED", { missingPlans: missing });
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
  const planEntry = getAvailableBillingPlans().find((entry) => entry.plan === plan);
  return planEntry?.priceId ?? null;
}

function getAvailableBillingPlans() {
  const plans = [
    { plan: "PRO" as const, priceId: env.STRIPE_PRO_PRICE_ID },
    { plan: "STRENGTH_AI" as const, priceId: env.STRIPE_PRICE_STRENGTH_AI_MONTHLY },
    { plan: "NUTRI_AI" as const, priceId: env.STRIPE_PRICE_NUTRI_AI_MONTHLY },
  ];

  return plans.filter(
    (entry): entry is (typeof plans)[number] & { priceId: string } => typeof entry.priceId === "string"
  );
}

function parseStripeAmount(price: StripePrice): number | null {
  if (typeof price.unit_amount !== "number") return null;
  return price.unit_amount / 100;
}

async function resolveStripePlanTitle(price: StripePrice, fallbackPlan: SubscriptionPlan): Promise<string> {
  if (price.product && typeof price.product === "object" && typeof price.product.name === "string" && price.product.name.trim()) {
    return price.product.name;
  }

  if (typeof price.product === "string") {
    try {
      const stripeProduct = await stripeRequest<StripeProduct>(`products/${price.product}`, {}, { method: "GET" });
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
  if (interval === "day" || interval === "week" || interval === "month" || interval === "year") {
    return interval;
  }
  return "unknown";
}

function isStripeCredentialError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const anyError = error as Error & { code?: string; debug?: { status?: number } };
  return anyError.code === "STRIPE_REQUEST_FAILED" && (anyError.debug?.status === 401 || anyError.debug?.status === 403);
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
  options?: { method?: "POST" | "GET"; idempotencyKey?: string }
): Promise<T> {
  const secret = requireStripeSecret();
  const method = options?.method ?? "POST";
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
  const url = `https://api.stripe.com/v1/${path}`;
  const queryString = query.toString();
  const response = await fetch(method === "GET" && queryString ? `${url}?${queryString}` : url, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    body: method === "GET" ? undefined : queryString,
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw createHttpError(502, "STRIPE_REQUEST_FAILED", { status: response.status, body: errorBody });
  }
  return (await response.json()) as T;
}

function verifyStripeSignature(
  rawBody: Buffer,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSec = 300
) {
  const parts = signatureHeader.split(",").map((p) => p.trim());

  const tPart = parts.find((p) => p.startsWith("t="));
  const tValue = tPart?.slice(2);
  if (!tValue) throw createHttpError(400, "INVALID_STRIPE_SIGNATURE", { reason: "missing_t" });

  const timestamp = Number(tValue);
  if (!Number.isFinite(timestamp)) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE", { reason: "invalid_t" });
  }

  // Stripe puede mandar VARIOS v1=...
  const v1Signatures = parts
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3))
    .filter(Boolean);

  if (v1Signatures.length === 0) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE", { reason: "missing_v1" });
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
  const expectedHex = crypto.createHmac("sha256", webhookSecret).update(signedPayload, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");

  const matchesAny = v1Signatures.some((sig) => {
    // si viene algo raro, evita crash
    if (!/^[0-9a-f]+$/i.test(sig)) return false;
    const sigBuf = Buffer.from(sig, "hex");
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });

  if (!matchesAny) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE");
  }
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
    plan: SubscriptionPlan;
    aiTokenBalance: number;
    aiTokenResetAt: Date | null;
    aiTokenRenewalAt: Date | null;
    subscriptionStatus?: string | null;
    stripeSubscriptionId?: string | null;
    currentPeriodEnd?: Date | null;
  }
) {
  const result = await prisma.user.updateMany({
    where: { stripeCustomerId },
    data: {
      plan: data.plan,
      subscriptionStatus: data.subscriptionStatus === undefined ? undefined : data.subscriptionStatus,
      stripeSubscriptionId: data.stripeSubscriptionId === undefined ? undefined : data.stripeSubscriptionId,
      currentPeriodEnd: data.currentPeriodEnd === undefined ? undefined : data.currentPeriodEnd,
      aiTokenBalance: data.aiTokenBalance,
      aiTokenResetAt: data.aiTokenResetAt,
      aiTokenRenewalAt: data.aiTokenRenewalAt,
    },
  });
  if (result.count === 0) {
    app.log.warn({ stripeCustomerId }, "user not found for billing update");
  }
}

async function updateUserSubscriptionForCustomer(
  stripeCustomerId: string,
  data: {
    plan: SubscriptionPlan;
    subscriptionStatus?: string | null;
    stripeSubscriptionId?: string | null;
    currentPeriodEnd?: Date | null;
  }
) {
  const result = await prisma.user.updateMany({
    where: { stripeCustomerId },
    data: {
      plan: data.plan,
      subscriptionStatus: data.subscriptionStatus === undefined ? undefined : data.subscriptionStatus,
      stripeSubscriptionId: data.stripeSubscriptionId === undefined ? undefined : data.stripeSubscriptionId,
      currentPeriodEnd: data.currentPeriodEnd === undefined ? undefined : data.currentPeriodEnd,
    },
  });
  if (result.count === 0) {
    app.log.warn({ stripeCustomerId }, "user not found for subscription update");
  }
}

function isActiveSubscriptionStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

function getPlanFromSubscription(subscription?: StripeSubscription | null): SubscriptionPlan | null {
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
  const subscriptions = await stripeRequest<StripeSubscriptionList>(
    "subscriptions",
    { customer: customerId, status: "all", limit: 100, "expand[0]": "data.items.data.price" },
    { method: "GET" }
  );
  const activeSubscriptions = subscriptions.data.filter((subscription) => {
    if (!isActiveSubscriptionStatus(subscription.status)) return false;
    return getPlanFromSubscription(subscription) !== null;
  });
  if (activeSubscriptions.length === 0) {
    return null;
  }
  return activeSubscriptions.sort((a, b) => (b.current_period_end ?? 0) - (a.current_period_end ?? 0))[0] ?? null;
}

async function getActivePlanSubscriptions(customerId: string) {
  const subscriptions = await stripeRequest<StripeSubscriptionList>(
    "subscriptions",
    { customer: customerId, status: "all", limit: 100, "expand[0]": "data.items.data.price" },
    { method: "GET" }
  );

  return subscriptions.data.filter((subscription) => {
    if (!isActiveSubscriptionStatus(subscription.status)) return false;
    return getPlanFromSubscription(subscription) !== null;
  });
}

async function getOrCreateCustomerId(user: User) {
  let customerId = user.stripeCustomerId ?? null;

  if (!customerId) {
    const customer = await stripeRequest<{ id: string }>("customers", {
      email: user.email,
      name: user.name ?? undefined,
      "metadata[userId]": user.id,
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  return customerId;
}

function getSubscriptionPeriodEnd(subscription?: StripeSubscription | null) {
  if (!subscription?.current_period_end) return null;
  return new Date(subscription.current_period_end * 1000);
}

function getPlanFromInvoice(invoice?: StripeInvoice | null): SubscriptionPlan | null {
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
    return user.stripeCustomerId;
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

async function syncUserBillingFromStripe(
  user: User,
  options?: {
    createCustomerIfMissing?: boolean;
  }
) {
  const shouldCreateCustomer = options?.createCustomerIfMissing ?? true;
  const stripeCustomerId = shouldCreateCustomer
    ? await getOrCreateStripeCustomer(user)
    : (user.stripeCustomerId ?? (await getExistingStripeCustomerId(user.id)));

  if (!stripeCustomerId) {
    return await prisma.user.findUnique({ where: { id: user.id } });
  }

  const activeSubscription = await getLatestActiveSubscription(stripeCustomerId);
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
  const currentTokenExpiryAt = getUserTokenExpiryAt(user);
  const tokensExpired = currentTokenExpiryAt ? currentTokenExpiryAt.getTime() < Date.now() : true;
  const currentTokenBalance = getUserTokenBalance(user);
  const shouldTopUpTokens = tokensExpired || currentTokenBalance <= 0;
  const nextResetAt = currentPeriodEnd ?? getTokenExpiry(30);
  const nextRenewalAt = nextResetAt;
  const nextBalance = shouldTopUpTokens ? 5000 : currentTokenBalance;

  return await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: getPlanFromSubscription(activeSubscription) ?? "FREE",
      subscriptionStatus: activeSubscription.status,
      stripeSubscriptionId: activeSubscription.id,
      currentPeriodEnd: currentPeriodEnd ?? null,
      aiTokenBalance: nextBalance,
      aiTokenResetAt: nextResetAt,
      aiTokenRenewalAt: nextRenewalAt,
      aiTokenMonthlyAllowance: 5000,
    },
  });
}

function logAuthCookieDebug(request: FastifyRequest, route: string) {
  if (process.env.NODE_ENV === "production") return;
  const cookieHeader = request.headers.cookie;
  const hasCookie = typeof cookieHeader === "string" && cookieHeader.length > 0;
  const hasToken = hasCookie && cookieHeader.includes("fs_token=");
  const hasSignature = hasCookie && cookieHeader.includes("fs_token.sig=");
  app.log.info({ route, hasCookie, hasToken, hasSignature }, "auth cookie debug");
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
  if ((token.startsWith("\"") && token.endsWith("\"")) || (token.startsWith("'") && token.endsWith("'"))) {
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
  const hasBearerPrefix = authHeader?.trim().toLowerCase().startsWith("bearer ") ?? false;
  if (authHeader) {
    const rawToken = bearerToken ?? authHeader;
    const normalized = normalizeToken(rawToken);
    return { token: normalized.token, source: "authorization" as const, hasBearerPrefix, normalized };
  }
  const cookieHeader = request.headers.cookie;
  const cookieToken = parseCookieHeader(cookieHeader).get("fs_token") ?? null;
  if (cookieToken) {
    const normalized = normalizeToken(cookieToken);
    return { token: normalized.token, source: "cookie" as const, hasBearerPrefix, normalized };
  }
  return { token: null, source: "none" as const, hasBearerPrefix, normalized: null };
}

async function requireUser(
  request: FastifyRequest,
  options?: {
    logContext?: string;
  }
) {
  const route = options?.logContext ?? request.routeOptions?.url ?? "unknown";
  const hasAuthHeader = typeof request.headers.authorization === "string";
  const hasCookieHeader = typeof request.headers.cookie === "string";
  if (options?.logContext && process.env.NODE_ENV !== "production") {
    app.log.info({ route, hasAuthHeader, hasCookieHeader }, "ai auth precheck");
  }

  const { token, source, hasBearerPrefix, normalized } = getJwtTokenFromRequest(request);
  if (!token) {
    if (options?.logContext && process.env.NODE_ENV !== "production") {
      app.log.warn({ route, reason: "MISSING_TOKEN", source, hasBearerPrefix }, "ai auth failed");
    }
    throw createHttpError(401, "UNAUTHORIZED");
  }
  const segments = normalized?.segments ?? token.split(".").length;
  const hasPercent = normalized?.hadPercent ?? false;
  if (segments !== 3) {
    if (options?.logContext && process.env.NODE_ENV !== "production") {
      app.log.warn({ route, source, hasBearerPrefix, segments, hasPercent }, "ai auth invalid token format");
    }
    throw createHttpError(401, "INVALID_TOKEN_FORMAT", { segments, hasPercent });
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
      "ai auth token debug"
    );
  }
  if (process.env.NODE_ENV !== "production") {
    app.log.info(
      {
        route,
        source,
        tokenSegmentsCount: token.split(".").length,
      },
      "auth token segments count"
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
          reason: typed.message ?? typed.code ?? typed.name ?? "JWT_VERIFY_FAILED",
          source,
          hasBearerPrefix,
          segments,
          hasPercent,
          tokenDecodeFailed: normalized?.decodeFailed ?? false,
          tokenHasSpace: token.includes(" "),
          tokenHasCookieLabel: token.includes("fs_token="),
        },
        "ai auth failed"
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
  if (user.role !== "ADMIN" && !isBootstrapAdmin(user.email)) {
    throw createHttpError(403, "FORBIDDEN");
  }
  return user;
}

function getBootstrapAdminEmails() {
  if (!env.BOOTSTRAP_ADMIN_EMAILS) return new Set<string>();
  return new Set(
    env.BOOTSTRAP_ADMIN_EMAILS.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

const bootstrapAdminEmails = getBootstrapAdminEmails();

function isBootstrapAdmin(email: string): boolean {
  return bootstrapAdminEmails.has(email.trim().toLowerCase());
}

async function requireGymManagerForGym(userId: string, gymId: string) {
  const managerMembership = await prisma.gymMembership.findUnique({
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
    !managerMembership ||
    managerMembership.status !== "ACTIVE" ||
    (managerMembership.role !== "ADMIN" && managerMembership.role !== "TRAINER")
  ) {
    throw createHttpError(403, "FORBIDDEN");
  }
  return managerMembership;
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

  if (!adminMembership || adminMembership.status !== "ACTIVE" || adminMembership.role !== "ADMIN") {
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
        tracking: Prisma.DbNull,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.userProfile.findUnique({ where: { userId } });
      if (existing) return existing;
    }
    throw error;
  }
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).optional(),
  promoCode: z.string().min(1),
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
  timerSound: z.enum(["ding", "repsToDo"]),
});

const goalTagSchema = z.enum(["buildStrength", "loseFat", "betterHealth", "moreEnergy", "tonedMuscles"]);

const mealDistributionSchema = z.union([
  z.enum(["balanced", "lightDinner", "bigBreakfast", "bigLunch"]),
  z.object({
    preset: z.enum(["balanced", "lightDinner", "bigBreakfast", "bigLunch", "custom"]),
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
  age: z.number(),
  heightCm: z.number(),
  weightKg: z.number(),
  goalWeightKg: z.number(),
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
    chestCm: z.number(),
    waistCm: z.number(),
    hipsCm: z.number(),
    bicepsCm: z.number(),
    thighCm: z.number(),
    calfCm: z.number(),
    neckCm: z.number(),
    bodyFatPercent: z.number(),
  }),
});

const profileUpdateSchema = profileSchema.partial().extend({
  trainingPreferences: trainingPreferencesSchema.partial().optional(),
  nutritionPreferences: nutritionPreferencesSchema.partial().optional(),
  macroPreferences: macroPreferencesSchema.partial().optional(),
  measurements: profileSchema.shape.measurements.partial().optional(),
});

function isProfileComplete(profile: Record<string, unknown> | null) {
  if (!profile) return false;
  return profileSchema.safeParse(profile).success;
}

async function requireCompleteProfile(userId: string) {
  const profile = await getOrCreateProfile(userId);
  const data =
    typeof profile.profile === "object" && profile.profile ? (profile.profile as Record<string, unknown>) : null;
  if (!isProfileComplete(data)) {
    throw createHttpError(409, "PROFILE_INCOMPLETE");
  }
}

type AuthenticatedRequest = FastifyRequest & { currentUser?: User; currentEntitlements?: EffectiveEntitlements };

function getUserEntitlements(user: User) {
  return buildEffectiveEntitlements({
    plan: user.plan,
    isAdmin: user.role === "ADMIN" || isBootstrapAdmin(user.email),
  });
}

function getAiTokenPayload(user: User, entitlements: EffectiveEntitlements) {
  if (!entitlements.modules.ai.enabled) {
    return { aiTokenBalance: null, aiTokenRenewalAt: null };
  }

  if (entitlements.role.adminOverride) {
    return { aiTokenBalance: null, aiTokenRenewalAt: null };
  }

  return {
    aiTokenBalance: getEffectiveTokenBalance(user),
    aiTokenRenewalAt: getUserTokenExpiryAt(user),
  };
}

async function aiAccessGuard(request: FastifyRequest, reply: FastifyReply) {
  const user = await requireUser(request, { logContext: request.routeOptions?.url ?? "ai" });
  const entitlements = getUserEntitlements(user);
  if (!entitlements.modules.ai.enabled) {
    return reply.status(402).send({ code: "UPGRADE_REQUIRED" });
  }

  if (!entitlements.role.adminOverride) {
    const effectiveTokens = getEffectiveTokenBalance(user);
    if (effectiveTokens <= 0) {
      return reply.status(402).send({ code: "UPGRADE_REQUIRED" });
    }
  }

  (request as AuthenticatedRequest).currentUser = user;
  (request as AuthenticatedRequest).currentEntitlements = entitlements;
}

function createAiDomainGuard(domain: "nutrition" | "strength") {
  return async function aiDomainGuard(request: FastifyRequest, reply: FastifyReply) {
    const user = await requireUser(request, { logContext: request.routeOptions?.url ?? `ai:${domain}` });
    const entitlements = getUserEntitlements(user);

    if (!entitlements.modules.ai.enabled) {
      return reply.status(403).send({ error: "AI_ACCESS_FORBIDDEN" });
    }

    if (!entitlements.role.adminOverride) {
      const effectiveTokens = getEffectiveTokenBalance(user);
      if (effectiveTokens <= 0) {
        return reply.status(403).send({ error: "AI_ACCESS_FORBIDDEN" });
      }
    }

    const hasDomainAccess =
      domain === "nutrition" ? entitlements.modules.nutrition.enabled : entitlements.modules.strength.enabled;
    if (!hasDomainAccess) {
      return reply.status(403).send({ error: "AI_ACCESS_FORBIDDEN" });
    }

    (request as AuthenticatedRequest).currentUser = user;
    (request as AuthenticatedRequest).currentEntitlements = entitlements;
  };
}

const aiNutritionDomainGuard = createAiDomainGuard("nutrition");
const aiStrengthDomainGuard = createAiDomainGuard("strength");

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
      ? payload.percentages.map((item) => Number(item)).filter((item) => Number.isFinite(item))
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
    .enum(["balanced", "mediterranean", "keto", "vegetarian", "vegan", "pescatarian", "paleo", "flexible"])
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
  constraints: z.string().optional(),
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
    .enum(["balanced", "mediterranean", "keto", "vegetarian", "vegan", "pescatarian", "paleo", "flexible"])
    .optional(),
  dietaryPrefs: z
    .enum(["balanced", "mediterranean", "keto", "vegetarian", "vegan", "pescatarian", "paleo", "flexible"])
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
tempo: z.string().nullable().transform(v => v ?? ""),
notes: z.string().nullable().transform(v => v ?? ""),
rest: z.number().nullable().transform(v => v ?? 60),

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
        })
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
        })
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
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
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

function assertSufficientAiTokenBalance(user: {
  aiTokenBalance?: number | null;
  aiTokenResetAt?: Date | null;
  aiTokenRenewalAt?: Date | null;
}) {
  const effectiveTokens = getEffectiveTokenBalance(user);
  if (effectiveTokens < 1) {
    throw createHttpError(402, "INSUFFICIENT_TOKENS", { message: "No tienes tokens IA" });
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

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return `{${entries
    .map(([key, val]) => `"${key}":${stableStringify(val)}`)
    .join(",")}}`;
}


function buildCacheKey(type: string, params: Record<string, unknown>) {
  return `${type}:${stableStringify(params)}`;
}

function replaceTemplateVars(text: string, vars: Record<string, string | undefined>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => (value ? acc.replaceAll(`{${key}}`, value) : acc),
    text
  );
}

function applyPersonalization<T>(payload: T, vars: Record<string, string | undefined>) {
  const clone = JSON.parse(JSON.stringify(payload)) as T;
  if (!clone || typeof clone !== "object") return clone;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach((child) => walk(child));
      return;
    }
    if (node && typeof node === "object") {
      Object.entries(node as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === "string") {
          (node as Record<string, unknown>)[key] = replaceTemplateVars(value, vars);
        } else if (value && typeof value === "object") {
          walk(value);
        }
      });
    }
  };
  walk(clone);
  return clone;
}

async function enforceAiQuota(user: { id: string; plan: string }) {
  const dateKey = toDateKey();
  const limit = user.plan !== "FREE" ? env.AI_DAILY_LIMIT_PRO : env.AI_DAILY_LIMIT_FREE;
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
  payload: Record<string, unknown>
) {
await prisma.aiContent.create({
  data: { userId, type, source, payload: payload as Prisma.InputJsonValue },
});

}

async function safeStoreAiContent(
  userId: string,
  type: AiRequestType,
  source: "template" | "cache" | "ai",
  payload: Record<string, unknown>
) {
  try {
    await storeAiContent(userId, type, source, payload);
  } catch (error) {
    app.log.warn({ err: error, userId, type, source }, "ai content store failed");
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

async function saveCachedAiPayload(key: string, type: AiRequestType, payload: Record<string, unknown>) {
await prisma.aiPromptCache.upsert({
  where: { key },
  create: { key, type, payload: payload as Prisma.InputJsonValue },
  update: { payload: payload as Prisma.InputJsonValue, lastUsedAt: new Date() },
});

}

function resolveTemplateExerciseId(name: string, catalogByName: Map<string, string>) {
  const normalized = normalizeExerciseName(name);
  return catalogByName.get(normalized) ?? null;
}

function buildTrainingTemplate(
  params: z.infer<typeof aiTrainingSchema>,
  exerciseCatalog: ExerciseCatalogItem[]
): z.infer<typeof aiTrainingPlanResponseSchema> | null {
  if (params.focus !== "ppl" || params.level !== "intermediate" || params.daysPerWeek < 3) {
    return null;
  }
  
  const daysPerWeek = Math.min(params.daysPerWeek, 7);
  const catalogByName = new Map(
    exerciseCatalog.map((exercise) => [normalizeExerciseName(exercise.name), exercise.id])
  );
  const missingTemplateExercises = new Set<string>();
  const ex = (
    name: string,
    sets: number,
    reps: string,
    tempo = "2-0-1",
    rest = 90,
    notes = "Técnica limpia, controla la bajada."
  ) => {
    const exerciseId = resolveTemplateExerciseId(name, catalogByName);
    if (!exerciseId) {
      missingTemplateExercises.add(name);
    }
    return { exerciseId: exerciseId ?? "", name, sets, reps, tempo, rest, notes };
  };

  const pushDay = {
    date: null,
    label: "Día 1",
    focus: "Push",
    duration: params.timeAvailableMinutes,
exercises: [
  ex("Press banca", 4, "6-10", "2-0-1", 120, "Escápulas atrás, pausa suave abajo."),
  ex("Press militar", 3, "8-10", "2-0-1", 90, "Glúteos y core firmes, no hiperextender."),
  ex("Fondos", 3, "8-12", "2-0-1", 90, "Rango controlado, sin balanceo."),
  ex("Elevaciones laterales", 3, "12-15", "2-0-2", 60, "Codos suaves, sin impulso."),
  ex("Extensión tríceps", 3, "10-12", "2-0-2", 60, "Bloquea sin dolor de codo."),
],

  };
  const pullDay = {
  date: null,
  label: "Día 2",
  focus: "Pull",
  duration: params.timeAvailableMinutes,
  exercises: [
    ex("Remo con barra", 4, "6-10", "2-0-1", 120, "Espalda neutra, tira con codos."),
    ex("Dominadas", 3, "6-10", "2-1-1", 120, "Controla la bajada, no balancees."),
    ex("Remo en polea", 3, "10-12", "2-1-1", 90, "Pecho arriba, pausa al final."),
    ex("Curl bíceps", 3, "10-12", "2-0-2", 75, "Sin balanceo, codos fijos."),
    ex("Face pull", 3, "12-15", "2-1-2", 60, "Tira a la cara, hombros atrás."),
  ],
};

const legsDay = {
  date: null,
  label: "Día 3",
  focus: "Legs",
  duration: params.timeAvailableMinutes,
  exercises: [
    ex("Sentadilla", 4, "6-10", "3-0-1", 150, "Profundidad segura, core firme."),
    ex("Peso muerto rumano", 3, "8-10", "3-1-1", 120, "Cadera atrás, barra pegada."),
    ex("Hip thrust", 3, "10-12", "2-1-1", 120, "Pausa arriba, evita hiperextender."),
    ex("Prensa", 3, "10-12", "2-0-2", 120, "Controla recorrido, no bloquees rodillas."),
    ex("Elevaciones de gemelo", 3, "12-15", "2-1-2", 60, "Pausa arriba y estira abajo."),
  ],
};

const pushDayVariation = {
  date: null,
  label: "Día 4",
  focus: "Push (variación)",
  duration: params.timeAvailableMinutes,
  exercises: [
    ex("Press inclinado con mancuernas", 4, "8-10", "2-0-1", 120, "Recorrido completo, control."),
    ex("Press Arnold", 3, "8-10", "2-0-1", 90, "No arquees la espalda, core firme."),
    ex("Aperturas con mancuernas", 3, "12-15", "2-1-2", 75, "Estira sin dolor, codos suaves."),
    ex("Elevaciones frontales", 3, "12-15", "2-0-2", 60, "Sin impulso, sube hasta ojos."),
    ex("Jalón de tríceps con cuerda", 3, "10-12", "2-0-2", 60, "Separa cuerda al final, control."),
  ],
};

const pullDayVariation = {
  date: null,
  label: "Día 5",
  focus: "Pull (variación)",
  duration: params.timeAvailableMinutes,
  exercises: [
    ex("Remo con mancuerna a una mano", 4, "8-10", "2-1-1", 120, "Cadera estable, tira con codo."),
    ex("Jalón al pecho en polea", 3, "8-12", "2-1-1", 90, "Pecho arriba, baja al pecho."),
    ex("Remo en máquina", 3, "10-12", "2-1-1", 90, "Pausa al final, sin encoger hombros."),
    ex("Curl martillo", 3, "10-12", "2-0-2", 75, "Control, muñeca neutra."),
    ex("Encogimientos de trapecio", 3, "12-15", "2-1-2", 60, "Sube recto, pausa arriba."),
  ],
};

const legsDayVariation = {
  date: null,
  label: "Día 6",
  focus: "Legs (variación)",
  duration: params.timeAvailableMinutes,
  exercises: [
    ex("Sentadilla frontal", 4, "6-10", "3-0-1", 150, "Codos altos, torso erguido."),
    ex("Peso muerto sumo", 3, "6-10", "2-0-1", 150, "Rodillas afuera, espalda neutra."),
    ex("Zancada búlgara", 3, "10-12", "2-0-2", 120, "Rodilla estable, baja controlado."),
    ex("Curl femoral", 3, "10-12", "2-1-2", 90, "Pausa contracción, controla bajada."),
    ex("Elevaciones de gemelo sentado", 3, "12-15", "2-1-2", 60, "Rango completo, pausa arriba."),
  ],
};

const recoveryDay = {
  date: null,
  label: "Día 7",
  focus: "Cardio + movilidad",
  duration: Math.min(params.timeAvailableMinutes, 40),
  exercises: [
    ex("Caminata inclinada en cinta", 1, "20 min", "1-0-1", 0, "Ritmo moderado, respiración controlada."),
    ex("Plancha frontal", 3, "30-45s", "1-0-1", 45, "Cuerpo alineado, abdomen activo."),
    ex("Movilidad de cadera y hombro", 1, "10 min", "1-0-1", 0, "Movimientos suaves, sin dolor."),
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
    days: [...baseDays, pushDayVariation, pullDayVariation, legsDayVariation, recoveryDay],
    notes: "Plan PPL completo con día extra de recuperación activa.",
    startDate: null,
  };
}

function buildNutritionTemplate(
  params: z.infer<typeof aiNutritionSchema>
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
          description: "Desayuno mediterráneo sencillo con proteína moderada.",
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
    message: "Hola {name}, recuerda que la constancia gana a la intensidad. ¡Haz algo hoy!",
  };
}

function buildTrainingPrompt(data: z.infer<typeof aiTrainingSchema>, strict = false, exerciseCatalogPrompt = "") {
  const secondaryGoals = data.goals?.length ? data.goals.join(", ") : "no especificados";
  const cardio = typeof data.includeCardio === "boolean" ? (data.includeCardio ? "sí" : "no") : "no especificado";
  const mobility =
    typeof data.includeMobilityWarmups === "boolean" ? (data.includeMobilityWarmups ? "sí" : "no") : "no especificado";
  const workoutLength = data.workoutLength ?? "flexible";
  const timerSound = data.timerSound ?? "no especificado";
  const injuries = data.injuries?.trim() || "ninguna";
  const daysCount = Math.min(data.daysCount ?? data.daysPerWeek, 14);
  return [
    "Eres un entrenador personal senior. Devuelve SOLO un objeto JSON válido, sin markdown ni texto extra.",
    "Esquema exacto:",
    '{"title":string,"startDate":string|null,"notes":string|null,"days":[{"date":string|null,"label":string,"focus":string,"duration":number,"exercises":[{"exerciseId":string,"name":string,"sets":number,"reps":string|null,"tempo":string|null,"rest":number|null,"notes":string|null}]}]}',
    "Usa ejercicios reales acordes al equipo disponible. No incluyas máquinas si el equipo es solo en casa.",
    exerciseCatalogPrompt
      ? `OBLIGATORIO: para CADA ejercicio debes elegir un exerciseId de esta biblioteca, sin excepciones. No inventes IDs, no dejes null. Biblioteca (id: nombre): ${exerciseCatalogPrompt}`
      : "",
    "OBLIGATORIO: days.length debe ser EXACTAMENTE el número solicitado (si >7 usa 7).",
    "Máximo 7 días, máximo 5 ejercicios por día, mínimo 3 ejercicios por día.",
    strict ? "REINTENTO: si devuelves menos o más días, la respuesta será rechazada." : "",
    "Respeta el nivel del usuario:",
    "- principiante: ejercicios básicos y seguros, 3-4 ejercicios por sesión, 30-50 minutos.",
    "- intermedio/avanzado: 4-5 ejercicios por sesión, básicos multiarticulares, 40-60 minutos.",
    "Evita volúmenes absurdos y mantén descansos coherentes.",
    `Perfil: Edad ${data.age}, sexo ${data.sex}, nivel ${data.level}, objetivo ${data.goal}.`,
    `Objetivos secundarios: ${secondaryGoals}. Cardio incluido: ${cardio}. Movilidad/warm-ups: ${mobility}.`,
    `Duración preferida por sesión: ${workoutLength}. Sonido del timer: ${timerSound}.`,
    `Días/semana ${data.daysPerWeek}, enfoque ${data.focus}, equipo ${data.equipment}.`,
    `Tiempo disponible por sesión ${data.timeAvailableMinutes} min. Restricciones/lesiones: ${
      data.restrictions ?? injuries
    }.`,
    "Estructura según el enfoque:",
    "- full: cuerpo completo cada día.",
    "- upperLower: alterna upper/lower empezando por upper.",
    "- ppl: rota push, pull, legs en orden.",
    "Usa days.length = días por semana (límite 7). label en español consistente (ej: \"Día 1\", \"Día 2\").",
    `Asigna date (YYYY-MM-DD) iniciando en ${data.startDate ?? "la fecha indicada"} y distribuye ${data.daysPerWeek} sesiones dentro de ${daysCount} días.`,
    "En cada día incluye duration en minutos (number).",
    "En cada ejercicio incluye exerciseId (string obligatorio y existente en biblioteca), name (español), sets (number) y reps (string). tempo/rest/notes solo si son cortos.",
    "Ejemplo EXACTO de JSON (solo ejemplo, respeta tipos y campos):",
    '{"title":"Plan semanal compacto","startDate":"2024-01-01","notes":"Enfoque simple.","days":[{"date":"2024-01-01","label":"Día 1","focus":"Full body","duration":45,"exercises":[{"exerciseId":"ex_001","name":"Sentadilla","sets":3,"reps":"8-10"},{"exerciseId":"ex_002","name":"Press banca","sets":3,"reps":"8-10"},{"exerciseId":"ex_003","name":"Remo con barra","sets":3,"reps":"8-10"}]}]}',
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
  const lines = recipes.map((recipe) => {
    return `- [${recipe.id}] ${recipe.name}: ${recipe.description ?? "Sin descripción"}. Macros base ${Math.round(
      recipe.calories
    )} kcal, P${Math.round(recipe.protein)} C${Math.round(recipe.carbs)} G${Math.round(recipe.fat)}.`;
  });
  return lines.join(" ");
}

function roundToNearest5(value: number) {
  return Math.round(value / 5) * 5;
}

type RecipeDbItem = {
  id: string;
  name: string;
  description: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  steps: string[];
  ingredients: Array<{ name: string; grams: number }>;
};

type RecipeSeedItem = Omit<RecipeDbItem, "id">;

function toNutritionRecipeCatalog(recipes: RecipeDbItem[]): NutritionRecipeCatalogItem[] {
  return recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    ingredients: recipe.ingredients.map((ingredient: { name: string; grams: number }) => ({
      name: ingredient.name,
      grams: ingredient.grams,
    })),
  }));
}

function applyNutritionCatalogResolution(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  recipes: RecipeDbItem[]
): z.infer<typeof aiNutritionPlanResponseSchema> {
  const recipeCatalog = toNutritionRecipeCatalog(recipes);
  const resolved = resolveNutritionPlanRecipeIds(plan, recipeCatalog);
  if (!resolved.catalogAvailable) return plan;
  if (resolved.invalidMeals.length > 0) {
    app.log.warn(
      { invalidMeals: resolved.invalidMeals.slice(0, 10), invalidCount: resolved.invalidMeals.length },
      "nutrition plan contains invalid recipe IDs; fallback applied"
    );
  }
  const varietyGuard = applyNutritionPlanVarietyGuard(resolved.plan, recipeCatalog, ["lunch", "dinner"]);
  app.log.info(
    {
      uniqueRecipeIdsWeek: varietyGuard.uniqueRecipeIdsWeek,
      replacementsApplied: varietyGuard.replacements,
      hadEnoughUniqueRecipes: varietyGuard.hadEnoughUniqueRecipes,
      catalogSize: recipeCatalog.length,
    },
    "variety_guard_summary"
  );
  return varietyGuard.plan as z.infer<typeof aiNutritionPlanResponseSchema>;
}

function applyRecipeScalingToPlan(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  recipes: RecipeDbItem[]
) {
  if (!recipes.length) return plan;
  const recipeMap = new Map(recipes.map((recipe) => [recipe.name.toLowerCase(), recipe]));
  const recipeMapById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  plan.days.forEach((day) => {
    day.meals.forEach((meal) => {
      const recipe = (meal.recipeId ? recipeMapById.get(meal.recipeId) : undefined) ?? recipeMap.get(meal.title.toLowerCase());
      if (!recipe) return;
      const baseCalories = recipe.calories;
      const targetCalories = meal.macros?.calories ?? baseCalories;
      if (!baseCalories || !targetCalories || !Number.isFinite(targetCalories)) return;
      const scale = targetCalories / baseCalories;
      const scaledIngredients = recipe.ingredients.map((ingredient: { name: string; grams: number }) => ({
        name: ingredient.name,
        grams: roundToNearest5(ingredient.grams * scale),
      }));
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
  userId: string,
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  startDate: Date,
  daysCount: number
) {
  const persistNutritionPlan = async (preferUpdate: boolean) =>
    prisma.$transaction(
      async (tx) => {
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
            "nutrition plan persistence retry without existing record, attempting create"
          );
        }
        planRecord = await tx.nutritionPlan.create({ data: planData, select: { id: true } });
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
        "nutrition plan persistence mode"
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
        day.meals.map(({ ingredients, ...meal }) => meal)
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
          })),
        });
      }

      const ingredientPayloads = dayPayloads.flatMap((day) =>
        day.meals.flatMap((meal) => meal.ingredients)
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
      },
      { maxWait: 30000, timeout: 30000 }
    );

  try {
    return await persistNutritionPlan(false);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      app.log.info(
        {
          userId,
          prismaCode: error.code,
          target: Array.isArray((error.meta as { target?: unknown } | undefined)?.target)
            ? (error.meta as { target?: string[] }).target
            : (error.meta as { target?: unknown } | undefined)?.target,
          startDate: toIsoDateString(startDate),
          daysCount,
        },
        "nutrition plan unique conflict detected, retrying with update"
      );
      return persistNutritionPlan(true);
    }

    throw error;
  }
}

async function saveTrainingPlan(
  userId: string,
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  startDate: Date,
  daysCount: number,
  request: z.infer<typeof aiTrainingSchema>
) {
  const persistPlan = async () => {
    return prisma.$transaction(async (tx) => {
      const planData = {
        userId,
        title: plan.title,
        notes: plan.notes,
        goal: request.goal,
        level: request.level,
        daysPerWeek: request.daysPerWeek,
        focus: request.focus,
        equipment: request.equipment,
        startDate,
        daysCount,
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

      const persistenceMode: "create" | "update" = existingPlan ? "update" : "create";
      const planRecord = existingPlan
        ? await tx.trainingPlan.update({
            where: { id: existingPlan.id },
            data: {
              title: plan.title,
              notes: plan.notes,
              goal: request.goal,
              level: request.level,
              daysPerWeek: request.daysPerWeek,
              focus: request.focus,
              equipment: request.equipment,
            },
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
        "training plan persistence mode"
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
                imageUrl: typeof exercise.imageUrl === "string" ? exercise.imageUrl : null,
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
    });
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
            target: Array.isArray((typed.meta as { target?: unknown } | undefined)?.target)
              ? (typed.meta as { target?: string[] }).target
              : (typed.meta as { target?: unknown } | undefined)?.target,
            startDate: toIsoDateString(startDate),
            daysCount,
            attempt,
          },
          "training plan unique conflict detected, retrying persistence with a fresh transaction"
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
  retryFeedback?: string
) {
  const distribution =
    typeof data.mealDistribution === "string"
      ? data.mealDistribution
      : data.mealDistribution?.preset ?? "balanced";
  const distributionPercentages =
    typeof data.mealDistribution === "object" && data.mealDistribution?.percentages?.length
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
    strict ? "REINTENTO: si los meals por día no coinciden exactamente, la respuesta será rechazada." : "",
    recipeLibrary
      ? `OBLIGATORIO: usa solo recipes del catálogo con recipeId válido. No inventes recetas. Usa recipeId y title exactamente como en la biblioteca. Lista: ${recipeLibrary}`
      : "CATÁLOGO NO DISPONIBLE: responde con comidas simples sin recipeId inventados; se aplicará fallback controlado.",
    `Perfil: Edad ${data.age}, sexo ${data.sex}, objetivo ${data.goal}.`,
    `Calorías objetivo diarias: ${data.calories}. Comidas/día: ${data.mealsPerDay}.`,
    buildMealKcalGuidance(data.calories, data.mealsPerDay, NUTRITION_MATH_TOLERANCES.twoMealSplitKcalAbsolute),
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
    strict ? "REINTENTO OBLIGATORIO: corrige explícitamente incoherencias por comida y por día." : "",
    strict && retryFeedback ? `ERRORES DETECTADOS EN INTENTO PREVIO: ${retryFeedback}` : "",
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
      app.log.warn({ raw: error.raw, reason: error.message }, "ai response parse failed");
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
      app.log.warn({ rawPreview, reason: error.message }, "ai response parse failed (largest json)");
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
      app.log.warn({ rawPreview, reason: error.message }, "ai response parse failed (top-level json)");
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
  const indices = Array.from({ length: workoutDays }, (_, index) => Math.round(index * step));
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
  daysPerWeek: number
) {
  const indices = buildTrainingDayIndices(daysCount, plan.days.length || daysPerWeek);
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
  daysPerWeek: number
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


function assertTrainingMatchesRequest(plan: z.infer<typeof aiTrainingPlanResponseSchema>, expectedDays: number) {
  if (plan.days.length !== expectedDays) {
    if (process.env.NODE_ENV !== "production") {
      app.log.warn(
        { expectedDays, actualDays: plan.days.length, title: plan.title },
        "training plan days mismatch"
      );
    }
    throw createHttpError(502, "AI_PARSE_ERROR", { expectedDays, actualDays: plan.days.length });
  }
}

function normalizeNutritionPlanDays(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  startDate: Date,
  daysCount: number
): z.infer<typeof aiNutritionPlanResponseSchema> {
  const normalized = normalizeNutritionPlanDaysWithLabels(plan, startDate, daysCount);

  if (normalized.alignmentIssues.length > 0) {
    app.log.info(
      {
        mismatchedOrMissingDates: normalized.alignmentIssues.slice(0, 7),
        totalIssues: normalized.alignmentIssues.length,
      },
      "nutrition day/date alignment normalized"
    );
  }

  return normalized.plan;
}

function normalizeNutritionMealsPerDay(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  expectedMealsPerDay: number
): z.infer<typeof aiNutritionPlanResponseSchema> {
  if (expectedMealsPerDay <= 0) return plan;
  const days = plan.days.map((day) => {
    const baseMeals = day.meals.map((meal) => ({
      ...meal,
      macros: { ...meal.macros },
    ingredients: meal.ingredients ? meal.ingredients.map((ingredient) => ({ ...ingredient })) : null,

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
  ingredients: source.ingredients ? source.ingredients.map((ingredient) => ({ ...ingredient })) : null,

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
  stage: "before_normalize" | "after_normalize"
) {
  app.log.info(
    {
      expectedMealsPerDay,
      mealsPerDay: plan.days.map((day) => day.meals.length),
      title: plan.title,
      stage,
    },
    "nutrition plan meals per day"
  );
}

function roundNutritionGrams(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeNutritionCaloriesPerDay(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  targetKcal: number
): z.infer<typeof aiNutritionPlanResponseSchema> {
  const days = plan.days.map((day) => {
    const meals = day.meals.map((meal) => ({
      ...meal,
      macros: { ...meal.macros },
      ingredients: meal.ingredients ? meal.ingredients.map((ingredient) => ({ ...ingredient })) : null,
    }));

    if (meals.length === 0) {
      return { ...day, meals };
    }

    const totalCalories = meals.reduce((acc, meal) => acc + Math.max(0, meal.macros.calories), 0);
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

      const share = totalCalories > 0 ? Math.max(0, meal.macros.calories) / totalCalories : fallbackShare;
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
  macroTargets?: z.infer<typeof aiGenerateNutritionSchema>["macroTargets"] | null
): z.infer<typeof aiNutritionPlanResponseSchema> {
  if (!macroTargets) return plan;

  const days = plan.days.map((day) => {
    const meals = day.meals.map((meal) => ({
      ...meal,
      macros: { ...meal.macros },
      ingredients: meal.ingredients ? meal.ingredients.map((ingredient) => ({ ...ingredient })) : null,
    }));

    if (meals.length === 0) {
      return { ...day, meals };
    }

    const totalCalories = meals.reduce((acc, meal) => acc + Math.max(0, meal.macros.calories), 0);
    const fallbackShare = 1 / meals.length;
    let assignedProtein = 0;
    let assignedCarbs = 0;
    let assignedFats = 0;

    const normalizedMeals = meals.map((meal, index) => {
      if (index === meals.length - 1) {
        const protein = roundNutritionGrams(macroTargets.proteinG - assignedProtein);
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

      const share = totalCalories > 0 ? Math.max(0, meal.macros.calories) / totalCalories : fallbackShare;
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

function parseNutritionPlanPayload(payload: Record<string, unknown>, startDate: Date, daysCount: number) {
  try {
    return normalizeNutritionPlanDays(aiNutritionPlanResponseSchema.parse(payload), startDate, daysCount);
  } catch (error) {
    app.log.warn({ err: error, payload }, "ai nutrition response invalid");
    throw createHttpError(400, "INVALID_AI_OUTPUT", {
      reasonCode: "SCHEMA_PARSE",
      details: {
        parserError: error instanceof z.ZodError ? error.flatten() : String(error),
      },
    });
  }
}

function assertNutritionMatchesRequest(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  expectedMealsPerDay: number,
  expectedDays: number
) {
  if (plan.days.length !== expectedDays) {
    if (process.env.NODE_ENV !== "production") {
      app.log.warn(
        { expectedDays, actualDays: plan.days.length, title: plan.title },
        "nutrition plan days mismatch"
      );
    }
    throw createHttpError(400, "INVALID_AI_OUTPUT", {
      reasonCode: "MISSING_FIELDS",
      details: { expectedDays, actualDays: plan.days.length },
    });
  }
  const invalid = plan.days.find((day) => day.meals.length !== expectedMealsPerDay);
  if (invalid) {
    if (process.env.NODE_ENV !== "production") {
      app.log.warn(
        {
          expectedMealsPerDay,
          actualMealsPerDay: invalid.meals.length,
          dayLabel: invalid.dayLabel,
        },
        "nutrition plan meals mismatch"
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
  const typed = error as { debug?: Record<string, unknown>; code?: string; message?: string };
  const reason = typed.debug?.reason;
  if (typed.debug?.reasonCode && typed.debug?.details) {
    return {
      cause: "INVALID_AI_OUTPUT",
      reasonCode: typed.debug.reasonCode,
      details: typed.debug.details,
    };
  }
  if (reason === "MEALS_PER_DAY_MISMATCH" || reason === "DAY_COUNT_MISMATCH") {
    return { cause: "INVALID_AI_OUTPUT", reasonCode: "MISSING_FIELDS", details: typed.debug ?? {} };
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
    details: typed.debug ?? { message: typed.message ?? "Unknown validation error" },
  };
}

function summarizeNutritionMath(plan: z.infer<typeof aiNutritionPlanResponseSchema>) {
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
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
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
  return [targetedInstruction, genericFeedback].filter((item) => item.length > 0).join(" ");
}

function assertNutritionRequestMapping(
  payload: z.infer<typeof aiGenerateNutritionSchema>,
  nutritionInput: z.infer<typeof aiNutritionSchema>,
  expectedDaysCount: number
) {
  const mismatches: Record<string, unknown> = {};
  if (payload.startDate && nutritionInput.startDate !== payload.startDate) {
    mismatches.startDate = { expected: payload.startDate, actual: nutritionInput.startDate };
  }
  if (nutritionInput.daysCount !== expectedDaysCount) {
    mismatches.daysCount = { expected: expectedDaysCount, actual: nutritionInput.daysCount };
  }
  if (payload.dietType && nutritionInput.dietType !== payload.dietType) {
    mismatches.dietType = { expected: payload.dietType, actual: nutritionInput.dietType };
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
  experienceLevel: z.infer<typeof aiGenerateTrainingSchema>["experienceLevel"]
) {
  const minExercises = experienceLevel === "advanced" ? 4 : 3;
  const maxExercises = experienceLevel === "beginner" ? 4 : 5;
  for (const day of plan.days) {
    if (day.exercises.length < minExercises || day.exercises.length > maxExercises) {
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
  seafood: ["atun", "atún", "salmón", "salmon", "merluza", "bacalao", "camar", "gamba", "langost"],
  dairyOrEgg: ["huevo", "huevos", "queso", "leche", "yogur", "yogurt"],
};

function assertDietaryPreferenceCompliance(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  dietaryPref: z.infer<typeof aiGenerateNutritionSchema>["dietaryPrefs"]
) {
  if (!dietaryPref) return;
  for (const day of plan.days) {
    for (const meal of day.meals) {
      const ingredientsText = (meal.ingredients ?? []).map((ingredient) => ingredient.name).join(" ");
      const haystack = `${meal.title} ${meal.description ?? ""} ${ingredientsText}`.toLowerCase();
      const hasMeat = animalKeywords.meat.some((keyword) => haystack.includes(keyword));
      const hasSeafood = animalKeywords.seafood.some((keyword) => haystack.includes(keyword));
      const hasDairyOrEgg = animalKeywords.dairyOrEgg.some((keyword) => haystack.includes(keyword));

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
  constraints: z.infer<typeof aiGenerateNutritionSchema>
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


function summarizeTrainingPlan(plan: z.infer<typeof aiTrainingPlanResponseSchema>) {
  return {
    title: plan.title,
    totalDays: plan.days.length,
    totalExercises: plan.days.reduce((acc, day) => acc + day.exercises.length, 0),
    dailyFocus: plan.days.map((day) => ({ label: day.label, focus: day.focus, exercises: day.exercises.length })),
  };
}

function summarizeNutritionPlan(plan: z.infer<typeof aiNutritionPlanResponseSchema>) {
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


function formatExerciseCatalogForPrompt(catalog: ExerciseCatalogItem[], limit = 120) {
  if (!catalog.length) return "";
  return catalog
    .slice(0, limit)
    .map((item) => `${item.id}: ${item.name}`)
    .join(" | ");
}

function ensureTrainingPlanUsesCatalogExerciseIds(
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  catalog: ExerciseCatalogItem[]
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
  catalog: ExerciseCatalogItem[]
) {
  ensureTrainingPlanUsesCatalogExerciseIds(plan, catalog);
  const { plan: resolvedPlan, unresolved } = resolveTrainingPlanExerciseIdsWithCatalog(plan, catalog);

  if (unresolved.length > 0) {
    throw createHttpError(400, "INVALID_AI_OUTPUT", {
      message: "Generated plan includes exercises that do not exist in the library.",
      unresolvedExercises: unresolved,
    });
  }

  return resolvedPlan;
}

function resolveTrainingPlanWithDeterministicFallback(
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  catalog: ExerciseCatalogItem[],
  input: Pick<z.infer<typeof aiTrainingSchema>, "daysPerWeek" | "level" | "goal" | "equipment">,
  startDate: Date,
  logContext: { userId: string; route: string }
) {
  try {
    return resolveTrainingPlanExerciseIds(plan, catalog);
  } catch (error) {
    const typed = error as { code?: string };
    if (typed.code !== "INVALID_AI_OUTPUT") {
      throw error;
    }

    app.log.warn(
      { userId: logContext.userId, route: logContext.route, cause: "invalid_catalog_exercise_id" },
      "training plan has invalid exercise ids, using deterministic fallback"
    );

    const fallbackPlan = buildDeterministicTrainingFallbackPlan(
      {
        daysPerWeek: input.daysPerWeek,
        level: input.level,
        goal: input.goal,
        startDate,
        equipment: input.equipment,
      },
      catalog
    );

    return resolveTrainingPlanExerciseIds(fallbackPlan, catalog);
  }
}

function normalizePlanForExerciseResolution(plan: Record<string, unknown>) {
  const rawDays = Array.isArray((plan as { days?: unknown }).days) ? ((plan as { days: unknown[] }).days ?? []) : [];

  return {
    ...plan,
    days: rawDays.map((day, dayIndex) => {
      const typedDay = (day ?? {}) as {
        label?: unknown;
        exercises?: unknown;
      };
      const rawExercises = Array.isArray(typedDay.exercises) ? typedDay.exercises : [];

      return {
        ...(typedDay as Record<string, unknown>),
        label: typeof typedDay.label === "string" ? typedDay.label : `Day ${dayIndex + 1}`,
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
            exerciseId: typeof typedExercise.exerciseId === "string" ? typedExercise.exerciseId : null,
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

function serializeTrainingPlanDaysWithNullableExerciseId(plan: Record<string, unknown>) {
  const rawDays = Array.isArray((plan as { days?: unknown }).days) ? ((plan as { days: unknown[] }).days ?? []) : null;

  if (!rawDays) {
    return plan;
  }

  return {
    ...plan,
    days: rawDays.map((day) => {
      const typedDay = (day ?? {}) as {
        exercises?: unknown;
      };
      const rawExercises = Array.isArray(typedDay.exercises) ? typedDay.exercises : [];

      return {
        ...(typedDay as Record<string, unknown>),
        exercises: rawExercises.map((exercise) => {
          const typedExercise = (exercise ?? {}) as {
            exerciseId?: unknown;
          };

          return {
            ...(typedExercise as Record<string, unknown>),
            exerciseId: typeof typedExercise.exerciseId === "string" ? typedExercise.exerciseId : null,
          };
        }),
      };
    }),
  };
}

async function enrichTrainingPlanWithExerciseLibraryData(plan: Record<string, unknown>) {
  if (!plan || !Array.isArray((plan as { days?: unknown }).days)) {
    return plan;
  }

  const catalog = await fetchExerciseCatalog(prisma);
  const normalizedPlan = normalizePlanForExerciseResolution(plan);
  const { plan: resolvedPlan } = resolveTrainingPlanExerciseIdsWithCatalog(normalizedPlan, catalog);

  return serializeTrainingPlanDaysWithNullableExerciseId(resolvedPlan);
}

function logTrainingPlanUnexpectedError(request: FastifyRequest, error: unknown, context: string) {
  request.log.error(
    {
      reqId: request.id,
      err: error,
    },
    context
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
  return typeof (prisma as PrismaClient & { exercise?: unknown }).exercise !== "undefined";
}

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function upsertExerciseRecord(name: string, metadata?: ExerciseMetadata, options?: { source?: string; sourceId?: string; imageUrls?: string[] }) {
  const now = new Date();
  const slug = slugifyName(name);

  const mainMuscleGroup =
    metadata?.mainMuscleGroup?.trim() ||
    (metadata?.primaryMuscles && metadata.primaryMuscles.length > 0 ? metadata.primaryMuscles[0] : "General");

  const secondaryMuscleGroups = metadata?.secondaryMuscleGroups ?? metadata?.secondaryMuscles ?? [];

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
      Prisma.sql`("mainMuscleGroup" = ${params.primaryMuscle} OR "secondaryMuscleGroups" @> ARRAY[${params.primaryMuscle}]::text[])`
    );
  }

  const whereClause =
    filters.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")
}`
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
        })
      ),
      total,
    };
  }

  const whereSql = buildExerciseFilters(params);
  const take = params.take ?? params.limit;
  const hasFilters = Boolean(params.q || (params.equipment && params.equipment !== "all") || (params.primaryMuscle && params.primaryMuscle !== "all"));

  const items = await prisma.$queryRaw<ExerciseRow[]>(Prisma.sql`
    SELECT "id", "sourceId", "slug", "name", "equipment", "mainMuscleGroup", "secondaryMuscleGroups", "description", "imageUrls", "imageUrl", "mediaUrl", "technique", "tips", "createdAt", "updatedAt"
    FROM "Exercise"
    ${whereSql}
    ${params.cursor
      ? hasFilters
        ? Prisma.sql`AND "id" > ${params.cursor}`
        : Prisma.sql`WHERE "id" > ${params.cursor}`
      : Prisma.sql``}
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
  const total = typeof rawCount === "bigint" ? Number(rawCount) : Number(rawCount);
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
        .filter((muscle) => muscle.length > 0)
    )
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

async function upsertExercisesFromPlan(plan: z.infer<typeof aiTrainingPlanResponseSchema>) {
  if (!hasExerciseClient()) {
    app.log.warn("prisma.exercise is unavailable, using raw upsert fallback");
  }
  const names = new Map<string, string>();
  plan.days.forEach((day) => {
    day.exercises.forEach((exercise) => {
      try {
        if (!exercise?.name) {
          app.log.warn({ day: day.label, exercise }, "skipping exercise upsert because name is missing");
          return;
        }
        const normalized = normalizeExerciseName(exercise.name);
        if (!normalized) {
          app.log.warn({ day: day.label, name: exercise.name }, "skipping exercise upsert because normalized name is empty");
          return;
        }
        if (!names.has(normalized)) {
          names.set(normalized, normalized);
        }
      } catch (error) {
        app.log.warn({ err: error, day: day.label, exercise }, "failed to normalize exercise for upsert");
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
    })
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
    if (lower.includes("máquina") || lower.includes("maquina")) return pick("Máquina");
    if (lower.includes("polea")) return pick("Polea");
    if (lower.includes("kettlebell")) return pick("Kettlebell");
    if (lower.includes("cinta")) return pick("Cinta");
    if (lower.includes("bicicleta")) return pick("Bicicleta");
    if (lower.includes("ergómetro") || lower.includes("ergometro")) return pick("Remo ergómetro");
    if (lower.includes("elíptica") || lower.includes("eliptica")) return pick("Elíptica");
    if (lower.includes("fitball")) return pick("Fitball");
    if (lower.includes("banco")) return pick("Banco");
    if (lower.includes("paralelas")) return pick("Paralelas");
    if (lower.includes("cajón") || lower.includes("cajon")) return pick("Cajón");
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
    if (lower.includes("press banca") || lower.includes("peck deck") || lower.includes("pecho") || lower.includes("fondos") || lower.includes("flexiones")) {
      return "Pecho";
    }
    if (lower.includes("press militar") || lower.includes("hombro") || lower.includes("arnold") || lower.includes("elevaciones") || lower.includes("rear delt") || lower.includes("pájaros") || lower.includes("face pull")) {
      return "Hombros";
    }
    if (lower.includes("remo") || lower.includes("jalón") || lower.includes("dominadas") || lower.includes("pull-over") || lower.includes("rack pull")) {
      return "Espalda";
    }
    if (lower.includes("bíceps") || lower.includes("biceps") || lower.includes("curl")) {
      return "Bíceps";
    }
    if (lower.includes("tríceps") || lower.includes("triceps") || lower.includes("press francés") || lower.includes("jalón de tríceps") || lower.includes("patada")) {
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

const RECIPES_100 = [
  "Salmón con patata y verduras al horno",
  "Pollo a la plancha con arroz integral y ensalada",
  "Ternera magra salteada con pimientos y quinoa",
  "Merluza en papillote con calabacín y limón",
  "Atún a la plancha con boniato y brócoli",
  "Pechuga de pavo al curry con arroz basmati integral",
  "Albóndigas de pavo en salsa de tomate casera con espagueti de calabacín",
  "Tortilla de claras con espinacas y queso fresco",
  "Yogur griego con avena, frutos rojos y nueces",
  "Overnight oats de cacao y plátano",
  "Tostadas integrales con aguacate y huevo poché",
  "Shakshuka ligera con huevos y verduras",
  "Ensalada mediterránea de garbanzos con atún",
  "Bowl de lentejas con verduras asadas y feta",
  "Chili de pavo con alubias y arroz",
  "Burrito bowl de pollo con frijoles y pico de gallo",
  "Tacos de pescado con col y salsa de yogur",
  "Wrap integral de pollo, hummus y verduras",
  "Sandwich proteico de pavo y queso cottage",
  "Crema de calabaza con jengibre y topping de semillas",
  "Sopa miso con tofu, setas y espinacas",
  "Salteado asiático de pollo con verduras y noodles de konjac",
  "Wok de gambas con verduras y arroz jazmín integral",
  "Paella fitness de marisco con arroz",
  "Arroz al horno con pollo y verduras (light)",
  "Poke bowl de salmón, arroz y edamame",
  "Poke bowl de atún, quinoa y mango",
  "Ensalada César ligera con pollo y yogur",
  "Ensalada de quinoa con pepino, tomate y pollo",
  "Ensalada templada de espárragos y huevo",
  "Pasta integral con boloñesa de pavo",
  "Pasta de lentejas con pesto de albahaca y pollo",
  "Pizza de base de coliflor con pollo y verduras",
  "Hamburguesa de ternera magra con ensalada y patata al aire",
  "Hamburguesa de salmón con ensalada de col",
  "Nuggets de pollo al horno con salsa de yogur",
  "Pechuga de pollo rellena de espinacas y ricotta",
  "Bacalao a la vizcaína ligero con patata cocida",
  "Lubina al horno con verduras y aceite de oliva",
  "Pollo tikka masala light con arroz integral",
  "Curry rojo de gambas con coco light y verduras",
  "Tofu crujiente al horno con teriyaki light y arroz",
  "Tempeh salteado con brócoli y sésamo",
  "Ensalada caprese con pollo y pesto ligero",
  "Omelette de champiñones y jamón serrano magro",
  "Revuelto de huevo con salmón ahumado y espárragos",
  "Porridge de avena con canela y manzana",
  "Pudín de chía con yogur y frutas",
  "Batido proteico de café y cacao",
  "Smoothie bowl de frutos rojos y proteína",
  "Edamame con sal y limón",
  "Hummus casero con palitos de zanahoria",
  "Guacamole con crudités y tortilla integral",
  "Queso cottage con piña y canela",
  "Skyr con miel y almendras (controlado)",
  "Barritas caseras de avena y proteína",
  "Tortitas de avena y claras con arándanos",
  "Tortitas de plátano y huevo",
  "Pan de plátano proteico (sin azúcar añadido)",
  "Yogur helado de skyr con frutos rojos",
  "Ensalada de pasta integral con atún y maíz",
  "Ensalada de arroz integral con pollo y verduras",
  "Salpicón de marisco con aguacate",
  "Ceviche de pescado blanco con boniato",
  "Gazpacho con topping de huevo duro",
  "Salmorejo ligero con jamón y huevo",
  "Crema de verduras verde con topping proteico",
  "Estofado de ternera magra con verduras",
  "Estofado de garbanzos con espinacas y bacalao",
  "Lentejas estofadas con verduras y pavo",
  "Potaje de alubias con verduras y atún",
  "Arroz integral con pollo al limón",
  "Pollo al ajillo con patata y judías verdes",
  "Pavo al horno con especias y verduras",
  "Conejo al horno con romero y patata",
  "Fajitas de pollo con pimientos y tortillas integrales",
  "Fajitas de ternera con verduras y guacamole",
  "Sándwich de atún con yogur y pepinillos",
  "Ensalada de espinacas con fresas, pollo y nueces",
  "Ensalada de rúcula con pera, jamón magro y parmesano",
  "Bowl de yogur con granola proteica casera",
  "Bowl de quinoa con huevo, aguacate y verduras",
  "Quinoa con salmón y salsa de yogur al eneldo",
  "Bacalao al horno con garbanzos y espinacas",
  "Tortilla española ligera",
  "Calamares a la plancha con ensalada",
  "Pulpo a la gallega light con patata y pimentón",
  "Sushi bowl de pollo teriyaki light",
  "Sushi bowl de salmón y pepino",
  "Pez espada a la plancha con ensalada griega",
  "Pollo estilo shawarma con ensalada y tzatziki",
  "Kebab bowl de pavo con arroz y verduras",
  "Crepes integrales rellenos de pollo y espinacas",
  "Crepes de avena rellenos de queso fresco y frutos rojos",
  "Arroz con leche proteico (skyr y canela)",
  "Macedonia de frutas con yogur y proteína",
  "Patata asada rellena de atún y yogur",
  "Boniato asado relleno de pollo y verduras",
  "Sopa de pollo con verduras y fideos integrales",
  "Bowl de pollo, verduras y salsa de cacahuete light",
];

const recipeMacroTemplates: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {
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

const recipeIngredientTemplates: Record<string, Array<{ name: string; grams: number }>> = {
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
  if (lower.includes("gambas") || lower.includes("marisco") || lower.includes("paella")) {
    return "seafood";
  }
  if (lower.includes("pollo") || lower.includes("pavo") || lower.includes("shawarma") || lower.includes("kebab")) {
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
  if (lower.includes("sopa") || lower.includes("crema") || lower.includes("gazpacho") || lower.includes("salmorejo")) {
    return "soup";
  }
  if (lower.includes("pasta") || lower.includes("noodles") || lower.includes("espagueti")) {
    return "pasta";
  }
  if (lower.includes("arroz") || lower.includes("poke") || lower.includes("bowl")) {
    return "rice";
  }
  if (lower.includes("wrap") || lower.includes("tacos") || lower.includes("fajitas") || lower.includes("sandwich") || lower.includes("sándwich")) {
    return "wrap";
  }
  return "other";
}

function buildRecipeSeedItem(name: string, index: number): RecipeSeedItem {
  const category = categorizeRecipe(name);
  const base = recipeMacroTemplates[category] ?? recipeMacroTemplates.other;
  const variant = index % 4;
  const calories = base.calories + variant * 20;
  const protein = base.protein + variant * 2;
  const carbs = base.carbs + variant * 3;
  const fat = base.fat + variant;
  const ingredientsBase = recipeIngredientTemplates[category] ?? recipeIngredientTemplates.other;
  const ingredientCount = 3 + (index % 3);
  const ingredients = ingredientsBase.slice(0, ingredientCount);
  const steps = [
    "Preparar y pesar los ingredientes.",
    "Cocinar la proteína con especias suaves.",
    "Preparar el acompañamiento o verduras.",
    "Emplatar y ajustar sal y aceite de oliva.",
  ];
  return {
    name,
    description: `Receta ${category} fácil y equilibrada.`,
    calories,
    protein,
    carbs,
    fat,
    steps: steps.slice(0, 3 + (index % 2)),
    ingredients,
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

function getRecentEntries<T extends { date?: string }>(entries: T[], days: number) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);
  return entries.filter((entry) => {
    const date = toDate(entry.date);
    return date ? date >= cutoff : false;
  });
}

function buildFeedSummary(profile: Record<string, unknown> | null, tracking: FeedTrackingSnapshot | null) {
  const name = typeof profile?.name === "string" ? profile.name : "tu";
  const normalizedTracking: FeedTrackingSnapshot = tracking ?? {};
  const checkins = Array.isArray(normalizedTracking.checkins) ? normalizedTracking.checkins : [];
  const foodLog = Array.isArray(normalizedTracking.foodLog) ? normalizedTracking.foodLog : [];
  const workoutLog = Array.isArray(normalizedTracking.workoutLog) ? normalizedTracking.workoutLog : [];

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

async function sendVerificationEmail(email: string, token: string, name?: string | null) {
  const verifyUrl = new URL("/verify-email", env.APP_BASE_URL);
  verifyUrl.searchParams.set("token", token);

  const { subject, text, html } = buildVerifyEmail({
    name: name ?? null,
    verifyUrl: verifyUrl.toString(),
  });

  await sendEmail({ to: email, subject, text, html });
}



async function logSignupAttempt(data: { email?: string; ipAddress?: string; success: boolean }) {
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
  const user = await prisma.user.findUnique({ where: { email: env.ADMIN_EMAIL_SEED } });
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

  if (!isPromoCodeValid(data.promoCode)) {
    await logSignupAttempt({ email: data.email, ipAddress, success: false });
    return reply.status(403).send({ error: "INVALID_PROMO_CODE" });
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return reply.status(409).send({ error: "EMAIL_IN_USE" });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name?.trim() ? data.name : null,
      provider: "email",
    },
  });

  await logSignupAttempt({ email: data.email, ipAddress, success: true });

  const token = await createVerificationToken(user.id);
  await sendVerificationEmail(user.email, token);

  return reply.status(201).send({ id: user.id, email: user.email, name: user.name });
}

app.post("/auth/signup", handleSignup);
app.post("/auth/register", handleSignup);

app.post("/auth/login", async (request, reply) => {
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

    const token = await reply.jwtSign({ sub: user.id, email: user.email, role: user.role });
    reply.setCookie("fs_token", token, buildCookieOptions());

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { id: user.id, email: user.email, name: user.name };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/auth/logout", async (_request, reply) => {
  reply.clearCookie("fs_token", { path: "/" });
  return { ok: true };
});

app.post("/auth/resend-verification", async (request, reply) => {
  const schema = z.object({ email: z.string().email() });
  try {
    const { email } = schema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) {
      return reply.status(200).send({ ok: true });
    }
    if (user.emailVerifiedAt) {
      return reply.status(200).send({ ok: true });
    }

    const latestToken = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (latestToken && Date.now() - latestToken.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      return reply.status(429).send({ error: "RESEND_TOO_SOON" });
    }

    const token = await createVerificationToken(user.id);
    await sendVerificationEmail(user.email, token);

    return reply.status(200).send({ ok: true });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/auth/verify-email", async (request, reply) => {
  const schema = z.object({ token: z.string().min(1) });
  try {
    const { token } = schema.parse(request.query);
    const tokenHash = hashToken(token);
    const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!record) {
      return reply.status(400).send({ error: "INVALID_TOKEN" });
    }
    if (record.expiresAt.getTime() < Date.now()) {
      await prisma.emailVerificationToken.delete({ where: { id: record.id } });
      return reply.status(400).send({ error: "TOKEN_EXPIRED" });
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });

    await prisma.emailVerificationToken.delete({ where: { id: record.id } });

    return reply.status(200).send({ ok: true });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/billing/checkout", async (request, reply) => {
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
    const resolvedPriceId = payload.priceId ?? resolvePriceIdByPlanKey(payload.planKey ?? "");
    if (!resolvedPriceId) {
      return reply.status(400).send({ error: "INVALID_INPUT" });
    }
    const targetPlan = resolvePlanByPriceId(resolvedPriceId);
    if (!targetPlan) {
      return reply.status(400).send({ error: "INVALID_INPUT" });
    }

    const idempotencyKey = `checkout-${user.id}-${Date.now()}`;
    const customerId = await getOrCreateStripeCustomer(user);
    const hasSamePlanLocally = isActiveSubscriptionStatus(user.subscriptionStatus) && user.plan === targetPlan;

    const activeSubscriptions = await getActivePlanSubscriptions(customerId);
    const hasSamePlanInStripe = activeSubscriptions.some((subscription) => getPlanFromSubscription(subscription) === targetPlan);
    if (hasSamePlanInStripe) {
      let portalUrl: string | null = null;
      try {
        const session = await stripeRequest<StripePortalSession>("billing_portal/sessions", {
          customer: customerId,
          return_url: `${env.APP_BASE_URL}/app/settings/billing`,
        });
        portalUrl = session.url ?? null;
      } catch (error) {
        request.log.warn({ err: error, userId: user.id }, "billing portal session failed");
      }
      return reply.status(200).send({ alreadySubscribed: true, url: portalUrl });
    }

    if (hasSamePlanLocally) {
      request.log.info({ userId: user.id, targetPlan }, "billing checkout blocked due to active local plan");
      return reply.status(200).send({ alreadySubscribed: true });
    }

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
        success_url: `${env.APP_BASE_URL}/app/settings/billing?checkout=success`,
        cancel_url: `${env.APP_BASE_URL}/app/settings/billing?checkout=cancel`,
      },
      { idempotencyKey }
    );

    if (!session.url) {
      throw createHttpError(502, "STRIPE_CHECKOUT_URL_MISSING");
    }
    return reply.status(200).send({ url: session.url });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ error: "INVALID_INPUT" });
    }

    const typed = err as { statusCode?: number; code?: string; message?: string };
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
      "billing checkout failed"
    );
    return reply.status(500).send({ error: "CHECKOUT_SESSION_FAILED" });
  }
});

app.get("/billing/plans", async (request, reply) => {
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
        const stripePrice = await stripeRequest<StripePrice>(`prices/${priceId}`, {}, { method: "GET" });

        const amount = parseStripeAmount(stripePrice);
        if (amount === null) {
          warnings.push({ key: plan, reason: "invalid_unit_amount" });
          request.log.warn({ plan, priceId }, "billing plan skipped (invalid unit amount)");
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
          request.log.warn({ plan, priceId }, "billing plan skipped (price not found)");
          continue;
        }
        warnings.push({ key: plan, reason: "price_lookup_failed" });
        request.log.warn({ plan, priceId }, "billing plan skipped due to Stripe price lookup failure");
      }
    }

    if (plans.length > 0) {
      return reply.status(200).send({ plans, ...(warnings.length > 0 ? { warnings } : {}) });
    }
    return reply.status(500).send({ error: "NO_VALID_PRICES", ...(warnings.length > 0 ? { warnings } : {}) });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/billing/portal", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const customerId = await getOrCreateStripeCustomer(user);
    const session = await stripeRequest<StripePortalSession>("billing_portal/sessions", {
      customer: customerId,
      return_url: `${env.APP_BASE_URL}/app/settings/billing`,
    });
    return { url: session.url };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/billing/admin/reset-customer-link", async (request, reply) => {
  const schema = z.object({
    userId: z.string().min(1).optional(),
    email: z.string().email().optional(),
  }).refine((value) => value.userId || value.email, {
    message: "userId_or_email_required",
  });

  try {
    await requireAdmin(request);
    const { userId, email } = schema.parse(request.body);
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
      : await prisma.user.findFirst({ where: { email: email! }, select: { id: true } });

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
});

app.post(
  "/billing/stripe/webhook",
  { config: { rawBody: true } },
  async (request, reply) => {
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

      if (eventType === "checkout.session.completed") {
        const session = payload as {
          metadata?: Record<string, string> | null;
          client_reference_id?: string | null;
        };
        resolvedUserId = session?.metadata?.userId ?? session?.client_reference_id ?? null;
      }

      app.log.info(
        resolvedUserId ? { eventType, eventId, userId: resolvedUserId } : { eventType, eventId },
        "stripe webhook received"
      );

      if (eventType === "checkout.session.completed") {
        const session = payload as {
          customer?: string | null;
          subscription?: string | null;
          metadata?: Record<string, string> | null;
          client_reference_id?: string | null;
        };
        const userId = session?.metadata?.userId ?? session?.client_reference_id ?? null;
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
          app.log.info({ userId, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId }, "checkout linked");
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
          const activeSubscription = await getLatestActiveSubscription(customerId);
          const cancellationStatuses = new Set(["canceled", "unpaid", "incomplete_expired"]);
          if (activeSubscription) {
            const activePlan = getPlanFromSubscription(activeSubscription) ?? "FREE";
            const currentPeriodEnd = getSubscriptionPeriodEnd(activeSubscription);
            await updateUserSubscriptionForCustomer(customerId, {
              plan: activePlan,
              subscriptionStatus: activeSubscription.status,
              stripeSubscriptionId: activeSubscription.id,
              currentPeriodEnd,
            });
            app.log.info(
              {
                stripeCustomerId: customerId,
                plan: activePlan,
                subscriptionStatus: activeSubscription.status,
                currentPeriodEnd: currentPeriodEnd?.toISOString() ?? null,
              },
              "subscription updated"
            );
          } else if (eventType === "customer.subscription.deleted" || cancellationStatuses.has(subscription.status)) {
            const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
            await applyBillingStateForCustomer(customerId, {
              plan: "FREE",
              aiTokenBalance: 0,
              aiTokenResetAt: null,
              aiTokenRenewalAt: null,
              subscriptionStatus: subscription.status,
              stripeSubscriptionId: subscription.id,
              currentPeriodEnd,
            });
            app.log.info(
              {
                stripeCustomerId: customerId,
                plan: "FREE",
                aiTokenBalance: 0,
                aiTokenResetAt: null,
              },
              "subscription canceled"
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
            { method: "GET" }
          );
        }
        const invoicePlan = getPlanFromInvoice(fullInvoice);
        if (invoicePlan) {
          const customerId = fullInvoice.customer ?? null;
          const subscriptionId = fullInvoice.subscription ?? null;
          let subscription: StripeSubscription | null = null;
          if (subscriptionId) {
            subscription = await stripeRequest<StripeSubscription>(`subscriptions/${subscriptionId}`, {}, { method: "GET" });
          }
          const nextResetAt = getSubscriptionPeriodEnd(subscription) ?? getTokenExpiry(30);
          const nextRenewalAt = nextResetAt;
          if (customerId) {
            await applyBillingStateForCustomer(customerId, {
              plan: invoicePlan,
              aiTokenBalance: 5000,
              aiTokenResetAt: nextResetAt,
              aiTokenRenewalAt: nextRenewalAt,
              subscriptionStatus: subscription?.status ?? null,
              stripeSubscriptionId: subscriptionId,
              currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
            });
            app.log.info(
              {
                stripeCustomerId: customerId,
                plan: invoicePlan,
                aiTokenBalance: 5000,
                aiTokenResetAt: nextResetAt?.toISOString() ?? null,
              },
              "invoice paid"
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
            { method: "GET" }
          );
        }
        const invoicePlan = getPlanFromInvoice(fullInvoice);
        if (invoicePlan) {
          const customerId = fullInvoice.customer ?? null;
          if (customerId) {
            await applyBillingStateForCustomer(customerId, {
              plan: "FREE",
              aiTokenBalance: 0,
              aiTokenResetAt: null,
              aiTokenRenewalAt: null,
            });
            app.log.info(
              {
                stripeCustomerId: customerId,
                plan: "FREE",
                aiTokenBalance: 0,
                aiTokenResetAt: null,
              },
              "invoice payment failed"
            );
          }
        }
      }

      return reply.status(200).send({ received: true });
    } catch (error) {
      return handleRequestError(reply, error);
    }
  }
);

app.get("/auth/me", async (request, reply) => {
  try {
    reply.header("Cache-Control", "no-store");
    const user = await requireUser(request);
    let effectiveUser = user;
    try {
      const syncedUser = await syncUserBillingFromStripe(user, { createCustomerIfMissing: false });
      if (syncedUser) {
        effectiveUser = syncedUser;
      }
    } catch (error) {
      app.log.warn({ err: error, userId: user.id }, "auth/me billing sync failed");
    }
    const effectiveIsAdmin = effectiveUser.role === "ADMIN" || isBootstrapAdmin(effectiveUser.email);
    const activeMembershipRecord = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
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
    // /auth/me only exposes an *active* membership. We normalize the status
    // to the literal "ACTIVE" so it matches the response contract type.
    const activeMembership = activeMembershipRecord
      ? {
          ...activeMembershipRecord,
          status: "ACTIVE" as const,
        }
      : null;
    const entitlements = getUserEntitlements(effectiveUser);
    const aiTokenPayload = getAiTokenPayload(effectiveUser, entitlements);
    return buildAuthMeResponse({
      user: effectiveUser,
      role: effectiveIsAdmin ? "ADMIN" : effectiveUser.role,
      aiTokenBalance: aiTokenPayload.aiTokenBalance,
      aiTokenRenewalAt: aiTokenPayload.aiTokenRenewalAt,
      entitlements,
      activeMembership,
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

  return reply.status(200).send({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

app.get("/auth/google/callback", async (request, reply) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    return reply.status(501).send({ error: "GOOGLE_OAUTH_NOT_CONFIGURED" });
  }

const querySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  mode: z.enum(["bff"]).optional(),
});
const { code, state, mode } = querySchema.parse(request.query);


  const stateHash = hashToken(state);
  const storedState = await prisma.oAuthState.findUnique({ where: { stateHash } });
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

  const tokenJson = (await tokenResponse.json()) as { id_token?: string; access_token?: string };
  const idToken = tokenJson.id_token;
  if (!idToken) {
    return reply.status(400).send({ error: "GOOGLE_ID_TOKEN_MISSING" });
  }

  const infoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
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

const token = await reply.jwtSign({ sub: user.id, email: user.email, role: user.role });

if (mode === "bff") {
  return reply.status(200).send({ token });
}

reply.setCookie("fs_token", token, buildCookieOptions());
return reply.redirect(`${env.APP_BASE_URL}/app`, 302);

});


app.get("/profile", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const profile = await getOrCreateProfile(user.id);
    return profile.profile ?? null;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.put("/profile", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const data = profileUpdateSchema.parse(request.body);
    if (typeof data.name === "string") {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: data.name.trim() ? data.name : null },
      });
    }
    const current = await getOrCreateProfile(user.id);
    const existingProfile = (current.profile as Record<string, unknown> | null) ?? {};
    const existingMeasurements =
      typeof existingProfile.measurements === "object" && existingProfile.measurements
        ? (existingProfile.measurements as Record<string, unknown>)
        : {};
    const existingTraining =
      typeof existingProfile.trainingPreferences === "object" && existingProfile.trainingPreferences
        ? (existingProfile.trainingPreferences as Record<string, unknown>)
        : {};
    const existingNutrition =
      typeof existingProfile.nutritionPreferences === "object" && existingProfile.nutritionPreferences
        ? (existingProfile.nutritionPreferences as Record<string, unknown>)
        : {};
    const existingMacros =
      typeof existingProfile.macroPreferences === "object" && existingProfile.macroPreferences
        ? (existingProfile.macroPreferences as Record<string, unknown>)
        : {};
    const fallbackGoal =
      typeof existingProfile.goal === "string"
        ? existingProfile.goal
        : typeof existingTraining.goal === "string"
          ? existingTraining.goal
          : typeof existingNutrition.goal === "string"
            ? existingNutrition.goal
            : "maintain";

    const nextProfile = {
      ...existingProfile,
      ...data,
      goal: typeof data.goal === "string" ? data.goal : fallbackGoal,
      goals: Array.isArray(data.goals)
        ? data.goals
        : Array.isArray(existingProfile.goals)
          ? existingProfile.goals
          : defaultGoals,
      injuries:
        typeof data.injuries === "string"
          ? data.injuries
          : typeof existingProfile.injuries === "string"
            ? existingProfile.injuries
            : "",
      measurements: {
        ...existingMeasurements,
        ...data.measurements,
      },
      trainingPreferences: {
        ...defaultTrainingPreferences,
        ...existingTraining,
        ...data.trainingPreferences,
      },
      nutritionPreferences: {
        ...defaultNutritionPreferences,
        ...existingNutrition,
        ...data.nutritionPreferences,
        dislikedFoods:
          typeof data.nutritionPreferences?.dislikedFoods === "string"
            ? data.nutritionPreferences.dislikedFoods
            : typeof existingNutrition.dislikedFoods === "string"
              ? existingNutrition.dislikedFoods
              : typeof existingNutrition.dislikes === "string"
                ? existingNutrition.dislikes
                : "",
        mealDistribution: normalizeMealDistribution(
          data.nutritionPreferences?.mealDistribution ?? existingNutrition.mealDistribution
        ),
      },
      macroPreferences: {
        ...existingMacros,
        ...data.macroPreferences,
      },
    };
    if (nextProfile.trainingPreferences && typeof nextProfile.trainingPreferences === "object") {
      delete (nextProfile.trainingPreferences as Record<string, unknown>).goal;
    }
    if (nextProfile.nutritionPreferences && typeof nextProfile.nutritionPreferences === "object") {
      delete (nextProfile.nutritionPreferences as Record<string, unknown>).goal;
      delete (nextProfile.nutritionPreferences as Record<string, unknown>).dislikes;
    }
    const updated = await prisma.userProfile.update({
      where: { userId: user.id },
      data: { profile: nextProfile },
    });
    return updated.profile ?? null;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/billing/status", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const query = request.query as { sync?: string };
    let syncError: unknown = null;
    if (query?.sync === "1") {
      try {
        await syncUserBillingFromStripe(user);
      } catch (error) {
        syncError = error;
        app.log.warn({ err: error, userId: user.id }, "billing sync failed");
      }
    }
    const refreshedUser = query?.sync === "1" ? await prisma.user.findUnique({ where: { id: user.id } }) : user;
    if (!refreshedUser) {
      return reply.status(404).send({ error: "USER_NOT_FOUND" });
    }
    const rawPlan = refreshedUser.plan ?? "FREE";
    const subscriptionStatus = syncError ? null : refreshedUser.subscriptionStatus ?? null;
    const isActive = syncError ? false : isActiveSubscriptionStatus(subscriptionStatus);
    const tokenExpiryAt = getUserTokenExpiryAt(refreshedUser);
    const tokensExpired = tokenExpiryAt ? tokenExpiryAt.getTime() < Date.now() : false;
    const tokens = tokensExpired ? 0 : getEffectiveTokenBalance(refreshedUser);
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
      availablePlans,
    };
    app.log.info({ userId: refreshedUser.id, plan: response.plan, tokens: response.tokens }, "billing status");
    return reply.status(200).send(response);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/tracking", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const profile = await getOrCreateProfile(user.id);
    return profile.tracking ?? defaultTracking;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.put("/tracking", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const data = trackingSchema.parse(request.body);
    const updated = await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        profile: Prisma.DbNull,
        tracking: data,
      },
      update: {
        tracking: data,
      },
    });
    app.log.info(
      { userId: user.id, checkins: data.checkins.length, foodLog: data.foodLog.length, workoutLog: data.workoutLog.length },
      "tracking updated"
    );

    return updated.tracking ?? defaultTracking;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/tracking", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const payload = trackingEntryCreateSchema.parse(request.body);
    const profile = await getOrCreateProfile(user.id);
    const nextTracking = upsertTrackingEntry(profile.tracking, payload);

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const updated = await prisma.userProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            profile: Prisma.DbNull,
            tracking: nextTracking,
          },
          update: {
            tracking: nextTracking,
          },
        });

        return reply.status(201).send(normalizeTrackingSnapshot(updated.tracking));
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.delete("/tracking/:collection/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const params = trackingDeleteSchema.parse(request.params);
    const profile = await getOrCreateProfile(user.id);
    const currentTracking = normalizeTrackingSnapshot(profile.tracking);
    const rawList = currentTracking[params.collection];
    const currentList = Array.isArray(rawList) ? rawList : [];
    const nextList = currentList.filter((entry) => entry.id !== params.id);

    const nextTracking = { ...currentTracking, [params.collection]: nextList };
    const updated = await prisma.userProfile.update({
      where: { userId: user.id },
      data: { tracking: nextTracking },
    });
    return normalizeTrackingSnapshot(updated.tracking);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

registerWeeklyReviewRoute(app, {
  requireUser,
  getOrCreateProfile,
  handleRequestError,
});

registerAdminAssignGymRoleRoutes(app, {
  prisma,
  requireAdmin,
  handleRequestError,
});

app.get("/user-foods", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const foods = await prisma.userFood.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return foods;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/user-foods", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const data = userFoodSchema.parse(request.body);
    const food = await prisma.userFood.create({
      data: {
        ...data,
        userId: user.id,
      },
    });
    return reply.status(201).send(food);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.put("/user-foods/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const data = userFoodSchema.parse(request.body);
    const updated = await prisma.userFood.updateMany({
      where: { id: params.id, userId: user.id },
      data,
    });
    if (updated.count === 0) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    const food = await prisma.userFood.findUnique({ where: { id: params.id } });
    return food;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.delete("/user-foods/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const deleted = await prisma.userFood.deleteMany({
      where: { id: params.id, userId: user.id },
    });
    if (deleted.count === 0) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return reply.status(204).send();
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/ai/quota", { preHandler: aiAccessGuard }, async (request, reply) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.currentUser ?? (await requireUser(request));
    const entitlements = authRequest.currentEntitlements ?? getUserEntitlements(user);
    const dateKey = toDateKey();
    const limit = entitlements.modules.ai.enabled ? env.AI_DAILY_LIMIT_PRO : env.AI_DAILY_LIMIT_FREE;
    const usage = await prisma.aiUsage.findUnique({
      where: { userId_date: { userId: user.id, date: dateKey } },
    });
    const usedToday = usage?.count ?? 0;
    const remainingToday = limit > 0 ? Math.max(0, limit - usedToday) : 0;
    const aiTokenPayload = getAiTokenPayload(user, entitlements);
    return reply.status(200).send({
      subscriptionPlan: entitlements.legacy.tier,
      plan: entitlements.legacy.tier,
      dailyLimit: limit,
      usedToday,
      remainingToday,
      retryAfterSec: getSecondsUntilNextUtcDay(),
      aiTokenBalance: aiTokenPayload.aiTokenBalance,
      aiTokenRenewalAt: aiTokenPayload.aiTokenRenewalAt,
      entitlements,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/ai/training-plan", { preHandler: aiAccessGuard }, async (request, reply) => {
  try {
    logAuthCookieDebug(request, "/ai/training-plan");
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.currentUser ?? (await requireUser(request, { logContext: "/ai/training-plan" }));
    const entitlements = authRequest.currentEntitlements ?? getUserEntitlements(user);
    await requireCompleteProfile(user.id);
    const data = aiTrainingSchema.parse(request.body);
    const exerciseCatalog = await loadExerciseCatalogForAi();
    const expectedDays = Math.min(data.daysPerWeek, 7);
    const daysCount = Math.min(data.daysCount ?? 7, 14);
    const startDate = parseDateInput(data.startDate) ?? new Date();
    const cacheKey = buildCacheKey("training", data);
    const template = buildTrainingTemplate(data, exerciseCatalog);
    const effectiveTokens = getEffectiveTokenBalance(user);
    const aiMeta = getAiTokenPayload(user, entitlements);
    const shouldChargeAi = !entitlements.role.adminOverride;

    if (template) {
      const normalized = normalizeTrainingPlanDays(template, startDate, daysCount, expectedDays);
      const personalized = applyPersonalization(normalized, { name: data.name });
      assertTrainingMatchesRequest(personalized, expectedDays);
      const resolvedPlan = resolveTrainingPlanExerciseIds(personalized, exerciseCatalog);
      await saveTrainingPlan(user.id, resolvedPlan, startDate, daysCount, data);
      await storeAiContent(user.id, "training", "template", resolvedPlan);
      return reply.status(200).send({
        plan: resolvedPlan,
        ...aiMeta,
      });
    }

    const cached = await getCachedAiPayload(cacheKey);
    if (cached) {
      try {
        const validated = parseTrainingPlanPayload(cached, startDate, daysCount, expectedDays);
        assertTrainingMatchesRequest(validated, expectedDays);
        const personalized = applyPersonalization(validated, { name: data.name });
        const resolvedPlan = resolveTrainingPlanExerciseIds(personalized, exerciseCatalog);
        await saveTrainingPlan(user.id, resolvedPlan, startDate, daysCount, data);
        await storeAiContent(user.id, "training", "cache", resolvedPlan);
        return reply.status(200).send({
          plan: resolvedPlan,
          ...aiMeta,
        });
      } catch (error) {
        app.log.warn({ err: error, cacheKey }, "cached training plan invalid, regenerating");
      }
    }

    await enforceAiQuota({ id: user.id, plan: entitlements.legacy.tier });
    let payload: Record<string, unknown>;
    let aiTokenBalance: number | null = null;
    let aiResult: OpenAiResponse | null = null;
    let aiAttemptUsed: number | null = null;
    let debit:
      | {
          costCents: number;
          balanceBefore: number;
          balanceAfter: number;
          totalTokens: number;
          model: string;
          usage: { promptTokens: number; completionTokens: number; totalTokens: number };
        }
      | undefined;

    const fetchTrainingPayload = async (attempt: number) => {
      const prompt = buildTrainingPrompt(data, attempt > 0, formatExerciseCatalogForPrompt(exerciseCatalog));
      const result = await callOpenAi(prompt, attempt, extractTopLevelJson, {
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "training_plan",
            schema: trainingPlanJsonSchema as any,
            strict: true,
          },
        },
        model: "gpt-4o-mini",
        maxTokens: 9000,
        retryOnParseError: false,
      });
      payload = result.payload;
      if (shouldChargeAi) {
        aiResult = result;
        aiAttemptUsed = attempt;
      }
      return parseTrainingPlanPayload(payload, startDate, daysCount, expectedDays);
    };

    let parsedPayload: z.infer<typeof aiTrainingPlanResponseSchema>;
    try {
      parsedPayload = await fetchTrainingPayload(0);
      assertTrainingMatchesRequest(parsedPayload, expectedDays);
    } catch (error) {
      const typed = error as { code?: string };
      if (typed.code === "AI_PARSE_ERROR") {
        app.log.warn({ err: error }, "training plan invalid, retrying with strict prompt");
        app.log.info(
          { userId: user.id, feature: "training", charged: false, failureReason: "parse_error", attempt: 0 },
          "ai charge skipped"
        );
        parsedPayload = await fetchTrainingPayload(1);
        assertTrainingMatchesRequest(parsedPayload, expectedDays);
      } else {
        throw error;
      }
    }
    const personalized = applyPersonalization(parsedPayload, { name: data.name });
    const resolvedPlan = resolveTrainingPlanWithDeterministicFallback(
      personalized,
      exerciseCatalog,
      {
        daysPerWeek: data.daysPerWeek,
        level: data.level,
        goal: data.goal,
        equipment: data.equipment,
      },
      startDate,
      { userId: user.id, route: "/ai/training-plan" }
    );
    await saveCachedAiPayload(cacheKey, "training", resolvedPlan);
    await saveTrainingPlan(user.id, resolvedPlan, startDate, daysCount, data);
    await storeAiContent(user.id, "training", "ai", resolvedPlan);
    if (shouldChargeAi && aiResult) {
      const balanceBefore = effectiveTokens;
      const charged = await chargeAiUsageForResult({
        prisma,
        pricing: aiPricing,
        user: {
          id: user.id,
          plan: user.plan,
          aiTokenBalance: user.aiTokenBalance ?? 0,
          aiTokenResetAt: user.aiTokenResetAt,
          aiTokenRenewalAt: user.aiTokenRenewalAt,
        },
        feature: "training",
        result: aiResult,
        meta: { attempt: aiAttemptUsed ?? 0 },
        createHttpError,
      });
      aiTokenBalance = charged.balance;
      debit =
        process.env.NODE_ENV === "production"
          ? undefined
          : {
              costCents: charged.costCents,
              balanceBefore,
              balanceAfter: charged.balance,
              totalTokens: charged.totalTokens,
              model: charged.model,
              usage: charged.usage,
            };
      app.log.info(
        {
          userId: user.id,
          feature: "training",
          balanceBefore,
          balanceAfter: charged.balance,
          charged: true,
          attempt: aiAttemptUsed ?? 0,
        },
        "ai charge complete"
      );
    } else if (shouldChargeAi) {
      app.log.info(
        { userId: user.id, feature: "training", charged: false, failureReason: "missing_ai_result" },
        "ai charge skipped"
      );
    }
    const aiResponse = aiResult as OpenAiResponse | null;
    const exactUsage = extractExactProviderUsage(aiResponse?.usage);
    return reply.status(200).send({
      plan: resolvedPlan,
      aiRequestId: aiResponse?.requestId ?? null,
      aiTokenBalance: shouldChargeAi ? aiTokenBalance : aiMeta.aiTokenBalance,
      aiTokenRenewalAt: shouldChargeAi ? getUserTokenExpiryAt(user) : aiMeta.aiTokenRenewalAt,
      ...(exactUsage ? { usage: exactUsage } : {}),
      ...(shouldChargeAi ? { nextBalance: aiTokenBalance } : {}),
      ...(debit ? { debit } : {}),
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/ai/nutrition-plan", { preHandler: aiAccessGuard }, async (request, reply) => {
  try {
    logAuthCookieDebug(request, "/ai/nutrition-plan");
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.currentUser ??
      (await requireUser(request, { logContext: "/ai/nutrition-plan" }));
    const entitlements = authRequest.currentEntitlements ?? getUserEntitlements(user);
    await requireCompleteProfile(user.id);
    const data = aiNutritionSchema.parse(request.body);
    const expectedMealsPerDay = Math.min(data.mealsPerDay, 6);
    const daysCount = Math.min(data.daysCount ?? 7, 14);
    const startDate = parseDateInput(data.startDate) ?? new Date();
    app.log.info(
      { userId: user.id, mealsPerDay: expectedMealsPerDay, daysCount },
      "nutrition plan request mealsPerDay"
    );
    await prisma.aiPromptCache.deleteMany({
      where: {
        type: "nutrition",
        key: { startsWith: "nutrition:" },
        NOT: { key: { startsWith: "nutrition:v2:" } },
      },
    });
    const cacheKey = buildCacheKey("nutrition:v2", data);
    const recipeQuery = data.preferredFoods?.split(",")[0]?.trim();
    const recipeWhere = recipeQuery
      ? {
          name: { contains: recipeQuery, mode: Prisma.QueryMode.insensitive },
        }
      : undefined;
    const recipes = await prisma.recipe.findMany({
      ...(recipeWhere ? { where: recipeWhere } : {}),
      take: 100,
      orderBy: { name: "asc" },
      include: { ingredients: true },
    });
    const template = buildNutritionTemplate(data);
    const effectiveTokens = getEffectiveTokenBalance(user);
    const aiMeta = getAiTokenPayload(user, entitlements);
    const shouldChargeAi = !entitlements.role.adminOverride;

    if (template) {
      const normalized = normalizeNutritionPlanDays(template, startDate, daysCount);
      logNutritionMealsPerDay(normalized, expectedMealsPerDay, "before_normalize");
      const normalizedMeals = normalizeNutritionMealsPerDay(normalized, expectedMealsPerDay);
      const resolvedCatalogMeals = applyNutritionCatalogResolution(
        normalizedMeals,
        recipes.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          steps: recipe.steps,
          ingredients: recipe.ingredients.map((ingredient: { name: string; grams: number }) => ({
            name: ingredient.name,
            grams: ingredient.grams,
          })),
        }))
      );
      logNutritionMealsPerDay(resolvedCatalogMeals, expectedMealsPerDay, "after_normalize");
      const personalized = applyPersonalization(resolvedCatalogMeals, { name: data.name });
      assertNutritionMatchesRequest(personalized, expectedMealsPerDay, daysCount);
      const savedPlan = await saveNutritionPlan(user.id, personalized, startDate, daysCount);
      await storeAiContent(user.id, "nutrition", "template", personalized);
      return reply.status(200).send({
        planId: savedPlan.id,
        plan: personalized,
        ...aiMeta,
      });
    }

    const cached = await getCachedAiPayload(cacheKey);
    if (cached) {
      try {
        const validated = parseNutritionPlanPayload(cached, startDate, daysCount);
        assertNutritionMatchesRequest(validated, expectedMealsPerDay, daysCount);
        const scaled = applyRecipeScalingToPlan(
          validated,
          recipes.map((recipe) => ({
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            steps: recipe.steps,
            ingredients: recipe.ingredients.map((ingredient: { name: string; grams: number }) => ({
              name: ingredient.name,
              grams: ingredient.grams,
            })),
          }))
        );
        logNutritionMealsPerDay(scaled, expectedMealsPerDay, "before_normalize");
        const normalizedMeals = normalizeNutritionMealsPerDay(scaled, expectedMealsPerDay);
        const resolvedCatalogMeals = applyNutritionCatalogResolution(
          normalizedMeals,
          recipes.map((recipe) => ({
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            steps: recipe.steps,
            ingredients: recipe.ingredients.map((ingredient: { name: string; grams: number }) => ({
              name: ingredient.name,
              grams: ingredient.grams,
            })),
          }))
        );
        logNutritionMealsPerDay(resolvedCatalogMeals, expectedMealsPerDay, "after_normalize");
        assertNutritionMatchesRequest(resolvedCatalogMeals, expectedMealsPerDay, daysCount);
        const personalized = applyPersonalization(resolvedCatalogMeals, { name: data.name });
        const savedPlan = await saveNutritionPlan(user.id, personalized, startDate, daysCount);
        await storeAiContent(user.id, "nutrition", "cache", personalized);
        return reply.status(200).send({
          planId: savedPlan.id,
          plan: personalized,
          ...aiMeta,
        });
      } catch (error) {
        app.log.warn({ err: error, cacheKey }, "cached nutrition plan invalid, regenerating");
      }
    }

    await enforceAiQuota({ id: user.id, plan: entitlements.legacy.tier });
    let payload: Record<string, unknown>;
    let aiTokenBalance: number | null = null;
    let aiResult: OpenAiResponse | null = null;
    let aiAttemptUsed: number | null = null;
    let debit:
      | {
          costCents: number;
          balanceBefore: number;
          balanceAfter: number;
          totalTokens: number;
          model: string;
          usage: { promptTokens: number; completionTokens: number; totalTokens: number };
        }
      | undefined;
    const fetchNutritionPayload = async (attempt: number) => {
      const promptAttempt = buildNutritionPrompt(
        data,
        recipes.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          ingredients: recipe.ingredients.map((ingredient: { name: string; grams: number }) => ({
            name: ingredient.name,
            grams: ingredient.grams,
          })),
          steps: recipe.steps,
        })),
        attempt > 0
      );
      if (shouldChargeAi) {
        const result = await callOpenAi(promptAttempt, attempt, extractTopLevelJson, {
       
          responseFormat: {
  type: "json_schema",
  json_schema: {
    name: "nutrition_plan",
    schema: nutritionPlanJsonSchema as any,
    strict: true,
  },
},
   model: "gpt-4o-mini",
          maxTokens: 1200,
          retryOnParseError: false,
        });
        payload = result.payload;
        aiResult = result;
        aiAttemptUsed = attempt;
      } else {
        const result = await callOpenAi(promptAttempt, attempt, extractTopLevelJson, {
      
          responseFormat: {
  type: "json_schema",
  json_schema: {
    name: "nutrition_plan",
    schema: nutritionPlanJsonSchema as any,
    strict: true,
  },
},
   model: "gpt-4o-mini",
          maxTokens: 1200,
          retryOnParseError: false,
        });
        payload = result.payload;
      }
      return parseNutritionPlanPayload(payload, startDate, daysCount);
    };

    let parsedPayload: z.infer<typeof aiNutritionPlanResponseSchema>;
    try {
      parsedPayload = await fetchNutritionPayload(0);
      assertNutritionMatchesRequest(parsedPayload, expectedMealsPerDay, daysCount);
    } catch (error) {
      const typed = error as { code?: string };
      if (typed.code === "AI_PARSE_ERROR") {
        app.log.warn({ err: error }, "nutrition plan invalid, retrying with strict prompt");
        app.log.info(
          { userId: user.id, feature: "nutrition", charged: false, failureReason: "parse_error", attempt: 0 },
          "ai charge skipped"
        );
        parsedPayload = await fetchNutritionPayload(1);
        assertNutritionMatchesRequest(parsedPayload, expectedMealsPerDay, daysCount);
      } else {
        throw error;
      }
    }
    const scaledPayload = applyRecipeScalingToPlan(
      parsedPayload,
      recipes.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        steps: recipe.steps,
        ingredients: recipe.ingredients.map((ingredient: { name: string; grams: number }) => ({
          name: ingredient.name,
          grams: ingredient.grams,
        })),
      }))
    );
    logNutritionMealsPerDay(scaledPayload, expectedMealsPerDay, "before_normalize");
    const normalizedMeals = normalizeNutritionMealsPerDay(scaledPayload, expectedMealsPerDay);
    const resolvedCatalogMeals = applyNutritionCatalogResolution(
      normalizedMeals,
      recipes.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        steps: recipe.steps,
        ingredients: recipe.ingredients.map((ingredient: { name: string; grams: number }) => ({
          name: ingredient.name,
          grams: ingredient.grams,
        })),
      }))
    );
    logNutritionMealsPerDay(resolvedCatalogMeals, expectedMealsPerDay, "after_normalize");
    assertNutritionMatchesRequest(resolvedCatalogMeals, expectedMealsPerDay, daysCount);
    const savedPlan = await saveNutritionPlan(user.id, resolvedCatalogMeals, startDate, daysCount);
    await saveCachedAiPayload(cacheKey, "nutrition", resolvedCatalogMeals);
    const personalized = applyPersonalization(resolvedCatalogMeals, { name: data.name });
    await storeAiContent(user.id, "nutrition", "ai", personalized);
    if (shouldChargeAi && aiResult) {
      const balanceBefore = effectiveTokens;
      const charged = await chargeAiUsageForResult({
        prisma,
        pricing: aiPricing,
        user: {
          id: user.id,
          plan: user.plan,
          aiTokenBalance: user.aiTokenBalance ?? 0,
          aiTokenResetAt: user.aiTokenResetAt,
          aiTokenRenewalAt: user.aiTokenRenewalAt,
        },
        feature: "nutrition",
        result: aiResult,
        meta: { attempt: aiAttemptUsed ?? 0 },
        createHttpError,
      });
      aiTokenBalance = charged.balance;
      debit =
        process.env.NODE_ENV === "production"
          ? undefined
          : {
              costCents: charged.costCents,
              balanceBefore,
              balanceAfter: charged.balance,
              totalTokens: charged.totalTokens,
              model: charged.model,
              usage: charged.usage,
            };
      app.log.info(
        {
          userId: user.id,
          feature: "nutrition",
          balanceBefore,
          balanceAfter: charged.balance,
          charged: true,
          attempt: aiAttemptUsed ?? 0,
        },
        "ai charge complete"
      );
    } else if (shouldChargeAi) {
      app.log.info(
        { userId: user.id, feature: "nutrition", charged: false, failureReason: "missing_ai_result" },
        "ai charge skipped"
      );
    }
    const aiResponse = aiResult as OpenAiResponse | null;
    const exactUsage = extractExactProviderUsage(aiResponse?.usage);
    return reply.status(200).send({
      planId: savedPlan.id,
      plan: personalized,
      aiRequestId: aiResponse?.requestId ?? null,
      aiTokenBalance: shouldChargeAi ? aiTokenBalance : aiMeta.aiTokenBalance,
      aiTokenRenewalAt: shouldChargeAi ? getUserTokenExpiryAt(user) : aiMeta.aiTokenRenewalAt,
      ...(exactUsage ? { usage: exactUsage } : {}),
      ...(shouldChargeAi ? { nextBalance: aiTokenBalance } : {}),
      ...(debit ? { debit } : {}),
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/ai/training-plan/generate", { preHandler: aiStrengthDomainGuard }, async (request, reply) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.currentUser ?? (await requireUser(request, { logContext: "/ai/training-plan/generate" }));
    const entitlements = authRequest.currentEntitlements ?? getUserEntitlements(user);
    const shouldChargeAi = !entitlements.role.adminOverride;
    if (shouldChargeAi) {
      assertSufficientAiTokenBalance(user);
    }
    const payload = aiGenerateTrainingSchema.parse(request.body);
    if (payload.userId && payload.userId !== user.id) {
      throw createHttpError(400, "INVALID_INPUT", { message: "userId must match authenticated user" });
    }

    const profileRecord = await getOrCreateProfile(user.id);
    const profile = (profileRecord.profile ?? {}) as Record<string, unknown>;
    const trainingPreferences = (profile.trainingPreferences ?? {}) as Record<string, unknown>;
    const levelFromProfile =
      trainingPreferences.level === "beginner" ||
      trainingPreferences.level === "intermediate" ||
      trainingPreferences.level === "advanced"
        ? trainingPreferences.level
        : payload.experienceLevel;

    const trainingInput: z.infer<typeof aiTrainingSchema> = {
      age: typeof profile.age === "number" ? profile.age : 30,
      sex: profile.sex === "female" ? "female" : "male",
      level: payload.experienceLevel ?? levelFromProfile,
      goal: payload.goal,
      equipment: trainingPreferences.equipment === "home" ? "home" : "gym",
      daysPerWeek: payload.daysPerWeek,
      sessionTime:
        trainingPreferences.sessionTime === "short" ||
        trainingPreferences.sessionTime === "medium" ||
        trainingPreferences.sessionTime === "long"
          ? trainingPreferences.sessionTime
          : "medium",
      focus:
        trainingPreferences.focus === "upperLower" || trainingPreferences.focus === "ppl"
          ? trainingPreferences.focus
          : "full",
      timeAvailableMinutes:
        trainingPreferences.workoutLength === "30m"
          ? 30
          : trainingPreferences.workoutLength === "60m"
            ? 60
            : 45,
      includeCardio: typeof trainingPreferences.includeCardio === "boolean" ? trainingPreferences.includeCardio : true,
      includeMobilityWarmups:
        typeof trainingPreferences.includeMobilityWarmups === "boolean"
          ? trainingPreferences.includeMobilityWarmups
          : true,
      startDate: toIsoDateString(new Date()),
      daysCount: payload.daysPerWeek,
      restrictions: payload.constraints,
      injuries: typeof profile.injuries === "string" ? profile.injuries : undefined,
      goals: Array.isArray(profile.goals) ? (profile.goals.filter((goal) => typeof goal === "string") as any) : undefined,
    };

    const expectedDays = trainingInput.daysPerWeek;
    const startDate = parseDateInput(trainingInput.startDate) ?? new Date();
    const exerciseCatalog = await loadExerciseCatalogForAi();

    let parsedPlan: z.infer<typeof aiTrainingPlanResponseSchema> | null = null;
    let aiResult: OpenAiResponse | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const prompt = `${buildTrainingPrompt(trainingInput, attempt > 0, formatExerciseCatalogForPrompt(exerciseCatalog))} ${
          attempt > 0
            ? "REINTENTO OBLIGATORIO: corrige la salida para que cumpla exactamente los días solicitados y volumen por nivel."
            : ""
        }`;
        const result = await callOpenAi(prompt, attempt, extractTopLevelJson, {
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "training_plan",
              schema: trainingPlanJsonSchema as any,
              strict: true,
            },
          },
          model: "gpt-4o-mini",
          maxTokens: 4000,
          retryOnParseError: false,
        });
        app.log.info(
          {
            route: "/ai/training-plan/generate",
            userId: user.id,
            attempt,
            aiRequestId: result.requestId ?? null,
            model: result.model ?? "unknown",
          },
          "training ai generation complete"
        );
        const candidate = parseTrainingPlanPayload(result.payload, startDate, trainingInput.daysCount ?? expectedDays, expectedDays);
        assertTrainingMatchesRequest(candidate, expectedDays);
        assertTrainingLevelConsistency(candidate, payload.experienceLevel);
        app.log.info(
          {
            route: "/ai/training-plan/generate",
            userId: user.id,
            attempt,
            days: candidate.days.length,
            title: candidate.title,
          },
          "training ai output parsed and validated"
        );
        parsedPlan = candidate;
        aiResult = result;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!parsedPlan) {
      app.log.warn(
        {
          userId: user.id,
          cause: (lastError as { code?: string; message?: string })?.code ?? "UNKNOWN",
        },
        "training plan AI failed, returning deterministic fallback"
      );
      parsedPlan = buildDeterministicTrainingFallbackPlan(
        {
          daysPerWeek: trainingInput.daysPerWeek,
          level: trainingInput.level,
          goal: trainingInput.goal,
          startDate,
          equipment: trainingInput.equipment,
        },
        exerciseCatalog
      );
    }

    const resolvedPlan = resolveTrainingPlanWithDeterministicFallback(
      parsedPlan,
      exerciseCatalog,
      {
        daysPerWeek: trainingInput.daysPerWeek,
        level: trainingInput.level,
        goal: trainingInput.goal,
        equipment: trainingInput.equipment,
      },
      startDate,
      { userId: user.id, route: "/ai/training-plan/generate" }
    );
    await upsertExercisesFromPlan(resolvedPlan);
    app.log.info(
      {
        route: "/ai/training-plan/generate",
        userId: user.id,
        startDate: toIsoDateString(startDate),
        daysCount: trainingInput.daysCount ?? expectedDays,
      },
      "training plan persistence start"
    );
    const savedPlan = await saveTrainingPlan(user.id, resolvedPlan, startDate, trainingInput.daysCount ?? expectedDays, trainingInput);
    app.log.info(
      {
        route: "/ai/training-plan/generate",
        userId: user.id,
        planId: savedPlan.id,
      },
      "training plan persistence complete"
    );
    await safeStoreAiContent(user.id, "training", "ai", resolvedPlan);

    if (aiResult && shouldChargeAi) {
      await chargeAiUsageForResult({
        prisma,
        pricing: aiPricing,
        user: {
          id: user.id,
          plan: user.plan,
          aiTokenBalance: user.aiTokenBalance ?? 0,
          aiTokenResetAt: user.aiTokenResetAt,
          aiTokenRenewalAt: user.aiTokenRenewalAt,
        },
        feature: "training-generate",
        result: aiResult,
        createHttpError,
      });
    } else if (aiResult) {
      await persistAiUsageLog({
        prisma,
        userId: user.id,
        feature: "training-generate",
        provider: "openai",
        model: aiResult.model ?? "unknown",
        requestId: aiResult.requestId,
        usage: aiResult.usage,
        totals: buildUsageTotals(aiResult.usage),
        mode: "AI",
      });
    } else {
      const fallbackCause =
        (lastError as { code?: string; message?: string } | null)?.code ??
        (lastError as { message?: string } | null)?.message ??
        "AI_UNAVAILABLE";
      await persistAiUsageLog({
        prisma,
        userId: user.id,
        feature: "training-generate",
        provider: "openai",
        model: "fallback",
        totals: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        mode: "FALLBACK",
        fallbackReason: fallbackCause,
      });
    }

    const exactUsage = extractExactProviderUsage(aiResult?.usage);
    return reply.status(200).send({
      planId: savedPlan.id,
      summary: summarizeTrainingPlan(resolvedPlan),
      plan: resolvedPlan,
      aiRequestId: aiResult?.requestId ?? null,
      ...(exactUsage ? { usage: exactUsage } : {}),
    });
  } catch (error) {
    const classified = classifyAiGenerateError(error);
    const logger = classified.errorKind === "internal_error" ? app.log.error.bind(app.log) : app.log.warn.bind(app.log);
    const shouldLogRawError = classified.errorKind !== "db_conflict" && typeof classified.prismaCode !== "string";
    logger(
      {
        ...(shouldLogRawError ? { err: error } : {}),
        reqId: request.id,
        route: "/ai/training-plan/generate",
        error_kind: classified.errorKind,
        ...(typeof classified.upstreamStatus === "number" ? { upstream_status: classified.upstreamStatus } : {}),
        ...(typeof classified.prismaCode === "string" ? { prisma_code: classified.prismaCode } : {}),
        ...(Array.isArray(classified.target) ? { target: classified.target } : {}),
      },
      "training plan generation failed"
    );
    return reply.status(classified.statusCode).send({ error: classified.error });
  }
});

app.post("/ai/nutrition-plan/generate", { preHandler: aiNutritionDomainGuard }, async (request, reply) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.currentUser ?? (await requireUser(request, { logContext: "/ai/nutrition-plan/generate" }));
    const entitlements = authRequest.currentEntitlements ?? getUserEntitlements(user);
    const shouldChargeAi = !entitlements.role.adminOverride;
    if (shouldChargeAi) {
      assertSufficientAiTokenBalance(user);
    }
    const payload = aiGenerateNutritionSchema.parse(request.body);
    if (payload.userId && payload.userId !== user.id) {
      throw createHttpError(400, "INVALID_INPUT", { message: "userId must match authenticated user" });
    }

    const profileRecord = await getOrCreateProfile(user.id);
    const profile = (profileRecord.profile ?? {}) as Record<string, unknown>;
    const nutritionPreferences = (profile.nutritionPreferences ?? {}) as Record<string, unknown>;

    const nutritionInput: z.infer<typeof aiNutritionSchema> = {
      age: typeof profile.age === "number" ? profile.age : 30,
      sex: profile.sex === "female" ? "female" : "male",
      goal:
        profile.goal === "cut" || profile.goal === "maintain" || profile.goal === "bulk"
          ? profile.goal
          : "maintain",
      mealsPerDay: payload.mealsPerDay,
      calories: payload.targetKcal,
      startDate: payload.startDate || toIsoDateString(new Date()),
      daysCount: payload.daysCount ?? 7,
      dietaryRestrictions: [payload.dietType, nutritionPreferences.dietaryPrefs]
        .filter((item): item is string => typeof item === "string" && item.length > 0)
        .join(", "),
      dietType:
        payload.dietType ??
        (nutritionPreferences.dietType === "balanced" ||
        nutritionPreferences.dietType === "mediterranean" ||
        nutritionPreferences.dietType === "keto" ||
        nutritionPreferences.dietType === "vegetarian" ||
        nutritionPreferences.dietType === "vegan" ||
        nutritionPreferences.dietType === "pescatarian" ||
        nutritionPreferences.dietType === "paleo" ||
        nutritionPreferences.dietType === "flexible"
          ? nutritionPreferences.dietType
          : undefined),
      allergies: Array.isArray(nutritionPreferences.allergies)
        ? nutritionPreferences.allergies.filter((item): item is string => typeof item === "string")
        : [],
      preferredFoods: typeof nutritionPreferences.preferredFoods === "string" ? nutritionPreferences.preferredFoods : "",
      dislikedFoods: typeof nutritionPreferences.dislikedFoods === "string" ? nutritionPreferences.dislikedFoods : "",
      mealDistribution: nutritionPreferences.mealDistribution as z.infer<typeof mealDistributionSchema> | undefined,
    };

    const startDate = payload.startDate ? parseDateInput(payload.startDate) ?? new Date() : new Date();
    const daysCount = payload.daysCount ?? 7;
    assertNutritionRequestMapping(payload, nutritionInput, daysCount);
    let parsedPlan: z.infer<typeof aiNutritionPlanResponseSchema> | null = null;
    let aiResult: OpenAiResponse | null = null;
    let lastError: unknown = null;
    let lastRawOutput = "";
    let retryFeedback = "";
    const resolvedDietType = payload.dietType ?? nutritionInput.dietType ?? "balanced";
    const recipes = await prisma.recipe.findMany({
      take: 100,
      orderBy: { name: "asc" },
      include: { ingredients: true },
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const prompt = `${buildNutritionPrompt(nutritionInput, recipes.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          ingredients: recipe.ingredients.map((ingredient: { name: string; grams: number }) => ({
            name: ingredient.name,
            grams: ingredient.grams,
          })),
          steps: recipe.steps,
        })), attempt > 0, retryFeedback)} ` +
          `Macros objetivo por día (con tolerancia): proteína ${payload.macroTargets.proteinG}g, carbohidratos ${payload.macroTargets.carbsG}g, grasas ${payload.macroTargets.fatsG}g. ` +
          `Calorías objetivo por día: ${payload.targetKcal}. ` +
          "REGLA DURA: cada día debe cumplir proteína total >= objetivo de proteína (no menos). " +
          "REGLA DURA: cada comida debe incluir una fuente proteica clara y suficiente para aportar proteína real. " +
          (resolvedDietType === "vegetarian"
            ? "REGLA DURA VEGETARIANO: prioriza tofu, tempeh, seitán, legumbres, huevos, lácteos altos en proteína (si aplica) y proteína vegetal en polvo cuando haga falta. No uses carnes ni pescado. "
            : "") +
          "VERIFICACIÓN FINAL OBLIGATORIA: antes de responder, revisa expected vs actual por día y ajusta para que proteína/carbohidratos/grasas queden dentro de ±5g del objetivo diario sin cambiar calorías objetivo. " +
          `${attempt > 0 ? "REINTENTO OBLIGATORIO: corrige expected vs actual reportado y cierra consistencia por comida y por día sin cambiar targetKcal total." : ""}`;
        const result = await callOpenAi(prompt, attempt, extractTopLevelJson, {
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "nutrition_plan",
              schema: nutritionPlanJsonSchema as any,
              strict: true,
            },
          },
          model: "gpt-4o-mini",
          maxTokens: 4000,
          retryOnParseError: false,
        });

        lastRawOutput = JSON.stringify(result.payload);
        const candidate = parseNutritionPlanPayload(result.payload, startDate, daysCount);
        assertNutritionMatchesRequest(candidate, payload.mealsPerDay, daysCount);
        const beforeNormalize = summarizeNutritionMath(candidate);
        const calNormalized = normalizeNutritionCaloriesPerDay(candidate, payload.targetKcal);
        const macroNormalized = normalizeNutritionMacrosPerDay(calNormalized, payload.macroTargets);
        const finalNormalized = normalizeNutritionCaloriesPerDay(macroNormalized, payload.targetKcal);
        const scaled = applyRecipeScalingToPlan(
          finalNormalized,
          recipes.map((recipe) => ({
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            steps: recipe.steps,
            ingredients: recipe.ingredients.map((ingredient: { name: string; grams: number }) => ({
              name: ingredient.name,
              grams: ingredient.grams,
            })),
          }))
        );
        const finalWithCatalog = applyNutritionCatalogResolution(
          scaled,
          recipes.map((recipe) => ({
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            steps: recipe.steps,
            ingredients: recipe.ingredients.map((ingredient: { name: string; grams: number }) => ({
              name: ingredient.name,
              grams: ingredient.grams,
            })),
          }))
        );
        const afterNormalize = summarizeNutritionMath(finalWithCatalog);
        app.log.info(
          {
            attempt,
            beforeNormalize,
            afterNormalize,
          },
          "nutrition normalization summary"
        );
        assertNutritionMath(finalWithCatalog, payload);
        parsedPlan = finalWithCatalog;
        aiResult = result;
        break;
      } catch (error) {
        lastError = error;
        retryFeedback = buildRetryFeedback(error);
      }
    }

    if (!parsedPlan) {
      const debug = getNutritionInvalidOutputDebug(lastError);
      app.log.info(
        {
          userId: user.id,
          startDate: payload.startDate ?? toIsoDateString(startDate),
          daysCount,
          persisted: false,
          planId: null,
          reasonCode: debug.reasonCode,
        },
        "nutrition plan generation result"
      );
      app.log.warn(
        {
          aiRequestId: aiResult?.requestId ?? null,
          upstream_status:
            typeof (lastError as { debug?: Record<string, unknown> })?.debug?.status === "number"
              ? ((lastError as { debug?: Record<string, unknown> }).debug?.status as number)
              : undefined,
          error_kind: classifyAiGenerateError(lastError).errorKind,
          outputPreviewLength: lastRawOutput.length,
          reasonCode: debug.reasonCode,
          details: debug.details,
        },
        "nutrition generation invalid ai output"
      );
      throw createHttpError(502, "AI_PARSE_ERROR", {
        message: "No se pudo generar un plan nutricional válido tras reintento.",
        aiRequestId: aiResult?.requestId ?? undefined,
        ...debug,
      });
    }

    app.log.info(
      {
        route: "/ai/nutrition-plan/generate",
        userId: user.id,
        startDate: payload.startDate ?? toIsoDateString(startDate),
        daysCount,
      },
      "nutrition plan persistence start"
    );
    const savedPlan = await saveNutritionPlan(user.id, parsedPlan, startDate, daysCount);
    app.log.info(
      {
        route: "/ai/nutrition-plan/generate",
        userId: user.id,
        planId: savedPlan.id,
      },
      "nutrition plan persistence complete"
    );
    await safeStoreAiContent(user.id, "nutrition", "ai", parsedPlan);

    if (aiResult && shouldChargeAi) {
      await chargeAiUsageForResult({
        prisma,
        pricing: aiPricing,
        user: {
          id: user.id,
          plan: user.plan,
          aiTokenBalance: user.aiTokenBalance ?? 0,
          aiTokenResetAt: user.aiTokenResetAt,
          aiTokenRenewalAt: user.aiTokenRenewalAt,
        },
        feature: "nutrition-generate",
        result: aiResult,
        createHttpError,
      });
    } else if (aiResult) {
      await persistAiUsageLog({
        prisma,
        userId: user.id,
        feature: "nutrition-generate",
        provider: "openai",
        model: aiResult.model ?? "unknown",
        requestId: aiResult.requestId,
        usage: aiResult.usage,
        totals: buildUsageTotals(aiResult.usage),
        mode: "AI",
      });
    } else {
      await persistAiUsageLog({
        prisma,
        userId: user.id,
        feature: "nutrition-generate",
        provider: "openai",
        model: "fallback",
        totals: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        mode: "FALLBACK",
        fallbackReason: "NO_AI_RESULT",
      });
    }

    app.log.info(
      {
        userId: user.id,
        startDate: payload.startDate ?? toIsoDateString(startDate),
        daysCount,
        persisted: true,
        planId: savedPlan.id,
        aiRequestId: aiResult?.requestId ?? null,
      },
      "nutrition plan generation result"
    );

    const exactUsage = extractExactProviderUsage(aiResult?.usage);
    return reply.status(200).send({
      planId: savedPlan.id,
      summary: summarizeNutritionPlan(parsedPlan),
      plan: parsedPlan,
      aiRequestId: aiResult?.requestId ?? null,
      ...(exactUsage ? { usage: exactUsage } : {}),
    });
  } catch (error) {
    const classified = classifyAiGenerateError(error);
    const logger = classified.errorKind === "internal_error" ? app.log.error.bind(app.log) : app.log.warn.bind(app.log);
    logger(
      {
        ...(classified.errorKind === "db_conflict" ? {} : { err: error }),
        reqId: request.id,
        route: "/ai/nutrition-plan/generate",
        error_kind: classified.errorKind,
        ...(typeof classified.upstreamStatus === "number" ? { upstream_status: classified.upstreamStatus } : {}),
        ...(typeof classified.prismaCode === "string" ? { prisma_code: classified.prismaCode } : {}),
        ...(Array.isArray(classified.target) ? { target: classified.target } : {}),
      },
      "nutrition plan generate failed"
    );
    return reply.status(classified.statusCode).send({ error: classified.error });
  }
});

app.post("/ai/daily-tip", { preHandler: aiAccessGuard }, async (request, reply) => {
  try {
    logAuthCookieDebug(request, "/ai/daily-tip");
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.currentUser ?? (await requireUser(request, { logContext: "/ai/daily-tip" }));
    const entitlements = authRequest.currentEntitlements ?? getUserEntitlements(user);
    const data = aiTipSchema.parse(request.body);
    const cacheKey = buildCacheKey("tip", data);
    const template = buildTipTemplate();
    const effectiveTokens = getEffectiveTokenBalance(user);
    const aiMeta = getAiTokenPayload(user, entitlements);
    const shouldChargeAi = !entitlements.role.adminOverride;

    if (template) {
      const personalized = applyPersonalization(template, { name: data.name ?? "amigo" });
      await safeStoreAiContent(user.id, "tip", "template", personalized);
      return reply.status(200).send({
        tip: personalized,
        ...aiMeta,
      });
    }

    const cached = await getCachedAiPayload(cacheKey);
    if (cached) {
      const personalized = applyPersonalization(cached, { name: data.name ?? "amigo" });
      await safeStoreAiContent(user.id, "tip", "cache", personalized);
      return reply.status(200).send({
        tip: personalized,
        ...aiMeta,
      });
    }

    await enforceAiQuota({ id: user.id, plan: entitlements.legacy.tier });
    const prompt = buildTipPrompt(data);
    let payload: Record<string, unknown>;
    let aiTokenBalance: number | null = null;
    let debit:
      | {
          costCents: number;
          balanceBefore: number;
          balanceAfter: number;
          totalTokens: number;
          model: string;
          usage: { promptTokens: number; completionTokens: number; totalTokens: number };
        }
      | undefined;
    if (shouldChargeAi) {
      const balanceBefore = effectiveTokens;
      app.log.info(
        { userId: user.id, feature: "tip", plan: user.plan, balanceBefore },
        "ai charge start"
      );
      const charged = await chargeAiUsage({
        prisma,
        pricing: aiPricing,
        user: {
          id: user.id,
          plan: user.plan,
          aiTokenBalance: user.aiTokenBalance ?? 0,
          aiTokenResetAt: user.aiTokenResetAt,
          aiTokenRenewalAt: user.aiTokenRenewalAt,
        },
        feature: "tip",
        execute: () => callOpenAi(prompt),
        createHttpError,
      });
      app.log.info(
        {
          userId: user.id,
          feature: "tip",
          costCents: charged.costCents,
          totalTokens: charged.totalTokens,
          balanceAfter: charged.balance,
        },
        "ai charge complete"
      );
      app.log.debug(
        {
          userId: user.id,
          feature: "tip",
          costCents: charged.costCents,
          balanceBefore,
          balanceAfter: charged.balance,
          model: charged.model,
          totalTokens: charged.totalTokens,
        },
        "ai charge details"
      );
      payload = charged.payload;
      aiTokenBalance = charged.balance;
      debit =
        process.env.NODE_ENV === "production"
          ? undefined
          : {
              costCents: charged.costCents,
              balanceBefore,
              balanceAfter: charged.balance,
              totalTokens: charged.totalTokens,
              model: charged.model,
              usage: charged.usage,
            };
    } else {
      const result = await callOpenAi(prompt);
      payload = result.payload;
    }
    await saveCachedAiPayload(cacheKey, "tip", payload);
    const personalized = applyPersonalization(payload, { name: data.name ?? "amigo" });
    await safeStoreAiContent(user.id, "tip", "ai", personalized);
    return reply.status(200).send({
      tip: personalized,
      aiTokenBalance: shouldChargeAi ? aiTokenBalance : aiMeta.aiTokenBalance,
      aiTokenRenewalAt: shouldChargeAi ? getUserTokenExpiryAt(user) : aiMeta.aiTokenRenewalAt,
      ...(shouldChargeAi ? { nextBalance: aiTokenBalance, balanceAfter: aiTokenBalance } : {}),
      ...(debit ? { debit } : {}),
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/feed", async (request, reply) => {
  try {
    logAuthCookieDebug(request, "/feed");
    const user = await requireUser(request);
    const { limit } = feedQuerySchema.parse(request.query);
    const posts = await prisma.feedPost.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return posts;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/feed/generate", async (request, reply) => {
  try {
    logAuthCookieDebug(request, "/feed/generate");
    const user = await requireUser(request);
    const profile = await getOrCreateProfile(user.id);
    const profileData =
      typeof profile.profile === "object" && profile.profile ? (profile.profile as Record<string, unknown>) : null;
    const trackingData =
      typeof profile.tracking === "object" && profile.tracking ? (profile.tracking as FeedTrackingSnapshot) : null;
    const summary = buildFeedSummary(profileData, trackingData);
    const post = await prisma.feedPost.create({
      data: {
        userId: user.id,
        title: summary.title,
        summary: summary.summary,
        type: "summary",
        metadata: summary.metadata,
      },
    });
    return reply.status(201).send(post);
  } catch (error) {
    return handleRequestError(reply, error);
  }
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
  secondaryMuscleGroups: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  technique: z.string().trim().max(3000).optional(),
  tips: z.string().trim().max(3000).optional(),
  mediaUrl: z.string().trim().url().optional(),
  imageUrl: z.string().trim().url().optional(),
  videoUrl: z.string().trim().url().optional(),
});
const recipeListSchema = z.object({
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
const trainerMemberIdParamsSchema = z.object({
  id: z.string().min(1),
});
const trainerPlanCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  daysCount: z.coerce.number().int().min(1).max(14).optional(),
  description: z.string().trim().min(1).max(600).optional(),
  notes: z.string().trim().min(1).max(600).optional(),
  goal: z.string().trim().min(1).max(80).default("general_fitness"),
  level: z.string().trim().min(1).max(80).default("beginner"),
  focus: z.string().trim().min(1).max(120).default("full_body"),
  equipment: z.string().trim().min(1).max(120).default("bodyweight"),
  daysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
  startDate: z.string().trim().min(1).optional(),
}).refine((value) => value.daysCount !== undefined || value.daysPerWeek !== undefined, {
  message: "daysCount or daysPerWeek is required",
  path: ["daysCount"],
});
const trainerPlanUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  daysCount: z.coerce.number().int().min(1).max(14).optional(),
  notes: z.string().trim().min(1).max(600).nullable().optional(),
  goal: z.string().trim().min(1).max(80).optional(),
  level: z.string().trim().min(1).max(80).optional(),
  focus: z.string().trim().min(1).max(120).optional(),
  equipment: z.string().trim().min(1).max(120).optional(),
  daysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
  startDate: z.string().trim().min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, {
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

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function parseClientMetrics(profile: unknown, tracking: unknown) {
  const profileRecord = isRecord(profile) ? profile : null;
  const trackingRecord = isRecord(tracking) ? tracking : null;

  const numberOrNull = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
  const stringOrNull = (value: unknown) => (typeof value === "string" && value.trim().length > 0 ? value : null);

  const measurementsRaw = profileRecord && isRecord(profileRecord.measurements) ? profileRecord.measurements : null;
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

  const checkins = trackingRecord && Array.isArray(trackingRecord.checkins) ? trackingRecord.checkins : [];
  const latestCheckin = [...checkins]
    .filter((entry) => isRecord(entry) && typeof entry.date === "string")
    .sort((left, right) => {
      const leftDate = Date.parse(String(left.date));
      const rightDate = Date.parse(String(right.date));
      return Number.isFinite(rightDate) && Number.isFinite(leftDate) ? rightDate - leftDate : 0;
    })[0];

  const progress = latestCheckin && isRecord(latestCheckin)
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




app.get("/exercises", async (request, reply) => {
  try {
    await requireUser(request);
    const parsed = exerciseListSchema.parse(request.query);
    const q = parsed.q ?? parsed.query;
    const primaryMuscle = parsed.primaryMuscle ?? parsed.muscle;
    const page = parsed.page ?? 1;
    const limit = parsed.take ?? parsed.limit;
    const offset = parsed.cursor ? 0 : parsed.offset ?? (page - 1) * limit;

    const { items, total } = await listExercises({
      q,
      primaryMuscle,
      equipment: parsed.equipment,
      cursor: parsed.cursor,
      take: parsed.take,
      limit,
      offset,
    });

    const nextCursor = parsed.cursor || parsed.take
      ? items.length === limit
        ? items[items.length - 1]?.id ?? null
        : null
      : null;

    return {
      items,
      total,
      limit,
      offset,
      page,
      nextCursor,
      hasMore: offset + items.length < total,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/exercises/:id", async (request, reply) => {
  try {
    await requireUser(request);
    const { id } = exerciseParamsSchema.parse(request.params);
    const exercise = await getExerciseById(id);
    if (!exercise) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return exercise;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/exercises", async (request, reply) => {
  try {
    await requireUser(request);
    const payload = createExerciseSchema.parse(request.body);

    if (payload.mediaUrl || payload.imageUrl || payload.videoUrl) {
      return reply.status(400).send({ error: "MEDIA_UPLOAD_NOT_SUPPORTED" });
    }

    const exercise = await createExercise(payload);
    return reply.status(201).send(exercise);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/recipes", async (request, reply) => {
  try {
    await requireUser(request);
    const { query, limit, offset } = recipeListSchema.parse(request.query);
    const where: Prisma.RecipeWhereInput = query
      ? { name: { contains: query, mode: Prisma.QueryMode.insensitive } }
      : {};
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

app.get("/training-plans", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { query, limit, offset } = trainingPlanListSchema.parse(request.query);
    const where: Prisma.TrainingPlanWhereInput = {
      userId: user.id,
      ...(query ? { title: { contains: query, mode: Prisma.QueryMode.insensitive } } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.trainingPlan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
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
        },
      }),
      prisma.trainingPlan.count({ where }),
    ]);
    return { items, total, limit, offset };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/training-plans", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const data = trainingPlanCreateSchema.parse(request.body);
    const startDate = parseDateInput(data.startDate);

    if (!startDate) {
      return reply.status(400).send({ error: "INVALID_START_DATE" });
    }

    const dates = buildDateRange(startDate, data.daysCount);
    const plan = await prisma.trainingPlan.create({
      data: {
        userId: user.id,
        title: data.title,
        notes: data.notes ?? null,
        goal: data.goal,
        level: data.level,
        daysPerWeek: data.daysPerWeek,
        focus: data.focus,
        equipment: data.equipment,
        startDate,
        daysCount: data.daysCount,
        days: {
          create: dates.map((date, index) => ({
            date: new Date(`${date}T00:00:00.000Z`),
            label: `Día ${index + 1}`,
            focus: data.focus,
            duration: 45,
            order: index + 1,
          })),
        },
      },
      select: {
        id: true,
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
      },
    });

    return reply.status(201).send(plan);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/training-plans/:id", async (request, reply) => {
  const reqId = request.id;
  try {
    const user = await requireUser(request);
    const { id } = trainingPlanParamsSchema.parse(request.params);
    const plan = await prisma.trainingPlan.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          {
            gymAssignments: {
              some: {
                userId: user.id,
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
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    const enrichedPlan = await enrichTrainingPlanWithExerciseLibraryData(plan);
    return enrichedPlan;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "INVALID_INPUT", details: error.flatten() });
    }
    const typed = error as { statusCode?: number; code?: string; debug?: Record<string, unknown> };
    if (typed.statusCode) {
      return handleRequestError(reply, error);
    }
    request.log.error({ reqId, err: error }, "training-plan by id failed");
    return reply.status(500).send({ error: "INTERNAL_ERROR", reqId });
  }
});

app.get("/training-plans/active", async (request, reply) => {
  const reqId = request.id;
  try {
    const user = await requireUser(request);
    const { includeDays } = trainingPlanActiveQuerySchema.parse(request.query);

    const assignedMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        role: "MEMBER",
        assignedTrainingPlanId: { not: null },
      },
      select: { assignedTrainingPlanId: true },
      orderBy: { updatedAt: "desc" },
    });

    const activePlanId = assignedMembership?.assignedTrainingPlanId;

    if (activePlanId) {
      const assignedPlan = await prisma.trainingPlan.findUnique({
        where: { id: activePlanId },
        include: includeDays
          ? {
              days: trainingDayIncludeWithLegacySafeExercises,
            }
          : undefined,
      });

      if (assignedPlan) {
        const enrichedPlan = includeDays
          ? await enrichTrainingPlanWithExerciseLibraryData(assignedPlan)
          : assignedPlan;

        return reply.status(200).send({
          source: "assigned",
          plan: enrichedPlan,
        });
      }
    }

    const ownPlan = includeDays
      ? await prisma.trainingPlan.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          include: {
            days: trainingDayIncludeWithLegacySafeExercises,
          },
        })
      : await prisma.trainingPlan.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
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
          },
        });

    if (!ownPlan) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    const enrichedOwnPlan = includeDays ? await enrichTrainingPlanWithExerciseLibraryData(ownPlan) : ownPlan;

    return reply.status(200).send({
      source: "own",
      plan: enrichedOwnPlan,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "INVALID_INPUT", details: error.flatten() });
    }
    const typed = error as { statusCode?: number; code?: string; debug?: Record<string, unknown> };
    if (typed.statusCode) {
      return handleRequestError(reply, error);
    }
    request.log.error({ reqId, err: error }, "training-plan active failed");
    return reply.status(500).send({ error: "INTERNAL_ERROR", reqId });
  }
});

app.post("/training-plans/:planId/days/:dayId/exercises", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { planId, dayId } = trainingDayParamsSchema.parse(request.params);
    const { exerciseId, athleteUserId } = addTrainingExerciseBodySchema.parse(request.body);

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, name: true, imageUrl: true },
    });

    if (!exercise) {
      return reply.status(404).send({ error: "EXERCISE_NOT_FOUND" });
    }

    const plan = await prisma.trainingPlan.findUnique({
      where: { id: planId },
      select: { id: true, userId: true },
    });

    if (!plan) {
      return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
    }

    const isOwnPlan = plan.userId === requester.id;

    if (athleteUserId) {
      if (isOwnPlan === false) {
        return reply.status(403).send({ error: "FORBIDDEN" });
      }

      const membership = await prisma.gymMembership.findFirst({
        where: {
          userId: athleteUserId,
          status: "ACTIVE",
          role: "MEMBER",
          assignedTrainingPlanId: planId,
          gym: {
            memberships: {
              some: {
                userId: requester.id,
                status: "ACTIVE",
                role: { in: ["ADMIN", "TRAINER"] },
              },
            },
          },
        },
        select: { id: true },
      });

      if (!membership) {
        return reply.status(404).send({ error: "MEMBER_PLAN_NOT_FOUND" });
      }
    } else if (!isOwnPlan) {
      return reply.status(403).send({ error: "FORBIDDEN" });
    }

    const day = await prisma.trainingDay.findFirst({
      where: { id: dayId, planId },
      select: { id: true },
    });

    if (!day) {
      return reply.status(404).send({ error: "TRAINING_DAY_NOT_FOUND" });
    }

    const created = await prisma.trainingExercise.create({
      data: {
        dayId,
        exerciseId: exercise.id,
        imageUrl: exercise.imageUrl,
        name: exercise.name,
        sets: 3,
        reps: "10-12",
      },
    });

    return reply.status(201).send({
      exercise: created,
      sourceExercise: exercise,
      planId,
      dayId,
      athleteUserId: athleteUserId ?? null,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/gyms/:gymId/members/:userId/assign-training-plan", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { gymId, userId } = assignTrainingPlanParamsSchema.parse(request.params);
    const { trainingPlanId, templatePlanId } = assignTrainingPlanBodySchema.parse(request.body);
    const selectedPlanId = trainingPlanId ?? templatePlanId;

    await requireGymManagerForGym(requester.id, gymId);

    const [targetMembership, selectedPlan] = await Promise.all([
      prisma.gymMembership.findUnique({
        where: { gymId_userId: { gymId, userId } },
        select: {
          id: true,
          gymId: true,
          userId: true,
          status: true,
          role: true,
        },
      }),
      prisma.trainingPlan.findFirst({
        where: {
          id: selectedPlanId,
          OR: [
            { userId: requester.id },
            {
              gymAssignments: {
                some: {
                  gymId,
                  status: "ACTIVE",
                  role: "MEMBER",
                },
              },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          goal: true,
          level: true,
          daysPerWeek: true,
          focus: true,
          equipment: true,
          startDate: true,
          daysCount: true,
        },
      }),
    ]);

    if (!targetMembership || targetMembership.status !== "ACTIVE") {
      return reply.status(404).send({ error: "MEMBER_NOT_FOUND" });
    }

    if (targetMembership.role !== "MEMBER") {
      return reply.status(400).send({ error: "INVALID_MEMBER_ROLE" });
    }

    if (!selectedPlan) {
      return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
    }

    await prisma.gymMembership.update({
      where: { id: targetMembership.id },
      data: { assignedTrainingPlanId: selectedPlan.id },
    });

    return reply.status(200).send({
      planId: selectedPlan.id,
      assignedPlan: selectedPlan,
      memberId: userId,
      gymId,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/members/:userId/training-plan-assignment", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { userId } = trainerMemberParamsSchema.parse(request.params);

    const targetMembership = await prisma.gymMembership.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        role: "MEMBER",
        gym: {
          memberships: {
            some: {
              userId: requester.id,
              status: "ACTIVE",
              role: { in: ["ADMIN", "TRAINER"] },
            },
          },
        },
      },
      select: {
        id: true,
        gymId: true,
        userId: true,
        status: true,
        role: true,
        gym: { select: { id: true, name: true } },
        assignedTrainingPlan: {
          select: {
            id: true,
            title: true,
            goal: true,
            level: true,
            daysPerWeek: true,
            focus: true,
            equipment: true,
            startDate: true,
            daysCount: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!targetMembership) {
      return reply.status(404).send({ error: "MEMBER_NOT_FOUND" });
    }

    return {
      memberId: userId,
      gym: targetMembership.gym,
      assignedPlan: targetMembership.assignedTrainingPlan,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/nutrition-plans", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { query, limit, offset } = nutritionPlanListSchema.parse(request.query);
    const where: Prisma.NutritionPlanWhereInput = {
      userId: user.id,
      ...(query ? { title: { contains: query, mode: Prisma.QueryMode.insensitive } } : {}),
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

app.get("/workouts", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const workouts = await prisma.workout.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return workouts;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/workouts", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const data = workoutCreateSchema.parse(request.body);
    const workout = await prisma.workout.create({
      data: {
        name: data.name,
        notes: data.notes,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        durationMin: data.durationMin ?? null,
        userId: user.id,
        exercises: data.exercises
          ? {
              create: data.exercises.map((exercise, index) => ({
                exerciseId: exercise.exerciseId,
                name: exercise.name,
                sets: exercise.sets ?? null,
                reps: exercise.reps ?? null,
                restSeconds: exercise.restSeconds ?? null,
                notes: exercise.notes,
                order: exercise.order ?? index,
              })),
            }
          : undefined,
      },
      include: { exercises: true },
    });
    return reply.status(201).send(workout);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/workouts/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const workout = await prisma.workout.findFirst({
      where: { id, userId: user.id },
      include: { exercises: { orderBy: { order: "asc" } } },
    });
    if (!workout) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return workout;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/workouts/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const data = workoutUpdateSchema.parse(request.body);
    const updated = await prisma.$transaction(async (tx) => {
      const workout = await tx.workout.updateMany({
        where: { id, userId: user.id },
        data: {
          name: data.name,
          notes: data.notes,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          durationMin: data.durationMin,
        },
      });
      if (workout.count === 0) {
        return null;
      }
      if (data.exercises) {
        await tx.workoutExercise.deleteMany({ where: { workoutId: id } });
        await tx.workoutExercise.createMany({
          data: data.exercises.map((exercise, index) => ({
            workoutId: id,
            exerciseId: exercise.exerciseId ?? null,
            name: exercise.name,
            sets: exercise.sets ?? null,
            reps: exercise.reps ?? null,
            restSeconds: exercise.restSeconds ?? null,
            notes: exercise.notes ?? null,
            order: exercise.order ?? index,
          })),
        });
      }
      return tx.workout.findUnique({
        where: { id },
        include: { exercises: { orderBy: { order: "asc" } } },
      });
    });
    if (!updated) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return updated;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.delete("/workouts/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const workout = await prisma.workout.deleteMany({
      where: { id, userId: user.id },
    });
    if (workout.count === 0) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return reply.status(204).send();
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/workouts/:id/start", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const workout = await prisma.workout.findFirst({ where: { id, userId: user.id } });
    if (!workout) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    const session = await prisma.workoutSession.create({
      data: {
        workoutId: workout.id,
        userId: user.id,
        startedAt: new Date(),
      },
    });
    return reply.status(201).send(session);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/workout-sessions/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const data = workoutSessionUpdateSchema.parse(request.body);
    const session = await prisma.workoutSession.findFirst({
      where: { id, userId: user.id },
    });
    if (!session) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    await prisma.workoutSessionEntry.createMany({
      data: data.entries.map((entry) => ({
        sessionId: session.id,
        exercise: entry.exercise,
        sets: entry.sets,
        reps: entry.reps,
        loadKg: entry.loadKg ?? null,
        rpe: entry.rpe ?? null,
      })),
    });
    const updated = await prisma.workoutSession.findUnique({
      where: { id: session.id },
      include: { entries: true },
    });
    return updated;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/workout-sessions/:id/finish", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const session = await prisma.workoutSession.findFirst({
      where: { id, userId: user.id },
    });
    if (!session) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    const updated = await prisma.workoutSession.update({
      where: { id: session.id },
      data: { finishedAt: new Date() },
    });
    return updated;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["USER", "ADMIN"]).optional(),
  subscriptionPlan: z.enum(["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"]).optional(),
  aiTokenBalance: z.number().int().min(0).optional(),
  aiTokenMonthlyAllowance: z.number().int().min(0).optional(),
});

const adminUserIdParamsSchema = z.object({
  id: z.string().min(1),
});

const adminUserPlanUpdateSchema = z.object({
  subscriptionPlan: z.enum(["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"]),
});

const adminUserTokensUpdateSchema = z.object({
  aiTokenBalance: z.number().int().min(0).optional(),
  aiTokenMonthlyAllowance: z.number().int().min(0).optional(),
}).refine((payload) => payload.aiTokenBalance !== undefined || payload.aiTokenMonthlyAllowance !== undefined, {
  message: "At least one token field must be provided.",
});

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
  membership:
    | {
        status: "PENDING" | "ACTIVE" | "REJECTED";
        role: "ADMIN" | "TRAINER" | "MEMBER";
        gym: { id: string; name: string };
      }
    | null,
) {
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
      await requireGymManagerForGym(user.id, membership.gymId);
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
      await requireGymManagerForGym(user.id, membership.gymId);
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
    await requireGymManagerForGym(user.id, gymId);

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
          create: dates.map((date, index) => ({
            date: new Date(`${date}T00:00:00.000Z`),
            label: `Día ${index + 1}`,
            focus: payload.focus,
            duration: 45,
            order: index + 1,
          })),
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

    return {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      isBlocked: membership.user.isBlocked,
      subscriptionStatus: membership.user.subscriptionStatus,
      lastLoginAt: membership.user.lastLoginAt,
      assignedPlan: membership.assignedTrainingPlan,
      metrics: parseClientMetrics(membership.user.profile?.profile ?? null, membership.user.profile?.tracking ?? null),
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
        : user.authProviders && user.authProviders.some((provider) => provider.provider === "google")
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
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
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
          data.subscriptionPlan !== "FREE" && (data.aiTokenBalance ?? 0) > 0 ? getTokenExpiry(30) : null,
        aiTokenRenewalAt:
          data.subscriptionPlan !== "FREE" && (data.aiTokenBalance ?? 0) > 0 ? getTokenExpiry(30) : null,
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
    const { aiTokenBalance, aiTokenMonthlyAllowance } = adminUserTokensUpdateSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(aiTokenBalance !== undefined ? { aiTokenBalance } : {}),
        ...(aiTokenMonthlyAllowance !== undefined ? { aiTokenMonthlyAllowance } : {}),
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
    const { aiTokenMonthlyAllowance } = adminUserTokenAllowanceUpdateSchema.parse(request.body);

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
    const { aiTokenBalance } = adminUserTokenBalanceUpdateSchema.parse(request.body);

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

    for (const [index, name] of RECIPES_100.entries()) {
      const seed = buildRecipeSeedItem(name, index);
      await prisma.recipe.upsert({
        where: { name: seed.name },
        create: {
          name: seed.name,
          description: seed.description,
          calories: seed.calories,
          protein: seed.protein,
          carbs: seed.carbs,
          fat: seed.fat,
          steps: seed.steps,
          ingredients: {
            create: seed.ingredients.map((ingredient) => ({
              name: ingredient.name,
              grams: ingredient.grams,
            })),
          },
        },
        update: {
          description: seed.description,
          calories: seed.calories,
          protein: seed.protein,
          carbs: seed.carbs,
          fat: seed.fat,
          steps: seed.steps,
          ingredients: {
            deleteMany: {},
            create: seed.ingredients.map((ingredient) => ({
              name: ingredient.name,
              grams: ingredient.grams,
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

app.post("/dev/reset-demo", async (_request, reply) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return reply.status(403).send({ error: "FORBIDDEN" });
    }

    const result = await resetDemoState(prisma);
    return reply.status(200).send({ ok: true, ...result });
  } catch (err) {
    app.log.error({ err }, "reset demo failed");
    return reply.status(500).send({ error: "INTERNAL_ERROR" });
  }
});

await seedAdmin();

if (process.env.NODE_ENV !== "production") {
  app.log.info("Registered routes\n%s", app.printRoutes());
}

await app.listen({ port: env.PORT, host: env.HOST });
