export type WeeklyReviewRecommendationId =
  | "keep-momentum"
  | "add-workout"
  | "meal-consistency"
  | "checkin-reminder"
  | "balance-recovery";

export type WeeklyReviewRequest = {
  startDate?: string;
  endDate?: string;
};

export type WeeklyReviewRecommendation = {
  id: WeeklyReviewRecommendationId;
  title: string;
  why: string;
};

export type WeeklyReviewSummary = {
  rangeStart: string;
  rangeEnd: string;
  days: number;
  checkinsCount: number;
  workoutsCount: number;
  nutritionLogsCount: number;
  averageEnergy: number | null;
  averageHunger: number | null;
};

export type WeeklyReviewResponse = {
  summary: WeeklyReviewSummary;
  recommendations: WeeklyReviewRecommendation[];
};
