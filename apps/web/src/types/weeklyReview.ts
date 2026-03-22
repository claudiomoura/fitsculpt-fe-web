export type WeeklyReviewRecommendationId =
  | "training-deload"
  | "training-progress"
  | "nutrition-recovery"
  | "nutrition-maintain"
  | "habit-meal-logging"
  | "habit-training-consistency"
  | "habit-foundation";

export type WeeklyReviewRecommendationType = "training" | "nutrition" | "habit";
export type WeeklyReviewRecommendationDirection = "increase" | "decrease" | "maintain" | "focus";
export type WeeklyReviewDecision = "pending" | "accepted" | "rejected";

export type WeeklyReviewRequest = {
  startDate?: string;
  endDate?: string;
};

export type WeeklyReviewRecommendation = {
  id: WeeklyReviewRecommendationId;
  type: WeeklyReviewRecommendationType;
  title: string;
  recommendation: string;
  why: string;
  reasoning: string[];
  direction: WeeklyReviewRecommendationDirection;
  adjustmentPct: number | null;
  decision: WeeklyReviewDecision;
  metrics: Array<{ label: string; value: string }>;
  safetyNotes: string[];
};

export type WeeklyReviewSummary = {
  weekKey: string;
  rangeStart: string;
  rangeEnd: string;
  previousRangeStart: string;
  previousRangeEnd: string;
  generatedAt: string;
  days: number;
  checkinsCount: number;
  workoutsCount: number;
  previousWorkoutsCount: number;
  nutritionLogsCount: number;
  mealLoggingDays: number;
  trainingTargetSessions: number;
  trainingAdherencePct: number;
  averageEnergy: number | null;
  averageHunger: number | null;
  weightChangeKg: number | null;
  weightChangePct: number | null;
  waistChangeCm: number | null;
};

export type WeeklyReviewResponse = {
  summary: WeeklyReviewSummary;
  recommendations: WeeklyReviewRecommendation[];
};

export type WeeklyReviewDecisionRequest = {
  weekKey: string;
  recommendationId: WeeklyReviewRecommendationId;
  decision: "accepted" | "rejected";
};
