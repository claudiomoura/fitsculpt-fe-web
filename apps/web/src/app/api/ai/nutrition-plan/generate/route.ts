import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";
import { contractDriftResponse, validateAiNutritionGeneratePayload } from "@/lib/runtimeContracts";
import { aiRequestFailedResponse, mapAiUpstreamError, parseJsonOrNull } from "@/app/api/_utils/aiErrorMapping";

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_ERROR = "AI_TIMEOUT";
const AI_GENERATE_TIMEOUT_MS = 120_000;
const ENDPOINT = "/ai/nutrition-plan/generate";
const PASSTHROUGH_STATUSES = new Set([400, 403, 429]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function readAiRequestIdHeader(request: Request, requestBody: string): string | null {
  const headerValue = request.headers.get("x-ai-request-id");
  if (headerValue && headerValue.trim().length > 0) {
    return headerValue;
  }

  const parsedBody = parseJsonOrNull(requestBody);
  if (isRecord(parsedBody) && typeof parsedBody.aiRequestId === "string" && parsedBody.aiRequestId.trim().length > 0) {
    return parsedBody.aiRequestId;
  }

  return null;
}

function getUpstreamErrorMetadata(payload: unknown): { errorCode: string | null; errorReason: string | null } {
  if (!isRecord(payload)) {
    return { errorCode: null, errorReason: null };
  }

  const errorCode = typeof payload.code === "string" && payload.code.trim().length > 0 ? payload.code : null;
  const errorReason =
    (typeof payload.reason === "string" && payload.reason.trim().length > 0 ? payload.reason : null) ??
    (typeof payload.error === "string" && payload.error.trim().length > 0 ? payload.error : null);

  return { errorCode, errorReason };
}

function logAiGenerateError(details: {
  upstreamStatus?: number;
  durationMs: number;
  errorKind: "network_error" | "status_error";
  endpoint: string;
  upstreamErrorCode?: string | null;
  upstreamErrorReason?: string | null;
}) {
  console.warn("[bff.ai.nutrition.generate.error]", {
    upstream_status: details.upstreamStatus ?? null,
    duration: details.durationMs,
    endpoint: details.endpoint,
    error_kind: details.errorKind,
    upstream_error_code: details.upstreamErrorCode ?? null,
    upstream_error_reason: details.upstreamErrorReason ?? null,
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function POST(request: Request) {
  const { header: authCookie } = await getBackendAuthCookie(request);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED", kind: "auth", status: 401 }, { status: 401 });
  }

  const startedAt = Date.now();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), AI_GENERATE_TIMEOUT_MS);

  try {
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    const aiRequestId = readAiRequestIdHeader(request, body);
    const response = await fetch(`${getBackendUrl()}/ai/nutrition-plan/generate`, {
      method: "POST",
      headers: {
        ...(contentType ? { "content-type": contentType } : {}),
        ...(aiRequestId ? { "x-ai-request-id": aiRequestId } : {}),
        cookie: authCookie,
      },
      body,
      cache: "no-store",
      signal: abortController.signal,
    });
    const responseText = await response.text();
    const data = parseJsonOrNull(responseText);

    if (!response.ok) {
      const upstreamErrorMetadata = getUpstreamErrorMetadata(data);
      logAiGenerateError({
        upstreamStatus: response.status,
        durationMs: Date.now() - startedAt,
        errorKind: "status_error",
        endpoint: ENDPOINT,
        upstreamErrorCode: upstreamErrorMetadata.errorCode,
        upstreamErrorReason: upstreamErrorMetadata.errorReason,
      });

      if (PASSTHROUGH_STATUSES.has(response.status) && data !== null) {
        return NextResponse.json(data, { status: response.status });
      }

      if (data !== null) {
        return mapAiUpstreamError(response.status, data);
      }

      return aiRequestFailedResponse(response.status);
    }

    if (data === null) {
      logAiGenerateError({
        upstreamStatus: response.status,
        durationMs: Date.now() - startedAt,
        errorKind: "status_error",
        endpoint: ENDPOINT,
      });
      return aiRequestFailedResponse();
    }

    const validation = validateAiNutritionGeneratePayload(data);
    if (!validation.ok) {
      return NextResponse.json(contractDriftResponse("/ai/nutrition-plan/generate", validation.reason ?? "UNKNOWN"), { status: 502 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (isAbortError(error)) {
      logAiGenerateError({ durationMs: Date.now() - startedAt, errorKind: "network_error", endpoint: ENDPOINT });
      return NextResponse.json({ error: UPSTREAM_TIMEOUT_ERROR, code: "AI_REQUEST_FAILED", kind: "upstream", status: 504 }, { status: 504 });
    }

    logAiGenerateError({ durationMs: Date.now() - startedAt, errorKind: "network_error", endpoint: ENDPOINT });
    return aiRequestFailedResponse();
  } finally {
    clearTimeout(timeoutId);
  }
}
