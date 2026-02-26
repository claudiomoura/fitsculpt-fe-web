import { describe, expect, it, vi } from "vitest";

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
  it.each(ENDPOINTS)("$name endpoint maps upstream 5xx into 502 + { error: string }", async (endpoint) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockBackendResponse(503, "backend unavailable", "text/plain")));

    const response = await invokeEndpoint(endpoint);

    expect(response.status).toBe(502);

    const data = await response.json();
    expect(data).toMatchObject({ error: expect.any(String) });
  });

  it("nutrition endpoint preserves validation 400 passthrough + { error: string }", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockBackendResponse(400, JSON.stringify({ error: "INVALID_INPUT" }))));

    const nutritionEndpoint = ENDPOINTS.find((endpoint) => endpoint.name === "nutrition");
    expect(nutritionEndpoint).toBeDefined();

    const response = await invokeEndpoint(nutritionEndpoint!);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ error: "INVALID_INPUT" });
    expect(data).toMatchObject({ error: expect.any(String) });
  });

  it.each(ENDPOINTS)("$name endpoint always returns JSON-parseable error bodies", async (endpoint) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockBackendResponse(500, "<html>upstream down</html>", "text/html")));

    const response = await invokeEndpoint(endpoint);

    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
  });
});
