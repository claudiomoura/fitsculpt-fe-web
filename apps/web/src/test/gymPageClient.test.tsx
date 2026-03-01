import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GymPageClient from "@/components/gym/GymPageClient";
import { ToastProvider } from "@/components/ui/Toast";

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
  it("allows requesting access for a selected gym (not only the first item)", async () => {
    let membershipState: "NONE" | "PENDING" = "NONE";

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/gym/me") {
        return mockResponse({ ok: true, status: 200, payload: { state: membershipState, gymName: "Fit Gym" } });
      }

      if (url === "/api/gyms") {
        return mockResponse({ ok: true, status: 200, payload: { data: [{ id: "gym-1", name: "Fit Gym" }, { id: "gym-2", name: "Power Gym" }] } });
      }

      if (url === "/api/gym-flow/join") {
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body));
          expect(body).toEqual({ gymId: "gym-2" });
          membershipState = "PENDING";
        }
        return mockResponse({ ok: true, status: 200, payload: {} });
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <ToastProvider>
        <GymPageClient />
      </ToastProvider>,
    );

    const selectButtons = await screen.findAllByRole("button", { name: "gym.join.selectButton" });
    fireEvent.click(selectButtons[1]);

    const requestButtons = await screen.findAllByRole("button", { name: "gym.join.requestButton" });
    fireEvent.click(requestButtons[1]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/gym-flow/join",
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(await screen.findByText("gym.membership.pending.title")).toBeInTheDocument();
  });

  it("renders gym list but blocks requests when membership is already active", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/gym/me") {
        return mockResponse({ ok: true, status: 200, payload: { state: "ACTIVE", gymId: "gym-1", gymName: "Fit Gym", role: "MEMBER" } });
      }

      if (url === "/api/gyms") {
        return mockResponse({ ok: true, status: 200, payload: { data: [{ id: "gym-1", name: "Fit Gym" }, { id: "gym-2", name: "Power Gym" }] } });
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <ToastProvider>
        <GymPageClient />
      </ToastProvider>,
    );

    expect(await screen.findByText("gym.membership.active.title")).toBeInTheDocument();
    const requestButtons = screen.getAllByRole("button", { name: "gym.join.requestButton" });
    expect(requestButtons.every((button) => button.hasAttribute("disabled"))).toBe(true);

    const codeButton = screen.getByRole("button", { name: "gym.join.codeButton" });
    expect(codeButton).toBeDisabled();
  });

  it("shows disabled actions banner for pending memberships", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/gym/me") {
        return mockResponse({ ok: true, status: 200, payload: { state: "PENDING", gymId: "gym-1", gymName: "Fit Gym", role: null } });
      }

      if (url === "/api/gyms") {
        return mockResponse({ ok: true, status: 200, payload: { data: [{ id: "gym-1", name: "Fit Gym" }] } });
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <ToastProvider>
        <GymPageClient />
      </ToastProvider>,
    );

    expect(await screen.findByText("gym.membership.pending.title")).toBeInTheDocument();
    expect(screen.getByText("gym.sections.disabledTitle")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "gym.join.requestButton" })).not.toBeInTheDocument();
  });
});
