import crypto from "node:crypto";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "@prisma/client";
import { getEnv } from "./config.js";
import { sendEmail } from "./email.js";
import { hashToken, isPromoCodeValid } from "./authUtils.js";
import { AiParseError, parseJsonFromText } from "./aiParsing.js";
import { chargeAiUsage } from "./ai/chargeAiUsage.js";
import { loadAiPricing } from "./ai/pricing.js";


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
};

const corsOrigins = new Set(
  [env.CORS_ORIGIN, env.APP_BASE_URL]
    .flatMap((origin) => origin.split(","))
    .map((origin) => origin.trim())
    .filter(Boolean)
);

await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsOrigins.has(origin)) return callback(null, true);
    return callback(new Error("CORS_NOT_ALLOWED"), false);
  },
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
  if (request.url?.startsWith("/billing/webhook")) {
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
      error: "RATE_LIMIT",
      message: "Has alcanzado el límite diario de solicitudes de IA. Intenta nuevamente más tarde.",
      ...(retryAfterSec ? { retryAfterSec } : {}),
    });
  }
  if (typed.statusCode === 403 && typed.code === "NOT_PRO") {
    return reply.status(403).send({
      error: "NOT_PRO",
      message: "Necesitas PRO para usar la IA.",
    });
  }
  if (typed.statusCode === 403 && typed.code === "INSUFFICIENT_TOKENS") {
    return reply.status(403).send({
      error: "INSUFFICIENT_TOKENS",
      message: "No tienes tokens suficientes para completar esta acción.",
    });
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

function verifyStripeSignature(rawBody: Buffer, signatureHeader: string, webhookSecret: string) {
  const elements = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = elements.find((part) => part.startsWith("t="));
  const signaturePart = elements.find((part) => part.startsWith("v1="));
  if (!timestampPart || !signaturePart) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE");
  }
  const timestamp = timestampPart.split("=")[1];
  const signature = signaturePart.split("=")[1];
  if (!timestamp || !signature) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE");
  }
  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE");
  }
}

async function updateUserSubscriptionFromStripe(subscription: StripeSubscription) {
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ stripeCustomerId: subscription.customer }, { stripeSubscriptionId: subscription.id }],
    },
  });
  if (!user) {
    app.log.warn({ stripeCustomerId: subscription.customer, stripeSubscriptionId: subscription.id }, "user not found");
    return null;
  }
  return prisma.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd,
      subscriptionPlan: isActive ? "PRO" : "FREE",
    },
  });
}

function selectPrimarySubscription(subscriptions: StripeSubscription[]) {
  if (subscriptions.length === 0) {
    return { selected: null, count: 0 };
  }
  const active = subscriptions.filter((sub) => sub.status === "active" || sub.status === "trialing");
  const pool = active.length > 0 ? active : subscriptions;
  const sorted = [...pool].sort((a, b) => {
    const aEnd = a.current_period_end ?? 0;
    const bEnd = b.current_period_end ?? 0;
    return bEnd - aEnd;
  });
  return { selected: sorted[0] ?? null, count: subscriptions.length };
}

async function syncUserSubscriptionFromStripe(user: {
  id: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}) {
  if (!env.STRIPE_SECRET_KEY) return;
  if (user.stripeSubscriptionId) {
    const subscription = await stripeRequest<StripeSubscription>(
      `subscriptions/${user.stripeSubscriptionId}`,
      {},
      { method: "GET" }
    );
    await updateUserSubscriptionFromStripe(subscription);
    return;
  }
  if (user.stripeCustomerId) {
    const list = await stripeRequest<{ data?: StripeSubscription[] }>(
      "subscriptions",
      { customer: user.stripeCustomerId, status: "all", limit: 20 },
      { method: "GET" }
    );
    const { selected } = selectPrimarySubscription(list.data ?? []);
    if (selected) {
      await updateUserSubscriptionFromStripe(selected);
      return;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: "FREE",
        subscriptionStatus: null,
        currentPeriodEnd: null,
      },
    });
  }
}

async function findUserByStripeIdentifiers(customerId?: string | null, subscriptionId?: string | null) {
  if (!customerId && !subscriptionId) return null;
  return prisma.user.findFirst({
    where: {
      OR: [
        ...(customerId ? [{ stripeCustomerId: customerId }] : []),
        ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : []),
      ],
    },
  });
}

function resolveMonthlyAllowance(user: { aiTokenMonthlyAllowance: number }) {
  if (user.aiTokenMonthlyAllowance > 0) return user.aiTokenMonthlyAllowance;
  return env.PRO_MONTHLY_TOKENS > 0 ? env.PRO_MONTHLY_TOKENS : 2000;
}

async function resetAiTokensForUser(args: {
  userId: string;
  currentPeriodEnd: Date | null;
  monthlyAllowance: number;
}) {
  const { userId, currentPeriodEnd, monthlyAllowance } = args;
  const data: Prisma.UserUpdateInput = {
    aiTokenRenewalAt: currentPeriodEnd ?? null,
  };
  if (monthlyAllowance > 0) {
    data.aiTokenMonthlyAllowance = monthlyAllowance;
    data.aiTokenBalance = monthlyAllowance;
  }
  await prisma.user.update({
    where: { id: userId },
    data,
  });
}

