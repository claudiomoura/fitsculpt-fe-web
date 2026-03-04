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

type EndpointContract = {
  name: "training" | "nutrition";
  route: string;
  importPath: string;
};

const ENDPOINTS: EndpointContract[] = [
  {
    name: "training",
    route: "http://localhost/api/ai/training-plan/generate",
    importPath: "@/app/api/ai/training-plan/generate/route",
  },
  {
    name: "nutrition",
    route: "http://localhost/api/ai/nutrition-plan/generate",
    importPath: "@/app/api/ai/nutrition-plan/generate/route",
  },
];

async function invokeEndpoint(endpoint: EndpointContract, body = "{}") {
  const { POST } = await import(endpoint.importPath);
  return POST(new Request(endpoint.route, { method: "POST", body }));
}

describe("AI generate proxy guardrail contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(ENDPOINTS)("$name endpoint maps upstream 5xx to stable AI_REQUEST_FAILED payload", async (endpoint) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockBackendResponse(503, JSON.stringify({ error: "provider down" }))));

    const response = await invokeEndpoint(endpoint);

    expect(response.status).toBe(502);

    const data = await response.json();
    expect(data).toEqual({ error: "AI_REQUEST_FAILED", code: "UPSTREAM_ERROR", kind: "upstream" });
  });

  it.each(ENDPOINTS)("$name endpoint maps provider insufficient_quota to AI_QUOTA_EXCEEDED", async (endpoint) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockBackendResponse(429, JSON.stringify({ error: "insufficient_quota", code: "insufficient_quota" })))
    );

    const response = await invokeEndpoint(endpoint);

    expect(response.status).toBe(429);

    const data = await response.json();
    expect(data).toEqual({ error: "AI_QUOTA_EXCEEDED", code: "AI_QUOTA_EXCEEDED", kind: "quota" });
  });

  it.each(ENDPOINTS)("$name endpoint preserves 409 passthrough + { error: string }", async (endpoint) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockBackendResponse(409, JSON.stringify({ error: "CONFLICT_ACTIVE_PLAN" }))));

    const response = await invokeEndpoint(endpoint);

    expect(response.status).toBe(409);

    const data = await response.json();
    expect(data).toEqual({ error: "CONFLICT_ACTIVE_PLAN", code: "AI_REQUEST_FAILED", kind: "request" });
    expect(data).toMatchObject({ error: expect.any(String) });
  });

  it("nutrition endpoint preserves validation 400 passthrough + { error: string }", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockBackendResponse(400, JSON.stringify({ error: "INVALID_INPUT" }))));

    const nutritionEndpoint = ENDPOINTS.find((endpoint) => endpoint.name === "nutrition");
    expect(nutritionEndpoint).toBeDefined();

    const response = await invokeEndpoint(nutritionEndpoint!);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ error: "INVALID_INPUT", code: "AI_REQUEST_FAILED", kind: "request" });
    expect(data).toMatchObject({ error: expect.any(String) });
  });

  it.each(ENDPOINTS)("$name endpoint maps plain text upstream errors", async (endpoint) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockBackendResponse(500, "<html>upstream down</html>", "text/html")));

    const response = await invokeEndpoint(endpoint);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "AI_REQUEST_FAILED", code: "UPSTREAM_ERROR", kind: "upstream" });
  });

  it.each(ENDPOINTS)("$name endpoint maps upstream abort to 504 AI_TIMEOUT", async (endpoint) => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const response = await invokeEndpoint(endpoint);

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({ error: "AI_TIMEOUT" });
  });

  it.each(ENDPOINTS)("$name endpoint uses 120s timeout and forwards aiRequestId header", async (endpoint) => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(200, JSON.stringify({ plan: { days: [] }, aiRequestId: null })));
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    vi.stubGlobal("fetch", fetchMock);

    await invokeEndpoint(endpoint, JSON.stringify({ aiRequestId: "123e4567-e89b-42d3-a456-426614174000" }));

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 120_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("x-ai-request-id")).toBe("123e4567-e89b-42d3-a456-426614174000");
  });
});
