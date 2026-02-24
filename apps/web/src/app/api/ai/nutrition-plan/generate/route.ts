import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";

export const dynamic = "force-dynamic";

function toGatewayStatus(status: number) {
  return status >= 500 ? 502 : status;
}

export async function POST(request: Request) {
  const { header: authCookie, debug } = await getBackendAuthCookie(request);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED_NO_FS_TOKEN", debug }, { status: 401 });
  }

  try {
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    const response = await fetch(`${getBackendUrl()}/ai/nutrition-plan/generate`, {
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
      return NextResponse.json(
        {
          error: "AI_REQUEST_FAILED",
          debug: {
            backendStatus: response.status,
            reason: "EMPTY_BACKEND_RESPONSE",
          },
        },
        { status: toGatewayStatus(response.status) },
      );
    }

    try {
      const data = JSON.parse(responseText);
      if (!response.ok) {
        if (typeof data?.error === "string") {
          return NextResponse.json(data, { status: toGatewayStatus(response.status) });
        }

        return NextResponse.json(
          {
            error: "AI_REQUEST_FAILED",
            debug: {
              backendStatus: response.status,
              reason: "INVALID_BACKEND_ERROR_PAYLOAD",
            },
          },
          { status: toGatewayStatus(response.status) },
        );
      }

      return NextResponse.json(data, { status: response.status });
    } catch (_err) {
      return NextResponse.json(
        {
          error: "AI_REQUEST_FAILED",
          debug: {
            backendStatus: response.status,
            reason: "NON_JSON_BACKEND_RESPONSE",
          },
        },
        { status: toGatewayStatus(response.status) },
      );
    }
  } catch (_err) {
    return NextResponse.json(
      {
        error: "AI_REQUEST_FAILED",
        debug: {
          reason: "BACKEND_UNAVAILABLE",
        },
      },
      { status: 502 },
    );
  }
}
