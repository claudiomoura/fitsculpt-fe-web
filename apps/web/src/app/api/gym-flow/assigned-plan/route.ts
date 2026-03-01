import { NextResponse } from "next/server";
import { proxyToBackend } from "../../gyms/_proxy";
import { parseBodyAsRecord, pickMemberId, pickTrainingPlanId, requireJsonBody } from "../_shared";

function memberIdFromSearchParams(request: Request): string {
  const { searchParams } = new URL(request.url);
  return searchParams.get("memberId")?.trim() ?? searchParams.get("userId")?.trim() ?? "";
}

export async function GET(request: Request) {
  const memberId = memberIdFromSearchParams(request);
  if (!memberId) {
    return NextResponse.json({ code: "INVALID_QUERY", message: "memberId query param is required" }, { status: 400 });
  }

  return proxyToBackend(`/trainer/clients/${memberId}/assigned-plan`);
}

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

  return proxyToBackend(`/trainer/clients/${memberId}/assigned-plan`, {
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

  return proxyToBackend(`/trainer/clients/${memberId}/assigned-plan`, { method: "DELETE" });
}
