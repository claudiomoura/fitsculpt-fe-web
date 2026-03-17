export {
  hasAiEntitlement,
  hasNutritionAiEntitlement,
  hasStrengthAiEntitlement,
  type AiEntitlementProfile,
} from "@/components/access/aiEntitlements";
export { AiPlanRequestError, requestAiTrainingPlan, saveAiTrainingPlan } from "@/components/training-plan/aiPlanGeneration";
export { normalizeAiErrorCode, shouldTreatAsConflictError, shouldTreatAsUpstreamError } from "@/lib/aiErrorMapping";
