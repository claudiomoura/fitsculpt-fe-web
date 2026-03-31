import { describe, expect, it, vi } from "vitest";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { getOnboardingBlockingMissingFields, isProfileComplete } from "@/lib/profileCompletion";
import {
  buildProfilePreferencesPayload,
  getUserProfile,
  mergeProfileData,
  saveCheckinAndSyncProfileMetrics,
  updateUserProfile,
  updateUserProfilePreferences,
} from "@/lib/profileService";

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

  it("unwraps recursively nested profile envelopes", () => {
    const merged = mergeProfileData({
      profile: {
        profile: {
          ...completeProfilePayload,
          profilePhotoUrl: "data:image/png;base64,fresh",
          avatarDataUrl: "data:image/png;base64,fresh",
          trainingPreferences: {
            ...completeProfilePayload.trainingPreferences,
            level: "advanced",
          },
        },
      },
    } as unknown as Partial<ProfileData>);

    expect(merged.trainingPreferences.level).toBe("advanced");
    expect(merged.profilePhotoUrl).toBe("data:image/png;base64,fresh");
    expect(merged.avatarDataUrl).toBe("data:image/png;base64,fresh");
  });

  it("backfills legacy missing goal/equipment/formula defaults", () => {
    const merged = mergeProfileData({
      profile: {
        ...completeProfilePayload,
        goal: "",
        trainingPreferences: {
          ...defaultProfile.trainingPreferences,
          ...(completeProfilePayload.trainingPreferences ?? {}),
          equipment: "",
        },
        macroPreferences: {
          ...defaultProfile.macroPreferences,
          ...(completeProfilePayload.macroPreferences ?? {}),
          formula: "",
        },
      },
    } as unknown as Partial<ProfileData>);

    expect(merged.goal).toBe("maintain");
    expect(merged.trainingPreferences.equipment).toBe("gym");
    expect(merged.macroPreferences.formula).toBe("mifflin");
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

  it("sends a reduced payload for profile preferences save", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    await updateUserProfilePreferences({
      ...defaultProfile,
      goal: "maintain",
      weightKg: 81,
      goalWeightKg: 70,
      trainingPlan: { title: "big", days: [] },
      nutritionPlan: { title: "big", dailyCalories: 2500, proteinG: 180, fatG: 70, carbsG: 260, days: [] },
      avatarDataUrl: "data:image/png;base64,really-large",
      profilePhotoUrl: "data:image/png;base64,really-large",
    });

    const requestOptions = fetchMock.mock.calls[0]?.[1] as { body?: string };
    const payload = JSON.parse(requestOptions.body ?? "{}");

    expect(payload.trainingPlan).toBeUndefined();
    expect(payload.nutritionPlan).toBeUndefined();
    expect(payload.avatarDataUrl).toBeUndefined();
    expect(payload.profilePhotoUrl).toBeUndefined();
    expect(payload.goalWeightKg).toBe(81);
  });

  it("includes explicit null avatar values on preference reset", () => {
    const payload = buildProfilePreferencesPayload({
      ...defaultProfile,
      profilePhotoUrl: null,
      avatarDataUrl: null,
    });

    expect(payload).toMatchObject({
      profilePhotoUrl: null,
      avatarDataUrl: null,
    });
  });

  it("keeps training and goal fields when saving preferences", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    await updateUserProfilePreferences({
      ...defaultProfile,
      goal: "bulk",
      activity: "very",
      trainingPreferences: {
        ...defaultProfile.trainingPreferences,
        level: "advanced",
        daysPerWeek: 5,
        equipment: "gym",
      },
    });

    const requestOptions = fetchMock.mock.calls[0]?.[1] as { body?: string };
    const payload = JSON.parse(requestOptions.body ?? "{}");

    expect(payload.goal).toBe("bulk");
    expect(payload.activity).toBe("very");
    expect(payload.trainingPreferences?.level).toBe("advanced");
    expect(payload.trainingPreferences?.daysPerWeek).toBe(5);
    expect(payload.trainingPreferences?.equipment).toBe("gym");
  });

  it("preserves explicit empty values when user clears preferences", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    await updateUserProfilePreferences({
      ...defaultProfile,
      goal: "",
      activity: "",
      trainingPreferences: {
        ...defaultProfile.trainingPreferences,
        level: "",
        equipment: "",
      },
    });

    const requestOptions = fetchMock.mock.calls[0]?.[1] as { body?: string };
    const payload = JSON.parse(requestOptions.body ?? "{}");

    expect(payload.goal).toBe("");
    expect(payload.activity).toBe("");
    expect(payload.trainingPreferences?.level).toBe("");
    expect(payload.trainingPreferences?.equipment).toBe("");
  });

  it("throws on preferences save backend failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 413 });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(updateUserProfilePreferences(defaultProfile)).rejects.toThrow("PROFILE_UPDATE_FAILED:413");
  });
});
