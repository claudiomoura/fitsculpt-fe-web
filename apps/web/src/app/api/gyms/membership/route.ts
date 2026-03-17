import { NextResponse } from "next/server";
import { fetchBackend, proxyToBackend } from "../_proxy";

export async function GET() {
  return proxyToBackend("/gyms/membership");
}

export async function DELETE() {
  const result = await fetchBackend("/gyms/membership", { method: "DELETE" });

  if (result.status === 404 || result.status === 405) {
    console.warn("[BFF][gyms/membership] leave gym unsupported by backend", { status: result.status });
    return NextResponse.json({ error: "FEATURE_NOT_AVAILABLE_IN_BETA" }, { status: 403 });
  }

  return NextResponse.json(result.payload, { status: result.status });
}
