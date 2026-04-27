export type ContractValidationResult = {
  ok: boolean;
  reason?: string;
};

import { isUuid } from "@/lib/aiRequestId";
import { z } from "zod";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasBooleanEnabled(value: unknown): boolean {
  return isRecord(value) && (value.enabled === undefined || typeof value.enabled === "boolean");
}

export function validateAuthMePayload(payload: unknown): ContractValidationResult {
  if (!isRecord(payload)) return { ok: false, reason: "AUTH_ME_NOT_OBJECT" };
  if (payload.subscriptionPlan !== undefined && payload.subscriptionPlan !== null && typeof payload.subscriptionPlan !== "string") {
    return { ok: false, reason: "AUTH_ME_INVALID_SUBSCRIPTION_PLAN" };
  }
  if (payload.plan !== undefined && payload.plan !== null && typeof payload.plan !== "string") {
    return { ok: false, reason: "AUTH_ME_INVALID_PLAN" };
  }
  if (payload.tokenBalance !== undefined && payload.tokenBalance !== null && !isNumber(payload.tokenBalance)) {
    return { ok: false, reason: "AUTH_ME_INVALID_TOKEN_BALANCE" };
  }
  if (payload.aiEntitlements !== undefined && payload.aiEntitlements !== null) {
    if (!isRecord(payload.aiEntitlements)) return { ok: false, reason: "AUTH_ME_INVALID_AI_ENTITLEMENTS" };
    if (payload.aiEntitlements.nutrition !== undefined && typeof payload.aiEntitlements.nutrition !== "boolean") {
      return { ok: false, reason: "AUTH_ME_INVALID_AI_ENTITLEMENTS_NUTRITION" };
    }
    if (payload.aiEntitlements.strength !== undefined && typeof payload.aiEntitlements.strength !== "boolean") {
      return { ok: false, reason: "AUTH_ME_INVALID_AI_ENTITLEMENTS_STRENGTH" };
    }
  }

  if (payload.entitlements !== undefined && payload.entitlements !== null) {
    if (!isRecord(payload.entitlements)) return { ok: false, reason: "AUTH_ME_INVALID_ENTITLEMENTS" };
    const modules = payload.entitlements.modules;
    if (modules !== undefined && modules !== null) {
      if (!isRecord(modules)) return { ok: false, reason: "AUTH_ME_INVALID_MODULES" };
      if (!hasBooleanEnabled(modules.ai)) return { ok: false, reason: "AUTH_ME_INVALID_AI_MODULE" };
      if (!hasBooleanEnabled(modules.nutrition)) return { ok: false, reason: "AUTH_ME_INVALID_NUTRITION_MODULE" };
      if (!hasBooleanEnabled(modules.strength)) return { ok: false, reason: "AUTH_ME_INVALID_STRENGTH_MODULE" };
    }
  }

  if (payload.gymMembershipState !== undefined) {
    const allowedGymMembershipStates = new Set(["NONE", "PENDING", "ACTIVE"]);
    if (typeof payload.gymMembershipState !== "string" || !allowedGymMembershipStates.has(payload.gymMembershipState)) {
      return { ok: false, reason: "AUTH_ME_INVALID_GYM_MEMBERSHIP_STATE" };
    }
  }

  if (payload.gymRole !== undefined) {
    const allowedGymRoles = new Set(["USER", "TRAINER", "ADMIN"]);
    if (typeof payload.gymRole !== "string" || !allowedGymRoles.has(payload.gymRole)) {
      return { ok: false, reason: "AUTH_ME_INVALID_GYM_ROLE" };
    }
  }

  return { ok: true };
}


const allowedMembershipStatus = new Set(["NONE", "PENDING", "ACTIVE", "REJECTED", "UNKNOWN"]);

export function validateMembershipPayload(payload: unknown): ContractValidationResult {
  if (!isRecord(payload)) return { ok: false, reason: "MEMBERSHIP_NOT_OBJECT" };
  if (!isString(payload.status) || !allowedMembershipStatus.has(payload.status)) {
    return { ok: false, reason: "MEMBERSHIP_INVALID_STATUS" };
  }
  if (payload.gymId !== null && payload.gymId !== undefined && typeof payload.gymId !== "string") {
    return { ok: false, reason: "MEMBERSHIP_INVALID_GYM_ID" };
  }
  if (payload.gymName !== null && payload.gymName !== undefined && typeof payload.gymName !== "string") {
    return { ok: false, reason: "MEMBERSHIP_INVALID_GYM_NAME" };
  }
  if (payload.role !== null && payload.role !== undefined && typeof payload.role !== "string") {
    return { ok: false, reason: "MEMBERSHIP_INVALID_ROLE" };
  }
  return { ok: true };
}
function isTrackingCheckin(entry: unknown): boolean {
  return isRecord(entry) && isString(entry.id) && isString(entry.date) && isNumber(entry.weightKg);
}

