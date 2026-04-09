import { NextResponse } from "next/server";
import { fetchBackend, readJsonBody } from "@/app/api/gyms/_proxy";
import { jsonBffError } from "@/app/api/_utils/normalizeBffError";
import { contractDriftResponse } from "@/lib/runtimeContracts";
import { parseWeeklyCoachCheckInAnswers, parseWeeklyCoachCheckInSubmitRequest } from "@/lib/weeklyAdaptiveCoachContracts";
import {
  buildWeeklyCoachCheckInDraft,
  buildWeeklyCoachSavedCheckInDraft,
  buildWeeklyCoachSubmittedCheckIn,
} from "@/lib/weeklyAdaptiveCoachScaffold";

async function loadScaffoldInputs(request: Request) {
  const [profileResult, trackingResult] = await Promise.all([
    fetchBackend("/profile", { request }),
    fetchBackend("/tracking", { request }),
  ]);

  return {
    profileResult,
    trackingResult,
    trackingPayload: trackingResult.status >= 200 && trackingResult.status < 300 ? trackingResult.payload : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildTrackingPayloadWithPersistedCheckIn(trackingPayload: unknown, payload: unknown, planWeekId: string) {
  const baseTracking = isRecord(trackingPayload) ? trackingPayload : {};
  const weeklyCoach = isRecord(baseTracking.weeklyCoach) ? baseTracking.weeklyCoach : {};
  const checkIns = isRecord(weeklyCoach.checkIns) ? weeklyCoach.checkIns : {};

  return {
    ...baseTracking,
    weeklyCoach: {
      ...weeklyCoach,
      checkIns: {
        ...checkIns,
        [planWeekId]: payload,
      },
    },
  };
}

function normalizeTrackingPersistenceError(status: number) {
  if (status === 401) return jsonBffError({ status: 401 });
  if (status === 400) return jsonBffError({ status: 400, type: "validation" });
  return jsonBffError({ status, type: "upstream" });
}

async function persistCheckInResponse(request: Request, trackingPayload: unknown, payload: ReturnType<typeof buildWeeklyCoachCheckInDraft>) {
  const nextTrackingPayload = buildTrackingPayloadWithPersistedCheckIn(trackingPayload, payload, payload.weekContext.planWeekId);
  const persistResult = await fetchBackend("/tracking", {
    method: "PUT",
    body: nextTrackingPayload,
    request,
  });

  if (persistResult.status < 200 || persistResult.status >= 300) {
    return normalizeTrackingPersistenceError(persistResult.status);
  }

  return null;
}

export async function GET(request: Request) {
  const { profileResult, trackingPayload } = await loadScaffoldInputs(request);

  if (profileResult.status === 401) return jsonBffError({ status: 401 });
  if (profileResult.status < 200 || profileResult.status >= 300) return jsonBffError({ status: profileResult.status, type: "upstream" });

  try {
    const payload = buildWeeklyCoachCheckInDraft({
      profilePayload: profileResult.payload,
      trackingPayload,
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "WEEKLY_COACH_CHECKIN_DRAFT_INVALID";
    return NextResponse.json(contractDriftResponse("/weekly-adaptive-coach/check-in", reason), { status: 502 });
  }
}

export async function POST(request: Request) {
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const submitRequest = parseWeeklyCoachCheckInSubmitRequest(parsedBody.body);
  if (!submitRequest) return jsonBffError({ status: 400, type: "validation" });

  const { profileResult, trackingResult, trackingPayload } = await loadScaffoldInputs(request);

  if (profileResult.status === 401) return jsonBffError({ status: 401 });
  if (profileResult.status < 200 || profileResult.status >= 300) return jsonBffError({ status: profileResult.status, type: "upstream" });
  if (trackingResult.status === 401) return jsonBffError({ status: 401 });
  if (trackingResult.status < 200 || trackingResult.status >= 300) return jsonBffError({ status: trackingResult.status, type: "upstream" });

  try {
    const payload = buildWeeklyCoachSubmittedCheckIn(submitRequest, {
      profilePayload: profileResult.payload,
      trackingPayload,
    });

    const persistError = await persistCheckInResponse(request, trackingPayload, payload);
    if (persistError) return persistError;

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "WEEKLY_COACH_CHECKIN_SUBMIT_RESPONSE_INVALID";
    return NextResponse.json(contractDriftResponse("/weekly-adaptive-coach/check-in", reason), { status: 502 });
  }
}

export async function PUT(request: Request) {
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const draftAnswers = parseWeeklyCoachCheckInAnswers(parsedBody.body);
  if (!draftAnswers) return jsonBffError({ status: 400, type: "validation" });

  const { profileResult, trackingResult, trackingPayload } = await loadScaffoldInputs(request);

  if (profileResult.status === 401) return jsonBffError({ status: 401 });
  if (profileResult.status < 200 || profileResult.status >= 300) return jsonBffError({ status: profileResult.status, type: "upstream" });
  if (trackingResult.status === 401) return jsonBffError({ status: 401 });
  if (trackingResult.status < 200 || trackingResult.status >= 300) return jsonBffError({ status: trackingResult.status, type: "upstream" });

  try {
    const payload = buildWeeklyCoachSavedCheckInDraft(draftAnswers, {
      profilePayload: profileResult.payload,
      trackingPayload,
    });

    const persistError = await persistCheckInResponse(request, trackingPayload, payload);
    if (persistError) return persistError;

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "WEEKLY_COACH_CHECKIN_DRAFT_INVALID";
    return NextResponse.json(contractDriftResponse("/weekly-adaptive-coach/check-in", reason), { status: 502 });
  }
}
