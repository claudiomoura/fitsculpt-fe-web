export type AiErrorCode =
  | "INSUFFICIENT_TOKENS"
  | "INVALID_AI_OUTPUT"
  | "AI_INPUT_INVALID"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "EXERCISE_CATALOG_UNAVAILABLE";

export function normalizeAiErrorCode(value: unknown): AiErrorCode | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case "INSUFFICIENT_TOKENS":
    case "INVALID_AI_OUTPUT":
    case "AI_INPUT_INVALID":
    case "RATE_LIMITED":
    case "UPSTREAM_ERROR":
    case "EXERCISE_CATALOG_UNAVAILABLE":
      return normalized;
    default:
      return null;
  }
}

export function shouldTreatAsUpstreamError(status: number | null | undefined, code: string | null | undefined): boolean {
  if (normalizeAiErrorCode(code) === "UPSTREAM_ERROR") return true;
  return typeof status === "number" && status >= 500;
}

export function shouldTreatAsConflictError(status: number | null | undefined): boolean {
  return status === 409;
}
