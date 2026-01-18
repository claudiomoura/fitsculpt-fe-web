import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

export async function POST(request: Request) {
  const token = (await cookies()).get("fs_token")?.value;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.cookie = `fs_token=${token}`;
  const body = await request.text();

  const response = await fetch(`${getBackendUrl()}/auth/change-password`, {
    method: "POST",
    headers,
    body,
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
