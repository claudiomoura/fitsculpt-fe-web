export type ContractValidationResult = {
  ok: boolean;
  reason?: string;
};

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
  if (payload.aiRequestId !== undefined && typeof payload.aiRequestId !== "string") {
    return { ok: false, reason: "AI_TRAINING_INVALID_AI_REQUEST_ID" };
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
  if (payload.aiRequestId !== undefined && typeof payload.aiRequestId !== "string") {
    return { ok: false, reason: "AI_NUTRITION_INVALID_AI_REQUEST_ID" };
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
