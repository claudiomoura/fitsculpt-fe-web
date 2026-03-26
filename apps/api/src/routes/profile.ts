import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@prisma/client";
import { handleRequestError } from "../lib/http-utils.js";

type PrismaClient = any;
type RequireUserFn = (request: FastifyRequest) => Promise<User>;

interface ProfileDeps {
  prisma: PrismaClient;
  requireUser: RequireUserFn;
}

export function registerProfileRoutes(
  app: FastifyInstance,
  deps: ProfileDeps
): void {
  const { prisma, requireUser } = deps;

  // GET /profile
  app.get("/profile", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const profile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        profile: profile?.profile ?? null,
      };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "profile get error"));
    }
  });

  // PUT /profile
  app.put("/profile", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const body = request.body as Record<string, unknown>;

      const updated = await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: { profile: body },
        create: { userId: user.id, profile: body, tracking: {} },
      });

      return { profile: updated.profile };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "profile update error"));
    }
  });

  // GET /tracking
  app.get("/tracking", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const profile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
      });

      return profile?.tracking ?? {};
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "tracking get error"));
    }
  });

  // PUT /tracking
  app.put("/tracking", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const body = request.body as Record<string, unknown>;

      const updated = await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: { tracking: body },
        create: { userId: user.id, profile: {}, tracking: body },
      });

      return { tracking: updated.tracking };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "tracking update error"));
    }
  });

  // POST /tracking
  app.post("/tracking", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const body = request.body as { collection: string; data: Record<string, unknown> };
      const { collection, data } = body;

      const profile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
      });

      const currentTracking = (profile?.tracking as Record<string, unknown[]>) ?? {};
      const collectionData = currentTracking[collection] ?? [];
      const newItem = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      const updatedCollection = [...collectionData, newItem];

      const updated = await prisma.userProfile.update({
        where: { userId: user.id },
        data: { tracking: { ...currentTracking, [collection]: updatedCollection } },
      });

      return { tracking: updated.tracking };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "tracking post error"));
    }
  });

  // DELETE /tracking/:collection/:id
  app.delete("/tracking/:collection/:id", async (request: FastifyRequest<{ Params: { collection: string; id: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const { collection, id } = request.params;

      const profile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
      });

      const currentTracking = (profile?.tracking as Record<string, unknown[]>) ?? {};
      const collectionData = currentTracking[collection] ?? [];
      const updatedCollection = collectionData.filter((item: any) => item.id !== id);

      const updated = await prisma.userProfile.update({
        where: { userId: user.id },
        data: { tracking: { ...currentTracking, [collection]: updatedCollection } },
      });

      return { tracking: updated.tracking };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "tracking delete error"));
    }
  });
}

import * as crypto from "node:crypto";