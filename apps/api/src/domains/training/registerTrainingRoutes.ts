import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export function registerTrainingRoutes(app: FastifyInstance, deps: Record<string, any>) {
  const {
    requireUser,
    exerciseListSchema,
    listExercises,
    handleRequestError,
    exerciseParamsSchema,
    getExerciseById,
    createExerciseSchema,
    createExercise,
    trainingPlanListSchema,
    prisma,
    resolveCorrelationId,
    getPayloadSize,
    trainingPlanCreateSchema,
    parseDateInput,
    buildDateRange,
    mapTrainingPlanCreateError,
    trainingPlanParamsSchema,
    trainingDayIncludeWithLegacySafeExercises,
    enrichTrainingPlanWithExerciseLibraryData,
    trainingPlanActiveQuerySchema,
    trainingDayParamsSchema,
    addTrainingExerciseBodySchema,
  } = deps;

app.get("/exercises", async (request, reply) => {
  try {
    await requireUser(request);
    const parsed = exerciseListSchema.parse(request.query);
    const q = parsed.q ?? parsed.query;
    const primaryMuscle = parsed.primaryMuscle ?? parsed.muscle;
    const page = parsed.page ?? 1;
    const limit = parsed.take ?? parsed.limit;
    const offset = parsed.cursor ? 0 : (parsed.offset ?? (page - 1) * limit);

    const { items, total } = await listExercises({
      q,
      primaryMuscle,
      equipment: parsed.equipment,
      cursor: parsed.cursor,
      take: parsed.take,
      limit,
      offset,
    });

    const nextCursor =
      parsed.cursor || parsed.take
        ? items.length === limit
          ? (items[items.length - 1]?.id ?? null)
          : null
        : null;

    return {
      items,
      total,
      limit,
      offset,
      page,
      nextCursor,
      hasMore: offset + items.length < total,
    };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.get("/exercises/:id", async (request, reply) => {
  try {
    await requireUser(request);
    const { id } = exerciseParamsSchema.parse(request.params);
    const exercise = await getExerciseById(id);
    if (!exercise) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    return exercise;
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/exercises", async (request, reply) => {
  try {
    await requireUser(request);
    const payload = createExerciseSchema.parse(request.body);

    if (payload.mediaUrl || payload.imageUrl || payload.videoUrl) {
      return reply.status(400).send({ error: "MEDIA_UPLOAD_NOT_SUPPORTED" });
    }

    const exercise = await createExercise(payload);
    return reply.status(201).send(exercise);
  } catch (error) {
    return handleRequestError(reply, error);
  }
});


app.get("/training-plans", async (request, reply) => {
  try {
    const user = await requireUser(request);
    const { query, limit, offset } = trainingPlanListSchema.parse(
      request.query,
    );
    const where: Prisma.TrainingPlanWhereInput = {
      userId: user.id,
      ...(query
        ? { title: { contains: query, mode: Prisma.QueryMode.insensitive } }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.trainingPlan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
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
        },
      }),
      prisma.trainingPlan.count({ where }),
    ]);
    return { items, total, limit, offset };
  } catch (error) {
    return handleRequestError(reply, error);
  }
});

app.post("/training-plans", async (request, reply) => {
  const correlationId = resolveCorrelationId(request);
  const payloadSize = getPayloadSize(request.body);
  try {
    const user = await requireUser(request);
    const data = trainingPlanCreateSchema.parse(request.body);
    const startDate = parseDateInput(data.startDate);

    if (!startDate) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        code: "INVALID_START_DATE",
        correlationId,
      });
    }

    const dates = buildDateRange(startDate, data.daysCount);
    const plan = await prisma.trainingPlan.create({
      data: {
        userId: user.id,
        title: data.title,
        notes: data.notes ?? null,
        goal: data.goal,
        level: data.level,
        daysPerWeek: data.daysPerWeek,
        focus: data.focus,
        equipment: data.equipment,
        startDate,
        daysCount: data.daysCount,
        days: {
          create: dates.map((date, index) => ({
            date: new Date(`${date}T00:00:00.000Z`),
            label: `Día ${index + 1}`,
            focus: data.focus,
            duration: 45,
            order: index + 1,
          })),
        },
      },
      select: {
        id: true,
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
      },
    });

    app.log.info(
      {
        route: "/training-plans",
        method: "POST",
        status: 201,
        correlationId,
        userId: user.id,
        payloadSize,
        titleHash: crypto
          .createHash("sha256")
          .update(data.title.trim().toLowerCase())
          .digest("hex")
          .slice(0, 12),
      },
      "training plan created",
    );

    return reply.status(201).send(plan);
  } catch (error) {
    const mappedError = mapTrainingPlanCreateError(error);
    if (mappedError) {
      const authRequest = request as FastifyRequest & {
        currentUser?: { id: string };
        gymId?: string;
        role?: string;
      };
      app.log.warn(
        {
          route: "/training-plans",
          method: "POST",
          status: mappedError.statusCode,
          correlationId,
          userId: authRequest.currentUser?.id,
          gymId: authRequest.gymId,
          role: authRequest.role,
          payloadSize,
          code: mappedError.payload.code ?? mappedError.payload.error,
        },
        "training plan create handled error",
      );
      return reply
        .status(mappedError.statusCode)
        .send({ ...mappedError.payload, correlationId });
    }

    app.log.error(
      {
        err: error,
        route: "/training-plans",
        method: "POST",
        correlationId,
        payloadSize,
      },
      "training plan create unhandled error",
    );
    return reply.status(500).send({
      error: "INTERNAL_ERROR",
      code: "INTERNAL_ERROR",
      correlationId,
    });
  }
});

