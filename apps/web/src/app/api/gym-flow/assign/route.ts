import { NextResponse } from "next/server";
import { proxyToBackend } from "../../gyms/_proxy";
import { parseBodyAsRecord, pickMemberId, pickTrainingPlanId, requireJsonBody } from "../_shared";

export async function POST(request: Request) {
  const parsed = await requireJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const body = parseBodyAsRecord(parsed.body);
  const memberId = pickMemberId(body);
  const trainingPlanId = pickTrainingPlanId(body);

  if (!memberId || !trainingPlanId) {
    return NextResponse.json(
      { code: "INVALID_PAYLOAD", message: "memberId and trainingPlanId are required" },
      { status: 400 },
    );
  }

  return proxyToBackend(`/trainer/members/${memberId}/training-plan-assignment`, {
    method: "POST",
    body: { trainingPlanId },
  });
}

export async function DELETE(request: Request) {
  const parsed = await requireJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const body = parseBodyAsRecord(parsed.body);
  const memberId = pickMemberId(body);

  if (!memberId) {
    return NextResponse.json({ code: "INVALID_PAYLOAD", message: "memberId is required" }, { status: 400 });
  }

  return proxyToBackend(`/trainer/members/${memberId}/training-plan-assignment`, { method: "DELETE" });
}
