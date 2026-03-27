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
}

import * as crypto from "node:crypto";