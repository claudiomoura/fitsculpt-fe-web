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

export type TrainerPlanEditCapabilities = {
  canDeletePlan: boolean;
  canDeleteDay: boolean;
  canDeleteDayExercise: boolean;
  canUpdateDayExercise: boolean;
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

export type UpdatePlanDayExerciseInput = {
  planId: string;
  dayId: string;
  exerciseId: string;
  sets?: number;
  reps?: string;
  rest?: number;
  notes?: string;
  tempo?: string;
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

const capabilityProbeCache = new Map<string, boolean>();

function getCapabilityCacheKey(path: string, method: string): string {
  return `${method.toUpperCase()} ${path}`;
}

async function supportsMethod(path: string, method: "DELETE" | "PATCH"): Promise<boolean> {
  const cacheKey = getCapabilityCacheKey(path, method);
  const cached = capabilityProbeCache.get(cacheKey);
  if (typeof cached === "boolean") return cached;

  try {
    const response = await fetch(path, {
      method: "OPTIONS",
      cache: "no-store",
      credentials: "include",
    });

    if (response.status === 404 || response.status === 405) {
      capabilityProbeCache.set(cacheKey, false);
      return false;
    }

    const allowHeader = response.headers.get("allow") ?? response.headers.get("Allow");
    if (!allowHeader) {
      capabilityProbeCache.set(cacheKey, false);
      return false;
    }

    const allowed = allowHeader
      .split(",")
      .map((entry) => entry.trim().toUpperCase())
      .includes(method);

    capabilityProbeCache.set(cacheKey, allowed);
    return allowed;
  } catch {
    capabilityProbeCache.set(cacheKey, false);
    return false;
  }
}

export async function getTrainerPlanEditCapabilities(planId: string, dayId?: string, exerciseId?: string): Promise<TrainerPlanEditCapabilities> {
  const normalizedPlanId = planId.trim();
  const normalizedDayId = dayId?.trim() || "capability-day";
  const normalizedExerciseId = exerciseId?.trim() || "capability-exercise";

  if (!normalizedPlanId) {
    return {
      canDeletePlan: false,
      canDeleteDay: false,
      canDeleteDayExercise: false,
      canUpdateDayExercise: false,
    };
  }

  const basePlanPath = `/api/trainer/plans/${normalizedPlanId}`;
  const dayPath = `${basePlanPath}/days/${normalizedDayId}`;
  const exercisePath = `${dayPath}/exercises/${normalizedExerciseId}`;

  const [canDeletePlan, canDeleteDay, canDeleteDayExercise, canUpdateDayExercise] = await Promise.all([
    supportsMethod(basePlanPath, "DELETE"),
    supportsMethod(dayPath, "DELETE"),
    supportsMethod(exercisePath, "DELETE"),
    supportsMethod(exercisePath, "PATCH"),
  ]);

  return {
    canDeletePlan,
    canDeleteDay,
    canDeleteDayExercise,
    canUpdateDayExercise,
  };
}

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

export async function deleteTrainerPlan(planId: string): Promise<ServiceResult<{ planId: string }>> {
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

  const result = await requestJson<unknown>(`/api/trainer/plans/${normalizedPlanId}`, {
    method: "DELETE",
  });

  if (!result.ok) return result;
  return { ok: true, data: { planId: normalizedPlanId } };
}

export async function deleteTrainerPlanDay(planId: string, dayId: string): Promise<ServiceResult<{ planId: string; dayId: string }>> {
  const normalizedPlanId = planId.trim();
  const normalizedDayId = dayId.trim();

  if (!normalizedPlanId || !normalizedDayId) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "Plan and day are required.",
      fieldErrors: {
        ...(!normalizedPlanId ? { planId: "Plan is required." } : {}),
        ...(!normalizedDayId ? { dayId: "Day is required." } : {}),
      },
    };
  }

  const result = await requestJson<unknown>(`/api/trainer/plans/${normalizedPlanId}/days/${normalizedDayId}`, {
    method: "DELETE",
  });

  if (!result.ok) return result;
  return { ok: true, data: { planId: normalizedPlanId, dayId: normalizedDayId } };
}

export async function deleteTrainerPlanDayExercise(
  planId: string,
  dayId: string,
  exerciseId: string,
): Promise<ServiceResult<{ planId: string; dayId: string; exerciseId: string }>> {
  const normalizedPlanId = planId.trim();
  const normalizedDayId = dayId.trim();
  const normalizedExerciseId = exerciseId.trim();

  if (!normalizedPlanId || !normalizedDayId || !normalizedExerciseId) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "Plan, day and exercise are required.",
      fieldErrors: {
        ...(!normalizedPlanId ? { planId: "Plan is required." } : {}),
        ...(!normalizedDayId ? { dayId: "Day is required." } : {}),
        ...(!normalizedExerciseId ? { exerciseId: "Exercise is required." } : {}),
      },
    };
  }

  const result = await requestJson<unknown>(`/api/trainer/plans/${normalizedPlanId}/days/${normalizedDayId}/exercises/${normalizedExerciseId}`, {
    method: "DELETE",
  });

  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      planId: normalizedPlanId,
      dayId: normalizedDayId,
      exerciseId: normalizedExerciseId,
    },
  };
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

export async function updatePlanDayExercise(
  input: UpdatePlanDayExerciseInput,
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

  const payload = {
    ...(typeof input.sets === "number" ? { sets: input.sets } : {}),
    ...(typeof input.reps === "string" ? { reps: input.reps } : {}),
    ...(typeof input.rest === "number" ? { rest: input.rest } : {}),
    ...(typeof input.notes === "string" ? { notes: input.notes } : {}),
    ...(typeof input.tempo === "string" ? { tempo: input.tempo } : {}),
  };

  if (Object.keys(payload).length === 0) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "At least one exercise field is required.",
      fieldErrors: { payload: "At least one exercise field is required." },
    };
  }

  const result = await requestJson<unknown>(`/api/trainer/plans/${planId}/days/${dayId}/exercises/${exerciseId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
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
  method: "GET" | "POST" | "PATCH" | "DELETE";
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
    endpoint: "/api/trainer/plans/:id",
    method: "DELETE",
    exists: true,
    notes: "Delete trainer-owned plan.",
  },
  {
    endpoint: "/api/trainer/plans/:id/days/:dayId",
    method: "DELETE",
    exists: true,
    notes: "Delete day from trainer-owned plan.",
  },
  {
    endpoint: "/api/trainer/plans/:id/days/:dayId/exercises",
    method: "POST",
    exists: true,
    notes: "Single add-to-plan exercise endpoint.",
  },
  {
    endpoint: "/api/trainer/plans/:id/days/:dayId/exercises/:exerciseId",
    method: "DELETE",
    exists: true,
    notes: "Delete exercise from a plan day.",
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
