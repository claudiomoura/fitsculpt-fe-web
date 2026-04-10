import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FeedClient from "@/app/(app)/app/feed/FeedClient";
import { renderWithProviders, resetMockNavigation, setMockPathname } from "@/test/utils/renderWithProviders";

function mockResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
    },
  } as Response;
}

describe("Feed surface reorg", () => {
  beforeEach(() => {
    resetMockNavigation();
    setMockPathname("/app/feed");
  });

  it("keeps lightweight feed actions and points AI chat to coach", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url === "/api/feed") {
        return mockResponse([]);
      }
      if (url === "/api/auth/me") {
        return mockResponse({
          entitlements: { modules: { ai: { enabled: true } } },
          aiTokenBalance: 10,
        });
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderWithProviders(<FeedClient />);

    expect(await screen.findByRole("button", { name: "Tip diario IA" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir FitSculpt Coach" })).toHaveAttribute("href", "/app/coach");
    expect(screen.queryByLabelText("Campo de chat contextual con IA")).not.toBeInTheDocument();
  });
});
