import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { defaultProfile } from "@/lib/profile";
import { LanguageProvider } from "@/context/LanguageProvider";
import { ThemeProvider } from "@/context/ThemeProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/app",
}));

vi.mock("@/lib/profileService", () => ({
  getUserProfile: () => Promise.resolve(defaultProfile),
}));

import TrainingPlanClient from "@/app/(app)/app/entrenamiento/TrainingPlanClient";
import NutritionPlanClient from "@/app/(app)/app/nutricion/NutritionPlanClient";
import MacrosClient from "@/app/(app)/app/macros/MacrosClient";

function withProviders(node: ReactNode) {
  return <ThemeProvider><LanguageProvider>{node}</LanguageProvider></ThemeProvider>;
}

describe("Read-only plan pages", () => {
  it("renders training plan without editable form fields", async () => {
    const { container, findByText } = render(withProviders(<TrainingPlanClient />));
    await findByText(/Datos del plan/i);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });

  it("renders nutrition plan without editable form fields", async () => {
    const { container, findByText } = render(withProviders(<NutritionPlanClient />));
    await findByText(/Datos del plan/i);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });

  it("renders macros without editable form fields", async () => {
    const { container, findByText } = render(withProviders(<MacrosClient />));
    await findByText(/Macros/i);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });
});
