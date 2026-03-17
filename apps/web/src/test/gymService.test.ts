import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAdminGymsList, gymServiceCapabilities, leaveGymMembership } from "@/services/gym";

function mockResponse(input: { ok: boolean; status: number; payload?: unknown }): Response {
  return {
    ok: input.ok,
    status: input.status,
    json: async () => input.payload,
  } as Response;
}

describe("gym service", () => {
  afterEach(() => {
    gymServiceCapabilities.supportsLeaveGym = false;
    vi.unstubAllGlobals();
  });

  it("returns unsupported when leave-gym capability is disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await leaveGymMembership();

    expect(result).toEqual({ ok: false, reason: "unsupported", status: 405 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves gym using /api/gym/me when capability is enabled", async () => {
    gymServiceCapabilities.supportsLeaveGym = true;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/gym/me") {
        return mockResponse({ ok: true, status: 200, payload: { ok: true } });
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await leaveGymMembership();

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gym/me",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("falls back to /api/gyms/membership when /api/gym/me delete is unsupported", async () => {
    gymServiceCapabilities.supportsLeaveGym = true;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/gym/me") {
        return mockResponse({ ok: false, status: 405, payload: { error: "UNSUPPORTED_OPERATION" } });
      }
      if (url === "/api/gyms/membership") {
        return mockResponse({ ok: true, status: 200, payload: { ok: true } });
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await leaveGymMembership();

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/gym/me",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/gyms/membership",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("normalizes admin gyms from array payload", async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({ ok: true, status: 200, payload: [{ id: "gym_1", name: "Gym 1" }] }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchAdminGymsList();

    expect(result).toEqual({ ok: true, data: { gyms: [{ id: "gym_1", name: "Gym 1" }] } });
  });

  it("normalizes admin gyms from { gyms } payload", async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({ ok: true, status: 200, payload: { gyms: [{ id: "gym_2", name: "Gym 2" }] } }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchAdminGymsList();

    expect(result).toEqual({ ok: true, data: { gyms: [{ id: "gym_2", name: "Gym 2" }] } });
  });

  it("returns validation error for unexpected admin gyms shape", async () => {
    const fetchMock = vi.fn(async () => mockResponse({ ok: true, status: 200, payload: { items: [] } }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchAdminGymsList();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.reason).toBe("validation");
  });
});
