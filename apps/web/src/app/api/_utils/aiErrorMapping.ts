import { NextResponse } from "next/server";
import { normalizeBffError } from "@/app/api/_utils/normalizeBffError";

const UPSTREAM_ERROR_CODE = "UPSTREAM_ERROR";
const CLIENT_ERROR_CODE = "AI_REQUEST_FAILED";
const QUOTA_EXCEEDED_ERROR_CODE = "AI_QUOTA_EXCEEDED";

function getErrorCode(payload: unknown): string | null {
  if (payload && typeof payload === "object") {
    const codeValue = (payload as { code?: unknown }).code;
    if (typeof codeValue === "string" && codeValue.trim().length > 0) {
      return codeValue;
    }
  }

  return null;
}

function isProviderQuotaExceeded(status: number, payload: unknown): boolean {
  const normalizedError = getErrorMessage(payload)?.trim().toLowerCase() ?? "";
  const normalizedCode = getErrorCode(payload)?.trim().toLowerCase() ?? "";
  const hasQuotaCode = normalizedError === "insufficient_quota" || normalizedCode === "insufficient_quota";

  if (hasQuotaCode) {
    return true;
  }

  return status === 429 && (normalizedError.includes("insufficient_quota") || normalizedCode.includes("insufficient_quota"));
}

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
  if (isProviderQuotaExceeded(status, payload)) {
    return NextResponse.json(
      { error: QUOTA_EXCEEDED_ERROR_CODE, code: QUOTA_EXCEEDED_ERROR_CODE, kind: "quota", status: 429 },
      { status: 429 }
    );
  }

  if (status === 401 || status === 403 || status === 404) {
    const normalized = normalizeBffError({ status, type: "upstream" });
    return NextResponse.json(normalized.payload, { status: normalized.status });
  }

  const upstreamMessage = getErrorMessage(payload);

  if (status >= 500) {
    return NextResponse.json(
      { error: CLIENT_ERROR_CODE, code: UPSTREAM_ERROR_CODE, kind: "upstream", status: 502 },
      { status: 502 }
    );
  }

  if (status === 400) {
    return NextResponse.json({ error: "INVALID_REQUEST", kind: "validation", status: 400 }, { status: 400 });
  }

  return NextResponse.json({ error: upstreamMessage ?? CLIENT_ERROR_CODE, code: CLIENT_ERROR_CODE, kind: "unknown", status }, { status });
}

export function aiRequestFailedResponse(status = 502): NextResponse {
  if (status >= 500) {
    return NextResponse.json({ error: CLIENT_ERROR_CODE, code: UPSTREAM_ERROR_CODE, kind: "upstream", status: 502 }, { status: 502 });
  }

  if (status === 400) {
    return NextResponse.json({ error: "INVALID_REQUEST", kind: "validation", status: 400 }, { status: 400 });
  }

  return NextResponse.json({ error: CLIENT_ERROR_CODE, code: CLIENT_ERROR_CODE, kind: "unknown", status }, { status });
}
