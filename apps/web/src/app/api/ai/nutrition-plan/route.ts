import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";
import { aiRequestFailedResponse, mapAiUpstreamError, parseJsonOrNull } from "@/app/api/_utils/aiErrorMapping";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { header: authCookie, debug } = await getBackendAuthCookie(request);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED_NO_FS_TOKEN", debug }, { status: 401 });
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
    const payload = parseJsonOrNull(responseText);

    if (!response.ok) {
      return mapAiUpstreamError(response.status, payload);
    }

    if (payload === null) {
      return aiRequestFailedResponse();
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (_err) {
    return aiRequestFailedResponse();
  }
}
