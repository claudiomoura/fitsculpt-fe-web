import { Prisma } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

export function registerGymRoutes(app: FastifyInstance, deps: Record<string, any>) {
  const {
    prisma,
    requireUser,
    requireAdmin,
    handleRequestError,
    assignTrainingPlanParamsSchema,
    assignTrainingPlanBodySchema,
    requireGymManagerAccess,
    trainerMemberParamsSchema,
    assignedTrainingPlanSummarySelect,
    trainingPlanListSchema,
    requireActiveGymManagerMembership,
    trainerPlanCreateSchema,
    trainerPlanParamsSchema,
    trainerNutritionPlanCreateSchema,
    trainerNutritionPlanParamsSchema,
    trainerPlanUpdateSchema,
    trainerPlanDayParamsSchema,
    trainerPlanExerciseParamsSchema,
    trainerPlanExerciseUpdateSchema,
    addTrainingExerciseBodySchema,
    trainerAssignPlanResultSchema,
    trainerAssignNutritionPlanResultSchema,
    trainerAssignPlanBodySchema,
    trainerAssignNutritionPlanBodySchema,
    nutritionPlanListSchema,
    nutritionPlanParamsSchema,
    workoutCreateSchema,
    workoutUpdateSchema,
    workoutSessionUpdateSchema,
    isGlobalAdminUser,
    GymMembershipStatus,
    GymRole,
    parseDateInput,
    buildDateRange,
    trainingDayIncludeWithLegacySafeExercises,
    createHttpError,
    assignedNutritionPlanSummarySelect,
    trainerMemberIdParamsSchema,
    parseClientMetrics,
    requireGymManagerForGym,
  } = deps;

app.post(
  "/admin/gyms/:gymId/members/:userId/assign-training-plan",
  async (request, reply) => {
    try {
      const requester = await requireUser(request);
      const { gymId, userId } = assignTrainingPlanParamsSchema.parse(
        request.params,
      );
      const { trainingPlanId, templatePlanId } =
        assignTrainingPlanBodySchema.parse(request.body);
      const selectedPlanId = trainingPlanId ?? templatePlanId;

      await requireGymManagerAccess(requester, gymId);

      const [targetMembership, selectedPlan] = await Promise.all([
        prisma.gymMembership.findUnique({
          where: { gymId_userId: { gymId, userId } },
          select: {
            id: true,
            gymId: true,
            userId: true,
            status: true,
            role: true,
          },
        }),
        prisma.trainingPlan.findFirst({
          where: {
            id: selectedPlanId,
            OR: [
              { userId: requester.id },
              {
                gymAssignments: {
                  some: {
                    gymId,
                    status: "ACTIVE",
                    role: "MEMBER",
                  },
                },
              },
            ],
          },
          select: {
            id: true,
            title: true,
            goal: true,
            level: true,
            daysPerWeek: true,
            focus: true,
            equipment: true,
            startDate: true,
            daysCount: true,
          },
        }),
      ]);

      if (!targetMembership || targetMembership.status !== "ACTIVE") {
        return reply.status(404).send({ error: "MEMBER_NOT_FOUND" });
      }

      if (targetMembership.role !== "MEMBER") {
        return reply.status(400).send({ error: "INVALID_MEMBER_ROLE" });
      }

      if (!selectedPlan) {
        return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
      }

      await prisma.gymMembership.update({
        where: { id: targetMembership.id },
        data: { assignedTrainingPlanId: selectedPlan.id },
      });

      return reply.status(200).send({
        planId: selectedPlan.id,
        assignedPlan: selectedPlan,
        memberId: userId,
        gymId,
      });
     } catch (error: any) {
      return handleRequestError(reply, error);
    }
  },
);

app.get(
  "/trainer/members/:userId/training-plan-assignment",
  async (request, reply) => {
    try {
      const requester = await requireUser(request);
      const { userId } = trainerMemberParamsSchema.parse(request.params);

      const targetMembership = await prisma.gymMembership.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          role: "MEMBER",
          gym: {
            memberships: {
              some: {
                userId: requester.id,
                status: "ACTIVE",
                role: { in: ["ADMIN", "TRAINER"] },
              },
            },
          },
        },
        select: {
          id: true,
          gymId: true,
          userId: true,
          status: true,
          role: true,
          gym: { select: { id: true, name: true } },
          assignedTrainingPlan: {
            select: assignedTrainingPlanSummarySelect,
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!targetMembership) {
        return reply.status(404).send({ error: "MEMBER_NOT_FOUND" });
      }

      return {
        memberId: userId,
        gym: targetMembership.gym,
        assignedPlan: targetMembership.assignedTrainingPlan,
      };
     } catch (error: any) {
      return handleRequestError(reply, error);
    }
  },
);

app.get("/members/me/assigned-training-plan", async (request, reply) => {
  try {
    const user = await requireUser(request);

    const membership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        role: "MEMBER",
      },
      select: {
        gym: { select: { id: true, name: true } },
        assignedTrainingPlan: {
          select: assignedTrainingPlanSummarySelect,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!membership) {
      return reply.status(404).send({ error: "MEMBER_NOT_FOUND" });
    }

    return reply.status(200).send({
      memberId: user.id,
      gym: membership.gym,
      assignedPlan: membership.assignedTrainingPlan,
    });
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.get("/nutrition-plans", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { query, limit, offset } = nutritionPlanListSchema.parse(
      request.query,
    );
    const where: Prisma.NutritionPlanWhereInput = {
      userId: user.id,
      ...(query
        ? { title: { contains: query, mode: Prisma.QueryMode.insensitive } }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.nutritionPlan.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          dailyCalories: true,
          proteinG: true,
          fatG: true,
          carbsG: true,
          startDate: true,
          daysCount: true,
          createdAt: true,
        },
      }),
      prisma.nutritionPlan.count({ where }),
    ]);
    return { items, total, limit, offset };
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.get("/nutrition-plans/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { id } = nutritionPlanParamsSchema.parse(request.params);
    const plan = await prisma.nutritionPlan.findFirst({
      where: { id, userId: user.id },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: {
            meals: {
              include: { ingredients: true },
            },
          },
        },
      },
    });
    if (!plan) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return plan;
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.get("/workouts", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const workouts = await prisma.workout.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return workouts;
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.post("/workouts", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const data = workoutCreateSchema.parse(request.body);
    const workout = await prisma.workout.create({
      data: {
        name: data.name,
        notes: data.notes,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        durationMin: data.durationMin ?? null,
        userId: user.id,
        exercises: data.exercises
          ? {
              create: data.exercises.map((exercise: any, index: number) => ({
                exerciseId: exercise.exerciseId,
                name: exercise.name,
                sets: exercise.sets ?? null,
                reps: exercise.reps ?? null,
                restSeconds: exercise.restSeconds ?? null,
                notes: exercise.notes,
                order: exercise.order ?? index,
              })),
            }
          : undefined,
      },
      include: { exercises: true },
    });
    return reply.status(201).send(workout);
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.get("/workouts/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const workout = await prisma.workout.findFirst({
      where: { id, userId: user.id },
      include: { exercises: { orderBy: { order: "asc" } } },
    });
    if (!workout) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return workout;
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.patch("/workouts/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const data = workoutUpdateSchema.parse(request.body);
    const updated = await prisma.$transaction(async (tx: any) => {
      const workout = await tx.workout.updateMany({
        where: { id, userId: user.id },
        data: {
          name: data.name,
          notes: data.notes,
          scheduledAt: data.scheduledAt
            ? new Date(data.scheduledAt)
            : undefined,
          durationMin: data.durationMin,
        },
      });
      if (workout.count === 0) {
        return null;
      }
      if (data.exercises) {
        await tx.workoutExercise.deleteMany({ where: { workoutId: id } });
        await tx.workoutExercise.createMany({
          data: data.exercises.map((exercise: any, index: number) => ({
            workoutId: id,
            exerciseId: exercise.exerciseId ?? null,
            name: exercise.name,
            sets: exercise.sets ?? null,
            reps: exercise.reps ?? null,
            restSeconds: exercise.restSeconds ?? null,
            notes: exercise.notes ?? null,
            order: exercise.order ?? index,
          })),
        });
      }
      return tx.workout.findUnique({
        where: { id },
        include: { exercises: { orderBy: { order: "asc" } } },
      });
    });
    if (!updated) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return updated;
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.delete("/workouts/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const workout = await prisma.workout.deleteMany({
      where: { id, userId: user.id },
    });
    if (workout.count === 0) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return reply.status(204).send();
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.post("/workouts/:id/start", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const workout = await prisma.workout.findFirst({
      where: { id, userId: user.id },
    });
    if (!workout) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    const session = await prisma.workoutSession.create({
      data: {
        workoutId: workout.id,
        userId: user.id,
        startedAt: new Date(),
      },
    });
    return reply.status(201).send(session);
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.patch("/workout-sessions/:id", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const data = workoutSessionUpdateSchema.parse(request.body);
    const session = await prisma.workoutSession.findFirst({
      where: { id, userId: user.id },
    });
    if (!session) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    await prisma.workoutSessionEntry.createMany({
      data: data.entries.map((entry: any) => ({
        sessionId: session.id,
        exercise: entry.exercise,
        sets: entry.sets,
        reps: entry.reps,
        loadKg: entry.loadKg ?? null,
        rpe: entry.rpe ?? null,
      })),
    });
    const updated = await prisma.workoutSession.findUnique({
      where: { id: session.id },
      include: { entries: true },
    });
    return updated;
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.post("/workout-sessions/:id/finish", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { id } = paramsSchema.parse(request.params);
    const session = await prisma.workoutSession.findFirst({
      where: { id, userId: user.id },
    });
    if (!session) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    const updated = await prisma.workoutSession.update({
      where: { id: session.id },
      data: { finishedAt: new Date() },
    });
    return updated;
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["USER", "ADMIN"]).optional(),
  subscriptionPlan: z
    .enum(["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"])
    .optional(),
  aiTokenBalance: z.number().int().min(0).optional(),
  aiTokenMonthlyAllowance: z.number().int().min(0).optional(),
});

const adminUserIdParamsSchema = z.object({
  id: z.string().min(1),
});

const adminUserPlanUpdateSchema = z.object({
  subscriptionPlan: z.enum(["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"]),
});

const adminUserTokensUpdateSchema = z
  .object({
    aiTokenBalance: z.number().int().min(0).optional(),
    aiTokenMonthlyAllowance: z.number().int().min(0).optional(),
  })
  .refine(
    (payload) =>
      payload.aiTokenBalance !== undefined ||
      payload.aiTokenMonthlyAllowance !== undefined,
    {
      message: "At least one token field must be provided.",
    },
  );

const adminUserTokenAllowanceUpdateSchema = z.object({
  aiTokenMonthlyAllowance: z.number().int().min(0),
});

const adminUserTokenAddSchema = z.object({
  amount: z.number().int().positive(),
});

const adminUserTokenBalanceUpdateSchema = z.object({
  aiTokenBalance: z.number().int().min(0),
});

const gymsListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
});

