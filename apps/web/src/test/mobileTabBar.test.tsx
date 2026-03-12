import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders, setMockPathname } from "@/test/utils/renderWithProviders";

import MobileTabBar from "@/components/layout/MobileTabBar";

describe("MobileTabBar", () => {
  it("renders the 5 core tabs and marks the active route", () => {
    setMockPathname("/app/seguimiento");

    renderWithProviders(<MobileTabBar />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hoy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entreno" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nutrición" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Progreso" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Perfil" })).toBeInTheDocument();
  });
});