app.get("/training-plans/:id", async (request, reply) => {
  const reqId = request.id;
  try {
    const user = await requireUser(request);
    const { id } = trainingPlanParamsSchema.parse(request.params);
    const plan = await prisma.trainingPlan.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          {
            gymAssignments: {
              some: {
                userId: user.id,
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
      return reply.status(404).send({ error: "NOT_FOUND" });
    }
    const enrichedPlan = await enrichTrainingPlanWithExerciseLibraryData(plan);
    return enrichedPlan;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply
        .status(400)
        .send({ error: "INVALID_INPUT", details: error.flatten() });
    }
    const typed = error as {
      statusCode?: number;
      code?: string;
      debug?: Record<string, unknown>;
    };
    if (typed.statusCode) {
      return handleRequestError(reply, error);
    }
    request.log.error({ reqId, err: error }, "training-plan by id failed");
    return reply.status(500).send({ error: "INTERNAL_ERROR", reqId });
  }
});

app.get("/training-plans/active", async (request, reply) => {
  const reqId = request.id;
  try {
    const user = await requireUser(request);
    const { includeDays } = trainingPlanActiveQuerySchema.parse(request.query);

    const assignedMembership = await prisma.gymMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        role: "MEMBER",
        assignedTrainingPlanId: { not: null },
      },
      select: { assignedTrainingPlanId: true },
      orderBy: { updatedAt: "desc" },
    });

    const activePlanId = assignedMembership?.assignedTrainingPlanId;

    if (activePlanId) {
      const assignedPlan = await prisma.trainingPlan.findUnique({
        where: { id: activePlanId },
        include: includeDays
          ? {
              days: trainingDayIncludeWithLegacySafeExercises,
            }
          : undefined,
      });

      if (assignedPlan) {
        const enrichedPlan = includeDays
          ? await enrichTrainingPlanWithExerciseLibraryData(assignedPlan)
          : assignedPlan;

        return reply.status(200).send({
          source: "assigned",
          plan: enrichedPlan,
        });
      }
    }

    const ownPlan = includeDays
      ? await prisma.trainingPlan.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          include: {
            days: trainingDayIncludeWithLegacySafeExercises,
          },
        })
      : await prisma.trainingPlan.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
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
          },
        });

    if (!ownPlan) {
      return reply.status(404).send({ error: "NOT_FOUND" });
    }

    const enrichedOwnPlan = includeDays
      ? await enrichTrainingPlanWithExerciseLibraryData(ownPlan)
      : ownPlan;

    return reply.status(200).send({
      source: "own",
      plan: enrichedOwnPlan,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply
        .status(400)
        .send({ error: "INVALID_INPUT", details: error.flatten() });
    }
    const typed = error as {
      statusCode?: number;
      code?: string;
      debug?: Record<string, unknown>;
    };
    if (typed.statusCode) {
      return handleRequestError(reply, error);
    }
    request.log.error({ reqId, err: error }, "training-plan active failed");
    return reply.status(500).send({ error: "INTERNAL_ERROR", reqId });
  }
});

app.post(
  "/training-plans/:planId/days/:dayId/exercises",
  async (request, reply) => {
    try {
      const requester = await requireUser(request);
      const { planId, dayId } = trainingDayParamsSchema.parse(request.params);
      const { exerciseId, athleteUserId } = addTrainingExerciseBodySchema.parse(
        request.body,
      );

      const exercise = await prisma.exercise.findUnique({
        where: { id: exerciseId },
        select: { id: true, name: true, imageUrl: true },
      });

      if (!exercise) {
        return reply.status(404).send({ error: "EXERCISE_NOT_FOUND" });
      }

      const plan = await prisma.trainingPlan.findUnique({
        where: { id: planId },
        select: { id: true, userId: true },
      });

      if (!plan) {
        return reply.status(404).send({ error: "TRAINING_PLAN_NOT_FOUND" });
      }

      const isOwnPlan = plan.userId === requester.id;

      if (athleteUserId) {
        if (isOwnPlan === false) {
          return reply.status(403).send({ error: "FORBIDDEN" });
        }

        const membership = await prisma.gymMembership.findFirst({
          where: {
            userId: athleteUserId,
            status: "ACTIVE",
            role: "MEMBER",
            assignedTrainingPlanId: planId,
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
          select: { id: true },
        });

        if (!membership) {
          return reply.status(404).send({ error: "MEMBER_PLAN_NOT_FOUND" });
        }
      } else if (!isOwnPlan) {
        return reply.status(403).send({ error: "FORBIDDEN" });
      }

      const day = await prisma.trainingDay.findFirst({
        where: { id: dayId, planId },
        select: { id: true },
      });

      if (!day) {
        return reply.status(404).send({ error: "TRAINING_DAY_NOT_FOUND" });
      }

      const created = await prisma.trainingExercise.create({
        data: {
          dayId,
          exerciseId: exercise.id,
          imageUrl: exercise.imageUrl,
          name: exercise.name,
          sets: 3,
          reps: "10-12",
        },
      });

      return reply.status(201).send({
        exercise: created,
        sourceExercise: exercise,
        planId,
        dayId,
        athleteUserId: athleteUserId ?? null,
      });
    } catch (error) {
      return handleRequestError(reply, error);
    }
  },
);

}
