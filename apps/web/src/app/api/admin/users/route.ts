import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = (await cookies()).get("fs_token")?.value;
  const headers: Record<string, string> = {};
  if (token) headers.cookie = `fs_token=${token}`;

  const response = await fetch(`${getBackendUrl()}/admin/users?${url.searchParams.toString()}`, {
    headers,
    cache: "no-store",
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
