import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get("fs_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/members/me/assigned-nutrition-plan`, {
      headers: { cookie: `fs_token=${token}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 503 });
  }
}
