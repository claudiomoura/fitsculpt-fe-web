import { Prisma, type User } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  defaultTracking,
  trackingDeleteSchema,
  trackingEntryCreateSchema,
  trackingSchema,
} from "../tracking/schemas.js";
import {
  normalizeTrackingSnapshot,
  upsertTrackingEntry,
} from "../tracking/service.js";
import {
  appendRctEvent,
  ensureRctAssignment,
} from "../services/futureProjection.js";

type RequireUserFn = (
  request: FastifyRequest,
  options?: { logContext?: string },
) => Promise<User>;
type HandleRequestErrorFn = (reply: FastifyReply, error: unknown) => unknown;
type GetOrCreateProfileFn = (
  userId: string,
) => Promise<{ profile: unknown; tracking: unknown }>;

export function registerTrackingRoutes(
  app: FastifyInstance,
  deps: {
    prisma: {
      userProfile: {
        upsert: (...args: any[]) => Promise<unknown>;
        update: (...args: any[]) => Promise<unknown>;
      };
    };
    requireUser: RequireUserFn;
    getOrCreateProfile: GetOrCreateProfileFn;
    handleRequestError: HandleRequestErrorFn;
  },
) {
  app.get("/tracking", async (request, reply) => {
    try {
      const user = await deps.requireUser(request);
      const profile = await deps.getOrCreateProfile(user.id);
      return normalizeTrackingSnapshot(profile.tracking);
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });

  app.put("/tracking", async (request, reply) => {
    try {
      const user = await deps.requireUser(request);
      const currentProfile = await deps.getOrCreateProfile(user.id);
      const currentTracking = normalizeTrackingSnapshot(currentProfile.tracking);
      const normalizedBody = normalizeTrackingSnapshot(request.body);
      const hasPassiveData =
        typeof request.body === "object" &&
        request.body !== null &&
        Object.prototype.hasOwnProperty.call(request.body, "passiveData");
      const hasWeeklyCoach =
        typeof request.body === "object" &&
        request.body !== null &&
        Object.prototype.hasOwnProperty.call(request.body, "weeklyCoach");
      const data = trackingSchema.parse({
        ...normalizedBody,
        passiveData: hasPassiveData
          ? normalizedBody.passiveData
          : currentTracking.passiveData,
        weeklyCoach: hasWeeklyCoach ? normalizedBody.weeklyCoach : currentTracking.weeklyCoach,
      });
      const updated = await deps.prisma.userProfile.upsert({
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
      app.log.info(
        {
          userId: user.id,
          checkins: data.checkins.length,
          foodLog: data.foodLog.length,
          workoutLog: data.workoutLog.length,
        },
        "tracking updated",
      );

      return normalizeTrackingSnapshot(
        (updated as { tracking?: unknown }).tracking ?? defaultTracking,
      );
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });

  app.post("/tracking", async (request, reply) => {
    try {
      const user = await deps.requireUser(request);
      const payload = trackingEntryCreateSchema.parse(request.body);
      const profile = await deps.getOrCreateProfile(user.id);
      const nextTracking = upsertTrackingEntry(profile.tracking, payload);
      const assignmentResult = ensureRctAssignment(profile.profile, user.id);
      const nextProfile = appendRctEvent(
        assignmentResult.created ? assignmentResult.profile : profile.profile,
        {
          event: "logging_entry_created",
          timestamp: new Date().toISOString(),
          context: {
            source: "tracking",
            collection: payload.collection,
          },
        },
      );
      const nextProfileJson = nextProfile as Prisma.InputJsonValue;

      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const updated = await deps.prisma.userProfile.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              profile: nextProfileJson,
              tracking: nextTracking,
            },
            update: {
              profile: nextProfileJson,
              tracking: nextTracking,
            },
          });

          return reply
            .status(201)
            .send(normalizeTrackingSnapshot((updated as { tracking?: unknown }).tracking));
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError;
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });

  app.delete("/tracking/:collection/:id", async (request, reply) => {
    try {
      const user = await deps.requireUser(request);
      const params = trackingDeleteSchema.parse(request.params);
      const profile = await deps.getOrCreateProfile(user.id);
      const currentTracking = normalizeTrackingSnapshot(profile.tracking);
      const rawList = currentTracking[params.collection];
      const currentList = Array.isArray(rawList) ? rawList : [];
      const nextList = currentList.filter((entry) => entry.id !== params.id);

      const nextTracking = { ...currentTracking, [params.collection]: nextList };
      const updated = await deps.prisma.userProfile.update({
        where: { userId: user.id },
        data: { tracking: nextTracking },
      });
      return normalizeTrackingSnapshot((updated as { tracking?: unknown }).tracking);
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });
}
