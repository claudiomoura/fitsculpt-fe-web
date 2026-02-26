import { z } from "zod";

export type AiGenerateErrorKind = "validation_error" | "upstream_error" | "internal_error" | "db_conflict";

export type ClassifiedAiGenerateError = {
  statusCode: number;
  error: string;
  errorKind: AiGenerateErrorKind;
  upstreamStatus?: number;
  prismaCode?: string;
  target?: string[];
};

const PRISMA_CONFLICT_CODES = new Set(["P2002"]);
const PRISMA_NOT_FOUND_CODES = new Set(["P2025"]);
const PRISMA_UNPROCESSABLE_CODES = new Set(["P2000", "P2003", "P2011", "P2012", "P2013"]);

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeServerStatus(statusCode: number) {
  if (statusCode >= 500) {
    return statusCode;
  }
  return 500;
}

function parsePrismaTarget(meta: unknown): string[] | undefined {
  const target = (meta as { target?: unknown } | undefined)?.target;
  if (Array.isArray(target)) {
    return target.filter((item): item is string => typeof item === "string");
  }
  if (typeof target === "string") {
    return [target];
  }
  return undefined;
}

export function classifyAiGenerateError(error: unknown): ClassifiedAiGenerateError {
  const typed = error as { code?: string; statusCode?: number; debug?: Record<string, unknown>; meta?: unknown };
  const isPrismaKnownError = typeof typed.code === "string" && /^P\d{4}$/.test(typed.code);

  if (typed.code && PRISMA_CONFLICT_CODES.has(typed.code)) {
    const target = parsePrismaTarget(typed.meta);
    return {
      statusCode: 409,
      error: "CONFLICT",
      errorKind: "db_conflict",
      prismaCode: typed.code,
      ...(target ? { target } : {}),
    };
  }

  if (typed.code && PRISMA_NOT_FOUND_CODES.has(typed.code)) {
    const target = parsePrismaTarget(typed.meta);
    return {
      statusCode: 404,
      error: "NOT_FOUND",
      errorKind: "validation_error",
      prismaCode: typed.code,
      ...(target ? { target } : {}),
    };
  }

  if (typed.code && PRISMA_UNPROCESSABLE_CODES.has(typed.code)) {
    const target = parsePrismaTarget(typed.meta);
    return {
      statusCode: 422,
      error: "UNPROCESSABLE_ENTITY",
      errorKind: "validation_error",
      prismaCode: typed.code,
      ...(target ? { target } : {}),
    };
  }

  if (isPrismaKnownError) {
    const target = parsePrismaTarget(typed.meta);
    return {
      statusCode: 500,
      error: "INTERNAL_ERROR",
      errorKind: "internal_error",
      prismaCode: typed.code,
      ...(target ? { target } : {}),
    };
  }

  if (error instanceof z.ZodError) {
    return {
      statusCode: 400,
      error: "INVALID_INPUT",
      errorKind: "validation_error",
    };
  }

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
      statusCode: 422,
      error: "UNPROCESSABLE_ENTITY",
      errorKind: "validation_error",
      ...(upstreamStatus ? { upstreamStatus } : {}),
    };
  }

  if (typeof typed.statusCode === "number" && typed.statusCode >= 400 && typed.statusCode < 500) {
    return {
      statusCode: typed.statusCode,
      error: typed.code ?? "REQUEST_ERROR",
      errorKind:
        typed.statusCode === 409
          ? "db_conflict"
          : typed.statusCode === 400 || typed.statusCode === 422
            ? "validation_error"
            : "internal_error",
    };
  }

  return {
    statusCode: normalizeServerStatus(typed.statusCode ?? 500),
    error: "INTERNAL_ERROR",
    errorKind: "internal_error",
    ...(upstreamStatus ? { upstreamStatus } : {}),
  };
}
