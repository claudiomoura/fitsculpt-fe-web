import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GymPageClient from "@/components/gym/GymPageClient";

vi.mock("@/context/LanguageProvider", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

function mockResponse(input: { ok: boolean; status: number; payload?: unknown }): Response {
  return {
    ok: input.ok,
    status: input.status,
    json: async () => input.payload,
  } as Response;
}

describe("GymPageClient", () => {
  it("falls back to legacy join endpoint and shows pending state after request", async () => {
    let membershipState: "NONE" | "PENDING" = "NONE";

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/gym/me") {
        return mockResponse({ ok: true, status: 200, payload: { state: membershipState, gymName: "Fit Gym" } });
      }

      if (url === "/api/gyms") {
        return mockResponse({ ok: true, status: 200, payload: { data: [{ id: "gym-1", name: "Fit Gym" }] } });
      }

      if (url === "/api/gym/join-request") {
        return mockResponse({ ok: false, status: 405 });
      }

      if (url === "/api/gyms/join") {
        if (init?.method === "POST") {
          membershipState = "PENDING";
        }
        return mockResponse({ ok: true, status: 200, payload: {} });
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<GymPageClient />);

    const requestButton = await screen.findByRole("button", { name: "gym.join.requestButton" });
    fireEvent.click(requestButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/gyms/join",
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(await screen.findByText("gym.membership.pending.title")).toBeInTheDocument();
  });
});
