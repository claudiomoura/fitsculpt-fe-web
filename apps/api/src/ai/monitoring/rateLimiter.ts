import type { FastifyReply, FastifyRequest } from "fastify";
import { getEnv } from "../../config.js";

const env = getEnv();

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const memoryStore: RateLimitStore = {};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export function checkRateLimit(
  identifier: string,
  limit: number = env.AI_RATE_LIMIT_PER_MINUTE,
  windowMs: number = 60000,
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  if (!memoryStore[key] || memoryStore[key].resetTime < now) {
    memoryStore[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  memoryStore[key].count++;

  if (memoryStore[key].count > limit) {
    const retryAfterMs = memoryStore[key].resetTime - now;
    return {
      allowed: false,
      remaining: 0,
      resetTime: memoryStore[key].resetTime,
      retryAfter: Math.ceil(retryAfterMs / 1000),
    };
  }

  return {
    allowed: true,
    remaining: limit - memoryStore[key].count,
    resetTime: memoryStore[key].resetTime,
  };
}

export function applyRateLimitHeaders(
  reply: FastifyReply,
  result: RateLimitResult,
): void {
  reply.header("X-RateLimit-Limit", env.AI_RATE_LIMIT_PER_MINUTE.toString());
  reply.header("X-RateLimit-Remaining", result.remaining.toString());
  reply.header("X-RateLimit-Reset", Math.ceil(result.resetTime / 1000).toString());

  if (result.retryAfter) {
    reply.header("Retry-After", result.retryAfter.toString());
  }
}

export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (request as any).user?.id;
  if (!userId) return;

  const limit = env.AI_RATE_LIMIT_PER_MINUTE;
  const result = checkRateLimit(`ai:${userId}`, limit);

  applyRateLimitHeaders(reply, result);

  if (!result.allowed) {
    reply.status(429).send({
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many AI requests. Please wait before trying again.",
      retryAfter: result.retryAfter,
    });
    return;
  }
}

export function logAiCall(
  logger: any,
  type: "start" | "end" | "success" | "error",
  details: {
    userId: string;
    requestId: string;
    endpoint: string;
    durationMs?: number;
    error?: string;
    tokens?: number;
  },
): void {
  const baseLog = {
    userId: details.userId,
    requestId: details.requestId,
    endpoint: details.endpoint,
  };

  switch (type) {
    case "start":
      logger.info({ ...baseLog, msg: "AI call started" }, "ai_call_start");
      break;
    case "end":
      logger.info(
        { ...baseLog, durationMs: details.durationMs, msg: "AI call ended" },
        "ai_call_end",
      );
      break;
    case "success":
      logger.info(
        {
          ...baseLog,
          durationMs: details.durationMs,
          tokens: details.tokens,
          msg: "AI call succeeded",
        },
        "ai_call_success",
      );
      break;
    case "error":
      logger.error(
        {
          ...baseLog,
          durationMs: details.durationMs,
          error: details.error,
          msg: "AI call failed",
        },
        "ai_call_error",
      );
      break;
  }
}

export interface AiErrorLog {
  timestamp: Date;
  userId: string;
  requestId: string;
  endpoint: string;
  errorType: string;
  errorMessage: string;
  stack?: string;
}

const errorLog: AiErrorLog[] = [];

export function logAiError(error: AiErrorLog): void {
  errorLog.push(error);
  if (errorLog.length > 1000) {
    errorLog.shift();
  }
}

export function getRecentAiErrors(count: number = 50): AiErrorLog[] {
  return errorLog.slice(-count);
}

export function clearAiErrors(): void {
  errorLog.length = 0;
}