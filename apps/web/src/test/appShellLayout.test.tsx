import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders, setMockPathname } from "@/test/utils/renderWithProviders";
import AppShellLayout from "@/components/layout/AppShellLayout";

describe("AppShellLayout focus routes", () => {
  it("hides app chrome on workout start focus route", () => {
    setMockPathname("/app/entrenamiento/workout-1/start");

    renderWithProviders(
      <AppShellLayout shell="app">
        <div>Focus Session</div>
      </AppShellLayout>
    );

    expect(screen.getByText("Focus Session")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /Navegación principal móvil/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Perfil/i })).not.toBeInTheDocument();
  });

  it("hides app chrome on canonical workout start focus route", () => {
    setMockPathname("/app/training/workout-1/start");

    renderWithProviders(
      <AppShellLayout shell="app">
        <div>Focus Session</div>
      </AppShellLayout>
    );

    expect(screen.getByText("Focus Session")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /Navegación principal móvil/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Perfil/i })).not.toBeInTheDocument();
  });

  it("hides app chrome on nutrition editor focus route", () => {
    setMockPathname("/app/nutricion/editar");

    renderWithProviders(
      <AppShellLayout shell="app">
        <div>Meal Logger Focus</div>
      </AppShellLayout>
    );

    expect(screen.getByText("Meal Logger Focus")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /Navegación principal móvil/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Perfil/i })).not.toBeInTheDocument();
  });

  it("keeps app chrome on regular app routes", () => {
    setMockPathname("/app/profile");

    renderWithProviders(
      <AppShellLayout shell="app">
        <div>Regular App</div>
      </AppShellLayout>
    );

    expect(screen.getByText("Regular App")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Perfil/i })).toBeInTheDocument();
  });
});
