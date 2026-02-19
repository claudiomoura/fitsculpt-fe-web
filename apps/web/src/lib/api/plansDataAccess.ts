import { requestJson, type ServiceErrorReason, type ServiceResult } from "@/lib/api/serviceResult";
import type { TrainingPlanDetail, TrainingPlanListItem, Workout } from "@/lib/types";

type PlansDataAccessFailureReason =
  | "unauthorized"
  | "forbidden"
  | "validation"
  | "http_error"
  | "network_error"
  | "invalid_response"
  | "not_available";

export type PlansDataAccessResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: PlansDataAccessFailureReason; status?: number };

export type TrainerPlanCapabilities = {
  canListPlans: boolean;
  canCreatePlan: boolean;
  canReadPlanDetail: boolean;
  canEditPlan: boolean;
  canEditDay: boolean;
};

export type UserPlanCapabilities = {
  canListPlans: boolean;
  canListWorkouts: boolean;
  canActivatePlan: boolean;
  canDeactivatePlan: boolean;
  canDeletePlan: boolean;
};

export type PlansCapabilities = {
  trainer: TrainerPlanCapabilities;
  user: UserPlanCapabilities;
};

export type TrainerPlansListQuery = {
  gymId?: string;
  trainerId?: string;
  query?: string;
  limit?: number;
  offset?: number;
};

export type CreateTrainerPlanPayload = {
  title: string;
  daysPerWeek?: number;
};

export type UpdateTrainerPlanPayload = Partial<{
  title: string;
  notes: string;
  goal: string;
  level: string;
  focus: string;
  equipment: string;
  startDate: string;
  daysPerWeek: number;
  days: TrainingPlanDetail["days"];
}>;

export type AddExerciseToTrainerPlanDayPayload = {
  planId: string;
  dayId: string;
  exerciseId: string;
  athleteUserId?: string;
};

type TrainingPlanListPayload = {
  items?: TrainingPlanListItem[];
  data?: TrainingPlanListItem[];
  plans?: TrainingPlanListItem[];
  total?: number;
};

type WorkoutsListPayload = {
  items?: Workout[];
  data?: Workout[];
  workouts?: Workout[];
};

const endpointAvailability = {
  trainer: {
    listPlans: true,
    createPlan: true,
    planDetail: true,
    updatePlan: true,
    updateDay: true,
  },
  user: {
    listPlans: true,
    listWorkouts: true,
    activatePlan: true,
    deactivatePlan: false,
    deletePlan: false,
  },
} as const;

function normalizeReason(reason: ServiceErrorReason): PlansDataAccessFailureReason {
  if (reason === "httpError") return "http_error";
  if (reason === "networkError") return "network_error";
  if (reason === "invalidResponse") return "invalid_response";
  if (reason === "notSupported") return "not_available";
  return reason;
}

function mapResult<T>(result: ServiceResult<T>): PlansDataAccessResult<T> {
  if (result.ok) return result;
  return {
    ok: false,
    reason: normalizeReason(result.reason),
    ...(typeof result.status === "number" ? { status: result.status } : {}),
  };
}

function notAvailable(status = 501): PlansDataAccessResult<never> {
  return { ok: false, reason: "not_available", status };
}

function isSupported(result: PlansDataAccessResult<unknown>): boolean {
  if (result.ok) return true;
  return result.reason !== "not_available";
}

function getPlans(payload: TrainingPlanListPayload): TrainingPlanListItem[] {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.plans)) return payload.plans;
  return [];
}

function getWorkouts(payload: WorkoutsListPayload): Workout[] {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.workouts)) return payload.workouts;
  return [];
}

export async function listTrainerPlans(
  query: TrainerPlansListQuery = {},
): Promise<PlansDataAccessResult<{ items: TrainingPlanListItem[]; total?: number }>> {
  if (!endpointAvailability.trainer.listPlans) return notAvailable();

  const search = new URLSearchParams();
  if (query.gymId?.trim()) search.set("gymId", query.gymId.trim());
  if (query.trainerId?.trim()) search.set("trainerId", query.trainerId.trim());
  if (query.query?.trim()) search.set("query", query.query.trim());
  if (typeof query.limit === "number") search.set("limit", String(query.limit));
  if (typeof query.offset === "number") search.set("offset", String(query.offset));

  const path = search.size > 0 ? `/api/trainer/plans?${search.toString()}` : "/api/trainer/plans";
  const mapped = mapResult(await requestJson<TrainingPlanListPayload>(path));
  if (!mapped.ok) return mapped;

  return {
    ok: true,
    data: {
      items: getPlans(mapped.data),
      ...(typeof mapped.data.total === "number" ? { total: mapped.data.total } : {}),
    },
  };
}

export async function createTrainerPlan(payload: CreateTrainerPlanPayload): Promise<PlansDataAccessResult<TrainingPlanDetail>> {
  if (!endpointAvailability.trainer.createPlan) return notAvailable();

  const title = payload.title.trim();
  if (!title) {
    return { ok: false, reason: "validation", status: 400 };
  }

  return mapResult(
    await requestJson<TrainingPlanDetail>("/api/trainer/plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        ...(typeof payload.daysPerWeek === "number" ? { daysPerWeek: payload.daysPerWeek } : {}),
      }),
    }),
  );
}

