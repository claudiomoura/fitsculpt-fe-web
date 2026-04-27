import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import * as crypto from "node:crypto";
import { hashToken } from "../authUtils.js";
import { handleRequestError } from "../lib/http-utils.js";
import { authRateLimitMiddleware } from "../middleware/authRateLimit.js";

type PrismaClient = any;

interface AuthDeps {
  prisma: PrismaClient;
  app: FastifyInstance;
  appBaseUrl: string;
}

export function buildAuthActionUrl(appBaseUrl: string, path: "/verify-email" | "/reset-password", token: string) {
  const url = new URL(path, appBaseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

/**
 * Register auth routes that are NOT already defined in index.ts.
 *
 * index.ts already handles: login, me, change-password, google/start, google/callback
 *
 * This module adds: resend-verification, verify-email, forgot-password, reset-password
 */
export function registerAuthRoutes(
  app: FastifyInstance,
  deps: AuthDeps
): void {
  const { prisma, appBaseUrl } = deps;

  // POST /auth/resend-verification
  const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

  app.post("/auth/resend-verification", async (request: FastifyRequest, reply: FastifyReply) => {
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

      if (
        latestToken &&
        Date.now() - latestToken.createdAt.getTime() < RESEND_COOLDOWN_MS
      ) {
        return reply.status(429).send({ error: "RESEND_TOO_SOON" });
      }

      // Hash the token before storing (security best practice)
      const token = crypto.randomUUID();
      const tokenHash = hashToken(token);
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Send verification email with the raw token (not the hash)
      const verifyUrl = buildAuthActionUrl(appBaseUrl, "/verify-email", token);
      try {
        const { sendEmail } = await import("../email.js");
        await sendEmail({
          to: user.email,
          subject: "Verify your FitSculpt email",
          html: `<p>Click the link below to verify your email:</p><a href="${verifyUrl}">Verify Email</a>`,
          text: `Verify your email by clicking: ${verifyUrl}`,
        });
      } catch (emailError) {
        app.log.error({ err: emailError }, "Failed to send verification email");
      }
      return reply.status(200).send({ ok: true });
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "resend verification error"));
    }
  });

  // GET /auth/verify-email
  app.get("/auth/verify-email", async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({ token: z.string().min(1) });
    try {
      const { token } = schema.parse(request.query);
      // Hash the incoming token before lookup (matches how we store it)
      const tokenHash = hashToken(token);
      const record = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash },
      });
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
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "verify email error"));
    }
  });

  // POST /auth/forgot-password
  const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
  const RESET_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

  app.post("/auth/forgot-password", { preHandler: [authRateLimitMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({ email: z.string().email() });
    try {
      const { email } = schema.parse(request.body);
      const user = await prisma.user.findUnique({ where: { email } });

      // Always return 200 to prevent email enumeration
      if (!user || user.deletedAt) {
        return reply.status(200).send({ ok: true });
      }

      // Only allow reset for email/password users (not Google-only accounts)
      if (!user.passwordHash) {
        return reply.status(200).send({ ok: true });
      }

      // Check cooldown
      const latestToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      if (latestToken && Date.now() - latestToken.createdAt.getTime() < RESET_RESEND_COOLDOWN_MS) {
        return reply.status(429).send({ error: "RESET_TOO_SOON" });
      }

      // Create hashed reset token
      const token = crypto.randomUUID();
      const tokenHash = hashToken(token);
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      // Send reset email
      const resetUrl = buildAuthActionUrl(appBaseUrl, "/reset-password", token);
      try {
        const { sendEmail } = await import("../email.js");
        await sendEmail({
          to: user.email,
          subject: "Reset your FitSculpt password",
          html: `<p>Click the link below to reset your password:</p><a href="${resetUrl}">Reset Password</a><p>This link expires in 1 hour.</p>`,
          text: `Reset your password by clicking: ${resetUrl}. This link expires in 1 hour.`,
        });
      } catch (emailError) {
        app.log.error({ err: emailError }, "Failed to send password reset email");
      }

      return reply.status(200).send({ ok: true });
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "forgot password error"));
    }
  });

  // POST /auth/bypass - Development-only endpoint to bypass email verification
  app.post("/auth/bypass", async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({ email: z.string().email() });
    try {
      const input =
        request.body && typeof request.body === "object"
          ? request.body
          : request.query;
      const { email } = schema.parse(input);

      // Only allow in development
      if (process.env.NODE_ENV === "production") {
        return reply.status(403).send({ error: "BYPASS_NOT_ALLOWED_IN_PRODUCTION" });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.status(404).send({ error: "USER_NOT_FOUND" });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });

      return reply.status(200).send({ ok: true, message: "Email verification bypassed" });
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "bypass error"));
    }
  });

  // POST /auth/reset-password
  app.post("/auth/reset-password", async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      token: z.string().min(1),
      password: z.string().min(8),
    });
    try {
      const { token, password } = schema.parse(request.body);
      const tokenHash = hashToken(token);

      const record = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      });

      if (!record) {
        return reply.status(400).send({ error: "INVALID_TOKEN" });
      }

      if (record.expiresAt.getTime() < Date.now()) {
        await prisma.passwordResetToken.delete({ where: { id: record.id } });
        return reply.status(400).send({ error: "TOKEN_EXPIRED" });
      }

      // Hash new password and update user
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });

      // Consume the reset token
      await prisma.passwordResetToken.delete({ where: { id: record.id } });

      return reply.status(200).send({ ok: true });
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "reset password error"));
    }
  });
}
