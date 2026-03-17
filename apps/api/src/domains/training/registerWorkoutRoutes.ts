import type { FastifyInstance } from "fastify";
import { z } from "zod";

export function registerWorkoutRoutes(app: FastifyInstance, deps: Record<string, any>) {
  const {
    prisma,
    requireUser,
    handleRequestError,
    workoutCreateSchema,
    workoutUpdateSchema,
    workoutSessionUpdateSchema,
  } = deps;

  app.get("/workouts", async (request, reply) => {
    try {
      const user = await requireUser(request);
      const workouts = await prisma.workout.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          sessions: {
            select: { finishedAt: true },
          },
        },
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
      const existing = await prisma.workout.findFirst({ where: { id, userId: user.id } });
      if (!existing) {
        return reply.status(404).send({ error: "NOT_FOUND" });
      }
      const updated = await prisma.workout.update({
        where: { id },
        data: {
          name: data.name,
          notes: data.notes,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          durationMin: data.durationMin,
        },
        include: { exercises: { orderBy: { order: "asc" } } },
      });
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
      const existing = await prisma.workout.findFirst({ where: { id, userId: user.id } });
      if (!existing) {
        return reply.status(404).send({ error: "NOT_FOUND" });
      }
      await prisma.workout.delete({ where: { id } });
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
      const workout = await prisma.workout.findFirst({ where: { id, userId: user.id } });
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
      const session = await prisma.workoutSession.findFirst({ where: { id, userId: user.id } });
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
      const session = await prisma.workoutSession.findFirst({ where: { id, userId: user.id } });
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
}