function isTrackingFood(entry: unknown): boolean {
  return isRecord(entry) && isString(entry.id) && isString(entry.date) && isString(entry.foodKey) && isNumber(entry.grams);
}

function isTrackingWorkout(entry: unknown): boolean {
  return isRecord(entry) && isString(entry.id) && isString(entry.date) && isString(entry.name) && isNumber(entry.durationMin);
}

function isTrackingMealLog(entry: unknown): boolean {
  return isRecord(entry) && isString(entry.id) && isString(entry.date) && isString(entry.mealKey) && isString(entry.mealType) && isString(entry.title) && isNumber(entry.calories);
}

export function validateTrackingSnapshot(payload: unknown): ContractValidationResult {
  if (!isRecord(payload)) return { ok: false, reason: "TRACKING_NOT_OBJECT" };
  if (!Array.isArray(payload.checkins) || !payload.checkins.every(isTrackingCheckin)) {
    return { ok: false, reason: "TRACKING_INVALID_CHECKINS" };
  }
  if (!Array.isArray(payload.foodLog) || !payload.foodLog.every(isTrackingFood)) {
    return { ok: false, reason: "TRACKING_INVALID_FOOD_LOG" };
  }
  if (!Array.isArray(payload.workoutLog) || !payload.workoutLog.every(isTrackingWorkout)) {
    return { ok: false, reason: "TRACKING_INVALID_WORKOUT_LOG" };
  }
  if (!Array.isArray(payload.mealLog) || !payload.mealLog.every(isTrackingMealLog)) {
    return { ok: false, reason: "TRACKING_INVALID_MEAL_LOG" };
  }
  return { ok: true };
}

function isExerciseMinimal(entry: unknown): boolean {
  return isRecord(entry) && isString(entry.id) && isString(entry.name);
}

export function validateExercisesListPayload(payload: unknown): ContractValidationResult {
  if (!isRecord(payload)) return { ok: false, reason: "EXERCISES_LIST_NOT_OBJECT" };
  const rows = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : null;
  if (!rows) return { ok: false, reason: "EXERCISES_LIST_MISSING_ITEMS" };
  if (!rows.every(isExerciseMinimal)) return { ok: false, reason: "EXERCISES_LIST_INVALID_ITEM" };
  return { ok: true };
}

export function validateExerciseDetailPayload(payload: unknown): ContractValidationResult {
  if (!isExerciseMinimal(payload)) return { ok: false, reason: "EXERCISE_DETAIL_INVALID" };
  return { ok: true };
}

function isUsagePayload(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.total_tokens !== undefined && !isNumber(value.total_tokens)) return false;
  if (value.prompt_tokens !== undefined && !isNumber(value.prompt_tokens)) return false;
  if (value.completion_tokens !== undefined && !isNumber(value.completion_tokens)) return false;
  if (value.totalTokens !== undefined && !isNumber(value.totalTokens)) return false;
  if (value.promptTokens !== undefined && !isNumber(value.promptTokens)) return false;
  if (value.completionTokens !== undefined && !isNumber(value.completionTokens)) return false;
  if (value.balanceAfter !== undefined && !isNumber(value.balanceAfter)) return false;
  return true;
}

const nutritionMacrosSchema = z
  .object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fats: z.number(),
  })
  .strict();

const nutritionIngredientSchema = z
  .object({
    name: z.string().min(1),
    grams: z.number(),
  })
  .strict();

const nutritionMealSchema = z
  .object({
    type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    recipeId: z.string().min(1).nullable().optional(),
    title: z.string().min(1),
    description: z.string().nullable(),
    macros: nutritionMacrosSchema,
    ingredients: z.array(nutritionIngredientSchema).nullable(),
  })
  .strict();

const nutritionDaySchema = z
  .object({
    date: z.string().min(1),
    dayLabel: z.string().min(1),
    meals: z.array(nutritionMealSchema).min(1),
  })
  .strict();

