import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

function readFsTokenFromCookieHeader(rawCookie: string | null): string | null {
  if (!rawCookie) return null;

  for (const part of rawCookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === "fs_token") {
      const value = rest.join("=").trim();
      return value || null;
    }
  }

  return null;
}

export async function GET() {
  const tokenFromStore = (await cookies()).get("fs_token")?.value ?? null;
  const headerStore = await headers();
  const tokenFromHeader = readFsTokenFromCookieHeader(headerStore.get("cookie"));
  const token = tokenFromStore ?? tokenFromHeader;

  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/auth/me`, {
      headers: { cookie: `fs_token=${token}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 503 });
  }
}
