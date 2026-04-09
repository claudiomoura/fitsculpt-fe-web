import { mergeProfileData } from "@/lib/profileService";
import {
  createEmptyWeeklyCoachCheckInAnswers,
  parseWeeklyCoachCheckInDraftResponse,
  validateWeeklyCoachCheckInDraftPayload,
  validateWeeklyCoachWeeklyStatePayload,
} from "@/lib/weeklyAdaptiveCoachContracts";
import type { ProfileData } from "@/lib/profile";
import type {
  WeeklyCoachCheckInAnswers,
  WeeklyCoachCheckInDraftResponse,
  WeeklyCoachCheckInSubmitRequest,
  WeeklyCoachCurrentWeek,
  WeeklyCoachWeeklyStateResponse,
} from "@/types/weeklyAdaptiveCoach";

type UnknownRecord = Record<string, unknown>;

type TrackingWorkout = {
  date: string;
};

type TrackingCheckin = {
  date: string;
  weightKg?: number;
  energy?: number;
  hunger?: number;
};

type ScaffoldInputs = {
  profilePayload?: unknown;
  trackingPayload?: unknown;
  now?: Date;
};

type CheckInResponseState = "draft" | "submitted";

type PersistedAdaptation = {
  status: "ready";
  summary: string;
  generatedAt: string;
  source: "scaffold";
  basedOnCheckInId: string | null;
  acceptedAt: string | null;
};

type NormalizedScaffoldInputs = {
  profile: ProfileData;
  now: Date;
  week: WeeklyCoachCurrentWeek;
  plannedSessions: number;
  completedSessions: number;
  latestCheckin: TrackingCheckin | null;
};

const DEFAULT_PLANNED_SESSIONS = 3;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfIsoWeek(date: Date): Date {
  const dayStart = startOfUtcDay(date);
  const day = dayStart.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addUtcDays(dayStart, diff);
}

function endOfIsoWeek(date: Date): Date {
  return addUtcDays(startOfIsoWeek(date), 6);
}

function endOfWeekDeadline(date: Date): string {
  const end = endOfIsoWeek(date);
  return new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59)).toISOString();
}

function getIsoWeekNumber(date: Date): number {
  const target = startOfUtcDay(date);
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNumber + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
}

function parseTrackingWorkouts(payload: unknown): TrackingWorkout[] {
  if (!isRecord(payload) || !Array.isArray(payload.workoutLog)) return [];
  return payload.workoutLog
    .map((entry) => {
      if (!isRecord(entry) || !isIsoDate(entry.date)) return null;
      return { date: entry.date } satisfies TrackingWorkout;
    })
    .filter((entry): entry is TrackingWorkout => entry !== null);
}

function parseTrackingCheckins(payload: unknown): TrackingCheckin[] {
  if (!isRecord(payload) || !Array.isArray(payload.checkins)) return [];
  return payload.checkins
    .map((entry) => {
      if (!isRecord(entry) || !isIsoDate(entry.date)) return null;
      const parsed: TrackingCheckin = {
        date: entry.date,
        weightKg: asFiniteNumber(entry.weightKg) ?? undefined,
        energy: asFiniteNumber(entry.energy) ?? undefined,
        hunger: asFiniteNumber(entry.hunger) ?? undefined,
      };
      return parsed;
    })
    .filter((entry): entry is TrackingCheckin => entry !== null);
}

function isOnboardingReady(profile: ProfileData): boolean {
  return Boolean(profile.goal && profile.trainingPreferences.daysPerWeek && profile.nutritionPreferences.mealsPerDay);
}

function countCompletedSessions(workouts: TrackingWorkout[], weekStart: string, weekEnd: string): number {
  return workouts.filter((entry) => entry.date >= weekStart && entry.date <= weekEnd).length;
}

function getLatestCheckin(checkins: TrackingCheckin[]): TrackingCheckin | null {
  return [...checkins].sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
}

function getWeeklyObjective(profile: ProfileData, plannedSessions: number): string {
  const goalText = profile.goal || "maintain consistency";
  return `Support ${goalText} with ${plannedSessions} training sessions and steady nutrition adherence.`;
}

function buildPlanSummary(profile: ProfileData, plannedSessions: number): WeeklyCoachWeeklyStateResponse["planSummary"] {
  return {
    trainingSummary: [
      `${plannedSessions} planned training sessions this week`,
      `Focus split: ${profile.trainingPreferences.focus || "full body"}`,
      `Equipment context: ${profile.trainingPreferences.equipment || "gym"}`,
    ],
    nutritionSummary: [
      `${profile.nutritionPreferences.mealsPerDay ?? 4} meals per day target`,
      `Diet pattern: ${profile.nutritionPreferences.dietType || "balanced"}`,
    ],
    assumptions: [
      `Goal remains ${profile.goal || "maintain"}`,
      "Weekly check-in ownership persists in the tracking store while adaptation remains scaffolded",
    ],
  };
}

