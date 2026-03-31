import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/context/LanguageProvider";
import { defaultProfile } from "@/lib/profile";

const getUserProfileMock = vi.fn();
const updateUserProfilePreferencesMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/profileService", () => ({
  getUserProfile: (...args: unknown[]) => getUserProfileMock(...args),
  updateUserProfilePreferences: (...args: unknown[]) => updateUserProfilePreferencesMock(...args),
}));

vi.mock("@/components/trainer/profile/TrainerProfileSummary", () => ({
  default: () => <div>trainer-summary</div>,
}));

vi.mock("@/design-system/components/Button", () => ({
  ButtonLink: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/(app)/app/LogoutButton", () => ({
  default: (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props}>Logout</button>,
}));

import ProfileSummaryClient from "@/app/(app)/app/profile/ProfileSummaryClient";

describe("ProfileSummaryClient inline editing", () => {
  it("saves training and nutrition summary fields through the existing profile update flow", async () => {
    const baseProfile = {
      ...defaultProfile,
      name: "Laura",
      goal: "maintain",
      trainingPreferences: {
        ...defaultProfile.trainingPreferences,
        level: "intermediate",
        daysPerWeek: 4,
        sessionTime: "medium",
      },
      nutritionPreferences: {
        ...defaultProfile.nutritionPreferences,
        dietType: "balanced",
        mealsPerDay: 3,
      },
    };

    getUserProfileMock.mockResolvedValue(baseProfile);
    updateUserProfilePreferencesMock
      .mockResolvedValueOnce({
        ...baseProfile,
        trainingPreferences: {
          ...baseProfile.trainingPreferences,
          daysPerWeek: 5,
        },
      })
      .mockResolvedValueOnce({
        ...baseProfile,
        trainingPreferences: {
          ...baseProfile.trainingPreferences,
          sessionTime: "long",
        },
      })
      .mockResolvedValueOnce({
        ...baseProfile,
        nutritionPreferences: {
          ...baseProfile.nutritionPreferences,
          dietType: "vegan",
        },
      })
      .mockResolvedValueOnce({
        ...baseProfile,
        nutritionPreferences: {
          ...baseProfile.nutritionPreferences,
          mealsPerDay: 4,
        },
      });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ name: "Laura", email: "laura@example.com", plan: "pro" }),
      })) as unknown as typeof fetch
    );

    render(
      <LanguageProvider initialLocale="es">
        <ProfileSummaryClient />
      </LanguageProvider>
    );

    fireEvent.click(await screen.findByRole("button", { name: /d[ií]as por semana/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /d[ií]as por semana/i }), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateUserProfilePreferencesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          trainingPreferences: expect.objectContaining({ daysPerWeek: 5 }),
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /tiempo por sesi[oó]n/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /tiempo por sesi[oó]n/i }), { target: { value: "long" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateUserProfilePreferencesMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          trainingPreferences: expect.objectContaining({ sessionTime: "long" }),
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /tipo de dieta/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /tipo de dieta/i }), { target: { value: "vegan" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateUserProfilePreferencesMock).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          nutritionPreferences: expect.objectContaining({ dietType: "vegan" }),
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /comidas por d[ií]a/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /comidas por d[ií]a/i }), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateUserProfilePreferencesMock).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          nutritionPreferences: expect.objectContaining({ mealsPerDay: 4 }),
        })
      );
    });
  });

  it("lets the user switch language inline without leaving the profile summary", async () => {
    getUserProfileMock.mockResolvedValue({
      ...defaultProfile,
      name: "Laura",
    });
    updateUserProfilePreferencesMock.mockReset();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ name: "Laura", email: "laura@example.com", plan: "pro" }),
      })) as unknown as typeof fetch
    );

    render(
      <LanguageProvider initialLocale="es">
        <ProfileSummaryClient />
      </LanguageProvider>
    );

    fireEvent.click(await screen.findByRole("button", { name: /idioma/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /idioma/i }), { target: { value: "en" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await screen.findByRole("button", { name: /language/i });
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(updateUserProfilePreferencesMock).not.toHaveBeenCalled();
  });
});
