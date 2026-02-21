import { describe, expect, it, vi } from "vitest";
import {
  activateUserPlan,
  detectPlansCapabilities,
  listTrainerPlans,
  listUserPlanLibrary,
} from "@/lib/api/plansDataAccess";

describe("plansDataAccess", () => {
  it("maps training plans list payload to normalized plans shape", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ items: [{ id: "plan_1", title: "Plan 1" }], total: 1 }),
    }) as unknown as typeof fetch;

    const result = await listUserPlanLibrary({ limit: 5 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.plans).toEqual([{ id: "plan_1", title: "Plan 1" }]);
      expect(result.data.total).toBe(1);
    }
  });

  it("maps unsupported activate route to not_available", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 501,
      text: async () => JSON.stringify({ code: "NOT_AVAILABLE" }),
    }) as unknown as typeof fetch;

    const result = await activateUserPlan("plan_1");

    expect(result).toEqual({ ok: false, reason: "not_available", status: 501 });
  });

  it("detects trainer list capability as available when endpoint responds", async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.startsWith("/api/trainer/plans?") || url === "/api/trainer/plans") {
        return Promise.resolve({ ok: true, status: 200, text: async () => JSON.stringify({ items: [] }) });
      }

      return Promise.resolve({ ok: false, status: 405, text: async () => JSON.stringify({}) });
    }) as unknown as typeof fetch;

    const capabilities = await detectPlansCapabilities();
    const listResult = await listTrainerPlans();

    expect(listResult.ok).toBe(true);
    expect(capabilities.trainer.canListPlans).toBe(true);
    expect(capabilities.user.canActivatePlan).toBe(true);
    expect(capabilities.user.canDeactivatePlan).toBe(false);
  });
});
