import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionRole } from "@/lib/auth/sessionRole";

const PROTECTED_PREFIXES = ["/app"];
const TRAINER_PREFIXES = ["/app/trainer"];
const ADMIN_PREFIXES = ["/app/admin"];
const DEV_PREFIXES = ["/app/dev"];

const DEV_ROLE_TOKENS = new Set(["DEV", "DEVELOPER", "ROLE_DEV", "ROLE_DEVELOPER"]);
const DEV_PERMISSION_TOKENS = new Set(["DEV", "DEVELOPER", "ROLE_DEV", "ROLE_DEVELOPER"]);

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isTrainerPath(pathname: string) {
  return startsWithAny(pathname, TRAINER_PREFIXES);
}

function isAdminPath(pathname: string) {
  return startsWithAny(pathname, ADMIN_PREFIXES);
}

function isDevPath(pathname: string) {
  return startsWithAny(pathname, DEV_PREFIXES);
}

function isClientPath(pathname: string) {
  return pathname.startsWith("/app") && !isTrainerPath(pathname) && !isAdminPath(pathname);
}

function redirectTo(req: NextRequest, pathname: string, statusCode = 307) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url, statusCode);
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

function checkIsDev(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;

  if (payload.isDev === true) return true;

  const collectValues = (obj: Record<string, unknown>, keys: string[]): string[] => {
    const values: string[] = [];
    for (const key of keys) {
      const val = obj[key];
      if (typeof val === "string") values.push(val.toUpperCase());
      if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === "string") values.push(item.toUpperCase());
        }
      }
    }
    return values;
  };

  const allValues = collectValues(payload, ["role", "roles", "permissions"]);

  const nestedUser = payload.user;
  if (typeof nestedUser === "object" && nestedUser !== null) {
    allValues.push(...collectValues(nestedUser as Record<string, unknown>, ["role", "roles", "permissions"]));
  }

  return allValues.some((v) => DEV_ROLE_TOKENS.has(v) || DEV_PERMISSION_TOKENS.has(v));
}

const LEGACY_ROUTE_MAP: Record<string, string> = {
  "/app/dashboard": "/app/hoy",
  "/app/today": "/app/hoy",
  "/app/training": "/app/entrenamiento",
  "/app/nutrition": "/app/nutricion",
  "/app/progress": "/app/seguimiento",
  "/app/biblioteca/entrenamientos": "/app/biblioteca/planes-entrenamiento",
  "/app/dietas": "/app/biblioteca/planes-nutricion",
};

function getLegacyRedirect(pathname: string): string | null {
  for (const [legacy, canonical] of Object.entries(LEGACY_ROUTE_MAP)) {
    if (pathname === legacy || pathname.startsWith(`${legacy}/`)) {
      return pathname.replace(legacy, canonical);
    }
  }
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/app/treinador" || pathname.startsWith("/app/treinador/")) {
    const canonicalPath = pathname.replace("/app/treinador", "/app/trainer");
    return redirectTo(req, canonicalPath, 302);
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("fs_token")?.value;
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const legacyRedirect = getLegacyRedirect(pathname);
  if (legacyRedirect) {
    return redirectTo(req, legacyRedirect, 301);
  }

  const sessionRole = readSessionRole(token);

  if (sessionRole === "USER" && isTrainerPath(pathname)) {
    return redirectTo(req, "/app");
  }

  if (sessionRole === "ADMIN" && !isAdminPath(pathname) && !isTrainerPath(pathname)) {
    return redirectTo(req, "/app/admin");
  }

  if (isDevPath(pathname)) {
    const token = req.cookies.get("fs_token")?.value;
    if (token) {
      const payload = decodeTokenPayload(token);
      const isDev = checkIsDev(payload);
      if (!isDev) {
        return redirectTo(req, "/app");
      }
    } else {
      return redirectTo(req, "/app");
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
