import { z } from "zod";

/**
 * Profile schema for validation (exported for reuse)
 */
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).optional(),
  promoCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Normalize invalid positive metric values
 */
export function normalizeInvalidPositiveMetric(
  value: unknown,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Check if profile data is complete
 */
export function isProfileComplete(
  profile: Record<string, unknown> | null,
  profileSchema: z.ZodType<unknown>,
): boolean {
  if (!profile) return false;
  return profileSchema.safeParse(profile).success;
}