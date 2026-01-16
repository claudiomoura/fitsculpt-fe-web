import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

function getAuthCookie(token?: string) {
  return token ? `fs_token=${token}` : null;
}

export async function GET() {
  const token = (await cookies()).get("fs_token")?.value;
  const authCookie = getAuthCookie(token);
  const headers: Record<string, string> = {};
  if (authCookie) headers.cookie = authCookie;

  const response = await fetch(`${getBackendUrl()}/auth/me`, {
    headers,
    cache: "no-store",
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
