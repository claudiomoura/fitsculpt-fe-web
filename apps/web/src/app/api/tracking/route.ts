import { NextResponse } from "next/server";
import { fetchBackend } from "@/app/api/gyms/_proxy";
import { jsonBffError } from "@/app/api/_utils/normalizeBffError";
import { contractDriftResponse, validateTrackingSnapshot } from "@/lib/runtimeContracts";

function maybeValidateTrackingPayload(status: number, payload: unknown): NextResponse | null {
  if (status < 200 || status >= 300) return null;
  const validation = validateTrackingSnapshot(payload);
  if (validation.ok) return null;
  return NextResponse.json(contractDriftResponse("/tracking", validation.reason ?? "TRACKING_INVALID_PAYLOAD"), { status: 502 });
}

function normalizeTrackingError(status: number): NextResponse | null {
  if (status === 401) return jsonBffError({ status: 401 });
  if (status === 400) return jsonBffError({ status: 400, type: "validation" });
  if (status >= 500) return jsonBffError({ status, type: "upstream" });
  return null;
}

export async function GET(request?: Request) {
  const result = await fetchBackend("/tracking", { request });
  const normalizedError = normalizeTrackingError(result.status);
  if (normalizedError) return normalizedError;
  const contractError = maybeValidateTrackingPayload(result.status, result.payload);
  if (contractError) return contractError;
  return NextResponse.json(result.payload, { status: result.status });
}

export async function PUT(request: Request) {
  const payload = await request.json().catch(() => undefined);
  if (payload === undefined) {
    return jsonBffError({ status: 400, type: "validation" });
  }
  const result = await fetchBackend("/tracking", { method: "PUT", body: payload, request });
  const normalizedError = normalizeTrackingError(result.status);
  if (normalizedError) return normalizedError;
  const contractError = maybeValidateTrackingPayload(result.status, result.payload);
  if (contractError) return contractError;
  return NextResponse.json(result.payload, { status: result.status });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => undefined);
  if (payload === undefined) {
    return jsonBffError({ status: 400, type: "validation" });
  }
  const result = await fetchBackend("/tracking", { method: "POST", body: payload, request });
  const normalizedError = normalizeTrackingError(result.status);
  if (normalizedError) return normalizedError;
  const contractError = maybeValidateTrackingPayload(result.status, result.payload);
  if (contractError) return contractError;
  return NextResponse.json(result.payload, { status: result.status });
}