async function applyAiTokenRenewalFromSubscription(subscription: StripeSubscription) {
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  if (!isActive) return;
  const user = await findUserByStripeIdentifiers(subscription.customer, subscription.id);
  if (!user) {
    app.log.warn({ stripeCustomerId: subscription.customer, stripeSubscriptionId: subscription.id }, "user not found");
    return;
  }
  const allowance = resolveMonthlyAllowance(user);
  await resetAiTokensForUser({
    userId: user.id,
    currentPeriodEnd,
    monthlyAllowance: allowance,
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

function getGooglePromoFromState(state: string) {
  const parts = state.split(".");
  if (parts.length < 2) return null;
  return parts.slice(1).join(".") || null;
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

function requireProSubscription(user: { subscriptionPlan: string }) {
  if (user.subscriptionPlan !== "PRO") {
    throw createHttpError(403, "PRO_REQUIRED");
  }
}

function assertAiAccess(user: { subscriptionPlan: string; aiTokenBalance: number }) {
  if (user.subscriptionPlan !== "PRO") {
    throw createHttpError(403, "NOT_PRO");
  }
  if (user.aiTokenBalance <= 0) {
    throw createHttpError(402, "INSUFFICIENT_TOKENS");
  }
}

async function requireAdmin(request: FastifyRequest) {
  const user = await requireUser(request);
  if (user.role !== "ADMIN") {
    throw createHttpError(403, "FORBIDDEN");
  }
  return user;
}

async function getOrCreateProfile(userId: string) {
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  if (existing) return existing;
return prisma.userProfile.create({
  data: {
    userId,
    profile: Prisma.DbNull,
    tracking: defaultTracking,
  },
});

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
  mealsPerDay: z.number().int().min(3).max(6),
  calories: z.number().int().min(1200).max(4000),
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

const aiTrainingSeriesSchema = z.preprocess(
  (value) => {
    if (typeof value === "number") return value.toString();
    if (typeof value === "string") return value.trim();
    return value;
  },
  z.string().min(1)
);

const aiTrainingExerciseSchema = z
  .object({
    name: z.string().min(1),
    sets: aiTrainingSeriesSchema,
    reps: aiTrainingSeriesSchema.optional(),
    tempo: z.string().min(1).optional(),
    rest: aiTrainingSeriesSchema.optional(),
    notes: z.string().min(1).optional(),
  })
  .passthrough();

const aiTrainingDaySchema = z
  .object({
    label: z.string().min(1),
    focus: z.string().min(1),
    duration: z.number().int().min(20).max(120),
    exercises: z.array(aiTrainingExerciseSchema).min(3).max(8),
  })
  .passthrough();

const aiTrainingPlanResponseSchema = z
  .object({
    title: z.string().min(1),
    notes: z.string().min(1).optional(),
    days: z.array(aiTrainingDaySchema).min(1).max(7),
  })
  .passthrough();

const aiNutritionMealSchema = z
  .object({
    type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    title: z.string().min(1),
    description: z.string().min(1),
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
      .min(2)
      .max(12),
  })
  .passthrough();

const aiNutritionDaySchema = z
  .object({
    dayLabel: z.string().min(1),
    meals: z.array(aiNutritionMealSchema).min(1).max(6),
  })
  .passthrough();

const aiNutritionPlanResponseSchema = z
  .object({
    title: z.string().min(1),
    dailyCalories: z.coerce.number().min(1200).max(4000),
    proteinG: z.coerce.number().min(50).max(300),
    fatG: z.coerce.number().min(30).max(200),
    carbsG: z.coerce.number().min(50).max(600),
    days: z.array(aiNutritionDaySchema).min(3).max(7),
    shoppingList: z
      .array(
        z.object({
          name: z.string().min(1),
          grams: z.coerce.number().min(0).max(5000),
        })
      )
      .optional(),
  })
  .passthrough();

function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getSecondsUntilNextUtcDay(date = new Date()) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  const diffMs = next.getTime() - date.getTime();
  return Math.max(1, Math.ceil(diffMs / 1000));
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

async function enforceAiQuota(user: { id: string; subscriptionPlan: string }) {
  const dateKey = toDateKey();
  const limit = user.subscriptionPlan === "PRO" ? env.AI_DAILY_LIMIT_PRO : env.AI_DAILY_LIMIT_FREE;
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
  return {
    title: "Rutina Push/Pull/Legs intermedio",
    days: [
      {
        label: "Día 1",
        focus: "Push",
        duration: params.timeAvailableMinutes,
        exercises: [
          { name: "Press banca", sets: "4", reps: "8-10" },
          { name: "Press militar", sets: "3", reps: "8-10" },
          { name: "Fondos", sets: "3", reps: "10-12" },
          { name: "Elevaciones laterales", sets: "3", reps: "12-15" },
          { name: "Extensión tríceps", sets: "3", reps: "12" },
        ],
      },
      {
        label: "Día 2",
        focus: "Pull",
        duration: params.timeAvailableMinutes,
        exercises: [
          { name: "Remo con barra", sets: "4", reps: "8-10" },
          { name: "Dominadas", sets: "3", reps: "6-10" },
          { name: "Remo en polea", sets: "3", reps: "10-12" },
          { name: "Curl bíceps", sets: "3", reps: "12" },
          { name: "Face pull", sets: "3", reps: "12-15" },
        ],
      },
      {
        label: "Día 3",
        focus: "Legs",
        duration: params.timeAvailableMinutes,
        exercises: [
          { name: "Sentadilla", sets: "4", reps: "8-10" },
          { name: "Peso muerto rumano", sets: "3", reps: "8-10" },
          { name: "Hip thrust", sets: "3", reps: "12" },
          { name: "Prensa", sets: "3", reps: "10-12" },
          { name: "Elevaciones de gemelo", sets: "3", reps: "12-15" },
        ],
      },
    ],
    notes: "Plan base PPL. Ajusta cargas y descanso según progreso.",
  };
}

function buildNutritionTemplate(params: z.infer<typeof aiNutritionSchema>) {
  if (params.mealsPerDay !== 3 || params.goal !== "cut") {
    return null;
  }
  return {
    title: "Plan semanal de nutrición",
    dailyCalories: params.calories,
    proteinG: Math.round(params.calories * 0.3 / 4),
    fatG: Math.round(params.calories * 0.25 / 9),
    carbsG: Math.round(params.calories * 0.45 / 4),
    days: [
      {
        dayLabel: "Lunes",
        meals: [
          {
            type: "breakfast",
            title: "Yogur griego con avena y fruta",
            description: "Desayuno mediterráneo sencillo con proteína moderada.",
            macros: {
              calories: 420,
              protein: 25,
              carbs: 45,
              fats: 12,
            },
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
  };
}

function buildTipTemplate() {
  return {
    title: "Consejo diario",
    message: "Hola {name}, recuerda que la constancia gana a la intensidad. ¡Haz algo hoy!",
  };
}

function buildTrainingPrompt(data: z.infer<typeof aiTrainingSchema>) {
  const secondaryGoals = data.goals?.length ? data.goals.join(", ") : "no especificados";
  const cardio = typeof data.includeCardio === "boolean" ? (data.includeCardio ? "sí" : "no") : "no especificado";
  const mobility =
    typeof data.includeMobilityWarmups === "boolean" ? (data.includeMobilityWarmups ? "sí" : "no") : "no especificado";
  const workoutLength = data.workoutLength ?? "flexible";
  const timerSound = data.timerSound ?? "no especificado";
  const injuries = data.injuries?.trim() || "ninguna";
  return [
    "Eres un entrenador personal senior. Genera un plan semanal realista en JSON válido.",
    "Devuelve únicamente un objeto JSON válido. Sin texto adicional, sin markdown, sin comentarios.",
    "El JSON debe respetar exactamente este esquema:",
    '{"title":string,"notes"?:string,"days":[{"label":string,"focus":string,"duration":number,"exercises":[{"name":string,"sets":string|number,"reps":string|number,"tempo"?:string,"rest"?:string|number,"notes"?:string}]}]}',
    "Usa ejercicios reales acordes al equipo disponible. No incluyas máquinas si el equipo es solo en casa.",
    "Respeta el nivel del usuario:",
    "- principiante: ejercicios básicos y seguros, 3-5 ejercicios por sesión, 45-60 minutos.",
    "- intermedio/avanzado: 4-6 ejercicios por sesión, básicos multiarticulares, 50-75 minutos.",
    "Para avanzados, incluye ejercicios exigentes y coherentes con el objetivo.",
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
    "Usa days.length = días por semana. label en español consistente (ej: \"Día Lunes 1\", \"Día 2\"...).",
    "En cada día incluye duration en minutos (number).",
    "En cada ejercicio incluye name (español), sets, reps, tempo, rest y notes.",
    "Ejemplo EXACTO de JSON (solo ejemplo, respeta tipos y campos):",
    '{"title":"Plan de fuerza semanal","notes":"Enfocado en técnica y progreso gradual.","days":[{"label":"Día 1","focus":"Full body","duration":60,"exercises":[{"name":"Sentadilla con barra","sets":"4","reps":"8-10","tempo":"2-0-2","rest":"90","notes":"Calentamiento previo y técnica controlada."},{"name":"Press banca","sets":"4","reps":"8-10","tempo":"2-0-2","rest":"90","notes":"Escápulas retraídas."},{"name":"Remo con barra","sets":"3","reps":"8-10","tempo":"2-1-2","rest":"90","notes":"Espalda neutra."}]}]}',
  ].join(" ");
}

function buildNutritionPrompt(data: z.infer<typeof aiNutritionSchema>) {
  const distribution =
    typeof data.mealDistribution === "string"
      ? data.mealDistribution
      : data.mealDistribution?.preset ?? "balanced";
  const distributionPercentages =
    typeof data.mealDistribution === "object" && data.mealDistribution?.percentages?.length
      ? `(${data.mealDistribution.percentages.join("%, ")}%)`
      : "";
  return [
    "Eres un nutricionista deportivo senior. Genera un plan semanal en JSON válido.",
    "Devuelve únicamente un objeto JSON válido. Sin texto adicional, sin markdown, sin comentarios.",
    "El JSON debe respetar exactamente este esquema:",
    "Esquema exacto:",
    "{",
    '  "title": string,',
    '  "dailyCalories": number,',
    '  "proteinG": number,',
    '  "fatG": number,',
    '  "carbsG": number,',
    '  "days": [',
    "    {",
    '      "dayLabel": string,',
    '      "meals": [',
    "        {",
    '          "type": "breakfast" | "lunch" | "dinner" | "snack",',
    '          "title": string,',
    '          "description": string,',
    '          "macros": { "calories": number, "protein": number, "carbs": number, "fats": number },',
    '          "ingredients": [{ "name": string, "grams": number }]',
    "        }",
    "      ]",
    "    }",
    "  ],",
    '  "shoppingList"?: [{ "name": string, "grams": number }]',
    "}",
    "Base mediterránea: verduras, frutas, legumbres, cereales integrales, aceite de oliva, pescado, carne magra y frutos secos.",
    "Evita cantidades absurdas. Porciones realistas y fáciles de cocinar.",
    "Distribuye proteína, carbohidratos y grasas a lo largo del día.",
    `Perfil: Edad ${data.age}, sexo ${data.sex}, objetivo ${data.goal}.`,
    `Calorías objetivo diarias: ${data.calories}. Comidas/día: ${data.mealsPerDay}.`,
    `Restricciones o preferencias: ${data.dietaryRestrictions ?? "ninguna"}.`,
    `Tipo de dieta: ${data.dietType ?? "equilibrada"}.`,
    `Alergias: ${data.allergies?.join(", ") ?? "ninguna"}.`,
    `Preferencias (favoritos): ${data.preferredFoods ?? "ninguna"}.`,
    `Alimentos a evitar: ${data.dislikedFoods ?? "ninguno"}.`,
    `Distribución de comidas: ${distribution} ${distributionPercentages}.`,
    "Genera exactamente 7 días con dayLabel en español (por ejemplo Lunes, Martes, Miércoles).",
    "Cada día incluye desayuno, comida, cena y 1-2 snacks.",
    "Usa siempre type y macros en cada comida.",
    "Los macros diarios (proteinG, fatG, carbsG) deben ser coherentes con dailyCalories.",
    "Incluye title, dailyCalories, proteinG, fatG y carbsG siempre.",
    "Ejemplo EXACTO de JSON (solo ejemplo, respeta tipos y campos):",
    '{"title":"Plan mediterráneo semanal","dailyCalories":2200,"proteinG":140,"fatG":70,"carbsG":250,"days":[{"dayLabel":"Lunes","meals":[{"type":"breakfast","title":"Tostadas integrales con aguacate y huevo","description":"Desayuno con grasas saludables y proteína.","macros":{"calories":450,"protein":25,"carbs":45,"fats":18},"ingredients":[{"name":"Pan integral","grams":80},{"name":"Aguacate","grams":70},{"name":"Huevo","grams":120}]},{"type":"lunch","title":"Salmón a la plancha con arroz integral y brócoli","description":"Plato principal rico en omega 3.","macros":{"calories":700,"protein":45,"carbs":70,"fats":25},"ingredients":[{"name":"Salmón","grams":160},{"name":"Arroz integral cocido","grams":180},{"name":"Brócoli","grams":200},{"name":"Aceite de oliva","grams":10}]},{"type":"snack","title":"Yogur griego con frutos rojos","description":"Snack ligero y alto en proteína.","macros":{"calories":250,"protein":20,"carbs":25,"fats":8},"ingredients":[{"name":"Yogur griego","grams":200},{"name":"Frutos rojos","grams":120},{"name":"Nueces","grams":15}]},{"type":"dinner","title":"Pechuga de pollo con verduras salteadas","description":"Cena ligera y saciante.","macros":{"calories":800,"protein":50,"carbs":110,"fats":19},"ingredients":[{"name":"Pechuga de pollo","grams":170},{"name":"Verduras mixtas","grams":250},{"name":"Patata cocida","grams":200},{"name":"Aceite de oliva","grams":10}]}]},{"dayLabel":"Martes","meals":[{"type":"breakfast","title":"Avena con yogur y fruta","description":"Desayuno completo y saciante.","macros":{"calories":430,"protein":22,"carbs":55,"fats":12},"ingredients":[{"name":"Avena","grams":60},{"name":"Yogur griego","grams":180},{"name":"Plátano","grams":120}]},{"type":"lunch","title":"Ensalada de garbanzos con atún","description":"Legumbre + proteína magra.","macros":{"calories":650,"protein":40,"carbs":65,"fats":18},"ingredients":[{"name":"Garbanzos cocidos","grams":200},{"name":"Atún al natural","grams":120},{"name":"Tomate","grams":150},{"name":"Aceite de oliva","grams":10}]},{"type":"snack","title":"Fruta y frutos secos","description":"Snack energético controlado.","macros":{"calories":220,"protein":6,"carbs":25,"fats":10},"ingredients":[{"name":"Manzana","grams":160},{"name":"Almendras","grams":20}]},{"type":"dinner","title":"Pavo con quinoa y verduras","description":"Cena completa y ligera.","macros":{"calories":900,"protein":72,"carbs":105,"fats":30},"ingredients":[{"name":"Pavo","grams":180},{"name":"Quinoa cocida","grams":180},{"name":"Calabacín","grams":200},{"name":"Aceite de oliva","grams":10}]}]}],"shoppingList":[{"name":"Aceite de oliva","grams":200},{"name":"Verduras mixtas","grams":800}]}',
  ].join(" ");
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

function parseTrainingPlanPayload(payload: Record<string, unknown>) {
  try {
    return aiTrainingPlanResponseSchema.parse(payload);
  } catch (error) {
    app.log.warn({ err: error, payload }, "ai training response invalid");
    throw createHttpError(502, "AI_PARSE_ERROR");
  }
}

const NUTRITION_DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function normalizeNutritionPlanDays(
  plan: z.infer<typeof aiNutritionPlanResponseSchema>
): z.infer<typeof aiNutritionPlanResponseSchema> {
  if (plan.days.length >= NUTRITION_DAY_LABELS.length) return plan;
  const nextDays = [...plan.days];
  let index = 0;
  while (nextDays.length < NUTRITION_DAY_LABELS.length) {
    const source = plan.days[index % plan.days.length];
    nextDays.push({
      ...source,
      dayLabel: NUTRITION_DAY_LABELS[nextDays.length] ?? source.dayLabel,
    });
    index += 1;
  }
  return { ...plan, days: nextDays };
}

function parseNutritionPlanPayload(payload: Record<string, unknown>) {
  try {
    return normalizeNutritionPlanDays(aiNutritionPlanResponseSchema.parse(payload));
  } catch (error) {
    app.log.warn({ err: error, payload }, "ai nutrition response invalid");
    throw createHttpError(502, "AI_PARSE_ERROR");
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
  query?: string;
  muscle?: string;
  equipment?: string;
}): Prisma.Sql {
  const filters: Prisma.Sql[] = [];

  if (params.query) {
    filters.push(Prisma.sql`name ILIKE ${`%${params.query}%`}`);
  }

  if (params.equipment && params.equipment !== "all") {
    filters.push(Prisma.sql`equipment = ${params.equipment}`);
  }

  if (params.muscle && params.muscle !== "all") {
    filters.push(
      Prisma.sql`("mainMuscleGroup" = ${params.muscle} OR "secondaryMuscleGroups" @> ARRAY[${params.muscle}]::text[])`
    );
  }

  const whereClause =
    filters.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(filters)}`
      : Prisma.sql``;

  return whereClause;
}



async function listExercises(params: {
  query?: string;
  muscle?: string;
  equipment?: string;
  limit: number;
  offset: number;
}) {
  if (hasExerciseClient()) {
    const where: Prisma.ExerciseWhereInput = {};
    if (params.query) {
      where.name = { contains: params.query, mode: "insensitive" };
    }
    if (params.equipment && params.equipment !== "all") {
      where.equipment = params.equipment;
    }
    if (params.muscle && params.muscle !== "all") {
      where.OR = [
        { mainMuscleGroup: params.muscle },
        { secondaryMuscleGroups: { has: params.muscle } },
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

type OpenAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type OpenAiResponse = {
  payload: Record<string, unknown>;
  usage?: OpenAiUsage;
  model?: string;
  requestId?: string;
};

async function callOpenAi(prompt: string, attempt = 0): Promise<OpenAiResponse> {
  if (!env.OPENAI_API_KEY) {
    throw createHttpError(503, "AI_UNAVAILABLE");
  }
  const systemMessage =
    attempt === 0
      ? "Devuelve exclusivamente JSON valido. Sin markdown. Sin texto extra."
      : "DEVUELVE SOLO JSON VÁLIDO. Sin markdown. Sin texto extra.";
  const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      max_tokens: 1600,
      temperature: attempt === 0 ? 0.6 : 0.2,
    }),
  });
  if (!response.ok) {
    throw createHttpError(502, "AI_REQUEST_FAILED");
  }
  const data = (await response.json()) as {
    id?: string;
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: OpenAiUsage;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw createHttpError(502, "AI_EMPTY_RESPONSE");
  }
  try {
    app.log.info({ attempt, rawResponse: content }, "ai raw response");
    return {
      payload: extractJson(content),
      usage: data.usage,
      model: data.model,
      requestId: data.id,
    };
  } catch (error) {
    const typed = error as { code?: string };
    if (typed.code === "AI_PARSE_ERROR" && attempt === 0) {
      app.log.warn({ err: error }, "ai response parse failed, retrying with strict json request");
      return callOpenAi(prompt, 1);
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

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
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

async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${env.APP_BASE_URL}/verify-email?token=${token}`;
  const subject = "Verifica tu email en FitSculpt";
  const text = `Hola! Verifica tu email aquí: ${verifyUrl}`;
  const html = `<p>Hola!</p><p>Verifica tu email aquí: <a href="${verifyUrl}">${verifyUrl}</a></p>`;
  await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
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
    const session = await stripeRequest<StripeCheckoutSession>(
      "checkout/sessions",
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: user.id,
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
  } catch (error) {
    return handleRequestError(reply, error);
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

app.get("/billing/status", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const querySchema = z.object({
      sync: z.preprocess((value) => value === "1" || value === "true", z.boolean().optional()),
    });
    const { sync } = querySchema.parse(request.query);
    if (sync) {
      await syncUserSubscriptionFromStripe(user);
    }
    let refreshed = await prisma.user.findUnique({ where: { id: user.id } });
    if (!refreshed) {
      refreshed = user;
    }
    let stripePeriodEnd: Date | null = refreshed?.currentPeriodEnd ?? null;
    let aiTokenRenewalAt = refreshed?.aiTokenRenewalAt ?? null;
    let subscriptionStatus = refreshed?.subscriptionStatus ?? null;
    let subscriptionPlan = refreshed?.subscriptionPlan ?? "FREE";
    let stripeSubscriptionId = refreshed?.stripeSubscriptionId ?? null;
    let stripeCustomerId = refreshed?.stripeCustomerId ?? null;
    let subscriptionsCount = 0;
    let selectedSubscriptionId: string | null = null;

    if (env.STRIPE_SECRET_KEY && (stripeSubscriptionId || stripeCustomerId)) {
      try {
        let subscription: StripeSubscription | null = null;
        if (stripeSubscriptionId) {
          subscription = await stripeRequest<StripeSubscription>(
            `subscriptions/${stripeSubscriptionId}`,
            {},
            { method: "GET" }
          );
        } else if (stripeCustomerId) {
          const list = await stripeRequest<{ data?: StripeSubscription[] }>(
            "subscriptions",
            { customer: stripeCustomerId, status: "all", limit: 20 },
            { method: "GET" }
          );
          const selection = selectPrimarySubscription(list.data ?? []);
          subscription = selection.selected;
          subscriptionsCount = selection.count;
          selectedSubscriptionId = selection.selected?.id ?? null;
          stripeSubscriptionId = selection.selected?.id ?? stripeSubscriptionId;
        }

        if (subscription) {
          const isActive = subscription.status === "active" || subscription.status === "trialing";
          subscriptionStatus = subscription.status;
          subscriptionPlan = isActive ? "PRO" : "FREE";
          stripePeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null;
          if (!aiTokenRenewalAt && stripePeriodEnd) {
            aiTokenRenewalAt = stripePeriodEnd;
          }
          const needsUpdate =
            refreshed?.subscriptionStatus !== subscriptionStatus ||
            refreshed?.subscriptionPlan !== subscriptionPlan ||
            refreshed?.stripeSubscriptionId !== subscription.id ||
            (stripePeriodEnd &&
              (!refreshed?.currentPeriodEnd ||
                refreshed.currentPeriodEnd.getTime() !== stripePeriodEnd.getTime())) ||
            (aiTokenRenewalAt &&
              (!refreshed?.aiTokenRenewalAt || refreshed.aiTokenRenewalAt.getTime() !== aiTokenRenewalAt.getTime()));
          if (needsUpdate && refreshed) {
            refreshed = await prisma.user.update({
              where: { id: refreshed.id },
              data: {
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: subscription.customer,
                subscriptionStatus,
                subscriptionPlan,
                currentPeriodEnd: stripePeriodEnd,
                aiTokenRenewalAt,
              },
            });
          }
        }
      } catch (error) {
        app.log.warn({ err: error, userId: refreshed?.id }, "stripe subscription fetch failed");
      }
    }

    if (!aiTokenRenewalAt && stripePeriodEnd && refreshed) {
      aiTokenRenewalAt = stripePeriodEnd;
      refreshed = await prisma.user.update({
        where: { id: refreshed.id },
        data: { aiTokenRenewalAt },
      });
    }

    return {
      subscriptionPlan: refreshed?.subscriptionPlan ?? subscriptionPlan,
      subscriptionStatus: refreshed?.subscriptionStatus ?? subscriptionStatus,
      currentPeriodEnd: refreshed?.currentPeriodEnd ?? stripePeriodEnd ?? null,
      aiTokenBalance: refreshed?.aiTokenBalance ?? 0,
      aiTokenMonthlyAllowance: refreshed?.aiTokenMonthlyAllowance ?? 0,
      aiTokenRenewalAt: refreshed?.aiTokenRenewalAt ?? aiTokenRenewalAt ?? null,
      stripeCustomerId: refreshed?.stripeCustomerId ?? stripeCustomerId ?? null,
      stripeSubscriptionId: refreshed?.stripeSubscriptionId ?? stripeSubscriptionId ?? null,
      ...(process.env.NODE_ENV === "production"
        ? {}
        : { subscriptionsCount, selectedSubscriptionId }),
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/billing/webhook", async (request, reply) => {
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
    const event = JSON.parse(rawBody.toString("utf8")) as { type: string; data?: { object?: unknown } };
    const payload = event.data?.object;

    if (event.type === "checkout.session.completed") {
      const session = payload as {
        customer?: string | null;
        subscription?: string | null;
        customer_details?: { email?: string | null };
        metadata?: { userId?: string | null };
      };
      const userId = session.metadata?.userId ?? null;
      const email = session.customer_details?.email ?? null;
      const customerId = session.customer ?? null;
      const subscriptionId = session.subscription ?? null;
      let matchedUser = null;
      if (userId) {
        matchedUser = await prisma.user.findUnique({ where: { id: userId } });
      }
      if (!matchedUser && email) {
        matchedUser = await prisma.user.findUnique({ where: { email } });
      }
      if (matchedUser && (customerId || subscriptionId)) {
        await prisma.user.update({
          where: { id: matchedUser.id },
          data: {
            stripeCustomerId: customerId ?? matchedUser.stripeCustomerId,
            stripeSubscriptionId: subscriptionId ?? matchedUser.stripeSubscriptionId,
          },
        });
      } else if (!matchedUser) {
        app.log.warn({ userId, email }, "checkout session completed: user not found");
      }
      if (subscriptionId && customerId) {
        const subscription = await stripeRequest<StripeSubscription>(
          `subscriptions/${subscriptionId}`,
          {},
          { method: "GET" }
        );
        await updateUserSubscriptionFromStripe(subscription);
        await applyAiTokenRenewalFromSubscription(subscription);
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = payload as StripeSubscription;
      if (subscription?.id && subscription?.customer) {
        await updateUserSubscriptionFromStripe(subscription);
        if (event.type === "customer.subscription.deleted") {
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              subscriptionPlan: "FREE",
              subscriptionStatus: "canceled",
              aiTokenRenewalAt: null,
              // Mantiene el balance actual, pero no habrá recargas automáticas.
            },
          });
        } else {
          await applyAiTokenRenewalFromSubscription(subscription);
        }
      }
    }

    if (event.type === "invoice.payment_succeeded" || event.type === "invoice.paid") {
      const invoice = payload as { customer?: string | null; subscription?: string | null };
      if (invoice?.subscription && invoice?.customer) {
        const subscription = await stripeRequest<StripeSubscription>(
          `subscriptions/${invoice.subscription}`,
          {},
          { method: "GET" }
        );
        await updateUserSubscriptionFromStripe(subscription);
        await applyAiTokenRenewalFromSubscription(subscription);
      }
    }

    return reply.status(200).send({ received: true });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/auth/me", async (request, reply) => {
  try {
    const user = await requireUser(request);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      aiTokenBalance: user.aiTokenBalance,
      aiTokenMonthlyAllowance: user.aiTokenMonthlyAllowance,
      aiTokenRenewalAt: user.aiTokenRenewalAt,
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

app.get("/auth/google/start", async (request, reply) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    return reply.status(501).send({ error: "GOOGLE_OAUTH_NOT_CONFIGURED" });
  }

  const querySchema = z.object({
    promoCode: z.string().optional(),
  });
  const { promoCode } = querySchema.parse(request.query);
  const trimmedPromo = promoCode?.trim();
  if (trimmedPromo && !isPromoCodeValid(trimmedPromo)) {
    return reply.status(400).send({ error: "INVALID_PROMO_CODE" });
  }

  const stateToken = crypto.randomBytes(32).toString("base64url");
  const state = trimmedPromo ? `${stateToken}.${trimmedPromo}` : stateToken;
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
  const appBaseUrl = env.APP_BASE_URL.replace(/\/$/, "");
  const redirectToLogin = (error?: string) =>
    reply.redirect(`${appBaseUrl}/login${error ? `?error=${error}` : ""}`);

  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
      return redirectToLogin("oauth");
    }

    const querySchema = z.object({ code: z.string().min(1), state: z.string().min(1) });
    const { code, state } = querySchema.parse(request.query);
    const promoCode = getGooglePromoFromState(state);

    const stateHash = hashToken(state);
    const storedState = await prisma.oAuthState.findUnique({ where: { stateHash } });
    if (!storedState || storedState.expiresAt.getTime() < Date.now()) {
      if (storedState) {
        await prisma.oAuthState.delete({ where: { id: storedState.id } });
      }
      return redirectToLogin("oauth");
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
      return redirectToLogin("oauth");
    }

    const tokenJson = (await tokenResponse.json()) as { id_token?: string; access_token?: string };
    const idToken = tokenJson.id_token;
    if (!idToken) {
      return redirectToLogin("oauth");
    }

    const infoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!infoResponse.ok) {
      return redirectToLogin("oauth");
    }

    const info = (await infoResponse.json()) as {
      sub: string;
      email?: string;
      email_verified?: string;
      name?: string;
    };

    if (!info.email || info.email_verified !== "true") {
      return redirectToLogin("oauth");
    }

    let user = await prisma.user.findUnique({ where: { email: info.email } });
    if (user?.deletedAt) {
      return redirectToLogin("blocked");
    }

    if (!user) {
      if (!promoCode || !isPromoCodeValid(promoCode)) {
        return redirectToLogin("promo");
      }
      user = await prisma.user.create({
        data: {
          email: info.email,
          name: info.name,
          provider: "google",
          emailVerifiedAt: new Date(),
        },
      });
    } else if (user.passwordHash && !user.emailVerifiedAt) {
      return redirectToLogin("unverified");
    }

    if (user.isBlocked) {
      return redirectToLogin("blocked");
    }

    const providerMatch = await prisma.authProvider.findFirst({
      where: { provider: "google", providerUserId: info.sub },
    });

    if (providerMatch && providerMatch.userId !== user.id) {
      return redirectToLogin("oauth");
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
    reply.setCookie("fs_token", token, buildCookieOptions());

    return reply.redirect(`${appBaseUrl}/app`);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      app.log.warn({ err: error }, "google oauth callback failed");
    }
    return redirectToLogin("oauth");
  }
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

app.post("/ai/training-plan", async (request, reply) => {
  try {
    logAuthCookieDebug(request, "/ai/training-plan");
    const user = await requireUser(request, { logContext: "/ai/training-plan" });
    requireProSubscription(user);
    const data = aiTrainingSchema.parse(request.body);
    const cacheKey = buildCacheKey("training", data);
    const template = buildTrainingTemplate(data);

    if (template) {
      const personalized = applyPersonalization(template, { name: data.name });
      await upsertExercisesFromPlan(personalized);
      await storeAiContent(user.id, "training", "template", personalized);
      return reply.status(200).send({
        plan: personalized,
        aiTokenBalance: user.aiTokenBalance,
        aiTokenRenewalAt: user.aiTokenRenewalAt,
      });
    }

    const cached = await getCachedAiPayload(cacheKey);
    if (cached) {
      try {
        const validated = parseTrainingPlanPayload(cached);
        const personalized = applyPersonalization(validated, { name: data.name });
        await upsertExercisesFromPlan(personalized);
        await storeAiContent(user.id, "training", "cache", personalized);
        return reply.status(200).send({
          plan: personalized,
          aiTokenBalance: user.aiTokenBalance,
          aiTokenRenewalAt: user.aiTokenRenewalAt,
        });
      } catch (error) {
        app.log.warn({ err: error, cacheKey }, "cached training plan invalid, regenerating");
      }
    }

    assertAiAccess(user);
    await enforceAiQuota(user);
    const prompt = buildTrainingPrompt(data);
    const balanceBefore = user.aiTokenBalance;
    app.log.info(
      { userId: user.id, feature: "training_plan", plan: user.subscriptionPlan, balanceBefore },
      "ai charge start"
    );
    const charged = await chargeAiUsage({
      prisma,
      pricing: aiPricing,
      user,
      feature: "training_plan",
      execute: () => callOpenAi(prompt),
      createHttpError,
    });
    app.log.info(
      {
        userId: user.id,
        feature: "training_plan",
        costCents: charged.costCents,
        totalTokens: charged.totalTokens,
        balanceAfter: charged.balance,
      },
      "ai charge complete"
    );
    const payload = parseTrainingPlanPayload(charged.payload);
    await upsertExercisesFromPlan(payload);
    await saveCachedAiPayload(cacheKey, "training", payload);
    const personalized = applyPersonalization(payload, { name: data.name });
    await storeAiContent(user.id, "training", "ai", personalized);
    const debit =
      process.env.NODE_ENV === "production"
        ? undefined
        : {
            costCents: charged.costCents,
            balanceBefore,
            balanceAfter: charged.balance,
            totalTokens: charged.totalTokens,
          };
    return reply.status(200).send({
      plan: personalized,
      aiTokenBalance: charged.balance,
      aiTokenRenewalAt: user.aiTokenRenewalAt,
      ...(debit ? { debit } : {}),
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/ai/nutrition-plan", async (request, reply) => {
  try {
    logAuthCookieDebug(request, "/ai/nutrition-plan");
    const user = await requireUser(request, { logContext: "/ai/nutrition-plan" });
    requireProSubscription(user);
    const data = aiNutritionSchema.parse(request.body);
    await prisma.aiPromptCache.deleteMany({
      where: {
        type: "nutrition",
        key: { startsWith: "nutrition:" },
        NOT: { key: { startsWith: "nutrition:v2:" } },
      },
    });
    const cacheKey = buildCacheKey("nutrition:v2", data);
    const template = buildNutritionTemplate(data);

    if (template) {
      const personalized = applyPersonalization(template, { name: data.name });
      await storeAiContent(user.id, "nutrition", "template", personalized);
      return reply.status(200).send({
        plan: personalized,
        aiTokenBalance: user.aiTokenBalance,
        aiTokenRenewalAt: user.aiTokenRenewalAt,
      });
    }

    const cached = await getCachedAiPayload(cacheKey);
    if (cached) {
      try {
        const validated = parseNutritionPlanPayload(cached);
        const personalized = applyPersonalization(validated, { name: data.name });
        await storeAiContent(user.id, "nutrition", "cache", personalized);
        return reply.status(200).send({
          plan: personalized,
          aiTokenBalance: user.aiTokenBalance,
          aiTokenRenewalAt: user.aiTokenRenewalAt,
        });
      } catch (error) {
        app.log.warn({ err: error, cacheKey }, "cached nutrition plan invalid, regenerating");
      }
    }

    assertAiAccess(user);
    await enforceAiQuota(user);
    const prompt = buildNutritionPrompt(data);
    const balanceBefore = user.aiTokenBalance;
    app.log.info(
      { userId: user.id, feature: "nutrition_plan", plan: user.subscriptionPlan, balanceBefore },
      "ai charge start"
    );
    const charged = await chargeAiUsage({
      prisma,
      pricing: aiPricing,
      user,
      feature: "nutrition_plan",
      execute: () => callOpenAi(prompt),
      createHttpError,
    });
    app.log.info(
      {
        userId: user.id,
        feature: "nutrition_plan",
        costCents: charged.costCents,
        totalTokens: charged.totalTokens,
        balanceAfter: charged.balance,
      },
      "ai charge complete"
    );
    const payload = parseNutritionPlanPayload(charged.payload);
    await saveCachedAiPayload(cacheKey, "nutrition", payload);
    const personalized = applyPersonalization(payload, { name: data.name });
    await storeAiContent(user.id, "nutrition", "ai", personalized);
    const debit =
      process.env.NODE_ENV === "production"
        ? undefined
        : {
            costCents: charged.costCents,
            balanceBefore,
            balanceAfter: charged.balance,
            totalTokens: charged.totalTokens,
          };
    return reply.status(200).send({
      plan: personalized,
      aiTokenBalance: charged.balance,
      aiTokenRenewalAt: user.aiTokenRenewalAt,
      ...(debit ? { debit } : {}),
    });
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/ai/daily-tip", async (request, reply) => {
  try {
    logAuthCookieDebug(request, "/ai/daily-tip");
    const user = await requireUser(request, { logContext: "/ai/daily-tip" });
    requireProSubscription(user);
    const data = aiTipSchema.parse(request.body);
    const cacheKey = buildCacheKey("tip", data);
    const template = buildTipTemplate();

    if (template) {
      const personalized = applyPersonalization(template, { name: data.name ?? "amigo" });
      await safeStoreAiContent(user.id, "tip", "template", personalized);
      return reply.status(200).send({
        tip: personalized,
        aiTokenBalance: user.aiTokenBalance,
        aiTokenRenewalAt: user.aiTokenRenewalAt,
      });
    }

    const cached = await getCachedAiPayload(cacheKey);
    if (cached) {
      const personalized = applyPersonalization(cached, { name: data.name ?? "amigo" });
      await safeStoreAiContent(user.id, "tip", "cache", personalized);
      return reply.status(200).send({
        tip: personalized,
        aiTokenBalance: user.aiTokenBalance,
        aiTokenRenewalAt: user.aiTokenRenewalAt,
      });
    }

    assertAiAccess(user);
    await enforceAiQuota(user);
    const prompt = buildTipPrompt(data);
    const balanceBefore = user.aiTokenBalance;
    app.log.info(
      { userId: user.id, feature: "daily_tip", plan: user.subscriptionPlan, balanceBefore },
      "ai charge start"
    );
    const charged = await chargeAiUsage({
      prisma,
      pricing: aiPricing,
      user,
      feature: "daily_tip",
      execute: () => callOpenAi(prompt),
      createHttpError,
    });
    app.log.info(
      {
        userId: user.id,
        feature: "daily_tip",
        costCents: charged.costCents,
        totalTokens: charged.totalTokens,
        balanceAfter: charged.balance,
      },
      "ai charge complete"
    );
    const payload = charged.payload;
    await saveCachedAiPayload(cacheKey, "tip", payload);
    const personalized = applyPersonalization(payload, { name: data.name ?? "amigo" });
    await safeStoreAiContent(user.id, "tip", "ai", personalized);
    const debit =
      process.env.NODE_ENV === "production"
        ? undefined
        : {
            costCents: charged.costCents,
            balanceBefore,
            balanceAfter: charged.balance,
            totalTokens: charged.totalTokens,
          };
    return reply.status(200).send({
      tip: personalized,
      aiTokenBalance: charged.balance,
      aiTokenRenewalAt: user.aiTokenRenewalAt,
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

const workoutCreateSchema = z.object({
  name: z.string().min(2),
  notes: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMin: z.coerce.number().int().min(0).optional(),
});

const workoutUpdateSchema = workoutCreateSchema.partial();

const exerciseListSchema = z.object({
  query: z.string().min(1).optional(),
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

app.get("/exercises", async (request, reply) => {
  try {
    await requireUser(request);
    const { query, muscle, equipment, limit, offset } = exerciseListSchema.parse(request.query);
    const { items, total } = await listExercises({ query, muscle, equipment, limit, offset });
    return { items, total, limit, offset };
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
      },
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
    const workout = await prisma.workout.updateMany({
      where: { id, userId: user.id },
      data: {
        name: data.name,
        notes: data.notes,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        durationMin: data.durationMin,
      },
    });
    if (workout.count === 0) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    const updated = await prisma.workout.findUnique({ where: { id } });
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
    return { ok: true };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["USER", "ADMIN"]).optional(),
  subscriptionPlan: z.enum(["FREE", "PRO"]).optional(),
  aiTokenBalance: z.coerce.number().int().min(0).optional(),
  aiTokenMonthlyAllowance: z.coerce.number().int().min(0).optional(),
});

app.post("/admin/users", async (request, reply) => {
  try {
    await requireAdmin(request);
    const data = adminCreateUserSchema.parse(request.body ?? {});
    const subscriptionPlan = data.subscriptionPlan ?? "FREE";
    const aiTokenMonthlyAllowance = data.aiTokenMonthlyAllowance ?? 0;
    const fallbackBalance = subscriptionPlan === "PRO" ? aiTokenMonthlyAllowance : 0;
    const aiTokenBalance = Math.max(0, data.aiTokenBalance ?? fallbackBalance);
    const currentPeriodEnd = subscriptionPlan === "PRO" ? addMonths(new Date(), 1) : null;
    const aiTokenRenewalAt = subscriptionPlan === "PRO" ? currentPeriodEnd : null;
    const passwordHash = await bcrypt.hash(data.password, 10);

    const created = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role ?? "USER",
        subscriptionPlan,
        subscriptionStatus: subscriptionPlan === "PRO" ? "manual_admin" : null,
        currentPeriodEnd,
        aiTokenBalance,
        aiTokenMonthlyAllowance,
        aiTokenRenewalAt,
      },
    });

    return reply.status(201).send({
      id: created.id,
      email: created.email,
      role: created.role,
      subscriptionPlan: created.subscriptionPlan,
      currentPeriodEnd: created.currentPeriodEnd,
      aiTokenBalance: created.aiTokenBalance,
      aiTokenMonthlyAllowance: created.aiTokenMonthlyAllowance,
      aiTokenRenewalAt: created.aiTokenRenewalAt,
    });
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
        provider: user.provider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        aiTokenBalance: user.aiTokenBalance,
        aiTokenMonthlyAllowance: user.aiTokenMonthlyAllowance,
        aiTokenRenewalAt: user.aiTokenRenewalAt,
        currentPeriodEnd: user.currentPeriodEnd,
      };
    });

    return { total, page, pageSize, users: payload };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/users/:id/grant-pro", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const bodySchema = z.object({
      monthlyAllowance: z.coerce.number().int().min(1).optional(),
      initialTokens: z.coerce.number().int().min(0).optional(),
    });
    const { id } = paramsSchema.parse(request.params);
    const { monthlyAllowance, initialTokens } = bodySchema.parse(request.body ?? {});

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    const allowance = monthlyAllowance ?? resolveMonthlyAllowance(user);
    const startingTokens = initialTokens ?? allowance;
    const resetAt = addMonths(new Date(), 1);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        subscriptionPlan: "PRO",
        subscriptionStatus: "manual_admin",
        aiTokenMonthlyAllowance: allowance,
        aiTokenBalance: startingTokens,
        currentPeriodEnd: resetAt,
        aiTokenRenewalAt: resetAt,
      },
    });

    return {
      id: updated.id,
      subscriptionPlan: updated.subscriptionPlan,
      subscriptionStatus: updated.subscriptionStatus,
      currentPeriodEnd: updated.currentPeriodEnd,
      aiTokenBalance: updated.aiTokenBalance,
      aiTokenMonthlyAllowance: updated.aiTokenMonthlyAllowance,
      aiTokenRenewalAt: updated.aiTokenRenewalAt,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/users/:id/plan", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const bodySchema = z.object({
      subscriptionPlan: z.enum(["FREE", "PRO"]),
      topUpNow: z.boolean().optional(),
    });
    const { id } = paramsSchema.parse(request.params);
    const { subscriptionPlan, topUpNow } = bodySchema.parse(request.body ?? {});
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    const nextAllowance = subscriptionPlan === "PRO" ? resolveMonthlyAllowance(user) : 0;
    const nextBalance =
      subscriptionPlan === "PRO"
        ? topUpNow
          ? nextAllowance
          : Math.max(user.aiTokenBalance, nextAllowance)
        : 0;
    const nextPeriodEnd = subscriptionPlan === "PRO" ? user.currentPeriodEnd ?? addMonths(new Date(), 1) : null;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        subscriptionPlan,
        subscriptionStatus: "manual_admin",
        aiTokenMonthlyAllowance: nextAllowance,
        aiTokenBalance: nextBalance,
        currentPeriodEnd: nextPeriodEnd,
        aiTokenRenewalAt: subscriptionPlan === "PRO" ? nextPeriodEnd : null,
      },
    });

    return {
      id: updated.id,
      subscriptionPlan: updated.subscriptionPlan,
      subscriptionStatus: updated.subscriptionStatus,
      currentPeriodEnd: updated.currentPeriodEnd,
      aiTokenBalance: updated.aiTokenBalance,
      aiTokenMonthlyAllowance: updated.aiTokenMonthlyAllowance,
      aiTokenRenewalAt: updated.aiTokenRenewalAt,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/users/:id/tokens", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const bodySchema = z.object({
      op: z.enum(["set", "add", "sub"]),
      amount: z.coerce.number().int().min(0),
    });
    const { id } = paramsSchema.parse(request.params);
    const { op, amount } = bodySchema.parse(request.body ?? {});

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    let nextBalance = user.aiTokenBalance;
    if (op === "set") {
      nextBalance = amount;
    }
    if (op === "add") {
      nextBalance = user.aiTokenBalance + amount;
    }
    if (op === "sub") {
      nextBalance = Math.max(0, user.aiTokenBalance - amount);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { aiTokenBalance: nextBalance },
    });

    return {
      id: updated.id,
      aiTokenBalance: updated.aiTokenBalance,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/users/:id/tokens-allowance", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const bodySchema = z.object({
      aiTokenMonthlyAllowance: z.coerce.number().int().min(0),
      topUpNow: z.boolean().optional(),
    });
    const { id } = paramsSchema.parse(request.params);
    const { aiTokenMonthlyAllowance, topUpNow } = bodySchema.parse(request.body ?? {});

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    const data: Prisma.UserUpdateInput = { aiTokenMonthlyAllowance };
    if (topUpNow) {
      data.aiTokenBalance = aiTokenMonthlyAllowance;
      const periodEnd = user.currentPeriodEnd ?? addMonths(new Date(), 1);
      data.currentPeriodEnd = periodEnd;
      data.aiTokenRenewalAt = periodEnd;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
    });

    return {
      id: updated.id,
      aiTokenMonthlyAllowance: updated.aiTokenMonthlyAllowance,
      aiTokenBalance: updated.aiTokenBalance,
      aiTokenRenewalAt: updated.aiTokenRenewalAt,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/users/:id/tokens/add", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const bodySchema = z.object({
      amount: z.coerce.number().int().min(0),
    });
    const { id } = paramsSchema.parse(request.params);
    const { amount } = bodySchema.parse(request.body ?? {});

    const updated = await prisma.user.update({
      where: { id },
      data: { aiTokenBalance: { increment: amount } },
    });

    return { id: updated.id, aiTokenBalance: updated.aiTokenBalance };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/users/:id/tokens/balance", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const bodySchema = z.object({
      aiTokenBalance: z.coerce.number().int().min(0),
    });
    const { id } = paramsSchema.parse(request.params);
    const { aiTokenBalance } = bodySchema.parse(request.body ?? {});

    const updated = await prisma.user.update({
      where: { id },
      data: { aiTokenBalance },
    });

    return { id: updated.id, aiTokenBalance: updated.aiTokenBalance };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/users/:id/credit-tokens", async (request, reply) => {
  try {
    await requireAdmin(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const bodySchema = z.object({
      amount: z.coerce.number().int().positive(),
      reason: z.string().min(1).max(200).optional(),
    });
    const { id } = paramsSchema.parse(request.params);
    const { amount, reason } = bodySchema.parse(request.body ?? {});

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { aiTokenBalance: { increment: amount } },
      }),
      prisma.aiUsageLog.create({
        data: {
          userId: id,
          feature: "admin_credit",
          model: "manual",
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: -amount,
          costCents: 0,
          currency: "usd",
          meta: reason ? ({ reason } as Prisma.InputJsonValue) : undefined,
        },
      }),
    ]);

    return {
      id: updated.id,
      aiTokenBalance: updated.aiTokenBalance,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/admin/ai-usage", async (request, reply) => {
  try {
    await requireAdmin(request);
    const querySchema = z.object({
      userId: z.string().min(1).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50),
    });
    const { userId, from, to, limit } = querySchema.parse(request.query);
    const fromDate = toDate(from ?? undefined);
    const toDateValue = toDate(to ?? undefined);

    const createdAt: Prisma.DateTimeFilter = {};
    if (fromDate) createdAt.gte = fromDate;
    if (toDateValue) createdAt.lte = toDateValue;

    const where: Prisma.AiUsageLogWhereInput = {
      ...(userId ? { userId } : {}),
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    };

    const [items, summary] = await prisma.$transaction([
      prisma.aiUsageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.aiUsageLog.aggregate({
        where,
        _sum: { totalTokens: true, costCents: true },
      }),
    ]);

    return {
      items,
      summary: {
        totalTokens: summary._sum.totalTokens ?? 0,
        costCents: summary._sum.costCents ?? 0,
      },
    };
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

    const baseExercises = [
      {
        name: "Sentadilla con barra",
        equipment: "Barra",
        mainMuscleGroup: "Piernas",
        secondaryMuscleGroups: ["Glúteos"],
        description: "Mantén la espalda neutra y baja con control.",
      },
      {
        name: "Press banca",
        equipment: "Barra",
        mainMuscleGroup: "Pecho",
        secondaryMuscleGroups: ["Tríceps"],
        description: "Apoya bien los pies y retrae escápulas.",
      },
      {
        name: "Peso muerto rumano",
        equipment: "Barra",
        mainMuscleGroup: "Isquios",
        secondaryMuscleGroups: ["Glúteos"],
        description: "Cadera atrás, rodillas levemente flexionadas.",
      },
      {
        name: "Remo con barra",
        equipment: "Barra",
        mainMuscleGroup: "Espalda",
        secondaryMuscleGroups: ["Bíceps"],
        description: "Tronco inclinado, abdomen activo.",
      },
      {
        name: "Press militar",
        equipment: "Barra o mancuernas",
        mainMuscleGroup: "Hombros",
        secondaryMuscleGroups: ["Tríceps"],
        description: "Aprieta el core para no arquear la espalda.",
      },
    ];

    let seeded = 0;

    for (const ex of baseExercises) {
      await upsertExerciseRecord(ex.name, {
        equipment: ex.equipment,
        mainMuscleGroup: ex.mainMuscleGroup,
        secondaryMuscleGroups: ex.secondaryMuscleGroups,
        description: ex.description,
      });
      seeded += 1;
    }

    return reply.status(200).send({ ok: true, seeded });
  } catch (err) {
    app.log.error({ err }, "seed exercises failed");
    return reply.status(500).send({ error: "INTERNAL_ERROR" });
  }
});

await seedAdmin();
await app.listen({ port: env.PORT, host: env.HOST });
