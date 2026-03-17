import { NextResponse } from "next/server";
import { fetchBackend } from "../../gyms/_proxy";
import { parseBodyAsRecord, pickApproveAction, pickMembershipId, requireJsonBody } from "../_shared";

export async function POST(request: Request) {
  const parsed = await requireJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const body = parseBodyAsRecord(parsed.body);
  const membershipId = pickMembershipId(body);
  const action = pickApproveAction(body);

  if (!membershipId || !action) {
    return NextResponse.json(
      { code: "INVALID_PAYLOAD", message: "membershipId and action (accept|reject) are required" },
      { status: 400 },
    );
  }

  const result = await fetchBackend(`/admin/gym-join-requests/${membershipId}/${action}`, { method: "POST" });
  return NextResponse.json(result.payload, { status: result.status });
}
