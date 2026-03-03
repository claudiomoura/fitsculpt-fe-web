import { NextResponse } from "next/server";
import { fetchBackend } from "../../gyms/_proxy";

export const dynamic = "force-dynamic";

type AssignedNutritionPayload = {
  assignedPlan?: unknown;
  trainerAssignedPlan?: unknown;
  plan?: unknown;
  data?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAssignedPlan(payload: unknown) {
  if (!isObject(payload)) return null;

  const direct = payload as AssignedNutritionPayload;
  if (direct.assignedPlan) return direct.assignedPlan;
  if (direct.trainerAssignedPlan) return direct.trainerAssignedPlan;
  if (direct.plan) return direct.plan;

  if (isObject(direct.data)) {
    const nested = direct.data as AssignedNutritionPayload;
    if (nested.assignedPlan) return nested.assignedPlan;
    if (nested.trainerAssignedPlan) return nested.trainerAssignedPlan;
    if (nested.plan) return nested.plan;
    return nested;
  }

  return payload;
}

export async function GET(request: Request) {
  const result = await fetchBackend("/members/me/assigned-nutrition-plan", { request });
  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  const assignedPlan = normalizeAssignedPlan(result.payload);
  return NextResponse.json({ assignedPlan }, { status: result.status });
}
