import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { header: authCookie, debug } = await getBackendAuthCookie(request);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED_NO_FS_TOKEN", debug }, { status: 401 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/feed`, {
      headers: { cookie: authCookie },
      cache: "no-store",
    });
    const responseText = await response.text();
    if (!responseText) {
      return new NextResponse(null, { status: response.status });
    }
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: response.status });
    } catch (_err) {
      return new NextResponse(responseText, {
        status: response.status,
        headers: {
          "content-type": response.headers.get("content-type") ?? "text/plain",
        },
      });
    }
  } catch (_err) {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
