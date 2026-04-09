import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchBackendMock = vi.fn();

vi.mock("@/app/api/gyms/_proxy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/api/gyms/_proxy")>();
  return {
    ...actual,
    fetchBackend: (...args: unknown[]) => fetchBackendMock(...args),
  };
});

describe("weekly adaptive coach BFF contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T10:00:00.000Z"));
    fetchBackendMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("derives weekly state from profile plus tracking scaffold", async () => {
    fetchBackendMock
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          profile: {
            goal: "cut",
            trainingPreferences: { daysPerWeek: 4, focus: "full", equipment: "gym" },
            nutritionPreferences: { mealsPerDay: 4, dietType: "balanced" },
          },
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          checkins: [{ id: "c1", date: "2026-04-17", weightKg: 81.2, energy: 4, hunger: 3 }],
          workoutLog: [
            { id: "w1", date: "2026-04-14", name: "Upper", durationMin: 45 },
            { id: "w2", date: "2026-04-17", name: "Lower", durationMin: 45 },
          ],
        },
      });

    const { GET } = await import("@/app/api/weekly-adaptive-coach/state/route");
    const response = await GET(new Request("http://localhost/api/weekly-adaptive-coach/state"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      loopState: "check_in_due",
      checkInDue: true,
      currentWeek: {
        state: "check_in_due",
      },
      featureFlags: {
        weeklyCoachEnabled: true,
        weeklyCheckInEnabled: true,
        adaptationEnabled: false,
      },
    });
    expect(body.planSummary.trainingSummary[0]).toContain("4 planned training sessions");
  });

  it("persists weekly coach drafts and submitted ownership in tracking", async () => {
    const profilePayload = {
      profile: {
        goal: "maintain",
        weightKg: 80.5,
        trainingPreferences: { daysPerWeek: 3, focus: "full", equipment: "gym" },
        nutritionPreferences: { mealsPerDay: 4, dietType: "balanced" },
      },
    };
    let trackingPayload: Record<string, unknown> = {
      checkins: [{ id: "c1", date: "2026-04-18", weightKg: 80.2, energy: 4, hunger: 2 }],
      workoutLog: [{ id: "w1", date: "2026-04-16", name: "Full Body", durationMin: 50 }],
    };

    fetchBackendMock.mockImplementation(async (path: string, init?: { method?: string; body?: unknown }) => {
      if (path === "/profile") {
        return { status: 200, payload: profilePayload };
      }

      if (path === "/tracking" && (!init?.method || init.method === "GET")) {
        return { status: 200, payload: trackingPayload };
      }

      if (path === "/tracking" && init?.method === "PUT") {
        trackingPayload = init.body as Record<string, unknown>;
        return { status: 200, payload: trackingPayload };
      }

      throw new Error(`Unexpected backend request: ${path}`);
    });

    const routeModule = await import("@/app/api/weekly-adaptive-coach/check-in/route");
    const draftResponse = await routeModule.GET(new Request("http://localhost/api/weekly-adaptive-coach/check-in"));
    const draftBody = await draftResponse.json();

    expect(draftResponse.status).toBe(200);
    expect(draftBody.checkInState).toBe("draft");
    expect(draftBody.draftAnswers.trainingSessionsPlanned).toBe(3);
    expect(draftBody.draftAnswers.currentWeightKg).toBe(80.2);

    const saveResponse = await routeModule.PUT(
      new Request("http://localhost/api/weekly-adaptive-coach/check-in", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trainingSessionsCompleted: 2,
          trainingSessionsPlanned: 3,
          nutritionAdherenceScore: 4,
          progressMode: "weight",
          currentWeightKg: 80.1,
          energyScore: 4,
          hungerScore: 2,
          recoveryScore: 3,
          stressScore: 2,
          painLevel: "expected_soreness",
          frictionPrimary: "time",
          frictionNote: null,
          contextChangeFlag: false,
          contextChangeType: null,
          nextWeekConfidenceScore: 4,
        }),
      }),
    );
    const saveBody = await saveResponse.json();

    expect(saveResponse.status).toBe(200);
    expect(saveBody.checkInState).toBe("draft");
    expect(saveBody.updatedAt).toBe("2026-04-19T10:00:00.000Z");
    expect((trackingPayload.weeklyCoach as { checkIns: Record<string, unknown> }).checkIns[draftBody.weekContext.planWeekId]).toMatchObject({
      checkInState: "draft",
      draftAnswers: {
        currentWeightKg: 80.1,
        nutritionAdherenceScore: 4,
      },
    });

    const persistedDraftResponse = await routeModule.GET(new Request("http://localhost/api/weekly-adaptive-coach/check-in"));
    const persistedDraftBody = await persistedDraftResponse.json();

    expect(persistedDraftResponse.status).toBe(200);
    expect(persistedDraftBody).toMatchObject({
      checkInState: "draft",
      draftAnswers: {
        currentWeightKg: 80.1,
        nutritionAdherenceScore: 4,
      },
      updatedAt: "2026-04-19T10:00:00.000Z",
    });

    const submitResponse = await routeModule.POST(
      new Request("http://localhost/api/weekly-adaptive-coach/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractVersion: "1.0",
          clientRequestId: "req_123",
          trainingSessionsCompleted: 2,
          trainingSessionsPlanned: 3,
          nutritionAdherenceScore: 4,
          progressMode: "weight",
          currentWeightKg: 80.1,
          perceivedProgress: null,
          energyScore: 4,
          hungerScore: 2,
          recoveryScore: 3,
          stressScore: 2,
          painLevel: "expected_soreness",
          frictionPrimary: "time",
          frictionNote: null,
          contextChangeFlag: false,
          contextChangeType: null,
          nextWeekConfidenceScore: 4,
        }),
      }),
    );
    const submitBody = await submitResponse.json();

    expect(submitResponse.status).toBe(200);
    expect(submitBody).toMatchObject({
      checkInState: "submitted",
      completionState: {
        isComplete: true,
      },
      nextCta: "awaiting_adaptation_generation",
    });
    expect(submitBody.checkInId).toContain("req_123");
    expect(
      (trackingPayload.weeklyCoach as {
        adaptations: Record<string, { status: string; summary: string; source: string; basedOnCheckInId: string | null; acceptedAt: string | null }>;
      }).adaptations[draftBody.weekContext.planWeekId],
    ).toMatchObject({
      status: "ready",
      source: "scaffold",
      basedOnCheckInId: submitBody.checkInId,
      acceptedAt: null,
    });

    const { GET } = await import("@/app/api/weekly-adaptive-coach/state/route");
    const stateResponse = await GET(new Request("http://localhost/api/weekly-adaptive-coach/state"));
    const stateBody = await stateResponse.json();

    expect(stateResponse.status).toBe(200);
    expect(stateBody).toMatchObject({
      loopState: "adaptation_generated",
      checkInDue: false,
      nextAction: "review_adaptation_summary",
      currentWeek: {
        state: "adaptation_ready",
      },
      featureFlags: {
        adaptationEnabled: true,
      },
    });
    expect(stateBody.latestAdaptationSummary).toContain("2/3 planned sessions completed");

    const reviewRouteModule = await import("@/app/api/weekly-adaptive-coach/adaptation-review/route");
    const acknowledgeResponse = await reviewRouteModule.POST(
      new Request("http://localhost/api/weekly-adaptive-coach/adaptation-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    const acknowledgeBody = await acknowledgeResponse.json();

    expect(acknowledgeResponse.status).toBe(200);
    expect(acknowledgeBody).toMatchObject({
      loopState: "adaptation_accepted",
      nextAction: "follow_current_week_plan",
      currentWeek: {
        state: "accepted",
      },
    });
    expect(acknowledgeBody.currentWeek.acceptedAt).toBe("2026-04-19T10:00:00.000Z");
    expect(
      (trackingPayload.weeklyCoach as {
        adaptations: Record<string, { acceptedAt: string | null }>;
      }).adaptations[draftBody.weekContext.planWeekId]?.acceptedAt,
    ).toBe("2026-04-19T10:00:00.000Z");
  });

  it("maps invalid submit payloads to validation error", async () => {
    const { POST } = await import("@/app/api/weekly-adaptive-coach/check-in/route");
    const response = await POST(
      new Request("http://localhost/api/weekly-adaptive-coach/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contractVersion: "1.0", clientRequestId: "req_123" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "INVALID_REQUEST", kind: "validation", status: 400 });
  });
});
