import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultProfile } from "@/lib/profile";
import { getMockNavigation, renderWithProviders, resetMockNavigation, setMockPathname } from "@/test/utils/renderWithProviders";

import TrainingPlanClient from "@/app/(app)/app/training/TrainingPlanClient";

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
  options?: { hasWorkoutForToday?: boolean }
) {
  const hasWorkoutForToday = options?.hasWorkoutForToday ?? true;
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
    if (url === "/api/workouts") {
      return mockResponse(
        hasWorkoutForToday
          ? [
              {
                id: "workout-1",
                name: "Fuerza",
                scheduledAt: `${todayKey}T08:00:00.000Z`,
              },
            ]
          : []
      );
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
    setMockPathname("/app/training");
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

  it("resolves thumbnail from catalog search when exerciseId is missing", async () => {
    const fetchMock = setupFetchMock(
      [{ name: "Press banca", sets: "4", reps: "8" }],
      (url) => {
        if (url.startsWith("/api/exercises?")) {
          return mockResponse({
            items: [
              { id: "ex-press", name: "Press banca", imageUrl: "https://cdn.test/ex-press.jpg" },
            ],
          });
        }
        return null;
      }
    );

    renderWithProviders(<TrainingPlanClient />);

    await screen.findByText("Press banca");

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) => String(input).includes("/api/exercises?query=Press+banca"))
      ).toBe(true);
      expect(screen.getAllByAltText("Press banca").some((image) => image.getAttribute("src")?.includes("ex-press.jpg"))).toBe(true);
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
    await waitFor(() => {
      expect(getMockNavigation().push).toHaveBeenCalledWith(expect.stringMatching(/^\/app\/biblioteca\/ex-1\?/));
    });
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
    await waitFor(() => {
      expect(getMockNavigation().push).toHaveBeenCalledWith(expect.stringMatching(/^\/app\/biblioteca\/ex-missing\?/));
    });

    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([input]) => String(input) === "/api/exercises/ex-missing");
      expect(calls).toHaveLength(1);
    });
  });

  it("navigates to exercise technique from plan while keeping day context visible", async () => {
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

    const selectedDayLabel = await screen.findByText(/Ejercicios del dia|Ejercicios de hoy/i);
    expect(selectedDayLabel).toBeInTheDocument();

    fireEvent.click((await screen.findAllByTestId("training-plan-exercise-item"))[0]);

    await waitFor(() => {
      expect(getMockNavigation().push).toHaveBeenCalledWith(expect.stringMatching(/^\/app\/biblioteca\/ex-1\?/));
      expect(screen.getByText(/Ejercicios del dia|Ejercicios de hoy/i)).toBeInTheDocument();
    });
  });

  it("shows rest day state and hides start CTA when selected day has no exercises", async () => {
    setupFetchMock([]);

    renderWithProviders(<TrainingPlanClient />);

    await screen.findByRole("heading", { name: /Descanso/i });

    expect(screen.queryByRole("button", { name: /Empezar/i })).not.toBeInTheDocument();
  });

  it("creates workout when selected day has no existing workout", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/ai/quota") return mockResponse({ tokens: 10 });
      if (url === "/api/auth/me") return mockResponse({ entitlements: { modules: { strength: { enabled: true } } }, aiTokenBalance: 10 });
      if (url.startsWith("/api/training-plans/active")) {
        return mockResponse({
          source: "assigned",
          plan: {
            id: "plan-1",
            title: "Plan premium",
            startDate: today.toISOString(),
            days: [
              {
                label: "Dia 1",
                focus: "Fuerza",
                duration: 50,
                date: todayKey,
                exercises: [{ name: "Press banca", sets: "4", reps: "8" }],
              },
            ],
          },
        });
      }
      if (url === "/api/workouts") {
        if (init?.method === "POST") return mockResponse({ id: "workout-new" });
        const callCount = fetchMock.mock.calls.filter(([call]) => String(call) === "/api/workouts").length;
        if (callCount <= 1) return mockResponse([]);
        return mockResponse([{ id: "workout-new", name: "Fuerza", scheduledAt: `${todayKey}T12:00:00.000Z` }]);
      }
      return mockResponse({});
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    renderWithProviders(<TrainingPlanClient />);

    const startButton = await screen.findByRole("button", { name: /Empezar/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) => String(input) === "/api/workouts" && (init as RequestInit | undefined)?.method === "POST"
        )
      ).toBe(true);
    });
  });

  it("renders details CTA in next workout card", async () => {
    setupFetchMock([{ name: "Press banca", sets: "4", reps: "8" }]);

    renderWithProviders(<TrainingPlanClient />);

    expect(await screen.findByRole("button", { name: /Detalles/i })).toBeInTheDocument();
  });

  it("logs a single exercise from the daily exercise list", async () => {
    let loggedEntries = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/ai/quota") return mockResponse({ tokens: 10 });
      if (url === "/api/auth/me") return mockResponse({ entitlements: { modules: { strength: { enabled: true } } }, aiTokenBalance: 10 });
      if (url.startsWith("/api/training-plans/active")) {
        return mockResponse({
          source: "assigned",
          plan: {
            id: "plan-1",
            title: "Plan premium",
            startDate: today.toISOString(),
            days: [
              {
                label: "Dia 1",
                focus: "Fuerza",
                duration: 50,
                date: todayKey,
                exercises: [{ name: "Press banca", sets: "4", reps: "8" }],
              },
            ],
          },
        });
      }
      if (url === "/api/workouts") {
        return mockResponse([{ id: "workout-1", name: "Fuerza", scheduledAt: `${todayKey}T08:00:00.000Z` }]);
      }
      if (url === "/api/workouts/workout-1") {
        return mockResponse({
          id: "workout-1",
          name: "Fuerza",
          scheduledAt: `${todayKey}T08:00:00.000Z`,
          exercises: [{ name: "Press banca", sets: "4", reps: "8" }],
          sessions: loggedEntries > 0
            ? [{ id: "session-1", startedAt: `${todayKey}T08:00:00.000Z`, entries: Array.from({ length: loggedEntries }, (_, index) => ({ id: `entry-${index}`, exercise: "Press banca", sets: 1, reps: 8, createdAt: `${todayKey}T08:00:00.000Z` })) }]
            : [],
        });
      }
      if (url === "/api/workouts/workout-1/start") {
        return mockResponse({ id: "session-1" });
      }
      if (url === "/api/workout-sessions/session-1" && init?.method === "PATCH") {
        loggedEntries = 4;
        return mockResponse({
          id: "session-1",
          workoutId: "workout-1",
          startedAt: `${todayKey}T08:00:00.000Z`,
          entries: Array.from({ length: loggedEntries }, (_, index) => ({ id: `entry-${index}`, exercise: "Press banca", sets: 1, reps: 8, createdAt: `${todayKey}T08:00:00.000Z` })),
        });
      }
      return mockResponse({});
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    renderWithProviders(<TrainingPlanClient />);

    const quickAction = await screen.findByRole("button", { name: /Registrar ejercicio/i });
    fireEvent.click(quickAction);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/workouts/workout-1/start", expect.objectContaining({ method: "POST" }));
      expect(fetchMock).toHaveBeenCalledWith("/api/workout-sessions/session-1", expect.objectContaining({ method: "PATCH" }));
    });

    expect(await screen.findByRole("button", { name: /Ejercicio completado/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Registrar dia/i })).not.toBeInTheDocument();
  });
});
