import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionRole } from "@/lib/auth/sessionRole";

const PROTECTED_PREFIXES = ["/app"];
const TRAINER_PREFIXES = ["/app/trainer"];
const ADMIN_PREFIXES = ["/app/admin"];

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

function redirectTo(req: NextRequest, pathname: string, statusCode = 307) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url, statusCode);
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
