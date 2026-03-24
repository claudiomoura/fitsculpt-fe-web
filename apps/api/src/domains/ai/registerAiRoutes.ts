import { Prisma } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { OpenAiResponse } from "../../ai/provider/openaiClient.js";
import type { AuthenticatedEntitlementsRequest } from "../../middleware/entitlements.js";
import { sendAiEndpointError } from "./mapAiEndpointError.js";
import { generateTrainingPlanV2 } from "../../ai/training-plan/trainingPlanGeneratorV2.js";

type RecipeWithIngredients = Prisma.RecipeGetPayload<{
  include: { ingredients: true };
}>;

export function registerAiRoutes(app: FastifyInstance, deps: Record<string, any>) {
  const {
    aiAccessGuard,
    aiStrengthDomainGuard,
    aiNutritionDomainGuard,
    requireUser,
    getUserEntitlements,
    toDateKey,
    env,
    prisma,
    getAiTokenPayload,
    getSecondsUntilNextUtcDay,
    logAuthCookieDebug,
    requireCompleteProfile,
    aiTrainingSchema,
    loadExerciseCatalogForAi,
    parseDateInput,
    buildCacheKey,
    buildTrainingTemplate,
    getEffectiveTokenBalance,
    assertSufficientAiTokenBalance,
    getEstimatedAiFeatureTokens,
    normalizeTrainingPlanDays,
    applyPersonalization,
    assertTrainingMatchesRequest,
    resolveTrainingPlanExerciseIds,
    saveTrainingPlan,
    storeAiContent,
    getCachedAiPayload,
    parseTrainingPlanPayload,
    saveCachedAiPayload,
    enforceAiQuota,
    buildTrainingPrompt,
    formatExerciseCatalogForPrompt,
    extractTopLevelJson,
    chargeAiUsage,
    aiPricing,
    callOpenAi,
    getUserTokenExpiryAt,
    extractExactProviderUsage,
    aiNutritionSchema,
    getSafeValidationIssues,
    normalizeNutritionPlanDays,
    logNutritionMealsPerDay,
    normalizeNutritionMealsPerDay,
    applyNutritionCatalogResolution,
    assertNutritionMatchesRequest,
    saveNutritionPlan,
    parseNutritionPlanPayload,
    applyRecipeScalingToPlan,
    buildNutritionTemplate,
    buildNutritionPrompt,
    chargeAiUsageForResult,
    createHttpError,
    aiGenerateTrainingSchema,
    buildDeterministicTrainingFallbackPlan,
    createOpenAiClient,
    trainingPlanJsonSchema,
    mapExperienceLevelToTrainingPlanLevel,
    buildRetryFeedbackFromContext,
    buildTwoMealSplitRetryInstruction,
    nutritionPlanJsonSchema,
    buildMealKcalGuidance,
    NUTRITION_MATH_TOLERANCES,
    validateNutritionMath,
    parseJsonFromText,
    parseLargestJsonFromText,
    parseTopLevelJsonFromText,
    AiParseError,
    aiTrainingPlanResponseSchema,
    aiNutritionPlanResponseSchema,
    resolveTrainingPlanWithDeterministicFallback,
    assertTrainingLevelConsistency,
    classifyAiGenerateError,
    findInvalidTrainingPlanExerciseIds,
    resolveTrainingPlanExerciseIdsWithCatalog,
    summarizeTrainingPlan,
    persistAiUsageLog,
    buildUsageTotals,
    aiTipSchema,
    buildTipTemplate,
    safeStoreAiContent,
    buildTipPrompt,
    resolveNutritionPlanRecipeReferences,
    normalizeNutritionPlanDaysWithLabels,
    applyNutritionPlanVarietyGuard,
    resolveNutritionPlanRecipeIds,
    contextualChatRequestSchema,
    contextualChatResponseSchema,
    buildContextualChatPrompt,
  } = deps;

  const aiQuotaRequestSchema = z.object({}).passthrough();
  const aiTrainingPlanRequestSchema = z.object(aiTrainingSchema.shape);
  const aiNutritionPlanGenerateRequestSchema = z.object(aiNutritionSchema.shape);
const aiTrainingPlanGenerateRequestSchema = z.object(
  aiGenerateTrainingSchema.shape,
);
  const aiDailyTipRequestSchema = z.object(aiTipSchema.shape);
  const aiContextualChatRequestSchema = z.object(contextualChatRequestSchema.shape);

  type AiTrainingPlanRequest = z.infer<typeof aiTrainingPlanRequestSchema>;
  type AiTrainingPlanGenerateRequest = z.infer<
    typeof aiTrainingPlanGenerateRequestSchema
  >;
  type AiDailyTipRequest = z.infer<typeof aiDailyTipRequestSchema>;
  type AiContextualChatRequest = z.infer<typeof aiContextualChatRequestSchema>;

  type AiUsageSummary = {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  const ZERO_AI_USAGE: AiUsageSummary = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  const toEurAmount = (costCents: number) =>
    Number((Math.max(0, costCents) / 100).toFixed(2));

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

  const readString = (value: unknown) =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : null;

  const readNumber = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  const resolveMinutesFromWorkoutLength = (value: string | null) => {
    if (value === "30m") return 30;
    if (value === "45m") return 45;
    if (value === "60m") return 60;
    return null;
  };

  const resolveMinutesFromSessionTime = (value: string | null) => {
    if (value === "short") return 35;
    if (value === "medium") return 50;
    if (value === "long") return 65;
    return null;
  };

  const normalizeConstraints = (value: unknown) => {
    if (typeof value === "string") {
      return value.trim();
    }
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .join("; ");
    }
    return "";
  };

app.get("/ai/quota", { preHandler: aiAccessGuard }, async (request, reply) => {
  try {
    aiQuotaRequestSchema.parse(request.query ?? {});
    const authRequest = request as AuthenticatedEntitlementsRequest;
    const user = authRequest.currentUser ?? (await requireUser(request));
    const entitlements =
      authRequest.currentEntitlements ?? getUserEntitlements(user);
    const dateKey = toDateKey();
    const limit = entitlements.modules.ai.enabled
      ? env.AI_DAILY_LIMIT_PRO
      : env.AI_DAILY_LIMIT_FREE;
    const usage = await prisma.aiUsage.findUnique({
      where: { userId_date: { userId: user.id, date: dateKey } },
    });
    const usedToday = usage?.count ?? 0;
    const remainingToday = limit > 0 ? Math.max(0, limit - usedToday) : 0;
    const aiTokenPayload = getAiTokenPayload(user, entitlements);
    return reply.status(200).send({
      subscriptionPlan: entitlements.legacy.tier,
      plan: entitlements.legacy.tier,
      dailyLimit: limit,
      usedToday,
      remainingToday,
      retryAfterSec: getSecondsUntilNextUtcDay(),
      aiTokenBalance: aiTokenPayload.aiTokenBalance,
      aiTokenRenewalAt: aiTokenPayload.aiTokenRenewalAt,
      entitlements,
    });
  } catch (error) {
    return sendAiEndpointError(reply, error);
  }
});

app.post(
  "/ai/training-plan",
  { preHandler: aiStrengthDomainGuard },
  async (request, reply) => {
    try {
      logAuthCookieDebug(request, "/ai/training-plan");
      const authRequest = request as AuthenticatedEntitlementsRequest;
      const user =
        authRequest.currentUser ??
        (await requireUser(request, { logContext: "/ai/training-plan" }));
      const entitlements =
        authRequest.currentEntitlements ?? getUserEntitlements(user);
      await requireCompleteProfile(user.id);
      const data: AiTrainingPlanRequest = aiTrainingPlanRequestSchema.parse(
        request.body,
      );
      const exerciseCatalog = await loadExerciseCatalogForAi();
      const expectedDays = Math.min(data.daysPerWeek, 7);
      const daysCount = Math.min(data.daysCount ?? 7, 14);
      const startDate = parseDateInput(data.startDate) ?? new Date();
      const cacheKey = buildCacheKey("training", data);
      const template = buildTrainingTemplate(data, exerciseCatalog);
      const effectiveTokens = getEffectiveTokenBalance(user);
      const aiMeta = getAiTokenPayload(user, entitlements);
      const shouldChargeAi = !entitlements.role.adminOverride;
      if (shouldChargeAi) {
        assertSufficientAiTokenBalance(
          user,
          getEstimatedAiFeatureTokens("training"),
        );
      }

      if (template) {
        const normalized = normalizeTrainingPlanDays(
          template,
          startDate,
          daysCount,
          expectedDays,
        );
        const personalized = applyPersonalization(normalized, {
          name: data.name,
        });
        assertTrainingMatchesRequest(personalized, expectedDays);
        const resolvedPlan = resolveTrainingPlanExerciseIds(
          personalized,
          exerciseCatalog,
        );
        await saveTrainingPlan(
          prisma,
          user.id,
          resolvedPlan,
          startDate,
          daysCount,
          data,
        );
        await storeAiContent(user.id, "training", "template", resolvedPlan);
        return reply.status(200).send({
          plan: resolvedPlan,
          mode: "FALLBACK",
          usage: ZERO_AI_USAGE,
          costCents: 0,
          costEur: 0,
          balanceBefore: aiMeta.aiTokenBalance,
          balanceAfter: aiMeta.aiTokenBalance,
          ...aiMeta,
        });
      }

      const cached = await getCachedAiPayload(cacheKey);
      if (cached) {
        try {
          const validated = parseTrainingPlanPayload(
            cached,
            startDate,
            daysCount,
            expectedDays,
          );
          assertTrainingMatchesRequest(validated, expectedDays);
          const personalized = applyPersonalization(validated, {
            name: data.name,
          });
          const resolvedPlan = resolveTrainingPlanExerciseIds(
            personalized,
            exerciseCatalog,
          );
          await saveTrainingPlan(
            prisma,
            user.id,
            resolvedPlan,
            startDate,
            daysCount,
            data,
          );
          await storeAiContent(user.id, "training", "cache", resolvedPlan);
          return reply.status(200).send({
            plan: resolvedPlan,
            mode: "FALLBACK",
            usage: ZERO_AI_USAGE,
            costCents: 0,
            costEur: 0,
            balanceBefore: aiMeta.aiTokenBalance,
            balanceAfter: aiMeta.aiTokenBalance,
            ...aiMeta,
          });
        } catch (error) {
          app.log.warn(
            { err: error, cacheKey },
            "cached training plan invalid, regenerating",
          );
        }
      }

      await enforceAiQuota({ id: user.id, plan: entitlements.legacy.tier });
      let payload: Record<string, unknown>;
      let aiTokenBalance: number | null = null;
      let aiResult: OpenAiResponse | null = null;
      let aiAttemptUsed: number | null = null;
      let debit:
        | {
            costCents: number;
            balanceBefore: number;
            balanceAfter: number;
            totalTokens: number;
            model: string;
            usage: {
              promptTokens: number;
              completionTokens: number;
              totalTokens: number;
            };
          }
        | undefined;

      const fetchTrainingPayload = async (attempt: number) => {
        const prompt = buildTrainingPrompt(
          data,
          attempt > 0,
          formatExerciseCatalogForPrompt(exerciseCatalog),
        );
        const result = await callOpenAi(prompt, attempt, extractTopLevelJson, {
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "training_plan",
              schema: trainingPlanJsonSchema as any,
              strict: true,
            },
          },
          model: "gpt-4o-mini",
          maxTokens: 9000,
          retryOnParseError: false,
        });
        payload = result.payload;
        aiResult = result;
        if (shouldChargeAi) {
          aiAttemptUsed = attempt;
        }
        return parseTrainingPlanPayload(
          payload,
          startDate,
          daysCount,
          expectedDays,
        );
      };

      let parsedPayload: z.infer<typeof aiTrainingPlanResponseSchema>;
      try {
        parsedPayload = await fetchTrainingPayload(0);
        assertTrainingMatchesRequest(parsedPayload, expectedDays);
      } catch (error) {
        const typed = error as { code?: string };
        if (typed.code === "AI_PARSE_ERROR") {
          app.log.warn(
            { err: error },
            "training plan invalid, retrying with strict prompt",
          );
          app.log.info(
            {
              userId: user.id,
              feature: "training",
              charged: false,
              failureReason: "parse_error",
              attempt: 0,
            },
            "ai charge skipped",
          );
          parsedPayload = await fetchTrainingPayload(1);
          assertTrainingMatchesRequest(parsedPayload, expectedDays);
        } else {
          throw error;
        }
      }

      const personalized = applyPersonalization(parsedPayload, {
        name: data.name,
      });
      const resolvedPlan = resolveTrainingPlanWithDeterministicFallback(
        personalized,
        exerciseCatalog,
        {
          daysPerWeek: data.daysPerWeek,
          level: data.level,
          goal: data.goal,
          equipment: data.equipment,
        },
        startDate,
        { userId: user.id, route: "/ai/training-plan" },
      );
      await saveCachedAiPayload(cacheKey, "training", resolvedPlan);
      await saveTrainingPlan(
        prisma,
        user.id,
        resolvedPlan,
        startDate,
        daysCount,
        data,
      );
      await storeAiContent(user.id, "training", "ai", resolvedPlan);
      if (shouldChargeAi && aiResult) {
        const balanceBefore = effectiveTokens;
        const charged = await chargeAiUsageForResult({
          prisma,
          pricing: aiPricing,
          user: {
            id: user.id,
            plan: user.plan,
            aiTokenBalance: user.aiTokenBalance ?? 0,
            aiTokenResetAt: user.aiTokenResetAt,
            aiTokenRenewalAt: user.aiTokenRenewalAt,
          },
          feature: "training",
          result: aiResult,
          meta: { attempt: aiAttemptUsed ?? 0 },
          createHttpError,
        });
        aiTokenBalance = charged.balance;
        debit =
          process.env.NODE_ENV === "production"
            ? undefined
            : {
                costCents: charged.costCents,
                balanceBefore,
                balanceAfter: charged.balance,
                totalTokens: charged.totalTokens,
                model: charged.model,
                usage: charged.usage,
              };
        app.log.info(
          {
            userId: user.id,
            feature: "training",
            balanceBefore,
            balanceAfter: charged.balance,
            charged: true,
            attempt: aiAttemptUsed ?? 0,
          },
          "ai charge complete",
        );
      } else if (shouldChargeAi) {
        app.log.info(
          {
            userId: user.id,
            feature: "training",
            charged: false,
            failureReason: "missing_ai_result",
          },
          "ai charge skipped",
        );
      }

      const aiResponse = aiResult as OpenAiResponse | null;
      const exactUsage = extractExactProviderUsage(aiResponse?.usage);
      const responseUsage = exactUsage ?? debit?.usage ?? ZERO_AI_USAGE;
      const responseCostCents = debit?.costCents ?? 0;
      const responseBalanceAfter =
        shouldChargeAi && typeof aiTokenBalance === "number"
          ? aiTokenBalance
          : aiMeta.aiTokenBalance;
      return reply.status(200).send({
        plan: resolvedPlan,
        mode: aiResponse ? "AI" : "FALLBACK",
        aiRequestId: aiResponse?.requestId ?? null,
        aiTokenBalance: responseBalanceAfter,
        aiTokenRenewalAt: shouldChargeAi
          ? getUserTokenExpiryAt(user)
          : aiMeta.aiTokenRenewalAt,
        usage: responseUsage,
        costCents: responseCostCents,
        costEur: toEurAmount(responseCostCents),
        balanceBefore: shouldChargeAi ? effectiveTokens : aiMeta.aiTokenBalance,
        balanceAfter: responseBalanceAfter,
        ...(shouldChargeAi ? { nextBalance: responseBalanceAfter } : {}),
        ...(debit ? { debit } : {}),
      });
    } catch (error) {
      return sendAiEndpointError(reply, error);
    }
  },
);

