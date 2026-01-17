import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authCookie = getBackendAuthCookie(request);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED_NO_COOKIE" }, { status: 401 });
  }

  try {
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    const response = await fetch(`${getBackendUrl()}/ai/nutrition-plan`, {
      method: "POST",
      headers: {
        ...(contentType ? { "content-type": contentType } : {}),
        cookie: authCookie,
      },
      body,
      cache: "no-store",
    });
    const responseText = await response.text();
    if (!responseText) {
      return new NextResponse(null, { status: response.status });
    }
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: response.status });
    } catch {
      return new NextResponse(responseText, {
        status: response.status,
        headers: {
          "content-type": response.headers.get("content-type") ?? "text/plain",
        },
      });
    }
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
