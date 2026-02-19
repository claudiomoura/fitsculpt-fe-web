import { NextResponse } from "next/server";
import { proxyToBackend } from "../../../../gyms/_proxy";

function normalizeAction(action: string): "accept" | "reject" | null {
  if (action === "accept" || action === "reject") return action;
  return null;
}

export async function POST(_request: Request, context: { params: Promise<{ membershipId: string; action: string }> }) {
  const { membershipId, action } = await context.params;

  const normalizedMembershipId = membershipId.trim();
  const normalizedAction = normalizeAction(action.trim().toLowerCase());

  if (!normalizedMembershipId || !normalizedAction) {
    return NextResponse.json({ code: "INVALID_ACTION", message: "Action must be accept or reject" }, { status: 400 });
  }

  return proxyToBackend(`/admin/gym-join-requests/${normalizedMembershipId}/${normalizedAction}`, {
    method: "POST",
  });
}
