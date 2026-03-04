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
});
