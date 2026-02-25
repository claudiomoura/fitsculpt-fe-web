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

describe("AI generate proxy guardrail contract", () => {
  it("training-plan/generate maps upstream 5xx to 502 with JSON { error: string }", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(503, "backend exploded", "text/plain"));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/ai/training-plan/generate/route");
    const response = await POST(new Request("http://localhost/api/ai/training-plan/generate", { method: "POST", body: "{}" }));

    expect(response.status).toBe(502);
    expect(response.status).not.toBe(500);

    const data = await response.json();
    expect(data).toMatchObject({ error: expect.any(String) });
  });

  it("training-plan/generate never returns 500 and always returns JSON error string on backend 500 malformed body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(500, "<html>upstream down</html>", "text/html"));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/ai/training-plan/generate/route");
    const response = await POST(
      new Request("http://localhost/api/ai/training-plan/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal: "gain" }),
      }),
    );

    expect(response.status).toBe(502);
    expect(response.status).not.toBe(500);

    const data = await response.json();
    expect(typeof data.error).toBe("string");
  });

  it("nutrition-plan/generate never returns 500 and always returns JSON error string on backend 500 malformed body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(500, "", "text/plain"));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/ai/nutrition-plan/generate/route");
    const response = await POST(
      new Request("http://localhost/api/ai/nutrition-plan/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal: "cut" }),
      }),
    );

    expect(response.status).toBe(502);
    expect(response.status).not.toBe(500);

    const data = await response.json();
    expect(typeof data.error).toBe("string");
  });



  it("training-plan/generate maps backend 503 empty response to 502 with UPSTREAM_ERROR", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(503, "", "text/plain"));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/ai/training-plan/generate/route");
    const response = await POST(new Request("http://localhost/api/ai/training-plan/generate", { method: "POST", body: "{}" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "UPSTREAM_ERROR" });
  });
  it("training-plan/generate maps backend 500 JSON error to non-500 JSON error response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(500, JSON.stringify({ error: "UPSTREAM_ERROR" })));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/ai/training-plan/generate/route");
    const response = await POST(new Request("http://localhost/api/ai/training-plan/generate", { method: "POST", body: "{}" }));

    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data).toEqual({ error: "UPSTREAM_ERROR" });
    expect(typeof data.error).toBe("string");
  });


  it("nutrition-plan/generate maps backend 503 empty response to 502 with UPSTREAM_ERROR", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(503, "", "text/plain"));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/ai/nutrition-plan/generate/route");
    const response = await POST(new Request("http://localhost/api/ai/nutrition-plan/generate", { method: "POST", body: "{}" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "UPSTREAM_ERROR" });
  });

  it("nutrition-plan/generate maps backend 500 JSON error to 502 preserving error body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(500, JSON.stringify({ error: "UPSTREAM_ERROR" })));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/ai/nutrition-plan/generate/route");
    const response = await POST(new Request("http://localhost/api/ai/nutrition-plan/generate", { method: "POST", body: "{}" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "UPSTREAM_ERROR" });
  });

  it("nutrition-plan/generate preserves validation 400 passthrough with JSON { error: string }", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(400, JSON.stringify({ error: "INVALID_INPUT" })));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/ai/nutrition-plan/generate/route");
    const response = await POST(new Request("http://localhost/api/ai/nutrition-plan/generate", { method: "POST", body: "{}" }));

    expect(response.status).toBe(400);
    expect(response.status).not.toBe(500);

    const data = await response.json();
    expect(data).toEqual({ error: "INVALID_INPUT" });
    expect(data).toMatchObject({ error: expect.any(String) });
  });

  it("nutrition-plan/generate maps upstream 5xx to 502 with JSON { error: string }", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(503, "broken", "text/plain"));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/ai/nutrition-plan/generate/route");
    const response = await POST(new Request("http://localhost/api/ai/nutrition-plan/generate", { method: "POST", body: "{}" }));

    expect(response.status).toBe(502);
    expect(response.status).not.toBe(500);

    const data = await response.json();
    expect(data).toMatchObject({ error: expect.any(String) });
  });

  it("nutrition-plan/generate maps thrown fetch errors to JSON error payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { POST } = await import("@/app/api/ai/nutrition-plan/generate/route");
    const response = await POST(new Request("http://localhost/api/ai/nutrition-plan/generate", { method: "POST", body: "{}" }));

    expect(response.status).toBe(502);
    const data = await response.json();
    expect(typeof data.error).toBe("string");
    expect(response.status).not.toBe(500);
  });
});
