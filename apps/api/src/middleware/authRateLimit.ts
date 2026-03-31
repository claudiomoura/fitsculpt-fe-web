import type { FastifyReply, FastifyRequest } from "fastify";
import { checkRateLimit, type RateLimitResult } from "../ai/monitoring/rateLimiter.js";

/**
 * Auth-specific rate limiting.
 * Uses IP address as identifier (since users aren't authenticated yet).
 * Stricter limits than AI routes to prevent brute-force and signup abuse.
 */

const AUTH_LIMIT = 10; // max attempts
const AUTH_WINDOW_MS = 60_000; // 1 minute window

export async function authRateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const ip = request.ip || request.headers["x-forwarded-for"] || "unknown";
  const result = await checkRateLimit(`auth:${ip}`, AUTH_LIMIT, AUTH_WINDOW_MS);

  reply.header("X-RateLimit-Limit", AUTH_LIMIT.toString());
  reply.header("X-RateLimit-Remaining", result.remaining.toString());
  reply.header("X-RateLimit-Reset", Math.ceil(result.resetTime / 1000).toString());

  if (result.retryAfter) {
    reply.header("Retry-After", result.retryAfter.toString());
  }

  if (!result.allowed) {
    reply.status(429).send({
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please wait before trying again.",
      retryAfter: result.retryAfter,
    });
    return;
  }
}
