import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@prisma/client";
import { handleRequestError } from "../lib/http-utils.js";

type PrismaClient = any;
type RequireUserFn = (request: FastifyRequest) => Promise<User>;

interface ProfileDeps {
  prisma: PrismaClient;
  requireUser: RequireUserFn;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeProfileSnapshot(current: unknown, incoming: unknown): Record<string, unknown> {
  const currentRecord = isPlainRecord(current) ? current : {};
  const incomingRecord = isPlainRecord(incoming) ? incoming : {};
  const merged: Record<string, unknown> = { ...currentRecord };

  Object.entries(incomingRecord).forEach(([key, value]) => {
    if (isPlainRecord(value) && isPlainRecord(currentRecord[key])) {
      merged[key] = mergeProfileSnapshot(currentRecord[key], value);
      return;
    }

    merged[key] = value;
  });

  return merged;
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
      const body = request.body as unknown;

      const currentProfile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
      });
      const mergedProfile = mergeProfileSnapshot(currentProfile?.profile, body);

      const updated = await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: { profile: mergedProfile },
        create: { userId: user.id, profile: mergedProfile, tracking: {} },
      });

      return { profile: updated.profile };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "profile update error"));
    }
  });
}
