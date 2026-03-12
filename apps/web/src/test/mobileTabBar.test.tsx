import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, setMockPathname } from "@/test/utils/renderWithProviders";

import MobileTabBar from "@/components/layout/MobileTabBar";

const useAuthEntitlementsMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useAuthEntitlements", () => ({
  useAuthEntitlements: useAuthEntitlementsMock,
}));

describe("MobileTabBar", () => {
  it("renders the 5 core tabs and marks the active route", () => {
    setMockPathname("/app/seguimiento");

    useAuthEntitlementsMock.mockReturnValue({
      entitlements: {
        status: "known",
        features: {
          canUseAI: true,
          canUseNutrition: true,
          canUseStrength: true,
        },
      },
      authMe: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    renderWithProviders(<MobileTabBar />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();

    const links = ["Hoy", "Entreno", "Nutrición", "Progreso", "Perfil"].map((name) =>
      screen.getByRole("link", { name }),
    );

    expect(links).toHaveLength(5);
    expect(screen.getByRole("link", { name: "Progreso" })).toHaveAttribute("aria-current", "page");
  });
});
