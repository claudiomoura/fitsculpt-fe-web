import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import { contractDriftResponse, validateAuthMePayload } from "@/lib/runtimeContracts";

function buildAuthCookie(token: string) {
  return `fs_token=${token}`;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("fs_token")?.value;
  const requestCookie = request.headers.get("cookie");
  const authCookie = token ? buildAuthCookie(token) : requestCookie;

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
