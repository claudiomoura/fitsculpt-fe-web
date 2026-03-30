import { describe, expect, it, vi } from "vitest";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { isProfileComplete } from "@/lib/profileCompletion";
import { mergeProfileData, saveCheckinAndSyncProfileMetrics, updateUserProfile } from "@/lib/profileService";

const completeProfilePayload: Partial<ProfileData> = {
  ...defaultProfile,
  sex: "male",
  age: 30,
  heightCm: 178,
  weightKg: 82,
  activity: "moderate",
  goal: "maintain",
  goalWeightKg: 80,
  trainingPreferences: {
    ...defaultProfile.trainingPreferences,
    level: "intermediate",
    daysPerWeek: 4,
    sessionTime: "medium",
    focus: "full",
    equipment: "gym",
  },
  nutritionPreferences: {
    ...defaultProfile.nutritionPreferences,
    mealsPerDay: 4,
    dietType: "balanced",
    cookingTime: "quick",
    mealDistribution: { preset: "balanced" },
  },
  macroPreferences: {
    ...defaultProfile.macroPreferences,
    formula: "mifflin",
  },
};

describe("saveCheckinAndSyncProfileMetrics", () => {
  it("updates profile metrics based on the latest check-in", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false });
    global.fetch = fetchMock as unknown as typeof fetch;

    const updated = await saveCheckinAndSyncProfileMetrics(
      { checkins: [], foodLog: [], workoutLog: [], mealLog: [] },
      defaultProfile,
      {
        weightKg: 82,
        chestCm: 95,
        waistCm: 78,
        hipsCm: 98,
        bicepsCm: 34,
        thighCm: 56,
        calfCm: 37,
        neckCm: 38,
        bodyFatPercent: 20,
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(updated.weightKg).toBe(82);
    expect(updated.measurements.waistCm).toBe(78);
  });
});

describe("mergeProfileData", () => {
  it("handles backend envelope payloads", () => {
    const merged = mergeProfileData({ profile: completeProfilePayload });

    expect(isProfileComplete(merged)).toBe(true);
    expect(merged.trainingPreferences.level).toBe("intermediate");
  });

  it("handles direct profile payloads", () => {
    const merged = mergeProfileData(completeProfilePayload);

    expect(isProfileComplete(merged)).toBe(true);
    expect(merged.nutritionPreferences.mealDistribution.preset).toBe("balanced");
  });
});

describe("updateUserProfile payload sanitization", () => {
  it("preserves explicit nulls so avatar can be removed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    await updateUserProfile({ profilePhotoUrl: null, avatarDataUrl: null });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/profile",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ profilePhotoUrl: null, avatarDataUrl: null }),
      })
    );
  });
});