function getPersistedCheckIn(payload: unknown, planWeekId: string): WeeklyCoachCheckInDraftResponse | null {
  if (!isRecord(payload)) return null;
  const weeklyCoach = payload.weeklyCoach;
  if (!isRecord(weeklyCoach)) return null;
  const checkIns = weeklyCoach.checkIns;
  if (!isRecord(checkIns)) return null;

  const persisted = parseWeeklyCoachCheckInDraftResponse(checkIns[planWeekId]);
  if (!persisted || persisted.weekContext.planWeekId !== planWeekId) return null;
  return persisted;
}

function getPersistedAdaptation(payload: unknown, planWeekId: string): PersistedAdaptation | null {
  if (!isRecord(payload)) return null;
  const weeklyCoach = payload.weeklyCoach;
  if (!isRecord(weeklyCoach)) return null;
  const adaptations = weeklyCoach.adaptations;
  if (!isRecord(adaptations)) return null;

  const persisted = adaptations[planWeekId];
  if (!isRecord(persisted)) return null;
  if (persisted.status !== "ready") return null;
  if (typeof persisted.summary !== "string" || !persisted.summary.trim()) return null;
  if (typeof persisted.generatedAt !== "string" || !persisted.generatedAt.trim()) return null;
  if (persisted.source !== "scaffold") return null;

  return {
    status: "ready",
    summary: persisted.summary.trim(),
    generatedAt: persisted.generatedAt,
    source: "scaffold",
    basedOnCheckInId: typeof persisted.basedOnCheckInId === "string" && persisted.basedOnCheckInId.trim()
      ? persisted.basedOnCheckInId.trim()
      : null,
    acceptedAt: typeof persisted.acceptedAt === "string" && persisted.acceptedAt.trim() ? persisted.acceptedAt.trim() : null,
  };
}

function buildInitialAdaptationSummary(payload: WeeklyCoachCheckInSubmitRequest): string {
  const completionSummary = `${payload.trainingSessionsCompleted}/${payload.trainingSessionsPlanned} planned sessions completed`;
  const nutritionSummary = `nutrition adherence ${payload.nutritionAdherenceScore}/5`;
  const recoveryNeedsSupport = payload.recoveryScore <= 2 || payload.energyScore <= 2 || payload.stressScore >= 4;
  const consistencyNeedsSupport = payload.trainingSessionsCompleted < payload.trainingSessionsPlanned || payload.nextWeekConfidenceScore <= 2;
  const painNeedsConstraint = payload.painLevel !== "expected_soreness";

  let decision = "Keep the current weekly structure and repeat the core targets next week.";
  if (painNeedsConstraint) {
    decision = "Keep the current weekly structure, but protect recovery and avoid adding training load until pain settles.";
  } else if (recoveryNeedsSupport) {
    decision = "Keep the current weekly structure and bias the next week toward recovery-friendly execution before increasing load.";
  } else if (!consistencyNeedsSupport && payload.nutritionAdherenceScore >= 4 && payload.nextWeekConfidenceScore >= 4) {
    decision = "Current adherence supports a small progression next week while keeping the weekly structure stable.";
  }

  const friction = payload.frictionPrimary.replace(/_/g, " ");
  return `${decision} This check-in recorded ${completionSummary} with ${nutritionSummary}. Primary friction to manage next week: ${friction}.`;
}

function buildWeek(date: Date, objective: string): WeeklyCoachCurrentWeek {
  const weekStart = startOfIsoWeek(date);
  const weekEnd = endOfIsoWeek(date);
  const checkInDue = date.getUTCDay() === 0 || date.getUTCDay() >= 5;

  return {
    planWeekId: `weekly_coach_${toIsoDate(weekStart)}`,
    weekIndex: getIsoWeekNumber(date),
    state: checkInDue ? "check_in_due" : "active",
    validFrom: toIsoDate(weekStart),
    validTo: toIsoDate(weekEnd),
    weeklyObjective: objective,
    acceptedAt: null,
  };
}

function normalizeInputs(inputs: ScaffoldInputs): NormalizedScaffoldInputs {
  const now = inputs.now ?? new Date();
  const profile = mergeProfileData(isRecord(inputs.profilePayload) ? inputs.profilePayload : undefined);
  const plannedSessions = profile.trainingPreferences.daysPerWeek ?? DEFAULT_PLANNED_SESSIONS;
  const objective = getWeeklyObjective(profile, plannedSessions);
  const week = buildWeek(now, objective);
  const workouts = parseTrackingWorkouts(inputs.trackingPayload);
  const checkins = parseTrackingCheckins(inputs.trackingPayload);

  return {
    profile,
    now,
    week,
    plannedSessions,
    completedSessions: countCompletedSessions(workouts, week.validFrom, week.validTo),
    latestCheckin: getLatestCheckin(checkins),
  };
}

function hasAnswerValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function createDraftAnswers(input: NormalizedScaffoldInputs): WeeklyCoachCheckInAnswers {
  const latestWeight = input.latestCheckin?.weightKg ?? input.profile.weightKg ?? null;
  const latestEnergy = input.latestCheckin?.energy;
  const latestHunger = input.latestCheckin?.hunger;

  return {
    ...createEmptyWeeklyCoachCheckInAnswers(),
    trainingSessionsCompleted: input.completedSessions,
    trainingSessionsPlanned: input.plannedSessions,
    progressMode: latestWeight !== null ? "weight" : undefined,
    currentWeightKg: latestWeight,
    energyScore: latestEnergy,
    hungerScore: latestHunger,
    contextChangeFlag: false,
  };
}

function buildCompletionState(answers: WeeklyCoachCheckInAnswers) {
  const requiredFields = [
    "trainingSessionsCompleted",
    "trainingSessionsPlanned",
    "nutritionAdherenceScore",
    "progressMode",
    "energyScore",
    "hungerScore",
    "recoveryScore",
    "stressScore",
    "painLevel",
    "frictionPrimary",
    "nextWeekConfidenceScore",
  ];

  const completedFields = requiredFields.filter((field) => hasAnswerValue(answers[field as keyof WeeklyCoachCheckInAnswers]));
  const missingRequiredFields = requiredFields.filter((field) => !completedFields.includes(field));

  if (answers.progressMode === "weight" && !hasAnswerValue(answers.currentWeightKg)) {
    missingRequiredFields.push("currentWeightKg");
  }

  if (answers.progressMode === "perceived_progress" && !hasAnswerValue(answers.perceivedProgress)) {
    missingRequiredFields.push("perceivedProgress");
  }

  if (answers.contextChangeFlag && !hasAnswerValue(answers.contextChangeType)) {
    missingRequiredFields.push("contextChangeType");
  }

  return {
    requiredFields,
    completionState: {
      completedFields,
      missingRequiredFields,
      isComplete: missingRequiredFields.length === 0,
    },
  };
}

export function buildWeeklyCoachWeeklyState(inputs: ScaffoldInputs = {}): WeeklyCoachWeeklyStateResponse {
  const normalized = normalizeInputs(inputs);
  const onboardingReady = isOnboardingReady(normalized.profile);
  const persistedCheckIn = getPersistedCheckIn(inputs.trackingPayload, normalized.week.planWeekId);
  const persistedAdaptation = getPersistedAdaptation(inputs.trackingPayload, normalized.week.planWeekId);
  const currentWeek = persistedAdaptation
    ? {
        ...normalized.week,
        state: persistedAdaptation.acceptedAt ? ("accepted" as const) : ("adaptation_ready" as const),
        acceptedAt: persistedAdaptation.acceptedAt,
      }
    : normalized.week;
  const weeklyState: WeeklyCoachWeeklyStateResponse = onboardingReady
    ? {
        loopState: persistedAdaptation
          ? persistedAdaptation.acceptedAt
            ? "adaptation_accepted"
            : "adaptation_generated"
          : persistedCheckIn?.checkInState === "submitted"
            ? "check_in_submitted"
            : normalized.week.state === "check_in_due"
              ? "check_in_due"
              : "plan_active",
        currentWeek,
        nextAction:
          persistedAdaptation
            ? persistedAdaptation.acceptedAt
              ? "follow_current_week_plan"
              : "review_adaptation_summary"
            : persistedCheckIn?.checkInState === "submitted"
            ? "await_adaptation_generation"
            : normalized.week.state === "check_in_due"
              ? "complete_weekly_check_in"
              : "follow_current_week_plan",
        checkInDue: !persistedAdaptation && normalized.week.state === "check_in_due" && persistedCheckIn?.checkInState !== "submitted",
        planSummary: buildPlanSummary(normalized.profile, normalized.plannedSessions),
        latestAdaptationSummary: persistedAdaptation?.summary ?? null,
        featureFlags: {
          weeklyCoachEnabled: true,
          weeklyCheckInEnabled: true,
          adaptationEnabled: Boolean(persistedAdaptation),
        },
      }
    : {
        loopState: "onboarding_in_progress",
        currentWeek: null,
        nextAction: "complete_onboarding_profile",
        checkInDue: false,
        planSummary: null,
        latestAdaptationSummary: null,
        featureFlags: {
          weeklyCoachEnabled: true,
          weeklyCheckInEnabled: true,
          adaptationEnabled: false,
        },
      };

  const validation = validateWeeklyCoachWeeklyStatePayload(weeklyState);
  if (!validation.ok) {
    throw new Error(validation.reason ?? "WEEKLY_COACH_WEEKLY_STATE_INVALID");
  }

  return weeklyState;
}

