import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/app"];
const TRAINER_PREFIXES = ["/app/trainer", "/app/treinador"];
const ADMIN_PREFIXES = ["/app/admin"];

const ADMIN_ROLE_TOKENS = new Set(["ADMIN", "ROLE_ADMIN", "ADMINISTRATOR"]);
const TRAINER_ROLE_TOKENS = new Set(["TRAINER", "COACH", "ROLE_TRAINER", "ROLE_COACH"]);
const USER_ROLE_TOKENS = new Set(["USER", "ROLE_USER"]);

type SessionRole = "ADMIN" | "TRAINER" | "USER" | "UNKNOWN";

function toUpperString(value: unknown) {
  return typeof value === "string" ? value.toUpperCase() : null;
}

function collectTokenClaims(claims: Record<string, unknown>) {
  const directRole = toUpperString(claims.role);
  const directRoles = Array.isArray(claims.roles)
    ? claims.roles.map((item) => toUpperString(item)).filter((item): item is string => item !== null)
    : [];

  const nestedUser = claims.user;
  const nestedRole =
    typeof nestedUser === "object" && nestedUser !== null ? toUpperString((nestedUser as Record<string, unknown>).role) : null;
  const nestedRoles =
    typeof nestedUser === "object" && nestedUser !== null && Array.isArray((nestedUser as Record<string, unknown>).roles)
      ? ((nestedUser as Record<string, unknown>).roles as unknown[])
          .map((item) => toUpperString(item))
          .filter((item): item is string => item !== null)
      : [];

  return [directRole, nestedRole, ...directRoles, ...nestedRoles].filter((item): item is string => item !== null);
}

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  const payload = parts[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function readSessionRole(token: string): SessionRole {
  const claims = decodeTokenPayload(token);
  if (!claims) return "UNKNOWN";

  const roleTokens = collectTokenClaims(claims);

  if (roleTokens.some((token) => ADMIN_ROLE_TOKENS.has(token))) return "ADMIN";
  if (roleTokens.some((token) => TRAINER_ROLE_TOKENS.has(token))) return "TRAINER";
  if (roleTokens.some((token) => USER_ROLE_TOKENS.has(token))) return "USER";

  return "UNKNOWN";
}

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isTrainerPath(pathname: string) {
  return startsWithAny(pathname, TRAINER_PREFIXES);
}

function isAdminPath(pathname: string) {
  return startsWithAny(pathname, ADMIN_PREFIXES);
}

function isClientPath(pathname: string) {
  return pathname.startsWith("/app") && !isTrainerPath(pathname) && !isAdminPath(pathname);
}

function redirectTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("fs_token")?.value;
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const sessionRole = readSessionRole(token);

  if (sessionRole === "TRAINER" && isClientPath(pathname)) {
    return redirectTo(req, "/app/trainer");
  }

  if (sessionRole === "USER" && isTrainerPath(pathname)) {
    return redirectTo(req, "/app");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
