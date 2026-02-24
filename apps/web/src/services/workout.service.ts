import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";
import type { TrainingPlanDetail } from "@/lib/types";

export type ActiveTrainingPlanResponse = {
  source?: "assigned" | "own";
  plan?: TrainingPlanDetail | null;
};

export async function getActiveWorkoutPlanDays(): Promise<ServiceResult<ActiveTrainingPlanResponse>> {
  return requestJson<ActiveTrainingPlanResponse>("/api/training-plans/active?includeDays=1");
}
