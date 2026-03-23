import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  rctStatisticalReportQuerySchema,
  rctStatisticalReportResponseSchema,
} from "../schemas/rctStatisticalReport.js";
import { buildRctStatisticalReport } from "../services/rctStatisticalReport.js";

type RequireResearchAccessFn = (request: FastifyRequest) => Promise<unknown>;
type HandleRequestErrorFn = (reply: FastifyReply, error: unknown) => unknown;

export function registerRctStatisticalReportRoute(
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
  app.get("/research/rct/statistical-report", async (request, reply) => {
    try {
      await deps.requireResearchAccess(request);
      const query = rctStatisticalReportQuerySchema.parse(request.query ?? {});

      const profiles = await deps.prisma.userProfile.findMany({
        select: {
          profile: true,
          tracking: true,
        },
      });

      const report = buildRctStatisticalReport(profiles, query);
      return rctStatisticalReportResponseSchema.parse(report);
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });
}
