import type { Prisma } from "@prisma/client";
import type { AuthenticatedEntitlementsRequest } from "../../middleware/entitlements.js";

type TrainingPlanGeneratePayload = {
  name?: string;
  age?: number;
  sex?: "male" | "female";
  goal: string;
  experienceLevel: "beginner" | "intermediate" | "advanced";
  focus?: "full" | "upperLower" | "ppl";
  equipment?: "gym" | "home";
  sessionTime?: "short" | "medium" | "long";
  timeAvailableMinutes?: number;
  includeCardio?: boolean;
  includeMobilityWarmups?: boolean;
  workoutLength?: "30m" | "45m" | "60m" | "flexible";
  timerSound?: "ding" | "repsToDo";
  injuries?: string;
  restrictions?: string;
  constraints?: string | string[];
  daysPerWeek: number;
  daysCount?: number;
  startDate?: string;
};

function createHttpError(
  statusCode: number,
  code: string,
  debug?: Record<string, unknown>,
) {
  const error = new Error(code) as Error & {
    statusCode?: number;
    code?: string;
    debug?: Record<string, unknown>;
  };
  error.statusCode = statusCode;
  error.code = code;
  error.debug = debug;
  return error;
}

export type UserContext = {
  userId: string;
  name?: string;
  age: number;
  sex: "male" | "female";
  level: "beginner" | "intermediate" | "advanced";
  goal: string;
  focus: string;
  equipment: "gym" | "home";
  sessionTime: "short" | "medium" | "long";
  timeAvailableMinutes: number;
  includeCardio: boolean;
  includeMobilityWarmups: boolean;
  workoutLength?: "30m" | "45m" | "60m" | "flexible";
  timerSound?: "ding" | "repsToDo";
  injuries?: string;
  restrictions: string;
  daysPerWeek: number;
  daysCount: number;
  startDate: Date;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const resolveMinutesFromWorkoutLength = (value: string | null): number | null => {
  if (value === "30m") return 30;
  if (value === "45m") return 45;
  if (value === "60m") return 60;
  return null;
};

const resolveMinutesFromSessionTime = (value: string | null): number | null => {
  if (value === "short") return 35;
  if (value === "medium") return 50;
  if (value === "long") return 65;
  return null;
};

const normalizeConstraints = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .join("; ");
  }
  return "";
};

/**
 * Resolves and validates user context for training plan generation
 */
export async function resolveUserContext(
  request: AuthenticatedEntitlementsRequest,
  prisma: Prisma.TransactionClient,
  payload: TrainingPlanGeneratePayload,
): Promise<UserContext> {
  const authRequest = request as AuthenticatedEntitlementsRequest;
  const user = authRequest.currentUser;
  if (!user) {
    throw createHttpError(401, "UNAUTHORIZED");
  }

  await requireCompleteProfile(user.id, prisma);

  const profileRow = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: { profile: true },
  });
  const profileData = isRecord(profileRow?.profile) ? profileRow.profile : {};
  const profileTrainingPreferences = isRecord(
    profileData.trainingPreferences,
  )
    ? profileData.trainingPreferences
    : {};

  const profileSexRaw = readString(profileData.sex);
  const profileSex =
    profileSexRaw === "male" || profileSexRaw === "female"
      ? profileSexRaw
      : null;
  const profileFocusRaw = readString(profileTrainingPreferences.focus);
  const profileFocus =
    profileFocusRaw === "full" ||
    profileFocusRaw === "upperLower" ||
    profileFocusRaw === "ppl"
      ? profileFocusRaw
      : null;
  const profileEquipmentRaw = readString(profileTrainingPreferences.equipment);
  const profileEquipment =
    profileEquipmentRaw === "gym" || profileEquipmentRaw === "home"
      ? profileEquipmentRaw
      : null;
  const profileSessionTimeRaw = readString(
    profileTrainingPreferences.sessionTime,
  );
  const profileSessionTime =
    profileSessionTimeRaw === "short" ||
    profileSessionTimeRaw === "medium" ||
    profileSessionTimeRaw === "long"
      ? profileSessionTimeRaw
      : null;
  const profileWorkoutLengthRaw = readString(
    profileTrainingPreferences.workoutLength,
  );
  const profileWorkoutLength =
    profileWorkoutLengthRaw === "30m" ||
    profileWorkoutLengthRaw === "45m" ||
    profileWorkoutLengthRaw === "60m" ||
    profileWorkoutLengthRaw === "flexible"
      ? profileWorkoutLengthRaw
      : null;
  const profileTimerRaw = readString(profileTrainingPreferences.timerSound);
  const profileTimerSound =
    profileTimerRaw === "ding" || profileTimerRaw === "repsToDo"
      ? profileTimerRaw
      : null;

  const resolvedAge = payload.age ?? readNumber(profileData.age);
  const resolvedSex = payload.sex ?? profileSex;
  const resolvedFocus = payload.focus ?? profileFocus;
  const resolvedEquipment = payload.equipment ?? profileEquipment;
  const resolvedSessionTime = payload.sessionTime ?? profileSessionTime;
  const resolvedWorkoutLength =
    payload.workoutLength ?? profileWorkoutLength ?? undefined;
  const resolvedTimerSound = payload.timerSound ?? profileTimerSound ?? undefined;
  const resolvedTimeAvailableMinutes =
    payload.timeAvailableMinutes ??
    readNumber(profileData.timeAvailableMinutes) ??
    resolveMinutesFromWorkoutLength(resolvedWorkoutLength ?? null) ??
    resolveMinutesFromSessionTime(resolvedSessionTime ?? null);
  const combinedRestrictions = [
    normalizeConstraints(payload.constraints),
    readString(payload.restrictions),
    readString(profileData.notes),
  ]
    .filter(Boolean)
    .join(" | ");
  const resolvedInjuries =
    readString(payload.injuries) ?? readString(profileData.injuries) ?? undefined;

  const missingContext: string[] = [];
  if (resolvedAge === null) missingContext.push("age");
  if (!resolvedSex) missingContext.push("sex");
  if (!resolvedFocus) missingContext.push("focus");
  if (!resolvedEquipment) missingContext.push("equipment");
  if (!resolvedSessionTime) missingContext.push("sessionTime");
  if (resolvedTimeAvailableMinutes === null) {
    missingContext.push("timeAvailableMinutes");
  }
  if (missingContext.length > 0) {
    throw createHttpError(409, "PROFILE_INCOMPLETE", {
      message:
        "Missing required context for training generation. Complete profile or send fields in request.",
      missingContext,
    });
  }

  return {
    userId: user.id,
    name: payload.name ?? readString(profileData.name) ?? undefined,
    age: resolvedAge!,
    sex: resolvedSex!,
    level: mapExperienceLevelToTrainingPlanLevel(payload.experienceLevel),
    goal: payload.goal,
    focus: resolvedFocus!,
    equipment: resolvedEquipment!,
    sessionTime: resolvedSessionTime!,
    timeAvailableMinutes: resolvedTimeAvailableMinutes!,
    includeCardio:
      payload.includeCardio ??
      (typeof profileTrainingPreferences.includeCardio === "boolean"
        ? profileTrainingPreferences.includeCardio
        : false),
    includeMobilityWarmups:
      payload.includeMobilityWarmups ??
      (typeof profileTrainingPreferences.includeMobilityWarmups === "boolean"
        ? profileTrainingPreferences.includeMobilityWarmups
        : false),
    workoutLength: resolvedWorkoutLength,
    timerSound: resolvedTimerSound,
    injuries: resolvedInjuries,
    restrictions: combinedRestrictions || (resolvedInjuries ?? ""),
    daysPerWeek: Math.min(payload.daysPerWeek, 7),
    daysCount: payload.daysCount ?? payload.daysPerWeek,
    startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
  };
}

