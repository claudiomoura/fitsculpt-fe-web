import { NextResponse } from "next/server";
import { fetchBackend } from "@/app/api/gyms/_proxy";
import { jsonBffError } from "@/app/api/_utils/normalizeBffError";
import { contractDriftResponse } from "@/lib/runtimeContracts";
import { buildWeeklyCoachWeeklyState } from "@/lib/weeklyAdaptiveCoachScaffold";

async function loadScaffoldInputs(request: Request) {
  const [profileResult, trackingResult] = await Promise.all([
    fetchBackend("/profile", { request }),
    fetchBackend("/tracking", { request }),
  ]);

  return {
    profileResult,
    trackingPayload: trackingResult.status >= 200 && trackingResult.status < 300 ? trackingResult.payload : undefined,
  };
}

export async function GET(request: Request) {
  const { profileResult, trackingPayload } = await loadScaffoldInputs(request);

  if (profileResult.status === 401) return jsonBffError({ status: 401 });
  if (profileResult.status < 200 || profileResult.status >= 300) return jsonBffError({ status: profileResult.status, type: "upstream" });

  try {
    const payload = buildWeeklyCoachWeeklyState({
      profilePayload: profileResult.payload,
      trackingPayload,
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "WEEKLY_COACH_WEEKLY_STATE_INVALID";
    return NextResponse.json(contractDriftResponse("/weekly-adaptive-coach/state", reason), { status: 502 });
  }
}
