import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMockNavigation, renderWithProviders, resetMockNavigation } from "@/test/utils/renderWithProviders";
import OnboardingClient from "@/app/(app)/app/onboarding/OnboardingClient";
import { ONBOARDING_DRAFT_STORAGE_KEY } from "@/lib/onboardingDraft";

const profileResponse = {
  name: "Alex",
  sex: "male",
  age: 31,
  heightCm: 178,
  weightKg: 84,
  goal: "cut",
  goalWeightKg: 78,
  activity: "moderate",
  trainingPreferences: {
    level: "beginner",
    daysPerWeek: 4,
    sessionTime: "medium",
    focus: "full",
    equipment: "gym",
  },
  nutritionPreferences: {
    mealsPerDay: 4,
    dietType: "balanced",
    cookingTime: "quick",
    mealDistribution: { preset: "balanced" },
  },
  macroPreferences: {
    formula: "mifflin",
  },
};

describe("Onboarding flow MVP", () => {
  beforeEach(() => {
    resetMockNavigation();
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "/api/profile") {
          return {
            ok: true,
            json: async () => profileResponse,
          } as Response;
        }

        throw new Error(`Unhandled fetch: ${url}`);
      })
    );
  });

  it("starts with goal, keeps one primary question in focus, and shows a starter-plan preview", async () => {
    renderWithProviders(<OnboardingClient ai="nutrition" nextUrl="/app/nutricion" />);

    await screen.findByText("Completa esto y vuelves directo a tu flujo con IA.");
    expect(screen.getAllByText("Elige tu objetivo").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => {
      expect(screen.getAllByText("Datos básicos").length).toBeGreaterThan(0);
    });

    for (let index = 0; index < 10; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    }

    await waitFor(() => {
      expect(screen.getAllByText("Tu plan base está listo").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Transformación").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Guardar y continuar" })).toBeInTheDocument();
  });

  it("lets guests finish onboarding and activate beta on the final step", async () => {
    renderWithProviders(<OnboardingClient mode="guest" activationAction={async () => {}} />);

    await screen.findByText("Primero ves tu plan. El código beta solo aparece al final.");

    fireEvent.click(screen.getByRole("button", { name: "Pérdida de peso (cut)" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Masculino" }));
    fireEvent.change(screen.getByLabelText("Edad *"), { target: { value: "31" } });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.change(screen.getByLabelText("Altura (cm) *"), { target: { value: "178" } });
    fireEvent.change(screen.getByLabelText("Peso actual (kg) *"), { target: { value: "84" } });

    for (let index = 0; index < 9; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    }

    await screen.findByRole("button", { name: "Activar acceso beta" });
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Código promocional")).toBeInTheDocument();

    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toContain('"weightKg":84');
    expect(getMockNavigation().push).not.toHaveBeenCalled();
  });

  it("shows a close control to return to login and keeps CTA available in locked viewport", async () => {
    renderWithProviders(<OnboardingClient mode="guest" activationAction={async () => {}} lockViewport />);

    await screen.findByText("Primero ves tu plan. El código beta solo aparece al final.");

    const closeButton = screen.getByRole("button", { name: /cerrar|close/i });
    expect(closeButton).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(getMockNavigation().push).toHaveBeenCalledWith("/login");
  });

  it("keeps dense groups as compact pills and persists selection", async () => {
    renderWithProviders(<OnboardingClient mode="guest" activationAction={async () => {}} lockViewport />);

    await screen.findByText("Primero ves tu plan. El código beta solo aparece al final.");
    fireEvent.click(screen.getByRole("button", { name: "Pérdida de peso (cut)" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.change(screen.getByLabelText("Edad *"), { target: { value: "31" } });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.change(screen.getByLabelText("Altura (cm) *"), { target: { value: "178" } });
    fireEvent.change(screen.getByLabelText("Peso actual (kg) *"), { target: { value: "84" } });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    }

    const veganOption = screen.getByRole("button", { name: /vegana|vegan/i });
    fireEvent.click(veganOption);

    expect(veganOption).toHaveAttribute("aria-pressed", "true");

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    }

    await screen.findByText(/vegana|vegan/i);
  });
});
