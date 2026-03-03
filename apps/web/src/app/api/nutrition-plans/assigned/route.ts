import { NextResponse } from "next/server";
import { fetchBackend } from "../../gyms/_proxy";

export const dynamic = "force-dynamic";

type AssignedNutritionPlanResponse = {
  assignedNutritionPlan?: {
    nutritionPlan?: unknown;
  } | null;
  assignedPlan?: {
    nutritionPlan?: unknown;
  } | unknown;
};

export async function GET() {
  const result = await fetchBackend("/members/me/assigned-nutrition-plan");

  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  const payload = (result.payload ?? null) as AssignedNutritionPlanResponse | null;

  const nestedAssignedPlan =
    payload?.assignedNutritionPlan?.nutritionPlan ??
    (typeof payload?.assignedPlan === "object" && payload?.assignedPlan !== null
      ? (payload.assignedPlan as { nutritionPlan?: unknown }).nutritionPlan ?? payload.assignedPlan
      : null);

  return NextResponse.json({ assignedPlan: nestedAssignedPlan });
}
