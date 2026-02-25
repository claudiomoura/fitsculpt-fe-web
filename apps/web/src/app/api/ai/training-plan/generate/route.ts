import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";
import { contractDriftResponse, validateAiTrainingGeneratePayload } from "@/lib/runtimeContracts";

export const dynamic = "force-dynamic";

const upstreamErrorResponse = { error: "UPSTREAM_ERROR" };

export async function POST(request: Request) {
  const { header: authCookie, debug } = await getBackendAuthCookie(request);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED_NO_FS_TOKEN", debug }, { status: 401 });
  }

  try {
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    const response = await fetch(`${getBackendUrl()}/ai/training-plan/generate`, {
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
        { status: 502 },
      );
    }

    try {
      const data = JSON.parse(responseText);

      if (!response.ok) {
        // Upstream 5xx => always map to 502, preserving known error shape when present.
        if (response.status >= 500) {
          if (typeof data?.error === "string") {
            return NextResponse.json({ error: data.error }, { status: 502 });
          }

          return NextResponse.json(upstreamErrorResponse, { status: 502 });
        }

        // Upstream 4xx => passthrough (keep current semantics)
        if (typeof data?.error === "string") {
          return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(
          {
            error: "AI_REQUEST_FAILED",
            debug: {
              backendStatus: response.status,
              reason: "INVALID_BACKEND_ERROR_PAYLOAD",
            },
          },
          { status: response.status },
        );
      }


      const validation = validateAiTrainingGeneratePayload(data);
      if (!validation.ok) {
        return NextResponse.json(contractDriftResponse("/ai/training-plan/generate", validation.reason ?? "UNKNOWN"), { status: 502 });
      }

      return NextResponse.json(data, { status: response.status });
    } catch (_err) {
      if (response.status >= 500) {
        return NextResponse.json(upstreamErrorResponse, { status: 502 });
      }

      return NextResponse.json(
        {
          error: "AI_REQUEST_FAILED",
          debug: {
            backendStatus: response.status,
            reason: "NON_JSON_BACKEND_RESPONSE",
          },
        },
        { status: 502 },
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