const joinGymSchema = z.object({
  gymId: z.string().min(1),
});

const joinGymByCodeSchema = z.object({
  code: z.string().trim().min(1),
});

const gymJoinRequestParamsSchema = z.object({
  membershipId: z.string().min(1),
});

const gymMembersParamsSchema = z.object({
  gymId: z.string().min(1),
});

const trainerClientParamsSchema = z.object({
  userId: z.string().min(1),
});

const adminUpdateGymMemberRoleParamsSchema = z.object({
  gymId: z.string().min(1),
  userId: z.string().min(1),
});

const adminUpdateGymMemberRoleSchema = z.object({
  role: z.enum(["MEMBER", "TRAINER", "ADMIN"]),
  status: z.enum(["ACTIVE", "PENDING", "REJECTED"]).optional(),
});

const gymAdminUpdateMemberRoleParamsSchema = z.object({
  userId: z.string().min(1),
});

const gymAdminUpdateMemberRoleSchema = z.object({
  role: z.enum(["MEMBER", "TRAINER"]),
});

const trainerGymProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field must be provided.",
  });

const adminCreateGymSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z
    .string()
    .trim()
    .min(4)
    .max(24)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Gym code can only contain letters, numbers, hyphens and underscores",
    )
    .transform((value) => value.toUpperCase()),
});

const adminDeleteGymParamsSchema = z.object({
  gymId: z.string().min(1),
});

type StableGymMembershipState = "NONE" | "PENDING" | "ACTIVE";

function toStableGymMembershipState(
  status: "PENDING" | "ACTIVE" | "REJECTED" | null | undefined,
): StableGymMembershipState {
  if (status === "PENDING") return "PENDING";
  if (status === "ACTIVE") return "ACTIVE";
  return "NONE";
}

function toLegacyGymMembershipState(
  state: StableGymMembershipState,
): "none" | "pending" | "active" {
  if (state === "PENDING") return "pending";
  if (state === "ACTIVE") return "active";
  return "none";
}

function serializeGymMembership(
  membership: {
    status: "PENDING" | "ACTIVE" | "REJECTED";
    role: "ADMIN" | "TRAINER" | "MEMBER";
    gym: { id: string; name: string };
  } | null,
) {
  const status = toStableGymMembershipState(membership?.status);
  const gym = status === "NONE" ? null : (membership?.gym ?? null);
  const role = status === "NONE" ? null : (membership?.role ?? null);

  return {
    status,
    state: toLegacyGymMembershipState(status),
    gymId: gym?.id ?? null,
    gymName: gym?.name ?? null,
    gym,
    role,
  };
}

