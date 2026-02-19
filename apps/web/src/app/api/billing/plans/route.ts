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

  const response = await fetch(`${getBackendUrl()}/billing/plans`, {
    headers: { cookie: `fs_token=${token}` },
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return jsonNoStore({ error: "BACKEND_UNAVAILABLE" }, 502);
  }

  const data: unknown = await response.json().catch(() => null);

  if (response.status === 404) {
    return jsonNoStore({ error: "BILLING_NOT_AVAILABLE", plans: [] }, 501);
  }

  if (response.status === 401 || response.status === 403 || response.status === 200) {
    return jsonNoStore(data, response.status);
  }

  return jsonNoStore(data, response.status);
}
