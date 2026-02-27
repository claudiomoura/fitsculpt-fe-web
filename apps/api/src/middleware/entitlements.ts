import type { FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@prisma/client";
import { buildEffectiveEntitlements, type EffectiveEntitlements } from "../entitlements.js";

export type AuthenticatedEntitlementsRequest = FastifyRequest & {
  currentUser?: User;
  currentEntitlements?: EffectiveEntitlements;
};

function userHasAiTokens(user: User): boolean {
  return typeof user.aiTokenBalance === "number" && user.aiTokenBalance > 0;
}

export function resolveUserEntitlements(user: User, isBootstrapAdmin: (email: string) => boolean): EffectiveEntitlements {
  return buildEffectiveEntitlements({
    plan: user.plan,
    isAdmin: user.role === "ADMIN" || isBootstrapAdmin(user.email),
  });
}

export function buildEntitlementGuard(params: {
  requireAi: boolean;
  requireDomain?: "nutrition" | "strength";
  forbiddenStatus?: number;
  forbiddenBody?: Record<string, unknown>;
  requireTokensForPaidUsers?: boolean;
  requireUser: (request: FastifyRequest, options?: { logContext?: string }) => Promise<User>;
  isBootstrapAdmin: (email: string) => boolean;
}) {
  const {
    requireAi,
    requireDomain,
    forbiddenStatus = 403,
    forbiddenBody = { error: "AI_ACCESS_FORBIDDEN" },
    requireTokensForPaidUsers = true,
    requireUser,
    isBootstrapAdmin,
  } = params;

  return async function entitlementGuard(request: FastifyRequest, reply: FastifyReply) {
    const user = await requireUser(request, { logContext: request.routeOptions?.url ?? "entitlements" });
    const entitlements = resolveUserEntitlements(user, isBootstrapAdmin);

    if (requireAi && !entitlements.modules.ai.enabled) {
      return reply.status(forbiddenStatus).send(forbiddenBody);
    }

    if (requireTokensForPaidUsers && requireAi && !entitlements.role.adminOverride && !userHasAiTokens(user)) {
      return reply.status(forbiddenStatus).send(forbiddenBody);
    }

    if (requireDomain) {
      const hasDomainAccess = requireDomain === "nutrition"
        ? entitlements.modules.nutrition.enabled
        : entitlements.modules.strength.enabled;
      if (!hasDomainAccess) {
        return reply.status(forbiddenStatus).send(forbiddenBody);
      }
    }

    (request as AuthenticatedEntitlementsRequest).currentUser = user;
    (request as AuthenticatedEntitlementsRequest).currentEntitlements = entitlements;
  };
}
