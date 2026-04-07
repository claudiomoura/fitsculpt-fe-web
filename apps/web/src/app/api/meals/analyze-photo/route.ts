import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";
import { aiRequestFailedResponse, mapAiUpstreamError, parseJsonOrNull } from "@/app/api/_utils/aiErrorMapping";
import { contractDriftResponse, validateMealPhotoAnalyzePayload } from "@/lib/runtimeContracts";

export const dynamic = "force-dynamic";

const ENDPOINT = "/meals/analyze-photo";
const REQUEST_TIMEOUT_MS = 45_000;
const PASSTHROUGH_STATUSES = new Set([400, 403, 422, 429]);

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function POST(request: Request) {
  const { header: authCookie } = await getBackendAuthCookie(request);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED", kind: "auth", status: 401 }, { status: 401 });
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

  try {
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    const response = await fetch(`${getBackendUrl()}${ENDPOINT}`, {
      method: "POST",
      headers: {
        ...(contentType ? { "content-type": contentType } : {}),
        cookie: authCookie,
      },
      body,
      cache: "no-store",
      signal: abortController.signal,
    });

    const responseText = await response.text();
    const payload = parseJsonOrNull(responseText);

    if (!response.ok) {
      if (PASSTHROUGH_STATUSES.has(response.status) && payload !== null) {
        return NextResponse.json(payload, { status: response.status });
      }
      if (payload !== null) {
        return mapAiUpstreamError(response.status, payload);
      }
      return aiRequestFailedResponse(response.status);
    }

    if (payload === null) {
      return aiRequestFailedResponse();
    }

    const validation = validateMealPhotoAnalyzePayload(payload);
    if (!validation.ok) {
      return NextResponse.json(contractDriftResponse(ENDPOINT, validation.reason ?? "UNKNOWN"), { status: 502 });
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    if (isAbortError(error)) {
      return NextResponse.json({ error: "AI_TIMEOUT", code: "AI_REQUEST_FAILED", kind: "upstream", status: 504 }, { status: 504 });
    }

    return aiRequestFailedResponse();
  } finally {
    clearTimeout(timeoutId);
  }
}
