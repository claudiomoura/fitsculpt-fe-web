import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@prisma/client";
import { handleRequestError } from "../lib/http-utils.js";

type PrismaClient = any;
type RequireUserFn = (request: FastifyRequest) => Promise<User>;

interface FeedDeps {
  prisma: PrismaClient;
  requireUser: RequireUserFn;
}

export function registerFeedRoutes(
  app: FastifyInstance,
  deps: FeedDeps
): void {
  const { prisma, requireUser } = deps;

  // GET /feed
  app.get("/feed", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const query = request.query as Record<string, string | undefined>;
      const limit = Math.min(parseInt(query?.limit || "20") || 20, 100);
      const offset = parseInt(query?.offset || "0") || 0;

      // Get feed items from user's tracking or assigned plans
      const feedItems = [];

      // Get active training plan
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
      });

      const trainingPlan = userProfile?.profile?.trainingPlan;
      if (trainingPlan?.days) {
        for (const day of trainingPlan.days) {
          feedItems.push({
            type: "workout",
            id: day.id,
            title: day.label,
            focus: day.focus,
            date: day.date,
          });
        }
      }

      return {
        items: feedItems.slice(offset, offset + limit),
        total: feedItems.length,
        limit,
        offset,
      };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "feed get error"));
    }
  });

  // POST /feed/generate
  app.post("/feed/generate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      
      // This would trigger AI to generate personalized feed content
      // For now, return a placeholder
      return {
        message: "Feed generation not yet implemented via AI",
        generated: false,
      };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "feed generate error"));
    }
  });
}