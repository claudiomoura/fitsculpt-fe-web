import { NextResponse } from "next/server";

export type BffErrorKind = "auth" | "validation" | "quota" | "upstream" | "not_found" | "unknown";

export type BffErrorPayload = {
  error: string;
  kind: BffErrorKind;
  status?: number;
  message?: string;
  requestId?: string;
};

type NormalizeBffErrorInput = {
  status?: number;
  message?: string;
  requestId?: string;
  type?: "upstream" | "validation" | "unknown";
};

function basePayload(error: string, kind: BffErrorKind, status?: number, message?: string, requestId?: string): BffErrorPayload {
  return {
    error,
    kind,
    ...(status === undefined ? {} : { status }),
    ...(message ? { message } : {}),
    ...(requestId ? { requestId } : {}),
  };
}

export function normalizeBffError(input: NormalizeBffErrorInput): { status: number; payload: BffErrorPayload } {
  const status = input.status ?? (input.type === "validation" ? 400 : 500);

  if (status === 401) {
    return { status: 401, payload: basePayload("UNAUTHORIZED", "auth", 401) };
  }

  if (status === 403) {
    return { status: 403, payload: basePayload("FORBIDDEN", "auth", 403) };
  }

  if (status === 404) {
    return { status: 404, payload: basePayload("NOT_FOUND", "not_found", 404) };
  }

  if (input.type === "validation" || status === 400) {
    return { status: 400, payload: basePayload("INVALID_REQUEST", "validation", 400) };
  }

  if (status === 429) {
    return { status: 429, payload: basePayload("QUOTA_EXCEEDED", "quota", 429) };
  }

  if (input.type === "upstream" || status >= 500) {
    return { status: 502, payload: basePayload("UPSTREAM_ERROR", "upstream", 502) };
  }

  return { status, payload: basePayload("UNKNOWN_ERROR", "unknown", status, input.message, input.requestId) };
}

export function jsonBffError(input: NormalizeBffErrorInput): NextResponse {
  const normalized = normalizeBffError(input);
  return NextResponse.json(normalized.payload, { status: normalized.status });
}
