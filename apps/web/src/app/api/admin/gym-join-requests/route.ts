import { NextResponse } from "next/server";
import { normalizeJoinRequestPayload } from "@/lib/gym-contracts";
import { fetchBackend } from "../../gyms/_proxy";

export async function GET() {
  const result = await fetchBackend("/admin/gym-join-requests");

  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  return NextResponse.json({ data: normalizeJoinRequestPayload(result.payload) }, { status: result.status });
}
