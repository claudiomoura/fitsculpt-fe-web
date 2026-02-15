import crypto from "node:crypto";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma, type User } from "@prisma/client";
import { getEnv } from "./config.js";
import { sendEmail } from "./email.js";
import { hashToken, isPromoCodeValid } from "./authUtils.js";
import { AiParseError, parseJsonFromText, parseLargestJsonFromText, parseTopLevelJsonFromText } from "./aiParsing.js";
import { chargeAiUsage, chargeAiUsageForResult } from "./ai/chargeAiUsage.js";
import { loadAiPricing } from "./ai/pricing.js";
import "dotenv/config";
import { nutritionPlanJsonSchema } from "./lib/ai/schemas/nutritionPlanJsonSchema.js";
import { trainingPlanJsonSchema } from "./lib/ai/schemas/trainingPlanJsonSchema.js";




const env = getEnv();
const prisma = new PrismaClient();
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
  email?: string | null;
  created?: number | null;
};

type StripeCustomerList = {
  data: StripeCustomer[];
};

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

function requireStripeSecret() {
  if (!env.STRIPE_SECRET_KEY) {
    throw createHttpError(500, "STRIPE_NOT_CONFIGURED");
  }
  return env.STRIPE_SECRET_KEY;
}

function requireStripePriceId() {
  if (!env.STRIPE_PRO_PRICE_ID) {
    throw createHttpError(500, "STRIPE_PRICE_NOT_CONFIGURED");
  }
  return env.STRIPE_PRO_PRICE_ID;
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
    plan: "FREE" | "PRO";
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
    plan: "FREE" | "PRO";
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

function subscriptionHasPrice(subscription: StripeSubscription, priceId: string) {
  const items = subscription.items?.data ?? [];
  return items.some((item) => item.price?.id === priceId);
}

async function getLatestActiveSubscription(customerId: string, priceId?: string) {
  const subscriptions = await stripeRequest<StripeSubscriptionList>(
    "subscriptions",
    { customer: customerId, status: "all", limit: 100, "expand[0]": "data.items.data.price" },
    { method: "GET" }
  );
  const activeSubscriptions = subscriptions.data.filter((subscription) => {
    if (!isActiveSubscriptionStatus(subscription.status)) return false;
    if (!priceId) return true;
    return subscriptionHasPrice(subscription, priceId);
  });
  if (activeSubscriptions.length === 0) {
    return null;
  }
  return activeSubscriptions.sort((a, b) => (b.current_period_end ?? 0) - (a.current_period_end ?? 0))[0] ?? null;
}

function getSubscriptionPeriodEnd(subscription?: StripeSubscription | null) {
  if (!subscription?.current_period_end) return null;
  return new Date(subscription.current_period_end * 1000);
}

function invoiceHasPrice(invoice: StripeInvoice, priceId: string) {
  const lines = invoice.lines?.data ?? [];
  return lines.some((line) => line.price?.id === priceId);
}

async function findLatestCustomerByEmail(email: string) {
  const customers = await stripeRequest<StripeCustomerList>(
    "customers",
    { email, limit: 10 },
    { method: "GET" }
  );
  if (!customers.data.length) {
    return null;
  }
  return (
    customers.data.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0] ?? null
  );
}

