import { defaultProfile, type MealDistribution, type ProfileData } from "@/lib/profile";

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

export function mergeProfileData(data?: Partial<ProfileData> | null): ProfileData {
  const profilePhotoUrl = data?.profilePhotoUrl ?? data?.avatarDataUrl ?? defaultProfile.profilePhotoUrl;
  const incomingNutrition = data?.nutritionPreferences;
  const mealDistribution = normalizeMealDistribution(
    incomingNutrition?.mealDistribution ?? defaultProfile.nutritionPreferences.mealDistribution
  );
  return {
    ...defaultProfile,
    ...data,
    profilePhotoUrl,
    avatarDataUrl: data?.avatarDataUrl ?? profilePhotoUrl ?? null,
    trainingPreferences: {
      ...defaultProfile.trainingPreferences,
      ...data?.trainingPreferences,
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
      ...data?.macroPreferences,
    },
    measurements: {
      ...defaultProfile.measurements,
      ...data?.measurements,
    },
    trainingPlan: data?.trainingPlan ?? defaultProfile.trainingPlan,
    nutritionPlan: data?.nutritionPlan ?? defaultProfile.nutritionPlan,
  };
}

export async function getUserProfile(): Promise<ProfileData> {
  const response = await fetch("/api/profile", { cache: "no-store" });
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
  if (Array.isArray(data)) return data as T;
  const result: Record<string, unknown> = {};
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value === null || value === "") return;
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
    body: JSON.stringify(nextProfile),
  });

  if (!profileResponse.ok) {
    return nextProfile;
  }

  const data = (await profileResponse.json()) as Partial<ProfileData> | null;
  return mergeProfileData(data ?? nextProfile);
}
