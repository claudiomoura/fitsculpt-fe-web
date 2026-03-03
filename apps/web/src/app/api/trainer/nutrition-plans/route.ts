import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { proxyToBackend, readJsonBody } from "../../gyms/_proxy";

export async function GET(request: Request) {
  const token = (await cookies()).get("fs_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query ? `/trainer/nutrition-plans?${query}` : "/trainer/nutrition-plans";

  try {
    const response = await fetch(`${getBackendUrl()}${path}`, {
      headers: { cookie: `fs_token=${token}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToBackend("/trainer/nutrition-plans", { method: "POST", body: parsed.body });
}
