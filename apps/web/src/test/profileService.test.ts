import { describe, expect, it, vi } from "vitest";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { getOnboardingBlockingMissingFields, isProfileComplete } from "@/lib/profileCompletion";
import { getUserProfile, mergeProfileData, saveCheckinAndSyncProfileMetrics, updateUserProfile } from "@/lib/profileService";

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
  it("fails when profile sync does not persist", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      saveCheckinAndSyncProfileMetrics(
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
      )
    ).rejects.toThrow("PROFILE_UPDATE_FAILED:500");

    expect(fetchMock).toHaveBeenCalledTimes(2);
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

  it("supports legacy mixed payload with root + profile", () => {
    const merged = mergeProfileData(
      {
        name: "",
        sex: "",
        trainingPreferences: { ...defaultProfile.trainingPreferences, level: "" },
        profile: {
          ...completeProfilePayload,
          name: "Member",
          trainingPreferences: {
            ...completeProfilePayload.trainingPreferences,
            level: "intermediate",
          },
        },
      } as unknown as Partial<ProfileData>
    );

    expect(merged.name).toBe("Member");
    expect(merged.trainingPreferences.level).toBe("intermediate");
    expect(isProfileComplete(merged)).toBe(true);
  });
});

describe("profile completion rules", () => {
  it("does not require goalWeightKg to unlock onboarding completion", () => {
    const merged = mergeProfileData({
      ...completeProfilePayload,
      goalWeightKg: null,
    });

    expect(getOnboardingBlockingMissingFields(merged)).not.toContain("goalWeightKg (required by backend)");
    expect(isProfileComplete(merged)).toBe(true);
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

  it("throws when backend update fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(updateUserProfile({ profilePhotoUrl: "data:image/png;base64,next" })).rejects.toThrow(
      "PROFILE_UPDATE_FAILED:500"
    );
  });

  it("throws when profile fetch fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(getUserProfile()).rejects.toThrow("PROFILE_FETCH_FAILED:500");
  });
});
