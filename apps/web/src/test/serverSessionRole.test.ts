import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/backend", () => ({
  getBackendUrl: () => "http://backend.local",
}));

import { resolveDefaultAppPath, resolveServerSessionRole } from "@/lib/server/sessionRole";

function buildJwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("resolveServerSessionRole", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns UNKNOWN when there is no session token", async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });

    await expect(resolveServerSessionRole()).resolves.toBe("UNKNOWN");
  });

  it("returns TRAINER directly from token trainer claims", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    cookiesMock.mockResolvedValue({
      get: () => ({ value: buildJwt({ role: "USER", permissions: ["TRAINER_READ"] }) }),
    });

    await expect(resolveServerSessionRole()).resolves.toBe("TRAINER");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("upgrades USER token to TRAINER when auth/me says isTrainer", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ role: "USER", isTrainer: true }), { status: 200 }),
    );
    cookiesMock.mockResolvedValue({
      get: () => ({ value: buildJwt({ role: "USER" }) }),
    });

    await expect(resolveServerSessionRole()).resolves.toBe("TRAINER");
  });

  it("keeps USER when auth/me lookup fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network"));
    cookiesMock.mockResolvedValue({
      get: () => ({ value: buildJwt({ role: "USER" }) }),
    });

    await expect(resolveServerSessionRole()).resolves.toBe("USER");
  });
});

describe("resolveDefaultAppPath", () => {
  it("maps resolved trainer role to trainer home path", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ role: "USER", isTrainer: true }), { status: 200 }),
    );
    cookiesMock.mockResolvedValue({
      get: () => ({ value: buildJwt({ role: "USER" }) }),
    });

    await expect(resolveDefaultAppPath()).resolves.toBe("/app/trainer");
  });
});
