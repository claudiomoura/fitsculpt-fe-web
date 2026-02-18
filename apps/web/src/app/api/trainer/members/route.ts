import { NextResponse } from "next/server";
import { normalizeMembersPayload } from "@/lib/gym-contracts";
import { fetchBackend } from "../../gyms/_proxy";

export async function GET() {
  const membership = await fetchBackend("/gyms/membership");

  if (membership.status < 200 || membership.status >= 300) {
    return NextResponse.json(membership.payload, { status: membership.status });
  }

  const source = (membership.payload ?? {}) as { gymId?: string; data?: { gymId?: string } };
  const gymId = source.data?.gymId ?? source.gymId;

  if (!gymId) {
    return NextResponse.json({ code: "GYM_NOT_FOUND", message: "No active gym membership found" }, { status: 404 });
  }

  const membersResult = await fetchBackend(`/admin/gyms/${gymId}/members`);

  if (membersResult.status < 200 || membersResult.status >= 300) {
    return NextResponse.json(membersResult.payload, { status: membersResult.status });
  }

  return NextResponse.json({ data: normalizeMembersPayload(membersResult.payload) }, { status: membersResult.status });
}
