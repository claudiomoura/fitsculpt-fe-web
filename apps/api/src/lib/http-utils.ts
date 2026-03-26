import type { FastifyReply } from "fastify";
import { z } from "zod";

/**
 * Create an HTTP error with optional debug info
 */
export function createHttpError(
  statusCode: number,
  code: string,
  debug?: Record<string, unknown>,
) {
  const error = new Error(code) as Error & {
    statusCode?: number;
    code?: string;
    debug?: Record<string, unknown>;
  };
  error.statusCode = statusCode;
  error.code = code;
  error.debug = debug;
  return error;
}

/**
 * Map training plan creation errors to HTTP responses
 */
export function mapTrainingPlanCreateError(error: unknown): {
  statusCode: number;
  payload: Record<string, unknown>;
} | null {
  if (error instanceof z.ZodError) {
    return {
      statusCode: 400,
      payload: {
        error: "VALIDATION_ERROR",
        details: error.flatten(),
      },
    };
  }

  const prismaError = error as {
    code?: string;
    message?: string;
    statusCode?: number;
    debug?: Record<string, unknown>;
  };

  if (prismaError.code === "P2002") {
    return {
      statusCode: 409,
      payload: {
        error: "CONFLICT",
        code: "TRAINING_PLAN_CONFLICT",
      },
    };
  }

  if (prismaError.statusCode === 401) {
    return {
      statusCode: 401,
      payload: { error: "UNAUTHORIZED", code: prismaError.code ?? "UNAUTHORIZED" },
    };
  }

  if (prismaError.statusCode === 403) {
    return {
      statusCode: 403,
      payload: { error: "FORBIDDEN", code: prismaError.code ?? "FORBIDDEN" },
    };
  }

  if (prismaError.statusCode === 409) {
    return {
      statusCode: 409,
      payload: {
        error: "CONFLICT",
        code: prismaError.code ?? "CONFLICT",
      },
    };
  }

  return null;
}

/**
 * Handle request errors and send appropriate HTTP responses
 */
export function handleRequestError(
  reply: FastifyReply,
  error: unknown,
  logFn?: (err: unknown) => void,
) {
  if (error instanceof z.ZodError) {
    return reply
      .status(400)
      .send({ error: "INVALID_INPUT", details: error.flatten() });
  }
  const typed = error as {
    statusCode?: number;
    code?: string;
    debug?: Record<string, unknown>;
  };
  if (typed.statusCode === 429 && typed.code === "AI_LIMIT_REACHED") {
    const retryAfterSec =
      typeof typed.debug?.retryAfterSec === "number"
        ? typed.debug.retryAfterSec
        : undefined;
    if (retryAfterSec) {
      reply.header("Retry-After", retryAfterSec.toString());
    }
    return reply.status(429).send({
      error: "AI_LIMIT_REACHED",
      message:
        "Has alcanzado el límite diario de IA. Suscríbete a PRO para más usos o intenta mañana.",
      ...(retryAfterSec ? { retryAfterSec } : {}),
    });
  }
  if (typed.statusCode === 402 && typed.code === "UPGRADE_REQUIRED") {
    return reply.status(402).send({ code: "UPGRADE_REQUIRED" });
  }
  if (typed.statusCode === 409 && typed.code === "PROFILE_INCOMPLETE") {
    return reply.status(409).send({ code: "PROFILE_INCOMPLETE" });
  }
  if (typed.statusCode) {
    return reply.status(typed.statusCode).send({
      error: typed.code ?? "REQUEST_ERROR",
      ...(typed.debug ? { debug: typed.debug } : {}),
    });
  }
  if (logFn) {
    logFn(error);
  }
  return reply.status(500).send({ error: "INTERNAL_ERROR" });
}