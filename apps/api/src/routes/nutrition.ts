import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { User, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { handleRequestError } from "../lib/http-utils.js";

type RequireUserFn = (request: FastifyRequest) => Promise<User>;

interface NutritionDeps {
  prisma: PrismaClient;
  requireUser: RequireUserFn;
}

// Schema imports (inline for now - would be in separate file)
const nutritionPlanListSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const nutritionPlanParamsSchema = z.object({ id: z.string().min(1) });

export function registerNutritionRoutes(
  app: FastifyInstance,
  deps: NutritionDeps
): void {
  const { prisma, requireUser } = deps;

  // GET /nutrition-plans - List user's nutrition plans
  app.get("/nutrition-plans", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireUser(request);
      const { query, limit, offset } = nutritionPlanListSchema.parse(request.query);
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
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "nutrition plans list error"));
    }
  });

  // GET /nutrition-plans/:id - Get single nutrition plan
  app.get("/nutrition-plans/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "nutrition plan get error"));
    }
  });

  // GET /members/me/assigned-nutrition-plan - Get assigned plan from gym
  app.get("/members/me/assigned-nutrition-plan", async (request: FastifyRequest, reply: FastifyReply) => {
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
          assignedNutritionPlan: true,
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
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "assigned nutrition plan error"));
    }
  });

  // GET /recipes - List recipes (enhanced filtering)
  const recipeListSchema = z.object({
    query: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    // Legacy category (backwards compat)
    category: z.string().optional(),
    // New filters
    mealType: z.string().optional(),
    dietType: z.string().optional(),
    goalFit: z.string().optional(),
    mainIngredient: z.string().optional(),
    cuisine: z.string().optional(),
    difficulty: z.string().optional(),
    tags: z.string().optional(), // comma-separated: "high-protein,low-carb"
    includeIngredients: z.string().optional(), // busca en nombres de ingredientes
  });

  app.get("/recipes", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        query,
        limit,
        offset,
        category,
        mealType,
        dietType,
        goalFit,
        mainIngredient,
        cuisine,
        difficulty,
        tags,
        includeIngredients,
      } = recipeListSchema.parse(request.query);

      // Build OR search across name + description + keywords + tags
      const textSearch = query
        ? {
            OR: [
              { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { description: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { displayName: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { tagline: { contains: query, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {};

      // Parse comma-separated tags
      const tagArray = tags
        ? tags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        : [];

      const where: Prisma.RecipeWhereInput = {
        ...textSearch,
        // Legacy
        ...(category ? { category: { equals: category } } : {}),
        // New filters (all additive — no filter = no condition)
        ...(mealType ? { mealType: { equals: mealType } } : {}),
        ...(dietType ? { dietType: { equals: dietType } } : {}),
        ...(goalFit ? { goalFit: { equals: goalFit } } : {}),
        ...(mainIngredient
          ? { mainIngredient: { contains: mainIngredient, mode: Prisma.QueryMode.insensitive } }
          : {}),
        ...(cuisine ? { cuisine: { equals: cuisine } } : {}),
        ...(difficulty ? { difficulty: { equals: difficulty } } : {}),
        // Tags: all requested tags must be present (AND logic)
        ...(tagArray.length > 0
          ? {
              AND: tagArray.map((tag) => ({
                tags: { has: tag },
              })),
            }
          : {}),
        // Ingredient search: recipe must have at least one ingredient matching
        ...(includeIngredients
          ? {
              ingredients: {
                some: {
                  name: { contains: includeIngredients, mode: Prisma.QueryMode.insensitive },
                },
              },
            }
          : {}),
      };

      const [items, total] = await prisma.$transaction([
        prisma.recipe.findMany({
          where,
          orderBy: [{ name: "asc" }],
          skip: offset,
          take: limit,
        }),
        prisma.recipe.count({ where }),
      ]);
      return { items, total, limit, offset };
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "recipes list error"));
    }
  });

  // GET /recipes/:id - Get single recipe (full detail)
  app.get("/recipes/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const recipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
          ingredients: {
            orderBy: { isMainIngredient: "desc" },
          },
        },
      });
      if (!recipe) {
        return reply.status(404).send({ error: "NOT_FOUND" });
      }
      return recipe;
    } catch (error) {
      return handleRequestError(reply, error, (err) => app.log.error({ err }, "recipe get error"));
    }
  });
}