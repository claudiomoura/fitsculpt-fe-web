import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

export async function POST(request: Request) {
  const rawCookie = request.headers.get("cookie");
  const authCookie = rawCookie ?? (await getAuthCookie());
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const response = await fetch(`${getBackendUrl()}/feed/generate`, {
    method: "POST",
    headers: { cookie: authCookie },
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