export async function getTrainerPlanDetail(planId: string): Promise<PlansDataAccessResult<TrainingPlanDetail>> {
  if (!endpointAvailability.trainer.planDetail) return notAvailable();

  const normalizedPlanId = planId.trim();
  if (!normalizedPlanId) return { ok: false, reason: "validation", status: 400 };

  return mapResult(await requestJson<TrainingPlanDetail>(`/api/trainer/plans/${normalizedPlanId}`));
}

export async function updateTrainerPlan(
  planId: string,
  payload: UpdateTrainerPlanPayload,
): Promise<PlansDataAccessResult<TrainingPlanDetail>> {
  if (!endpointAvailability.trainer.updatePlan) return notAvailable();

  const normalizedPlanId = planId.trim();
  if (!normalizedPlanId) return { ok: false, reason: "validation", status: 400 };

  return mapResult(
    await requestJson<TrainingPlanDetail>(`/api/trainer/plans/${normalizedPlanId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function addExerciseToTrainerPlanDay(
  payload: AddExerciseToTrainerPlanDayPayload,
): Promise<PlansDataAccessResult<{ planId: string; dayId: string; exerciseId: string }>> {
  if (!endpointAvailability.trainer.updateDay) return notAvailable();

  const planId = payload.planId.trim();
  const dayId = payload.dayId.trim();
  const exerciseId = payload.exerciseId.trim();

  if (!planId || !dayId || !exerciseId) {
    return { ok: false, reason: "validation", status: 400 };
  }

  const result = mapResult(
    await requestJson<unknown>(`/api/trainer/plans/${planId}/days/${dayId}/exercises`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        exerciseId,
        ...(payload.athleteUserId?.trim() ? { athleteUserId: payload.athleteUserId.trim() } : {}),
      }),
    }),
  );

  if (!result.ok) return result;

  return { ok: true, data: { planId, dayId, exerciseId } };
}

export async function listUserPlanLibrary(query?: {
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<PlansDataAccessResult<{ plans: TrainingPlanListItem[]; total?: number }>> {
  if (!endpointAvailability.user.listPlans) return notAvailable();

  const search = new URLSearchParams();
  if (query?.query?.trim()) search.set("query", query.query.trim());
  if (typeof query?.limit === "number") search.set("limit", String(query.limit));
  if (typeof query?.offset === "number") search.set("offset", String(query.offset));

  const path = search.size > 0 ? `/api/training-plans?${search.toString()}` : "/api/training-plans";
  const mapped = mapResult(await requestJson<TrainingPlanListPayload>(path));
  if (!mapped.ok) return mapped;

  return {
    ok: true,
    data: {
      plans: getPlans(mapped.data),
      ...(typeof mapped.data.total === "number" ? { total: mapped.data.total } : {}),
    },
  };
}

export async function listUserWorkoutLibrary(): Promise<PlansDataAccessResult<{ workouts: Workout[] }>> {
  if (!endpointAvailability.user.listWorkouts) return notAvailable();

  const mapped = mapResult(await requestJson<WorkoutsListPayload>("/api/workouts"));
  if (!mapped.ok) return mapped;

  return { ok: true, data: { workouts: getWorkouts(mapped.data) } };
}

export async function activateUserPlan(planId: string): Promise<PlansDataAccessResult<null>> {
  if (!endpointAvailability.user.activatePlan) return notAvailable();

  const normalizedPlanId = planId.trim();
  if (!normalizedPlanId) return { ok: false, reason: "validation", status: 400 };

  const mapped = mapResult(
    await requestJson<unknown>("/api/training-plans/active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId: normalizedPlanId }),
    }),
  );

  if (!mapped.ok) return mapped;
  return { ok: true, data: null };
}

export async function deactivateUserPlan(): Promise<PlansDataAccessResult<null>> {
  if (!endpointAvailability.user.deactivatePlan) return notAvailable();
  return notAvailable();
}

export async function deleteUserPlan(planId: string): Promise<PlansDataAccessResult<null>> {
  const normalizedPlanId = planId.trim();
  if (!normalizedPlanId) return { ok: false, reason: "validation", status: 400 };
  if (!endpointAvailability.user.deletePlan) return notAvailable();
  return notAvailable();
}

export async function detectPlansCapabilities(): Promise<PlansCapabilities> {
  const [
    trainerListResult,
    trainerCreateResult,
    trainerDetailResult,
    trainerEditResult,
    trainerDayResult,
    userPlansResult,
    userWorkoutsResult,
    userActivateResult,
  ] = await Promise.all([
    listTrainerPlans({ limit: 1 }),
    createTrainerPlan({ title: " " }),
    getTrainerPlanDetail(" "),
    updateTrainerPlan(" ", {}),
    addExerciseToTrainerPlanDay({ planId: " ", dayId: " ", exerciseId: " " }),
    listUserPlanLibrary({ limit: 1 }),
    listUserWorkoutLibrary(),
    activateUserPlan(" "),
  ]);

  return {
    trainer: {
      canListPlans: isSupported(trainerListResult),
      canCreatePlan: isSupported(trainerCreateResult),
      canReadPlanDetail: isSupported(trainerDetailResult),
      canEditPlan: isSupported(trainerEditResult),
      canEditDay: isSupported(trainerDayResult),
    },
    user: {
      canListPlans: isSupported(userPlansResult),
      canListWorkouts: isSupported(userWorkoutsResult),
      canActivatePlan: isSupported(userActivateResult),
      canDeactivatePlan: endpointAvailability.user.deactivatePlan,
      canDeletePlan: endpointAvailability.user.deletePlan,
    },
  };
}

