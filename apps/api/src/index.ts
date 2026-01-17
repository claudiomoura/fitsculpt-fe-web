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

const env = getEnv();
const prisma = new PrismaClient();

const app = Fastify({ logger: true });

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
    signed: true,
  },
});

const VERIFICATION_TTL_MS = env.VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = env.VERIFICATION_RESEND_COOLDOWN_MINUTES * 60 * 1000;

app.get("/health", async () => ({ status: "ok" }));

function createHttpError(statusCode: number, code: string) {
  const error = new Error(code) as Error & { statusCode?: number; code?: string };
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function handleRequestError(reply: FastifyReply, error: unknown) {
  if (error instanceof z.ZodError) {
    return reply.status(400).send({ error: "INVALID_INPUT", details: error.flatten() });
  }
  const typed = error as { statusCode?: number; code?: string };
  if (typed.statusCode) {
    return reply.status(typed.statusCode).send({ error: typed.code ?? "REQUEST_ERROR" });
  }
  return reply.status(401).send({ error: "UNAUTHORIZED" });
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
    signed: true,
  };
}

async function requireUser(request: FastifyRequest) {
  const payload = await request.jwtVerify<{ sub: string }>();
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.deletedAt) {
    throw createHttpError(404, "NOT_FOUND");
  }
  if (user.isBlocked) {
    throw createHttpError(403, "USER_BLOCKED");
  }
  return user;
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

const trainingPreferencesSchema = z.object({
  goal: z.enum(["cut", "maintain", "bulk"]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  daysPerWeek: z.number().int().min(2).max(5),
  sessionTime: z.enum(["short", "medium", "long"]),
  focus: z.enum(["full", "upperLower", "ppl"]),
  equipment: z.enum(["gym", "home"]),
});

const nutritionPreferencesSchema = z.object({
  goal: z.enum(["cut", "maintain", "bulk"]),
  mealsPerDay: z.number().int().min(1).max(6),
  dietaryPrefs: z.string(),
  dislikes: z.string(),
  cookingTime: z.enum(["quick", "medium", "long"]),
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
  activity: z.enum(["sedentary", "light", "moderate", "very", "extra"]),
  profilePhotoUrl: z.string().nullable(),
  avatarDataUrl: z.string().nullable().optional(),
  trainingPlan: z.any().nullable().optional(),
  nutritionPlan: z.any().nullable().optional(),
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

const defaultTracking = {
  checkins: [],
  foodLog: [],
  workoutLog: [],
};

const aiTrainingSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.number().int().min(10).max(100),
  sex: z.enum(["male", "female"]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  goal: z.enum(["cut", "maintain", "bulk"]),
  equipment: z.enum(["gym", "home"]),
  daysPerWeek: z.number().int().min(2).max(5),
  sessionTime: z.enum(["short", "medium", "long"]),
  focus: z.enum(["full", "upperLower", "ppl"]),
  timeAvailableMinutes: z.number().int().min(20).max(120),
  restrictions: z.string().optional(),
});

const aiNutritionSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.number().int().min(10).max(100),
  sex: z.enum(["male", "female"]),
  goal: z.enum(["cut", "maintain", "bulk"]),
  mealsPerDay: z.number().int().min(3).max(4),
  calories: z.number().int().min(1200).max(4000),
  dietaryRestrictions: z.string().optional(),
});

const aiTipSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.enum(["cut", "maintain", "bulk"]).optional(),
});

type AiRequestType = "training" | "nutrition" | "tip";

