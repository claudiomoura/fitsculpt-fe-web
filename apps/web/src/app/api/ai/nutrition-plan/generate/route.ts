import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";
import { contractDriftResponse, validateAiNutritionGeneratePayload } from "@/lib/runtimeContracts";
import { parseJsonOrNull } from "@/app/api/_utils/aiErrorMapping";

export const dynamic = "force-dynamic";

const DEFAULT_UPSTREAM_ERROR = "UPSTREAM_ERROR";

function readErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim().length > 0) {
      return error;
    }
  }

  return DEFAULT_UPSTREAM_ERROR;
}

function logAiGenerateError(details: { upstreamStatus?: number; durationMs: number; errorKind: "network_error" | "status_error" }) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.warn("[bff.ai.nutrition.generate.error]", {
    upstream_status: details.upstreamStatus ?? null,
    duration: details.durationMs,
    error_kind: details.errorKind,
  });
}


export async function POST(request: Request) {
  const { header: authCookie } = await getBackendAuthCookie(request);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED_NO_FS_TOKEN" }, { status: 401 });
  }

  const startedAt = Date.now();

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
    const data = parseJsonOrNull(responseText);

    if (!response.ok) {
      logAiGenerateError({
        upstreamStatus: response.status,
        durationMs: Date.now() - startedAt,
        errorKind: "status_error",
      });

      const upstreamError = readErrorMessage(data);
      if (response.status >= 500) {
        return NextResponse.json({ error: upstreamError }, { status: 502 });
      }

      return NextResponse.json({ error: upstreamError }, { status: response.status });
    }

    if (data === null) {
      logAiGenerateError({
        upstreamStatus: response.status,
        durationMs: Date.now() - startedAt,
        errorKind: "status_error",
      });
      return NextResponse.json({ error: DEFAULT_UPSTREAM_ERROR }, { status: 502 });
    }

    const validation = validateAiNutritionGeneratePayload(data);
    if (!validation.ok) {
      return NextResponse.json(contractDriftResponse("/ai/nutrition-plan/generate", validation.reason ?? "UNKNOWN"), { status: 502 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (_err) {
    logAiGenerateError({ durationMs: Date.now() - startedAt, errorKind: "network_error" });
    return NextResponse.json({ error: DEFAULT_UPSTREAM_ERROR }, { status: 502 });
  }
}
