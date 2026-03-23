import type { User } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  futureProjectionResponseSchema,
  rctEventRequestSchema,
  rctEventResponseSchema,
  rctStatusResponseSchema,
} from "../schemas/futureProjection.js";
import {
  appendRctEvent,
  buildFutureProjection,
  buildRctMetricSnapshot,
  ensureRctAssignment,
  getLatestStoredMetric,
  mergeRctMetricSnapshot,
  summarizeRctEvents,
  type RctEvent,
} from "../services/futureProjection.js";
import { normalizeTrackingSnapshot } from "../tracking/service.js";

type RequireUserFn = (
  request: FastifyRequest,
  options?: { logContext?: string },
) => Promise<User>;
type HandleRequestErrorFn = (reply: FastifyReply, error: unknown) => unknown;
type GetOrCreateProfileFn = (
  userId: string,
) => Promise<{ profile: unknown; tracking: unknown }>;

type Goal = "cut" | "maintain" | "bulk";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function resolveGoal(profile: unknown): Goal {
  const source = asRecord(profile);
  const goal = source.goal;
  if (goal === "cut" || goal === "maintain" || goal === "bulk") return goal;
  return "maintain";
}

export function registerFutureProjectionRoutes(
  app: FastifyInstance,
  deps: {
    prisma: {
      userProfile: {
        update: (...args: any[]) => Promise<unknown>;
      };
      trainingPlan: {
        findFirst: (...args: any[]) => Promise<{ daysPerWeek?: number | null } | null>;
      };
    };
    requireUser: RequireUserFn;
    getOrCreateProfile: GetOrCreateProfileFn;
    handleRequestError: HandleRequestErrorFn;
  },
) {
  app.get("/projection/future-self", async (request, reply) => {
    try {
      const user = await deps.requireUser(request, {
        logContext: "/projection/future-self",
      });
      const [profile, trainingPlan] = await Promise.all([
        deps.getOrCreateProfile(user.id),
        deps.prisma.trainingPlan.findFirst({
          where: { userId: user.id },
          orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
          select: { daysPerWeek: true },
        }),
      ]);

      const assignmentResult = ensureRctAssignment(profile.profile, user.id);
      const tracking = normalizeTrackingSnapshot(profile.tracking);
      const projection = buildFutureProjection(
        {
          userId: user.id,
          goal: resolveGoal(profile.profile),
          tracking,
          targetSessionsPerWeek: Math.max(
            1,
            Math.min(7, Math.round(trainingPlan?.daysPerWeek ?? 3)),
          ),
        },
        assignmentResult.assignment,
      );

      const metric = buildRctMetricSnapshot(
        tracking,
        assignmentResult.created ? assignmentResult.profile : profile.profile,
      );
      const profileWithMetrics = mergeRctMetricSnapshot(
        assignmentResult.created ? assignmentResult.profile : profile.profile,
        metric,
      );

      await deps.prisma.userProfile.update({
        where: { userId: user.id },
        data: { profile: profileWithMetrics },
      });

      return futureProjectionResponseSchema.parse(projection);
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });

  app.get("/research/rct/status", async (request, reply) => {
    try {
      const user = await deps.requireUser(request, {
        logContext: "/research/rct/status",
      });
      const profile = await deps.getOrCreateProfile(user.id);
      const assignmentResult = ensureRctAssignment(profile.profile, user.id);
      const tracking = normalizeTrackingSnapshot(profile.tracking);

      const latestMetric =
        getLatestStoredMetric(
          assignmentResult.created ? assignmentResult.profile : profile.profile,
        ) ??
        buildRctMetricSnapshot(
          tracking,
          assignmentResult.created ? assignmentResult.profile : profile.profile,
        );

      const profileWithMetrics = mergeRctMetricSnapshot(
        assignmentResult.created ? assignmentResult.profile : profile.profile,
        latestMetric,
      );

      await deps.prisma.userProfile.update({
        where: { userId: user.id },
        data: { profile: profileWithMetrics },
      });

      return rctStatusResponseSchema.parse({
        experimentId: assignmentResult.assignment.experimentId,
        group: assignmentResult.assignment.group,
        projectionMode: assignmentResult.assignment.projectionMode,
        status: "active",
        assignedAt: assignmentResult.assignment.assignedAt,
        latestMetrics: latestMetric,
        eventCounts: summarizeRctEvents(profileWithMetrics),
      });
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });

  app.post("/research/rct/events", async (request, reply) => {
    try {
      const user = await deps.requireUser(request, {
        logContext: "/research/rct/events",
      });
      const body = rctEventRequestSchema.parse(request.body ?? {});
      const profile = await deps.getOrCreateProfile(user.id);
      const assignmentResult = ensureRctAssignment(profile.profile, user.id);

      const event: RctEvent = {
        event: body.event,
        timestamp: new Date().toISOString(),
        context: body.context,
      };

      const nextProfile = appendRctEvent(
        assignmentResult.created ? assignmentResult.profile : profile.profile,
        event,
      );

      await deps.prisma.userProfile.update({
        where: { userId: user.id },
        data: { profile: nextProfile },
      });

      return rctEventResponseSchema.parse({ ok: true, storedAt: event.timestamp });
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });
}
