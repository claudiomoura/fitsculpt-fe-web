import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/context/LanguageProvider";
import { ThemeProvider } from "@/context/ThemeProvider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/seguimiento",
}));

import MobileTabBar from "@/components/layout/MobileTabBar";

describe("MobileTabBar", () => {
  it("renders all main tabs and marks the active route", () => {
    render(
      <ThemeProvider>
        <LanguageProvider>
          <MobileTabBar />
        </LanguageProvider>
      </ThemeProvider>
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Seguimiento/i })).toHaveAttribute("aria-current", "page");
  });
});
