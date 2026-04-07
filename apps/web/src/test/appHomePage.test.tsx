import { describe, expect, it, beforeEach, vi } from "vitest";

const { redirectMock, resolveDefaultAppPathMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  resolveDefaultAppPathMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/server/sessionRole", () => ({
  resolveDefaultAppPath: resolveDefaultAppPathMock,
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

describe("AppHomePage", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    resolveDefaultAppPathMock.mockReset();
  });

  it("redirects trainers to the trainer landing", async () => {
    resolveDefaultAppPathMock.mockResolvedValue("/app/trainer");

    await AppHomePage();

    expect(redirectMock).toHaveBeenCalledWith("/app/trainer");
  });

  it("redirects users to /app/hoy", async () => {
    resolveDefaultAppPathMock.mockResolvedValue("/app/hoy");

    await AppHomePage();

    expect(redirectMock).toHaveBeenCalledWith("/app/hoy");
  });

  it("keeps admin landing on /app/admin", async () => {
    resolveDefaultAppPathMock.mockResolvedValue("/app/admin");

    await AppHomePage();

    expect(redirectMock).toHaveBeenCalledWith("/app/admin");
  });
});
