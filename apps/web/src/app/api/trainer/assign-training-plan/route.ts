import { NextResponse } from "next/server";
import { readJsonBody } from "../../gyms/_proxy";
import { assignPlanToTrainerClient } from "../_assignment";

type AssignPayload = {
  clientId?: unknown;
  sourceTrainingPlanId?: unknown;
  trainingPlanId?: unknown;
  templatePlanId?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const payload = (parsed.body ?? {}) as AssignPayload;
  const clientId = asString(payload.clientId);
  const trainingPlanId =
    asString(payload.trainingPlanId) || asString(payload.sourceTrainingPlanId) || asString(payload.templatePlanId);

  if (!clientId || !trainingPlanId) {
    return NextResponse.json(
      {
        code: "INVALID_PAYLOAD",
        message: "clientId and trainingPlanId are required",
      },
      { status: 400 },
    );
  }

  const result = await assignPlanToTrainerClient(clientId, { trainingPlanId });
  return NextResponse.json(result.payload, { status: result.status });
}
