import { toIsoDateString } from "../ai/nutrition-plan/normalizeNutritionPlanDays.js";

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Get today's date as YYYY-MM-DD key
 */
export function toDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse date input string to Date object
 */
export function parseDateInput(value?: string | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Build array of date strings from start date
 */
export function buildDateRange(startDate: Date, daysCount: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < daysCount; i += 1) {
    const next = new Date(startDate);
    next.setUTCDate(startDate.getUTCDate() + i);
    dates.push(toIsoDateString(next));
  }
  return dates;
}

/**
 * Get seconds until next UTC day
 */
export function getSecondsUntilNextUtcDay(date = new Date()): number {
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  );
  const diffMs = next.getTime() - date.getTime();
  return Math.max(1, Math.ceil(diffMs / 1000));
}

// ============================================================================
// Token/Billing Utilities
// ============================================================================

/**
 * Get token expiry date from user
 */
export function getUserTokenExpiryAt(user: {
  aiTokenResetAt?: Date | null;
  aiTokenRenewalAt?: Date | null;
}): Date | null {
  return user.aiTokenResetAt ?? user.aiTokenRenewalAt ?? null;
}

/**
 * Get user token balance (with null safety)
 */
export function getUserTokenBalance(user: {
  aiTokenBalance?: number | null;
}): number {
  return typeof user.aiTokenBalance === "number" ? user.aiTokenBalance : 0;
}

/**
 * Get effective token balance (considering expiry)
 */
export function getEffectiveTokenBalance(user: {
  aiTokenBalance?: number | null;
  aiTokenResetAt?: Date | null;
  aiTokenRenewalAt?: Date | null;
}): number {
  const tokenExpiryAt = getUserTokenExpiryAt(user);
  if (!tokenExpiryAt) {
    return 0;
  }
  if (tokenExpiryAt.getTime() < Date.now()) {
    return 0;
  }
  return Math.max(0, getUserTokenBalance(user));
}

/**
 * Get token expiry date (30 days from now by default)
 */
export function getTokenExpiry(days = 30): Date {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next;
}