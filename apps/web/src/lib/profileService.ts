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

function deepMergeProfile(data: Record<string, unknown>): Partial<ProfileData> {
  // If there's a nested "profile" key, merge it with root-level fields
  // NESTED fields (valid data) take precedence over root fields (may be empty/null)
  const nested = data.profile;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    // Remove the nested profile from root to avoid duplication
    const { profile: _, ...rootFields } = data;
    // Root fields first (may be empty), then nested (has real data) - nested wins
    return {
      ...rootFields,
      ...(nested as Partial<ProfileData>),
    } as Partial<ProfileData>;
  }
  return data as Partial<ProfileData>;
}

function unwrapProfilePayload(data?: ProfileApiPayload): Partial<ProfileData> | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;

  // Handle the case where data has nested "profile" key mixed with root fields
  if ("profile" in data) {
    const nested = (data as ProfileApiEnvelope).profile;
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) {
      // If profile is invalid but there are other root fields, use root
      const { profile: _, ...rootFields } = data as Record<string, unknown>;
      return deepMergeProfile(rootFields);
    }
    // Merge nested profile with any root-level fields
    // IMPORTANT: nested (valid data) must come AFTER rootFields so it overwrites empty values
    const { profile: _, ...rootFields } = data as Record<string, unknown>;
    return deepMergeProfile({ ...rootFields, ...nested } as Record<string, unknown>);
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
  const profilePhotoUrl = normalized?.profilePhotoUrl ?? normalized?.avatarDataUrl ?? defaultProfile.profilePhotoUrl;
  const incomingNutrition = normalized?.nutritionPreferences;
  const mealDistribution = normalizeMealDistribution(
    incomingNutrition?.mealDistribution ?? defaultProfile.nutritionPreferences.mealDistribution
  );
  return {
    ...defaultProfile,
    ...normalized,
    profilePhotoUrl,
    avatarDataUrl: normalized?.avatarDataUrl ?? profilePhotoUrl ?? null,
    trainingPreferences: {
      ...defaultProfile.trainingPreferences,
      ...normalized?.trainingPreferences,
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
    return defaultProfile;
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
    return profile;
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
    return mergeProfileData(profile);
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
    return nextProfile;
  }

  const data = (await profileResponse.json()) as Partial<ProfileData> | null;
  return mergeProfileData(data ?? nextProfile);
}