async function syncUserBillingFromStripe(user: User) {
  const priceId = requireStripePriceId();
  let stripeCustomerId = user.stripeCustomerId ?? null;
  if (!stripeCustomerId && user.email) {
    const latestCustomer = await findLatestCustomerByEmail(user.email);
    if (latestCustomer?.id) {
      stripeCustomerId = latestCustomer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }
  }

  if (!stripeCustomerId) {
    await prisma.user.update({
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
    return;
  }

  const activeSubscription = await getLatestActiveSubscription(stripeCustomerId, priceId);
  if (!activeSubscription) {
    await prisma.user.update({
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
    return;
  }

  const currentPeriodEnd = getSubscriptionPeriodEnd(activeSubscription);
  const currentTokenExpiryAt = getUserTokenExpiryAt(user);
  const tokensExpired = currentTokenExpiryAt ? currentTokenExpiryAt.getTime() < Date.now() : true;
  const currentTokenBalance = getUserTokenBalance(user);
  const shouldTopUpTokens = tokensExpired || currentTokenBalance <= 0;
  const nextResetAt = currentPeriodEnd ?? getTokenExpiry(30);
  const nextRenewalAt = nextResetAt;
  const nextBalance = shouldTopUpTokens ? 5000 : currentTokenBalance;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: "PRO",
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
        tokenPreview: token.slice(0, 20),
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
      const tokenPreview = token.slice(0, 20);
      app.log.warn(
        {
          route,
          reason: typed.message ?? typed.code ?? typed.name ?? "JWT_VERIFY_FAILED",
          source,
          hasBearerPrefix,
          segments,
          hasPercent,
          tokenPreview,
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

function buildActivationCode(name: string, userId: string, attempt: number) {
  const seed = `${name}:${userId}:${Date.now().toString(36)}:${attempt}`;
  const hash = crypto.createHash("sha256").update(seed).digest("hex").toUpperCase();
  return hash.slice(0, 8);
}

async function generateUniqueGymActivationCode(name: string, userId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = buildActivationCode(name, userId, attempt);
    const existing = await prisma.gym.findUnique({ where: { activationCode: code } });
    if (!existing) {
      return code;
    }
  }
  throw createHttpError(500, "JOIN_CODE_GENERATION_FAILED");
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

type AuthenticatedRequest = FastifyRequest & { currentUser?: User };

async function aiAccessGuard(request: FastifyRequest, reply: FastifyReply) {
  const user = await requireUser(request, { logContext: request.routeOptions?.url ?? "ai" });
  const effectiveTokens = getEffectiveTokenBalance(user);
  if (effectiveTokens <= 0) {
    return reply.status(402).send({ code: "UPGRADE_REQUIRED" });
  }
  (request as AuthenticatedRequest).currentUser = user;
}

const checkinSchema = z.object({
  id: z.string(),
  date: z.string(),
  weightKg: z.number(),
  chestCm: z.number(),
  waistCm: z.number(),
  hipsCm: z.number(),
  bicepsCm: z.number(),
  thighCm: z.number(),
  calfCm: z.number(),
  neckCm: z.number(),
  bodyFatPercent: z.number(),
  energy: z.number(),
  hunger: z.number(),
  notes: z.string(),
  recommendation: z.string(),
  frontPhotoUrl: z.string().nullable(),
  sidePhotoUrl: z.string().nullable(),
});

const foodEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  foodKey: z.string(),
  grams: z.number(),
});

const workoutEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  name: z.string(),
  durationMin: z.number(),
  notes: z.string(),
});

const trackingSchema = z.object({
  checkins: z.array(checkinSchema),
  foodLog: z.array(foodEntrySchema),
  workoutLog: z.array(workoutEntrySchema),
});

const trackingDeleteSchema = z.object({
  collection: z.enum(["checkins", "foodLog", "workoutLog"]),
  id: z.string().min(1),
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

const defaultTracking = {
  checkins: [],
  foodLog: [],
  workoutLog: [],
};

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
    dailyCalories: z.coerce.number().min(1200).max(4000),
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

function toIsoDateString(date: Date) {
  return date.toISOString().slice(0, 10);
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
  const limit = user.plan === "PRO" ? env.AI_DAILY_LIMIT_PRO : env.AI_DAILY_LIMIT_FREE;
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

function buildTrainingTemplate(params: z.infer<typeof aiTrainingSchema>) {
  if (params.focus !== "ppl" || params.level !== "intermediate" || params.daysPerWeek < 3) {
    return null;
  }
  
  const daysPerWeek = Math.min(params.daysPerWeek, 7);
  const ex = (
  name: string,
  sets: number,
  reps: string,
  tempo = "2-0-1",
  rest = 90,
  notes = "Técnica limpia, controla la bajada."
) => ({ name, sets, reps, tempo, rest, notes });

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

function buildTrainingPrompt(data: z.infer<typeof aiTrainingSchema>, strict = false) {
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
'{"title":string,"startDate":string|null,"notes":string|null,"days":[{"date":string|null,"label":string,"focus":string,"duration":number,"exercises":[{"name":string,"sets":number,"reps":string|null,"tempo":string|null,"rest":number|null,"notes":string|null}]}]}',    "Usa ejercicios reales acordes al equipo disponible. No incluyas máquinas si el equipo es solo en casa.",
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
    "En cada ejercicio incluye name (español), sets (number) y reps (string). tempo/rest/notes solo si son cortos.",
    "Ejemplo EXACTO de JSON (solo ejemplo, respeta tipos y campos):",
    '{"title":"Plan semanal compacto","startDate":"2024-01-01","notes":"Enfoque simple.","days":[{"date":"2024-01-01","label":"Día 1","focus":"Full body","duration":45,"exercises":[{"name":"Sentadilla","sets":3,"reps":"8-10"},{"name":"Press banca","sets":3,"reps":"8-10"},{"name":"Remo con barra","sets":3,"reps":"8-10"}]}]}',
  ]
    .filter(Boolean)
    .join(" ");
}

type RecipePromptItem = {
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
    return `- ${recipe.name}: ${recipe.description ?? "Sin descripción"}. Macros base ${Math.round(
      recipe.calories
    )} kcal, P${Math.round(recipe.protein)} C${Math.round(recipe.carbs)} G${Math.round(recipe.fat)}.`;
  });
  return lines.join(" ");
}

function roundToNearest5(value: number) {
  return Math.round(value / 5) * 5;
}

type RecipeSeedItem = {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  steps: string[];
  ingredients: Array<{ name: string; grams: number }>;
};

type RecipeDbItem = {
  name: string;
  description: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  steps: string[];
  ingredients: Array<{ name: string; grams: number }>;
};

function applyRecipeScalingToPlan(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  recipes: RecipeDbItem[]
) {
  if (!recipes.length) return plan;
  const recipeMap = new Map(recipes.map((recipe) => [recipe.name.toLowerCase(), recipe]));
  plan.days.forEach((day) => {
    day.meals.forEach((meal) => {
      const recipe = recipeMap.get(meal.title.toLowerCase());
      if (!recipe) return;
      const baseCalories = recipe.calories;
      const targetCalories = meal.macros?.calories ?? baseCalories;
      if (!baseCalories || !targetCalories || !Number.isFinite(targetCalories)) return;
      const scale = targetCalories / baseCalories;
      const scaledIngredients = recipe.ingredients.map((ingredient) => ({
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

async function upsertRecipesFromPlan(plan: z.infer<typeof aiNutritionPlanResponseSchema>) {
  const meals = plan.days.flatMap((day) => day.meals);
  if (meals.length === 0) return;

  const recipeSeeds = meals.map((meal) => ({
    name: meal.title.trim(),
    description: meal.description ?? null,
    calories: meal.macros.calories,
    protein: meal.macros.protein,
    carbs: meal.macros.carbs,
    fat: meal.macros.fats,
    steps: ["Preparar los ingredientes.", "Cocinar según preferencia.", "Servir."],
    ingredients: meal.ingredients ?? null,
  }));

  await prisma.$transaction(
    recipeSeeds.map((recipe) => {
      const ingredientCreates = (recipe.ingredients ?? []).map((ingredient) => ({
        name: ingredient.name,
        grams: ingredient.grams,
      }));

      return prisma.recipe.upsert({
        where: { name: recipe.name },
        create: {
          name: recipe.name,
          description: recipe.description,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          steps: recipe.steps,
          ingredients: ingredientCreates.length ? { create: ingredientCreates } : undefined,
        },
        update: {
          description: recipe.description,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          steps: recipe.steps,
          ingredients: {
            deleteMany: {},
            ...(ingredientCreates.length ? { create: ingredientCreates } : {}),
          },
        },
      });
    })
  );
}


async function saveNutritionPlan(
  userId: string,
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  startDate: Date,
  daysCount: number
) {
  return prisma.$transaction(
    async (tx) => {
      const planRecord = await tx.nutritionPlan.upsert({
        where: { userId_startDate_daysCount: { userId, startDate, daysCount } },
        create: {
          userId,
          title: plan.title,
          dailyCalories: plan.dailyCalories,
          proteinG: plan.proteinG,
          fatG: plan.fatG,
          carbsG: plan.carbsG,
          startDate,
          daysCount,
        },
        update: {
          title: plan.title,
          dailyCalories: plan.dailyCalories,
          proteinG: plan.proteinG,
          fatG: plan.fatG,
          carbsG: plan.carbsG,
        },
      });

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
}

async function saveTrainingPlan(
  userId: string,
  plan: z.infer<typeof aiTrainingPlanResponseSchema>,
  startDate: Date,
  daysCount: number,
  request: z.infer<typeof aiTrainingSchema>
) {
  return prisma.$transaction(async (tx) => {
    const planRecord = await tx.trainingPlan.upsert({
      where: { userId_startDate_daysCount: { userId, startDate, daysCount } },
      create: {
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
      },
      update: {
        title: plan.title,
        notes: plan.notes,
        goal: request.goal,
        level: request.level,
        daysPerWeek: request.daysPerWeek,
        focus: request.focus,
        equipment: request.equipment,
      },
    });

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
}

function buildNutritionPrompt(
  data: z.infer<typeof aiNutritionSchema>,
  recipes: RecipePromptItem[] = [],
  strict = false
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
'{"title":string,"startDate":string|null,"dailyCalories":number,"proteinG":number,"fatG":number,"carbsG":number,"days":[{"date":string,"dayLabel":string,"meals":[{"type":string,"title":string,"description":string|null,"macros":{"calories":number,"protein":number,"carbs":number,"fats":number},"ingredients":array|null}]}],"shoppingList":array|null}',
    "OBLIGATORIO: cada día debe tener EXACTAMENTE el número de meals solicitado (si >6 usa 6).",
    `Estructura de meals: ${mealStructure}`,
    `Genera EXACTAMENTE ${daysCount} días con date (YYYY-MM-DD) desde ${data.startDate ?? "la fecha indicada"}.`,
    "Descripción opcional. Ingredients opcional; si hay receta base, omite ingredients o déjalo vacío.",
    "Base mediterránea: verduras, frutas, legumbres, cereales integrales, aceite de oliva, pescado, carne magra y frutos secos.",
    "Evita cantidades absurdas. Porciones realistas y fáciles de cocinar.",
    "Distribuye proteína, carbohidratos y grasas a lo largo del día.",
    strict ? "REINTENTO: si los meals por día no coinciden exactamente, la respuesta será rechazada." : "",
    recipeLibrary
      ? `OBLIGATORIO: No inventes platos fuera del listado. Usa titles exactamente como en la biblioteca. Lista: ${recipeLibrary}`
      : "Si no hay recetas base disponibles, crea platos sencillos y coherentes.",
    `Perfil: Edad ${data.age}, sexo ${data.sex}, objetivo ${data.goal}.`,
    `Calorías objetivo diarias: ${data.calories}. Comidas/día: ${data.mealsPerDay}.`,
    `Restricciones o preferencias: ${data.dietaryRestrictions ?? "ninguna"}.`,
    `Tipo de dieta: ${data.dietType ?? "equilibrada"}.`,
    `Alergias: ${data.allergies?.join(", ") ?? "ninguna"}.`,
    `Preferencias (favoritos): ${data.preferredFoods ?? "ninguna"}.`,
    `Alimentos a evitar: ${data.dislikedFoods ?? "ninguno"}.`,
    `Distribución de comidas: ${distribution} ${distributionPercentages}.`,
    "Cada día debe incluir dayLabel en español (por ejemplo Lunes, Martes, Miércoles).",
    "Usa siempre type y macros en cada comida.",
    "Los macros diarios (proteinG, fatG, carbsG) deben ser coherentes con dailyCalories.",
    "Incluye title, dailyCalories, proteinG, fatG y carbsG siempre.",
    "Ejemplo EXACTO de JSON (solo ejemplo, respeta tipos y campos):",
    '{"title":"Plan mediterráneo compacto","startDate":"2024-01-01","dailyCalories":2200,"proteinG":140,"fatG":70,"carbsG":250,"days":[{"date":"2024-01-01","dayLabel":"Lunes","meals":[{"type":"breakfast","title":"Avena con yogur","macros":{"calories":450,"protein":25,"carbs":45,"fats":18},"ingredients":[{"name":"Avena","grams":60},{"name":"Yogur griego","grams":180}]},{"type":"lunch","title":"Pollo con arroz","macros":{"calories":700,"protein":45,"carbs":70,"fats":25},"ingredients":[{"name":"Pollo","grams":160},{"name":"Arroz integral","grams":180}]},{"type":"dinner","title":"Salmón con verduras","macros":{"calories":800,"protein":50,"carbs":60,"fats":28},"ingredients":[{"name":"Salmón","grams":160},{"name":"Verduras mixtas","grams":200}]}]}]}',
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

function ensureNutritionDayCount(
  days: z.infer<typeof aiNutritionPlanResponseSchema>["days"],
  daysCount: number
) {
  if (days.length === 0) return days;
  if (days.length === daysCount) return days;
  const next: z.infer<typeof aiNutritionPlanResponseSchema>["days"] = [];
  for (let i = 0; i < daysCount; i += 1) {
    const source = days[i % days.length];
    next.push({
      ...source,
      meals: source.meals.map((meal) => ({
        ...meal,
        macros: { ...meal.macros },
     ingredients: meal.ingredients ? meal.ingredients.map((ingredient) => ({ ...ingredient })) : null,

      })),
    });
  }
  return next;
}

function normalizeNutritionPlanDays(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>,
  startDate: Date,
  daysCount: number
): z.infer<typeof aiNutritionPlanResponseSchema> {
  const normalizedDays = ensureNutritionDayCount(plan.days, daysCount);
  const dates = buildDateRange(startDate, daysCount);
  const daysWithDates = normalizedDays.map((day, index) => ({
    ...day,
    date: dates[index],
  }));
  return {
    ...plan,
    startDate: toIsoDateString(startDate),
    days: daysWithDates,
  };
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

function parseNutritionPlanPayload(payload: Record<string, unknown>, startDate: Date, daysCount: number) {
  try {
    return normalizeNutritionPlanDays(aiNutritionPlanResponseSchema.parse(payload), startDate, daysCount);
  } catch (error) {
    app.log.warn({ err: error, payload }, "ai nutrition response invalid");
    throw createHttpError(502, "AI_PARSE_ERROR");
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
    throw createHttpError(502, "AI_PARSE_ERROR", { expectedDays, actualDays: plan.days.length });
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
    throw createHttpError(502, "AI_PARSE_ERROR", {
      expectedMealsPerDay,
      actualMealsPerDay: invalid.meals.length,
      dayLabel: invalid.dayLabel,
    });
  }
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

function normalizeExerciseName(name: string) {
  return name.trim().replace(/\s+/g, " ");
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

type ExerciseRow = {
  id: string;
  slug?: string | null;
  name: string;
  equipment: string | null;
  description: string | null;
  technique?: string | null;
  tips?: string | null;
  mainMuscleGroup?: string | null;
  secondaryMuscleGroups?: string[] | null;
  primaryMuscles?: string[] | null;
  secondaryMuscles?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

type ExerciseApiDto = {
  id: string;
  slug: string;
  name: string;
  equipment: string | null;
  mainMuscleGroup: string | null;
  secondaryMuscleGroups: string[];
  description: string | null;
  technique: string | null;
  tips: string | null;
};

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

function normalizeExercisePayload(exercise: ExerciseRow): ExerciseApiDto {
  const main =
    typeof exercise.mainMuscleGroup === "string" && exercise.mainMuscleGroup.trim()
      ? exercise.mainMuscleGroup
      : Array.isArray(exercise.primaryMuscles)
        ? exercise.primaryMuscles.find((muscle) => typeof muscle === "string" && muscle.trim())
        : null;

  const secondarySource = Array.isArray(exercise.secondaryMuscleGroups)
    ? exercise.secondaryMuscleGroups
    : Array.isArray(exercise.secondaryMuscles)
      ? exercise.secondaryMuscles
      : [];

  const secondaryMuscleGroups = secondarySource.filter(
    (muscle): muscle is string => typeof muscle === "string" && muscle.trim().length > 0
  );

  return {
    id: exercise.id,
    slug: exercise.slug ?? slugifyName(exercise.name),
    name: exercise.name,
    equipment: exercise.equipment ?? null,
    description: exercise.description ?? null,
    technique: exercise.technique ?? null,
    tips: exercise.tips ?? null,
    mainMuscleGroup: main ?? null,
    secondaryMuscleGroups,
  };
}


async function upsertExerciseRecord(name: string, metadata?: ExerciseMetadata) {
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
        mainMuscleGroup,
        secondaryMuscleGroups,
        equipment: metadata?.equipment ?? null,
        description: metadata?.description ?? null,
        technique: null,
        tips: null,
        isUserCreated: false,
      },
      update: {
        name,
        mainMuscleGroup,
        secondaryMuscleGroups,
        equipment: metadata?.equipment ?? undefined,
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
      "mainMuscleGroup",
      "secondaryMuscleGroups",
      "equipment",
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
      ${mainMuscleGroup},
      ${secondaryMuscleGroups},
      ${metadata?.equipment ?? null},
      ${metadata?.description ?? null},
      ${null},
      ${null},
      ${false},
      ${now},
      ${now}
    )
    ON CONFLICT ("slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "mainMuscleGroup" = EXCLUDED."mainMuscleGroup",
      "secondaryMuscleGroups" = EXCLUDED."secondaryMuscleGroups",
      "equipment" = EXCLUDED."equipment",
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
      ? Prisma.sql`WHERE ${Prisma.join(filters, Prisma.sql` AND `)}`
      : Prisma.sql``;

  return whereClause;
}

async function listExercises(params: {
  q?: string;
  primaryMuscle?: string;
  equipment?: string;
  limit: number;
  offset: number;
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
    const [items, total] = await prisma.$transaction([
      prisma.exercise.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          equipment: true,
          description: true,
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
  const items = await prisma.$queryRaw<ExerciseRow[]>(Prisma.sql`
    SELECT "id", "slug", "name", "equipment", "mainMuscleGroup", "secondaryMuscleGroups", "description", "technique", "tips", "createdAt", "updatedAt"
    FROM "Exercise"
    ${whereSql}
    ORDER BY "name" ASC
    LIMIT ${params.limit}
    OFFSET ${params.offset}
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
        slug: true,
        name: true,
        equipment: true,
        description: true,
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
    SELECT "id", "slug", "name", "equipment", "mainMuscleGroup", "secondaryMuscleGroups", "description", "technique", "tips", "createdAt", "updatedAt"
    FROM "Exercise"
    WHERE "id" = ${id}
    LIMIT 1
  `);
  return rows[0] ? normalizeExercisePayload(rows[0]) : null;
}

async function upsertExercisesFromPlan(plan: z.infer<typeof aiTrainingPlanResponseSchema>) {
  if (!hasExerciseClient()) {
    app.log.warn("prisma.exercise is unavailable, using raw upsert fallback");
  }
  const names = new Map<string, string>();
  plan.days.forEach((day) => {
    day.exercises.forEach((exercise) => {
      const normalized = normalizeExerciseName(exercise.name);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (!names.has(key)) {
        names.set(key, normalized);
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

type OpenAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type OpenAiResponse = {
  payload: Record<string, unknown>;
  usage: OpenAiUsage | null;
  model: string | null;
  requestId: string | null;
};

type OpenAiResponseFormat =
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: {
        name: string;
        schema: Record<string, unknown>;
        strict?: boolean;
      };
    };

type OpenAiOptions = {
  parser?: (content: string) => Record<string, unknown>;
  maxTokens?: number;
  responseFormat?: OpenAiResponseFormat;
  model?: string;
  retryOnParseError?: boolean;
};

async function callOpenAi(
  prompt: string,
  attempt = 0,
  parser: (content: string) => Record<string, unknown> = extractJson,
  options?: OpenAiOptions
): Promise<OpenAiResponse> {
  if (!env.OPENAI_API_KEY) {
    throw createHttpError(503, "AI_UNAVAILABLE");
  }
  const systemMessage =
    attempt === 0
      ? "Devuelve exclusivamente JSON valido. Sin markdown. Sin texto extra."
      : "DEVUELVE SOLO JSON VÁLIDO. Sin markdown. Sin texto extra.";
  const responseFormat = options?.responseFormat ?? { type: "json_object" };
  const maxTokens = options?.maxTokens ?? 250;
  const model = options?.model ?? "gpt-3.5-turbo";
  const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      response_format: responseFormat,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: attempt === 0 ? 0.4 : 0.2,
    }),
  });
if (!response.ok) {
  const errText = await response.text().catch(() => "");
  const requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id");
  app.log.error(
    { status: response.status, requestId, errText: errText.slice(0, 2000) },
    "openai request failed"
  );
  throw createHttpError(502, "AI_REQUEST_FAILED", {
    status: response.status,
    requestId,
    ...(process.env.NODE_ENV === "production" ? {} : { errText: errText.slice(0, 2000) }),
  });
}


  const requestId =
    response.headers.get("x-request-id") ??
    response.headers.get("openai-request-id") ??
    response.headers.get("x-openai-request-id");
const data = (await response.json()) as {
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices?: Array<{ message?: { content?: string } }>;
};

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw createHttpError(502, "AI_EMPTY_RESPONSE");
  }
  try {
    app.log.info({ attempt, rawResponse: content }, "ai raw response");
    const parsedPayload = (options?.parser ?? parser)(content);
    return {
      payload: parsedPayload,
      usage: data.usage ?? null,
      model: data.model ?? null,
      requestId,
    };
  } catch (error) {
    const typed = error as { code?: string };
    const retryOnParseError = options?.retryOnParseError ?? true;
    if (typed.code === "AI_PARSE_ERROR" && attempt === 0 && retryOnParseError) {
      app.log.warn({ err: error }, "ai response parse failed, retrying with strict json request");
      return callOpenAi(prompt, 1, parser, options);
    }
    throw error;
  }
}

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type TrackingSnapshot = {
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

function buildFeedSummary(profile: Record<string, unknown> | null, tracking: TrackingSnapshot | null) {
  const name = typeof profile?.name === "string" ? profile.name : "tu";
  const normalizedTracking: TrackingSnapshot = tracking ?? {};
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
  <html lang="es">
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
  try {
    const user = await requireUser(request);
    const priceId = requireStripePriceId();
    const idempotencyKey = `checkout-${user.id}-${Date.now()}`;
    let customerId = user.stripeCustomerId ?? null;
    if (!customerId && user.email) {
      const latestCustomer = await findLatestCustomerByEmail(user.email);
      if (latestCustomer?.id) {
        customerId = latestCustomer.id;
        await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
      }
    }
    const hasActiveLocal = isActiveSubscriptionStatus(user.subscriptionStatus);
    if (hasActiveLocal && !customerId) {
      return reply.status(200).send({ alreadySubscribed: true });
    }
    if (!customerId) {
      const customer = await stripeRequest<{ id: string }>("customers", {
        email: user.email,
        name: user.name ?? undefined,
        "metadata[userId]": user.id,
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    if (customerId) {
      const activeSubscription = await getLatestActiveSubscription(customerId, priceId);
      if (activeSubscription && isActiveSubscriptionStatus(activeSubscription.status)) {
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
    }
    if (hasActiveLocal) {
      request.log.info({ userId: user.id }, "billing checkout blocked due to active subscription");
      return reply.status(200).send({ alreadySubscribed: true });
    }

    const session = await stripeRequest<StripeCheckoutSession>(
      "checkout/sessions",
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: user.id,
        "metadata[userId]": user.id,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": 1,
        "subscription_data[metadata][userId]": user.id,
        success_url: `${env.APP_BASE_URL}/app/settings/billing?checkout=success`,
        cancel_url: `${env.APP_BASE_URL}/app/settings/billing?checkout=cancel`,
      },
      { idempotencyKey }
    );

    if (!session.url) {
      throw createHttpError(502, "STRIPE_CHECKOUT_URL_MISSING");
    }
    return { url: session.url };

  } catch (err: any) {
    request.log.error(
      {
        message: err?.message,
        code: err?.code,
        statusCode: err?.statusCode,
        debug: err?.debug,
        stripeStatus: err?.debug?.status,
        stripeBody: err?.debug?.body,
      },
      "billing checkout failed"
    );

    return reply.code(502).send({ error: "checkout_failed" });
  }
});

app.post("/billing/portal", async (request, reply) => {
  try {
    const user = await requireUser(request);
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeRequest<{ id: string }>("customers", {
        email: user.email,
        name: user.name ?? undefined,
        "metadata[userId]": user.id,
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }
    const session = await stripeRequest<StripePortalSession>("billing_portal/sessions", {
      customer: customerId,
      return_url: `${env.APP_BASE_URL}/app/settings/billing`,
    });
    return { url: session.url };
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
          const priceId = requireStripePriceId();
          const activeSubscription = await getLatestActiveSubscription(customerId, priceId);
          const cancellationStatuses = new Set(["canceled", "unpaid", "incomplete_expired"]);
          if (activeSubscription) {
            const currentPeriodEnd = getSubscriptionPeriodEnd(activeSubscription);
            await updateUserSubscriptionForCustomer(customerId, {
              plan: "PRO",
              subscriptionStatus: activeSubscription.status,
              stripeSubscriptionId: activeSubscription.id,
              currentPeriodEnd,
            });
            app.log.info(
              {
                stripeCustomerId: customerId,
                plan: "PRO",
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
        const priceId = requireStripePriceId();
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
        if (invoiceHasPrice(fullInvoice, priceId)) {
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
              plan: "PRO",
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
                plan: "PRO",
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
        const priceId = requireStripePriceId();
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
        if (invoiceHasPrice(fullInvoice, priceId)) {
          const customerId = fullInvoice.customer ?? null;
          if (customerId) {
            const activeSubscription = await getLatestActiveSubscription(customerId, priceId);
            if (!activeSubscription) {
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
      }

      return reply.status(200).send({ received: true });
    } catch (error) {
      return handleRequestError(reply, error);
    }
  }
);

app.get("/auth/me", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const effectiveIsAdmin = user.role === "ADMIN" || isBootstrapAdmin(user.email);
    const activeMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: effectiveIsAdmin ? "ADMIN" : user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      subscriptionPlan: user.plan,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      aiTokenBalance: getEffectiveTokenBalance(user),
      aiTokenRenewalAt: getUserTokenExpiryAt(user),
      gymMembershipState: activeMembership ? "active" : "none",
      gymId: activeMembership?.gym.id,
      gymName: activeMembership?.gym.name,
      isTrainer:
        activeMembership?.status === "ACTIVE" &&
        (activeMembership?.role === "TRAINER" || activeMembership?.role === "ADMIN"),
    };
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
    const plan = syncError ? "FREE" : rawPlan === "PRO" && isActive ? "PRO" : "FREE";
    const response = {
      plan,
      isPro: plan === "PRO",
      tokens,
      tokensExpiresAt: tokenExpiryAt ? tokenExpiryAt.toISOString() : null,
      subscriptionStatus,
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

app.delete("/tracking/:collection/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const params = trackingDeleteSchema.parse(request.params);
    const profile = await getOrCreateProfile(user.id);
    const currentTracking =
      typeof profile.tracking === "object" && profile.tracking ? (profile.tracking as TrackingSnapshot) : defaultTracking;
const rawList = currentTracking[params.collection];
const currentList = Array.isArray(rawList) ? rawList : [];
const nextList = currentList.filter((entry) => entry.id !== params.id);

    const nextTracking = { ...currentTracking, [params.collection]: nextList };
    const updated = await prisma.userProfile.update({
      where: { userId: user.id },
      data: { tracking: nextTracking },
    });
    return updated.tracking ?? defaultTracking;
  } catch (error) {
    return handleRequestError(reply, error);
  }
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
    const user = (request as AuthenticatedRequest).currentUser ?? (await requireUser(request));
    const dateKey = toDateKey();
    const limit = user.plan === "PRO" ? env.AI_DAILY_LIMIT_PRO : env.AI_DAILY_LIMIT_FREE;
    const usage = await prisma.aiUsage.findUnique({
      where: { userId_date: { userId: user.id, date: dateKey } },
    });
    const usedToday = usage?.count ?? 0;
    const remainingToday = limit > 0 ? Math.max(0, limit - usedToday) : 0;
    return reply.status(200).send({
      subscriptionPlan: user.plan,
      plan: user.plan,
      dailyLimit: limit,
      usedToday,
      remainingToday,
      retryAfterSec: getSecondsUntilNextUtcDay(),
      aiTokenBalance: user.plan === "PRO" ? getEffectiveTokenBalance(user) : null,
      aiTokenRenewalAt: user.plan === "PRO" ? getUserTokenExpiryAt(user) : null,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/ai/training-plan", { preHandler: aiAccessGuard }, async (request, reply) => {
  try {
    logAuthCookieDebug(request, "/ai/training-plan");
    const user =
      (request as AuthenticatedRequest).currentUser ?? (await requireUser(request, { logContext: "/ai/training-plan" }));
    await requireCompleteProfile(user.id);
    const data = aiTrainingSchema.parse(request.body);
    const expectedDays = Math.min(data.daysPerWeek, 7);
    const daysCount = Math.min(data.daysCount ?? 7, 14);
    const startDate = parseDateInput(data.startDate) ?? new Date();
    const cacheKey = buildCacheKey("training", data);
    const template = buildTrainingTemplate(data);
    const effectiveTokens = getEffectiveTokenBalance(user);
    const aiMeta =
      user.plan === "PRO"
        ? { aiTokenBalance: effectiveTokens, aiTokenRenewalAt: getUserTokenExpiryAt(user) }
        : { aiTokenBalance: null, aiTokenRenewalAt: null };

    if (template) {
      const normalized = normalizeTrainingPlanDays(template, startDate, daysCount, expectedDays);
      const personalized = applyPersonalization(normalized, { name: data.name });
      assertTrainingMatchesRequest(personalized, expectedDays);
      await upsertExercisesFromPlan(personalized);
      await saveTrainingPlan(user.id, personalized, startDate, daysCount, data);
      await storeAiContent(user.id, "training", "template", personalized);
      return reply.status(200).send({
        plan: personalized,
        ...aiMeta,
      });
    }

    const cached = await getCachedAiPayload(cacheKey);
    if (cached) {
      try {
        const validated = parseTrainingPlanPayload(cached, startDate, daysCount, expectedDays);
        assertTrainingMatchesRequest(validated, expectedDays);
        const personalized = applyPersonalization(validated, { name: data.name });
        await upsertExercisesFromPlan(personalized);
        await saveTrainingPlan(user.id, personalized, startDate, daysCount, data);
        await storeAiContent(user.id, "training", "cache", personalized);
        return reply.status(200).send({
          plan: personalized,
          ...aiMeta,
        });
      } catch (error) {
        app.log.warn({ err: error, cacheKey }, "cached training plan invalid, regenerating");
      }
    }

    await enforceAiQuota({ id: user.id, plan: user.plan });
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
      const prompt = buildTrainingPrompt(data, attempt > 0);
      if (user.plan === "PRO") {
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
            aiResult = result;
            aiAttemptUsed = attempt;
          } else {
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
    await upsertExercisesFromPlan(parsedPayload);
    await saveCachedAiPayload(cacheKey, "training", parsedPayload);
    const personalized = applyPersonalization(parsedPayload, { name: data.name });
    await saveTrainingPlan(user.id, personalized, startDate, daysCount, data);
    await storeAiContent(user.id, "training", "ai", personalized);
    if (user.plan === "PRO" && aiResult) {
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
    } else if (user.plan === "PRO") {
      app.log.info(
        { userId: user.id, feature: "training", charged: false, failureReason: "missing_ai_result" },
        "ai charge skipped"
      );
    }
    return reply.status(200).send({
      plan: personalized,
      aiTokenBalance: user.plan === "PRO" ? aiTokenBalance : null,
      aiTokenRenewalAt: user.plan === "PRO" ? getUserTokenExpiryAt(user) : null,
      ...(user.plan === "PRO" ? { nextBalance: aiTokenBalance } : {}),
      ...(debit ? { debit } : {}),
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/ai/nutrition-plan", { preHandler: aiAccessGuard }, async (request, reply) => {
  try {
    logAuthCookieDebug(request, "/ai/nutrition-plan");
    const user =
      (request as AuthenticatedRequest).currentUser ??
      (await requireUser(request, { logContext: "/ai/nutrition-plan" }));
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
    const template = buildNutritionTemplate(data);
    const effectiveTokens = getEffectiveTokenBalance(user);
    const aiMeta =
      user.plan === "PRO"
        ? { aiTokenBalance: effectiveTokens, aiTokenRenewalAt: getUserTokenExpiryAt(user) }
        : { aiTokenBalance: null, aiTokenRenewalAt: null };

    if (template) {
      const normalized = normalizeNutritionPlanDays(template, startDate, daysCount);
      logNutritionMealsPerDay(normalized, expectedMealsPerDay, "before_normalize");
      const normalizedMeals = normalizeNutritionMealsPerDay(normalized, expectedMealsPerDay);
      logNutritionMealsPerDay(normalizedMeals, expectedMealsPerDay, "after_normalize");
      const personalized = applyPersonalization(normalizedMeals, { name: data.name });
      assertNutritionMatchesRequest(personalized, expectedMealsPerDay, daysCount);
      await saveNutritionPlan(user.id, personalized, startDate, daysCount);
      await upsertRecipesFromPlan(personalized);
      await storeAiContent(user.id, "nutrition", "template", personalized);
      return reply.status(200).send({
        plan: personalized,
        ...aiMeta,
      });
    }

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

    const cached = await getCachedAiPayload(cacheKey);
    if (cached) {
      try {
        const validated = parseNutritionPlanPayload(cached, startDate, daysCount);
        assertNutritionMatchesRequest(validated, expectedMealsPerDay, daysCount);
        const scaled = applyRecipeScalingToPlan(
          validated,
          recipes.map((recipe) => ({
            name: recipe.name,
            description: recipe.description,
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            steps: recipe.steps,
            ingredients: recipe.ingredients.map((ingredient) => ({
              name: ingredient.name,
              grams: ingredient.grams,
            })),
          }))
        );
        logNutritionMealsPerDay(scaled, expectedMealsPerDay, "before_normalize");
        const normalizedMeals = normalizeNutritionMealsPerDay(scaled, expectedMealsPerDay);
        logNutritionMealsPerDay(normalizedMeals, expectedMealsPerDay, "after_normalize");
        assertNutritionMatchesRequest(normalizedMeals, expectedMealsPerDay, daysCount);
        const personalized = applyPersonalization(normalizedMeals, { name: data.name });
        await saveNutritionPlan(user.id, personalized, startDate, daysCount);
        await upsertRecipesFromPlan(personalized);
        await storeAiContent(user.id, "nutrition", "cache", personalized);
        return reply.status(200).send({
          plan: personalized,
          ...aiMeta,
        });
      } catch (error) {
        app.log.warn({ err: error, cacheKey }, "cached nutrition plan invalid, regenerating");
      }
    }

    await enforceAiQuota({ id: user.id, plan: user.plan });
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
          name: recipe.name,
          description: recipe.description,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          ingredients: recipe.ingredients.map((ingredient) => ({
            name: ingredient.name,
            grams: ingredient.grams,
          })),
          steps: recipe.steps,
        })),
        attempt > 0
      );
      if (user.plan === "PRO") {
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
        name: recipe.name,
        description: recipe.description,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        steps: recipe.steps,
        ingredients: recipe.ingredients.map((ingredient) => ({
          name: ingredient.name,
          grams: ingredient.grams,
        })),
      }))
    );
    logNutritionMealsPerDay(scaledPayload, expectedMealsPerDay, "before_normalize");
    const normalizedMeals = normalizeNutritionMealsPerDay(scaledPayload, expectedMealsPerDay);
    logNutritionMealsPerDay(normalizedMeals, expectedMealsPerDay, "after_normalize");
    assertNutritionMatchesRequest(normalizedMeals, expectedMealsPerDay, daysCount);
    await saveNutritionPlan(user.id, normalizedMeals, startDate, daysCount);
    await upsertRecipesFromPlan(normalizedMeals);
    await saveCachedAiPayload(cacheKey, "nutrition", normalizedMeals);
    const personalized = applyPersonalization(normalizedMeals, { name: data.name });
    await storeAiContent(user.id, "nutrition", "ai", personalized);
    if (user.plan === "PRO" && aiResult) {
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
    } else if (user.plan === "PRO") {
      app.log.info(
        { userId: user.id, feature: "nutrition", charged: false, failureReason: "missing_ai_result" },
        "ai charge skipped"
      );
    }
    return reply.status(200).send({
      plan: personalized,
      aiTokenBalance: user.plan === "PRO" ? aiTokenBalance : null,
      aiTokenRenewalAt: user.plan === "PRO" ? getUserTokenExpiryAt(user) : null,
      ...(user.plan === "PRO" ? { nextBalance: aiTokenBalance } : {}),
      ...(debit ? { debit } : {}),
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/ai/daily-tip", { preHandler: aiAccessGuard }, async (request, reply) => {
  try {
    logAuthCookieDebug(request, "/ai/daily-tip");
    const user =
      (request as AuthenticatedRequest).currentUser ?? (await requireUser(request, { logContext: "/ai/daily-tip" }));
    const data = aiTipSchema.parse(request.body);
    const cacheKey = buildCacheKey("tip", data);
    const template = buildTipTemplate();
    const effectiveTokens = getEffectiveTokenBalance(user);
    const aiMeta =
      user.plan === "PRO"
        ? { aiTokenBalance: effectiveTokens, aiTokenRenewalAt: getUserTokenExpiryAt(user) }
        : { aiTokenBalance: null, aiTokenRenewalAt: null };

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

    await enforceAiQuota({ id: user.id, plan: user.plan });
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
    if (user.plan === "PRO") {
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
      aiTokenBalance: user.plan === "PRO" ? aiTokenBalance : null,
      aiTokenRenewalAt: user.plan === "PRO" ? getUserTokenExpiryAt(user) : null,
      ...(user.plan === "PRO" ? { nextBalance: aiTokenBalance } : {}),
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
      typeof profile.tracking === "object" && profile.tracking ? (profile.tracking as TrackingSnapshot) : null;
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
  limit: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(1).max(200).default(200)),
  offset: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().int().min(0).default(0)),
});

const exerciseParamsSchema = z.object({ id: z.string().min(1) });
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

const trainingPlanParamsSchema = z.object({ id: z.string().min(1) });
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
  .refine((value) => Boolean(value.trainingPlanId || value.templatePlanId), {
    message: "trainingPlanId is required",
  });
const trainerMemberParamsSchema = z.object({
  userId: z.string().min(1),
});
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




app.get("/exercises", async (request, reply) => {
  try {
    await requireUser(request);
    const parsed = exerciseListSchema.parse(request.query);
    const q = parsed.q ?? parsed.query;
    const primaryMuscle = parsed.primaryMuscle ?? parsed.muscle;
    const { items, total } = await listExercises({
      q,
      primaryMuscle,
      equipment: parsed.equipment,
      limit: parsed.limit,
      offset: parsed.offset,
    });
    return { items, total, limit: parsed.limit, offset: parsed.offset };
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

app.get("/training-plans/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { id } = trainingPlanParamsSchema.parse(request.params);
    const plan = await prisma.trainingPlan.findFirst({
      where: { id, userId: user.id },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: {
            exercises: { orderBy: { id: "asc" } },
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

app.post("/training-plans/:planId/days/:dayId/exercises", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { planId, dayId } = trainingDayParamsSchema.parse(request.params);
    const { exerciseId, athleteUserId } = addTrainingExerciseBodySchema.parse(request.body);

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, name: true },
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
      }),
      prisma.trainingPlan.findFirst({
        where: { id: selectedPlanId, userId: requester.id },
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
      include: {
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
        orderBy: { createdAt: "desc" },
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
  subscriptionPlan: z.enum(["FREE", "PRO"]).optional(),
  aiTokenBalance: z.number().int().min(0).optional(),
  aiTokenMonthlyAllowance: z.number().int().min(0).optional(),
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

const adminUpdateGymMemberRoleParamsSchema = z.object({
  gymId: z.string().min(1),
  userId: z.string().min(1),
});

const adminUpdateGymMemberRoleSchema = z.object({
  role: z.enum(["MEMBER", "TRAINER", "ADMIN"]),
  status: z.enum(["ACTIVE", "PENDING", "REJECTED"]).optional(),
});

const adminCreateGymSchema = z.object({
  name: z.string().trim().min(2).max(120),
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
    return { gyms };
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
      return reply.status(404).send({ error: "NOT_FOUND" });
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

    return reply.status(200).send({
      state: membership.status.toLowerCase(),
      gym: membership.gym,
      role: membership.role,
    });
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
    const gym = await prisma.gym.findUnique({ where: { code: code.toUpperCase() } });
    if (!gym) {
      return reply.status(400).send({ error: "INVALID_GYM_CODE" });
    }
    const membership = await prisma.gymMembership.upsert({
      where: { gymId_userId: { gymId: gym.id, userId: user.id } },
      create: {
        gymId: gym.id,
        userId: user.id,
        status: "ACTIVE",
        role: "MEMBER",
      },
      update: {
        status: "ACTIVE",
        role: "MEMBER",
      },
    });
    return reply.status(200).send({
      state: membership.status.toLowerCase(),
      gym: { id: gym.id, name: gym.name },
      role: membership.role,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

const getGymMembership = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = await requireUser(request);
    const membership = await prisma.gymMembership.findFirst({
      where: { userId: user.id },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!membership) {
      return reply.status(200).send({ state: "none" });
    }
    return {
      state: membership.status.toLowerCase(),
      gym: membership.gym,
      role: membership.role,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
};

app.get("/gyms/membership", getGymMembership);

await app.register(async (gymRoutes) => {
  gymRoutes.get("/me", getGymMembership);
}, { prefix: "/gym" });

app.post("/gym/join-code", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { code } = joinGymByCodeSchema.parse(request.body);
    const gym = await prisma.gym.findUnique({ where: { code: code.toUpperCase() } });

    if (!gym) {
      return reply.status(400).send({ error: "INVALID_GYM_CODE" });
    }

    const membership = await prisma.gymMembership.upsert({
      where: { gymId_userId: { gymId: gym.id, userId: user.id } },
      create: {
        gymId: gym.id,
        userId: user.id,
        status: "ACTIVE",
        role: "MEMBER",
      },
      update: {
        status: "ACTIVE",
        role: "MEMBER",
      },
    });

    return reply.status(200).send({
      state: membership.status.toLowerCase(),
      gym: { id: gym.id, name: gym.name },
      role: membership.role,
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/admin/gym-join-requests", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const requests = await prisma.gymMembership.findMany({
      where: {
        status: "PENDING",
        gym: {
          memberships: {
            some: {
              userId: user.id,
              status: "ACTIVE",
              role: { in: ["ADMIN", "TRAINER"] },
            },
          },
        },
      },
      include: {
        gym: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return requests.map((membership) => ({
      id: membership.id,
      membershipId: membership.id,
      gym: membership.gym,
      user: membership.user,
      createdAt: membership.createdAt,
    }));
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/gym-join-requests/:membershipId/accept", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { membershipId } = gymJoinRequestParamsSchema.parse(request.params);
    const membership = await prisma.gymMembership.findUnique({ where: { id: membershipId } });
    if (!membership) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    if (membership.status !== "PENDING") {
      return reply.status(409).send({ error: "INVALID_MEMBERSHIP_STATUS" });
    }
    await requireGymManagerForGym(user.id, membership.gymId);
    const updated = await prisma.gymMembership.update({
      where: { id: membership.id },
      data: { status: "ACTIVE" },
    });
    return { membershipId: updated.id, status: updated.status };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/gym-join-requests/:membershipId/reject", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { membershipId } = gymJoinRequestParamsSchema.parse(request.params);
    const membership = await prisma.gymMembership.findUnique({ where: { id: membershipId } });
    if (!membership) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    if (membership.status !== "PENDING") {
      return reply.status(409).send({ error: "INVALID_MEMBERSHIP_STATUS" });
    }
    await requireGymManagerForGym(user.id, membership.gymId);
    const updated = await prisma.gymMembership.update({
      where: { id: membership.id },
      data: { status: "REJECTED" },
    });
    return { membershipId: updated.id, status: updated.status };
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
      include: {
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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isBlocked: true,
            subscriptionStatus: true,
            lastLoginAt: true,
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
      })),
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/gyms", async (request, reply) => {
  try {
    const user = await requireAdmin(request);
    const { name } = adminCreateGymSchema.parse(request.body);
    const created = await prisma.$transaction(async (tx) => {
      const activationCode = await generateUniqueGymActivationCode(name, user.id);
      const gym = await tx.gym.create({
        data: {
          name,
          code: activationCode,
          activationCode,
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
      return reply.status(409).send({ error: "JOIN_CODE_CONFLICT" });
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

app.patch("/admin/gyms/:gymId/members/:userId/role", async (request, reply) => {
  try {
    await requireAdmin(request);
    const { gymId, userId } = adminUpdateGymMemberRoleParamsSchema.parse(request.params);
    const { role, status } = adminUpdateGymMemberRoleSchema.parse(request.body);

    const membership = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId, userId } },
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
      include: {
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
          data.subscriptionPlan === "PRO" && (data.aiTokenBalance ?? 0) > 0 ? getTokenExpiry(30) : null,
        aiTokenRenewalAt:
          data.subscriptionPlan === "PRO" && (data.aiTokenBalance ?? 0) > 0 ? getTokenExpiry(30) : null,
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

await seedAdmin();

if (process.env.NODE_ENV !== "production") {
  app.log.info("Registered routes\n%s", app.printRoutes());
}

await app.listen({ port: env.PORT, host: env.HOST });
