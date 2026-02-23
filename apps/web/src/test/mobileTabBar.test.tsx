import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/context/LanguageProvider";
import { ThemeProvider } from "@/context/ThemeProvider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/settings",
}));

import MobileTabBar from "@/components/layout/MobileTabBar";

describe("MobileTabBar", () => {
  it("renders the 5 core tabs and marks the active route", () => {
    render(
      <ThemeProvider>
        <LanguageProvider>
          <MobileTabBar />
        </LanguageProvider>
      </ThemeProvider>
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hoy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Calendario de entrenamiento/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Biblioteca de ejercicios/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ajustes/i })).toHaveAttribute("aria-current", "page");
  });
});