const nutritionPlanRouteCanonical = "/ai/nutrition-plan/generate";
const nutritionPlanRouteAlias = "/ai/nutrition-plan";

const nutritionPlanHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const nutritionRoutePath =
      request.routeOptions?.url ?? nutritionPlanRouteCanonical;
    logAuthCookieDebug(request, nutritionRoutePath);
      const authRequest = request as AuthenticatedEntitlementsRequest;
      const user =
        authRequest.currentUser ??
        (await requireUser(request, {
          logContext: nutritionRoutePath,
        }));
      const entitlements =
        authRequest.currentEntitlements ?? getUserEntitlements(user);
      await requireCompleteProfile(user.id);
      const nutritionInput = aiNutritionPlanGenerateRequestSchema.safeParse(
        request.body,
      );
      if (!nutritionInput.success) {
        const issues = getSafeValidationIssues(nutritionInput.error);
        app.log.warn(
          { route: nutritionRoutePath, issues },
          "nutrition request validation failed",
        );
        return reply
          .status(400)
          .send({ error: "INVALID_INPUT", kind: "validation", issues });
      }
      const data = nutritionInput.data;
      const expectedMealsPerDay = Math.min(data.mealsPerDay, 6);
      const daysCount = Math.min(data.daysCount ?? 7, 14);
      const startDate = parseDateInput(data.startDate) ?? new Date();
      app.log.info(
        { userId: user.id, mealsPerDay: expectedMealsPerDay, daysCount },
        "nutrition plan request mealsPerDay",
      );
      await prisma.aiPromptCache.deleteMany({
        where: {
          type: "nutrition",
          key: { startsWith: "nutrition:" },
          NOT: { key: { startsWith: "nutrition:v2:" } },
        },
      });
      const cacheKey = buildCacheKey("nutrition:v2", data);
      const recipeQuery = data.preferredFoods?.split(",")[0]?.trim();
      const recipeWhere = recipeQuery
        ? {
            name: { contains: recipeQuery, mode: Prisma.QueryMode.insensitive },
          }
        : undefined;
      const recipes = await prisma.recipe.findMany({
        ...(recipeWhere ? { where: recipeWhere } : {}),
        take: 100,
        orderBy: { name: "asc" },
        include: { ingredients: true },
      });
      const template = buildNutritionTemplate(data);
      const effectiveTokens = getEffectiveTokenBalance(user);
      const aiMeta = getAiTokenPayload(user, entitlements);
      const shouldChargeAi = !entitlements.role.adminOverride;
      if (shouldChargeAi) {
        assertSufficientAiTokenBalance(
          user,
          getEstimatedAiFeatureTokens("nutrition"),
        );
      }

      if (template) {
        const normalized = normalizeNutritionPlanDays(
          template,
          startDate,
          daysCount,
        );
        logNutritionMealsPerDay(
          normalized,
          expectedMealsPerDay,
          "before_normalize",
        );
        const normalizedMeals = normalizeNutritionMealsPerDay(
          normalized,
          expectedMealsPerDay,
        );
        const resolvedCatalogMeals = applyNutritionCatalogResolution(
          normalizedMeals,
          recipes.map((recipe: RecipeWithIngredients) => ({
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            steps: recipe.steps,
            ingredients: recipe.ingredients.map(
              (ingredient: { name: string; grams: number }) => ({
                name: ingredient.name,
                grams: ingredient.grams,
              }),
            ),
          })),
        );
        logNutritionMealsPerDay(
          resolvedCatalogMeals,
          expectedMealsPerDay,
          "after_normalize",
        );
        const personalized = applyPersonalization(resolvedCatalogMeals, {
          name: data.name,
        });
        assertNutritionMatchesRequest(
          personalized,
          expectedMealsPerDay,
          daysCount,
        );
        const savedPlan = await saveNutritionPlan(
          prisma,
          user.id,
          personalized,
          startDate,
          daysCount,
        );
        await storeAiContent(user.id, "nutrition", "template", personalized);
        return reply.status(200).send({
          planId: savedPlan.id,
          plan: personalized,
          mode: "FALLBACK",
          usage: ZERO_AI_USAGE,
          costCents: 0,
          costEur: 0,
          balanceBefore: aiMeta.aiTokenBalance,
          balanceAfter: aiMeta.aiTokenBalance,
          ...aiMeta,
        });
      }

      const cached = await getCachedAiPayload(cacheKey);
      if (cached) {
        try {
          const validated = parseNutritionPlanPayload(
            cached,
            startDate,
            daysCount,
          );
          assertNutritionMatchesRequest(
            validated,
            expectedMealsPerDay,
            daysCount,
          );
          const scaled = applyRecipeScalingToPlan(
            validated,
            recipes.map((recipe: RecipeWithIngredients) => ({
              id: recipe.id,
              name: recipe.name,
              description: recipe.description,
              calories: recipe.calories,
              protein: recipe.protein,
              carbs: recipe.carbs,
              fat: recipe.fat,
              steps: recipe.steps,
              ingredients: recipe.ingredients.map(
                (ingredient: { name: string; grams: number }) => ({
                  name: ingredient.name,
                  grams: ingredient.grams,
                }),
              ),
            })),
          );
          logNutritionMealsPerDay(
            scaled,
            expectedMealsPerDay,
            "before_normalize",
          );
          const normalizedMeals = normalizeNutritionMealsPerDay(
            scaled,
            expectedMealsPerDay,
          );
          const resolvedCatalogMeals = applyNutritionCatalogResolution(
            normalizedMeals,
            recipes.map((recipe: RecipeWithIngredients) => ({
              id: recipe.id,
              name: recipe.name,
              description: recipe.description,
              calories: recipe.calories,
              protein: recipe.protein,
              carbs: recipe.carbs,
              fat: recipe.fat,
              steps: recipe.steps,
              ingredients: recipe.ingredients.map(
                (ingredient: { name: string; grams: number }) => ({
                  name: ingredient.name,
                  grams: ingredient.grams,
                }),
              ),
            })),
          );
          logNutritionMealsPerDay(
            resolvedCatalogMeals,
            expectedMealsPerDay,
            "after_normalize",
          );
          assertNutritionMatchesRequest(
            resolvedCatalogMeals,
            expectedMealsPerDay,
            daysCount,
          );
          const personalized = applyPersonalization(resolvedCatalogMeals, {
            name: data.name,
          });
          const savedPlan = await saveNutritionPlan(
            prisma,
            user.id,
            personalized,
            startDate,
            daysCount,
          );
          await storeAiContent(user.id, "nutrition", "cache", personalized);
          return reply.status(200).send({
            planId: savedPlan.id,
            plan: personalized,
            mode: "FALLBACK",
            usage: ZERO_AI_USAGE,
            costCents: 0,
            costEur: 0,
            balanceBefore: aiMeta.aiTokenBalance,
            balanceAfter: aiMeta.aiTokenBalance,
            ...aiMeta,
          });
        } catch (error) {
          app.log.warn(
            { err: error, cacheKey },
            "cached nutrition plan invalid, regenerating",
          );
        }
      }

      await enforceAiQuota({ id: user.id, plan: entitlements.legacy.tier });
      let payload: Record<string, unknown>;
      let aiTokenBalance: number | null = null;
      let aiResult: OpenAiResponse | null = null;
      let aiAttemptUsed: number | null = null;
      let debit:
        | {
            costCents: number;
            balanceBefore: number;
            balanceAfter: number;
            totalTokens: number;
            model: string;
            usage: {
              promptTokens: number;
              completionTokens: number;
              totalTokens: number;
            };
          }
        | undefined;
      const fetchNutritionPayload = async (attempt: number) => {
        const promptAttempt = buildNutritionPrompt(
          data,
          recipes.map((recipe: RecipeWithIngredients) => ({
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            ingredients: recipe.ingredients.map(
              (ingredient: { name: string; grams: number }) => ({
                name: ingredient.name,
                grams: ingredient.grams,
              }),
            ),
            steps: recipe.steps,
          })),
          attempt > 0,
        );
        const result = await callOpenAi(
          promptAttempt,
          attempt,
          extractTopLevelJson,
          {
            responseFormat: {
              type: "json_schema",
              json_schema: {
                name: "nutrition_plan",
                schema: nutritionPlanJsonSchema as any,
                strict: true,
              },
            },
            model: "gpt-4o-mini",
            maxTokens: 1200,
            retryOnParseError: false,
          },
        );
        payload = result.payload;
        aiResult = result;
        if (shouldChargeAi) {
          aiAttemptUsed = attempt;
        }
        return parseNutritionPlanPayload(payload, startDate, daysCount);
      };

      let parsedPayload: z.infer<typeof aiNutritionPlanResponseSchema>;
      try {
        parsedPayload = await fetchNutritionPayload(0);
        assertNutritionMatchesRequest(
          parsedPayload,
          expectedMealsPerDay,
          daysCount,
        );
      } catch (error) {
        const typed = error as { code?: string };
        if (typed.code === "AI_PARSE_ERROR") {
          app.log.warn(
            { err: error },
            "nutrition plan invalid, retrying with strict prompt",
          );
          app.log.info(
            {
              userId: user.id,
              feature: "nutrition",
              charged: false,
              failureReason: "parse_error",
              attempt: 0,
            },
            "ai charge skipped",
          );
          parsedPayload = await fetchNutritionPayload(1);
          assertNutritionMatchesRequest(
            parsedPayload,
            expectedMealsPerDay,
            daysCount,
          );
        } else {
          throw error;
        }
      }
      const scaledPayload = applyRecipeScalingToPlan(
        parsedPayload,
        recipes.map((recipe: RecipeWithIngredients) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          steps: recipe.steps,
          ingredients: recipe.ingredients.map(
            (ingredient: { name: string; grams: number }) => ({
              name: ingredient.name,
              grams: ingredient.grams,
            }),
          ),
        })),
      );
      logNutritionMealsPerDay(
        scaledPayload,
        expectedMealsPerDay,
        "before_normalize",
      );
      const normalizedMeals = normalizeNutritionMealsPerDay(
        scaledPayload,
        expectedMealsPerDay,
      );
      const resolvedCatalogMeals = applyNutritionCatalogResolution(
        normalizedMeals,
        recipes.map((recipe: RecipeWithIngredients) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          steps: recipe.steps,
          ingredients: recipe.ingredients.map(
            (ingredient: { name: string; grams: number }) => ({
              name: ingredient.name,
              grams: ingredient.grams,
            }),
          ),
        })),
      );
      logNutritionMealsPerDay(
        resolvedCatalogMeals,
        expectedMealsPerDay,
        "after_normalize",
      );
      assertNutritionMatchesRequest(
        resolvedCatalogMeals,
        expectedMealsPerDay,
        daysCount,
      );
      const balanceBefore = effectiveTokens;
      const savedPlan =
        shouldChargeAi && aiResult
          ? await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              const persistedPlan = await saveNutritionPlan(
                tx,
                user.id,
                resolvedCatalogMeals,
                startDate,
                daysCount,
              );
              const charged = await chargeAiUsageForResult({
                prisma: tx,
                pricing: aiPricing,
                user: {
                  id: user.id,
                  plan: user.plan,
                  aiTokenBalance: user.aiTokenBalance ?? 0,
                  aiTokenResetAt: user.aiTokenResetAt,
                  aiTokenRenewalAt: user.aiTokenRenewalAt,
                },
                feature: "nutrition",
                result: aiResult!,
                meta: { attempt: aiAttemptUsed ?? 0 },
                createHttpError,
              });
              return { persistedPlan, charged };
            })
          : {
              persistedPlan: await saveNutritionPlan(
                prisma,
                user.id,
                resolvedCatalogMeals,
                startDate,
                daysCount,
              ),
              charged: null,
            };
      await saveCachedAiPayload(cacheKey, "nutrition", resolvedCatalogMeals);
      const personalized = applyPersonalization(resolvedCatalogMeals, {
        name: data.name,
      });
      await storeAiContent(user.id, "nutrition", "ai", personalized);
      if (shouldChargeAi && savedPlan.charged) {
        aiTokenBalance = savedPlan.charged.balance;
        debit =
          process.env.NODE_ENV === "production"
            ? undefined
            : {
                costCents: savedPlan.charged.costCents,
                balanceBefore,
                balanceAfter: savedPlan.charged.balance,
                totalTokens: savedPlan.charged.totalTokens,
                model: savedPlan.charged.model,
                usage: savedPlan.charged.usage,
              };
        app.log.info(
          {
            userId: user.id,
            feature: "nutrition",
            balanceBefore,
            balanceAfter: savedPlan.charged.balance,
            charged: true,
            attempt: aiAttemptUsed ?? 0,
          },
          "ai charge complete",
        );
      } else if (shouldChargeAi) {
        app.log.info(
          {
            userId: user.id,
            feature: "nutrition",
            charged: false,
            failureReason: "missing_ai_result",
          },
          "ai charge skipped",
        );
      }
      const aiResponse = aiResult as OpenAiResponse | null;
      const exactUsage = extractExactProviderUsage(aiResponse?.usage);
      const responseUsage = exactUsage ?? debit?.usage ?? ZERO_AI_USAGE;
      const responseCostCents = savedPlan.charged?.costCents ?? 0;
      const responseBalanceAfter =
        shouldChargeAi && savedPlan.charged
          ? savedPlan.charged.balance
          : aiMeta.aiTokenBalance;
      return reply.status(200).send({
        planId: savedPlan.persistedPlan.id,
        plan: personalized,
        mode: aiResponse ? "AI" : "FALLBACK",
        aiRequestId: aiResponse?.requestId ?? null,
        aiTokenBalance: responseBalanceAfter,
        aiTokenRenewalAt: shouldChargeAi
          ? getUserTokenExpiryAt(user)
          : aiMeta.aiTokenRenewalAt,
        usage: responseUsage,
        costCents: responseCostCents,
        costEur: toEurAmount(responseCostCents),
        balanceBefore: shouldChargeAi ? balanceBefore : aiMeta.aiTokenBalance,
        balanceAfter: responseBalanceAfter,
        ...(shouldChargeAi ? { nextBalance: responseBalanceAfter } : {}),
        ...(debit ? { debit } : {}),
      });
  } catch (error) {
    return sendAiEndpointError(reply, error);
  }
};

