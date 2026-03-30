import { defaultProfile, type MealDistribution, type ProfileData } from "@/lib/profile";

type ProfileApiEnvelope = {
  profile?: Partial<ProfileData> | null;
};

type ProfileApiPayload = Partial<ProfileData> | ProfileApiEnvelope | null | undefined;

type CheckinMetrics = {
  weightKg: number;
  chestCm: number;
  waistCm: number;
  hipsCm: number;
  bicepsCm: number;
  thighCm: number;
  calfCm: number;
  neckCm: number;
  bodyFatPercent: number;
};

type TrackingPayload = {
  checkins: Array<Record<string, unknown>>;
  foodLog: Array<Record<string, unknown>>;
  workoutLog: Array<Record<string, unknown>>;
  mealLog: Array<Record<string, unknown>>;
};

const PROFILE_KEYS = new Set(Object.keys(defaultProfile));

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeMealDistribution(input?: MealDistribution | string | null): MealDistribution {
  if (!input) return defaultProfile.nutritionPreferences.mealDistribution;
  if (typeof input === "string") {
    return { preset: input as MealDistribution["preset"] };
  }
  return {
    preset: input.preset ?? defaultProfile.nutritionPreferences.mealDistribution.preset,
    percentages: input.percentages,
  };
}

function deepMergeProfile(base: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  Object.entries(incoming).forEach(([key, value]) => {
    const currentValue = merged[key];
    if (isPlainObject(currentValue) && isPlainObject(value)) {
      merged[key] = deepMergeProfile(currentValue, value);
      return;
    }
    merged[key] = value;
  });

  return merged;
}

function pickKnownProfileFields(data: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (PROFILE_KEYS.has(key)) {
      picked[key] = value;
    }
  });
  return picked;
}

function unwrapProfilePayload(data?: ProfileApiPayload): Partial<ProfileData> | undefined {
  if (!isPlainObject(data)) return undefined;

  const rootFields = pickKnownProfileFields(data);

  if ("profile" in data) {
    const nested = (data as ProfileApiEnvelope).profile;
    if (isPlainObject(nested)) {
      return deepMergeProfile(rootFields, nested) as Partial<ProfileData>;
    }

    return rootFields as Partial<ProfileData>;
  }

  if (Object.keys(rootFields).length > 0) {
    return rootFields as Partial<ProfileData>;
  }

  return data as Partial<ProfileData>;
}

