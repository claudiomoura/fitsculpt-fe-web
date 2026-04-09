export const WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION = "1.0";

export type WeeklyCoachLoopState =
  | "onboarding_in_progress"
  | "plan_initial_ready"
  | "plan_active"
  | "check_in_due"
  | "check_in_submitted"
  | "adaptation_generated"
  | "adaptation_accepted";

export type WeeklyCoachPlanWeekState =
  | "draft"
  | "active"
  | "check_in_due"
  | "adaptation_ready"
  | "accepted"
  | "expired";

export type WeeklyCoachCheckInState = "draft" | "submitted" | "processed" | "flagged";

export type WeeklyCoachSafetyState = "clear" | "constrained" | "deferred";

export type WeeklyCoachProgressMode = "weight" | "perceived_progress";

export type WeeklyCoachCurrentWeek = {
  planWeekId: string;
  weekIndex: number;
  state: WeeklyCoachPlanWeekState;
  validFrom: string;
  validTo: string;
  weeklyObjective: string | null;
  acceptedAt: string | null;
};

export type WeeklyCoachPlanSummary = {
  trainingSummary: string[];
  nutritionSummary: string[];
  assumptions: string[];
};

export type WeeklyCoachWeeklyStateResponse = {
  loopState: WeeklyCoachLoopState;
  currentWeek: WeeklyCoachCurrentWeek | null;
  nextAction: string | null;
  checkInDue: boolean;
  planSummary: WeeklyCoachPlanSummary | null;
  latestAdaptationSummary: string | null;
  featureFlags: {
    weeklyCoachEnabled: boolean;
    weeklyCheckInEnabled: boolean;
    adaptationEnabled: boolean;
  };
};

export type WeeklyCoachAdaptationReviewResponse = WeeklyCoachWeeklyStateResponse;

export type WeeklyCoachWeekContext = {
  planWeekId: string;
  weekIndex: number;
  state: WeeklyCoachPlanWeekState;
  validFrom: string;
  validTo: string;
  weeklyObjective: string | null;
};

export type WeeklyCoachCheckInAnswers = {
  trainingSessionsCompleted?: number;
  trainingSessionsPlanned?: number;
  nutritionAdherenceScore?: number;
  progressMode?: WeeklyCoachProgressMode;
  currentWeightKg?: number | null;
  perceivedProgress?: string | null;
  energyScore?: number;
  hungerScore?: number;
  recoveryScore?: number;
  stressScore?: number;
  painLevel?: string;
  frictionPrimary?: string;
  frictionNote?: string | null;
  contextChangeFlag?: boolean;
  contextChangeType?: string | null;
  nextWeekConfidenceScore?: number;
};

export type WeeklyCoachCheckInDraftResponse = {
  checkInId: string | null;
  checkInState: WeeklyCoachCheckInState;
  weekContext: WeeklyCoachWeekContext;
  draftAnswers: WeeklyCoachCheckInAnswers;
  requiredFields: string[];
  completionState: {
    completedFields: string[];
    missingRequiredFields: string[];
    isComplete: boolean;
  };
  deadline: string | null;
  nextCta: string | null;
  updatedAt: string | null;
};

export type WeeklyCoachCheckInSubmitRequest = {
  contractVersion: typeof WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION;
  clientRequestId: string;
  trainingSessionsCompleted: number;
  trainingSessionsPlanned: number;
  nutritionAdherenceScore: number;
  progressMode: WeeklyCoachProgressMode;
  currentWeightKg: number | null;
  perceivedProgress: string | null;
  energyScore: number;
  hungerScore: number;
  recoveryScore: number;
  stressScore: number;
  painLevel: string;
  frictionPrimary: string;
  frictionNote: string | null;
  contextChangeFlag: boolean;
  contextChangeType: string | null;
  nextWeekConfidenceScore: number;
};
