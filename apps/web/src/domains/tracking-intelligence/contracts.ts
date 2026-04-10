import type {
  CheckinEntry,
  MealLogEntry,
  PassiveHealthData,
  PassiveHealthSnapshot,
  WorkoutEntry,
} from "@/services/tracking";
import type { ProfileData } from "@/lib/profile";
import type { FutureProjectionResponse, RctStatusResponse } from "@/types/futureProjection";

export type TrackingIntelligenceCapabilityId =
  | "body-scan"
  | "projection"
  | "recommendation";

export type TrackingIntelligenceCapabilityStatus =
  | "idle"
  | "loading"
  | "ready"
  | "missing_data"
  | "blocked"
  | "error";

export type TrackingTrendWindow = {
  startDate: string;
  endDate: string;
  rangeDays: number;
};

export type TrackingPhotoAvailability = {
  hasFrontPhoto: boolean;
  hasSidePhoto: boolean;
  hasAnyPhoto: boolean;
};

export type TrackingPhotoComparison = {
  baseline: CheckinEntry | null;
  current: CheckinEntry | null;
  totalEntriesWithPhotos: number;
};

export type TrackingPassiveSupportSnapshot = {
  snapshots: PassiveHealthSnapshot[];
  lastSyncAt: string | null;
  lastSyncSource: PassiveHealthData["lastSyncSource"];
};

export type TrackingAdherenceContext = {
  checkins: CheckinEntry[];
  mealLog: MealLogEntry[];
  workoutLog: WorkoutEntry[];
  passiveSupport: TrackingPassiveSupportSnapshot;
  trendWindow: TrackingTrendWindow;
  targetSessionsPerWeek: number;
};

export type TrackingProjectionCapability = {
  capability: "projection";
  status: TrackingIntelligenceCapabilityStatus;
  origin: string;
  errorMessage: string | null;
  explainability: TrackingIntelligenceExplainability;
};

export type TrackingIntelligenceConfidence = "low" | "medium" | "high";

export type TrackingIntelligenceCompliancePayload = {
  disclaimer: string;
  limitations: readonly string[];
  safetyNotes: readonly string[];
  medicalAccuracy: "not_medical_advice";
  visualAccuracy: "not_hyperrealistic";
};

export type TrackingIntelligenceExplainability = {
  sourceStatus: "ready" | "fallback" | "unavailable";
  summary: string;
  rationale: string[];
  fallbackLabel: string | null;
};

export type TrackingBodyScanInsufficiencyReason =
  | "missing_progress_photos"
  | "missing_front_photo"
  | "missing_side_photo"
  | "limited_recent_checkins"
  | "missing_body_fat"
  | "missing_measurements"
  | "missing_passive_support";

export type TrackingBodyScanState = "ready" | "low_confidence" | "insufficient_data";

export type TrackingAiAssistState = {
  status: "not_requested" | "ready" | "blocked";
  failureReason: string | null;
  message: string | null;
  estimatedTokens: number | null;
  reservationId: string | null;
};

export type TrackingBodyScanRequest = {
  origin: string;
  profile: ProfileData;
  checkins: CheckinEntry[];
  passiveData?: PassiveHealthData | null;
  rangeDays?: number;
};

export type TrackingBodyScanDataSnapshot = {
  latestCheckin: CheckinEntry | null;
  recentCheckinsCount: number;
  photoComparison: TrackingPhotoComparison;
  photoAvailability: TrackingPhotoAvailability;
  passiveSupportDays: number;
  weightDeltaKg: number | null;
  waistDeltaCm: number | null;
  bodyFatDeltaPct: number | null;
};

export type TrackingBodyScanCapability = {
  capability: "body-scan";
  status: TrackingIntelligenceCapabilityStatus;
  origin: string;
  errorMessage: string | null;
  state: TrackingBodyScanState;
  confidence: TrackingIntelligenceConfidence;
  analysisMode: "deterministic_fallback" | "ai_augmented" | "ai_blocked";
  summary: string;
  observations: string[];
  nextBestInputs: string[];
  insufficiencies: TrackingBodyScanInsufficiencyReason[];
  data: TrackingBodyScanDataSnapshot;
  compliance: TrackingIntelligenceCompliancePayload;
  aiAssist: TrackingAiAssistState;
};

export type TrackingRecommendationCtaTarget =
  | "tracking-checkin"
  | "weekly-review"
  | "training-plan"
  | "nutrition-plan"
  | "tracking-overview";

export type TrackingRecommendationId =
  | "collect-more-body-scan-data"
  | "stabilize-weekly-consistency"
  | "review-projection-assumptions"
  | "protect-recovery-bandwidth"
  | "maintain-current-course"
  | (string & {});

export type TrackingRecommendationItem = {
  id: TrackingRecommendationId;
  title: string;
  summary: string;
  rationale: string[];
  confidence: TrackingIntelligenceConfidence;
  sourceCapabilities: TrackingIntelligenceCapabilityId[];
  cta: {
    target: TrackingRecommendationCtaTarget;
    href: string;
    label: string;
  };
};

export type TrackingRecommendationInputMatrix = {
  hasCheckins: boolean;
  hasWorkoutLog: boolean;
  hasMealLog: boolean;
  hasPassiveSupport: boolean;
  hasBodyScan: boolean;
  hasProjection: boolean;
  canCombineProjectionAndScan: boolean;
};

export type TrackingRecommendationRequest = {
  origin: string;
  profile: ProfileData;
  adherenceContext: TrackingAdherenceContext & {
    professionalInsights: {
      combinedAdherencePct: number;
      trainingConsistencyPct: number;
      nutritionLoggingPct: number;
      weeklyRateKg: number | null;
      weeklyWaistDeltaCm: number | null;
      weeklyBodyFatDeltaPct: number | null;
    };
  };
  bodyScan?: TrackingBodyScanCapability | null;
  projection?: {
    status: TrackingIntelligenceCapabilityStatus;
    projection: FutureProjectionResponse | null;
    rctStatus: RctStatusResponse | null;
    activeScenarioByHorizon?: Record<number, string>;
    explainability?: TrackingIntelligenceExplainability;
  } | null;
  maxItems?: number;
};

export type TrackingRecommendationCapability = {
  capability: "recommendation";
  status: TrackingIntelligenceCapabilityStatus;
  origin: string;
  errorMessage: string | null;
  analysisMode: "deterministic_fallback" | "ai_augmented" | "ai_blocked";
  summary: string;
  inputMatrix: TrackingRecommendationInputMatrix;
  items: TrackingRecommendationItem[];
  deterministicFallbackUsed: boolean;
  compliance: TrackingIntelligenceCompliancePayload;
  aiAssist: TrackingAiAssistState;
  explainability: TrackingIntelligenceExplainability;
};
