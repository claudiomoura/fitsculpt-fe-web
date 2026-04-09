import { NextResponse } from "next/server";
import { fetchBackend } from "@/app/api/gyms/_proxy";
import { buildWeeklyCoachWeeklyState } from "@/lib/weeklyAdaptiveCoachScaffold";

export const dynamic = "force-dynamic";

type SummaryEntry = {
  ok: boolean;
  status: number;
  data: unknown;
};

type NutritionPlansPayload = {
  items?: Array<{ id?: string }>;
};

function toEntry(status: number, payload: unknown): SummaryEntry {
  return {
    ok: status >= 200 && status < 300,
    status,
    data: payload,
  };
}

function getNutritionPlanId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const items = (payload as NutritionPlansPayload).items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const id = items[0]?.id;
  return typeof id === "string" && id.trim().length > 0 ? id : null;
}

export async function GET(request: Request) {
  const [tracking, activeTraining, nutritionList, authMe, profile] = await Promise.all([
    fetchBackend("/tracking", { request }),
    fetchBackend("/training-plans/active?includeDays=1", { request }),
    fetchBackend("/nutrition-plans?limit=1", { request }),
    fetchBackend("/auth/me", { request }),
    fetchBackend("/profile", { request }),
  ]);

  const nutritionPlanId = getNutritionPlanId(nutritionList.payload);
  let nutritionDetail: SummaryEntry | null = null;
  let weeklyCoach: SummaryEntry | null = null;

  if (nutritionPlanId) {
    const detailResult = await fetchBackend(`/nutrition-plans/${nutritionPlanId}`, { request });
    nutritionDetail = toEntry(detailResult.status, detailResult.payload);
  }

  if (profile.status >= 200 && profile.status < 300) {
    try {
      weeklyCoach = toEntry(
        200,
        buildWeeklyCoachWeeklyState({
          profilePayload: profile.payload,
          trackingPayload: tracking.status >= 200 && tracking.status < 300 ? tracking.payload : undefined,
        }),
      );
    } catch {
      weeklyCoach = toEntry(502, null);
    }
  }

  return NextResponse.json(
    {
      tracking: toEntry(tracking.status, tracking.payload),
      activeTraining: toEntry(activeTraining.status, activeTraining.payload),
      nutritionList: toEntry(nutritionList.status, nutritionList.payload),
      nutritionDetail,
      authMe: toEntry(authMe.status, authMe.payload),
      profile: toEntry(profile.status, profile.payload),
      weeklyCoach,
    },
    { status: 200 },
  );
}
