export {
  hasAiEntitlement,
  hasNutritionAiEntitlement,
  hasStrengthAiEntitlement,
  type AiEntitlementProfile,
} from "@/components/access/aiEntitlements";
export { AiPlanRequestError, requestAiTrainingPlan, saveAiTrainingPlan } from "@/components/training-plan/aiPlanGeneration";
export { normalizeAiErrorCode, shouldTreatAsConflictError, shouldTreatAsUpstreamError } from "@/lib/aiErrorMapping";
export {
  runAiCapabilityPreflight,
  type AiCapabilityId,
  type AiCapabilityPreflightInput,
  type AiCapabilityPreflightResult,
  type AiEntitlementRequirement,
  type AiTokenEstimate,
  type AiTokenReservation,
} from "@/domains/ai/preflight";