async function findBlockingGymMembership(userId: string) {
  return prisma.gymMembership.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "ACTIVE"] },
    },
    select: {
      id: true,
      gymId: true,
      status: true,
      role: true,
      gym: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function getTrainerManagedGymMembership(userId: string) {
  return prisma.gymMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      role: { in: ["ADMIN", "TRAINER"] },
    },
    select: {
      gymId: true,
      role: true,
      gym: {
        select: {
          id: true,
          name: true,
          code: true,
          activationCode: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { updatedAt: "desc" }],
  });
}

app.get("/trainer/gym", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const membership = await getTrainerManagedGymMembership(user.id);

    if (!membership) {
      return reply.status(403).send({
        error: "FORBIDDEN",
        message: "Only active gym trainers/admins can access this resource.",
      });
    }

    return reply.status(200).send({
      gym: membership.gym,
      membership: {
        role: membership.role,
      },
    });
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.patch("/trainer/gym", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const payload = trainerGymProfileUpdateSchema.parse(request.body);
    const membership = await getTrainerManagedGymMembership(user.id);

    if (!membership) {
      return reply.status(403).send({
        error: "FORBIDDEN",
        message: "Only active gym trainers/admins can access this resource.",
      });
    }

    const updatedGym = await prisma.gym.update({
      where: { id: membership.gymId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        activationCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.status(200).send({
      gym: updatedGym,
      membership: {
        role: membership.role,
      },
    });
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.get("/gyms", async (request, reply) => {
  try {
    await requireUser(request);
    const { q } = gymsListQuerySchema.parse(request.query);
    const gyms = await prisma.gym.findMany({
      where: q
        ? {
            name: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : undefined,
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });
    return { gyms, items: gyms };
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

const createGymJoinRequest = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const user = await requireUser(request);
    const { gymId } = joinGymSchema.parse(request.body);
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { id: true },
    });
    if (!gym) {
      return reply
        .status(404)
        .send({ error: "NOT_FOUND", message: "Gym not found." });
    }
    const blockingMembership = await findBlockingGymMembership(user.id);
    if (blockingMembership) {
      return reply.status(409).send({
        error: "GYM_MEMBERSHIP_CONFLICT",
        message: "User already has an active or pending gym membership.",
        membership: serializeGymMembership({
          status: blockingMembership.status,
          role: blockingMembership.role,
          gym: blockingMembership.gym,
        }),
      });
    }

    const existing = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId, userId: user.id } },
    });

    const membership = existing
      ? await prisma.gymMembership.update({
          where: { id: existing.id },
          data: {
            status:
              existing.status === "REJECTED" ? "PENDING" : existing.status,
          },
          include: { gym: { select: { id: true, name: true } } },
        })
      : await prisma.gymMembership.create({
          data: {
            gymId,
            userId: user.id,
            status: "PENDING",
            role: "MEMBER",
          },
          include: { gym: { select: { id: true, name: true } } },
        });

    return reply.status(200).send(serializeGymMembership(membership));
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
};

app.post("/gyms/join", createGymJoinRequest);
app.post("/gym/join-request", createGymJoinRequest);

app.post("/gyms/join-by-code", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { code } = joinGymByCodeSchema.parse(request.body);
    const normalizedCode = code.toUpperCase();
    const gym = await prisma.gym.findFirst({
      where: {
        OR: [{ code: normalizedCode }, { activationCode: normalizedCode }],
      },
      select: {
        id: true,
        name: true,
        code: true,
        activationCode: true,
      },
    });
    if (!gym) {
      return reply
        .status(400)
        .send({ error: "INVALID_GYM_CODE", message: "Gym code is invalid." });
    }

    const membershipStatus =
      gym.activationCode === normalizedCode ? "ACTIVE" : "PENDING";

    const blockingMembership = await findBlockingGymMembership(user.id);
    if (blockingMembership) {
      return reply.status(409).send({
        error: "GYM_MEMBERSHIP_CONFLICT",
        message: "User already has an active or pending gym membership.",
        membership: serializeGymMembership({
          status: blockingMembership.status,
          role: blockingMembership.role,
          gym: blockingMembership.gym,
        }),
      });
    }

    const existing = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId: gym.id, userId: user.id } },
    });
    const membership = existing
      ? await prisma.gymMembership.update({
          where: { id: existing.id },
          data: {
            status:
              existing.status === "REJECTED"
                ? membershipStatus
                : existing.status,
            role: "MEMBER",
          },
        })
      : await prisma.gymMembership.create({
          data: {
            gymId: gym.id,
            userId: user.id,
            status: membershipStatus,
            role: "MEMBER",
          },
        });

    return reply.status(200).send(
      serializeGymMembership({
        status: membership.status as any,
        role: membership.role,
        gym: { id: gym.id, name: gym.name },
      }),
    );
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

const getGymMembership = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const user = await requireUser(request);
    const membership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "ACTIVE"] },
      },
      select: {
        status: true,
        role: true,
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return reply.status(200).send(serializeGymMembership(membership));
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
};

app.get("/gyms/membership", getGymMembership);
app.get("/gym/me", getGymMembership);

app.post("/gym/join-code", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { code } = joinGymByCodeSchema.parse(request.body);
    const normalizedCode = code.toUpperCase();
    const gym = await prisma.gym.findFirst({
      where: {
        OR: [{ code: normalizedCode }, { activationCode: normalizedCode }],
      },
      select: {
        id: true,
        name: true,
        code: true,
        activationCode: true,
      },
    });

    if (!gym) {
      return reply
        .status(400)
        .send({ error: "INVALID_GYM_CODE", message: "Gym code is invalid." });
    }

    const membershipStatus =
      gym.activationCode === normalizedCode ? "ACTIVE" : "PENDING";

    const blockingMembership = await findBlockingGymMembership(user.id);
    if (blockingMembership) {
      return reply.status(409).send({
        error: "GYM_MEMBERSHIP_CONFLICT",
        message: "User already has an active or pending gym membership.",
        membership: serializeGymMembership({
          status: blockingMembership.status,
          role: blockingMembership.role,
          gym: blockingMembership.gym,
        }),
      });
    }

    const existing = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId: gym.id, userId: user.id } },
    });

    const membership = existing
      ? await prisma.gymMembership.update({
          where: { id: existing.id },
          data: {
            status:
              existing.status === "REJECTED"
                ? membershipStatus
                : existing.status,
            role: "MEMBER",
          },
        })
      : await prisma.gymMembership.create({
          data: {
            gymId: gym.id,
            userId: user.id,
            status: membershipStatus,
            role: "MEMBER",
          },
        });

    return reply.status(200).send(
      serializeGymMembership({
        status: membership.status as any,
        role: membership.role,
        gym: { id: gym.id, name: gym.name },
      }),
    );
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

const leaveGymMembership = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const user = await requireUser(request);
    const activeMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "ACTIVE"] },
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!activeMembership) {
      return reply.status(200).send({
        left: false,
        membership: serializeGymMembership(null),
      });
    }

    await prisma.gymMembership.delete({ where: { id: activeMembership.id } });

    return reply.status(200).send({
      left: true,
      membership: serializeGymMembership(null),
    });
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
};

app.delete("/gyms/membership", leaveGymMembership);
app.delete("/gym/me", leaveGymMembership);

