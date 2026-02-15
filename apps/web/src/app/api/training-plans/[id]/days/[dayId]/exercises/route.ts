import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string; dayId: string }> }) {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id, dayId } = await context.params;
  const payload = await request.json();

  const response = await fetch(`${getBackendUrl()}/training-plans/${id}/days/${dayId}/exercises`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: authCookie,
    },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
