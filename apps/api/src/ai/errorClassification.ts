import { z } from "zod";

export type AiGenerateErrorKind = "validation_error" | "upstream_error" | "internal_error";

export type ClassifiedAiGenerateError = {
  statusCode: number;
  error: string;
  errorKind: AiGenerateErrorKind;
  upstreamStatus?: number;
};

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeServerStatus(statusCode: number) {
  if (statusCode >= 500) {
    return statusCode;
  }
  return 500;
}

export function classifyAiGenerateError(error: unknown): ClassifiedAiGenerateError {
  if (error instanceof z.ZodError) {
    return {
      statusCode: 400,
      error: "INVALID_INPUT",
      errorKind: "validation_error",
    };
  }

  const typed = error as { code?: string; statusCode?: number; debug?: Record<string, unknown> };
  const upstreamStatus = asNumber(typed.debug?.status);

  if (typed.code === "INVALID_INPUT" || typed.statusCode === 400) {
    return {
      statusCode: 400,
      error: "INVALID_INPUT",
      errorKind: "validation_error",
    };
  }

  if (typed.code === "AI_REQUEST_FAILED" || typed.code === "AI_AUTH_FAILED") {
    return {
      statusCode: normalizeServerStatus(typed.statusCode ?? 503),
      error: "AI_UPSTREAM_ERROR",
      errorKind: "upstream_error",
      ...(upstreamStatus ? { upstreamStatus } : {}),
    };
  }

  if (typed.code === "AI_NOT_CONFIGURED") {
    return {
      statusCode: 503,
      error: "AI_SERVICE_UNAVAILABLE",
      errorKind: "internal_error",
    };
  }

  if (
    typed.code === "EXERCISE_CATALOG_UNAVAILABLE" ||
    typed.code === "EXERCISE_CATALOG_EMPTY" ||
    typed.code === "AI_PARSE_ERROR" ||
    typed.code === "AI_EMPTY_RESPONSE" ||
    typed.code === "INVALID_AI_OUTPUT"
  ) {
    return {
      statusCode: 503,
      error: typed.code,
      errorKind: "internal_error",
      ...(upstreamStatus ? { upstreamStatus } : {}),
    };
  }

  if (typeof typed.statusCode === "number" && typed.statusCode >= 400 && typed.statusCode < 500) {
    return {
      statusCode: typed.statusCode,
      error: typed.code ?? "REQUEST_ERROR",
      errorKind: typed.statusCode === 400 ? "validation_error" : "internal_error",
    };
  }

  return {
    statusCode: normalizeServerStatus(typed.statusCode ?? 500),
    error: typed.code ?? "INTERNAL_ERROR",
    errorKind: "internal_error",
    ...(upstreamStatus ? { upstreamStatus } : {}),
  };
}
