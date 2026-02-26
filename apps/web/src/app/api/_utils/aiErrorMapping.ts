import { NextResponse } from "next/server";

const UPSTREAM_ERROR_CODE = "UPSTREAM_ERROR";
const CLIENT_ERROR_CODE = "AI_REQUEST_FAILED";

function getErrorMessage(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const errorValue = (payload as { error?: unknown }).error;
    if (typeof errorValue === "string" && errorValue.trim().length > 0) {
      return errorValue;
    }
  }

  return null;
}

export function parseJsonOrNull(text: string): unknown | null {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function mapAiUpstreamError(status: number, payload: unknown): NextResponse {
  const upstreamMessage = getErrorMessage(payload);

  if (status >= 500) {
    return NextResponse.json({ error: upstreamMessage ?? UPSTREAM_ERROR_CODE }, { status: 502 });
  }

  return NextResponse.json({ error: upstreamMessage ?? CLIENT_ERROR_CODE }, { status });
}

export function aiRequestFailedResponse(status = 502): NextResponse {
  if (status >= 500) {
    return NextResponse.json({ error: UPSTREAM_ERROR_CODE }, { status: 502 });
  }

  return NextResponse.json({ error: CLIENT_ERROR_CODE }, { status });
}
