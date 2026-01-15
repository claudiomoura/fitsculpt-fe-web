import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { getEnv } from "./config.js";

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

app.get("/health", async () => ({ status: "ok" }));

function handleRequestError(reply: FastifyReply, error: unknown) {
  if (error instanceof z.ZodError) {
    return reply.status(400).send({ error: "INVALID_INPUT", details: error.flatten() });
  }
  if ((error as { statusCode?: number }).statusCode === 404) {
    return reply.status(404).send({ error: "NOT_FOUND" });
  }
  return reply.status(401).send({ error: "UNAUTHORIZED" });
}

async function requireUser(request: FastifyRequest) {
  const payload = await request.jwtVerify<{ sub: string }>();
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    const error = new Error("NOT_FOUND");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }
  return user;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).optional(),
});

app.post("/auth/register", async (request, reply) => {
  const data = registerSchema.parse(request.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return reply.status(409).send({ error: "EMAIL_IN_USE" });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      provider: "email",
    },
  });

  const token = await reply.jwtSign({ sub: user.id, email: user.email });
  reply.setCookie("fs_token", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    signed: true,
  });

  return { id: user.id, email: user.email, name: user.name };
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

app.post("/auth/login", async (request, reply) => {
  const data = loginSchema.parse(request.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.passwordHash) {
    return reply.status(401).send({ error: "INVALID_CREDENTIALS" });
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    return reply.status(401).send({ error: "INVALID_CREDENTIALS" });
  }

  const token = await reply.jwtSign({ sub: user.id, email: user.email });
  reply.setCookie("fs_token", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    signed: true,
  });

  return { id: user.id, email: user.email, name: user.name };
});

app.post("/auth/logout", async (_request, reply) => {
  reply.clearCookie("fs_token", { path: "/" });
  return { ok: true };
});

app.get("/auth/me", async (request, reply) => {
  try {
    const user = await requireUser(request);
    return { id: user.id, email: user.email, name: user.name };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/auth/google/start", async (_request, reply) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URL) {
    return reply.status(501).send({ error: "GOOGLE_OAUTH_NOT_CONFIGURED" });
  }

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URL,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });

  reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get("/auth/google/callback", async (request, reply) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URL) {
    return reply.status(501).send({ error: "GOOGLE_OAUTH_NOT_CONFIGURED" });
  }

  const querySchema = z.object({ code: z.string().min(1) });
  const { code } = querySchema.parse(request.query);

  return reply.status(501).send({
    error: "GOOGLE_OAUTH_PENDING",
    message: "Exchange code for tokens and create/login user here.",
    code,
  });
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

await app.listen({ port: env.PORT, host: env.HOST });
