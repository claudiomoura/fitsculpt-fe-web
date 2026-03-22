import { NextResponse } from "next/server";
import { fetchBackend } from "@/app/api/gyms/_proxy";
import { jsonBffError } from "@/app/api/_utils/normalizeBffError";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => undefined);
  if (payload === undefined) return jsonBffError({ status: 400, type: "validation" });
  const result = await fetchBackend("/tracking/health/snapshots", { method: "POST", body: payload, request });
  if (result.status === 401) return jsonBffError({ status: 401 });
  if (result.status === 400) return jsonBffError({ status: 400, type: "validation" });
  return NextResponse.json(result.payload, { status: result.status });
}
