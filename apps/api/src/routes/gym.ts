import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import type { User, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { handleRequestError } from "../lib/http-utils.js";
import { createHttpError } from "../lib/http-utils.js";

type RequireUserFn = (request: FastifyRequest) => Promise<User>;

interface GymDeps {
  prisma: PrismaClient;
  requireUser: RequireUserFn;
}

export function registerGymRoutes(
  app: FastifyInstance,
  deps: GymDeps
): void {
  const { prisma, requireUser } = deps;

  // GET /gyms - List available gyms
  app.get("/gyms", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const query = request.query as Record<string, string | undefined>;
      const limit = Math.min(parseInt(query?.limit || "20") || 20, 100);
      const offset = parseInt(query?.offset || "0") || 0;
      
      const gyms = await prisma.gym.findMany({
        skip: offset,
        take: limit,
        orderBy: { name: "asc" },
      });
      
      return { items: gyms, total: gyms.length, limit, offset };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "gyms list error"));
    }
  });

  // POST /gyms/join - Request to join a gym
  app.post("/gyms/join", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const schema = z.object({ gymId: z.string().min(1) });
      const { gymId } = schema.parse(request.body);
      
      const existing = await prisma.gymMembership.findFirst({
        where: { userId: user.id, gymId },
      });
      
      if (existing) {
        return reply.status(400).send({ error: "ALREADY_MEMBER" });
      }
      
      const membership = await prisma.gymMembership.create({
        data: {
          userId: user.id,
          gymId,
          role: "MEMBER",
          status: "PENDING",
        },
      });
      
      return { membership };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "gym join error"));
    }
  });

  // POST /gyms/join-by-code - Join by code
  app.post("/gyms/join-by-code", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const schema = z.object({ code: z.string().min(1) });
      const { code } = schema.parse(request.body);
      
      const gym = await prisma.gym.findFirst({
        where: { code: code },
      });
      
      if (!gym) {
        return reply.status(404).send({ error: "GYM_NOT_FOUND" });
      }
      
      const membership = await prisma.gymMembership.create({
        data: {
          userId: user.id,
          gymId: gym.id,
          role: "MEMBER",
          status: "ACTIVE", // Auto-activate for code joins
        },
      });
      
      return { gym, membership };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "gym join by code error"));
    }
  });

  // GET /gyms/membership - Get user's gym membership
  app.get("/gyms/membership", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      
      const membership = await prisma.gymMembership.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
        include: { gym: true },
      });
      
      if (!membership) {
        return reply.status(404).send({ error: "MEMBERSHIP_NOT_FOUND" });
      }
      
      return membership;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "gym membership error"));
    }
  });

  // DELETE /gyms/membership - Leave gym
  app.delete("/gyms/membership", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      
      const membership = await prisma.gymMembership.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
      });
      
      if (!membership) {
        return reply.status(404).send({ error: "MEMBERSHIP_NOT_FOUND" });
      }
      
      await prisma.gymMembership.delete({
        where: { id: membership.id },
      });
      
      return { ok: true };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "gym leave error"));
    }
  });

  // GET /admin/gym-join-requests - Admin: get pending join requests
  app.get("/admin/gym-join-requests", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      
      // Check admin
      if (user.role !== "ADMIN") {
        throw createHttpError(403, "FORBIDDEN");
      }
      
      const requests = await prisma.gymMembership.findMany({
        where: { status: "PENDING" },
        include: { user: { select: { id: true, email: true, name: true } }, gym: true },
      });
      
      return { items: requests };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "admin gym requests error"));
    }
  });

  // POST /admin/gym-join-requests/:membershipId/accept
  app.post("/admin/gym-join-requests/:membershipId/accept", async (request: FastifyRequest<{ Params: { membershipId: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const { membershipId } = request.params;
      
      if (user.role !== "ADMIN") {
        throw createHttpError(403, "FORBIDDEN");
      }
      
      const updated = await prisma.gymMembership.update({
        where: { id: membershipId },
        data: { status: "ACTIVE" },
      });
      
      return updated;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "accept gym request error"));
    }
  });

  // POST /admin/gym-join-requests/:membershipId/reject
  app.post("/admin/gym-join-requests/:membershipId/reject", async (request: FastifyRequest<{ Params: { membershipId: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const { membershipId } = request.params;
      
      if (user.role !== "ADMIN") {
        throw createHttpError(403, "FORBIDDEN");
      }
      
      await prisma.gymMembership.delete({
        where: { id: membershipId },
      });
      
      return { ok: true };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "reject gym request error"));
    }
  });

  // GET /admin/gyms/:gymId/members
  app.get("/admin/gyms/:gymId/members", async (request: FastifyRequest<{ Params: { gymId: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const { gymId } = request.params;
      
      if (user.role !== "ADMIN") {
        throw createHttpError(403, "FORBIDDEN");
      }
      
      const members = await prisma.gymMembership.findMany({
        where: { gymId },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      
      return { items: members };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "gym members error"));
    }
  });

  // GET /trainer/gym - Get trainer's gym
  app.get("/trainer/gym", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      
      const membership = await prisma.gymMembership.findFirst({
        where: { userId: user.id, role: { in: ["ADMIN", "TRAINER"] }, status: "ACTIVE" },
        include: { gym: true },
      });
      
      if (!membership) {
        return reply.status(404).send({ error: "TRAINER_GYM_NOT_FOUND" });
      }
      
      return membership.gym;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer gym error"));
    }
  });

  // PATCH /trainer/gym - Update trainer's gym
  app.patch("/trainer/gym", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const body = request.body as Record<string, unknown>;
      
      const membership = await prisma.gymMembership.findFirst({
        where: { userId: user.id, role: { in: ["ADMIN", "TRAINER"] }, status: "ACTIVE" },
      });
      
      if (!membership) {
        return reply.status(404).send({ error: "TRAINER_GYM_NOT_FOUND" });
      }
      
      const updated = await prisma.gym.update({
        where: { id: membership.gymId },
        data: body,
      });
      
      return updated;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer gym update error"));
    }
  });

  // POST /admin/gyms - Create new gym (admin)
  app.post("/admin/gyms", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      
      if (user.role !== "ADMIN") {
        throw createHttpError(403, "FORBIDDEN");
      }
      
      const schema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      });
      const data = schema.parse(request.body);
      
      const gym = await prisma.gym.create({
        data: {
          name: data.name,
          code: crypto.randomBytes(8).toString("hex"),
          activationCode: crypto.randomBytes(8).toString("hex"),
        },
      });
      
      return gym;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "admin create gym error"));
    }
  });

  // DELETE /admin/gyms/:gymId - Delete gym (admin)
  app.delete("/admin/gyms/:gymId", async (request: FastifyRequest<{ Params: { gymId: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const { gymId } = request.params;
      
      if (user.role !== "ADMIN") {
        throw createHttpError(403, "FORBIDDEN");
      }
      
      await prisma.gym.delete({ where: { id: gymId } });
      
      return { ok: true };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "admin delete gym error"));
    }
  });

  // PATCH /admin/gyms/:gymId/members/:userId/role
  app.patch("/admin/gyms/:gymId/members/:userId/role", async (request: FastifyRequest<{ Params: { gymId: string; userId: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const { gymId, userId } = request.params;
      const body = request.body as { role: string };
      
      if (user.role !== "ADMIN") {
        throw createHttpError(403, "FORBIDDEN");
      }
      
      const updated = await prisma.gymMembership.update({
        where: { gymId_userId: { gymId, userId } },
        data: { role: body.role as any },
      });
      
      return updated;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "admin update member role error"));
    }
  });
}