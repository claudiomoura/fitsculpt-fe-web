import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import { jsonBffError } from "@/app/api/_utils/normalizeBffError";

export const dynamic = "force-dynamic";

function parseResponsePayload(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getRequestId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const candidate = (payload as { requestId?: unknown; request_id?: unknown }).requestId
    ?? (payload as { request_id?: unknown }).request_id;

  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : undefined;
}

export async function GET(request: Request) {
  const token = (await cookies()).get("fs_token")?.value;
  if (!token) {
    return jsonBffError({ status: 401 });
  }

  const url = new URL(request.url);

  try {
    const response = await fetch(`${getBackendUrl()}/billing/status?${url.searchParams.toString()}`, {
      headers: { cookie: `fs_token=${token}` },
      cache: "no-store",
    });

    const bodyText = await response.text();
    const payload = parseResponsePayload(bodyText);

    if (!response.ok) {
      return jsonBffError({
        status: response.status,
        type: "upstream",
        requestId: getRequestId(payload),
      });
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (_err) {
    return jsonBffError({ status: 502, type: "upstream" });
  }
}
