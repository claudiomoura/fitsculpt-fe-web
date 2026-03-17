import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = (await cookies()).get("fs_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);

  try {
    const response = await fetch(`${getBackendUrl()}/ai/quota?${url.searchParams.toString()}`, {
      headers: { cookie: `fs_token=${token}` },
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (_err) {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