const nutritionPlanSchema = z
  .object({
    title: z.string().min(1),
    startDate: z.string().nullable(),
    dailyCalories: z.number(),
    proteinG: z.number(),
    fatG: z.number(),
    carbsG: z.number(),
    days: z.array(nutritionDaySchema).min(1),
    shoppingList: z
      .array(
        z
          .object({
            name: z.string().min(1),
            grams: z.number(),
          })
          .strict(),
      )
      .nullable(),
  })
  .strict();

const nutritionGenerateResponseSchema = z
  .object({
    plan: nutritionPlanSchema,
    aiTokenBalance: z.number().optional(),
    aiTokenRenewalAt: z.string().nullable().optional(),
    usage: z
      .object({
        total_tokens: z.number().optional(),
        prompt_tokens: z.number().optional(),
        completion_tokens: z.number().optional(),
        totalTokens: z.number().optional(),
        promptTokens: z.number().optional(),
        completionTokens: z.number().optional(),
        balanceAfter: z.number().optional(),
      })
      .strict()
      .optional(),
    mode: z.string().optional(),
    aiRequestId: z
      .string()
      .uuid()
      .optional(),
    balanceAfter: z.number().optional(),
    balanceBefore: z.number().optional(),
    costCents: z.number().optional(),
    costEur: z.number().optional(),
  })
  .passthrough();

export function validateAiTrainingGeneratePayload(payload: unknown): ContractValidationResult {
  if (!isRecord(payload)) return { ok: false, reason: "AI_TRAINING_NOT_OBJECT" };
  if (!(isRecord(payload.plan) || isString(payload.plan))) return { ok: false, reason: "AI_TRAINING_INVALID_PLAN" };
  if (payload.aiTokenBalance !== undefined && !isNumber(payload.aiTokenBalance)) {
    return { ok: false, reason: "AI_TRAINING_INVALID_TOKEN_BALANCE" };
  }
  if (payload.aiTokenRenewalAt !== undefined && payload.aiTokenRenewalAt !== null && typeof payload.aiTokenRenewalAt !== "string") {
    return { ok: false, reason: "AI_TRAINING_INVALID_TOKEN_RENEWAL" };
  }
  if (payload.usage !== undefined && !isUsagePayload(payload.usage)) {
    return { ok: false, reason: "AI_TRAINING_INVALID_USAGE" };
  }
  if (payload.mode !== undefined && typeof payload.mode !== "string") {
    return { ok: false, reason: "AI_TRAINING_INVALID_MODE" };
  }
  if (payload.aiRequestId !== undefined && (!isString(payload.aiRequestId) || !isUuid(payload.aiRequestId))) {
    return { ok: false, reason: "AI_TRAINING_INVALID_AI_REQUEST_ID" };
  }
  if (payload.balanceAfter !== undefined && !isNumber(payload.balanceAfter)) {
    return { ok: false, reason: "AI_TRAINING_INVALID_BALANCE_AFTER" };
  }
  if (payload.balanceBefore !== undefined && !isNumber(payload.balanceBefore)) {
    return { ok: false, reason: "AI_TRAINING_INVALID_BALANCE_BEFORE" };
  }
  if (payload.costCents !== undefined && !isNumber(payload.costCents)) {
    return { ok: false, reason: "AI_TRAINING_INVALID_COST_CENTS" };
  }
  if (payload.costEur !== undefined && !isNumber(payload.costEur)) {
    return { ok: false, reason: "AI_TRAINING_INVALID_COST_EUR" };
  }
  return { ok: true };
}

export function validateAiNutritionGeneratePayload(payload: unknown): ContractValidationResult {
  const parsed = nutritionGenerateResponseSchema.safeParse(payload);
  if (parsed.success) {
    return { ok: true };
  }

  const firstIssue = parsed.error.issues[0];
  if (!firstIssue) {
    return { ok: false, reason: "AI_NUTRITION_INVALID_PAYLOAD" };
  }

  const path = firstIssue.path.join(".");
  const normalizedPath = path ? path.toUpperCase().replace(/[^A-Z0-9]+/g, "_") : "PAYLOAD";
  return { ok: false, reason: `AI_NUTRITION_INVALID_${normalizedPath}` };
}

