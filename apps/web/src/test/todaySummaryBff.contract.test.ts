import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchBackendMock = vi.fn();

vi.mock("@/app/api/gyms/_proxy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/api/gyms/_proxy")>();
  return {
    ...actual,
    fetchBackend: (...args: unknown[]) => fetchBackendMock(...args),
  };
});

describe("today summary BFF contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T10:00:00.000Z"));
    fetchBackendMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes the derived weekly coach due signal", async () => {
    fetchBackendMock
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          checkins: [{ id: "c1", date: "2026-04-17", weightKg: 81.2, energy: 4, hunger: 3 }],
          workoutLog: [
            { id: "w1", date: "2026-04-14", name: "Upper", durationMin: 45 },
            { id: "w2", date: "2026-04-17", name: "Lower", durationMin: 45 },
          ],
        },
      })
      .mockResolvedValueOnce({ status: 200, payload: { plan: null } })
      .mockResolvedValueOnce({ status: 200, payload: { items: [] } })
      .mockResolvedValueOnce({ status: 200, payload: { name: "Test User" } })
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          profile: {
            goal: "cut",
            trainingPreferences: { daysPerWeek: 4, focus: "full", equipment: "gym" },
            nutritionPreferences: { mealsPerDay: 4, dietType: "balanced" },
          },
        },
      });

    const { GET } = await import("@/app/api/hoy/summary/route");
    const response = await GET(new Request("http://localhost/api/hoy/summary"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.weeklyCoach).toMatchObject({
      ok: true,
      data: {
        checkInDue: true,
        loopState: "check_in_due",
        featureFlags: {
          weeklyCoachEnabled: true,
          weeklyCheckInEnabled: true,
        },
      },
    });
  });
});
