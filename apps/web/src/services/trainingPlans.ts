import type { TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";
import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";

type TrainingPlansListPayload = {
  items?: TrainingPlanListItem[];
  total?: number;
};

export type ListMyTrainingPlansResult = {
  items: TrainingPlanListItem[];
  total?: number;
};

export type ActiveTrainingPlanPayload = {
  source: "assigned" | "own";
  plan: TrainingPlanDetail;
};

function asList(payload: TrainingPlansListPayload): TrainingPlanListItem[] {
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function listMyTrainingPlans(query?: {
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<ServiceResult<ListMyTrainingPlansResult>> {
  const search = new URLSearchParams();
  if (query?.query?.trim()) search.set("query", query.query.trim());
  if (typeof query?.limit === "number") search.set("limit", String(query.limit));
  if (typeof query?.offset === "number") search.set("offset", String(query.offset));

  const path = search.size > 0 ? `/api/training-plans?${search.toString()}` : "/api/training-plans";
  const result = await requestJson<TrainingPlansListPayload>(path);
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      items: asList(result.data),
      total: typeof result.data.total === "number" ? result.data.total : undefined,
    },
  };
}

export async function getActiveTrainingPlan(includeDays = true): Promise<ServiceResult<ActiveTrainingPlanPayload>> {
  const search = new URLSearchParams();
  if (includeDays) search.set("includeDays", "1");

  const path = search.size > 0 ? `/api/training-plans/active?${search.toString()}` : "/api/training-plans/active";
  return requestJson<ActiveTrainingPlanPayload>(path);
}

export async function setActiveTrainingPlan(planId: string): Promise<ServiceResult<null>> {
  if (!planId.trim()) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "Plan id is required.",
      fieldErrors: { planId: "Plan id is required." },
    };
  }

  return {
    ok: false,
    reason: "notSupported",
    status: 501,
    message: "Requires backend implementation: set active training plan endpoint is not available.",
  };
}
