import { NextResponse } from "next/server";
import { fetchBackend, readJsonBody } from "../../../../gyms/_proxy";
import { assignPlanToTrainerClient } from "../../../_assignment";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await fetchBackend(`/trainer/clients/${id}/assigned-plan`);
  return NextResponse.json(result.payload, { status: result.status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const payload = (parsed.body ?? {}) as { trainingPlanId?: unknown; sourceTrainingPlanId?: unknown; templatePlanId?: unknown };
  const explicitTrainingPlanId = payload.trainingPlanId;
  const normalizedTrainingPlanId =
    explicitTrainingPlanId === null
      ? null
      : asText(explicitTrainingPlanId) || asText(payload.sourceTrainingPlanId) || asText(payload.templatePlanId);

  if (normalizedTrainingPlanId === undefined || normalizedTrainingPlanId === "") {
    return NextResponse.json(
      {
        code: "INVALID_PAYLOAD",
        message: "trainingPlanId is required and can be null to unassign",
      },
      { status: 400 },
    );
  }

  const trainerAssignment = await fetchBackend(`/trainer/clients/${id}/assigned-plan`, {
    method: "POST",
    body: { trainingPlanId: normalizedTrainingPlanId },
  });

  if (trainerAssignment.status !== 404 && trainerAssignment.status !== 405) {
    return NextResponse.json(trainerAssignment.payload, { status: trainerAssignment.status });
  }

  if (typeof normalizedTrainingPlanId !== "string") {
    return NextResponse.json(
      {
        code: "NOT_SUPPORTED",
        message: "Unassigning trainer client plans is not supported by backend yet.",
      },
      { status: 405 },
    );
  }

  const result = await assignPlanToTrainerClient(id, { trainingPlanId: normalizedTrainingPlanId });
  return NextResponse.json(result.payload, { status: result.status });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await fetchBackend(`/trainer/clients/${id}/assigned-plan`, { method: "DELETE" });
  return NextResponse.json(result.payload, { status: result.status });
}
