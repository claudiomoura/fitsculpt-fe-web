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

describe("RC surface contracts", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    cookiesMock.mockResolvedValue({ get: () => ({ value: "token_123" }) });
  });

  it("keeps canonical trainer nutrition assignment BFF stable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { assignedPlan: { id: "plan_1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/trainer/clients/[id]/assigned-nutrition-plan/route");
    const response = await POST(
      new Request("http://localhost/api/trainer/clients/member_1/assigned-nutrition-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nutritionPlanId: "plan_1" }),
      }),
      { params: Promise.resolve({ id: "member_1" }) },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.local/trainer/clients/member_1/assigned-nutrition-plan",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({ nutritionPlanId: "plan_1" }),
      }),
    );
  });

  it("keeps legacy trainer nutrition assignment alias as a documented shim", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { assignedPlan: { id: "plan_1" } })));

    const { POST } = await import("@/app/api/trainer/members/[id]/nutrition-plan-assignment/route");
    const response = await POST(
      new Request("http://localhost/api/trainer/members/member_1/nutrition-plan-assignment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nutritionPlanId: "plan_1" }),
      }),
      { params: Promise.resolve({ id: "member_1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Deprecation")).toBe("true");
    expect(response.headers.get("Link")).toContain("/api/trainer/clients/member_1/assigned-nutrition-plan");
  });

  it("preserves weekly review BFF query passthrough", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        summary: { weekKey: "2026-03-23" },
        recommendations: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/review/weekly/route");
    const response = await GET(new Request("http://localhost/api/review/weekly?startDate=2026-03-17&endDate=2026-03-23"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ summary: expect.objectContaining({ weekKey: expect.any(String) }) }));
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.local/review/weekly?startDate=2026-03-17&endDate=2026-03-23",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({ cookie: "fs_token=token_123" }),
      }),
    );
  });
});