app.post(
  "/ai/nutrition-plan/generate",
  { preHandler: aiNutritionDomainGuard },
  nutritionPlanHandler,
);

app.post(
  "/ai/nutrition-plan",
  { preHandler: aiNutritionDomainGuard },
  nutritionPlanHandler,
);

app.post(
  "/ai/training-plan/generate",
  { preHandler: aiStrengthDomainGuard },
  async (request, reply) => {
    try {
      const authRequest = request as AuthenticatedEntitlementsRequest;
      const user =
        authRequest.currentUser ??
        (await requireUser(request, {
          logContext: "/ai/training-plan/generate",
        }));
      const entitlements =
        authRequest.currentEntitlements ?? getUserEntitlements(user);

      const shouldChargeAi = !entitlements.role.adminOverride;
      const aiMeta = getAiTokenPayload(user, entitlements);
      if (shouldChargeAi) {
        assertSufficientAiTokenBalance(
          user,
          getEstimatedAiFeatureTokens("training-generate"),
        );
      }

      const payload: AiTrainingPlanGenerateRequest =
        aiTrainingPlanGenerateRequestSchema.parse(request.body);
      if (payload.userId && payload.userId !== user.id) {
        throw createHttpError(400, "INVALID_INPUT", {
          message: "userId must match authenticated user",
        });
      }

      const profileRow = await prisma.userProfile.findUnique({
        where: { userId: user.id },
        select: { profile: true },
      });
      const profileData = isRecord(profileRow?.profile)
        ? profileRow.profile
        : {};
      const profileTrainingPreferences = isRecord(
        profileData.trainingPreferences,
      )
        ? profileData.trainingPreferences
        : {};

      const profileSexRaw = readString(profileData.sex);
      const profileSex =
        profileSexRaw === "male" || profileSexRaw === "female"
          ? profileSexRaw
          : null;
      const profileFocusRaw = readString(profileTrainingPreferences.focus);
      const profileFocus =
        profileFocusRaw === "full" ||
        profileFocusRaw === "upperLower" ||
        profileFocusRaw === "ppl"
          ? profileFocusRaw
          : null;
      const profileEquipmentRaw = readString(profileTrainingPreferences.equipment);
      const profileEquipment =
        profileEquipmentRaw === "gym" || profileEquipmentRaw === "home"
          ? profileEquipmentRaw
          : null;
      const profileSessionTimeRaw = readString(
        profileTrainingPreferences.sessionTime,
      );
      const profileSessionTime =
        profileSessionTimeRaw === "short" ||
        profileSessionTimeRaw === "medium" ||
        profileSessionTimeRaw === "long"
          ? profileSessionTimeRaw
          : null;
      const profileWorkoutLengthRaw = readString(
        profileTrainingPreferences.workoutLength,
      );
      const profileWorkoutLength =
        profileWorkoutLengthRaw === "30m" ||
        profileWorkoutLengthRaw === "45m" ||
        profileWorkoutLengthRaw === "60m" ||
        profileWorkoutLengthRaw === "flexible"
          ? profileWorkoutLengthRaw
          : null;
      const profileTimerRaw = readString(profileTrainingPreferences.timerSound);
      const profileTimerSound =
        profileTimerRaw === "ding" || profileTimerRaw === "repsToDo"
          ? profileTimerRaw
          : null;

      const resolvedAge = payload.age ?? readNumber(profileData.age);
      const resolvedSex = payload.sex ?? profileSex;
      const resolvedFocus = payload.focus ?? profileFocus;
      const resolvedEquipment = payload.equipment ?? profileEquipment;
      const resolvedSessionTime = payload.sessionTime ?? profileSessionTime;
      const resolvedWorkoutLength =
        payload.workoutLength ?? profileWorkoutLength ?? undefined;
      const resolvedTimerSound = payload.timerSound ?? profileTimerSound ?? undefined;
      const resolvedTimeAvailableMinutes =
        payload.timeAvailableMinutes ??
        readNumber(profileData.timeAvailableMinutes) ??
        resolveMinutesFromWorkoutLength(resolvedWorkoutLength ?? null) ??
        resolveMinutesFromSessionTime(resolvedSessionTime ?? null);
      const combinedRestrictions = [
        normalizeConstraints(payload.constraints),
        readString(payload.restrictions),
        readString(profileData.notes),
      ]
        .filter(Boolean)
        .join(" | ");
      const resolvedInjuries =
        readString(payload.injuries) ?? readString(profileData.injuries) ?? undefined;

      const missingContext: string[] = [];
      if (resolvedAge === null) missingContext.push("age");
      if (!resolvedSex) missingContext.push("sex");
      if (!resolvedFocus) missingContext.push("focus");
      if (!resolvedEquipment) missingContext.push("equipment");
      if (!resolvedSessionTime) missingContext.push("sessionTime");
      if (resolvedTimeAvailableMinutes === null) {
        missingContext.push("timeAvailableMinutes");
      }
      if (missingContext.length > 0) {
        throw createHttpError(409, "PROFILE_INCOMPLETE", {
          message:
            "Missing required context for training generation. Complete profile or send fields in request.",
          missingContext,
        });
      }

      const exerciseCatalog = await loadExerciseCatalogForAi();
      const trainingRequest = {
        goal: payload.goal,
        daysPerWeek: Math.min(payload.daysPerWeek, 7),
        level: mapExperienceLevelToTrainingPlanLevel(payload.experienceLevel),
        experienceLevel: payload.experienceLevel,
        focus: resolvedFocus,
        equipment: resolvedEquipment,
      };
      const trainingPromptInput: z.infer<typeof aiTrainingSchema> = {
        name: payload.name ?? readString(profileData.name) ?? undefined,
        age: resolvedAge,
        sex: resolvedSex,
        level: trainingRequest.level,
        goal: trainingRequest.goal,
        equipment: trainingRequest.equipment,
        daysPerWeek: trainingRequest.daysPerWeek,
        daysCount: payload.daysCount ?? payload.daysPerWeek,
        startDate: payload.startDate,
        sessionTime: resolvedSessionTime,
        focus: trainingRequest.focus,
        timeAvailableMinutes: resolvedTimeAvailableMinutes,
        includeCardio:
          payload.includeCardio ??
          (typeof profileTrainingPreferences.includeCardio === "boolean"
            ? profileTrainingPreferences.includeCardio
            : undefined),
        includeMobilityWarmups:
          payload.includeMobilityWarmups ??
          (typeof profileTrainingPreferences.includeMobilityWarmups === "boolean"
            ? profileTrainingPreferences.includeMobilityWarmups
            : undefined),
        workoutLength: resolvedWorkoutLength,
        timerSound: resolvedTimerSound,
        injuries: resolvedInjuries,
        restrictions: combinedRestrictions || resolvedInjuries,
        goals:
          payload.goals ??
          (Array.isArray(profileData.goals)
            ? profileData.goals.filter(
                (item: unknown): item is
                  | "buildStrength"
                  | "loseFat"
                  | "betterHealth"
                  | "moreEnergy"
                  | "tonedMuscles" =>
                  item === "buildStrength" ||
                  item === "loseFat" ||
                  item === "betterHealth" ||
                  item === "moreEnergy" ||
                  item === "tonedMuscles",
              )
            : undefined),
      };
      const startDate = parseDateInput(trainingPromptInput.startDate) ?? new Date();
      const expectedDays = Math.min(payload.daysPerWeek, 7);

      const trainingInput = {
        ...trainingRequest,
        daysPerWeek: expectedDays,
        daysCount: trainingPromptInput.daysCount ?? expectedDays,
      };
      const trainingCacheFingerprint = {
        userId: user.id,
        goal: trainingRequest.goal,
        level: trainingRequest.level,
        experienceLevel: trainingRequest.experienceLevel,
        daysPerWeek: trainingInput.daysPerWeek,
        daysCount: trainingInput.daysCount,
        age: trainingPromptInput.age,
        sex: trainingPromptInput.sex,
        focus: trainingPromptInput.focus,
        equipment: trainingPromptInput.equipment,
        sessionTime: trainingPromptInput.sessionTime,
        timeAvailableMinutes: trainingPromptInput.timeAvailableMinutes,
        restrictions: trainingPromptInput.restrictions ?? "",
      };
      const requestIdCacheKey = payload.aiRequestId
        ? buildCacheKey("training-generate:request:v1", {
            userId: user.id,
            aiRequestId: payload.aiRequestId,
          })
        : null;
      const fingerprintCacheKey = buildCacheKey(
        "training-generate:v1",
        trainingCacheFingerprint,
      );
      const cacheKeys = requestIdCacheKey
        ? [requestIdCacheKey, fingerprintCacheKey]
        : [fingerprintCacheKey];

      for (const key of cacheKeys) {
        const cached = await getCachedAiPayload(key);
        if (!cached || !isRecord(cached)) continue;
        const cachedPlanPayload = isRecord(cached.plan)
          ? cached.plan
          : cached;
        try {
          const parsedCachedPlan = parseTrainingPlanPayload(
            cachedPlanPayload,
            startDate,
            trainingInput.daysCount ?? expectedDays,
            expectedDays,
          );
          assertTrainingMatchesRequest(parsedCachedPlan, expectedDays);
          assertTrainingLevelConsistency(parsedCachedPlan, payload.experienceLevel);
          const resolvedCachedPlan = resolveTrainingPlanWithDeterministicFallback(
            parsedCachedPlan,
            exerciseCatalog,
            {
              daysPerWeek: trainingInput.daysPerWeek,
              level: trainingInput.level,
              goal: trainingInput.goal,
              equipment: trainingInput.equipment,
            },
            startDate,
            { userId: user.id, route: "/ai/training-plan/generate" },
          );
          const summary =
            isRecord(cached.summary) || Array.isArray(cached.summary)
              ? cached.summary
              : summarizeTrainingPlan(resolvedCachedPlan);
          return reply.status(200).send({
            planId: typeof cached.planId === "string" ? cached.planId : undefined,
            summary,
            plan: resolvedCachedPlan,
            mode: "CACHE",
            aiRequestId:
              typeof cached.aiRequestId === "string"
                ? cached.aiRequestId
                : payload.aiRequestId ?? null,
            aiTokenBalance: aiMeta.aiTokenBalance,
            aiTokenRenewalAt: aiMeta.aiTokenRenewalAt,
            usage: ZERO_AI_USAGE,
            costCents: 0,
            costEur: 0,
            balanceBefore: aiMeta.aiTokenBalance,
            balanceAfter: aiMeta.aiTokenBalance,
          });
        } catch (error) {
          app.log.warn(
            { err: error, key },
            "cached training-generate payload invalid, regenerating",
          );
        }
      }

      let parsedPlan: z.infer<typeof aiTrainingPlanResponseSchema> | null =
        null;
      let aiResult: OpenAiResponse | null = null;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const prompt = buildTrainingPrompt(
            trainingPromptInput,
            attempt > 0,
            formatExerciseCatalogForPrompt(exerciseCatalog),
          );

          const result = await callOpenAi(
            prompt,
            attempt,
            extractTopLevelJson,
            {
              responseFormat: {
                type: "json_schema",
                json_schema: {
                  name: "training_plan",
                  schema: trainingPlanJsonSchema as any,
                  strict: true,
                },
              },
              model: "gpt-4o-mini",
              maxTokens: 1800,
              retryOnParseError: false,
            },
          );

          const candidate = parseTrainingPlanPayload(
            result.payload,
            startDate,
            trainingInput.daysCount ?? expectedDays,
            expectedDays,
          );

          assertTrainingMatchesRequest(candidate, expectedDays);
          assertTrainingLevelConsistency(candidate, payload.experienceLevel);

          parsedPlan = candidate;
          aiResult = result;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!parsedPlan) {
        parsedPlan = buildDeterministicTrainingFallbackPlan(
          {
            daysPerWeek: trainingInput.daysPerWeek,
            level: trainingInput.level,
            goal: trainingInput.goal,
            startDate,
            equipment: trainingInput.equipment,
          },
          exerciseCatalog,
        );
      }

      const resolvedPlan = resolveTrainingPlanWithDeterministicFallback(
        parsedPlan,
        exerciseCatalog,
        {
          daysPerWeek: trainingInput.daysPerWeek,
          level: trainingInput.level,
          goal: trainingInput.goal,
          equipment: trainingInput.equipment,
        },
        startDate,
        { userId: user.id, route: "/ai/training-plan/generate" },
      );

      const savedPlan =
        aiResult && shouldChargeAi
          ? await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              const persistedPlan = await saveTrainingPlan(
                tx,
                user.id,
                resolvedPlan,
                startDate,
                trainingInput.daysCount ?? expectedDays,
                trainingInput,
              );
              const charged = await chargeAiUsageForResult({
                prisma: tx,
                pricing: aiPricing,
                user: {
                  id: user.id,
                  plan: user.plan,
                  aiTokenBalance: user.aiTokenBalance ?? 0,
                  aiTokenResetAt: user.aiTokenResetAt,
                  aiTokenRenewalAt: user.aiTokenRenewalAt,
                },
                feature: "training-generate",
                result: aiResult,
                createHttpError,
              });
              return { persistedPlan, charged };
            })
          : {
              persistedPlan: await saveTrainingPlan(
                prisma,
                user.id,
                resolvedPlan,
                startDate,
                trainingInput.daysCount ?? expectedDays,
                trainingInput,
              ),
              charged: null,
            };
      const summary = summarizeTrainingPlan(resolvedPlan);
      try {
        const cachePayload: Record<string, unknown> = {
          plan: resolvedPlan,
          summary,
          planId: savedPlan.persistedPlan.id,
          mode: aiResult ? "AI" : "FALLBACK",
          aiRequestId: aiResult?.requestId ?? payload.aiRequestId ?? null,
        };
        await Promise.all(
          cacheKeys.map((key) => saveCachedAiPayload(key, "training", cachePayload)),
        );
      } catch (error) {
        app.log.warn({ err: error, cacheKeys }, "training-generate cache save failed");
      }

      if (aiResult && !shouldChargeAi) {
        await persistAiUsageLog({
          prisma,
          userId: user.id,
          feature: "training-generate",
          provider: "openai",
          model: aiResult.model ?? "unknown",
          requestId: aiResult.requestId,
          usage: aiResult.usage,
          totals: buildUsageTotals(aiResult.usage),
          mode: "AI",
        });
      }

      if (!aiResult) {
        const fallbackCause =
          (lastError as { code?: string; message?: string } | null)?.code ??
          (lastError as { message?: string } | null)?.message ??
          "AI_UNAVAILABLE";
        await persistAiUsageLog({
          prisma,
          userId: user.id,
          feature: "training-generate",
          provider: "openai",
          model: "fallback",
          totals: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          mode: "FALLBACK",
          fallbackReason: fallbackCause,
        });
      }

      const isFallback = !aiResult;
      const exactUsage = extractExactProviderUsage(aiResult?.usage);
      const responseUsage = exactUsage ?? savedPlan.charged?.usage ?? ZERO_AI_USAGE;
      const responseBalance = shouldChargeAi
        ? savedPlan.charged?.balance ?? aiMeta.aiTokenBalance
        : aiMeta.aiTokenBalance;
      const responseCostCents = savedPlan.charged?.costCents ?? 0;
      const responseRenewalAt = shouldChargeAi
        ? getUserTokenExpiryAt(user)
        : aiMeta.aiTokenRenewalAt;
      const balanceBefore = shouldChargeAi
        ? getEffectiveTokenBalance(user)
        : aiMeta.aiTokenBalance;
      return reply.status(200).send({
        planId: savedPlan.persistedPlan.id,
        summary,
        plan: resolvedPlan,
        mode: isFallback ? "FALLBACK" : "AI",
        aiRequestId: aiResult?.requestId ?? null,
        aiTokenBalance: responseBalance,
        aiTokenRenewalAt: responseRenewalAt,
        usage: responseUsage,
        costCents: responseCostCents,
        costEur: toEurAmount(responseCostCents),
        balanceBefore,
        balanceAfter: responseBalance,
      });
    } catch (error) {
      const classified = classifyAiGenerateError(error);
      const logger =
        classified.errorKind === "internal_error"
          ? app.log.error.bind(app.log)
          : app.log.warn.bind(app.log);
      const shouldLogRawError =
        classified.errorKind !== "db_conflict" &&
        typeof classified.prismaCode !== "string";

      logger(
        {
          ...(shouldLogRawError ? { err: error } : {}),
          reqId: request.id,
          route: "/ai/training-plan/generate",
          error_kind: classified.errorKind,
          ...(typeof classified.upstreamStatus === "number"
            ? { upstream_status: classified.upstreamStatus }
            : {}),
          ...(typeof classified.prismaCode === "string"
            ? { prisma_code: classified.prismaCode }
            : {}),
          ...(typeof classified.prismaModelName === "string"
            ? { prisma_model: classified.prismaModelName }
            : {}),
          ...(typeof classified.prismaColumn === "string"
            ? { prisma_column: classified.prismaColumn }
            : {}),
          ...(Array.isArray(classified.target)
            ? { target: classified.target }
            : {}),
        },
        "training plan generation failed",
      );

      return reply
        .status(classified.statusCode)
        .send({
          error: classified.error,
          kind:
            classified.errorKind === "validation_error"
              ? "validation"
              : classified.errorKind === "upstream_error"
                ? "upstream"
                : "internal",
        });
    }
  },
);
app.post(
  "/ai/chat/contextual",
  { preHandler: aiAccessGuard },
  async (request, reply) => {
    try {
      logAuthCookieDebug(request, "/ai/chat/contextual");
      const authRequest = request as AuthenticatedEntitlementsRequest;
      const user =
        authRequest.currentUser ??
        (await requireUser(request, { logContext: "/ai/chat/contextual" }));
      const entitlements =
        authRequest.currentEntitlements ?? getUserEntitlements(user);
      const input: AiContextualChatRequest = aiContextualChatRequestSchema.parse(
        request.body,
      );
      const shouldChargeAi = !entitlements.role.adminOverride;
      const aiMeta = getAiTokenPayload(user, entitlements);

      if (shouldChargeAi) {
        assertSufficientAiTokenBalance(
          user,
          getEstimatedAiFeatureTokens("tip"),
        );
      }

      await enforceAiQuota({ id: user.id, plan: entitlements.legacy.tier });

      const [profileRow, activeTrainingPlan, activeNutritionPlan] =
        await Promise.all([
          prisma.userProfile.findUnique({
            where: { userId: user.id },
            select: { profile: true },
          }),
          prisma.trainingPlan.findFirst({
            where: { userId: user.id },
            orderBy: { startDate: "desc" },
            select: { title: true, goal: true, daysPerWeek: true },
          }),
          prisma.nutritionPlan.findFirst({
            where: { userId: user.id },
            orderBy: { startDate: "desc" },
            select: { title: true, dailyCalories: true },
          }),
        ]);

      const profileData =
        profileRow &&
        typeof profileRow.profile === "object" &&
        profileRow.profile !== null
          ? (profileRow.profile as Record<string, unknown>)
          : {};

      const prompt = buildContextualChatPrompt(input, {
        user: {
          name: user.name,
          plan: user.plan,
        },
        profile: {
          goal:
            typeof profileData.goal === "string" ? profileData.goal : undefined,
          activity:
            typeof profileData.activity === "string"
              ? profileData.activity
              : undefined,
          level:
            typeof profileData.level === "string"
              ? profileData.level
              : undefined,
        },
        activeTrainingPlan,
        activeNutritionPlan,
      });

      const aiResult = await callOpenAi(prompt, 0, extractTopLevelJson, {
        model: "gpt-4o-mini",
        maxTokens: 700,
        responseFormat: {
          type: "json_object",
        },
      });

      const responsePayload = contextualChatResponseSchema.safeParse(aiResult.payload);
      if (!responsePayload.success) {
        throw createHttpError(502, "AI_REQUEST_FAILED", {
          kind: "upstream",
          reason: "contextual_chat_invalid_payload",
        });
      }

      const balanceBefore = aiMeta.aiTokenBalance;
      let aiTokenBalance: number | null = null;
      let chargedCostCents = 0;
      let chargedUsage: AiUsageSummary | undefined;
      if (shouldChargeAi) {
        const charged = await chargeAiUsageForResult({
          prisma,
          pricing: aiPricing,
          user: {
            id: user.id,
            plan: user.plan,
            aiTokenBalance: user.aiTokenBalance ?? 0,
            aiTokenResetAt: user.aiTokenResetAt,
            aiTokenRenewalAt: user.aiTokenRenewalAt,
          },
          feature: "tip",
          result: aiResult,
          meta: { route: "contextual-chat" },
          createHttpError,
        });
        aiTokenBalance = charged.balance;
        chargedCostCents = charged.costCents;
        chargedUsage = charged.usage;
      }

      const exactUsage = extractExactProviderUsage(aiResult.usage);
      const responseUsage = exactUsage ?? chargedUsage ?? ZERO_AI_USAGE;
      const responseBalanceAfter =
        shouldChargeAi && typeof aiTokenBalance === "number"
          ? aiTokenBalance
          : aiMeta.aiTokenBalance;
      return reply.status(200).send({
        ...responsePayload.data,
        mode: "AI",
        aiRequestId: aiResult.requestId ?? null,
        aiTokenBalance: responseBalanceAfter,
        aiTokenRenewalAt: shouldChargeAi
          ? getUserTokenExpiryAt(user)
          : aiMeta.aiTokenRenewalAt,
        usage: responseUsage,
        costCents: chargedCostCents,
        costEur: toEurAmount(chargedCostCents),
        balanceBefore,
        balanceAfter: responseBalanceAfter,
      });
    } catch (error) {
      return sendAiEndpointError(reply, error);
    }
  },
);

