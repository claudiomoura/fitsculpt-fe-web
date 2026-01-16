import { defaultProfile, type ProfileData } from "@/lib/profile";

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

export function mergeProfileData(data?: Partial<ProfileData> | null): ProfileData {
  const profilePhotoUrl = data?.profilePhotoUrl ?? data?.avatarDataUrl ?? defaultProfile.profilePhotoUrl;
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
      ...data?.nutritionPreferences,
    },
    macroPreferences: {
      ...defaultProfile.macroPreferences,
      ...data?.macroPreferences,
    },
    measurements: {
      ...defaultProfile.measurements,
      ...data?.measurements,
    },
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
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!response.ok) {
    return profile;
  }
  const data = (await response.json()) as Partial<ProfileData> | null;
  return mergeProfileData(data ?? profile);
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

  await fetch("/api/tracking", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tracking),
  });

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
