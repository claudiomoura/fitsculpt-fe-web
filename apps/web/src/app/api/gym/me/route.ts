import { NextResponse } from "next/server";
import { normalizeMembershipPayload } from "@/lib/gym-contracts";
import { contractDriftResponse, validateMembershipPayload } from "@/lib/runtimeContracts";
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

  const normalized = normalizeMembershipPayload(result.payload);
  const validation = validateMembershipPayload(normalized);

  if (!validation.ok) {
    return NextResponse.json(contractDriftResponse("/gym/me", validation.reason ?? "UNKNOWN"), { status: 502 });
  }

  return NextResponse.json({ data: normalized }, { status: result.status });
}

export async function DELETE() {
  let result = await fetchBackend("/gym/me", { method: "DELETE" });
  if (result.status === 404 || result.status === 405) {
    console.warn("[BFF][gym/me] fallback to /gyms/membership delete due to unsupported backend endpoint", {
      status: result.status,
    });
    result = await fetchBackend("/gyms/membership", { method: "DELETE" });
  }

  if (result.status === 404 || result.status === 405) {
    return NextResponse.json({ error: "FEATURE_NOT_AVAILABLE_IN_BETA" }, { status: 403 });
  }

  return NextResponse.json(result.payload, { status: result.status });
}
