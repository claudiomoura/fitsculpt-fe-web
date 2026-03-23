import { NextResponse } from "next/server";
import { fetchBackend } from "@/app/api/gyms/_proxy";
import { jsonBffError } from "@/app/api/_utils/normalizeBffError";

export async function GET(request?: Request) {
  const result = await fetchBackend("/tracking/health", { request });
  if (result.status === 401) return jsonBffError({ status: 401 });
  return NextResponse.json(result.payload, { status: result.status });
}

export async function PUT(request: Request) {
  const payload = await request.json().catch(() => undefined);
  if (payload === undefined) return jsonBffError({ status: 400, type: "validation" });
  const result = await fetchBackend("/tracking/health", { method: "PUT", body: payload, request });
  if (result.status === 401) return jsonBffError({ status: 401 });
  if (result.status === 400) return jsonBffError({ status: 400, type: "validation" });
  return NextResponse.json(result.payload, { status: result.status });
}
