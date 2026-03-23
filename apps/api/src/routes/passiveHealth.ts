import type { User } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { passiveHealthDataSchema, passiveHealthSnapshotSchema } from "../tracking/schemas.js";
import { normalizeTrackingSnapshot, replacePassiveHealthData, upsertPassiveHealthSnapshot } from "../tracking/service.js";

type RequireUserFn = (request: FastifyRequest, options?: { logContext?: string }) => Promise<User>;
type HandleRequestErrorFn = (reply: FastifyReply, error: unknown) => unknown;
type GetOrCreateProfileFn = (userId: string) => Promise<{ profile: unknown; tracking: unknown }>;

export function registerPassiveHealthRoutes(
  app: FastifyInstance,
  deps: {
    prisma: {
      userProfile: {
        upsert: (...args: any[]) => Promise<unknown>;
      };
    };
    dbNull: unknown;
    requireUser: RequireUserFn;
    getOrCreateProfile: GetOrCreateProfileFn;
    handleRequestError: HandleRequestErrorFn;
  },
) {
  app.get("/tracking/health", async (request, reply) => {
    try {
      const user = await deps.requireUser(request, { logContext: "/tracking/health" });
      const profile = await deps.getOrCreateProfile(user.id);
      return passiveHealthDataSchema.parse(normalizeTrackingSnapshot(profile.tracking).passiveData);
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });

  app.put("/tracking/health", async (request, reply) => {
    try {
      const user = await deps.requireUser(request, { logContext: "/tracking/health" });
      const payload = passiveHealthDataSchema.parse(request.body ?? {});
      const profile = await deps.getOrCreateProfile(user.id);
      const nextTracking = replacePassiveHealthData(profile.tracking, payload);
      const updated = await deps.prisma.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          profile: deps.dbNull,
          tracking: nextTracking,
        },
        update: {
          tracking: nextTracking,
        },
      });

      return passiveHealthDataSchema.parse(normalizeTrackingSnapshot((updated as { tracking?: unknown }).tracking).passiveData);
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });

  app.post("/tracking/health/snapshots", async (request, reply) => {
    try {
      const user = await deps.requireUser(request, { logContext: "/tracking/health/snapshots" });
      const payload = passiveHealthSnapshotSchema.parse(request.body ?? {});
      const profile = await deps.getOrCreateProfile(user.id);
      const nextTracking = upsertPassiveHealthSnapshot(profile.tracking, payload);
      const updated = await deps.prisma.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          profile: deps.dbNull,
          tracking: nextTracking,
        },
        update: {
          tracking: nextTracking,
        },
      });

      return reply
        .status(201)
        .send(passiveHealthDataSchema.parse(normalizeTrackingSnapshot((updated as { tracking?: unknown }).tracking).passiveData));
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });
}
