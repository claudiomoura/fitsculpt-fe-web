import type { User } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { MealType } from "@prisma/client";
import {
  createMealLogSchema,
  getMealsQuerySchema,
  mealLogToResponse,
} from "../meals/schemas.js";
import { mealLogService } from "../meals/service.js";

interface MealLogParams {
  id: string;
}

type RequireUserFn = (request: FastifyRequest) => Promise<User>;

export function registerMealRoutes(
  app: FastifyInstance,
  deps: { requireUser: RequireUserFn }
): void {
  const { requireUser } = deps;

  // GET /meals - List meal logs
  app.get(
    "/meals",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await requireUser(request);
      const query = getMealsQuerySchema.parse(request.query);

      const meals = await mealLogService.getAll(user.id, {
        startDate: query.startDate,
        endDate: query.endDate,
        mealType: query.mealType,
      });

      const items = meals.map(mealLogToResponse);

      return reply.send({
        items,
        total: items.length,
        limit: query.limit,
        offset: query.offset,
      });
    }
  );

  // GET /meals/date/:date - Get meals for a specific date
  app.get(
    "/meals/date/:date",
    async (request: FastifyRequest<{ Params: { date: string } }>, reply: FastifyReply) => {
      const user = await requireUser(request);
      const { date } = request.params;

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.status(400).send({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      const meals = await mealLogService.getByDate(user.id, date);
      const items = meals.map(mealLogToResponse);

      return reply.send({
        items,
        total: items.length,
        date,
      });
    }
  );

  // GET /meals/today - Get today's meal summary
  app.get(
    "/meals/today",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await requireUser(request);
      const summary = await mealLogService.getTodaySummary(user.id);

      return reply.send({
        ...summary,
        date: new Date().toISOString().split("T")[0],
      });
    }
  );

  // POST /meals - Create a new meal log
  app.post(
    "/meals",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await requireUser(request);
      const input = createMealLogSchema.parse(request.body);

      const meal = await mealLogService.create(user.id, {
        date: input.date,
        mealType: input.mealType as MealType,
        title: input.title,
        items: input.items,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fats: input.fats,
      });

      return reply.status(201).send(mealLogToResponse(meal));
    }
  );

  // PATCH /meals/:id - Update a meal log
  app.patch(
    "/meals/:id",
    async (
      request: FastifyRequest<{ Params: MealLogParams }>,
      reply: FastifyReply
    ) => {
      const user = await requireUser(request);
      const { id } = request.params;
      const input = request.body as { title?: string; items?: unknown[]; calories?: number; protein?: number; carbs?: number; fats?: number; completed?: boolean };

      // Handle special "completed" field
      let completedAt: Date | null | undefined = undefined;
      if (input.completed !== undefined) {
        completedAt = input.completed ? new Date() : null;
      }

      const meal = await mealLogService.update(id, user.id, {
        title: input.title,
        items: input.items as Record<string, unknown>[],
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fats: input.fats,
        completedAt,
      });

      if (!meal) {
        return reply.status(404).send({ error: "Meal log not found" });
      }

      return reply.send(mealLogToResponse(meal));
    }
  );

  // POST /meals/:id/complete - Mark meal as completed
  app.post(
    "/meals/:id/complete",
    async (request: FastifyRequest<{ Params: MealLogParams }>, reply: FastifyReply) => {
      const user = await requireUser(request);
      const { id } = request.params;

      const meal = await mealLogService.complete(id, user.id);

      if (!meal) {
        return reply.status(404).send({ error: "Meal log not found" });
      }

      return reply.send(mealLogToResponse(meal));
    }
  );

  // POST /meals/:id/uncomplete - Mark meal as not completed
  app.post(
    "/meals/:id/uncomplete",
    async (request: FastifyRequest<{ Params: MealLogParams }>, reply: FastifyReply) => {
      const user = await requireUser(request);
      const { id } = request.params;

      const meal = await mealLogService.uncomplete(id, user.id);

      if (!meal) {
        return reply.status(404).send({ error: "Meal log not found" });
      }

      return reply.send(mealLogToResponse(meal));
    }
  );

  // DELETE /meals/:id - Delete a meal log
  app.delete(
    "/meals/:id",
    async (
      request: FastifyRequest<{ Params: MealLogParams }>,
      reply: FastifyReply
    ) => {
      const user = await requireUser(request);
      const { id } = request.params;

      const deleted = await mealLogService.delete(id, user.id);

      if (!deleted) {
        return reply.status(404).send({ error: "Meal log not found" });
      }

      return reply.status(204).send();
    }
  );
}