import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  resetMockNavigation,
  setMockPathname,
} from "@/test/utils/renderWithProviders";
import CoachClient from "@/app/(app)/app/coach/CoachClient";

function mockResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

function setupBaseFetch(
  aiChatHandler: (init?: RequestInit) => Promise<Response> | Response,
) {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
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
      if (url === "/api/ai/chat/contextual") {
        return aiChatHandler(init);
      }
      throw new Error(`Unhandled fetch: ${url}`);
    },
  );
  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
  return fetchMock;
}

describe("Coach contextual chat", () => {
  beforeEach(() => {
    resetMockNavigation();
    setMockPathname("/app/coach");
  });

  it("shows loading state then renders successful contextual reply", async () => {
    let resolveChat: ((value: Response) => void) | null = null;
    setupBaseFetch(
      () =>
        new Promise<Response>((resolve) => {
          resolveChat = resolve;
        }),
    );

    renderWithProviders(<CoachClient />);

    const chatInput = await screen.findByLabelText("Campo de chat de FitSculpt Coach");
    fireEvent.change(chatInput, { target: { value: "Que hago con dolor de rodilla?" } });
    fireEvent.click(screen.getByRole("button", { name: "Preguntar al coach" }));

    expect(await screen.findByRole("button", { name: "Consultando..." })).toBeInTheDocument();

    if (!resolveChat) {
      throw new Error("Expected chat request promise resolver");
    }
    (resolveChat as (value: Response) => void)(
      mockResponse({
        reply: { title: "Ajuste sugerido", message: "Reduce impacto y prioriza movilidad hoy." },
        aiTokenBalance: 9,
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        costEur: 0.01,
      }),
    );

    expect(await screen.findByText("Ajuste sugerido")).toBeInTheDocument();
    expect(screen.getByText("Reduce impacto y prioriza movilidad hoy.")).toBeInTheDocument();
    expect(screen.getByText("Consumo IA: 30 tokens · 0.01 EUR")).toBeInTheDocument();
  });

  it("shows mapped error message when chat request fails", async () => {
    setupBaseFetch(async () => mockResponse({ error: "AI_REQUEST_FAILED" }, 502));

    renderWithProviders(<CoachClient />);

    const chatInput = await screen.findByLabelText("Campo de chat de FitSculpt Coach");
    fireEvent.change(chatInput, { target: { value: "Necesito ayuda" } });
    fireEvent.click(screen.getByRole("button", { name: "Preguntar al coach" }));

    expect(
      await screen.findByText(
        "No pudimos generar una respuesta del coach en este momento.",
      ),
    ).toBeInTheDocument();
  });

  it("opens token exhausted modal when upstream returns token exhaustion", async () => {
    setupBaseFetch(async () => mockResponse({ error: "AI_QUOTA_EXCEEDED" }, 429));

    renderWithProviders(<CoachClient />);

    const chatInput = await screen.findByLabelText("Campo de chat de FitSculpt Coach");
    fireEvent.change(chatInput, { target: { value: "Necesito ayuda" } });
    fireEvent.click(screen.getByRole("button", { name: "Preguntar al coach" }));

    expect(await screen.findByText("Tokens IA agotados")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gestionar facturación" })).toBeInTheDocument();
    expect(screen.queryByText("billing.manageBilling")).not.toBeInTheDocument();
  });

  it("blocks empty message submissions", async () => {
    setupBaseFetch(async () => mockResponse({ reply: { message: "unused" } }));

    renderWithProviders(<CoachClient />);

    await screen.findByLabelText("Campo de chat de FitSculpt Coach");
    fireEvent.click(screen.getByRole("button", { name: "Preguntar al coach" }));

    await waitFor(() => {
      expect(screen.getByText("Escribe un mensaje antes de enviar.")).toBeInTheDocument();
    });
  });

  it("keeps chat input disabled when AI entitlement is missing", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL): Promise<Response> => {
        const url = String(input);
        if (url === "/api/feed") {
          return mockResponse([]);
        }
        if (url === "/api/auth/me") {
          return mockResponse({
            entitlements: { modules: { ai: { enabled: false } } },
            aiTokenBalance: 10,
          });
        }
        throw new Error(`Unhandled fetch: ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderWithProviders(<CoachClient />);

    const chatInput = await screen.findByLabelText("Campo de chat de FitSculpt Coach");
    expect(chatInput).toBeDisabled();
    expect(screen.getByRole("button", { name: "Preguntar al coach" })).toBeDisabled();
    expect(screen.getByText("Mejora tu plan con FitSculpt AI (Pro)")).toBeInTheDocument();
    expect(screen.queryByText("aiLockedTitle")).not.toBeInTheDocument();
  });
});
