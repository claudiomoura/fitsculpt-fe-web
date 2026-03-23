import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { rctSummaryQuerySchema, rctSummaryResponseSchema } from "../schemas/rctSummary.js";
import { buildRctExperimentSummary } from "../services/rctSummary.js";

type RequireResearchAccessFn = (request: FastifyRequest) => Promise<unknown>;
type HandleRequestErrorFn = (reply: FastifyReply, error: unknown) => unknown;

export function registerRctSummaryRoute(
  app: FastifyInstance,
  deps: {
    prisma: {
      userProfile: {
        findMany: (...args: any[]) => Promise<Array<{ profile: unknown; tracking: unknown }>>;
      };
    };
    requireResearchAccess: RequireResearchAccessFn;
    handleRequestError: HandleRequestErrorFn;
  },
) {
  app.get("/research/rct/summary", async (request, reply) => {
    try {
      await deps.requireResearchAccess(request);
      const query = rctSummaryQuerySchema.parse(request.query ?? {});

      const profiles = await deps.prisma.userProfile.findMany({
        select: {
          profile: true,
          tracking: true,
        },
      });

      const summary = buildRctExperimentSummary(profiles, query);
      return rctSummaryResponseSchema.parse(summary);
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });
}
