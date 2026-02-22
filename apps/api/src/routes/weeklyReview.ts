import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@prisma/client";
import { weeklyReviewRequestSchema, weeklyReviewResponseSchema } from "../schemas/weeklyReview.js";
import { normalizeTrackingSnapshot } from "../tracking/service.js";
import { buildWeeklyReview } from "../services/weeklyReview.js";

type RequireUserFn = (request: FastifyRequest, options?: { logContext?: string }) => Promise<User>;

type HandleRequestErrorFn = (reply: FastifyReply, error: unknown) => unknown;

type GetOrCreateProfileFn = (userId: string) => Promise<{ tracking: unknown }>;

export function registerWeeklyReviewRoute(
  app: FastifyInstance,
  deps: {
    requireUser: RequireUserFn;
    getOrCreateProfile: GetOrCreateProfileFn;
    handleRequestError: HandleRequestErrorFn;
  }
) {
  app.get("/review/weekly", async (request, reply) => {
    try {
      const user = await deps.requireUser(request, { logContext: "/review/weekly" });
      const query = weeklyReviewRequestSchema.parse(request.query ?? {});
      const profile = await deps.getOrCreateProfile(user.id);
      const tracking = normalizeTrackingSnapshot(profile.tracking);
      const response = buildWeeklyReview(tracking, query);
      return weeklyReviewResponseSchema.parse(response);
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });
}
