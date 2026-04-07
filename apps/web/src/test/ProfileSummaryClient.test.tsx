import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileSummaryClient from "@/app/(app)/app/profile/ProfileSummaryClient";
import { renderWithProviders } from "@/test/utils/renderWithProviders";

const getUserProfileMock = vi.fn();
const updateUserProfilePreferencesMock = vi.fn();
const fetchAuthMeMock = vi.fn();

vi.mock("@/lib/profileService", () => ({
  getUserProfile: () => getUserProfileMock(),
  updateUserProfilePreferences: (...args: unknown[]) => updateUserProfilePreferencesMock(...args),
}));

vi.mock("@/lib/authDedup", () => ({
  fetchAuthMe: () => fetchAuthMeMock(),
  invalidateAuthMeCache: vi.fn(),
}));

vi.mock("@/components/trainer/profile/TrainerProfileSummary", () => ({
  default: () => <div>Trainer profile summary</div>,
}));

vi.mock("@/app/(app)/app/LogoutButton", () => ({
  default: () => <button type="button">Logout</button>,
}));

describe("ProfileSummaryClient", () => {
  beforeEach(() => {
    getUserProfileMock.mockReset();
    updateUserProfilePreferencesMock.mockReset();
    fetchAuthMeMock.mockReset();
  });

  it("shows a loading state while profile data is resolving", () => {
    getUserProfileMock.mockReturnValue(new Promise(() => undefined));
    fetchAuthMeMock.mockResolvedValue(null);

    renderWithProviders(<ProfileSummaryClient />);

    expect(screen.getByRole("status", { name: /cargando/i })).toBeInTheDocument();
  });

  it("shows a retryable error state when profile loading fails", async () => {
    getUserProfileMock.mockRejectedValue(new Error("boom"));
    fetchAuthMeMock.mockResolvedValue(null);

    renderWithProviders(<ProfileSummaryClient />);

    await waitFor(() => {
      expect(screen.getByText(/no pudimos cargar tu perfil/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /reintentar|retry/i })).toBeInTheDocument();
  });

  it("renders the GYM quick link in the more section", async () => {
    getUserProfileMock.mockResolvedValue({
      name: "Laura",
      goal: "maintain",
      trainingPreferences: { level: "beginner", daysPerWeek: 3, sessionTime: "medium" },
      nutritionPreferences: { dietType: "balanced", mealsPerDay: 3, allergies: [] },
    });
    fetchAuthMeMock.mockResolvedValue(null);

    renderWithProviders(<ProfileSummaryClient />);

    const gymLink = await screen.findByRole("link", { name: "GYM" });
    expect(gymLink).toHaveAttribute("href", "/app/gym");
  });
});
