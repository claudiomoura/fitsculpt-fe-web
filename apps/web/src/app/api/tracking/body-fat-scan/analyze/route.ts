import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";
import { parseJsonOrNull } from "@/app/api/_utils/aiErrorMapping";

export const dynamic = "force-dynamic";

const ENDPOINT = "/tracking/body-fat-scan/analyze";
const REQUEST_TIMEOUT_MS = 120_000;

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

    const payload = parseJsonOrNull(await response.text());

    if (!response.ok) {
      return NextResponse.json(payload ?? { error: "UPSTREAM_ERROR" }, { status: response.status });
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "REQUEST_FAILED", reason: message }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}