function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function stableStringify(value: unknown) {
  if (!value || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, val]) => `"${key}":${stableStringify(val)}`).join(",")}}`;
}

function buildCacheKey(type: AiRequestType, params: Record<string, unknown>) {
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
    throw createHttpError(429, "AI_LIMIT_REACHED");
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
    data: { userId, type, source, payload },
  });
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
    create: { key, type, payload },
    update: { payload, lastUsedAt: new Date() },
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
        day: "Día 1",
        focus: "Push",
        exercises: [
          { name: "Press banca", sets: "4 x 8-10" },
          { name: "Press militar", sets: "3 x 10" },
          { name: "Fondos", sets: "3 x 12" },
        ],
      },
      {
        day: "Día 2",
        focus: "Pull",
        exercises: [
          { name: "Remo con barra", sets: "4 x 8-10" },
          { name: "Dominadas", sets: "3 x 8-10" },
          { name: "Curl bíceps", sets: "3 x 12" },
        ],
      },
      {
        day: "Día 3",
        focus: "Legs",
        exercises: [
          { name: "Sentadilla", sets: "4 x 8-10" },
          { name: "Peso muerto rumano", sets: "3 x 10" },
          { name: "Hip thrust", sets: "3 x 12" },
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
        day: "Lunes",
        meals: [
          { name: "Desayuno", calories: Math.round(params.calories * 0.3), macros: "P/C/F balanceado" },
          { name: "Comida", calories: Math.round(params.calories * 0.4), macros: "Alta proteína" },
          { name: "Cena", calories: Math.round(params.calories * 0.3), macros: "Ligera" },
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
  return [
    "Eres un coach fitness.",
    "Genera un plan semanal de entrenamiento en JSON.",
    `Edad: ${data.age}. Sexo: ${data.sex}. Nivel: ${data.level}. Objetivo: ${data.goal}.`,
    `Días/semana: ${data.daysPerWeek}. Equipo: ${data.equipment}. Enfoque: ${data.focus}.`,
    `Tiempo disponible: ${data.timeAvailableMinutes} min. Restricciones: ${data.restrictions ?? "ninguna"}.`,
    'Salida JSON: {"title":string,"days":[{"day":string,"focus":string,"exercises":[{"name":string,"sets":string,"reps":string}]}],"notes":string}',
  ].join(" ");
}

function buildNutritionPrompt(data: z.infer<typeof aiNutritionSchema>) {
  return [
    "Eres un nutricionista.",
    "Genera un plan semanal en JSON.",
    `Edad: ${data.age}. Sexo: ${data.sex}. Objetivo: ${data.goal}.`,
    `Calorías diarias: ${data.calories}. Comidas/día: ${data.mealsPerDay}.`,
    `Restricciones: ${data.dietaryRestrictions ?? "ninguna"}.`,
    'Salida JSON: {"title":string,"dailyCalories":number,"proteinG":number,"fatG":number,"carbsG":number,"days":[{"day":string,"meals":[{"name":string,"calories":number,"macros":string}]}]}',
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
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw createHttpError(502, "AI_PARSE_ERROR");
  }
  const json = text.slice(start, end + 1);
  return JSON.parse(json) as Record<string, unknown>;
}

async function callOpenAi(prompt: string) {
  if (!env.OPENAI_API_KEY) {
    throw createHttpError(503, "AI_UNAVAILABLE");
  }
  const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Responde solo con JSON válido, sin texto extra." },
        { role: "user", content: prompt },
      ],
      max_tokens: 250,
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    throw createHttpError(502, "AI_REQUEST_FAILED");
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw createHttpError(502, "AI_EMPTY_RESPONSE");
  }
  return extractJson(content);
}

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type TrackingSnapshot = {
  checkins?: Array<{ date?: string; weightKg?: number }>;
  foodLog?: Array<{ date?: string }>;
  workoutLog?: Array<{ date?: string }>;
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
    };
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

  const querySchema = z.object({ code: z.string().min(1), state: z.string().min(1) });
  const { code, state } = querySchema.parse(request.query);

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
  reply.setCookie("fs_token", token, buildCookieOptions());

  return reply.status(200).send({ ok: true });
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
    const nextProfile = {
      ...existingProfile,
      ...data,
      measurements: {
        ...existingMeasurements,
        ...data.measurements,
      },
      trainingPreferences: {
        ...existingTraining,
        ...data.trainingPreferences,
      },
      nutritionPreferences: {
        ...existingNutrition,
        ...data.nutritionPreferences,
      },
      macroPreferences: {
        ...existingMacros,
        ...data.macroPreferences,
      },
    };
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

    return updated.tracking ?? defaultTracking;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/ai/training-plan", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const data = aiTrainingSchema.parse(request.body);
    const cacheKey = buildCacheKey("training", data);
    const template = buildTrainingTemplate(data);

    if (template) {
      const personalized = applyPersonalization(template, { name: data.name });
      await storeAiContent(user.id, "training", "template", personalized);
      return reply.status(200).send(personalized);
    }

    const cached = await getCachedAiPayload(cacheKey);
    if (cached) {
      const personalized = applyPersonalization(cached, { name: data.name });
      await storeAiContent(user.id, "training", "cache", personalized);
      return reply.status(200).send(personalized);
    }

    await enforceAiQuota(user);
    const prompt = buildTrainingPrompt(data);
    const payload = await callOpenAi(prompt);
    await saveCachedAiPayload(cacheKey, "training", payload);
    const personalized = applyPersonalization(payload, { name: data.name });
    await storeAiContent(user.id, "training", "ai", personalized);
    return reply.status(200).send(personalized);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/ai/nutrition-plan", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const data = aiNutritionSchema.parse(request.body);
    const cacheKey = buildCacheKey("nutrition", data);
    const template = buildNutritionTemplate(data);

    if (template) {
      const personalized = applyPersonalization(template, { name: data.name });
      await storeAiContent(user.id, "nutrition", "template", personalized);
      return reply.status(200).send(personalized);
    }

    const cached = await getCachedAiPayload(cacheKey);
    if (cached) {
      const personalized = applyPersonalization(cached, { name: data.name });
      await storeAiContent(user.id, "nutrition", "cache", personalized);
      return reply.status(200).send(personalized);
    }

    await enforceAiQuota(user);
    const prompt = buildNutritionPrompt(data);
    const payload = await callOpenAi(prompt);
    await saveCachedAiPayload(cacheKey, "nutrition", payload);
    const personalized = applyPersonalization(payload, { name: data.name });
    await storeAiContent(user.id, "nutrition", "ai", personalized);
    return reply.status(200).send(personalized);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/ai/daily-tip", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const data = aiTipSchema.parse(request.body);
    const cacheKey = buildCacheKey("tip", data);
    const template = buildTipTemplate();

    if (template) {
      const personalized = applyPersonalization(template, { name: data.name ?? "amigo" });
      await storeAiContent(user.id, "tip", "template", personalized);
      return reply.status(200).send(personalized);
    }

    const cached = await getCachedAiPayload(cacheKey);
    if (cached) {
      const personalized = applyPersonalization(cached, { name: data.name ?? "amigo" });
      await storeAiContent(user.id, "tip", "cache", personalized);
      return reply.status(200).send(personalized);
    }

    await enforceAiQuota(user);
    const prompt = buildTipPrompt(data);
    const payload = await callOpenAi(prompt);
    await saveCachedAiPayload(cacheKey, "tip", payload);
    const personalized = applyPersonalization(payload, { name: data.name ?? "amigo" });
    await storeAiContent(user.id, "tip", "ai", personalized);
    return reply.status(200).send(personalized);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/feed", async (request, reply) => {
  try {
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

app.get("/admin/users", async (request, reply) => {
  try {
    await requireAdmin(request);
    const querySchema = z.object({
      query: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
    });
    const { query, page } = querySchema.parse(request.query);
    const pageSize = 20;
    const where = {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
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
        : user.authProviders.some((provider) => provider.provider === "google")
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

await seedAdmin();
await app.listen({ port: env.PORT, host: env.HOST });
