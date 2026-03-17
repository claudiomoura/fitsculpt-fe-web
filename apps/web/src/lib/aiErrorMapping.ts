export type AiErrorCode =
  | "INSUFFICIENT_TOKENS"
  | "INVALID_AI_OUTPUT"
  | "AI_INPUT_INVALID"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "EXERCISE_CATALOG_UNAVAILABLE"
  | "AI_QUOTA_EXCEEDED";

export type BffErrorKind = "auth" | "validation" | "quota" | "upstream" | "not_found" | "unknown";

export type AiErrorCategory = "quota" | "auth" | "validation" | "upstream" | "unknown";

type AiErrorInput = {
  status?: number | null;
  code?: string | null;
  error?: string | null;
  kind?: string | null;
};

export function normalizeAiErrorCode(value: unknown): AiErrorCode | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case "AI_TOKENS_EXHAUSTED":
    case "AI_TOKENS_INSUFFICIENT":
    case "INSUFFICIENT_TOKENS":
      return "INSUFFICIENT_TOKENS";
    case "INVALID_AI_OUTPUT":
    case "AI_INPUT_INVALID":
    case "RATE_LIMITED":
    case "UPSTREAM_ERROR":
    case "EXERCISE_CATALOG_UNAVAILABLE":
    case "AI_QUOTA_EXCEEDED":
      return normalized;
    default:
      return null;
  }
}

export function shouldTreatAsUpstreamError(status: number | null | undefined, code: string | null | undefined): boolean {
  const normalizedCode = normalizeAiErrorCode(code);
  if (normalizedCode === "UPSTREAM_ERROR") return true;
  if (code?.trim().toUpperCase() === "UPSTREAM_ERROR") return true;
  return typeof status === "number" && status >= 500;
}

export function shouldTreatAsConflictError(status: number | null | undefined): boolean {
  return status === 409;
}

export function classifyAiError(input: AiErrorInput): AiErrorCategory {
  const normalizedKind = typeof input.kind === "string" ? input.kind.trim().toLowerCase() : "";
  const rawCode = input.code ?? input.error ?? null;
  const normalizedCode = normalizeAiErrorCode(rawCode);
  const status = input.status;

  if (normalizedKind === "quota" || normalizedCode === "AI_QUOTA_EXCEEDED" || normalizedCode === "INSUFFICIENT_TOKENS") {
    return "quota";
  }

  if (normalizedKind === "auth" || status === 401 || status === 403) {
    return "auth";
  }

  if (normalizedKind === "validation" || status === 400 || normalizedCode === "INVALID_AI_OUTPUT" || normalizedCode === "AI_INPUT_INVALID") {
    return "validation";
  }

  if (normalizedKind === "upstream" || shouldTreatAsUpstreamError(status, rawCode)) {
    return "upstream";
  }

  return "unknown";
}
