import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccessProvider } from "@/context/AccessProvider";
import { LanguageProvider } from "@/context/LanguageProvider";
import { ThemeProvider } from "@/context/ThemeProvider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/entrenamiento",
}));

vi.mock("@/app/(app)/app/LogoutButton", () => ({
  default: () => <div>Logout</div>,
}));

vi.mock("@/components/layout/AppUserBadge", () => ({
  default: () => <div>UserBadge</div>,
}));

const useAccessMock = vi.fn(() => ({
  role: "ADMIN",
  isAdmin: true,
  isCoach: true,
  isDev: true,
  gymMembershipState: "in_gym",
}));

vi.mock("@/lib/useAccess", () => ({
  useAccess: () => useAccessMock(),
}));

import AppNavBar from "@/components/layout/AppNavBar";

describe("AppNavBar", () => {
  it("marks the active nav item based on pathname", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
        })
      ) as unknown as typeof fetch
    );

    const { container, getByRole } = render(
      <ThemeProvider>
        <LanguageProvider>
          <AccessProvider>
            <AppNavBar />
          </AccessProvider>
        </LanguageProvider>
      </ThemeProvider>
    );

    fireEvent.click(getByRole("button", { name: /menú/i }));

    const activeLink = container.querySelector('a[aria-current="page"]');
    expect(activeLink).not.toBeNull();
    expect(activeLink).toHaveAttribute("href", "/app/entrenamiento");
  });


  it("links the plan pill to billing settings", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
        })
      ) as unknown as typeof fetch
    );

    render(
      <ThemeProvider>
        <LanguageProvider>
          <AccessProvider>
            <AppNavBar />
          </AccessProvider>
        </LanguageProvider>
      </ThemeProvider>
    );

    const billingLink = document.querySelector('a.account-pill');
    expect(billingLink).not.toBeNull();
    expect(billingLink).toHaveAttribute("href", "/app/settings/billing");
  });

  it("renders disabled nav notes translated instead of i18n key literals", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
        })
      ) as unknown as typeof fetch
    );

    render(
      <ThemeProvider>
        <LanguageProvider>
          <AccessProvider>
            <AppNavBar />
          </AccessProvider>
        </LanguageProvider>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /menú/i }));

    expect(screen.getAllByText(/Próximamente/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("common.comingSoon")).not.toBeInTheDocument();
  });
});
