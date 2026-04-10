import type { User } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { MealType } from "@prisma/client";
import { z } from "zod";
import type { AuthenticatedEntitlementsRequest } from "../middleware/entitlements.js";
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

type MealPhotoEntitlements = {
  legacy: { tier: string };
  role: { adminOverride: boolean };
};

type ChargeAiUsageForResultFn = (params: any) => Promise<{ payload: Record<string, unknown> }>;

export function registerMealRoutes(
  app: FastifyInstance,
  deps: {
    requireUser: RequireUserFn;
    callOpenAi: CallOpenAiFn;
    createHttpError: CreateHttpErrorFn;
    aiNutritionDomainGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
    getUserEntitlements?: (user: User) => MealPhotoEntitlements;
    getEffectiveTokenBalance?: (user: User) => number;
    assertSufficientAiTokenBalance?: (user: User, minimumRequiredTokens?: number) => number;
    getEstimatedAiFeatureTokens?: (feature: string) => number;
    enforceAiQuota?: (user: { id: string; plan: string }) => Promise<void>;
    chargeAiUsageForResult?: ChargeAiUsageForResultFn;
    prisma?: unknown;
    aiPricing?: unknown;
  }
): void {
  const {
    requireUser,
    callOpenAi,
    createHttpError,
    aiNutritionDomainGuard,
    getUserEntitlements,
    getEffectiveTokenBalance,
    assertSufficientAiTokenBalance,
    getEstimatedAiFeatureTokens,
    enforceAiQuota,
    chargeAiUsageForResult,
    prisma,
    aiPricing,
  } = deps;
  const mealPhotoFeature = "meal-photo-analysis";

  const foodPhotoSystemPrompt = [
    "Analiza una foto de comida en un plato.",
    "Devuelve SOLO JSON estricto.",
    "Identifica que comida es y separa los alimentos visibles en items.",
    "Estima titulo de comida, items y macros por item (calories, protein, carbs, fats).",
    "Si no estas seguro, baja confidence y confidenceLabel.",
    "No inventes ingredientes no visibles.",
    "Usa valores realistas para una porcion normal.",
    "Incluye notes breves cuando la estimacion sea dudosa o falten ingredientes fuera de camara.",
  ].join(" ");

  const fallbackCopy = {
    es: {
      title: "Comida por revisar",
      item: "Comida no identificada",
      notes: {
        low_confidence: "Estimacion visual con baja confianza. Revisa o ajusta manualmente antes de guardar.",
        upstream: "La IA no estuvo disponible. Se devuelve una estimacion editable para que no pierdas el registro.",
        contract_drift: "La IA devolvio un formato incompleto. Se genero una estimacion editable.",
      },
    },
    en: {
      title: "Meal to review",
      item: "Unidentified food",
      notes: {
        low_confidence: "Low-confidence visual estimate. Review or adjust it before saving.",
        upstream: "AI was unavailable. Returning an editable estimate so logging can continue.",
        contract_drift: "AI returned an incomplete format. An editable estimate was generated.",
      },
    },
    pt: {
      title: "Refeicao para revisar",
      item: "Comida nao identificada",
      notes: {
        low_confidence: "Estimativa visual com baixa confianca. Revise ou ajuste antes de guardar.",
        upstream: "A IA nao esteve disponivel. Foi devolvida uma estimativa editavel para nao bloquear o registo.",
        contract_drift: "A IA devolveu um formato incompleto. Foi gerada uma estimativa editavel.",
      },
    },
  } as const;

  type SupportedLocale = keyof typeof fallbackCopy;

  function clampConfidence(value: number, max = 1): number {
    return Math.min(max, Math.max(0, roundMacro(value)));
  }

  function getFallbackLocale(locale: string | undefined): SupportedLocale {
    return locale === "en" || locale === "pt" ? locale : "es";
  }

  function trimString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  }

  function readNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? roundMacro(value) : undefined;
  }

  function enrichAnalysis(parsed: z.infer<typeof mealPhotoAnalysisResponseSchema>, analysisSource: "ai" | "fallback", degraded: boolean) {
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
      confidence: clampConfidence(parsed.confidence),
      foodName: trimString(parsed.foodName) ?? normalizedItems[0]?.name ?? parsed.title,
      kcal: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fats,
      analysisSource,
      degraded,
    };
  }

  function sanitizeFallbackItems(payload: unknown, fallbackName: string) {
    if (!payload || typeof payload !== "object" || !Array.isArray((payload as { items?: unknown[] }).items)) {
      return [];
    }

    const items = (payload as { items: unknown[] }).items
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const entry = item as Record<string, unknown>;
        const name = trimString(entry.name) ?? fallbackName;
        const calories = readNumber(entry.calories) ?? 0;
        const protein = readNumber(entry.protein) ?? 0;
        const carbs = readNumber(entry.carbs) ?? 0;
        const fats = readNumber(entry.fats) ?? readNumber(entry.fat) ?? 0;
        return {
          name,
          calories,
          protein,
          carbs,
          fats,
          ...(readNumber(entry.quantity) === undefined ? {} : { quantity: readNumber(entry.quantity) }),
          ...(trimString(entry.unit) === undefined ? {} : { unit: trimString(entry.unit) }),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return items.slice(0, 12);
  }

  function buildFallbackAnalysis(args: {
    locale: string | undefined;
    payload?: unknown;
    reason: "low_confidence" | "upstream" | "contract_drift";
  }) {
    const locale = getFallbackLocale(args.locale);
    const copy = fallbackCopy[locale];
    const fallbackItems = sanitizeFallbackItems(args.payload, copy.item);
    const payloadRecord = args.payload && typeof args.payload === "object" ? args.payload as Record<string, unknown> : null;
    const payloadTotals = payloadRecord?.totals && typeof payloadRecord.totals === "object"
      ? payloadRecord.totals as Record<string, unknown>
      : null;
    const title = trimString(payloadRecord?.title) ?? trimString(payloadRecord?.foodName) ?? copy.title;
    const items = fallbackItems.length > 0
      ? fallbackItems
      : [{
          name: trimString(payloadRecord?.foodName) ?? copy.item,
          calories: readNumber(payloadTotals?.calories) ?? readNumber(payloadRecord?.kcal) ?? 0,
          protein: readNumber(payloadTotals?.protein) ?? readNumber(payloadRecord?.protein) ?? 0,
          carbs: readNumber(payloadTotals?.carbs) ?? readNumber(payloadRecord?.carbs) ?? 0,
          fats: readNumber(payloadTotals?.fats) ?? readNumber(payloadRecord?.fat) ?? 0,
        }];
    const notes = [trimString(payloadRecord?.notes), copy.notes[args.reason]].filter(Boolean).join(" ").slice(0, 280);

    return enrichAnalysis({
      title,
      items,
      totals: { calories: 0, protein: 0, carbs: 0, fats: 0 },
      confidence: clampConfidence(readNumber(payloadRecord?.confidence) ?? 0.24, 0.44),
      confidenceLabel: "low",
      notes,
    }, "fallback", true);
  }

  function roundMacro(value: number): number {
    return Math.max(0, Math.round(value * 10) / 10);
  }

  function normalizeAnalysis(payload: unknown) {
    return enrichAnalysis(mealPhotoAnalysisResponseSchema.parse(payload), "ai", false);
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
    aiNutritionDomainGuard ? { preHandler: aiNutritionDomainGuard } : {},
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedEntitlementsRequest;
      const user = authRequest.currentUser ?? await requireUser(request);
      const entitlements = authRequest.currentEntitlements ?? getUserEntitlements?.(user);
      const shouldChargeAi = Boolean(
        entitlements
        && !entitlements.role.adminOverride
        && assertSufficientAiTokenBalance
        && getEstimatedAiFeatureTokens
        && enforceAiQuota
        && chargeAiUsageForResult
        && prisma
        && aiPricing,
      );
      const parsedInput = analyzeMealPhotoRequestSchema.safeParse(request.body);
      if (!parsedInput.success) {
        return sendAiEndpointError(reply, parsedInput.error);
      }

      const input = parsedInput.data;

      try {
        if (shouldChargeAi) {
          assertSufficientAiTokenBalance!(user, getEstimatedAiFeatureTokens!(mealPhotoFeature));
          await enforceAiQuota!({ id: user.id, plan: entitlements!.legacy.tier });
          app.log.info(
            {
              userId: user.id,
              feature: mealPhotoFeature,
              balanceBefore: getEffectiveTokenBalance?.(user) ?? null,
            },
            "meal photo AI preflight passed",
          );
        }

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

        const chargedResult = shouldChargeAi
          ? await chargeAiUsageForResult!({
              prisma: prisma!,
              pricing: aiPricing!,
              user: {
                id: user.id,
                plan: user.plan,
                aiTokenBalance: user.aiTokenBalance ?? 0,
                aiTokenResetAt: user.aiTokenResetAt,
                aiTokenRenewalAt: user.aiTokenRenewalAt,
              },
              feature: mealPhotoFeature,
              result: {
                payload: result.payload,
                model: result.model ?? "gpt-4o-mini",
                requestId: result.requestId ?? null,
                usage: result.usage ?? {},
              },
              meta: { route: "meals/analyze-photo" },
              createHttpError,
            })
          : null;

        const normalized = normalizeAnalysis(chargedResult?.payload ?? result.payload);

        if (normalized.confidenceLabel === "low" || normalized.confidence < 0.45) {
          app.log.warn({ confidence: normalized.confidence }, "meal photo analysis fell back due to low confidence");
          return reply.status(200).send(buildFallbackAnalysis({
            locale: input.locale,
            payload: normalized,
            reason: "low_confidence",
          }));
        }

        return reply.status(200).send(normalized);
      } catch (error) {
        const typed = error as { code?: string; message?: string };
        if (error instanceof z.ZodError) {
          app.log.warn({ issues: error.issues }, "meal photo analysis response contract drift; using fallback");
          return reply.status(200).send(buildFallbackAnalysis({
            locale: input.locale,
            reason: "contract_drift",
          }));
        }
        if (typed.code === "AI_REQUEST_FAILED") {
          app.log.warn({ code: typed.code }, "meal photo analysis upstream failed; using fallback");
          return reply.status(200).send(buildFallbackAnalysis({ locale: input.locale, reason: "upstream" }));
        }
        if (typed.code === "AI_NOT_CONFIGURED") {
          app.log.warn({ code: typed.code }, "meal photo analysis AI not configured; using fallback");
          return reply.status(200).send(buildFallbackAnalysis({ locale: input.locale, reason: "upstream" }));
        }
        if (typed.message?.includes("Invalid image data URL")) {
          return reply.status(400).send({ error: "INVALID_IMAGE", kind: "validation" });
        }
        app.log.error({ err: error }, "meal photo analysis unexpected error; using fallback");
        return reply.status(200).send(buildFallbackAnalysis({ locale: input.locale, reason: "upstream" }));
      }
    }
  );
}
