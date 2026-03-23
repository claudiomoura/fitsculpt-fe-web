import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/backend", () => ({
  getBackendUrl: () => "http://backend.local",
}));

type MockCookieStore = {
  get: (name: string) => { value: string } | undefined;
};

const cookiesMock = vi.fn<() => Promise<MockCookieStore>>();

vi.mock("next/headers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/headers")>();
  return {
    ...actual,
    cookies: cookiesMock,
  };
});

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

describe("BETA-11 critical BFF contract tests", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
  });

  it("validates GET /api/billing/status contract for plan + tokens", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          plan: "PRO",
          tokens: 20,
          tokensExpiresAt: "2026-02-28T00:00:00.000Z",
        }),
      ),
    );

    const { GET } = await import("@/app/api/billing/status/route");
    const response = await GET(new Request("http://localhost/api/billing/status"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        plan: expect.any(String),
        tokens: expect.any(Number),
      }),
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("forwards billing sync query params to backend", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        plan: "PRO",
        tokens: 44444,
        tokensExpiresAt: "2026-04-01T00:00:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/billing/status/route");
    await GET(new Request("http://localhost/api/billing/status?sync=1"));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.local/billing/status?sync=1",
      expect.objectContaining({
        cache: "no-store",
        headers: { cookie: "fs_token=token_123" },
      }),
    );
  });

  it("validates GET /api/ai/quota contract for token balance", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          tokens: 7,
          aiTokenBalance: 7,
        }),
      ),
    );

    const { GET } = await import("@/app/api/ai/quota/route");
    const response = await GET(new Request("http://localhost/api/ai/quota"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        tokens: expect.any(Number),
      }),
    );
  });

  it("validates GET /api/training-plans/active contract for active plan payload", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          source: "assigned",
          plan: {
            id: "plan_123",
            name: "Plan Activo",
            days: [],
          },
        }),
      ),
    );

    const { GET } = await import("@/app/api/training-plans/active/route");
    const response = await GET(new Request("http://localhost/api/training-plans/active?includeDays=1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        source: expect.stringMatching(/assigned|own/),
        plan: expect.objectContaining({
          id: expect.any(String),
          days: expect.any(Array),
        }),
      }),
    );
  });

  it("normalizes GET /api/billing/status auth error shape", async () => {
    cookiesMock.mockResolvedValue({
      get: () => undefined,
    });

    const { GET } = await import("@/app/api/billing/status/route");
    const response = await GET(new Request("http://localhost/api/billing/status"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "UNAUTHORIZED", kind: "auth", status: 401 });
  });

  it("normalizes GET /api/billing/status upstream 404 error shape", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404, { error: "missing" })));

    const { GET } = await import("@/app/api/billing/status/route");
    const response = await GET(new Request("http://localhost/api/billing/status"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "NOT_FOUND", kind: "not_found", status: 404 });
  });

  it("validates GET /api/projection/future-self contract", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          generatedAt: "2026-02-23T12:00:00.000Z",
          experiment: {
            id: "future-self-rct-v1",
            group: "treatment",
            projectionMode: "full",
          },
          inputs: {
            goal: "cut",
            currentWeightKg: 80.2,
            targetSessionsPerWeek: 4,
            adherenceScore: 0.72,
            consistencyScore: 0.69,
            loggingFrequencyDaysPerWeek: 4.2,
            weightTrendKgPerWeek: -0.32,
          },
          horizons: [
            {
              months: 3,
              confidence: "medium",
              scenarios: [
                {
                  id: "current-consistency",
                  label: "Si mantienes tu consistencia actual",
                  adherenceScore: 0.72,
                  expectedDeltaKg: { min: -2.6, max: -1.5 },
                  projectedWeightKg: { current: 80.2, min: 77.6, max: 78.7 },
                  assumptions: ["A", "B"],
                },
              ],
            },
            { months: 6, confidence: "medium", scenarios: [] },
            { months: 12, confidence: "low", scenarios: [] },
          ],
          limitations: ["A", "B"],
          disclaimer: "orientativa",
        }),
      ),
    );

    const { GET } = await import("@/app/api/projection/future-self/route");
    const response = await GET(new Request("http://localhost/api/projection/future-self"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        experiment: expect.objectContaining({
          id: "future-self-rct-v1",
          group: expect.stringMatching(/control|treatment/),
        }),
      }),
    );
  });

  it("validates GET /api/research/rct/status and POST events", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          experimentId: "future-self-rct-v1",
          group: "control",
          projectionMode: "minimal",
          status: "active",
          assignedAt: "2026-02-20T08:00:00.000Z",
          latestMetrics: {
            weekKey: "2026-02-23",
            weeklyActivitySessions: 3,
            adherenceScore: 0.64,
            recommendationAcceptanceRate: 0.5,
            loggingFrequencyDays: 4,
            capturedAt: "2026-02-23T12:00:00.000Z",
          },
          eventCounts: {
            projectionViewed: 3,
            scenarioSelected: 4,
            recommendationsAccepted: 2,
            recommendationsRejected: 2,
            loggingEvents: 10,
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { ok: true, storedAt: "2026-02-23T12:00:00.000Z" }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/research/rct/status/route");
    const statusResponse = await GET(new Request("http://localhost/api/research/rct/status"));
    expect(statusResponse.status).toBe(200);

    const { POST } = await import("@/app/api/research/rct/events/route");
    const eventResponse = await POST(
      new Request("http://localhost/api/research/rct/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "projection_viewed", context: { origin: "test" } }),
      }),
    );

    expect(eventResponse.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("validates GET /api/research/rct/summary contract", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          experimentId: "future-self-rct-v1",
          generatedAt: "2026-03-22T10:00:00.000Z",
          window: {
            days: 56,
            weeksApprox: 8,
            startDate: "2026-01-26",
            endDate: "2026-03-22",
          },
          groups: {
            control: {
              sampleSize: 12,
              activeUsers: 7,
              retentionProxy: 0.583,
              adherenceMean: 0.45,
              loggingFrequencyMean: 2.2,
              recommendationAcceptanceRate: 0.36,
              weeklyActivitySessionsMean: 1.7,
            },
            treatment: {
              sampleSize: 13,
              activeUsers: 9,
              retentionProxy: 0.692,
              adherenceMean: 0.57,
              loggingFrequencyMean: 2.9,
              recommendationAcceptanceRate: 0.5,
              weeklyActivitySessionsMean: 2.2,
            },
          },
          deltaTreatmentVsControl: {
            sampleSize: 1,
            activeUsers: 2,
            retentionProxy: 0.109,
            adherenceMean: 0.12,
            loggingFrequencyMean: 0.7,
            recommendationAcceptanceRate: 0.14,
            weeklyActivitySessionsMean: 0.5,
          },
          metrics: [
            { key: "sample_size", label: "Usuarios en grupo", unit: "count", control: 12, treatment: 13, deltaTreatmentVsControl: 1 },
            { key: "active_users", label: "Usuarios activos en ventana", unit: "count", control: 7, treatment: 9, deltaTreatmentVsControl: 2 },
            { key: "retention_proxy", label: "Retencion proxy", unit: "ratio", control: 0.583, treatment: 0.692, deltaTreatmentVsControl: 0.109 },
            { key: "adherence_mean", label: "Adherencia media", unit: "ratio", control: 0.45, treatment: 0.57, deltaTreatmentVsControl: 0.12 },
            { key: "logging_frequency_mean", label: "Frecuencia de logging media", unit: "days_per_week", control: 2.2, treatment: 2.9, deltaTreatmentVsControl: 0.7 },
            { key: "recommendation_acceptance_rate", label: "Recommendation acceptance rate", unit: "ratio", control: 0.36, treatment: 0.5, deltaTreatmentVsControl: 0.14 },
            { key: "weekly_activity_sessions_mean", label: "Weekly activity sessions media", unit: "sessions_per_week", control: 1.7, treatment: 2.2, deltaTreatmentVsControl: 0.5 },
          ],
        }),
      ),
    );

    const { GET } = await import("@/app/api/research/rct/summary/route");
    const response = await GET(new Request("http://localhost/api/research/rct/summary?windowWeeks=8"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        experimentId: "future-self-rct-v1",
        groups: expect.objectContaining({
          control: expect.objectContaining({ sampleSize: expect.any(Number) }),
          treatment: expect.objectContaining({ sampleSize: expect.any(Number) }),
        }),
        metrics: expect.any(Array),
      }),
    );
  });

  it("validates GET /api/research/rct/statistical-report contract", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          experimentId: "future-self-rct-v1",
          generatedAt: "2026-03-22T10:00:00.000Z",
          disclaimer: "Reporte exploratorio para seguimiento de hipotesis RCT.",
          limitations: ["A", "B"],
          window: {
            days: 56,
            weeksApprox: 8,
            startDate: "2026-01-26",
            endDate: "2026-03-22",
          },
          sample: {
            controlN: 12,
            treatmentN: 13,
            minGroupN: 12,
            controlCompleteness: 0.58,
            treatmentCompleteness: 0.69,
            overallCompleteness: 0.635,
            confidence: "low",
            rationale: "n minimo por grupo=12; completitud promedio=64%",
          },
          metrics: [
            {
              key: "retention_proxy",
              label: "Retencion proxy",
              unit: "ratio",
              controlMean: 0.583,
              treatmentMean: 0.692,
              deltaTreatmentVsControl: 0.109,
              relativeEffectPercent: 18.7,
              practicalEffect: "medium practical effect",
              sampleConfidence: "low",
              significance: {
                status: "approximated",
                method: "two_proportion_z",
                statistic: 0.57,
                pValueApprox: 0.56,
                note: "Aproximacion exploratoria.",
              },
            },
            {
              key: "adherence_mean",
              label: "Adherencia media",
              unit: "ratio",
              controlMean: 0.45,
              treatmentMean: 0.57,
              deltaTreatmentVsControl: 0.12,
              relativeEffectPercent: 26.67,
              practicalEffect: "medium practical effect",
              sampleConfidence: "low",
              significance: {
                status: "insufficient_data",
                method: "unavailable",
                statistic: null,
                pValueApprox: null,
                note: "No hay varianza por grupo.",
              },
            },
            {
              key: "logging_frequency_mean",
              label: "Frecuencia de logging media",
              unit: "days_per_week",
              controlMean: 2.2,
              treatmentMean: 2.9,
              deltaTreatmentVsControl: 0.7,
              relativeEffectPercent: 31.82,
              practicalEffect: "large practical effect",
              sampleConfidence: "low",
              significance: {
                status: "insufficient_data",
                method: "unavailable",
                statistic: null,
                pValueApprox: null,
                note: "No hay varianza por grupo.",
              },
            },
            {
              key: "recommendation_acceptance_rate",
              label: "Recommendation acceptance rate",
              unit: "ratio",
              controlMean: 0.36,
              treatmentMean: 0.5,
              deltaTreatmentVsControl: 0.14,
              relativeEffectPercent: 38.89,
              practicalEffect: "large practical effect",
              sampleConfidence: "low",
              significance: {
                status: "approximated",
                method: "two_proportion_z",
                statistic: 0.7,
                pValueApprox: 0.49,
                note: "Aproximacion exploratoria.",
              },
            },
            {
              key: "weekly_activity_sessions_mean",
              label: "Weekly activity sessions media",
              unit: "sessions_per_week",
              controlMean: 1.7,
              treatmentMean: 2.2,
              deltaTreatmentVsControl: 0.5,
              relativeEffectPercent: 29.41,
              practicalEffect: "medium practical effect",
              sampleConfidence: "low",
              significance: {
                status: "insufficient_data",
                method: "unavailable",
                statistic: null,
                pValueApprox: null,
                note: "No hay varianza por grupo.",
              },
            },
          ],
        }),
      ),
    );

    const { GET } = await import("@/app/api/research/rct/statistical-report/route");
    const response = await GET(new Request("http://localhost/api/research/rct/statistical-report?windowWeeks=8"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        experimentId: "future-self-rct-v1",
        sample: expect.objectContaining({
          controlN: expect.any(Number),
          treatmentN: expect.any(Number),
          confidence: expect.stringMatching(/low|medium|high/),
        }),
        metrics: expect.any(Array),
      }),
    );
  });
});
