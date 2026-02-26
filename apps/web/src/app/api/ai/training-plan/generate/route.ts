import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";
import { contractDriftResponse, validateAiTrainingGeneratePayload } from "@/lib/runtimeContracts";
import { parseJsonOrNull } from "@/app/api/_utils/aiErrorMapping";

export const dynamic = "force-dynamic";

const DEFAULT_UPSTREAM_ERROR = "UPSTREAM_ERROR";
const UPSTREAM_TIMEOUT_ERROR = "UPSTREAM_TIMEOUT";
const AI_GENERATE_TIMEOUT_MS = 120_000;

function readErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim().length > 0) {
      return error;
    }
  }

  return DEFAULT_UPSTREAM_ERROR;
}

function mapUpstreamErrorStatus(status: number): number {
  if (status >= 400 && status < 500) {
    return status;
  }

  return 502;
}

function logAiGenerateError(details: { upstreamStatus?: number; durationMs: number; errorKind: "network_error" | "status_error" }) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.warn("[bff.ai.training.generate.error]", {
    upstream_status: details.upstreamStatus ?? null,
    duration: details.durationMs,
    error_kind: details.errorKind,
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function POST(request: Request) {
  const { header: authCookie } = await getBackendAuthCookie(request);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED_NO_FS_TOKEN" }, { status: 401 });
  }

  const startedAt = Date.now();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), AI_GENERATE_TIMEOUT_MS);

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
      signal: abortController.signal,
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
      return NextResponse.json({ error: upstreamError }, { status: mapUpstreamErrorStatus(response.status) });
    }

    if (data === null) {
      logAiGenerateError({
        upstreamStatus: response.status,
        durationMs: Date.now() - startedAt,
        errorKind: "status_error",
      });
      return NextResponse.json({ error: DEFAULT_UPSTREAM_ERROR }, { status: 502 });
    }

    const validation = validateAiTrainingGeneratePayload(data);
    if (!validation.ok) {
      return NextResponse.json(contractDriftResponse("/ai/training-plan/generate", validation.reason ?? "UNKNOWN"), { status: 502 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (isAbortError(error)) {
      logAiGenerateError({ durationMs: Date.now() - startedAt, errorKind: "network_error" });
      return NextResponse.json({ error: UPSTREAM_TIMEOUT_ERROR }, { status: 502 });
    }

    logAiGenerateError({ durationMs: Date.now() - startedAt, errorKind: "network_error" });
    return NextResponse.json({ error: DEFAULT_UPSTREAM_ERROR }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
