import { NextResponse } from "next/server";
import { fetchBackend } from "@/app/api/gyms/_proxy";
import { jsonBffError } from "@/app/api/_utils/normalizeBffError";
import { contractDriftResponse } from "@/lib/runtimeContracts";
import { buildWeeklyCoachWeeklyState } from "@/lib/weeklyAdaptiveCoachScaffold";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function normalizeTrackingPersistenceError(status: number) {
  if (status === 401) return jsonBffError({ status: 401 });
  if (status === 400) return jsonBffError({ status: 400, type: "validation" });
  return jsonBffError({ status, type: "upstream" });
}

async function persistWeeklyCoachTracking(request: Request, trackingPayload: unknown) {
  const persistResult = await fetchBackend("/tracking", {
    method: "PUT",
    body: trackingPayload,
    request,
  });

  if (persistResult.status < 200 || persistResult.status >= 300) {
    return normalizeTrackingPersistenceError(persistResult.status);
  }

  return null;
}

function buildTrackingPayloadWithAcceptedAdaptation(trackingPayload: unknown, planWeekId: string, acceptedAt: string) {
  const baseTracking = isRecord(trackingPayload) ? trackingPayload : {};
  const weeklyCoach = isRecord(baseTracking.weeklyCoach) ? baseTracking.weeklyCoach : {};
  const checkIns = isRecord(weeklyCoach.checkIns) ? weeklyCoach.checkIns : {};
  const adaptations = isRecord(weeklyCoach.adaptations) ? weeklyCoach.adaptations : {};
  const currentAdaptation = isRecord(adaptations[planWeekId]) ? adaptations[planWeekId] : null;

  if (!currentAdaptation) {
    return null;
  }

  return {
    ...baseTracking,
    weeklyCoach: {
      ...weeklyCoach,
      checkIns,
      adaptations: {
        ...adaptations,
        [planWeekId]: {
          ...currentAdaptation,
          acceptedAt,
        },
      },
    },
  };
}

export async function POST(request: Request) {
  const { profileResult, trackingResult, trackingPayload } = await loadScaffoldInputs(request);

  if (profileResult.status === 401) return jsonBffError({ status: 401 });
  if (profileResult.status < 200 || profileResult.status >= 300) return jsonBffError({ status: profileResult.status, type: "upstream" });
  if (trackingResult.status === 401) return jsonBffError({ status: 401 });
  if (trackingResult.status < 200 || trackingResult.status >= 300) return jsonBffError({ status: trackingResult.status, type: "upstream" });

  try {
    const currentState = buildWeeklyCoachWeeklyState({
      profilePayload: profileResult.payload,
      trackingPayload,
    });

    if (!currentState.currentWeek || !currentState.latestAdaptationSummary) {
      return jsonBffError({ status: 400, type: "validation" });
    }

    if (currentState.currentWeek.acceptedAt) {
      return NextResponse.json(currentState, { status: 200 });
    }

    const acceptedAt = new Date().toISOString();
    const nextTrackingPayload = buildTrackingPayloadWithAcceptedAdaptation(
      trackingPayload,
      currentState.currentWeek.planWeekId,
      acceptedAt,
    );

    if (!nextTrackingPayload) {
      return jsonBffError({ status: 400, type: "validation" });
    }

    const persistError = await persistWeeklyCoachTracking(request, nextTrackingPayload);
    if (persistError) return persistError;

    const responsePayload = buildWeeklyCoachWeeklyState({
      profilePayload: profileResult.payload,
      trackingPayload: nextTrackingPayload,
    });
    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "WEEKLY_COACH_WEEKLY_STATE_INVALID";
    return NextResponse.json(contractDriftResponse("/weekly-adaptive-coach/adaptation-review", reason), { status: 502 });
  }
}
