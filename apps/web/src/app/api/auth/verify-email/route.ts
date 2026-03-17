import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const backendUrl = getBackendUrl();
  const upstreamPath = `/auth/verify-email?token=${encodeURIComponent(token ?? "")}`;

  try {
    const response = await fetch(`${backendUrl}${upstreamPath}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[BFF] upstream request failed", {
      route: "/api/auth/verify-email",
      upstream: `${backendUrl}${upstreamPath}`,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "BACKEND_UNAVAILABLE",
        route: "/api/auth/verify-email",
        upstream: `${backendUrl}${upstreamPath}`,
      },
      { status: 502 },
    );
  }
}