// Helper function to map experience level (we'll need to import this or recreate it)
function mapExperienceLevelToTrainingPlanLevel(
  experienceLevel: "beginner" | "intermediate" | "advanced"
): "beginner" | "intermediate" | "advanced" {
  if (experienceLevel === "beginner") return "beginner";
  if (experienceLevel === "intermediate") return "intermediate";
  return "advanced";
}

// Validates that user profile has required fields for training plan generation
async function requireCompleteProfile(
  userId: string,
  prisma: Prisma.TransactionClient,
): Promise<void> {
  const profileRow = await prisma.userProfile.findUnique({
    where: { userId },
    select: { profile: true },
  });
  
  if (!profileRow?.profile || typeof profileRow.profile !== "object") {
    throw createHttpError(409, "PROFILE_INCOMPLETE", {
      message: "Profile not found",
      missingContext: ["profile"],
    });
  }
  
  const profile = profileRow.profile as Record<string, unknown>;
  const profileTrainingPreferences = (profile.trainingPreferences as Record<string, unknown>) ?? {};
  
  // Check required fields for training plan generation
  const missingFields: string[] = [];
  
  // Check age
  if (profile.age === undefined || profile.age === null) {
    missingFields.push("age");
  }
  
  // Check sex
  if (!profile.sex || (profile.sex !== "male" && profile.sex !== "female")) {
    missingFields.push("sex");
  }
  
  // Check focus from trainingPreferences
  const focus = profileTrainingPreferences.focus as string | undefined;
  if (!focus || !["full", "upperLower", "ppl"].includes(focus)) {
    missingFields.push("focus");
  }
  
  // Check equipment from trainingPreferences
  const equipment = profileTrainingPreferences.equipment as string | undefined;
  if (!equipment || !["gym", "home"].includes(equipment)) {
    missingFields.push("equipment");
  }
  
  // Check sessionTime from trainingPreferences
  const sessionTime = profileTrainingPreferences.sessionTime as string | undefined;
  if (!sessionTime || !["short", "medium", "long"].includes(sessionTime)) {
    missingFields.push("sessionTime");
  }
  
  // Check timeAvailableMinutes (can be in profile or derived from workoutLength/sessionTime)
  const timeAvailableMinutes = profile.timeAvailableMinutes as number | undefined;
  const workoutLength = profileTrainingPreferences.workoutLength as string | undefined;
  if (!timeAvailableMinutes && !workoutLength && !sessionTime) {
    missingFields.push("timeAvailableMinutes");
  }
  
  if (missingFields.length > 0) {
    throw createHttpError(409, "PROFILE_INCOMPLETE", {
      message: "Missing required profile fields for training plan generation",
      missingContext: missingFields,
    });
  }
}
