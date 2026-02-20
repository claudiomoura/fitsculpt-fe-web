import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendUrl } from "@/lib/backend";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function jsonNoStore(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function toJsonBodyOrNull(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function POST(request: Request) {
  const token = (await cookies()).get("fs_token")?.value;
  if (!token) {
    return jsonNoStore({ error: "UNAUTHORIZED" }, 401);
  }

  let backendUrl: string;
  try {
    backendUrl = getBackendUrl();
  } catch {
    return jsonNoStore({ error: "BACKEND_URL_NOT_CONFIGURED" }, 500);
  }

  if (!backendUrl) {
    return jsonNoStore({ error: "BACKEND_URL_NOT_CONFIGURED" }, 500);
  }

  const payload = (await request.json().catch(() => ({}))) as unknown;

  let response: Response;
  try {
    response = await fetch(`${backendUrl}/billing/checkout`, {
      method: "POST",
      headers: {
        cookie: `fs_token=${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return jsonNoStore({ error: "BACKEND_UNAVAILABLE" }, 502);
  }

  const data = await toJsonBodyOrNull(response);
  return jsonNoStore(data, response.status);
}
