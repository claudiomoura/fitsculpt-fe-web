import type { User } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  weeklyReviewDecisionRequestSchema,
  weeklyReviewDecisionResponseSchema,
  weeklyReviewRequestSchema,
  weeklyReviewResponseSchema,
  type WeeklyReviewResponse,
} from "../schemas/weeklyReview.js";
import { buildWeeklyReview } from "../services/weeklyReview.js";
import { normalizeTrackingSnapshot } from "../tracking/service.js";

type RequireUserFn = (request: FastifyRequest, options?: { logContext?: string }) => Promise<User>;
type HandleRequestErrorFn = (reply: FastifyReply, error: unknown) => unknown;
type GetOrCreateProfileFn = (userId: string) => Promise<{ profile: unknown; tracking: unknown }>;

type ProfileRecord = Record<string, unknown>;

type StoredWeeklyReview = {
  version: 1;
  review: WeeklyReviewResponse;
  updatedAt: string;
};

function asRecord(value: unknown): ProfileRecord {
  return typeof value === "object" && value !== null ? (value as ProfileRecord) : {};
}

function resolveGoal(profile: unknown): string | null {
  const source = asRecord(profile);
  return typeof source.goal === "string" && source.goal.length > 0 ? source.goal : null;
}

function readStoredWeeklyReview(profile: unknown, weekKey: string): StoredWeeklyReview | null {
  const weeklyReviews = asRecord(asRecord(asRecord(profile).adaptiveEngine).weeklyReviews);
  const candidate = asRecord(weeklyReviews[weekKey]);
  if (candidate.version !== 1) return null;
  const review = candidate.review;
  if (typeof candidate.updatedAt !== "string" || typeof review !== "object" || review === null) return null;
  const parsed = weeklyReviewResponseSchema.safeParse(review);
  if (!parsed.success) return null;
  return {
    version: 1,
    review: parsed.data,
    updatedAt: candidate.updatedAt,
  };
}

function mergeStoredWeeklyReview(profile: unknown, weekKey: string, review: WeeklyReviewResponse): ProfileRecord {
  const source = asRecord(profile);
  const adaptiveEngine = asRecord(source.adaptiveEngine);
  const weeklyReviews = asRecord(adaptiveEngine.weeklyReviews);
  const nextReviews = { ...weeklyReviews, [weekKey]: { version: 1, updatedAt: new Date().toISOString(), review } };

  const trimmedEntries = Object.entries(nextReviews)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 8);

  return {
    ...source,
    adaptiveEngine: {
      ...adaptiveEngine,
      weeklyReviews: Object.fromEntries(trimmedEntries),
    },
  };
}

export function registerWeeklyReviewRoute(
  app: FastifyInstance,
  deps: {
    prisma: {
      userProfile: {
        update: (...args: any[]) => Promise<unknown>;
      };
      trainingPlan: {
        findFirst: (...args: any[]) => Promise<{ title?: string | null; daysPerWeek?: number | null } | null>;
      };
      nutritionPlan: {
        findFirst: (...args: any[]) => Promise<{ title?: string | null; dailyCalories?: number | null } | null>;
      };
    };
    requireUser: RequireUserFn;
    getOrCreateProfile: GetOrCreateProfileFn;
    handleRequestError: HandleRequestErrorFn;
  },
) {
  app.get("/review/weekly", async (request, reply) => {
    try {
      const user = await deps.requireUser(request, { logContext: "/review/weekly" });
      const query = weeklyReviewRequestSchema.parse(request.query ?? {});
      const profile = await deps.getOrCreateProfile(user.id);
      const tracking = normalizeTrackingSnapshot(profile.tracking);

      const isDefaultRequest = !query.startDate && !query.endDate;
      const storedDefaultReview = isDefaultRequest ? readStoredWeeklyReview(profile.profile, buildWeeklyReview(tracking, {}, {}).summary.weekKey) : null;
      if (storedDefaultReview) {
        return weeklyReviewResponseSchema.parse(storedDefaultReview.review);
      }

      const [trainingPlan, nutritionPlan] = await Promise.all([
        deps.prisma.trainingPlan.findFirst({
          where: { userId: user.id },
          orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
          select: { title: true, daysPerWeek: true },
        }),
        deps.prisma.nutritionPlan.findFirst({
          where: { userId: user.id },
          orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
          select: { title: true, dailyCalories: true },
        }),
      ]);

      const response = buildWeeklyReview(tracking, query, {
        goal: resolveGoal(profile.profile),
        trainingPlan,
        nutritionPlan,
      });

      if (isDefaultRequest) {
        const nextProfile = mergeStoredWeeklyReview(profile.profile, response.summary.weekKey, response);
        await deps.prisma.userProfile.update({
          where: { userId: user.id },
          data: { profile: nextProfile },
        });
      }

      return weeklyReviewResponseSchema.parse(response);
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });

  app.post("/review/weekly/decision", async (request, reply) => {
    try {
      const user = await deps.requireUser(request, { logContext: "/review/weekly/decision" });
      const body = weeklyReviewDecisionRequestSchema.parse(request.body ?? {});
      const profile = await deps.getOrCreateProfile(user.id);
      const stored = readStoredWeeklyReview(profile.profile, body.weekKey);

      if (!stored) {
        return reply.status(404).send({ error: "WEEKLY_REVIEW_NOT_FOUND" });
      }

      const nextReview: WeeklyReviewResponse = {
        ...stored.review,
        recommendations: stored.review.recommendations.map((recommendation) =>
          recommendation.id === body.recommendationId
            ? { ...recommendation, decision: body.decision }
            : recommendation,
        ),
      };

      const nextProfile = mergeStoredWeeklyReview(profile.profile, body.weekKey, nextReview);
      await deps.prisma.userProfile.update({
        where: { userId: user.id },
        data: { profile: nextProfile },
      });

      return weeklyReviewDecisionResponseSchema.parse({ ok: true, review: nextReview });
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });
}
