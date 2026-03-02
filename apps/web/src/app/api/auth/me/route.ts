import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import { contractDriftResponse, validateAuthMePayload } from "@/lib/runtimeContracts";

function getAuthCookieFromHeader(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const tokenPair = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("fs_token="));
  return tokenPair ?? null;
}

function getAuthCookie(token?: string, rawCookieHeader?: string | null) {
  if (token) {
    return `fs_token=${token}`;
  }

  return getAuthCookieFromHeader(rawCookieHeader ?? null);
}

export async function GET() {
  const token = (await cookies()).get("fs_token")?.value;
  const rawCookieHeader = (await headers()).get("cookie");
  const authCookie = getAuthCookie(token, rawCookieHeader);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/auth/me`, {
      headers: { cookie: authCookie },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    if (response.ok) {
      const validation = validateAuthMePayload(data);
      if (!validation.ok) {
        return NextResponse.json(contractDriftResponse("/auth/me", validation.reason ?? "UNKNOWN"), { status: 502 });
      }
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 503 });
  }
}
