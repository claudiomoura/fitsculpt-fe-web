import type { User } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { MealType } from "@prisma/client";
import {
  analyzeMealPhotoRequestSchema,
  mealPhotoAnalysisJsonSchema,
  mealPhotoAnalysisResponseSchema,
  createMealLogSchema,
  getMealsQuerySchema,
  mealLogToResponse,
} from "../meals/schemas.js";
import { mealLogService } from "../meals/service.js";
import { sendAiEndpointError } from "../domains/ai/mapAiEndpointError.js";
import type { OpenAiResponse } from "../ai/provider/openaiClient.js";

interface MealLogParams {
  id: string;
}

type RequireUserFn = (request: FastifyRequest) => Promise<User>;
type CallOpenAiFn = (
  prompt: string,
  attempt?: number,
  parser?: (content: string) => Record<string, unknown>,
  options?: {
    parser?: (content: string) => Record<string, unknown>;
    maxTokens?: number;
    responseFormat?: {
      type: "json_object";
    } | {
      type: "json_schema";
      json_schema: {
        name: string;
        schema: Record<string, unknown>;
        strict?: boolean;
      };
    };
    model?: string;
    retryOnParseError?: boolean;
    userContent?: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
    >;
  },
) => Promise<OpenAiResponse>;
type CreateHttpErrorFn = (statusCode: number, code: string, debug?: Record<string, unknown>) => Error;

export function registerMealRoutes(
  app: FastifyInstance,
  deps: { requireUser: RequireUserFn; callOpenAi: CallOpenAiFn; createHttpError: CreateHttpErrorFn }
): void {
  const { requireUser, callOpenAi, createHttpError } = deps;

  const foodPhotoSystemPrompt = [
    "Analiza una foto de comida en un plato.",
    "Devuelve SOLO JSON estricto.",
    "Estima titulo de comida, items y macros por item (calories, protein, carbs, fats).",
    "Si no estas seguro, baja confidence y confidenceLabel.",
    "No inventes ingredientes no visibles.",
    "Usa valores realistas para una porcion normal.",
  ].join(" ");

  function roundMacro(value: number): number {
    return Math.max(0, Math.round(value * 10) / 10);
  }

  function normalizeAnalysis(payload: unknown) {
    const parsed = mealPhotoAnalysisResponseSchema.parse(payload);
    const normalizedItems = parsed.items.map((item) => ({
      ...item,
      calories: roundMacro(item.calories),
      protein: roundMacro(item.protein),
      carbs: roundMacro(item.carbs),
      fats: roundMacro(item.fats),
      ...(item.quantity === undefined ? {} : { quantity: roundMacro(item.quantity) }),
    }));

    const totals = {
      calories: roundMacro(normalizedItems.reduce((acc, item) => acc + item.calories, 0)),
      protein: roundMacro(normalizedItems.reduce((acc, item) => acc + item.protein, 0)),
      carbs: roundMacro(normalizedItems.reduce((acc, item) => acc + item.carbs, 0)),
      fats: roundMacro(normalizedItems.reduce((acc, item) => acc + item.fats, 0)),
    };

    return {
      ...parsed,
      items: normalizedItems,
      totals,
      confidence: roundMacro(parsed.confidence),
    };
  }

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

  app.post(
    "/meals/analyze-photo",
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireUser(request);

      try {
        const input = analyzeMealPhotoRequestSchema.parse(request.body);
        const localeHint =
          input.locale === "en"
            ? "Write title and notes in English."
            : input.locale === "pt"
              ? "Escreve titulo e notas em portugues."
              : "Escribe titulo y notas en espanol.";

        const result = await callOpenAi(foodPhotoSystemPrompt, 0, JSON.parse, {
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "meal_photo_analysis",
              schema: mealPhotoAnalysisJsonSchema as unknown as Record<string, unknown>,
              strict: true,
            },
          },
          model: "gpt-4o-mini",
          maxTokens: 700,
          retryOnParseError: false,
          userContent: [
            {
              type: "text",
              text: `${localeHint} Prioriza alimentos visibles y evita sobreestimar porciones.`,
            },
            {
              type: "image_url",
              image_url: {
                url: input.photoDataUrl,
                detail: "low",
              },
            },
          ],
        });

        const normalized = normalizeAnalysis(result.payload);

        if (normalized.confidenceLabel === "low" || normalized.confidence < 0.45) {
          app.log.warn({ confidence: normalized.confidence }, "meal photo analysis low confidence");
          return reply.status(422).send({
            error: "LOW_CONFIDENCE",
            kind: "validation",
            confidence: normalized.confidence,
            message: "Could not estimate meal with enough confidence",
          });
        }

        return reply.status(200).send(normalized);
      } catch (error) {
        const typed = error as { code?: string; message?: string };
        if (typed.code === "AI_REQUEST_FAILED") {
          return sendAiEndpointError(reply, createHttpError(502, "AI_REQUEST_FAILED", { kind: "upstream" }));
        }
        if (typed.code === "AI_NOT_CONFIGURED") {
          return sendAiEndpointError(reply, createHttpError(503, "AI_NOT_CONFIGURED", { kind: "internal" }));
        }
        if (typed.message?.includes("Invalid image data URL")) {
          return reply.status(400).send({ error: "INVALID_IMAGE", kind: "validation" });
        }
        return sendAiEndpointError(reply, error);
      }
    }
  );
}
