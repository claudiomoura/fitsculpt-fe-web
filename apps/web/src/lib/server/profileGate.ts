import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBackendUrl } from "@/lib/backend";
import { isProfileComplete } from "@/lib/profileCompletion";
import { mergeProfileData } from "@/lib/profileService";
import type { ProfileData } from "@/lib/profile";

export async function redirectToOnboardingIfIncomplete(returnTo: string) {
  const token = (await cookies()).get("fs_token")?.value;
  if (!token) return;

  try {
    const response = await fetch(`${getBackendUrl()}/profile`, {
      headers: { cookie: `fs_token=${token}` },
      cache: "no-store",
    });

    if (!response.ok) return;
    const payload = (await response.json()) as Partial<ProfileData> | null;
    const profile = mergeProfileData(payload ?? undefined);
    if (!isProfileComplete(profile)) {
      redirect(`/app/onboarding?next=${encodeURIComponent(returnTo)}`);
    }
  } catch {
    // If profile service fails, do not block route rendering.
  }
}
