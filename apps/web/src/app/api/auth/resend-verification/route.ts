import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(`${getBackendUrl()}/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
