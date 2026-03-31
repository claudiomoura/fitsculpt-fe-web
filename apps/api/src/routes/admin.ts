import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { User, PrismaClient } from "@prisma/client";
import { Prisma, Role } from "@prisma/client";
import { handleRequestError } from "../lib/http-utils.js";
import { createHttpError } from "../lib/http-utils.js";
import { getTokenExpiry } from "../lib/date-utils.js";

type RequireUserFn = (request: FastifyRequest) => Promise<User>;
type RequireAdminFn = (request: FastifyRequest) => Promise<User>;

interface AdminDeps {
  prisma: PrismaClient;
  requireUser: RequireUserFn;
  requireAdmin: RequireAdminFn;
}

export function registerAdminRoutes(
  app: FastifyInstance,
  deps: AdminDeps
): void {
  const { prisma, requireUser, requireAdmin } = deps;

  // GET /admin/users
  app.get("/admin/users", async (request: FastifyRequest, reply: FastifyReply) => {
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
                { email: { contains: query, mode: Prisma.QueryMode.insensitive } },
                { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
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
        }),
      ]);

      return { total, page, pageSize, users: users.map(u => ({
        id: u.id, email: u.email, name: u.name, role: u.role,
        isBlocked: u.isBlocked, emailVerified: Boolean(u.emailVerifiedAt),
        createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
      }))};
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "admin users error"));
    }
  });

  // POST /admin/users
  const adminCreateUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
    role: z.nativeEnum(Role).default(Role.USER),
    subscriptionPlan: z.string().optional(),
    aiTokenBalance: z.number().optional(),
  });

  app.post("/admin/users", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await requireAdmin(request);
      const data = adminCreateUserSchema.parse(request.body);
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) return reply.status(409).send({ error: "EMAIL_IN_USE" });

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: data.role,
          plan: (data.subscriptionPlan as any) || "FREE",
          aiTokenBalance: data.aiTokenBalance ?? 0,
          aiTokenResetAt: data.subscriptionPlan !== "FREE" ? getTokenExpiry(30) : null,
          aiTokenRenewalAt: data.subscriptionPlan !== "FREE" ? getTokenExpiry(30) : null,
        },
      });

      return { id: user.id, email: user.email, role: user.role };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "admin create user error"));
    }
  });

  // POST /admin/users/:id/verify-email
  app.post("/admin/users/:id/verify-email", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await requireAdmin(request);
      const { id } = request.params;
      const user = await prisma.user.update({
        where: { id },
        data: { emailVerifiedAt: new Date() },
      });
      return { id: user.id, emailVerified: true };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "verify email error"));
    }
  });

  // POST /admin/users/:id/reset-password
  app.post("/admin/users/:id/reset-password", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await requireAdmin(request);
      const schema = z.object({ newPassword: z.string().min(8) });
      const { newPassword } = schema.parse(request.body);
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: request.params.id },
        data: { passwordHash },
      });
      return { ok: true };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "reset password error"));
    }
  });

  // PATCH /admin/users/:id/block
  app.patch("/admin/users/:id/block", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await requireAdmin(request);
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { isBlocked: true },
      });
      return { id: user.id, isBlocked: user.isBlocked };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "block user error"));
    }
  });

  // PATCH /admin/users/:id/unblock
  app.patch("/admin/users/:id/unblock", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await requireAdmin(request);
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { isBlocked: false },
      });
      return { id: user.id, isBlocked: user.isBlocked };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "unblock user error"));
    }
  });

  // PATCH /admin/users/:id/plan
  app.patch("/admin/users/:id/plan", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await requireAdmin(request);
      const schema = z.object({ plan: z.enum(["FREE", "PRO", "STRENGTH_AI", "NUTRI_AI"]) });
      const { plan } = schema.parse(request.body);
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { plan },
      });
      return { id: user.id, plan: user.plan };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "update plan error"));
    }
  });

  // PATCH /admin/users/:id/tokens
  app.patch("/admin/users/:id/tokens", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await requireAdmin(request);
      const schema = z.object({ aiTokenBalance: z.number().min(0) });
      const { aiTokenBalance } = schema.parse(request.body);
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { aiTokenBalance },
      });
      return { id: user.id, aiTokenBalance: user.aiTokenBalance };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "update tokens error"));
    }
  });

  // PATCH /admin/users/:id/tokens-allowance
  app.patch("/admin/users/:id/tokens-allowance", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await requireAdmin(request);
      const schema = z.object({ aiTokenMonthlyAllowance: z.number().min(0) });
      const { aiTokenMonthlyAllowance } = schema.parse(request.body);
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { aiTokenMonthlyAllowance },
      });
      return { id: user.id, aiTokenMonthlyAllowance: user.aiTokenMonthlyAllowance };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "update tokens allowance error"));
    }
  });

  // POST /admin/users/:id/tokens/add
  app.post("/admin/users/:id/tokens/add", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await requireAdmin(request);
      const schema = z.object({ tokens: z.number().min(1) });
      const { tokens } = schema.parse(request.body);
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { aiTokenBalance: { increment: tokens } },
      });
      return { id: user.id, aiTokenBalance: user.aiTokenBalance };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "add tokens error"));
    }
  });

  // PATCH /admin/users/:id/tokens/balance
  app.patch("/admin/users/:id/tokens/balance", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await requireAdmin(request);
      const schema = z.object({ 
        aiTokenBalance: z.number().min(0),
        aiTokenResetAt: z.string().optional(),
      });
      const data = schema.parse(request.body);
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { 
          aiTokenBalance: data.aiTokenBalance,
          aiTokenResetAt: data.aiTokenResetAt ? new Date(data.aiTokenResetAt) : undefined,
        },
      });
      return { id: user.id, aiTokenBalance: user.aiTokenBalance };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "set tokens balance error"));
    }
  });

  // DELETE /admin/users/:id
  app.delete("/admin/users/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await requireAdmin(request);
      await prisma.user.update({
        where: { id: request.params.id },
        data: { deletedAt: new Date() },
      });
      return { ok: true };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "delete user error"));
    }
  });
}