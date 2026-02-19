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

export async function GET() {
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

  let response: Response;
  try {
    response = await fetch(`${backendUrl}/billing/plans`, {
      headers: { cookie: `fs_token=${token}` },
      cache: "no-store",
    });
  } catch {
    return jsonNoStore({ error: "BACKEND_UNAVAILABLE" }, 502);
  }

  const data: unknown = await response.json().catch(() => null);
  return jsonNoStore(data, response.status);
}