function buildCheckInResponse(
  normalized: NormalizedScaffoldInputs,
  answers: WeeklyCoachCheckInAnswers,
  options: {
    checkInId: string | null;
    checkInState: CheckInResponseState;
    updatedAt: string | null;
  },
): WeeklyCoachCheckInDraftResponse {
  const completion = buildCompletionState(answers);
  const response: WeeklyCoachCheckInDraftResponse = {
    checkInId: options.checkInId,
    checkInState: options.checkInState,
    weekContext: {
      planWeekId: normalized.week.planWeekId,
      weekIndex: normalized.week.weekIndex,
      state: normalized.week.state,
      validFrom: normalized.week.validFrom,
      validTo: normalized.week.validTo,
      weeklyObjective: normalized.week.weeklyObjective,
    },
    draftAnswers: answers,
    requiredFields: completion.requiredFields,
    completionState: completion.completionState,
    deadline: endOfWeekDeadline(normalized.now),
    nextCta: options.checkInState === "submitted" ? "awaiting_adaptation_generation" : completion.completionState.isComplete ? "submit_weekly_check_in" : "continue_check_in",
    updatedAt: options.updatedAt,
  };

  const validation = validateWeeklyCoachCheckInDraftPayload(response);
  if (!validation.ok) {
    throw new Error(validation.reason ?? "WEEKLY_COACH_CHECKIN_DRAFT_INVALID");
  }

  return response;
}

export function buildWeeklyCoachCheckInDraft(inputs: ScaffoldInputs = {}): WeeklyCoachCheckInDraftResponse {
  const normalized = normalizeInputs(inputs);
  const persistedCheckIn = getPersistedCheckIn(inputs.trackingPayload, normalized.week.planWeekId);
  const answers = persistedCheckIn
    ? { ...createDraftAnswers(normalized), ...persistedCheckIn.draftAnswers }
    : createDraftAnswers(normalized);

  return buildCheckInResponse(normalized, answers, {
    checkInId: persistedCheckIn?.checkInId ?? null,
    checkInState: persistedCheckIn?.checkInState === "submitted" ? "submitted" : "draft",
    updatedAt: persistedCheckIn?.updatedAt ?? null,
  });
}

export function buildWeeklyCoachSavedCheckInDraft(
  draftAnswers: WeeklyCoachCheckInAnswers,
  inputs: ScaffoldInputs = {},
): WeeklyCoachCheckInDraftResponse {
  const normalized = normalizeInputs(inputs);
  const answers = { ...createDraftAnswers(normalized), ...draftAnswers };

  return buildCheckInResponse(normalized, answers, {
    checkInId: null,
    checkInState: "draft",
    updatedAt: normalized.now.toISOString(),
  });
}

export function buildWeeklyCoachSubmittedCheckIn(
  payload: WeeklyCoachCheckInSubmitRequest,
  inputs: ScaffoldInputs = {},
): WeeklyCoachCheckInDraftResponse {
  const normalized = normalizeInputs(inputs);
  const submittedAnswers: WeeklyCoachCheckInAnswers = {
    trainingSessionsCompleted: payload.trainingSessionsCompleted,
    trainingSessionsPlanned: payload.trainingSessionsPlanned,
    nutritionAdherenceScore: payload.nutritionAdherenceScore,
    progressMode: payload.progressMode,
    currentWeightKg: payload.currentWeightKg,
    perceivedProgress: payload.perceivedProgress,
    energyScore: payload.energyScore,
    hungerScore: payload.hungerScore,
    recoveryScore: payload.recoveryScore,
    stressScore: payload.stressScore,
    painLevel: payload.painLevel,
    frictionPrimary: payload.frictionPrimary,
    frictionNote: payload.frictionNote,
    contextChangeFlag: payload.contextChangeFlag,
    contextChangeType: payload.contextChangeType,
    nextWeekConfidenceScore: payload.nextWeekConfidenceScore,
  };
  return buildCheckInResponse(normalized, submittedAnswers, {
    checkInId: `${normalized.week.planWeekId}:${payload.clientRequestId}`,
    checkInState: "submitted",
    updatedAt: normalized.now.toISOString(),
  });
}

export function buildWeeklyCoachPersistedAdaptationSummary(
  payload: WeeklyCoachCheckInSubmitRequest,
  inputs: ScaffoldInputs = {},
): PersistedAdaptation {
  const normalized = normalizeInputs(inputs);
  return {
    status: "ready",
    summary: buildInitialAdaptationSummary(payload),
    generatedAt: normalized.now.toISOString(),
    source: "scaffold",
    basedOnCheckInId: `${normalized.week.planWeekId}:${payload.clientRequestId}`,
    acceptedAt: null,
  };
}
