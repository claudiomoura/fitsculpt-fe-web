import type { PrismaClient, User } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

type RegisterNutritionRoutesDeps = {
  prisma: PrismaClient;
  requireUser: (request: FastifyRequest) => Promise<User>;
  handleRequestError: (reply: FastifyReply, error: unknown) => FastifyReply;
  userFoodSchema: z.ZodTypeAny;
};

export function registerNutritionRoutes(
  app: FastifyInstance,
  { prisma, requireUser, handleRequestError, userFoodSchema }: RegisterNutritionRoutesDeps,
) {
  app.get("/user-foods", async (request, reply) => {
    try {
      const user = await requireUser(request);
      const foods = await prisma.userFood.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
      return foods;
    } catch (error) {
      return handleRequestError(reply, error);
    }
  });

  app.post("/user-foods", async (request, reply) => {
    try {
      const user = await requireUser(request);
      const data = userFoodSchema.parse(request.body);
      const food = await prisma.userFood.create({
        data: {
          ...data,
          userId: user.id,
        },
      });
      return reply.status(201).send(food);
    } catch (error) {
      return handleRequestError(reply, error);
    }
  });

  app.put("/user-foods/:id", async (request, reply) => {
    try {
      const user = await requireUser(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const data = userFoodSchema.parse(request.body);
      const updated = await prisma.userFood.updateMany({
        where: { id: params.id, userId: user.id },
        data,
      });
      if (updated.count === 0) {
        return reply.status(404).send({ error: "NOT_FOUND" });
      }
      const food = await prisma.userFood.findUnique({ where: { id: params.id } });
      return food;
    } catch (error) {
      return handleRequestError(reply, error);
    }
  });

  app.delete("/user-foods/:id", async (request, reply) => {
    try {
      const user = await requireUser(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const deleted = await prisma.userFood.deleteMany({
        where: { id: params.id, userId: user.id },
      });
      if (deleted.count === 0) {
        return reply.status(404).send({ error: "NOT_FOUND" });
      }
      return reply.status(204).send();
    } catch (error) {
      return handleRequestError(reply, error);
    }
  });
}
