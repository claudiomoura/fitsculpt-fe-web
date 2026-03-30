import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/context/LanguageProvider";
import { defaultProfile } from "@/lib/profile";

const getUserProfileMock = vi.fn();
const updateUserProfilePreferencesMock = vi.fn();
const updateUserProfileMock = vi.fn();

vi.mock("@/lib/profileService", () => ({
  getUserProfile: (...args: unknown[]) => getUserProfileMock(...args),
  updateUserProfilePreferences: (...args: unknown[]) => updateUserProfilePreferencesMock(...args),
  updateUserProfile: (...args: unknown[]) => updateUserProfileMock(...args),
}));

import ProfileClient from "@/app/(app)/app/profile/ProfileClient";

describe("ProfileClient save status", () => {
  it("shows error and avoids success toast when save fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false })) as unknown as typeof fetch
    );

    getUserProfileMock.mockResolvedValue({
      ...defaultProfile,
      weightKg: 80,
      goal: "maintain",
      goalWeightKg: 80,
    });
    updateUserProfilePreferencesMock.mockRejectedValue(new Error("PROFILE_UPDATE_FAILED:413"));
    updateUserProfileMock.mockResolvedValue(defaultProfile);

    render(
      <LanguageProvider>
        <ProfileClient />
      </LanguageProvider>
    );

    const continueRegex = /continuar|continue/i;
    for (let index = 0; index < 6; index += 1) {
      fireEvent.click(await screen.findByRole("button", { name: continueRegex }));
    }

    fireEvent.click(await screen.findByRole("button", { name: /guardar perfil|save profile/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.queryByText(/perfil guardado|profile saved/i)).not.toBeInTheDocument();
  });
});
