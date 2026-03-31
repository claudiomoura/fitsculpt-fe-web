import { describe, expect, it, vi } from "vitest";

const fetchBackendMock = vi.fn();

vi.mock("@/app/api/gyms/_proxy", () => ({
  fetchBackend: (...args: unknown[]) => fetchBackendMock(...args),
}));

describe("/api/nutrition-plans/assigned BFF contract", () => {
  it("maps upstream 404 to empty assignedPlan payload", async () => {
    fetchBackendMock.mockResolvedValue({ status: 404, payload: { error: "NOT_FOUND" } });

    const { GET } = await import("@/app/api/nutrition-plans/assigned/route");
    const response = await GET(new Request("http://localhost/api/nutrition-plans/assigned"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ assignedPlan: null });
  });
});
