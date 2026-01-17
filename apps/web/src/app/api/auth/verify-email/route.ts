import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const response = await fetch(`${getBackendUrl()}/auth/verify-email?token=${encodeURIComponent(token ?? "")}`);
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
