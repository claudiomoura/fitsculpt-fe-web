export type NutritionGenerateRequest = {
  name?: string;
  age?: number;
  sex?: string;
  goal?: string;
  mealsPerDay: number;
  targetKcal: number;
  macroTargets: {
    proteinG: number;
    carbsG: number;
    fatsG: number;
  };
  startDate: string;
  daysCount: number;
  dietType?: string;
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

export type NutritionGenerateResponse = {
  plan?: unknown;
  aiTokenBalance?: number;
  aiTokenRenewalAt?: string | null;
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
    plan?: unknown;
    aiTokenBalance?: unknown;
    aiTokenRenewalAt?: unknown;
  } | null;

  if (!response.ok) {
    const error: NutritionGenerateError = {
      status: response.status,
      code: typeof payload?.error === "string" ? payload.error : null,
      message: typeof payload?.message === "string" ? payload.message : null,
      retryAfterSec: typeof payload?.retryAfterSec === "number" ? payload.retryAfterSec : null,
      details: payload?.details ?? null,
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
  };
}
