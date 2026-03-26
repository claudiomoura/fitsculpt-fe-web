import type { FastifyReply, FastifyRequest } from "fastify";
import { getEnv } from "../../config.js";
import { createClient, type RedisClientType } from "redis";

const env = getEnv();

// Redis client for distributed rate limiting
let redisClient: RedisClientType | null = null;
let redisReady = false;

async function getRedisClient(): Promise<RedisClientType | null> {
  if (!env.REDIS_URL) {
    console.warn("[RateLimiter] REDIS_URL not configured, falling back to in-memory");
    return null;
  }

  if (redisClient && redisReady) {
    return redisClient;
  }

  try {
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on("error", (err) => console.error("[RateLimiter] Redis error:", err));
    redisClient.on("connect", () => console.log("[RateLimiter] Connected to Redis"));
    redisClient.on("ready", () => {
      redisReady = true;
      console.log("[RateLimiter] Redis ready");
    });
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.error("[RateLimiter] Failed to connect to Redis:", err);
    return null;
  }
}

// In-memory fallback store
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

async function checkRateLimitRedis(
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const client = await getRedisClient();
  if (!client) {
    return checkRateLimitMemory(identifier, limit, windowMs);
  }

  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowKey = `${key}:${Math.floor(now / windowMs)}`;

  try {
    const count = await client.incr(windowKey);
    
    if (count === 1) {
      await client.expire(windowKey, Math.ceil(windowMs / 1000));
    }

    const ttl = await client.ttl(windowKey);
    const resetTime = now + (ttl > 0 ? ttl * 1000 : windowMs);

    if (count > limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: ttl > 0 ? ttl : Math.ceil(windowMs / 1000),
      };
    }

    return {
      allowed: true,
      remaining: limit - count,
      resetTime,
    };
  } catch (err) {
    console.error("[RateLimiter] Redis error, falling back to memory:", err);
    return checkRateLimitMemory(identifier, limit, windowMs);
  }
}

function checkRateLimitMemory(
  identifier: string,
  limit: number,
  windowMs: number,
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

export async function checkRateLimit(
  identifier: string,
  limit: number = env.AI_RATE_LIMIT_PER_MINUTE,
  windowMs: number = 60000,
): Promise<RateLimitResult> {
  // Check if Redis is available
  if (env.REDIS_URL) {
    return checkRateLimitRedis(identifier, limit, windowMs);
  }
  // Fallback to in-memory
  return checkRateLimitMemory(identifier, limit, windowMs);
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
  const result = await checkRateLimit(`ai:${userId}`, limit);

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

// Health check for Redis connection
export async function getRedisStatus(): Promise<{ connected: boolean; provider: string }> {
  if (redisReady && redisClient) {
    return { connected: true, provider: "upstash-redis" };
  }
  return { connected: false, provider: "memory" };
}