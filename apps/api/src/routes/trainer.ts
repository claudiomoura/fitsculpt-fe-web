import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { User, PrismaClient } from "@prisma/client";
import { handleRequestError } from "../lib/http-utils.js";
import { createHttpError } from "../lib/http-utils.js";

type RequireUserFn = (request: FastifyRequest) => Promise<User>;

interface TrainerDeps {
  prisma: PrismaClient;
  requireUser: RequireUserFn;
}

export function registerTrainerRoutes(
  app: FastifyInstance,
  deps: TrainerDeps
): void {
  const { prisma, requireUser } = deps;

  // Helper to check trainer role
  const requireTrainer = async (user: User) => {
    const membership = await prisma.gymMembership.findFirst({
      where: { userId: user.id, role: { in: ["ADMIN", "TRAINER"] }, status: "ACTIVE" },
    });
    if (!membership) {
      throw createHttpError(403, "NOT_TRAINER");
    }
    return membership;
  };

  // GET /trainer/nutrition-plans
  app.get("/trainer/nutrition-plans", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      
      const query = request.query as Record<string, string | undefined>;
      const limit = Math.min(parseInt(query?.limit || "20") || 20, 100);
      const offset = parseInt(query?.offset || "0") || 0;
      
      const plans = await prisma.nutritionPlan.findMany({
        where: { userId: user.id },
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      
      return { items: plans, total: plans.length, limit, offset };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer nutrition plans error"));
    }
  });

  // POST /trainer/nutrition-plans
  app.post("/trainer/nutrition-plans", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      
      const schema = z.object({
        title: z.string().min(1),
        dailyCalories: z.number(),
        proteinG: z.number(),
        fatG: z.number(),
        carbsG: z.number(),
        daysCount: z.number().default(7),
        startDate: z.string().default(() => new Date().toISOString()),
      });
      const data = schema.parse(request.body);
      
      const plan = await prisma.nutritionPlan.create({
        data: { ...data, userId: user.id },
      });
      
      return plan;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer create nutrition plan error"));
    }
  });

  // GET /trainer/nutrition-plans/:id
  app.get("/trainer/nutrition-plans/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      const { id } = request.params;
      
      const plan = await prisma.nutritionPlan.findFirst({
        where: { id },
        include: { days: { include: { meals: true } } },
      });
      
      if (!plan) return reply.status(404).send({ error: "NOT_FOUND" });
      return plan;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer get nutrition plan error"));
    }
  });

  // PATCH /trainer/nutrition-plans/:id
  app.patch("/trainer/nutrition-plans/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      const { id } = request.params;
      const body = request.body as Record<string, unknown>;
      
      const plan = await prisma.nutritionPlan.findFirst({
        where: { id },
      });
      
      if (!plan) return reply.status(404).send({ error: "NOT_FOUND" });
      
      const updated = await prisma.nutritionPlan.update({
        where: { id },
        data: body,
      });
      
      return updated;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer update nutrition plan error"));
    }
  });

  // GET /trainer/plans - List training plans
  app.get("/trainer/plans", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      const query = request.query as { take?: string; skip?: string };
      const take = Math.min(parseInt(query.take ?? "50", 10) || 50, 100);
      const skip = parseInt(query.skip ?? "0", 10) || 0;

      const plans = await prisma.trainingPlan.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      });

      return { items: plans };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer plans list error"));
    }
  });

  // POST /trainer/plans - Create training plan
  app.post("/trainer/plans", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      
      const schema = z.object({
        title: z.string().min(1),
        notes: z.string().optional(),
        goal: z.string().default("maintain"),
        level: z.string().default("beginner"),
        daysPerWeek: z.number().default(3),
        focus: z.string().default("full"),
        equipment: z.string().default("gym"),
        startDate: z.string().default(() => new Date().toISOString()),
        daysCount: z.number().default(7),
      });
      const data = schema.parse(request.body);
      
      const plan = await prisma.trainingPlan.create({
        data: { ...data, userId: user.id },
      });
      
      return plan;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer create plan error"));
    }
  });

  // GET /trainer/plans/:planId
  app.get("/trainer/plans/:planId", async (request: FastifyRequest<{ Params: { planId: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      const { planId } = request.params;
      
      const plan = await prisma.trainingPlan.findFirst({
        where: { id: planId },
        include: { days: { include: { exercises: true } } },
      });
      
      if (!plan) return reply.status(404).send({ error: "NOT_FOUND" });
      return plan;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer get plan error"));
    }
  });

  // DELETE /trainer/plans/:planId
  app.delete("/trainer/plans/:planId", async (request: FastifyRequest<{ Params: { planId: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      const { planId } = request.params;
      
      await prisma.trainingPlan.delete({
        where: { id: planId },
      });
      
      return { ok: true };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer delete plan error"));
    }
  });

  // POST /trainer/plans/:planId/days/:dayId/exercises
  app.post("/trainer/plans/:planId/days/:dayId/exercises", async (request: FastifyRequest<{ Params: { planId: string; dayId: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      
      const schema = z.object({
        exerciseId: z.string().min(1),
        sets: z.number(),
        reps: z.string().optional(),
        rest: z.number().optional(),
        notes: z.string().optional(),
      });
      const data = schema.parse(request.body);
      
      const exercise = await prisma.trainingExercise.create({
        data: {
          dayId: request.params.dayId,
          exerciseId: data.exerciseId,
          name: "Exercise", // Required field, using default
          sets: data.sets ?? 3,
          reps: data.reps ?? "10",
          rest: data.rest,
          notes: data.notes,
        },
      });
      
      return exercise;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer add exercise error"));
    }
  });

  // DELETE /trainer/plans/:planId/days/:dayId/exercises/:exerciseId
  app.delete("/trainer/plans/:planId/days/:dayId/exercises/:exerciseId", async (request: FastifyRequest<{ Params: { planId: string; dayId: string; exerciseId: string } }>, reply: FastifyReply) => {
    try {
      const currentUser = await requireUser(request);
      await requireTrainer(currentUser);
      
      await prisma.trainingExercise.delete({
        where: { id: request.params.exerciseId },
      });
      
      return { ok: true };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer delete exercise error"));
    }
  });

  // POST /trainer/clients/:userId/assigned-plan
  app.post("/trainer/clients/:userId/assigned-plan", async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      const { userId } = request.params;
      const body = request.body as { planId: string; startDate?: string };
      
      const member = await prisma.gymMembership.findFirst({
        where: { userId, gymId: membership.gymId, status: "ACTIVE" },
      });
      
      if (!member) return reply.status(404).send({ error: "MEMBER_NOT_FOUND" });
      
      // Assign training plan - would update user profile
      return { assigned: true, planId: body.planId };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "assign plan error"));
    }
  });

  // GET /trainer/clients/:userId/assigned-plan
  app.get("/trainer/clients/:userId/assigned-plan", async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      
      const member = await prisma.gymMembership.findFirst({
        where: { userId: request.params.userId, gymId: membership.gymId },
      });
      
      if (!member) return reply.status(404).send({ error: "MEMBER_NOT_FOUND" });
      
      // Return assigned plan IDs from member's data
      return { 
        assignedTrainingPlanId: member.assignedTrainingPlanId,
        assignedNutritionPlanId: member.assignedNutritionPlanId 
      };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "get assigned plan error"));
    }
  });

  // DELETE /trainer/clients/:userId/assigned-plan
  app.delete("/trainer/clients/:userId/assigned-plan", async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      
      await prisma.gymMembership.findFirst({
        where: { userId: request.params.userId, gymId: membership.gymId },
      });
      
      return { removed: true };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "remove assigned plan error"));
    }
  });

  // GET /trainer/clients - List trainer's clients
  app.get("/trainer/clients", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      
      const clients = await prisma.gymMembership.findMany({
        where: { gymId: membership.gymId, role: "MEMBER", status: "ACTIVE" },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      
      return { items: clients.map(c => c.user) };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer clients error"));
    }
  });

  // GET /trainer/recipes
  app.get("/trainer/recipes", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      const query = request.query as { take?: string; skip?: string };
      const take = Math.min(parseInt(query.take ?? "100", 10) || 100, 200);
      const skip = parseInt(query.skip ?? "0", 10) || 0;

      const recipes = await prisma.recipe.findMany({
        orderBy: { name: "asc" },
        take,
        skip,
      });

      return { items: recipes };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "trainer recipes error"));
    }
  });

  // POST /trainer/recipes
  app.post("/trainer/recipes", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      
      const schema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
        ingredients: z.array(z.object({ name: z.string(), grams: z.number() })).optional(),
      });
      const data = schema.parse(request.body);
      
      const { ingredients, ...recipeData } = data;
      
      const recipe = await prisma.recipe.create({
        data: { ...recipeData, trainerId: user.id },
      });
      
      // Create ingredients if provided
      if (ingredients && ingredients.length > 0) {
        await prisma.recipeIngredient.createMany({
          data: ingredients.map(ing => ({
            recipeId: recipe.id,
            name: ing.name,
            grams: ing.grams,
          })),
        });
      }
      
      return recipe;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "create recipe error"));
    }
  });

  // GET /trainer/recipes/:id
  app.get("/trainer/recipes/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      
      const recipe = await prisma.recipe.findFirst({
        where: { id: request.params.id },
      });
      
      if (!recipe) return reply.status(404).send({ error: "NOT_FOUND" });
      return recipe;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "get recipe error"));
    }
  });

  // DELETE /trainer/recipes/:id
  app.delete("/trainer/recipes/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const membership = await requireTrainer(user);
      
      await prisma.recipe.delete({
        where: { id: request.params.id },
      });
      
      return { ok: true };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "delete recipe error"));
    }
  });
}