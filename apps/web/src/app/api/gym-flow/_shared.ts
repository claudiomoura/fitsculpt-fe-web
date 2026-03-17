import { NextResponse } from "next/server";
import { fetchBackend, readJsonBody, type ProxyResult } from "../gyms/_proxy";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function requireJsonBody(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed;
  return parsed;
}

export function parseBodyAsRecord(body: unknown): Record<string, unknown> {
  return isRecord(body) ? body : {};
}

export function pickMemberId(payload: Record<string, unknown>): string {
  return (
    asString(payload.memberId) ||
    asString(payload.userId) ||
    asString(payload.clientId) ||
    asString(payload.id)
  );
}

export function pickTrainingPlanId(payload: Record<string, unknown>): string {
  return asString(payload.trainingPlanId) || asString(payload.planId) || asString(payload.templatePlanId);
}

export function pickMembershipId(payload: Record<string, unknown>): string {
  return asString(payload.membershipId) || asString(payload.id);
}

export function pickApproveAction(payload: Record<string, unknown>): "accept" | "reject" | "" {
  const action = asString(payload.action).toLowerCase();
  return action === "accept" || action === "reject" ? action : "";
}

export async function resolveGymId(): Promise<ProxyResult | { gymId: string }> {
  const membership = await fetchBackend("/gyms/membership");

  if (membership.status < 200 || membership.status >= 300) {
    return membership;
  }

  const source = isRecord(membership.payload) ? membership.payload : {};
  const data = isRecord(source.data) ? source.data : source;
  const gymId = asString(data.gymId);

  if (!gymId) {
    return {
      status: 404,
      payload: {
        code: "GYM_NOT_FOUND",
        message: "No active gym membership found",
      },
    };
  }

  return { gymId };
}

export function jsonFromResult(result: ProxyResult) {
  return NextResponse.json(result.payload, { status: result.status });
}
