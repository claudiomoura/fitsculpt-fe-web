import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders, setMockPathname } from "@/test/utils/renderWithProviders";

import MobileTabBar from "@/components/layout/MobileTabBar";

describe("MobileTabBar", () => {
  it("renders the 5 core tabs and marks the active route", () => {
    setMockPathname("/app/profile");

    renderWithProviders(<MobileTabBar />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hoy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Calendario de entrenamiento/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Calendario de nutrición/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Seguimiento/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Perfil/i })).toHaveAttribute("aria-current", "page");
  });
});
