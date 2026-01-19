import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
    render(
      <ThemeProvider>
        <LanguageProvider>
          <AppNavBar />
        </LanguageProvider>
      </ThemeProvider>
    );
    const link = screen.getByRole("link", { name: /Plan de entrenamiento/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
