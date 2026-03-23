import { describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import LegacyNutritionListPage from "@/app/(app)/app/dietas/page";
import LegacyNutritionDetailPage from "@/app/(app)/app/dietas/[planId]/page";
import LegacyTrainingListPage from "@/app/(app)/app/biblioteca/entrenamientos/page";
import LegacyTrainingDetailPage from "@/app/(app)/app/biblioteca/entrenamientos/[planId]/page";

describe("library legacy redirects", () => {
  it("redirects /app/dietas preserving query params", async () => {
    redirectMock.mockReset();

    await LegacyNutritionListPage({
      searchParams: Promise.resolve({
        planId: "abc",
        from: "hoy",
      }),
    });

    expect(redirectMock).toHaveBeenCalledWith("/app/biblioteca/planes-nutricion?planId=abc&from=hoy");
  });

  it("redirects /app/dietas/[planId] preserving query params", async () => {
    redirectMock.mockReset();

    await LegacyNutritionDetailPage({
      params: Promise.resolve({ planId: "plan 1" }),
      searchParams: Promise.resolve({ from: "hoy", tab: "overview" }),
    });

    expect(redirectMock).toHaveBeenCalledWith("/app/biblioteca/planes-nutricion/plan%201?from=hoy&tab=overview");
  });

  it("redirects /app/biblioteca/entrenamientos preserving repeated query params", async () => {
    redirectMock.mockReset();

    await LegacyTrainingListPage({
      searchParams: Promise.resolve({
        planId: "plan-1",
        source: ["hoy", "card"],
      }),
    });

    expect(redirectMock).toHaveBeenCalledWith("/app/biblioteca/planes-entrenamiento?planId=plan-1&source=hoy&source=card");
  });

  it("redirects /app/biblioteca/entrenamientos/[planId] preserving query params", async () => {
    redirectMock.mockReset();

    await LegacyTrainingDetailPage({
      params: Promise.resolve({ planId: "plan-1" }),
      searchParams: Promise.resolve({ from: "hoy" }),
    });

    expect(redirectMock).toHaveBeenCalledWith("/app/biblioteca/planes-entrenamiento/plan-1?from=hoy");
  });
});
