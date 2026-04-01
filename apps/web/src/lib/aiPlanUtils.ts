import type { Activity } from "@/lib/profile";
import { fetchAuthMe } from "@/lib/authDedup";

export type AiTokenSnapshot = {
  tokens: number | null;
};

export type AiUsageSummary = {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  balanceAfter?: number;
};

export type RefreshSubscriptionResult = {
  aiTokenBalance: number | null;
  aiTokenRenewalAt: string | null;
  rawData: Record<string, unknown>;
};

/**
 * Reads AI token balance from billing/status or ai/quota endpoints.
 */
export async function readAiTokenSnapshot(): Promise<AiTokenSnapshot> {
  try {
    const billingResponse = await fetch("/api/billing/status", {
      cache: "no-store",
      credentials: "include",
    });
    if (billingResponse.ok) {
      const billingData = (await billingResponse.json()) as {
        tokens?: unknown;
        aiTokenBalance?: unknown;
      };
      const billingTokens =
        typeof billingData.tokens === "number"
          ? billingData.tokens
          : typeof billingData.aiTokenBalance === "number"
            ? billingData.aiTokenBalance
            : null;
      if (billingTokens !== null) {
        return { tokens: billingTokens };
      }
    }
  } catch (_err) {}

  try {
    const quotaResponse = await fetch("/api/ai/quota", {
      cache: "no-store",
      credentials: "include",
    });
    if (!quotaResponse.ok) {
      return { tokens: null };
    }
    const quotaData = (await quotaResponse.json()) as {
      tokens?: unknown;
      aiTokenBalance?: unknown;
      remainingTokens?: unknown;
      balance?: unknown;
    };
    const quotaTokens =
      typeof quotaData.tokens === "number"
        ? quotaData.tokens
        : typeof quotaData.aiTokenBalance === "number"
          ? quotaData.aiTokenBalance
          : typeof quotaData.remainingTokens === "number"
            ? quotaData.remainingTokens
            : typeof quotaData.balance === "number"
              ? quotaData.balance
              : null;
    return { tokens: quotaTokens };
  } catch (_err) {
    return { tokens: null };
  }
}

/**
 * Fetches /api/auth/me to refresh subscription state.
 * Returns parsed data; caller is responsible for updating component state.
 */
export async function refreshSubscription(): Promise<RefreshSubscriptionResult | null> {
  try {
    const data = await fetchAuthMe();
    return {
      aiTokenBalance: typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null,
      aiTokenRenewalAt: (data as Record<string, unknown>).aiTokenRenewalAt as string | null ?? null,
      rawData: data as Record<string, unknown>,
    };
  } catch (_err) {
    return null;
  }
}

/**
 * Calculates activity multiplier from profile activity level.
 */
export function activityMultiplier(activity: Activity): number {
  switch (activity) {
    case "sedentary":
      return 1.2;
    case "light":
      return 1.375;
    case "moderate":
      return 1.55;
    case "very":
      return 1.725;
    default:
      return 1.9;
  }
}

/**
 * Normalizes a plan selection value (e.g. from query params or localStorage).
 * Returns trimmed string or empty string if falsy.
 */
export function normalizePlanSelection(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "";
}
