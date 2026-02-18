import { NextResponse } from "next/server";
import { normalizeMembershipPayload } from "@/lib/gym-contracts";
import { fetchBackend } from "../../gyms/_proxy";

export async function GET() {
  let result = await fetchBackend("/gym/me");
  if (result.status === 404 || result.status === 405) {
    console.warn("[BFF][gym/me] fallback to /gyms/membership due to unsupported backend endpoint", {
      status: result.status,
    });
    result = await fetchBackend("/gyms/membership");
  }

  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  return NextResponse.json({ data: normalizeMembershipPayload(result.payload) }, { status: result.status });
}

export async function DELETE() {
  console.warn("[BFF][gym/me] delete requested but operation is disabled by contract alignment");
  return NextResponse.json({ error: "UNSUPPORTED_OPERATION", feature: "leave_gym" }, { status: 405 });
}
