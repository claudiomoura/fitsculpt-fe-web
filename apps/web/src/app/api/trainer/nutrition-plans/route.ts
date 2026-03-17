import { NextResponse } from "next/server";
import { fetchBackend, proxyToBackend, readJsonBody } from "../../gyms/_proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query ? `/trainer/nutrition-plans?${query}` : "/trainer/nutrition-plans";

  const result = await fetchBackend(path, { request });
  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  const payload = (result.payload ?? {}) as { items?: unknown[]; plans?: unknown[]; data?: unknown[]; total?: number };
  const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.plans) ? payload.plans : Array.isArray(payload.data) ? payload.data : [];

  return NextResponse.json({ items, ...(typeof payload.total === "number" ? { total: payload.total } : {}) }, { status: result.status });
}

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToBackend("/trainer/nutrition-plans", { method: "POST", body: parsed.body, request });
}
