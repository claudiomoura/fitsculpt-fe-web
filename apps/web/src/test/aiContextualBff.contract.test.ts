import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/backend", () => ({
  getBackendUrl: () => "http://backend.local",
}));

vi.mock("@/lib/backendAuthCookie", () => ({
  getBackendAuthCookie: vi.fn(async () => ({ header: "fs_token=abc", debug: null })),
}));

function mockBackendResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

describe("Contextual chat BFF contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("forwards successful upstream response payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockBackendResponse(200, {
          reply: { title: "Plan", message: "Haz movilidad 10 min." },
          aiRequestId: "req_1",
          aiTokenBalance: 7,
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          costCents: 1,
          costEur: 0.01,
        }),
      ),
    );

    const { POST } = await import("@/app/api/ai/chat/contextual/route");
    const response = await POST(
      new Request("http://localhost/api/ai/chat/contextual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Que hago hoy?", surface: "feed" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      reply: { title: "Plan", message: "Haz movilidad 10 min." },
      aiRequestId: "req_1",
      aiTokenBalance: 7,
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      costCents: 1,
      costEur: 0.01,
    });
  });

  it("maps upstream 5xx errors to stable AI_REQUEST_FAILED payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockBackendResponse(503, { error: "provider down" }),
      ),
    );

    const { POST } = await import("@/app/api/ai/chat/contextual/route");
    const response = await POST(
      new Request("http://localhost/api/ai/chat/contextual", {
        method: "POST",
        body: JSON.stringify({ message: "hola" }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "AI_REQUEST_FAILED",
      code: "UPSTREAM_ERROR",
      kind: "upstream",
      status: 502,
    });
  });
});