app.post(
  "/ai/daily-tip",
  { preHandler: aiAccessGuard },
  async (request, reply) => {
    try {
      logAuthCookieDebug(request, "/ai/daily-tip");
      const authRequest = request as AuthenticatedEntitlementsRequest;
      const user =
        authRequest.currentUser ??
        (await requireUser(request, { logContext: "/ai/daily-tip" }));
      const entitlements =
        authRequest.currentEntitlements ?? getUserEntitlements(user);
      const data: AiDailyTipRequest = aiDailyTipRequestSchema.parse(
        request.body,
      );
      const cacheKey = buildCacheKey("tip", data);
      const template = buildTipTemplate();
      const effectiveTokens = getEffectiveTokenBalance(user);
      const aiMeta = getAiTokenPayload(user, entitlements);
      const shouldChargeAi = !entitlements.role.adminOverride;

      if (template) {
        const personalized = applyPersonalization(template, {
          name: data.name ?? "amigo",
        });
        await safeStoreAiContent(user.id, "tip", "template", personalized);
        return reply.status(200).send({
          tip: personalized,
          mode: "FALLBACK",
          usage: ZERO_AI_USAGE,
          costCents: 0,
          costEur: 0,
          balanceBefore: aiMeta.aiTokenBalance,
          balanceAfter: aiMeta.aiTokenBalance,
          ...aiMeta,
        });
      }

      const cached = await getCachedAiPayload(cacheKey);
      if (cached) {
        const personalized = applyPersonalization(cached, {
          name: data.name ?? "amigo",
        });
        await safeStoreAiContent(user.id, "tip", "cache", personalized);
        return reply.status(200).send({
          tip: personalized,
          mode: "FALLBACK",
          usage: ZERO_AI_USAGE,
          costCents: 0,
          costEur: 0,
          balanceBefore: aiMeta.aiTokenBalance,
          balanceAfter: aiMeta.aiTokenBalance,
          ...aiMeta,
        });
      }

      await enforceAiQuota({ id: user.id, plan: entitlements.legacy.tier });
      const prompt = buildTipPrompt(data);
      let payload: Record<string, unknown>;
      let aiTokenBalance: number | null = null;
      let chargedCostCents = 0;
      let chargedUsage: AiUsageSummary | undefined;
      let aiResult: OpenAiResponse | null = null;
      let debit:
        | {
            costCents: number;
            balanceBefore: number;
            balanceAfter: number;
            totalTokens: number;
            model: string;
            usage: {
              promptTokens: number;
              completionTokens: number;
              totalTokens: number;
            };
          }
        | undefined;
      if (shouldChargeAi) {
        const balanceBefore = effectiveTokens;
        app.log.info(
          { userId: user.id, feature: "tip", plan: user.plan, balanceBefore },
          "ai charge start",
        );
        const charged = await chargeAiUsage({
          prisma,
          pricing: aiPricing,
          user: {
            id: user.id,
            plan: user.plan,
            aiTokenBalance: user.aiTokenBalance ?? 0,
            aiTokenResetAt: user.aiTokenResetAt,
            aiTokenRenewalAt: user.aiTokenRenewalAt,
          },
          feature: "tip",
          execute: () => callOpenAi(prompt),
          createHttpError,
        });
        app.log.info(
          {
            userId: user.id,
            feature: "tip",
            costCents: charged.costCents,
            totalTokens: charged.totalTokens,
            balanceAfter: charged.balance,
          },
          "ai charge complete",
        );
        app.log.debug(
          {
            userId: user.id,
            feature: "tip",
            costCents: charged.costCents,
            balanceBefore,
            balanceAfter: charged.balance,
            model: charged.model,
            totalTokens: charged.totalTokens,
          },
          "ai charge details",
        );
        payload = charged.payload;
        aiTokenBalance = charged.balance;
        chargedCostCents = charged.costCents;
        chargedUsage = charged.usage;
        debit =
          process.env.NODE_ENV === "production"
            ? undefined
            : {
                costCents: charged.costCents,
                balanceBefore,
                balanceAfter: charged.balance,
                totalTokens: charged.totalTokens,
                model: charged.model,
                usage: charged.usage,
              };
      } else {
        const result = await callOpenAi(prompt);
        aiResult = result;
        payload = result.payload;
      }
      await saveCachedAiPayload(cacheKey, "tip", payload);
      const personalized = applyPersonalization(payload, {
        name: data.name ?? "amigo",
      });
      await safeStoreAiContent(user.id, "tip", "ai", personalized);
      const exactUsage = extractExactProviderUsage(aiResult?.usage);
      const responseUsage = exactUsage ?? chargedUsage ?? ZERO_AI_USAGE;
      const responseBalanceAfter =
        shouldChargeAi && typeof aiTokenBalance === "number"
          ? aiTokenBalance
          : aiMeta.aiTokenBalance;
      return reply.status(200).send({
        tip: personalized,
        mode: aiResult || shouldChargeAi ? "AI" : "FALLBACK",
        aiTokenBalance: responseBalanceAfter,
        aiTokenRenewalAt: shouldChargeAi
          ? getUserTokenExpiryAt(user)
          : aiMeta.aiTokenRenewalAt,
        usage: responseUsage,
        costCents: chargedCostCents,
        costEur: toEurAmount(chargedCostCents),
        balanceBefore: effectiveTokens,
        balanceAfter: responseBalanceAfter,
        ...(shouldChargeAi ? { nextBalance: responseBalanceAfter } : {}),
        ...(debit ? { debit } : {}),
      });
    } catch (error) {
      return sendAiEndpointError(reply, error);
    }
  },
);