app.get("/admin/gym-join-requests", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const isGlobalAdmin = isGlobalAdminUser(user);

    if (!isGlobalAdmin) {
      const managerMembership = await prisma.gymMembership.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
          role: { in: ["ADMIN", "TRAINER"] },
        },
        select: { id: true },
      });

      if (!managerMembership) {
        return reply.status(403).send({
          error: "FORBIDDEN",
          message: "Only gym admins or trainers can list join requests.",
        });
      }
    }

    const requests = await prisma.gymMembership.findMany({
      where: {
        status: "PENDING",
        ...(isGlobalAdmin
          ? {}
          : {
              gym: {
                memberships: {
                  some: {
                    userId: user.id,
                    status: "ACTIVE",
                    role: { in: ["ADMIN", "TRAINER"] },
                  },
                },
              },
            }),
      },
      select: {
        id: true,
        createdAt: true,
        gym: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const items = requests.map((membership: any) => ({
      id: membership.id,
      membershipId: membership.id,
      status: "PENDING" as const,
      gym: membership.gym,
      user: membership.user,
      createdAt: membership.createdAt,
    }));

    return { items, requests: items };
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.post(
  "/admin/gym-join-requests/:membershipId/accept",
  async (request, reply) => {
    try {
      const user = await requireUser(request);
      const isGlobalAdmin = isGlobalAdminUser(user);
      const { membershipId } = gymJoinRequestParamsSchema.parse(request.params);
      const membership = await prisma.gymMembership.findUnique({
        where: { id: membershipId },
        select: {
          id: true,
          gymId: true,
          userId: true,
          status: true,
          role: true,
        },
      });
      if (!membership) {
        return reply.status(404).send({
          error: "NOT_FOUND",
          message: "Membership request not found.",
        });
      }
      if (membership.status !== "PENDING") {
        return reply.status(400).send({
          error: "INVALID_MEMBERSHIP_STATUS",
          message: "Only pending requests can be accepted.",
        });
      }
      if (!isGlobalAdmin) {
        await requireGymManagerForGym(user, membership.gymId);
      }

      const activeMembershipElsewhere = await prisma.gymMembership.findFirst({
        where: {
          userId: membership.userId,
          status: "ACTIVE",
          gymId: { not: membership.gymId },
        },
        select: {
          id: true,
          gym: {
            select: { id: true, name: true },
          },
        },
      });

      if (activeMembershipElsewhere) {
        return reply.status(409).send({
          error: "GYM_MEMBERSHIP_CONFLICT",
          message: "User already belongs to another active gym.",
          activeMembership: {
            id: activeMembershipElsewhere.id,
            gym: activeMembershipElsewhere.gym,
          },
        });
      }

      await prisma.gymMembership.updateMany({
        where: {
          userId: membership.userId,
          status: "PENDING",
          id: { not: membership.id },
        },
        data: { status: "REJECTED" },
      });

      const updateResult = await prisma.gymMembership.updateMany({
        where: { id: membership.id, status: "PENDING" },
        data: { status: "ACTIVE", role: membership.role },
      });

      if (updateResult.count === 0) {
        return reply.status(400).send({
          error: "INVALID_MEMBERSHIP_STATUS",
          message: "Only pending requests can be accepted.",
        });
      }

      return { membershipId: membership.id, status: "ACTIVE" };
     } catch (error: any) {
      return handleRequestError(reply, error);
    }
  },
);

app.post(
  "/admin/gym-join-requests/:membershipId/reject",
  async (request, reply) => {
    try {
      const user = await requireUser(request);
      const isGlobalAdmin = isGlobalAdminUser(user);
      const { membershipId } = gymJoinRequestParamsSchema.parse(request.params);
      const membership = await prisma.gymMembership.findUnique({
        where: { id: membershipId },
        select: { id: true, gymId: true, status: true },
      });
      if (!membership) {
        return reply.status(404).send({
          error: "NOT_FOUND",
          message: "Membership request not found.",
        });
      }
      if (membership.status !== "PENDING") {
        return reply.status(400).send({
          error: "INVALID_MEMBERSHIP_STATUS",
          message: "Only pending requests can be rejected.",
        });
      }
      if (!isGlobalAdmin) {
        await requireGymManagerForGym(user, membership.gymId);
      }
      const updateResult = await prisma.gymMembership.updateMany({
        where: { id: membership.id, status: "PENDING" },
        data: { status: "REJECTED" },
      });

      if (updateResult.count === 0) {
        return reply.status(400).send({
          error: "INVALID_MEMBERSHIP_STATUS",
          message: "Only pending requests can be rejected.",
        });
      }

      return { membershipId: membership.id, status: "REJECTED" };
     } catch (error: any) {
      return handleRequestError(reply, error);
    }
  },
);

app.get("/admin/gyms/:gymId/members", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { gymId } = gymMembersParamsSchema.parse(request.params);
    await requireGymManagerAccess(user, gymId);

    const members = await prisma.gymMembership.findMany({
      where: {
        gymId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        status: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return members.map((member: any) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      user: member.user,
      status: member.status,
      role: member.role,
    }));
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/plans", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { query, limit, offset } = trainingPlanListSchema.parse(
      request.query,
    );

    const managerMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: requester.id,
        status: "ACTIVE",
        role: { in: ["ADMIN", "TRAINER"] },
      },
      select: { gymId: true },
    });

    const memberMembership = managerMembership
      ? null
      : await prisma.gymMembership.findFirst({
          where: {
            userId: requester.id,
            status: "ACTIVE",
            role: "MEMBER",
          },
          select: { gymId: true },
          orderBy: { updatedAt: "desc" },
        });

    const visibleGymId = managerMembership?.gymId ?? memberMembership?.gymId;

    const plans = await prisma.trainingPlan.findMany({
      where: {
        OR: [
          { userId: requester.id },
          ...(visibleGymId
            ? [
                {
                  gymAssignments: {
                    some: {
                      gymId: visibleGymId,
                      status: GymMembershipStatus.ACTIVE,
                      role: GymRole.MEMBER,
                    },
                  },
                },
              ]
            : []),
        ],
        ...(query
          ? { title: { contains: query, mode: Prisma.QueryMode.insensitive } }
          : {}),
      },
      select: {
        id: true,
        userId: true,
        title: true,
        notes: true,
        goal: true,
        level: true,
        daysPerWeek: true,
        focus: true,
        equipment: true,
        startDate: true,
        daysCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: offset,
      take: limit,
    });

    return { items: plans, limit, offset };
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.post("/trainer/plans", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    await requireActiveGymManagerMembership(requester.id);
    const payload = trainerPlanCreateSchema.parse(request.body);

    const startDate = payload.startDate
      ? parseDateInput(payload.startDate)
      : new Date();
    if (!startDate) {
      return reply.status(400).send({ error: "INVALID_START_DATE" });
    }

    const daysCount = payload.daysCount ?? payload.daysPerWeek ?? 7;
    const daysPerWeek = payload.daysPerWeek ?? Math.min(daysCount, 7);
    const dates = buildDateRange(startDate, daysCount);

    const createdPlan = await prisma.trainingPlan.create({
      data: {
        userId: requester.id,
        title: payload.title,
        notes: payload.notes ?? payload.description ?? null,
        goal: payload.goal,
        level: payload.level,
        daysPerWeek,
        focus: payload.focus,
        equipment: payload.equipment,
        startDate,
        daysCount,
        days: {
          create: dates.map((date: any, index: number) => ({
            date: new Date(`${date}T00:00:00.000Z`),
            label: `Día ${index + 1}`,
            focus: payload.focus,
            duration: 45,
            order: index + 1,
          })),
        },
      },
      include: {
        days: trainingDayIncludeWithLegacySafeExercises,
      },
    });

    return reply.status(201).send(createdPlan);
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/plans/:planId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(
      requester.id,
    );
    const { planId } = trainerPlanParamsSchema.parse(request.params);

    const plan = await prisma.trainingPlan.findFirst({
      where: {
        id: planId,
        OR: [
          { userId: requester.id },
          {
            gymAssignments: {
              some: {
                gymId: managerMembership.gymId,
                status: "ACTIVE",
                role: "MEMBER",
              },
            },
          },
        ],
      },
      include: {
        days: trainingDayIncludeWithLegacySafeExercises,
      },
    });

    if (!plan) {
      return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
    }

    return plan;
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/nutrition-plans", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { query, limit, offset } = nutritionPlanListSchema.parse(request.query);

    const managerMembership = await requireActiveGymManagerMembership(requester.id);

    const plans = await prisma.nutritionPlan.findMany({
      where: {
        OR: [
          { userId: requester.id },
          {
            gymAssignments: {
              some: {
                gymId: managerMembership.gymId,
                status: GymMembershipStatus.ACTIVE,
                role: GymRole.MEMBER,
              },
            },
          },
        ],
        ...(query
          ? { title: { contains: query, mode: Prisma.QueryMode.insensitive } }
          : {}),
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        daysCount: true,
        createdAt: true,
        days: {
          orderBy: { order: "asc" },
          select: { id: true, dayLabel: true, order: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: offset,
      take: limit,
    });

    return reply.status(200).send({ items: plans, limit, offset });
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.post("/trainer/nutrition-plans", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    await requireActiveGymManagerMembership(requester.id);
    const payload = trainerNutritionPlanCreateSchema.parse(request.body);

    const startDate = payload.startDate ? parseDateInput(payload.startDate) : new Date();
    if (!startDate) {
      return reply.status(400).send({ error: "INVALID_START_DATE" });
    }

    const daysCount = payload.daysCount ?? 7;
    const dates = buildDateRange(startDate, daysCount);

    const createdPlan = await prisma.nutritionPlan.create({
      data: {
        userId: requester.id,
        title: payload.title,
        dailyCalories: payload.dailyCalories ?? 2000,
        proteinG: payload.proteinG ?? 120,
        fatG: payload.fatG ?? 60,
        carbsG: payload.carbsG ?? 220,
        startDate,
        daysCount,
        days: {
          create: dates.map((date: any, index: number) => ({
            date: new Date(`${date}T00:00:00.000Z`),
            dayLabel: `Día ${index + 1}`,
            order: index + 1,
          })),
        },
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        daysCount: true,
        createdAt: true,
        days: {
          orderBy: { order: "asc" },
          select: { id: true, dayLabel: true, order: true },
        },
      },
    });

    return reply.status(201).send(createdPlan);
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/nutrition-plans/:id", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(requester.id);
    const { id } = trainerNutritionPlanParamsSchema.parse(request.params);

    const plan = await prisma.nutritionPlan.findFirst({
      where: {
        id,
        OR: [
          { userId: requester.id },
          {
            gymAssignments: {
              some: {
                gymId: managerMembership.gymId,
                status: GymMembershipStatus.ACTIVE,
                role: GymRole.MEMBER,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        daysCount: true,
        createdAt: true,
        days: {
          orderBy: { order: "asc" },
          include: {
            meals: {
              include: { ingredients: true },
            },
          },
        },
      },
    });

    if (!plan) {
      return reply.status(404).send({ error: "NUTRITION_PLAN_NOT_FOUND" });
    }

    return reply.status(200).send(plan);
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.patch("/trainer/plans/:planId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    await requireActiveGymManagerMembership(requester.id);
    const { planId } = trainerPlanParamsSchema.parse(request.params);
    const payload = trainerPlanUpdateSchema.parse(request.body);

    const existing = await prisma.trainingPlan.findFirst({
      where: { id: planId, userId: requester.id },
      select: { id: true, focus: true, daysCount: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
    }

    const nextDaysCount = payload.daysCount ?? existing.daysCount;
    const nextFocus = payload.focus ?? existing.focus;
    const nextStartDate = payload.startDate
      ? parseDateInput(payload.startDate)
      : null;

    if (payload.startDate && !nextStartDate) {
      return reply.status(400).send({ error: "INVALID_START_DATE" });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const plan = await tx.trainingPlan.update({
        where: { id: existing.id },
        data: {
          title: payload.title,
          notes: payload.notes === undefined ? undefined : payload.notes,
          goal: payload.goal,
          level: payload.level,
          focus: payload.focus,
          equipment: payload.equipment,
          daysPerWeek: payload.daysPerWeek,
          daysCount: payload.daysCount,
          startDate: nextStartDate ?? undefined,
        },
      });

      if (
        payload.daysCount !== undefined ||
        payload.focus !== undefined ||
        payload.startDate !== undefined
      ) {
        const dates = buildDateRange(
          nextStartDate ?? plan.startDate,
          nextDaysCount,
        );
        await tx.trainingDay.deleteMany({ where: { planId: existing.id } });
        await tx.trainingDay.createMany({
          data: dates.map((date: any, index: number) => ({
            planId: existing.id,
            date: new Date(`${date}T00:00:00.000Z`),
            label: `Día ${index + 1}`,
            focus: nextFocus,
            duration: 45,
            order: index + 1,
          })),
        });
      }

      return tx.trainingPlan.findUnique({
        where: { id: existing.id },
        include: {
          days: trainingDayIncludeWithLegacySafeExercises,
        },
      });
    });

    return updated;
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

async function getTrainerManagedPlan(
  requesterId: string,
  planId: string,
): Promise<{
  plan: { id: string; userId: string };
  managerMembership: { gymId: string };
}> {
  const managerMembership =
    await requireActiveGymManagerMembership(requesterId);
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      userId: true,
      gymAssignments: {
        where: {
          gymId: managerMembership.gymId,
          status: "ACTIVE",
          role: "MEMBER",
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!plan) {
    throw createHttpError(404, "TRAINING_PLAN_NOT_FOUND", { planId });
  }

  const canManage =
    plan.userId === requesterId || plan.gymAssignments.length > 0;

  if (!canManage) {
    throw createHttpError(403, "FORBIDDEN", { planId, requesterId });
  }

  return {
    plan: { id: plan.id, userId: plan.userId },
    managerMembership: { gymId: managerMembership.gymId },
  };
}

app.delete("/trainer/plans/:planId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { planId } = trainerPlanParamsSchema.parse(request.params);

    const { plan, managerMembership } = await getTrainerManagedPlan(
      requester.id,
      planId,
    );

    await prisma.$transaction(async (tx: any) => {
      await tx.gymMembership.updateMany({
        where: { assignedTrainingPlanId: plan.id },
        data: { assignedTrainingPlanId: null },
      });
      await tx.trainingPlan.delete({
        where: { id: plan.id },
      });
    });

    request.log.info(
      {
        planId: plan.id,
        requesterId: requester.id,
        gymId: managerMembership.gymId,
      },
      "trainer deleted training plan",
    );

    return reply.status(204).send();
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.delete("/trainer/plans/:planId/days/:dayId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { planId, dayId } = trainerPlanDayParamsSchema.parse(request.params);

    const { plan, managerMembership } = await getTrainerManagedPlan(
      requester.id,
      planId,
    );

    const deleted = await prisma.$transaction(async (tx: any) => {
      const day = await tx.trainingDay.findFirst({
        where: {
          id: dayId,
          planId: plan.id,
        },
        select: { id: true },
      });

      if (!day) {
        return false;
      }

      await tx.trainingExercise.deleteMany({ where: { dayId: day.id } });
      await tx.trainingDay.delete({ where: { id: day.id } });
      return true;
    });

    if (!deleted) {
      return reply.status(404).send({ error: "TRAINING_DAY_NOT_FOUND" });
    }

    request.log.info(
      {
        planId: plan.id,
        dayId,
        requesterId: requester.id,
        gymId: managerMembership.gymId,
      },
      "trainer deleted training day",
    );

    return reply.status(204).send();
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.post(
  "/trainer/plans/:planId/days/:dayId/exercises",
  async (request, reply) => {
    try {
      const requester = await requireUser(request);
      const { planId, dayId } = trainerPlanDayParamsSchema.parse(
        request.params,
      );
      const { exerciseId } = addTrainingExerciseBodySchema.parse(request.body);

      const { plan, managerMembership } = await getTrainerManagedPlan(
        requester.id,
        planId,
      );

      const [day, exercise] = await Promise.all([
        prisma.trainingDay.findFirst({
          where: { id: dayId, planId: plan.id },
          select: { id: true },
        }),
        prisma.exercise.findUnique({
          where: { id: exerciseId },
          select: { id: true, name: true, imageUrl: true },
        }),
      ]);

      if (!day) {
        return reply.status(404).send({ error: "TRAINING_DAY_NOT_FOUND" });
      }

      if (!exercise) {
        return reply.status(404).send({ error: "EXERCISE_NOT_FOUND" });
      }

      const created = await prisma.trainingExercise.create({
        data: {
          dayId: day.id,
          exerciseId: exercise.id,
          imageUrl: exercise.imageUrl,
          name: exercise.name,
          sets: 3,
          reps: "10-12",
        },
      });

      request.log.info(
        {
          planId: plan.id,
          dayId,
          exerciseId,
          requesterId: requester.id,
          gymId: managerMembership.gymId,
        },
        "trainer added exercise to training day",
      );

      return reply.status(201).send({
        exercise: created,
        sourceExercise: exercise,
        planId: plan.id,
        dayId: day.id,
      });
     } catch (error: any) {
      return handleRequestError(reply, error);
    }
  },
);

app.patch(
  "/trainer/plans/:planId/days/:dayId/exercises/:exerciseId",
  async (request, reply) => {
    try {
      const requester = await requireUser(request);
      const { planId, dayId, exerciseId } =
        trainerPlanExerciseParamsSchema.parse(request.params);
      const payload = trainerPlanExerciseUpdateSchema.parse(request.body);

      const { plan, managerMembership } = await getTrainerManagedPlan(
        requester.id,
        planId,
      );

      const day = await prisma.trainingDay.findFirst({
        where: { id: dayId, planId: plan.id },
        select: { id: true },
      });

      if (!day) {
        return reply.status(404).send({ error: "TRAINING_DAY_NOT_FOUND" });
      }

      const updated = await prisma.trainingExercise.updateMany({
        where: {
          id: exerciseId,
          dayId: day.id,
        },
        data: {
          sets: payload.sets,
          reps: payload.reps,
          rest: payload.rest,
        },
      });

      if (updated.count === 0) {
        return reply.status(404).send({ error: "TRAINING_EXERCISE_NOT_FOUND" });
      }

      const exercise = await prisma.trainingExercise.findUnique({
        where: { id: exerciseId },
      });

      request.log.info(
        {
          planId: plan.id,
          dayId,
          exerciseId,
          requesterId: requester.id,
          gymId: managerMembership.gymId,
        },
        "trainer updated training exercise",
      );

      return reply.status(200).send({ exercise });
     } catch (error: any) {
      return handleRequestError(reply, error);
    }
  },
);

app.delete(
  "/trainer/plans/:planId/days/:dayId/exercises/:exerciseId",
  async (request, reply) => {
    try {
      const requester = await requireUser(request);
      const { planId, dayId, exerciseId } =
        trainerPlanExerciseParamsSchema.parse(request.params);

      const { plan, managerMembership } = await getTrainerManagedPlan(
        requester.id,
        planId,
      );

      const day = await prisma.trainingDay.findFirst({
        where: { id: dayId, planId: plan.id },
        select: { id: true },
      });

      if (!day) {
        return reply.status(404).send({ error: "TRAINING_DAY_NOT_FOUND" });
      }

      const deleted = await prisma.trainingExercise.deleteMany({
        where: {
          id: exerciseId,
          dayId: day.id,
        },
      });

      if (deleted.count === 0) {
        return reply.status(404).send({ error: "TRAINING_EXERCISE_NOT_FOUND" });
      }

      request.log.info(
        {
          planId: plan.id,
          dayId,
          exerciseId,
          requesterId: requester.id,
          gymId: managerMembership.gymId,
        },
        "trainer deleted training exercise",
      );

      return reply.status(204).send();
     } catch (error: any) {
      return handleRequestError(reply, error);
    }
  },
);

async function getTrainerMemberAssignment(
  requesterId: string,
  memberUserId: string,
): Promise<{
  managerMembership: { gymId: string };
  targetMembership: {
    id: string;
    status: string;
    role: string;
    assignedTrainingPlanId: string | null;
    assignedNutritionPlanId: string | null;
    assignedTrainingPlan: {
      id: string;
      title: string;
      goal: string;
      level: string;
      daysPerWeek: number;
      focus: string;
      equipment: string;
      startDate: Date;
      daysCount: number;
    } | null;
    assignedNutritionPlan: {
      id: string;
      title: string;
      startDate: Date;
      daysCount: number;
      createdAt: Date;
      days: { id: string; dayLabel: string; order: number }[];
    } | null;
  };
}> {
  const managerMembership =
    await requireActiveGymManagerMembership(requesterId);
  const targetMembership = await prisma.gymMembership.findUnique({
    where: {
      gymId_userId: { gymId: managerMembership.gymId, userId: memberUserId },
    },
    select: {
      id: true,
      role: true,
      status: true,
      assignedTrainingPlanId: true,
      assignedNutritionPlanId: true,
      assignedTrainingPlan: {
        select: trainerAssignPlanResultSchema,
      },
      assignedNutritionPlan: {
        select: trainerAssignNutritionPlanResultSchema,
      },
    },
  });

  if (
    !targetMembership ||
    targetMembership.status !== "ACTIVE" ||
    targetMembership.role !== "MEMBER"
  ) {
    throw createHttpError(404, "MEMBER_NOT_FOUND", {
      memberUserId,
      gymId: managerMembership.gymId,
    });
  }

  return {
    managerMembership: { gymId: managerMembership.gymId },
    targetMembership,
  };
}

app.post("/trainer/clients/:userId/assigned-plan", async (request, reply) => {
  try {
    const { userId } = trainerClientParamsSchema.parse(request.params);
    const { trainingPlanId } = trainerAssignPlanBodySchema.parse(request.body);
    const requester = await requireUser(request);

    const { managerMembership, targetMembership } =
      await getTrainerMemberAssignment(requester.id, userId);

    const selectedPlan = await prisma.trainingPlan.findFirst({
      where: {
        id: trainingPlanId,
        OR: [
          { userId: requester.id },
          {
            gymAssignments: {
              some: {
                gymId: managerMembership.gymId,
                status: "ACTIVE",
                role: "MEMBER",
              },
            },
          },
        ],
      },
      select: trainerAssignPlanResultSchema,
    });

    if (!selectedPlan) {
      return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
    }

    await prisma.gymMembership.update({
      where: { id: targetMembership.id },
      data: { assignedTrainingPlanId: selectedPlan.id },
    });

    return reply.status(200).send({
      ok: true,
      memberId: userId,
      gymId: managerMembership.gymId,
      assignedPlan: selectedPlan,
    });
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/clients/:userId/assigned-plan", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { userId } = trainerClientParamsSchema.parse(request.params);
    const { managerMembership, targetMembership } =
      await getTrainerMemberAssignment(requester.id, userId);

    return reply.status(200).send({
      memberId: userId,
      gymId: managerMembership.gymId,
      assignedPlan: targetMembership.assignedTrainingPlan,
    });
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.delete("/trainer/clients/:userId/assigned-plan", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { userId } = trainerClientParamsSchema.parse(request.params);
    const { managerMembership, targetMembership } =
      await getTrainerMemberAssignment(requester.id, userId);

    await prisma.gymMembership.update({
      where: { id: targetMembership.id },
      data: { assignedTrainingPlanId: null },
    });

    return reply.status(200).send({
      ok: true,
      memberId: userId,
      gymId: managerMembership.gymId,
      assignedPlan: null,
    });
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.post(
  "/trainer/clients/:userId/assigned-nutrition-plan",
  async (request, reply) => {
    try {
      const { userId } = trainerClientParamsSchema.parse(request.params);
      const { nutritionPlanId } = trainerAssignNutritionPlanBodySchema.parse(request.body);
      const requester = await requireUser(request);

      const { managerMembership, targetMembership } = await getTrainerMemberAssignment(
        requester.id,
        userId,
      );

      const selectedPlan = await prisma.nutritionPlan.findFirst({
        where: {
          id: nutritionPlanId,
          OR: [
            { userId: requester.id },
            {
              gymAssignments: {
                some: {
                  gymId: managerMembership.gymId,
                  status: "ACTIVE",
                  role: "MEMBER",
                },
              },
            },
          ],
        },
        select: trainerAssignNutritionPlanResultSchema,
      });

      if (!selectedPlan) {
        return reply.status(404).send({ error: "NUTRITION_PLAN_NOT_FOUND" });
      }

      await prisma.gymMembership.update({
        where: { id: targetMembership.id },
        data: { assignedNutritionPlanId: selectedPlan.id },
      });

      return reply.status(200).send({
        ok: true,
        memberId: userId,
        gymId: managerMembership.gymId,
        assignedPlan: selectedPlan,
      });
     } catch (error: any) {
      return handleRequestError(reply, error);
    }
  },
);

app.get("/members/me/assigned-nutrition-plan", async (request, reply) => {
  try {
    const user = await requireUser(request);

    const membership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        role: "MEMBER",
      },
      select: {
        gym: { select: { id: true, name: true } },
        assignedNutritionPlan: {
          select: assignedNutritionPlanSummarySelect,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!membership) {
      return reply.status(404).send({ error: "MEMBER_NOT_FOUND" });
    }

    return reply.status(200).send({
      memberId: user.id,
      gym: membership.gym,
      assignedPlan: membership.assignedNutritionPlan,
    });
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.post(
  "/trainer/members/:id/training-plan-assignment",
  async (request, reply) => {
    try {
      const requester = await requireUser(request);
      const { id } = trainerMemberIdParamsSchema.parse(request.params);
      const { trainingPlanId } = trainerAssignPlanBodySchema.parse(
        request.body,
      );

      const { managerMembership, targetMembership } =
        await getTrainerMemberAssignment(requester.id, id);

      const selectedPlan = await prisma.trainingPlan.findFirst({
        where: {
          id: trainingPlanId,
          OR: [
            { userId: requester.id },
            {
              gymAssignments: {
                some: {
                  gymId: managerMembership.gymId,
                  status: "ACTIVE",
                  role: "MEMBER",
                },
              },
            },
          ],
        },
        select: trainerAssignPlanResultSchema,
      });

      if (!selectedPlan) {
        return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
      }

      await prisma.gymMembership.update({
        where: { id: targetMembership.id },
        data: { assignedTrainingPlanId: selectedPlan.id },
      });

      return reply.status(200).send({
        ok: true,
        memberId: id,
        gymId: managerMembership.gymId,
        assignedPlan: selectedPlan,
      });
     } catch (error: any) {
      return handleRequestError(reply, error);
    }
  },
);

app.delete(
  "/trainer/members/:id/training-plan-assignment",
  async (request, reply) => {
    try {
      const requester = await requireUser(request);
      const { id } = trainerMemberIdParamsSchema.parse(request.params);
      const { managerMembership, targetMembership } =
        await getTrainerMemberAssignment(requester.id, id);

      await prisma.gymMembership.update({
        where: { id: targetMembership.id },
        data: { assignedTrainingPlanId: null },
      });

      return reply.status(200).send({
        ok: true,
        memberId: id,
        gymId: managerMembership.gymId,
        assignedPlan: null,
      });
     } catch (error: any) {
      return handleRequestError(reply, error);
    }
  },
);

app.get("/trainer/clients", async (request, reply) => {
  try {
    const user = await requireUser(request);

    const managerMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["ADMIN", "TRAINER"] },
      },
      select: { gymId: true },
    });

    if (!managerMembership) {
      return reply.status(403).send({ error: "FORBIDDEN" });
    }

    const clients = await prisma.gymMembership.findMany({
      where: {
        gymId: managerMembership.gymId,
        status: "ACTIVE",
        role: "MEMBER",
      },
      select: {
        role: true,
        assignedTrainingPlan: {
          select: {
            id: true,
            title: true,
            daysCount: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isBlocked: true,
            subscriptionStatus: true,
            lastLoginAt: true,
            profile: {
              select: {
                profile: true,
                tracking: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      clients: clients.map((membership: any) => ({
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        isBlocked: membership.user.isBlocked,
        subscriptionStatus: membership.user.subscriptionStatus,
        lastLoginAt: membership.user.lastLoginAt,
        assignedPlan: membership.assignedTrainingPlan,
        metrics: parseClientMetrics(
          membership.user.profile?.profile ?? null,
          membership.user.profile?.tracking ?? null,
        ),
      })),
    };
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.get("/trainer/clients/:userId", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { userId } = trainerClientParamsSchema.parse(request.params);

    const managerMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["ADMIN", "TRAINER"] },
      },
      select: { gymId: true },
    });

    if (!managerMembership) {
      return reply.status(403).send({ error: "FORBIDDEN" });
    }

    const membership = await prisma.gymMembership.findFirst({
      where: {
        gymId: managerMembership.gymId,
        userId,
        status: "ACTIVE",
        role: "MEMBER",
      },
      select: {
        role: true,
        assignedTrainingPlan: {
          select: {
            id: true,
            title: true,
            daysCount: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isBlocked: true,
            subscriptionStatus: true,
            lastLoginAt: true,
            profile: {
              select: {
                profile: true,
                tracking: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    return {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      isBlocked: membership.user.isBlocked,
      subscriptionStatus: membership.user.subscriptionStatus,
      lastLoginAt: membership.user.lastLoginAt,
      assignedPlan: membership.assignedTrainingPlan,
      metrics: parseClientMetrics(
        membership.user.profile?.profile ?? null,
        membership.user.profile?.tracking ?? null,
      ),
    };
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.delete("/trainer/clients/:userId", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const managerMembership = await requireActiveGymManagerMembership(
      requester.id,
    );
    const { userId } = trainerClientParamsSchema.parse(request.params);

    const targetMembership = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId: managerMembership.gymId, userId } },
      select: { id: true, role: true, status: true },
    });

    if (
      !targetMembership ||
      targetMembership.status !== "ACTIVE" ||
      targetMembership.role !== "MEMBER"
    ) {
      return reply.status(404).send({ error: "MEMBER_NOT_FOUND" });
    }

    await prisma.gymMembership.delete({ where: { id: targetMembership.id } });

    return reply.status(200).send({
      memberId: userId,
      gymId: managerMembership.gymId,
      removed: true,
    });
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.post("/admin/gyms", async (request, reply) => {
  try {
    const user = await requireAdmin(request);
    const { name, code } = adminCreateGymSchema.parse(request.body);
    const created = await prisma.$transaction(async (tx: any) => {
      const gym = await tx.gym.create({
        data: {
          name,
          code,
          activationCode: code,
        },
      });
      await tx.gymMembership.create({
        data: {
          gymId: gym.id,
          userId: user.id,
          status: "ACTIVE",
          role: "ADMIN",
        },
      });
      return gym;
    });
    return reply.status(201).send({
      id: created.id,
      name: created.name,
      code: created.code,
      activationCode: created.activationCode,
    });
   } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return reply.status(409).send({
        code: "GYM_CODE_ALREADY_EXISTS",
        error: "GYM_CODE_ALREADY_EXISTS",
        message: "Gym code already exists.",
      });
    }
    return handleRequestError(reply, error);
  }
});

app.get("/admin/gyms", async (request, reply) => {
  try {
    await requireAdmin(request);

    const gyms = await prisma.gym.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        activationCode: true,
        _count: {
          select: {
            memberships: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return gyms.map((gym: any) => ({
      id: gym.id,
      name: gym.name,
      code: gym.code,
      activationCode: gym.activationCode,
      membersCount: gym._count.memberships,
    }));
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.delete("/admin/gyms/:gymId", async (request, reply) => {
  try {
    await requireAdmin(request);
    const { gymId } = adminDeleteGymParamsSchema.parse(request.params);

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: {
        id: true,
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    });

    if (!gym) {
      return reply
        .status(404)
        .send({ error: "NOT_FOUND", message: "Gym not found." });
    }

    await prisma.gym.delete({ where: { id: gymId } });

    return reply
      .status(200)
      .send({ ok: true, gymId, deletedMemberships: gym._count.memberships });
   } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return reply.status(404).send({
        code: "GYM_NOT_FOUND",
        error: "GYM_NOT_FOUND",
        message: "Gym not found.",
      });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return reply.status(409).send({
        code: "GYM_DELETE_CONFLICT",
        error: "GYM_DELETE_CONFLICT",
        message: "Gym cannot be deleted due to related records.",
      });
    }
    return handleRequestError(reply, error);
  }
});

app.patch("/admin/gyms/:gymId/members/:userId/role", async (request, reply) => {
  try {
    await requireAdmin(request);
    const { gymId, userId } = adminUpdateGymMemberRoleParamsSchema.parse(
      request.params,
    );
    const { role, status } = adminUpdateGymMemberRoleSchema.parse(request.body);

    const membership = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId, userId } },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    const updated = await prisma.gymMembership.update({
      where: { id: membership.id },
      data: {
        role,
        ...(status ? { status } : {}),
      },
      select: {
        userId: true,
        status: true,
        role: true,
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      userId: updated.userId,
      gym: updated.gym,
      status: updated.status,
      role: updated.role,
    };
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});

app.patch("/gym/admin/members/:userId/role", async (request, reply) => {
  try {
    const requester = await requireUser(request);
    const { userId } = gymAdminUpdateMemberRoleParamsSchema.parse(
      request.params,
    );
    const { role } = gymAdminUpdateMemberRoleSchema.parse(request.body);

    const adminMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: requester.id,
        status: "ACTIVE",
        role: "ADMIN",
      },
      select: {
        gymId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!adminMembership) {
      return reply.status(403).send({ error: "FORBIDDEN" });
    }

    const targetMembership = await prisma.gymMembership.findUnique({
      where: { gymId_userId: { gymId: adminMembership.gymId, userId } },
      select: {
        id: true,
      },
    });

    if (!targetMembership) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    const updated = await prisma.gymMembership.update({
      where: { id: targetMembership.id },
      data: { role },
      select: {
        gymId: true,
        userId: true,
        role: true,
      },
    });

    return {
      ok: true,
      userId: updated.userId,
      gymId: updated.gymId,
      role: updated.role,
    };
   } catch (error: any) {
    return handleRequestError(reply, error);
  }
});
}
