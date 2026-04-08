import { buildProfilePreferencesPayload, mergeProfileData } from "@/lib/profileService";
import type { ProfileData } from "@/lib/profile";

export const ONBOARDING_DRAFT_STORAGE_KEY = "fs_onboarding_draft";

export function readOnboardingDraft(): ProfileData | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return mergeProfileData(JSON.parse(raw) as Partial<ProfileData>);
  } catch {
    window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
    return null;
  }
}

export function writeOnboardingDraft(profile: ProfileData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(buildProfilePreferencesPayload(profile)));
}

export function readSerializedOnboardingDraft(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY) ?? "";
}

export function clearOnboardingDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
}
