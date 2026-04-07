import { describe, expect, it, beforeEach, vi } from "vitest";

const { cookiesMock, redirectMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/serverI18n", () => ({
  getServerT: async () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/design-system/components/Button", () => ({
  ButtonLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/app/(app)/app/DashboardClient", () => ({
  default: () => <div>Dashboard Client</div>,
}));

import AppHomePage from "@/app/(app)/app/page";

function buildJwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("AppHomePage", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    redirectMock.mockReset();
  });

  it("redirects trainers to the trainer landing", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: buildJwt({ role: "USER", permissions: ["TRAINER_READ"] }) }),
    });

    await AppHomePage();

    expect(redirectMock).toHaveBeenCalledWith("/app/trainer");
  });

  it("redirects users to /app/hoy", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: buildJwt({ role: "USER" }) }),
    });

    await AppHomePage();

    expect(redirectMock).toHaveBeenCalledWith("/app/hoy");
  });

  it("keeps admin landing on /app/admin", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: buildJwt({ role: "ADMIN" }) }),
    });

    await AppHomePage();

    expect(redirectMock).toHaveBeenCalledWith("/app/admin");
  });
});
