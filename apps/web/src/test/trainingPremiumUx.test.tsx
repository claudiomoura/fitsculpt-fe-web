import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultProfile } from "@/lib/profile";
import { renderWithProviders, resetMockNavigation, setMockPathname } from "@/test/utils/renderWithProviders";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/entrenamiento",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import TrainingPlanClient from "@/app/(app)/app/entrenamiento/TrainingPlanClient";

const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

vi.mock("@/lib/profileService", () => ({
  getUserProfile: () =>
    Promise.resolve({
      ...defaultProfile,
      sex: "female" as const,
      age: 28,
      heightCm: 165,
      weightKg: 62,
      activity: "moderate" as const,
      goal: "maintain" as const,
      trainingPreferences: {
        ...defaultProfile.trainingPreferences,
        level: "intermediate" as const,
        daysPerWeek: 3,
        sessionTime: "medium" as const,
        focus: "full" as const,
        equipment: "gym" as const,
      },
      nutritionPreferences: {
        ...defaultProfile.nutritionPreferences,
        mealsPerDay: 4,
        dietType: "balanced" as const,
        cookingTime: "medium" as const,
        mealDistribution: { preset: "balanced" as const },
      },
    }),
  updateUserProfile: vi.fn(),
}));

vi.mock("@/lib/profileCompletion", () => ({
  isProfileComplete: () => true,
}));

function mockResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

function setupFetchMock(
  planExercises: Array<Record<string, unknown>>,
  exerciseFetchHandler?: (url: string) => Response | null,
) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/ai/quota") {
      return mockResponse({ tokens: 10 });
    }
    if (url === "/api/auth/me") {
      return mockResponse({ entitlements: { modules: { strength: { enabled: true } } }, aiTokenBalance: 10 });
    }
    if (url.startsWith("/api/training-plans/active")) {
      return mockResponse({
        source: "assigned",
        plan: {
          id: "plan-1",
          title: "Plan premium",
          startDate: today.toISOString(),
          days: [
            {
              label: "Día 1",
              focus: "Fuerza",
              duration: 50,
              date: todayKey,
              exercises: planExercises,
            },
          ],
        },
      });
    }

    const handled = exerciseFetchHandler?.(url) ?? null;
    if (handled) {
      return handled;
    }

    throw new Error(`Unhandled fetch: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
  return fetchMock;
}

describe("Training premium UX from plan", () => {
  beforeEach(() => {
    resetMockNavigation();
    setMockPathname("/app/entrenamiento");
  });

  it("renders distinct thumbnails when exercise media differs by exerciseId", async () => {
    setupFetchMock(
      [
        { exerciseId: "ex-1", name: "Press banca", sets: "4", reps: "8" },
        { exerciseId: "ex-2", name: "Sentadilla", sets: "4", reps: "10", notes: "Controlar tempo" },
      ],
      (url) => {
        if (url === "/api/exercises/ex-1") {
          return mockResponse({ id: "ex-1", imageUrl: "https://cdn.test/ex-1.jpg", name: "Press banca" });
        }
        if (url === "/api/exercises/ex-2") {
          return mockResponse({ id: "ex-2", imageUrl: "https://cdn.test/ex-2.jpg", name: "Sentadilla" });
        }
        return null;
      }
    );

    renderWithProviders(<TrainingPlanClient />);

    await screen.findByText("Press banca");

    await waitFor(() => {
      const pressThumbs = screen.getAllByAltText("Press banca") as HTMLImageElement[];
      const squatThumbs = screen.getAllByAltText("Sentadilla") as HTMLImageElement[];
      expect(pressThumbs.some((image) => image.src.includes("ex-1.jpg"))).toBe(true);
      expect(squatThumbs.some((image) => image.src.includes("ex-2.jpg"))).toBe(true);
      expect(pressThumbs[0].src).not.toEqual(squatThumbs[0].src);
    });
  });

  it("uses exerciseId instead of plan entry id for detail/media resolution", async () => {
    const fetchMock = setupFetchMock(
      [{ id: "cmmay-plan-entry-1", exerciseId: "ex-1", name: "Press banca", sets: "4", reps: "8" }],
      (url) => {
        if (url === "/api/exercises/ex-1") {
          return mockResponse({ id: "ex-1", imageUrl: "https://cdn.test/ex-1.jpg", name: "Press banca" });
        }
        if (url.startsWith("/api/exercises/cmmay")) {
          return mockResponse({}, 404);
        }
        return null;
      }
    );

    renderWithProviders(<TrainingPlanClient />);

    await screen.findByText("Press banca");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/exercises/ex-1", expect.any(Object));
    });

    expect(fetchMock).not.toHaveBeenCalledWith("/api/exercises/cmmay-plan-entry-1", expect.any(Object));

    fireEvent.click((await screen.findAllByTestId("training-plan-exercise-item"))[0]);
    expect(await screen.findByTestId("training-exercise-detail-modal")).toBeInTheDocument();
    expect(screen.getAllByAltText("Press banca").some((image) => image.getAttribute("src")?.includes("ex-1.jpg"))).toBe(true);
  });

  it("falls back without 404 spam when catalog exercise is missing", async () => {
    const fetchMock = setupFetchMock(
      [{ exerciseId: "ex-missing", name: "Ejercicio desconocido", sets: "3", reps: "12" }],
      (url) => {
        if (url === "/api/exercises/ex-missing") {
          return mockResponse({}, 404);
        }
        return null;
      }
    );

    renderWithProviders(<TrainingPlanClient />);

    await screen.findByText("Ejercicio desconocido");

    fireEvent.click((await screen.findAllByTestId("training-plan-exercise-item"))[0]);
    expect(await screen.findByTestId("training-exercise-detail-modal")).toBeInTheDocument();

    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([input]) => String(input) === "/api/exercises/ex-missing");
      expect(calls).toHaveLength(1);
    });
  });

  it("opens exercise modal from plan and closes without losing selected day context", async () => {
    setupFetchMock(
      [
        { exerciseId: "ex-1", name: "Press banca", sets: "4", reps: "8" },
        { exerciseId: "ex-2", name: "Sentadilla", sets: "4", reps: "10", notes: "Controlar tempo" },
      ],
      (url) => {
        if (url === "/api/exercises/ex-1") {
          return mockResponse({ id: "ex-1", imageUrl: "https://cdn.test/ex-1.jpg", name: "Press banca" });
        }
        if (url === "/api/exercises/ex-2") {
          return mockResponse({ id: "ex-2", imageUrl: "https://cdn.test/ex-2.jpg", name: "Sentadilla" });
        }
        return null;
      }
    );

    renderWithProviders(<TrainingPlanClient />);

    const selectedDayLabel = await screen.findByText(/Ejercicios de hoy/i);
    expect(selectedDayLabel).toBeInTheDocument();

    fireEvent.click((await screen.findAllByTestId("training-plan-exercise-item"))[0]);

    expect(await screen.findByTestId("training-exercise-detail-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cerrar|close/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("training-exercise-detail-modal")).not.toBeInTheDocument();
      expect(screen.getByText(/Ejercicios de hoy/i)).toBeInTheDocument();
    });
  });
});
