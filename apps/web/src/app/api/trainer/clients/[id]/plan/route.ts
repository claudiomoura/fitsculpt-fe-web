import { NextResponse } from "next/server";
import { fetchBackend, readJsonBody } from "../../../../gyms/_proxy";
import { assignPlanToTrainerClient } from "../../../_assignment";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await fetchBackend(`/trainer/members/${id}/training-plan-assignment`);
  return NextResponse.json(result.payload, { status: result.status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const payload = (parsed.body ?? {}) as { trainingPlanId?: unknown; sourceTrainingPlanId?: unknown; templatePlanId?: unknown };
  const trainingPlanId = asText(payload.trainingPlanId) || asText(payload.sourceTrainingPlanId) || asText(payload.templatePlanId);

  if (!trainingPlanId) {
    return NextResponse.json(
      {
        code: "INVALID_PAYLOAD",
        message: "trainingPlanId is required",
      },
      { status: 400 },
    );
  }

  const result = await assignPlanToTrainerClient(id, { trainingPlanId });
  return NextResponse.json(result.payload, { status: result.status });
}

export async function DELETE() {
  return NextResponse.json(
    {
      code: "NOT_SUPPORTED",
      message: "Unassigning trainer client plans is not supported by backend yet.",
    },
    { status: 405 },
  );
}
