import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/backend", () => ({
  getBackendUrl: () => "http://backend.local",
}));

vi.mock("@/lib/backendAuthCookie", () => ({
  getBackendAuthCookie: vi.fn(async () => ({ header: "fs_token=abc", debug: null })),
}));

type MockCookieStore = {
  get: (name: string) => { value: string } | undefined;
};

const cookiesMock = vi.fn<() => Promise<MockCookieStore>>();

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

describe("BFF contract drift gate (Contracts RC v1 critical endpoints)", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
  });

  it("validates GET /api/auth/me minimal response shape", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          subscriptionPlan: "PRO",
          entitlements: {
            modules: {
              ai: { enabled: true },
              nutrition: { enabled: true },
              strength: { enabled: false },
            },
          },
        }),
      ),
    );

    const { GET } = await import("@/app/api/auth/me/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        subscriptionPlan: expect.any(String),
        entitlements: {
          modules: {
            ai: { enabled: expect.any(Boolean) },
            nutrition: { enabled: expect.any(Boolean) },
            strength: { enabled: expect.any(Boolean) },
          },
        },
      }),
    );
  });

  it("validates GET /api/gym/me normalized response shape", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          status: "ACTIVE",
          gymId: "gym_1",
          gymName: "Gym Alpha",
          role: "member",
        }),
      ),
    );

    const { GET } = await import("@/app/api/gym/me/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          status: expect.any(String),
          gymId: expect.any(String),
          gymName: expect.any(String),
          role: expect.any(String),
        }),
      }),
    );
  });

  it("validates GET /api/tracking minimal response shape", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          checkins: [{ id: "c_1", date: "2026-01-01", weightKg: 80 }],
          foodLog: [{ id: "f_1", date: "2026-01-01", foodKey: "rice", grams: 120 }],
          workoutLog: [{ id: "w_1", date: "2026-01-01", name: "Upper", durationMin: 45 }],
        }),
      ),
    );

    const { GET } = await import("@/app/api/tracking/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        checkins: expect.any(Array),
        foodLog: expect.any(Array),
        workoutLog: expect.any(Array),
      }),
    );
    expect(body.checkins[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        date: expect.any(String),
      }),
    );
  });

  it("validates GET /api/exercises list minimal response shape", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          items: [{ id: "ex_1", name: "Push-up", imageUrl: null, mainMuscleGroup: "chest" }],
          total: 1,
          page: 1,
          limit: 24,
        }),
      ),
    );

    const { GET } = await import("@/app/api/exercises/route");
    const response = await GET(new Request("http://localhost/api/exercises?page=1&limit=24"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
      }),
    );
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
      }),
    );
  });

  it("validates POST /api/ai/training-plan/generate minimal response shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          plan: { days: [] },
          aiTokenBalance: 10,
          aiTokenRenewalAt: null,
        }),
      ),
    );

    const { POST } = await import("@/app/api/ai/training-plan/generate/route");
    const response = await POST(
      new Request("http://localhost/api/ai/training-plan/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal: "maintain" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        plan: expect.anything(),
        aiTokenBalance: expect.any(Number),
        aiTokenRenewalAt: null,
      }),
    );
  });

  it("validates POST /api/ai/nutrition-plan/generate minimal response shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          plan: { dailyCalories: 2200 },
          aiTokenBalance: 9,
          aiTokenRenewalAt: "2026-02-28T00:00:00.000Z",
        }),
      ),
    );

    const { POST } = await import("@/app/api/ai/nutrition-plan/generate/route");
    const response = await POST(
      new Request("http://localhost/api/ai/nutrition-plan/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal: "cut" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        plan: expect.anything(),
        aiTokenBalance: expect.any(Number),
        aiTokenRenewalAt: expect.any(String),
      }),
    );
  });
});
