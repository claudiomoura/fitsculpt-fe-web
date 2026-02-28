export type NutritionGenerateRequest = {
  name?: string;
  age: number;
  sex: "male" | "female";
  goal: "cut" | "maintain" | "bulk";
  mealsPerDay: number;
  calories: number;
  startDate: string;
  daysCount: number;
  dietType?: string;
  dietaryRestrictions?: string;
  allergies?: string[];
  preferredFoods?: string;
  dislikedFoods?: string;
  mealDistribution?: unknown;
};

export type NutritionGenerateError = {
  status: number;
  code: string | null;
  message: string | null;
  retryAfterSec: number | null;
  details: unknown;
};

function extractNutritionErrorDetails(payload: {
  details?: unknown;
  debug?: unknown;
} | null): unknown {
  if (!payload || typeof payload !== "object") return null;
  if (payload.details !== undefined) return payload.details;
  if (!payload.debug || typeof payload.debug !== "object") return null;
  const debugDetails = (payload.debug as { details?: unknown }).details;
  return debugDetails ?? null;
}

export type NutritionGenerateResponse = {
  plan?: unknown;
  aiTokenBalance?: number;
  aiTokenRenewalAt?: string | null;
  usage?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    balanceAfter?: number;
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  mode?: string;
  aiRequestId?: string;
  balanceAfter?: number;
  planId?: string;
};

export async function generateNutritionPlan(request: NutritionGenerateRequest): Promise<NutritionGenerateResponse> {
  const response = await fetch("/api/ai/nutrition-plan/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: unknown;
    message?: unknown;
    retryAfterSec?: unknown;
    details?: unknown;
    debug?: unknown;
    plan?: unknown;
    aiTokenBalance?: unknown;
    aiTokenRenewalAt?: unknown;
    usage?: {
      totalTokens?: unknown;
      promptTokens?: unknown;
      completionTokens?: unknown;
      balanceAfter?: unknown;
      total_tokens?: unknown;
      prompt_tokens?: unknown;
      completion_tokens?: unknown;
    };
    mode?: unknown;
    aiRequestId?: unknown;
    balanceAfter?: unknown;
    planId?: unknown;
  } | null;

  if (!response.ok) {
    const error: NutritionGenerateError = {
      status: response.status,
      code: typeof payload?.error === "string" ? payload.error : null,
      message: typeof payload?.message === "string" ? payload.message : null,
      retryAfterSec: typeof payload?.retryAfterSec === "number" ? payload.retryAfterSec : null,
      details: extractNutritionErrorDetails(payload),
    };
    throw error;
  }

  return {
    plan: payload?.plan,
    aiTokenBalance: typeof payload?.aiTokenBalance === "number" ? payload.aiTokenBalance : undefined,
    aiTokenRenewalAt:
      typeof payload?.aiTokenRenewalAt === "string" || payload?.aiTokenRenewalAt === null
        ? payload.aiTokenRenewalAt
        : undefined,
    usage: payload?.usage
      ? {
          totalTokens:
            typeof payload.usage.totalTokens === "number"
              ? payload.usage.totalTokens
              : typeof payload.usage.total_tokens === "number"
                ? payload.usage.total_tokens
                : undefined,
          promptTokens:
            typeof payload.usage.promptTokens === "number"
              ? payload.usage.promptTokens
              : typeof payload.usage.prompt_tokens === "number"
                ? payload.usage.prompt_tokens
                : undefined,
          completionTokens:
            typeof payload.usage.completionTokens === "number"
              ? payload.usage.completionTokens
              : typeof payload.usage.completion_tokens === "number"
                ? payload.usage.completion_tokens
                : undefined,
          balanceAfter: typeof payload.usage.balanceAfter === "number" ? payload.usage.balanceAfter : undefined,
        }
      : undefined,
    mode: typeof payload?.mode === "string" ? payload.mode : undefined,
    aiRequestId: typeof payload?.aiRequestId === "string" ? payload.aiRequestId : undefined,
    balanceAfter: typeof payload?.balanceAfter === "number" ? payload.balanceAfter : undefined,
    planId: typeof payload?.planId === "string" ? payload.planId : undefined,
  };
}
