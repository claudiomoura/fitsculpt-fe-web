import { NextResponse } from "next/server";
import { fetchBackend, proxyToBackend, readJsonBody } from "../../gyms/_proxy";

type TrainingPlanListPayload = {
  items?: unknown[];
  data?: unknown[];
  plans?: unknown[];
  total?: number;
};

function extractItems(payload: unknown): unknown[] {
  const source = (payload ?? {}) as TrainingPlanListPayload;
  if (Array.isArray(source.items)) return source.items;
  if (Array.isArray(source.data)) return source.data;
  if (Array.isArray(source.plans)) return source.plans;
  return [];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query ? `/trainer/plans?${query}` : "/trainer/plans";

  const result = await fetchBackend(path);
  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  const payload = (result.payload ?? {}) as TrainingPlanListPayload;

  return NextResponse.json(
    {
      items: extractItems(payload),
      ...(typeof payload.total === "number" ? { total: payload.total } : {}),
    },
    { status: result.status },
  );
}

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  return proxyToBackend("/trainer/plans", { method: "POST", body: parsed.body });
}
