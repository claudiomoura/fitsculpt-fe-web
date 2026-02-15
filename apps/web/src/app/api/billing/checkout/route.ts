import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

export async function POST(request: Request) {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  try {
    const response = await fetch(`${getBackendUrl()}/billing/checkout`, {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
