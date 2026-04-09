import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";
import {
  parseWeeklyCoachCheckInAnswers,
  parseWeeklyCoachCheckInDraftResponse,
  parseWeeklyCoachCheckInSubmitRequest,
  parseWeeklyCoachWeeklyStateResponse,
} from "@/lib/weeklyAdaptiveCoachContracts";
import type {
  WeeklyCoachCheckInAnswers,
  WeeklyCoachCheckInDraftResponse,
  WeeklyCoachCheckInSubmitRequest,
  WeeklyCoachWeeklyStateResponse,
} from "@/types/weeklyAdaptiveCoach";

export async function getWeeklyCoachState(): Promise<ServiceResult<WeeklyCoachWeeklyStateResponse>> {
  const result = await requestJson<unknown>("/api/weekly-adaptive-coach/state");
  if (!result.ok) return result;

  const payload = parseWeeklyCoachWeeklyStateResponse(result.data);
  if (!payload) {
    return { ok: false, reason: "invalidResponse", message: "Weekly coach state response does not match expected contract." };
  }

  return { ok: true, data: payload };
}

export async function getWeeklyCoachCheckInDraft(): Promise<ServiceResult<WeeklyCoachCheckInDraftResponse>> {
  const result = await requestJson<unknown>("/api/weekly-adaptive-coach/check-in");
  if (!result.ok) return result;

  const payload = parseWeeklyCoachCheckInDraftResponse(result.data);
  if (!payload) {
    return { ok: false, reason: "invalidResponse", message: "Weekly coach check-in draft does not match expected contract." };
  }

  return { ok: true, data: payload };
}

export async function saveWeeklyCoachCheckInDraft(
  payload: WeeklyCoachCheckInAnswers,
): Promise<ServiceResult<WeeklyCoachCheckInDraftResponse>> {
  if (!parseWeeklyCoachCheckInAnswers(payload)) {
    return { ok: false, reason: "validation", message: "Weekly coach check-in draft does not match expected contract." };
  }

  const result = await requestJson<unknown>("/api/weekly-adaptive-coach/check-in", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!result.ok) return result;

  const responsePayload = parseWeeklyCoachCheckInDraftResponse(result.data);
  if (!responsePayload) {
    return { ok: false, reason: "invalidResponse", message: "Weekly coach draft save response does not match expected contract." };
  }

  return { ok: true, data: responsePayload };
}

export async function submitWeeklyCoachCheckIn(
  payload: WeeklyCoachCheckInSubmitRequest,
): Promise<ServiceResult<WeeklyCoachCheckInDraftResponse>> {
  if (!parseWeeklyCoachCheckInSubmitRequest(payload)) {
    return { ok: false, reason: "validation", message: "Weekly coach check-in payload does not match expected contract." };
  }

  const result = await requestJson<unknown>("/api/weekly-adaptive-coach/check-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!result.ok) return result;

  const responsePayload = parseWeeklyCoachCheckInDraftResponse(result.data);
  if (!responsePayload) {
    return { ok: false, reason: "invalidResponse", message: "Weekly coach submit response does not match expected contract." };
  }

  return { ok: true, data: responsePayload };
}
