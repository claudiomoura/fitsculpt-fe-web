import { describe, expect, it, vi } from "vitest";
import {
  assignPlanToTrainerClient360,
  createTrainerClientInternalNote,
  getTrainerClient360Detail,
  listTrainerClientInternalNotes,
} from "@/lib/api/trainerClient360";

describe("trainer client 360 api", () => {
  it("returns notSupported fallback when notes endpoint is unavailable", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await listTrainerClientInternalNotes("client_1");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, reason: "notSupported", status: 404, message: "NOT_AVAILABLE" });
  });

  it("normalizes client detail from trainer clients payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: "client_2", name: "Alex", role: "USER", lastLoginAt: "2026-01-01" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getTrainerClient360Detail("client_2");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.id).toBe("client_2");
      expect(result.data?.name).toBe("Alex");
      expect(result.data?.role).toBe("USER");
      expect(result.data?.lastLoginAt).toBe("2026-01-01");
    }
  });

  it("posts assign-plan payload to trainer client endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ assigned: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await assignPlanToTrainerClient360({ clientId: "client_3", trainingPlanId: "plan_1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trainer/clients/client_3/assigned-plan",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("returns notSupported fallback when create-note endpoint is unavailable", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await createTrainerClientInternalNote({ clientId: "client_4", content: "Progressing." });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, reason: "notSupported", status: 404, message: "NOT_AVAILABLE" });
  });
});
