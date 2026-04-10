import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAiCapabilityPreflight } from "@/domains/ai";
import { invalidateAuthMeCache } from "@/lib/authDedup";

describe("AI capability preflight", () => {
  beforeEach(() => {
    invalidateAuthMeCache();
    vi.restoreAllMocks();
  });

  it("fails closed when token reservation is unavailable", async () => {
    const result = await runAiCapabilityPreflight({
      capability: "tracking-intelligence-body-scan",
      payload: { photos: 2 },
      profile: {
        subscriptionPlan: "PRO",
        aiTokenBalance: 120,
        entitlements: { modules: { ai: { enabled: true } } },
      },
      entitlement: { module: "ai", minimumPlan: "PRO" },
      estimateTokens: () => 80,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failureReason).toBe("reservation_unavailable");
      expect(result.estimate?.estimatedTokens).toBe(80);
    }
  });

  it("blocks execution when user tier is below the required plan", async () => {
    const result = await runAiCapabilityPreflight({
      capability: "tracking-intelligence-recommendation",
      payload: {},
      profile: {
        subscriptionPlan: "STRENGTH_AI",
        aiTokenBalance: 100,
        entitlements: { modules: { ai: { enabled: true } } },
      },
      entitlement: { module: "ai", minimumPlan: "PRO" },
      estimateTokens: () => 20,
      reserveTokens: async () => ({ ok: true, reservationId: "res-1", balanceAfter: 80 }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failureReason).toBe("tier_ineligible");
    }
  });

  it("passes once entitlement, balance and reservation succeed", async () => {
    const result = await runAiCapabilityPreflight({
      capability: "tracking-intelligence-recommendation",
      payload: { input: "ok" },
      profile: {
        subscriptionPlan: "PRO",
        aiTokenBalance: 100,
        entitlements: { modules: { ai: { enabled: true } } },
      },
      entitlement: { module: "ai", minimumPlan: "PRO" },
      estimateTokens: () => 20,
      reserveTokens: async () => ({ ok: true, reservationId: "res-1", balanceAfter: 80 }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.estimate.estimatedTokens).toBe(20);
      expect(result.reservation.reservationId).toBe("res-1");
    }
  });
});
