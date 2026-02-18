import { afterEach, describe, expect, it, vi } from "vitest";
import { leaveGymMembership } from "@/services/gym";

function mockResponse(input: { ok: boolean; status: number; payload?: unknown }): Response {
  return {
    ok: input.ok,
    status: input.status,
    json: async () => input.payload,
  } as Response;
}

describe("gym service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("leaves gym using /api/gym/me when endpoint is available", async () => {
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
});