app.post(
  "/ai/training-plan/generate-v2",
  { preHandler: aiStrengthDomainGuard },
  async (request, reply) => {
    try {
      logAuthCookieDebug(request, "/ai/training-plan/generate-v2");
      const authRequest = request as AuthenticatedEntitlementsRequest;
      const user =
        authRequest.currentUser ??
        (await requireUser(request, {
          logContext: "/ai/training-plan/generate-v2",
        }));
      const entitlements =
        authRequest.currentEntitlements ?? getUserEntitlements(user);

      const shouldChargeAi = !entitlements.role.adminOverride;
      const aiMeta = getAiTokenPayload(user, entitlements);
      if (shouldChargeAi) {
        assertSufficientAiTokenBalance(
          user,
          getEstimatedAiFeatureTokens("training-generate"),
        );
      }

      await enforceAiQuota({ id: user.id, plan: entitlements.legacy.tier });

      const payload = aiTrainingPlanGenerateRequestSchema.parse(request.body);
      const exerciseCatalog = await loadExerciseCatalogForAi();

      const result = await generateTrainingPlanV2(
        authRequest,
        payload as unknown as Record<string, unknown>,
        {
          prisma,
          callOpenAi: callOpenAi as any,
          catalog: exerciseCatalog,
          saveTrainingPlan: saveTrainingPlan as any,
          buildCacheKey,
          getCachedAiPayload,
          saveCachedAiPayload,
          storeAiContent,
          logger: {
            info: (obj: Record<string, unknown>, msg: string) => app.log.info(obj, msg),
            warn: (obj: Record<string, unknown>, msg: string) => app.log.warn(obj, msg),
          },
        },
      );

      return reply.status(200).send({
        ...result,
        aiTokenBalance: aiMeta.aiTokenBalance,
        aiTokenRenewalAt: aiMeta.aiTokenRenewalAt,
        costCents: 0,
        costEur: 0,
        balanceBefore: aiMeta.aiTokenBalance,
        balanceAfter: aiMeta.aiTokenBalance,
      });
    } catch (error) {
      return sendAiEndpointError(reply, error);
    }
  },
);
}