export function validateMealPhotoAnalyzePayload(payload: unknown): ContractValidationResult {
  if (!isRecord(payload)) return { ok: false, reason: "MEAL_PHOTO_ANALYZE_NOT_OBJECT" };
  if (!isString(payload.title)) return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_TITLE" };
  if (!Array.isArray(payload.items) || payload.items.length < 1) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_ITEMS" };
  }
  for (const item of payload.items) {
    if (!isRecord(item)) return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_ITEM" };
    if (!isString(item.name)) return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_ITEM_NAME" };
    if (!isNumber(item.calories) || !isNumber(item.protein) || !isNumber(item.carbs) || !isNumber(item.fats)) {
      return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_ITEM_MACROS" };
    }
    if (item.quantity !== undefined && !isNumber(item.quantity)) {
      return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_ITEM_QUANTITY" };
    }
    if (item.unit !== undefined && !isString(item.unit)) {
      return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_ITEM_UNIT" };
    }
  }

  if (!isRecord(payload.totals)) return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_TOTALS" };
  if (!isNumber(payload.totals.calories) || !isNumber(payload.totals.protein) || !isNumber(payload.totals.carbs) || !isNumber(payload.totals.fats)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_TOTAL_MACROS" };
  }

  if (!isNumber(payload.confidence) || payload.confidence < 0 || payload.confidence > 1) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_CONFIDENCE" };
  }

  if (!isString(payload.confidenceLabel)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_CONFIDENCE_LABEL" };
  }

  if (!["low", "medium", "high"].includes(payload.confidenceLabel)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_CONFIDENCE_LABEL_VALUE" };
  }

  if (payload.notes !== undefined && payload.notes !== null && !isString(payload.notes)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_NOTES" };
  }

  if (payload.foodName !== undefined && payload.foodName !== null && !isString(payload.foodName)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_FOOD_NAME" };
  }

  if (payload.kcal !== undefined && !isNumber(payload.kcal)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_KCAL" };
  }

  if (payload.fat !== undefined && !isNumber(payload.fat)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_FAT" };
  }

  if (payload.analysisSource !== undefined && payload.analysisSource !== "ai" && payload.analysisSource !== "fallback") {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_SOURCE" };
  }

  if (payload.degraded !== undefined && typeof payload.degraded !== "boolean") {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_DEGRADED" };
  }

  if (
    payload.fallbackReason !== undefined
    && payload.fallbackReason !== "LOW_CONFIDENCE"
    && payload.fallbackReason !== "UPSTREAM_ERROR"
    && payload.fallbackReason !== "CONTRACT_DRIFT"
    && payload.fallbackReason !== "AI_NOT_CONFIGURED"
    && payload.fallbackReason !== "UNEXPECTED_ERROR"
    && payload.fallbackReason !== "BFF_UPSTREAM_5XX"
    && payload.fallbackReason !== "BFF_INVALID_JSON"
    && payload.fallbackReason !== "BFF_CONTRACT_DRIFT"
    && payload.fallbackReason !== "BFF_TIMEOUT"
  ) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_FALLBACK_REASON" };
  }

  if (payload.usage !== undefined && !isUsagePayload(payload.usage)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_USAGE" };
  }

  if (payload.costCents !== undefined && !isNumber(payload.costCents)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_COST_CENTS" };
  }

  if (payload.costEur !== undefined && !isNumber(payload.costEur)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_COST_EUR" };
  }

  if (payload.balanceBefore !== undefined && payload.balanceBefore !== null && !isNumber(payload.balanceBefore)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_BALANCE_BEFORE" };
  }

  if (payload.balanceAfter !== undefined && payload.balanceAfter !== null && !isNumber(payload.balanceAfter)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_BALANCE_AFTER" };
  }

  if (payload.aiTokenBalance !== undefined && payload.aiTokenBalance !== null && !isNumber(payload.aiTokenBalance)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_TOKEN_BALANCE" };
  }

  if (payload.aiTokenRenewalAt !== undefined && payload.aiTokenRenewalAt !== null && !isString(payload.aiTokenRenewalAt)) {
    return { ok: false, reason: "MEAL_PHOTO_ANALYZE_INVALID_TOKEN_RENEWAL" };
  }

  return { ok: true };
}

export function contractDriftResponse(endpoint: string, reason: string) {
  return {
    error: "CONTRACT_DRIFT",
    endpoint,
    message: "Backend response does not match expected runtime contract.",
    reason,
  };
}
