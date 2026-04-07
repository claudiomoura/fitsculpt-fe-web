export type ContractValidationResult = {
  ok: boolean;
  reason?: string;
};

import { isUuid } from "@/lib/aiRequestId";

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
  if (!isRecord(payload)) return { ok: false, reason: "AI_NUTRITION_NOT_OBJECT" };
  if (!isRecord(payload.plan)) return { ok: false, reason: "AI_NUTRITION_INVALID_PLAN" };
  if (payload.aiTokenBalance !== undefined && !isNumber(payload.aiTokenBalance)) {
    return { ok: false, reason: "AI_NUTRITION_INVALID_TOKEN_BALANCE" };
  }
  if (payload.aiTokenRenewalAt !== undefined && payload.aiTokenRenewalAt !== null && typeof payload.aiTokenRenewalAt !== "string") {
    return { ok: false, reason: "AI_NUTRITION_INVALID_TOKEN_RENEWAL" };
  }
  if (payload.usage !== undefined && !isUsagePayload(payload.usage)) {
    return { ok: false, reason: "AI_NUTRITION_INVALID_USAGE" };
  }
  if (payload.mode !== undefined && typeof payload.mode !== "string") {
    return { ok: false, reason: "AI_NUTRITION_INVALID_MODE" };
  }
  if (payload.aiRequestId !== undefined && (!isString(payload.aiRequestId) || !isUuid(payload.aiRequestId))) {
    return { ok: false, reason: "AI_NUTRITION_INVALID_AI_REQUEST_ID" };
  }
  if (payload.balanceAfter !== undefined && !isNumber(payload.balanceAfter)) {
    return { ok: false, reason: "AI_NUTRITION_INVALID_BALANCE_AFTER" };
  }
  if (payload.balanceBefore !== undefined && !isNumber(payload.balanceBefore)) {
    return { ok: false, reason: "AI_NUTRITION_INVALID_BALANCE_BEFORE" };
  }
  if (payload.costCents !== undefined && !isNumber(payload.costCents)) {
    return { ok: false, reason: "AI_NUTRITION_INVALID_COST_CENTS" };
  }
  if (payload.costEur !== undefined && !isNumber(payload.costEur)) {
    return { ok: false, reason: "AI_NUTRITION_INVALID_COST_EUR" };
  }
  return { ok: true };
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
