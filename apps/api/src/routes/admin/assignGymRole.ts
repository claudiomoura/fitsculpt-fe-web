import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient, User } from "@prisma/client";
import {
  adminAssignGymRoleBodySchema,
  adminAssignGymRoleByUserBodySchema,
  adminAssignGymRoleByUserParamsSchema,
  adminAssignGymRoleParamsSchema,
  normalizeGymRole,
} from "../../schemas/adminAssignGymRole.js";

type RequireAdminFn = (request: FastifyRequest) => Promise<User>;
type HandleRequestErrorFn = (reply: FastifyReply, error: unknown) => unknown;

async function assignGymRole(
  prisma: PrismaClient,
  input: { userId: string; gymId: string; role: "MEMBER" | "TRAINER" }
) {
  const [user, gym] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } }),
    prisma.gym.findUnique({ where: { id: input.gymId }, select: { id: true } }),
  ]);

  if (!user) {
    return { statusCode: 404 as const, payload: { error: "USER_NOT_FOUND" } };
  }

  if (!gym) {
    return { statusCode: 404 as const, payload: { error: "GYM_NOT_FOUND" } };
  }

  const activeMembershipElsewhere = await prisma.gymMembership.findFirst({
    where: {
      userId: input.userId,
      status: "ACTIVE",
      gymId: { not: input.gymId },
    },
    select: { id: true, gymId: true },
  });

  if (activeMembershipElsewhere) {
    return {
      statusCode: 409 as const,
      payload: {
        error: "GYM_MEMBERSHIP_CONFLICT",
        activeMembership: {
          id: activeMembershipElsewhere.id,
          gymId: activeMembershipElsewhere.gymId,
        },
      },
    };
  }

  const membership = await prisma.gymMembership.upsert({
    where: { gymId_userId: { gymId: input.gymId, userId: input.userId } },
    update: {
      role: input.role,
      status: "ACTIVE",
    },
    create: {
      gymId: input.gymId,
      userId: input.userId,
      role: input.role,
      status: "ACTIVE",
    },
    select: {
      id: true,
      userId: true,
      gymId: true,
      role: true,
      status: true,
    },
  });

  return {
    statusCode: 200 as const,
    payload: {
      membershipId: membership.id,
      userId: membership.userId,
      gymId: membership.gymId,
      role: membership.role,
      status: membership.status,
    },
  };
}

export function registerAdminAssignGymRoleRoutes(
  app: FastifyInstance,
  deps: {
    prisma: PrismaClient;
    requireAdmin: RequireAdminFn;
    handleRequestError: HandleRequestErrorFn;
  }
) {
  app.post("/admin/gyms/:gymId/users/:userId/assign-role", async (request, reply) => {
    try {
      await deps.requireAdmin(request);
      const { gymId, userId } = adminAssignGymRoleParamsSchema.parse(request.params);
      const { role } = adminAssignGymRoleBodySchema.parse(request.body);

      const result = await assignGymRole(deps.prisma, {
        gymId,
        userId,
        role: normalizeGymRole(role),
      });

      return reply.status(result.statusCode).send(result.payload);
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });

  app.post("/admin/users/:userId/assign-gym-role", async (request, reply) => {
    try {
      await deps.requireAdmin(request);
      const { userId } = adminAssignGymRoleByUserParamsSchema.parse(request.params);
      const { gymId, role } = adminAssignGymRoleByUserBodySchema.parse(request.body);

      const result = await assignGymRole(deps.prisma, {
        gymId,
        userId,
        role: normalizeGymRole(role),
      });

      return reply.status(result.statusCode).send(result.payload);
    } catch (error) {
      return deps.handleRequestError(reply, error);
    }
  });
}
