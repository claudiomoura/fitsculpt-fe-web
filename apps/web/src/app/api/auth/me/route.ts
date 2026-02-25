import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import { contractDriftResponse, validateAuthMePayload } from "@/lib/runtimeContracts";

function getAuthCookie(token?: string) {
  return token ? `fs_token=${token}` : null;
}

export async function GET() {
  const token = (await cookies()).get("fs_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const authCookie = getAuthCookie(token);
  const headers: Record<string, string> = {};
  if (authCookie) headers.cookie = authCookie;

  try {
    const response = await fetch(`${getBackendUrl()}/auth/me`, {
      headers,
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    if (response.ok) {
      const validation = validateAuthMePayload(data);
      if (!validation.ok) {
        return NextResponse.json(contractDriftResponse("/auth/me", validation.reason ?? "UNKNOWN"), { status: 502 });
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 503 });
  }
}