function removeEmptyValues(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip null, empty string, but keep 0 and false
    if (value === null || value === "" || value === undefined) continue;
    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      result[key] = removeEmptyValues(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function mergeProfileData(data?: ProfileApiPayload): ProfileData {
  const rawNormalized = unwrapProfilePayload(data);
  // Remove empty values so they don't overwrite valid defaults
  const normalizedData = rawNormalized ? removeEmptyValues(rawNormalized as Record<string, unknown>) : undefined;
  const normalized = normalizedData as Partial<ProfileData> | undefined;
  const normalizedGoal = normalized?.goal && normalized.goal !== "" ? normalized.goal : ("maintain" as ProfileData["goal"]);
  const normalizedEquipment =
    normalized?.trainingPreferences?.equipment && normalized.trainingPreferences.equipment !== ""
      ? normalized.trainingPreferences.equipment
      : ("gym" as ProfileData["trainingPreferences"]["equipment"]);
  const normalizedFormula =
    normalized?.macroPreferences?.formula && normalized.macroPreferences.formula !== ""
      ? normalized.macroPreferences.formula
      : ("mifflin" as ProfileData["macroPreferences"]["formula"]);
  const profilePhotoUrl = normalized?.profilePhotoUrl ?? normalized?.avatarDataUrl ?? defaultProfile.profilePhotoUrl;
  const incomingNutrition = normalized?.nutritionPreferences;
  const mealDistribution = normalizeMealDistribution(
    incomingNutrition?.mealDistribution ?? defaultProfile.nutritionPreferences.mealDistribution
  );
  return {
    ...defaultProfile,
    ...normalized,
    goal: normalizedGoal,
    profilePhotoUrl,
    avatarDataUrl: normalized?.avatarDataUrl ?? profilePhotoUrl ?? null,
    trainingPreferences: {
      ...defaultProfile.trainingPreferences,
      ...normalized?.trainingPreferences,
      equipment: normalizedEquipment,
    },
    nutritionPreferences: {
      ...defaultProfile.nutritionPreferences,
      ...incomingNutrition,
      dislikedFoods:
        incomingNutrition?.dislikedFoods ??
        (incomingNutrition as { dislikes?: string } | undefined)?.dislikes ??
        defaultProfile.nutritionPreferences.dislikedFoods,
      mealDistribution,
    },
    macroPreferences: {
      ...defaultProfile.macroPreferences,
      ...normalized?.macroPreferences,
      formula: normalizedFormula,
    },
    measurements: {
      ...defaultProfile.measurements,
      ...normalized?.measurements,
    },
    trainingPlan: normalized?.trainingPlan ?? defaultProfile.trainingPlan,
    nutritionPlan: normalized?.nutritionPlan ?? defaultProfile.nutritionPlan,
  };
}

export async function getUserProfile(): Promise<ProfileData> {
  const response = await fetch("/api/profile", { cache: "no-store", credentials: "include" });
  if (!response.ok) {
    throw new Error(`PROFILE_FETCH_FAILED:${response.status}`);
  }
  const data = (await response.json()) as Partial<ProfileData> | null;
  return mergeProfileData(data ?? undefined);
}

export async function updateUserProfilePreferences(profile: ProfileData): Promise<ProfileData> {
  const sanitized = sanitizeProfilePayload(profile);
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(sanitized),
  });
  if (!response.ok) {
    throw new Error(`PROFILE_UPDATE_FAILED:${response.status}`);
  }
  const data = (await response.json()) as Partial<ProfileData> | null;
  return mergeProfileData(data ?? profile);
}

export async function updateUserProfile(profile: Partial<ProfileData>): Promise<ProfileData> {
  const sanitized = sanitizeProfilePayload(profile);
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(sanitized),
  });
  if (!response.ok) {
    throw new Error(`PROFILE_UPDATE_FAILED:${response.status}`);
  }
  const data = (await response.json()) as Partial<ProfileData> | null;
  return mergeProfileData(data ?? profile);
}

function sanitizeProfilePayload<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeProfilePayload(item)) as T;
  }
  const result: Record<string, unknown> = {};
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined) return;
    if (typeof value === "object" && !Array.isArray(value)) {
      const nested = sanitizeProfilePayload(value);
      if (nested && typeof nested === "object" && Object.keys(nested as Record<string, unknown>).length === 0) {
        return;
      }
      result[key] = nested;
      return;
    }
    result[key] = value;
  });
  return result as T;
}

export async function saveCheckinAndSyncProfileMetrics(
  tracking: TrackingPayload,
  currentProfile: ProfileData,
  metrics: CheckinMetrics
): Promise<ProfileData> {
  const nextProfile: ProfileData = {
    ...currentProfile,
    weightKg: metrics.weightKg,
    measurements: {
      ...currentProfile.measurements,
      chestCm: metrics.chestCm,
      waistCm: metrics.waistCm,
      hipsCm: metrics.hipsCm,
      bicepsCm: metrics.bicepsCm,
      thighCm: metrics.thighCm,
      calfCm: metrics.calfCm,
      neckCm: metrics.neckCm,
      bodyFatPercent: metrics.bodyFatPercent,
    },
  };

  const trackingResponse = await fetch("/api/tracking", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(tracking),
  });
  if (!trackingResponse.ok) {
    throw new Error("Tracking save failed");
  }

  const profileResponse = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(nextProfile),
  });

  if (!profileResponse.ok) {
    throw new Error(`PROFILE_UPDATE_FAILED:${profileResponse.status}`);
  }

  const data = (await profileResponse.json()) as Partial<ProfileData> | null;
  return mergeProfileData(data ?? nextProfile);
}
