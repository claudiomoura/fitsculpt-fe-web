import type { FastifyReply } from "fastify";
import { z } from "zod";

type AiErrorKind = "validation" | "quota" | "upstream" | "auth" | "internal";

type TypedError = {
  statusCode?: number;
  code?: string;
  message?: string;
  debug?: Record<string, unknown>;
};

function asKind(value: unknown): AiErrorKind | undefined {
  if (value === "validation" || value === "quota" || value === "upstream" || value === "auth" || value === "internal") {
    return value;
  }
  return undefined;
}

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

export function sendAiEndpointError(reply: FastifyReply, error: unknown) {
  if (error instanceof z.ZodError) {
    return reply.status(400).send({ error: "INVALID_INPUT", kind: "validation" });
  }

  const typed = error as TypedError;
  const code = typed.code ?? "";
  const message = typed.message ?? "";
  const normalizedCode = code.toLowerCase();
  const normalizedMessage = message.toLowerCase();
  const debugKind = asKind(typed.debug?.kind);

  if (
    debugKind === "quota" ||
    includesAny(normalizedCode, ["quota", "insufficient_quota", "token"]) ||
    includesAny(normalizedMessage, ["insufficient_quota", "quota", "token balance", "token limit"]) ||
    typed.statusCode === 429
  ) {
    const retryAfterSec =
      typeof typed.debug?.retryAfterSec === "number" ? typed.debug.retryAfterSec : undefined;
    if (typeof retryAfterSec === "number") {
      reply.header("Retry-After", retryAfterSec.toString());
    }
    return reply.status(429).send({
      error: code || "AI_QUOTA_EXCEEDED",
      kind: "quota",
      ...(typeof retryAfterSec === "number" ? { retryAfterSec } : {}),
    });
  }

  if (debugKind === "auth" || typed.statusCode === 401 || typed.statusCode === 403) {
    const status = typed.statusCode === 403 ? 403 : 401;
    return reply.status(status).send({
      error: code || (status === 403 ? "FORBIDDEN" : "UNAUTHORIZED"),
      kind: "auth",
    });
  }

  if (
    debugKind === "validation" ||
    typed.statusCode === 400 ||
    typed.statusCode === 422 ||
    includesAny(normalizedCode, ["invalid", "unprocessable", "validation", "parse"]) ||
    includesAny(normalizedMessage, ["validation", "invalid", "zod"]) 
  ) {
    return reply.status(400).send({
      error: code || "INVALID_INPUT",
      kind: "validation",
    });
  }

  if (
    debugKind === "upstream" ||
    includesAny(normalizedCode, ["upstream", "ai_request_failed", "timeout", "econnreset", "fetch_failed"]) ||
    includesAny(normalizedMessage, ["upstream", "timeout", "openai", "gateway"]) ||
    (typeof typed.statusCode === "number" && typed.statusCode >= 500 && typed.statusCode <= 599)
  ) {
    const status = typed.statusCode && typed.statusCode >= 500 ? typed.statusCode : 502;
    return reply.status(status).send({
      error: code || "AI_REQUEST_FAILED",
      kind: "upstream",
    });
  }

  return reply.status(500).send({ error: "INTERNAL_ERROR", kind: "internal" });
}
