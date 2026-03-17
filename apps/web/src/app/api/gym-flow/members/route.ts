import { NextResponse } from "next/server";
import { normalizeMembersPayload } from "@/lib/gym-contracts";
import { fetchBackend } from "../../gyms/_proxy";
import { jsonFromResult, resolveGymId } from "../_shared";

export async function GET() {
  const gym = await resolveGymId();
  if ("status" in gym) return jsonFromResult(gym);

  const result = await fetchBackend(`/admin/gyms/${gym.gymId}/members`);

  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  return NextResponse.json({ data: normalizeMembersPayload(result.payload) }, { status: result.status });
}
