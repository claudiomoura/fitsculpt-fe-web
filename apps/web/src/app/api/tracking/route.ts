import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import { jsonBffError } from "@/app/api/_utils/normalizeBffError";
import { normalizeTrackingSnapshotPayload } from "@/lib/trackingSnapshot";

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

async function proxyTracking(request: Request | undefined, options?: { method?: "GET" | "POST" | "PUT" }) {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return jsonBffError({ status: 401 });
  }

  const method = options?.method ?? "GET";

  let body: unknown;
  if (method !== "GET") {
    if (!request) {
      return jsonBffError({ status: 400, type: "validation" });
    }
    body = await request.json().catch(() => undefined);
    if (body === undefined) {
      return jsonBffError({ status: 400, type: "validation" });
    }
  }

  try {
    const response = await fetch(`${getBackendUrl()}/tracking`, {
      method,
      headers: {
        "content-type": "application/json",
        cookie: authCookie,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 400) {
        return jsonBffError({ status: 400, type: "validation" });
      }
      if (response.status === 401) {
        return jsonBffError({ status: 401 });
      }
      return NextResponse.json(payload, { status: response.status });
    }

    const normalized = normalizeTrackingSnapshotPayload(payload);
    return NextResponse.json(normalized, { status: response.status });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}

export async function GET(request?: Request) {
  return proxyTracking(request, { method: "GET" });
}

export async function POST(request: Request) {
  return proxyTracking(request, { method: "POST" });
}

export async function PUT(request: Request) {
  return proxyTracking(request, { method: "PUT" });
}
