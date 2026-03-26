import type { FastifyRequest } from "fastify";
import { getEnv } from "../config.js";

const env = getEnv();

// ============================================================================
// Token Parsing
// ============================================================================

export interface NormalizedToken {
  token: string;
  hadPercent: boolean;
  decodeFailed: boolean;
  segments: number;
}

export interface JwtTokenResult {
  token: string | null;
  source: "authorization" | "cookie" | "none";
  hasBearerPrefix: boolean;
  normalized: NormalizedToken | null;
}

/**
 * Parse Bearer token from Authorization header
 */
export function parseBearerToken(header?: string): string | null {
  if (!header) return null;
  const [scheme, ...rest] = header.trim().split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer") return null;
  const token = rest.join(" ").trim();
  return token.length > 0 ? token : null;
}

/**
 * Normalize raw token (handle quotes, fs_token=, percent encoding, etc.)
 */
export function normalizeToken(rawToken: string): NormalizedToken {
  let token = rawToken.trim();
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  if (token.startsWith("fs_token=")) {
    token = token.slice("fs_token=".length).trim();
  }
  const hadPercent = token.includes("%");
  if (hadPercent) {
    try {
      token = decodeURIComponent(token);
    } catch {
      return { token, hadPercent, decodeFailed: true, segments: 0 };
    }
  }
  const parts = token.split(".");
  if (parts.length > 3) {
    token = parts.slice(0, 3).join(".");
  }
  const segments = token.split(".").length;
  return { token, hadPercent, decodeFailed: false, segments };
}

/**
 * Parse cookies from Cookie header
 */
export function parseCookieHeader(cookieHeader?: string): Map<string, string> {
  if (!cookieHeader) return new Map<string, string>();
  const entries = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf("=");
      if (index === -1) return null;
      const name = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (!name) return null;
      return [name, value] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));
  return new Map(entries);
}

/**
 * Extract JWT token from request (Authorization header or cookie)
 */
export function getJwtTokenFromRequest(request: FastifyRequest): JwtTokenResult {
  const authHeader = request.headers.authorization;
  const bearerToken = parseBearerToken(authHeader);
  const hasBearerPrefix =
    authHeader?.trim().toLowerCase().startsWith("bearer ") ?? false;
  if (authHeader) {
    const rawToken = bearerToken ?? authHeader;
    const normalized = normalizeToken(rawToken);
    return {
      token: normalized.token,
      source: "authorization",
      hasBearerPrefix,
      normalized,
    };
  }
  const cookieHeader = request.headers.cookie;
  const cookieToken = parseCookieHeader(cookieHeader).get("fs_token") ?? null;
  if (cookieToken) {
    const normalized = normalizeToken(cookieToken);
    return {
      token: normalized.token,
      source: "cookie",
      hasBearerPrefix,
      normalized,
    };
  }
  return {
    token: null,
    source: "none",
    hasBearerPrefix,
    normalized: null,
  };
}

// ============================================================================
// Auth Utilities
// ============================================================================

/**
 * Get request IP (supports X-Forwarded-For)
 */
export function getRequestIp(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim();
  return request.ip;
}

/**
 * Build cookie options based on environment
 */
export function buildCookieOptions() {
  const secure = env.APP_BASE_URL.startsWith("https://");
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
  };
}