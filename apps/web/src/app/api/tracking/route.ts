import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

export async function GET() {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/tracking`, {
      headers: { cookie: authCookie },
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (_err) {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  return writeTracking(request, "PUT");
}

export async function POST(request: Request) {
  return writeTracking(request, "POST");
}

async function writeTracking(request: Request, method: "PUT" | "POST") {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json();
  try {
    const response = await fetch(`${getBackendUrl()}/tracking`, {
      method,
      headers: {
        "Content-Type": "application/json",
        cookie: authCookie,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (_err) {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
