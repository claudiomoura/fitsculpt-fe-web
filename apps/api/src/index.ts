import Fastify from "fastify";
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
    const payload = await request.jwtVerify<{ sub: string }>();
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return { id: user.id, email: user.email, name: user.name };
  } catch {
    return reply.status(401).send({ error: "UNAUTHORIZED" });
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

await app.listen({ port: env.PORT, host: env.HOST });
