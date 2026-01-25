import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authCookie = request.headers.get("cookie");
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  try {
    const response = await fetch(`${backendUrl}/billing/status?${url.searchParams.toString()}`, {
      headers: { cookie: authCookie ?? "" },
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
