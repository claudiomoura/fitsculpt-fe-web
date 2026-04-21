import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/backend", () => ({
  getBackendUrl: () => "http://backend.local",
}));

vi.mock("@/lib/backendAuthCookie", () => ({
  getBackendAuthCookie: vi.fn(async () => ({ header: "fs_token=abc", debug: null })),
}));

function mockBackendResponse(status: number, body: string, contentType = "application/json") {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    headers: new Headers({ "content-type": contentType }),
  } as unknown as Response;
}

async function invokeEndpoint(body = "{}") {
  const { POST } = await import("@/app/api/meals/analyze-photo/route");
  return POST(new Request("http://localhost/api/meals/analyze-photo", { method: "POST", body }));
}

describe("meal photo analyze BFF contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("maps upstream 5xx to stable AI_REQUEST_FAILED payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockBackendResponse(503, JSON.stringify({ error: "provider down" }))));

    const response = await invokeEndpoint();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      analysisSource: "fallback",
      degraded: true,
      fallbackReason: "BFF_UPSTREAM_5XX",
      confidenceLabel: "low",
      items: [expect.objectContaining({ name: "Comida no identificada" })],
    }));
  });

  it("propagates 422 low confidence payload", async () => {
    const upstreamPayload = { error: "LOW_CONFIDENCE", kind: "validation", confidence: 0.32 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockBackendResponse(422, JSON.stringify(upstreamPayload))));

    const response = await invokeEndpoint();

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual(upstreamPayload);
  });

  it("propagates upstream quota/auth policy responses without fallback", async () => {
    const upstreamPayload = { error: "AI_TOKENS_EXHAUSTED", kind: "quota" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockBackendResponse(429, JSON.stringify(upstreamPayload))));

    const response = await invokeEndpoint();

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual(upstreamPayload);
  });

  it("returns contract drift when success payload shape is invalid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockBackendResponse(200, JSON.stringify({ foo: "bar" }))));

    const response = await invokeEndpoint();

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.analysisSource).toBe("fallback");
    expect(payload.degraded).toBe(true);
    expect(payload.fallbackReason).toBe("BFF_CONTRACT_DRIFT");
  });

  it("maps upstream abort to AI_TIMEOUT", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const response = await invokeEndpoint();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      analysisSource: "fallback",
      degraded: true,
      fallbackReason: "BFF_TIMEOUT",
      confidence: 0.2,
    }));
  });

  it("uses 120s timeout for upstream request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(200, JSON.stringify({
      title: "Arroz",
      items: [{ name: "Arroz", calories: 200, protein: 4, carbs: 42, fats: 1 }],
      totals: { calories: 200, protein: 4, carbs: 42, fats: 1 },
      confidence: 0.8,
      confidenceLabel: "high",
      analysisSource: "ai",
      degraded: false,
    })));
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    vi.stubGlobal("fetch", fetchMock);

    await invokeEndpoint();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 120_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
