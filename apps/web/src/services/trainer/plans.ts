import { fetchMyGymMembership } from "@/services/gym";
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
  supportsBatchAdd: boolean;
};

export type AddExerciseToPlanDayInput = {
  planId: string;
  dayId: string;
  exerciseId: string;
  athleteUserId?: string;
};

export type AddExerciseToPlanDayResult = {
  planId: string;
  dayId: string;
  exerciseId: string;
};

export type MultiAddExerciseItemInput = {
  dayId: string;
  exerciseId: string;
  athleteUserId?: string;
};

export type MultiAddExerciseItemResult = {
  dayId: string;
  exerciseId: string;
  ok: boolean;
  reason?: "validation" | "forbidden" | "httpError" | "networkError" | "notSupported" | "unauthorized" | "invalidResponse";
  status?: number;
  message?: string;
};

export type MultiAddExerciseToPlanResult = {
  mode: "sequential";
  total: number;
  successCount: number;
  failureCount: number;
  results: MultiAddExerciseItemResult[];
};

export const trainerPlanCapabilities: TrainerPlanCapabilities = {
  canListTrainerGymPlans: true,
  canCreateTrainerPlan: true,
  canSaveTrainerPlan: true,
  supportsBatchAdd: false,
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

  const path = search.size > 0 ? `/api/trainer/plans?${search.toString()}` : "/api/trainer/plans";
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
  const normalizedDaysPerWeek = typeof payload.daysPerWeek === "number"
    ? Math.max(1, Math.min(7, payload.daysPerWeek))
    : undefined;

  return requestJson<TrainingPlanDetail>("/api/trainer/plans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...payload,
      ...(normalizedDaysPerWeek ? { daysPerWeek: normalizedDaysPerWeek, daysCount: normalizedDaysPerWeek } : {}),
    }),
  });
}

export async function getTrainerPlanDetail(planId: string): Promise<ServiceResult<TrainingPlanDetail>> {
  const normalizedPlanId = planId.trim();
  if (!normalizedPlanId) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "Plan id is required.",
      fieldErrors: { planId: "Plan id is required." },
    };
  }

  return requestJson<TrainingPlanDetail>(`/api/trainer/plans/${normalizedPlanId}`);
}

export async function saveTrainerPlan(planId: string, payload: SaveTrainerPlanInput): Promise<ServiceResult<TrainingPlanDetail>> {
  return requestJson<TrainingPlanDetail>(`/api/trainer/plans/${planId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function addExerciseToPlanDay(
  input: AddExerciseToPlanDayInput,
): Promise<ServiceResult<AddExerciseToPlanDayResult>> {
  const planId = input.planId.trim();
  const dayId = input.dayId.trim();
  const exerciseId = input.exerciseId.trim();

  if (!planId || !dayId || !exerciseId) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "Plan, day and exercise are required.",
      fieldErrors: {
        ...(!planId ? { planId: "Plan is required." } : {}),
        ...(!dayId ? { dayId: "Day is required." } : {}),
        ...(!exerciseId ? { exerciseId: "Exercise is required." } : {}),
      },
    };
  }

  const result = await requestJson<unknown>(`/api/trainer/plans/${planId}/days/${dayId}/exercises`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      exerciseId,
      ...(input.athleteUserId?.trim() ? { athleteUserId: input.athleteUserId.trim() } : {}),
    }),
  });

  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      planId,
      dayId,
      exerciseId,
    },
  };
}

export async function addExerciseToMultiplePlanDays(
  planId: string,
  items: MultiAddExerciseItemInput[],
): Promise<ServiceResult<MultiAddExerciseToPlanResult>> {
  const normalizedPlanId = planId.trim();
  if (!normalizedPlanId || items.length === 0) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "Plan and at least one target day are required.",
      fieldErrors: {
        ...(!normalizedPlanId ? { planId: "Plan is required." } : {}),
        ...(items.length === 0 ? { items: "At least one item is required." } : {}),
      },
    };
  }

  const results: MultiAddExerciseItemResult[] = [];

  for (const item of items) {
    const itemResult = await addExerciseToPlanDay({
      planId: normalizedPlanId,
      dayId: item.dayId,
      exerciseId: item.exerciseId,
      athleteUserId: item.athleteUserId,
    });

    if (itemResult.ok) {
      results.push({ dayId: item.dayId, exerciseId: item.exerciseId, ok: true });
      continue;
    }

    results.push({
      dayId: item.dayId,
      exerciseId: item.exerciseId,
      ok: false,
      reason: itemResult.reason,
      status: itemResult.status,
      message: itemResult.message ?? itemResult.formError,
    });
  }

  const successCount = results.filter((entry) => entry.ok).length;

  return {
    ok: true,
    data: {
      mode: "sequential",
      total: results.length,
      successCount,
      failureCount: results.length - successCount,
      results,
    },
  };
}

export type TrainerPlanEndpointInventory = {
  endpoint: string;
  method: "GET" | "POST" | "PATCH";
  exists: boolean;
  notes: string;
};

export const trainerPlanEndpointInventory: TrainerPlanEndpointInventory[] = [
  {
    endpoint: "/api/trainer/plans",
    method: "GET",
    exists: true,
    notes: "Used for listing trainer plans scoped by backend membership checks (/trainer/plans).",
  },
  {
    endpoint: "/api/trainer/plans",
    method: "POST",
    exists: true,
    notes: "Used for creating plans.",
  },
  {
    endpoint: "/api/trainer/plans/:id",
    method: "PATCH",
    exists: true,
    notes: "Used for patching trainer-owned plans through backend /trainer/plans/:planId.",
  },
  {
    endpoint: "/api/trainer/plans/:id/days/:dayId/exercises",
    method: "POST",
    exists: true,
    notes: "Single add-to-plan exercise endpoint.",
  },
  {
    endpoint: "/api/trainer/plans/:id/days/exercises:batch",
    method: "POST",
    exists: false,
    notes: "Requiere implementación para batch add; servicio usa fallback secuencial con progreso por item.",
  },
];


export async function listCurrentGymTrainerPlans(
  query: Omit<ListTrainerGymPlansQuery, "gymId"> = {},
): Promise<ServiceResult<ListTrainerGymPlansResult>> {
  const membershipResult = await fetchMyGymMembership();
  if (!membershipResult.ok) {
    const mappedReason = membershipResult.reason === "network_error"
      ? "networkError"
      : membershipResult.reason === "http_error"
        ? "httpError"
        : membershipResult.reason === "unsupported"
          ? "notSupported"
          : membershipResult.reason === "forbidden"
            ? "forbidden"
            : membershipResult.reason === "validation"
              ? "validation"
              : "unauthorized";

    return {
      ok: false,
      reason: mappedReason,
      status: membershipResult.status,
      message: "Unable to resolve current gym membership.",
    };
  }

  const gymId = membershipResult.data.gymId;
  if (!gymId) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "Current gym membership is required.",
      fieldErrors: { gymId: "Current gym membership is required." },
    };
  }

  return listTrainerGymPlans({ ...query, gymId });
}
