import type { TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";
import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";

type TrainingPlanListPayload = {
  items?: TrainingPlanListItem[];
  data?: TrainingPlanListItem[];
  plans?: TrainingPlanListItem[];
  total?: number;
};

export type ListTrainerGymPlansQuery = {
  gymId?: string;
  trainerId?: string;
  query?: string;
  limit?: number;
  offset?: number;
};

export type ListTrainerGymPlansResult = {
  items: TrainingPlanListItem[];
  total?: number;
};

export type CreateTrainerPlanInput = {
  title: string;
  notes?: string;
  goal?: string;
  level?: string;
  focus?: string;
  equipment?: string;
  startDate?: string;
  daysPerWeek?: number;
};

export type SaveTrainerPlanInput = Partial<CreateTrainerPlanInput> & {
  days?: TrainingPlanDetail["days"];
};

export type TrainerPlanCapabilities = {
  canListTrainerGymPlans: boolean;
  canCreateTrainerPlan: boolean;
  canSaveTrainerPlan: boolean;
};

export const trainerPlanCapabilities: TrainerPlanCapabilities = {
  canListTrainerGymPlans: true,
  canCreateTrainerPlan: true,
  canSaveTrainerPlan: false,
};

function getItems(payload: TrainingPlanListPayload): TrainingPlanListItem[] {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.plans)) return payload.plans;
  return [];
}

export async function listTrainerGymPlans(
  query: ListTrainerGymPlansQuery = {},
): Promise<ServiceResult<ListTrainerGymPlansResult>> {
  const search = new URLSearchParams();

  if (query.gymId?.trim()) search.set("gymId", query.gymId.trim());
  if (query.trainerId?.trim()) search.set("trainerId", query.trainerId.trim());
  if (query.query?.trim()) search.set("query", query.query.trim());
  if (typeof query.limit === "number") search.set("limit", String(query.limit));
  if (typeof query.offset === "number") search.set("offset", String(query.offset));

  const path = search.size > 0 ? `/api/training-plans?${search.toString()}` : "/api/training-plans";
  const result = await requestJson<TrainingPlanListPayload>(path);

  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      items: getItems(result.data),
      total: typeof result.data.total === "number" ? result.data.total : undefined,
    },
  };
}

export async function createTrainerPlan(payload: CreateTrainerPlanInput): Promise<ServiceResult<TrainingPlanDetail>> {
  return requestJson<TrainingPlanDetail>("/api/training-plans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function saveTrainerPlan(planId: string, payload: SaveTrainerPlanInput): Promise<ServiceResult<TrainingPlanDetail>> {
  return requestJson<TrainingPlanDetail>(`/api/training-plans/${planId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}
